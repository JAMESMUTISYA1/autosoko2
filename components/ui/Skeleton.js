export default function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-fg/[0.08] ${className}`}
      aria-hidden="true"
    />
  );
}
