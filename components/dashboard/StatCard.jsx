export default function StatCard({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="bg-card border border-line rounded-md p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <p className="font-display text-2xl">{value}</p>
      {sublabel && <p className="text-xs text-muted mt-1">{sublabel}</p>}
    </div>
  );
}