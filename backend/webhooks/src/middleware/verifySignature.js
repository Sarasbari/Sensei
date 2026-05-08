/**
 * verifySignature.js — HMAC-SHA256 Webhook Signature Verification
 *
 * Express middleware that validates the X-Hub-Signature-256 header
 * against the raw request body using the WEBHOOK_SECRET env var.
 * Rejects requests with 401 if the signature is missing or invalid.
 */

import crypto from "node:crypto";

/**
 * Express middleware: verify GitHub webhook signature.
 *
 * GitHub sends X-Hub-Signature-256: sha256=<hex-hmac>.
 * We compute HMAC-SHA256 of the raw body with WEBHOOK_SECRET and
 * use timingSafeEqual to prevent timing attacks.
 */
export function verifySignature(req, res, next) {
  const signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    return res.status(401).json({ error: "Missing X-Hub-Signature-256 header" });
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ WEBHOOK_SECRET not set");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");

  // Both strings must be the same length for timingSafeEqual
  const signatureBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (
    signatureBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(signatureBuf, expectedBuf)
  ) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  next();
}
