import { UserCheck } from "lucide-react";

export default function ActionedByBadge({ verb, name, at }) {
  if (!name) return null;
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted">
      <UserCheck size={11} className="shrink-0" />
      {verb} by <span className="text-fg font-medium">{name}</span>
      {at && <span>· {at}</span>}
    </span>
  );
}
