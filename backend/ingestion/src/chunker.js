import { get_encoding } from "tiktoken";

/**
 * Builds DNA records by pairing file diff chunks with review comments
 * @param {Array} prs - The array of PRs returned from fetchMergedPRs
 * @returns {Array} Array of DNA record objects ready for embedding
 */
export function buildDNARecords(prs) {
  const records = [];
  const enc = get_encoding("cl100k_base"); // Standard for OpenAI models

  for (const pr of prs) {
    for (const file of pr.files) {
      if (!file.patch) continue;

      // Find all review comments for this specific file
      const fileComments = pr.reviewComments.filter((c) => c.path === file.filename);
      if (fileComments.length === 0) continue; // Skip files with no review comments

      // Split the file patch into lines
      const lines = file.patch.split("\n");
      let currentChunk = [];
      let currentTokens = 0;
      const CHUNK_LIMIT = 512;

      const flushChunk = () => {
        if (currentChunk.length === 0) return;
        const diff_chunk = currentChunk.join("\n");

        // Pair this chunk with all comments on this file. 
        // A more advanced approach would match the comment's `original_position` to the exact chunk.
        for (const comment of fileComments) {
          records.push({
            diff_chunk,
            review_comment: comment.body,
            engineer_id: comment.user.login, // The reviewer who made the comment
            pr_number: pr.pr_number,
            file_path: file.filename,
            pattern_type: "review_correction",
          });
        }

        currentChunk = [];
        currentTokens = 0;
      };

      for (const line of lines) {
        // Encode each line to count tokens
        const tokens = enc.encode(line).length;
        
        // If adding this line exceeds 512 tokens, flush the current chunk
        if (currentTokens + tokens > CHUNK_LIMIT) {
          flushChunk();
        }
        
        currentChunk.push(line);
        currentTokens += tokens;
      }
      
      // Flush any remaining lines
      flushChunk();
    }
  }

  enc.free(); // Free memory
  console.log(`🧩 Built ${records.length} DNA records from ${prs.length} PRs.`);
  return records;
}
