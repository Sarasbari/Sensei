/**
 * review-cards.js — Review Card Components
 *
 * Detailed review card UI showing:
 *   - PR info (title, author, repo)
 *   - Sensei's review comments with confidence badges
 *   - Source citations (which PRs and engineers informed each comment)
 *   - Escalation status
 */

/**
 * Render a detailed review card with explainability.
 * @param {object} review - Full review data from API
 * @returns {HTMLElement}
 */
export function renderDetailedReviewCard(review) {
  const card = document.createElement("div");
  card.className = "review-detail-card";

  card.innerHTML = `
    <div class="review-detail-header">
      <h3>${review.pr_title}</h3>
      <span class="review-meta">
        PR #${review.pr_number} · ${review.repo} · by @${review.author}
      </span>
    </div>

    <div class="review-comments">
      ${(review.comments || []).map(renderCommentBlock).join("")}
    </div>

    ${review.escalated ? renderEscalationBanner(review.escalation) : ""}
  `;

  return card;
}

function renderCommentBlock(comment) {
  const confidenceClass = comment.confidence >= 0.8 ? "high" : comment.confidence >= 0.6 ? "medium" : "low";

  return `
    <div class="comment-block">
      <div class="comment-header">
        <span class="comment-file">${comment.file_path}:${comment.line_number}</span>
        <span class="confidence-badge ${confidenceClass}">${Math.round(comment.confidence * 100)}%</span>
        <span class="comment-category">${comment.category}</span>
      </div>
      <div class="comment-body">${comment.body}</div>
      <div class="comment-citations">
        📎 Based on: ${comment.source_engineers.map(e => `@${e}`).join(", ")}
        in PRs ${comment.source_prs.map(p => `#${p}`).join(", ")}
      </div>
    </div>
  `;
}

function renderEscalationBanner(escalation) {
  return `
    <div class="escalation-banner">
      ⚠️ Escalated to: ${escalation.assigned_to.map(e => `@${e}`).join(", ")}
      <span class="escalation-status">${escalation.status}</span>
    </div>
  `;
}
