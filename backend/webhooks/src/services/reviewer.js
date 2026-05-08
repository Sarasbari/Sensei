import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import Groq from "groq-sdk";

// Initialize ChromaDB and Embedder (using local default embedder to avoid OpenAI quota limits)
const chroma = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });
const embedder = new DefaultEmbeddingFunction();

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

/**
 * Step 1: Split prDiff into chunks by file path
 */
function splitDiffByFile(diffStr) {
  const fileChunks = [];
  let currentChunk = [];
  let currentFile = "";

  const lines = diffStr.split("\n");
  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (currentChunk.length > 0) {
        fileChunks.push({ file: currentFile, diff: currentChunk.join("\n") });
        currentChunk = [];
      }
      // Extract file path from diff --git a/src/file b/src/file
      const parts = line.split(" ");
      if (parts.length >= 3) {
        currentFile = parts[2].replace(/^a\//, "");
      }
    }
    currentChunk.push(line);
  }
  
  if (currentChunk.length > 0) {
    fileChunks.push({ file: currentFile, diff: currentChunk.join("\n") });
  }

  return fileChunks;
}

/**
 * AI Review Engine for Sensei
 * 
 * @param {string} prDiff - Raw diff string
 * @param {string} repoId - e.g. Sarasbari_NAGARIK
 * @returns {Promise<{ comments: Array, escalate: boolean }>}
 */
export async function generateReview(prDiff, repoId) {
  if (!groq) {
    console.warn("⚠️ GROQ_API_KEY missing, skipping AI review generation.");
    return { comments: [], escalate: false };
  }

  const collectionName = `review_dna_${repoId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  let collection;
  try {
    collection = await chroma.getOrCreateCollection({ 
      name: collectionName,
      embeddingFunction: embedder
    });
  } catch (err) {
    console.error("Failed to connect to ChromaDB collection", err);
    return { comments: [], escalate: false };
  }

  const fileChunks = splitDiffByFile(prDiff);
  const allComments = [];
  let escalate = false;

  for (const { file, diff } of fileChunks) {
    if (diff.trim().length === 0) continue;

    // Step 2: For each chunk, query ChromaDB top-5 similar records
    const results = await collection.query({
      queryTexts: [diff],
      nResults: 5,
    });

    const docs = results.documents[0] || [];
    const metadatas = results.metadatas[0] || [];
    const distances = results.distances[0] || [];

    let contextStr = "No relevant historical reviews found.";
    // Build a set of valid source PRs/engineers from ChromaDB metadata
    const validSources = new Set();
    const validEngineers = new Set();

    if (docs.length > 0) {
      contextStr = docs.map((doc, idx) => {
        const meta = metadatas[idx] || {};
        const prNum = meta.pr_number || null;
        const engineer = meta.engineer_id || null;
        if (prNum) validSources.add(String(prNum));
        if (engineer) validEngineers.add(engineer);
        return `[Source PR: #${prNum || 'N/A'}, Reviewer: ${engineer || 'N/A'}]\nHistorical Diff & Comment:\n${doc}`;
      }).join("\n\n---\n\n");
    }

    // Step 3: Build this prompt for Groq
    const systemPrompt = `You are Sensei, an AI code reviewer trained on this team.
Review exactly as the senior engineers on this team would.
Output ONLY valid JSON.

CRITICAL RULES for source_pr and source_engineer:
- You MUST ONLY use source_pr and source_engineer values that appear in the provided Context section below.
- If no context matches, set source_pr to "N/A" and source_engineer to "N/A".
- NEVER invent or guess PR numbers or engineer names. Use ONLY what is given.`;
    
    const userPrompt = `Task: Review this diff. Output JSON object containing a "comments" array, each with: { "line": <number>, "issue": "<string>", "severity": "<low|medium|high|critical>", "explanation": "<string>", "suggestion": "<string>", "source_pr": "<string — MUST be from Context below or N/A>", "source_engineer": "<string — MUST be from Context below or N/A>", "confidence": <number between 0 and 1> }. If there are no issues, return {"comments": []}.

Context (past reviews on similar code):
---
${contextStr}
---

Current PR diff for file ${file}:
---
${diff}
---`;

    try {
      console.log(`🧠 Calling Groq for file: ${file}`);

      // Retry logic for rate-limit (429) errors
      let completion = null;
      const maxRetries = 3;
      const retryDelays = [10_000, 30_000, 60_000]; // 10s, 30s, 60s

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ]
          });
          break; // Success — exit retry loop
        } catch (retryErr) {
          if (retryErr.status === 429 && attempt < maxRetries) {
            const delay = retryDelays[attempt];
            console.warn(`⏳ Rate limited on ${file}. Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
            await new Promise((r) => setTimeout(r, delay));
          } else {
            throw retryErr; // Non-429 error or exhausted retries
          }
        }
      }

      if (!completion) {
        console.warn(`⚠️ Skipping ${file} — could not get a response after ${maxRetries} retries.`);
        continue;
      }

      // Step 4: Parse Groq JSON response
      const responseText = completion.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(responseText || "{}");
      const comments = parsed.comments || [];

      // Step 5: Validate sources & calculate confidence per comment
      for (const comment of comments) {
        // Sanitize source_pr — only allow values that exist in ChromaDB results
        if (comment.source_pr && comment.source_pr !== "N/A") {
          const cleanPR = String(comment.source_pr).replace(/^#/, "");
          if (!validSources.has(cleanPR)) {
            comment.source_pr = "N/A";
            comment.source_engineer = "N/A";
          }
        }
        if (comment.source_engineer && comment.source_engineer !== "N/A") {
          if (!validEngineers.has(comment.source_engineer)) {
            comment.source_engineer = "N/A";
          }
        }

        // Calculate confidence using cosine distance
        const topDistance = distances.length > 0 ? distances[0] : 1;
        const topCosineSimilarity = Math.max(0, 1 - topDistance);
        
        const matchCount = docs.length; 
        const patternFrequency = 1; // Simplification

        // Confidence formula provided by user
        const score = (topCosineSimilarity * 0.6) + ((matchCount / 5) * 0.25) + ((patternFrequency / 10) * 0.15);
        
        comment.calculated_score = score;
        comment.file = file; // Attach file context
        
        if (score < 0.80) {
          escalate = true;
        }
        
        allComments.push(comment);
      }
    } catch (err) {
      console.error(`Failed to generate or parse review for file ${file}:`, err);
    }
  }

  // Step 6: Return { comments, escalate: boolean }
  return { comments: allComments, escalate };
}
