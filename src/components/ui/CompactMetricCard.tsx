type CompactMetricCardProps = {
  label: string;
  value: string;
  color: string;
  accentBg?: string;
  className?: string;
};

export default function CompactMetricCard({
  label,
  value,
  color,
  accentBg,
  className = "",
}: CompactMetricCardProps) {
  return (
    <div
      className={`admin-compact-metric-card ${className}`.trim()}
      style={{
        ["--metric-accent" as string]: color,
        ["--metric-accent-bg" as string]: accentBg ?? `${color}12`,
      }}
    >
      <span className="admin-compact-metric-glow" aria-hidden="true" />
      <p className="admin-compact-metric-value">{value}</p>
      <p className="admin-compact-metric-label">{label}</p>
    </div>
  );
}
