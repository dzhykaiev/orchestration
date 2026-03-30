import { Skeleton } from "./Skeleton";

function SkeletonStatCard() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
      <Skeleton width="2rem" height="1.5rem" borderRadius="4px" />
      <div style={{ marginTop: "0.35rem" }}>
        <Skeleton width="60%" height="0.8rem" borderRadius="4px" />
      </div>
    </div>
  );
}

function SkeletonWorkstreamCard() {
  return (
    <div className="card" style={{ borderLeft: "4px solid var(--color-border)" }}>
      <div className="flex justify-between items-center">
        <Skeleton width="50%" height="1.1rem" borderRadius="4px" />
        <Skeleton width="5rem" height="1.4rem" borderRadius="10px" />
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <Skeleton width="80%" height="0.875rem" borderRadius="4px" />
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <Skeleton width="100%" height="0.5rem" borderRadius="4px" />
      </div>
    </div>
  );
}

export function SkeletonProjectDetail() {
  return (
    <div>
      {/* Back button */}
      <Skeleton width="4rem" height="2.2rem" borderRadius="6px" />

      {/* Header */}
      <div className="flex justify-between items-center" style={{ marginTop: "1rem" }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <Skeleton width="10rem" height="1.5rem" borderRadius="4px" />
          <Skeleton width="4rem" height="1.2rem" borderRadius="10px" />
        </div>
        <Skeleton width="5rem" height="1.4rem" borderRadius="10px" />
      </div>
      <div style={{ margin: "0.5rem 0 1rem" }}>
        <Skeleton width="70%" height="0.9rem" borderRadius="4px" />
      </div>

      {/* Action buttons */}
      <div className="flex" style={{ gap: 8, marginBottom: "1.5rem" }}>
        <Skeleton width="7rem" height="2.2rem" borderRadius="6px" />
        <Skeleton width="5rem" height="2.2rem" borderRadius="6px" />
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
          margin: "1rem 0",
        }}
      >
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="flex justify-between items-center mb-1">
          <Skeleton width="7rem" height="1rem" borderRadius="4px" />
          <Skeleton width="2rem" height="0.875rem" borderRadius="4px" />
        </div>
        <Skeleton width="100%" height="0.625rem" borderRadius="4px" />
      </div>

      {/* Workstreams heading */}
      <Skeleton width="7rem" height="1.3rem" borderRadius="4px" />

      {/* Workstream cards */}
      <div style={{ marginTop: "0.75rem" }}>
        <SkeletonWorkstreamCard />
        <SkeletonWorkstreamCard />
        <SkeletonWorkstreamCard />
      </div>
    </div>
  );
}
