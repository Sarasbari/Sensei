import type { Review } from "../api/client";

interface Props {
  outcome: Review["outcome"];
}

export default function OutcomeBadge({ outcome }: Props) {
  const labels: Record<string, string> = {
    accepted: "Accepted",
    corrected: "Corrected",
    dismissed: "Dismissed",
    escalated: "Escalated",
    posted: "Posted",
    posted_fallback: "Posted",
  };

  const cls =
    outcome === "accepted"
      ? "accepted"
      : outcome === "corrected"
      ? "corrected"
      : outcome === "dismissed"
      ? "dismissed"
      : "posted";

  return <span className={`badge ${cls}`}>{labels[outcome] ?? outcome}</span>;
}
