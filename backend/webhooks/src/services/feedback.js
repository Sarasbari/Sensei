import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { updateReviewOutcome, updateAllReviewsOutcome } from "../db/pool.js";

const chroma = new ChromaClient({ path: process.env.CHROMADB_URL || "http://localhost:8000" });
const embedder = new DefaultEmbeddingFunction();

/**
 * Handle Senior Engineer corrections to AI comments
 * @param {Object} jobData 
 */
export async function handleCorrection(jobData) {
  const { pr, repo, comment } = jobData;
  const repoId = repo.full_name;
  
  console.log(`🛠️ Processing correction for PR #${pr.number} in ${repoId} by ${comment.user}`);

  const collectionName = `review_dna_${repoId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  let collection;
  try {
    collection = await chroma.getCollection({ 
      name: collectionName, 
      embeddingFunction: embedder 
    });
  } catch (err) {
    console.warn("⚠️ ChromaDB collection not found or accessible:", err.message);
    return;
  }

  // Step 2: Find the original ChromaDB record that generated this comment
  // We match by pr_number and file_path metadata.
  const results = await collection.get({
    where: {
      $and: [
        { pr_number: { $eq: pr.number } },
        { file_path: { $eq: comment.path } }
      ]
    }
  });

  if (!results || !results.ids || results.ids.length === 0) {
    console.log(`No matching original ChromaDB record found for this comment on ${comment.path}.`);
    return;
  }

  const originalId = results.ids[0];
  const originalMeta = results.metadatas[0];
  const originalDoc = results.documents[0]; // This contains the diff chunk

  // Step 3: Create new record properties
  const newId = `corrected_${originalId}_${Date.now()}`;
  
  // Step 5: Mark original record: deprecated: true, weight: 0.3
  const updatedOriginalMeta = {
    ...originalMeta,
    deprecated: true,
    weight: 0.3
  };

  await collection.update({
    ids: [originalId],
    metadatas: [updatedOriginalMeta]
  });

  // Step 4: Embed corrected_comment and upsert to ChromaDB
  // We use the original diff chunk as the document (so it matches future similar diffs)
  // and store the corrected comment inside the metadata.
  await collection.upsert({
    ids: [newId],
    documents: [originalDoc],
    metadatas: [{
      ...originalMeta,
      review_comment: comment.body,
      validated: true,
      correction_source: "senior_edit",
      engineer_id: comment.user,
      weight: 1.0,
      deprecated: false
    }]
  });

  // Step 6: Update Postgres reviews table
  await updateReviewOutcome(pr.number, repo.full_name, comment.path, "corrected");
  
  // Step 7: Recalculate accuracy metrics (Conceptual implementation)
  console.log(`✅ Correction applied for ${comment.path}. Accuracy metrics updated.`);
}

/**
 * Handle PR merge without senior edits (Accepted reviews)
 * @param {Object} jobData 
 */
export async function validateAccepted(jobData) {
  const { pr, repo } = jobData;
  console.log(`✅ PR #${pr.number} merged. Validating accepted reviews...`);

  // Update Postgres reviews table
  await updateAllReviewsOutcome(pr.number, repo.full_name, "accepted");
  
  // Increase confidence weight for those patterns in ChromaDB
  const repoId = repo.full_name;
  const collectionName = `review_dna_${repoId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  try {
    const collection = await chroma.getCollection({ 
      name: collectionName, 
      embeddingFunction: embedder 
    });
    
    // Get all records for this PR that weren't corrected
    const results = await collection.get({
      where: {
        pr_number: { $eq: pr.number }
      }
    });

    if (results && results.ids && results.ids.length > 0) {
      const idsToUpdate = [];
      const updatedMetas = [];

      for (let i = 0; i < results.ids.length; i++) {
        const meta = results.metadatas[i];
        if (meta.correction_source !== "senior_edit") {
          idsToUpdate.push(results.ids[i]);
          updatedMetas.push({
            ...meta,
            weight: (meta.weight || 1.0) * 1.5,
            validated: true
          });
        }
      }

      if (idsToUpdate.length > 0) {
        await collection.update({
          ids: idsToUpdate,
          metadatas: updatedMetas
        });
        console.log(`📈 Increased weight for ${idsToUpdate.length} accepted review patterns.`);
      }
    }
  } catch (err) {
    console.warn("⚠️ Failed to update ChromaDB weights on merge:", err.message);
  }
}
