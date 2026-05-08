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
    if (docs.length > 0) {
      contextStr = docs.map((doc, idx) => {
        const meta = metadatas[idx] || {};
        return `[Source PR: #${meta.pr_number || 'N/A'}, Reviewer: ${meta.engineer_id || 'Unknown'}]\nHistorical Diff & Comment:\n${doc}`;
      }).join("\n\n---\n\n");
    }

    // Step 3: Build this prompt for Groq
    const systemPrompt = "You are Sensei, an AI code reviewer trained on this team.\nReview exactly as the senior engineers on this team would.\nOutput ONLY valid JSON.";
    
    const userPrompt = `Task: Review this diff. Output JSON object containing a "comments" array, each with: { "line": <number>, "issue": "<string>", "severity": "<low|medium|high>", "explanation": "<string>", "suggestion": "<string>", "source_pr": "<string>", "source_engineer": "<string>", "confidence": <number between 0 and 1> }. If there are no issues, return {"comments": []}.

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
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      // Step 4: Parse Groq JSON response
      const responseText = completion.choices[0]?.message?.content?.trim();
      const parsed = JSON.parse(responseText || "{}");
      const comments = parsed.comments || [];

      // Step 5: Calculate overall confidence score per comment
      for (const comment of comments) {
        // We use Math.max(0, 1 - distance) assuming distance is Cosine distance.
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
