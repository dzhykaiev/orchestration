"use client";

interface ReviewItem {
  id: string;
  verdict: string;
  feedback: string;
  requestedChanges: string[];
  iteration: number;
  createdAt: string;
}

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  approved: {
    bg: "var(--color-status-green-bg)",
    text: "var(--color-status-green-text)",
  },
  changes_requested: {
    bg: "var(--color-status-yellow-bg)",
    text: "var(--color-status-yellow-text)",
  },
  rejected: { bg: "var(--color-status-red-bg)", text: "var(--color-status-red-text)" },
};

export function ReviewHistory({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) return null;

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>
        Reviews ({reviews.length})
      </div>
      <div className="flex flex-col gap-2">
        {reviews.map((review) => {
          const colors = VERDICT_COLORS[review.verdict] ?? {
            bg: "var(--color-status-yellow-bg)",
            text: "var(--color-status-yellow-text)",
          };
          return (
            <div
              key={review.id}
              style={{
                padding: "0.5rem 0.75rem",
                background: colors.bg,
                borderRadius: 4,
                fontSize: "0.8rem",
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontWeight: 600, color: colors.text, textTransform: "capitalize" }}>
                  {review.verdict.replace("_", " ")}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                  Iteration {review.iteration}
                </span>
              </div>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>{review.feedback}</p>
              {review.requestedChanges.length > 0 && (
                <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem", fontSize: "0.75rem" }}>
                  {review.requestedChanges.map((change, i) => (
                    <li key={`${review.id}-${i}`}>{change}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
