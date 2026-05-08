import "dotenv/config";
import { fetchMergedPRs } from "./fetcher.js";
import { buildDNARecords } from "./chunker.js";
import { embedAndStore } from "./embedder.js";

async function runPipeline() {
  const repoFullName = process.argv[2];
  if (!repoFullName) {
    console.error("Usage: node src/index.js <owner/repo>");
    process.exit(1);
  }

  try {
    const prs = await fetchMergedPRs(repoFullName, 6);
    const records = buildDNARecords(prs);
    await embedAndStore(records, repoFullName);
  } catch (error) {
    console.error("💥 Pipeline failed:", error);
    process.exit(1);
  }
}

runPipeline();
