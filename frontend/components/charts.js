/**
 * charts.js — Chart Components
 *
 * Reusable chart components for dashboard visualizations:
 *   - Review activity over time (line chart)
 *   - Confidence distribution (bar chart)
 *   - Category breakdown (donut chart)
 *   - Escalation trends (area chart)
 */

/**
 * Render a stats card into a container.
 * @param {HTMLElement} container
 * @param {string} label
 * @param {string|number} value
 * @param {string} trend - "up" | "down" | "flat"
 */
export function renderStatCard(container, label, value, trend = "flat") {
  const card = document.createElement("div");
  card.className = "stat-card";

  const trendIcon = { up: "↑", down: "↓", flat: "→" }[trend] || "→";
  const trendColor = { up: "var(--accent-success)", down: "var(--accent-danger)", flat: "var(--text-muted)" }[trend];

  card.innerHTML = `
    <div class="stat-value">${value} <span style="font-size:0.75em;color:${trendColor}">${trendIcon}</span></div>
    <div class="stat-label">${label}</div>
  `;

  container.appendChild(card);
}

/**
 * Render a confidence badge.
 * @param {number} confidence - 0.0 to 1.0
 * @returns {string} HTML string
 */
export function confidenceBadge(confidence) {
  const percent = Math.round(confidence * 100);
  let level = "low";
  if (percent >= 80) level = "high";
  else if (percent >= 60) level = "medium";

  return `<span class="confidence-badge ${level}">${percent}%</span>`;
}

/**
 * Render a review card.
 * @param {object} review
 * @returns {string} HTML string
 */
export function renderReviewCard(review) {
  return `
    <div class="review-card" data-review-id="${review.id}">
      <div style="flex:1">
        <strong>${review.pr_title}</strong>
        <div style="color:var(--text-muted);font-size:0.8rem">
          PR #${review.pr_number} · ${review.repo} · ${review.comments_count} comments
        </div>
      </div>
      ${confidenceBadge(review.avg_confidence)}
    </div>
  `;
}

// TODO: Add canvas-based chart rendering (or integrate Chart.js / D3)
