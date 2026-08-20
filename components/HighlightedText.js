import { toHighlightSegments } from "@/lib/search/highlight";

export default function HighlightedText({ text, indices, className = "" }) {
  const segments = toHighlightSegments(text, indices);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.matched ? (
          <mark key={i} className="bg-accent/15 text-fg font-semibold rounded-sm">
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
