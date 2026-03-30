import { Skeleton } from "./Skeleton";

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-1">
        <Skeleton width="60%" height="1.25rem" borderRadius="4px" />
        <Skeleton width="5rem" height="1.4rem" borderRadius="10px" />
      </div>
      <div style={{ margin: "0.5rem 0 0.5rem" }}>
        <Skeleton width="90%" height="0.875rem" borderRadius="4px" />
      </div>
      <Skeleton width="45%" height="0.75rem" borderRadius="4px" />
    </div>
  );
}
