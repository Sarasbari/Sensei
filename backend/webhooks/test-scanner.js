import "dotenv/config";
import { runNightlyScan } from "./src/services/scanner.js";
import { initPool, closePool } from "./src/db/pool.js";
import { initGitHubApp } from "./src/services/github.js";

async function testScan() {
  const repoId = process.argv[2];
  if (!repoId) {
    console.error("Usage: node test-scanner.js <owner/repo>");
    process.exit(1);
  }

  await initPool();
  initGitHubApp();

  try {
    await runNightlyScan(repoId);
  } catch (err) {
    console.error("Scan failed:", err);
  } finally {
    await closePool();
  }
}

testScan();
