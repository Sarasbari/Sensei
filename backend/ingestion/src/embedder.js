import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';
import crypto from "crypto";

/**
 * Embeds records using local ChromaDB default embedding and stores them.
 * @param {Array} records - The DNA records to store
 * @param {string} repoFullName - Format "owner/repo" to use for the collection ID
 */
export async function embedAndStore(records, repoFullName) {
  if (records.length === 0) {
    console.log("No records to embed and store.");
    return;
  }

  const embedder = new DefaultEmbeddingFunction();
  const chroma = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });

  const repoId = repoFullName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const collectionName = `review_dna_${repoId}`;
  
  console.log(`🧠 Upserting to ChromaDB collection: ${collectionName}`);
  const collection = await chroma.getOrCreateCollection({ 
    name: collectionName,
    embeddingFunction: embedder
  });

  // Batch process in chunks of 100
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    console.log(`   Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}... (${batch.length} records)`);
    
    const ids = batch.map(() => crypto.randomUUID());
    const metadatas = batch.map(r => ({
      engineer_id: r.engineer_id,
      pr_number: String(r.pr_number), // Metadata values should be strings or numbers
      file_path: r.file_path,
      review_comment: r.review_comment,
      pattern_type: r.pattern_type,
      validated: true,
      times_referenced: 0
    }));
    
    // We pass the formatted string to `documents`.
    // The embeddingFunction will automatically create embeddings from these documents.
    const documents = batch.map(r => `File: ${r.file_path}\nDiff:\n${r.diff_chunk}\nComment:\n${r.review_comment}`);
    
    await collection.upsert({
      ids,
      metadatas,
      documents,
    });
  }

  console.log(`✅ Successfully embedded and stored ${records.length} records in ChromaDB.`);
  return { success: true, count: records.length };
}
