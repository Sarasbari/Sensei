import "dotenv/config";
import { generateReview } from "./src/services/reviewer.js";

const mockDiff = `
diff --git a/src/utils/auth.js b/src/utils/auth.js
index 8f3d1b2..4c8a2b1 100644
--- a/src/utils/auth.js
+++ b/src/utils/auth.js
@@ -10,6 +10,8 @@
 function verifyToken(token) {
-  return jwt.verify(token, process.env.JWT_SECRET);
+  // Temporary bypass for testing
+  if (token === "test-token-123") return { user: "admin" };
+  return jwt.verify(token, process.env.JWT_SECRET);
 }
`;

async function testRAG() {
  console.log("🧪 Starting RAG Review Engine test...");
  const repoId = "Sarasbari_NAGARIK"; // The repository we ingested earlier
  
  try {
    const result = await generateReview(mockDiff, repoId);
    console.log("\n=== 🎯 RAG REVIEW RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.escalate) {
      console.log("\n⚠️ Review was ESCALATED (Confidence below 80%)");
    } else {
      console.log("\n✅ Review had high confidence, no escalation needed.");
    }
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

testRAG();
