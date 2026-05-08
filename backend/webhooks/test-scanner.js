import "dotenv/config";
import { runNightlyScan } from "./src/services/scanner.js";
import { initPool, closePool } from "./src/db/pool.js";
import { initGitHubApp } from "./src/services/github.js";

async function main() {
  await initPool();
  initGitHubApp();
  console.log("Testing nightly scanner...");
  await runNightlyScan("Sarasbari/Sensei");
  console.log("Done.");
  await closePool();
  process.exit(0);
}

main();
