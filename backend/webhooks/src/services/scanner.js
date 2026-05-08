import cron from "node-cron";
import { getInstallationOctokit } from "./github.js";
import { getInstallationId, logScanResult, pool } from "../db/pool.js";
import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import Groq from "groq-sdk";

const chroma = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });
const embedder = new DefaultEmbeddingFunction();

let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function runNightlyScan(repoId) {
  console.log(`\n🔍 Starting nightly proactive scan for repo: ${repoId}`);
  
  const installationId = await getInstallationId(repoId);
  if (!installationId) {
    console.warn(`No installation ID found for ${repoId}. Skipping.`);
    return;
  }

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoId.split("/");

  // Step 1: Fetch all files modified in the repo in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  let commitsResponse;
  try {
    commitsResponse = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner,
      repo,
      since: sevenDaysAgo.toISOString(),
      per_page: 100
    });
  } catch (err) {
    console.error(`Failed to fetch commits for ${repoId}:`, err.message);
    return;
  }

  const modifiedFiles = new Set();
  for (const commit of commitsResponse.data) {
    try {
      const commitData = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
        owner,
        repo,
        ref: commit.sha,
      });
      for (const file of commitData.data.files || []) {
        if (file.status !== 'removed') {
          modifiedFiles.add(file.filename);
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch commit ${commit.sha}: ${e.message}`);
    }
  }

  console.log(`Found ${modifiedFiles.size} modified files in the last 7 days.`);
  
  if (modifiedFiles.size === 0) {
    await logScanResult(repoId, 0, 0, 0);
    return;
  }

  const collectionName = `review_dna_${repoId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  let collection;
  try {
    collection = await chroma.getCollection({ 
      name: collectionName,
      embeddingFunction: embedder
    });
  } catch (err) {
    console.warn(`Chroma collection ${collectionName} not found. Skipping.`);
    await logScanResult(repoId, modifiedFiles.size, 0, 0);
    return;
  }

  let risksFound = 0;
  let issuesCreated = 0;

  // Step 2: For each modified file
  for (const file of modifiedFiles) {
    let fileContentRes;
    try {
      fileContentRes = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path: file,
      });
    } catch (err) {
      continue; // File might be too large, or removed
    }

    if (!fileContentRes.data.content || fileContentRes.data.type !== 'file') continue;

    const content = Buffer.from(fileContentRes.data.content, 'base64').toString('utf8');
    
    // b. Chunk into 512-token segments (approx 2000 chars)
    const chunks = [];
    for (let i = 0; i < content.length; i += 2000) {
      chunks.push(content.slice(i, i + 2000));
    }

    // c. Embed each chunk
    for (const chunk of chunks) {
      if (chunk.trim().length === 0) continue;

      // d. Query ChromaDB
      const results = await collection.query({
        queryTexts: [chunk],
        nResults: 3,
      });

      const docs = results.documents[0] || [];
      const metadatas = results.metadatas[0] || [];
      const distances = results.distances[0] || [];

      // e. Collect matches where similarity > 0.75 (distance < 0.25)
      for (let i = 0; i < distances.length; i++) {
        if (distances[i] < 0.25) {
          const meta = metadatas[i];
          
          if (!groq) continue; // Skip if no Groq configured

          // Ask Groq if this is truly a HIGH severity risk based on historical context
          const systemPrompt = "You are a proactive code scanner. Check if the provided code chunk exhibits the same HIGH severity issue as the historical review. Output ONLY valid JSON: { \"has_high_risk\": boolean, \"risk_description\": \"string\", \"suggested_fix\": \"string\" }.";
          const userPrompt = `Historical Review Context:\n${meta.review_comment}\n\nCode Chunk (${file}):\n${chunk}\n\nDoes this code contain the same HIGH severity issue?`;

          try {
            const completion = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              temperature: 0.1,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ]
            });

            const parsed = JSON.parse(completion.choices[0]?.message?.content?.trim() || "{}");
            if (parsed.has_high_risk) {
              risksFound++;

              // Step 3: Create GitHub Issue
              // a. Check if there is already an open PR for this file (skip if yes)
              const pullsRes = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
                owner,
                repo,
                state: 'open'
              });
              
              let hasOpenPR = false;
              for (const pr of pullsRes.data) {
                const prFiles = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
                  owner,
                  repo,
                  pull_number: pr.number
                });
                if (prFiles.data.some(f => f.filename === file)) {
                  hasOpenPR = true;
                  break;
                }
              }

              if (!hasOpenPR) {
                const issueBody = `### Sensei Proactive Scan Alert 🚨

**File:** \`${file}\`
**Risk Description:** ${parsed.risk_description}

**Suggested Fix:**
\`\`\`javascript
${parsed.suggested_fix}
\`\`\`

**Historical Context:**
This matches a pattern previously caught by ${meta.engineer_id || 'a senior engineer'} in PR #${meta.pr_number || 'N/A'}.

*Automated by Sensei Nightly Scanner*`;

                await octokit.request('POST /repos/{owner}/{repo}/issues', {
                  owner,
                  repo,
                  title: `Sensei Risk Alert: Potential issue in ${file}`,
                  body: issueBody,
                  labels: ['sensei-proactive-scan', 'needs-review']
                });
                
                issuesCreated++;
                console.log(`✅ Created issue for risk in ${file}`);
              }
              
              // Only create one issue per chunk max
              break;
            }
          } catch (e) {
            console.error("Groq evaluation failed:", e.message);
          }
        }
      }
    }
  }

  // Step 4: Log scan results to Postgres
  await logScanResult(repoId, modifiedFiles.size, risksFound, issuesCreated);
  console.log(`🏁 Nightly scan completed for ${repoId}. Scanned ${modifiedFiles.size} files, found ${risksFound} risks, created ${issuesCreated} issues.`);
}

/**
 * Start the nightly node-cron job.
 */
export function startNightlyCron() {
  // Schedule: node-cron every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log("⏰ Triggering nightly proactive scans...");
    try {
      // Get all unique repos
      const res = await pool().query("SELECT DISTINCT full_name FROM repos");
      for (const row of res.rows) {
        await runNightlyScan(row.full_name);
      }
    } catch (e) {
      console.error("Failed to run nightly scans:", e.message);
    }
  });
  console.log("🕒 Scheduled nightly proactive scanner for 2:00 AM");
}
