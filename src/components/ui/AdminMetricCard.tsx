import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AdminMetricCardProps = {
  label: string;
  value: string;
  accent: string;
  accentBg?: string;
  note?: string;
  className?: string;
  children?: ReactNode;
  index?: number;
  icon?: LucideIcon;
  onClick?: () => void;
};

export default function AdminMetricCard({
  label,
  value,
  accent,
  note,
  className = "",
  children,
  index = 1,
  icon: Icon,
  onClick,
}: AdminMetricCardProps) {
  const isPrimary = index === 0;
  const isTextValue = isNaN(Number(value)) && value.length > 3; // "Active", "Paused" etc.
  const valueFontSize = isTextValue ? "text-2xl" : "text-4xl";

  if (isPrimary) {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-[24px] p-6 overflow-hidden flex flex-col min-h-[120px] ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} ${className}`.trim()}
        style={{
          background: `linear-gradient(135deg, #1e293b, #0f172a)`,
          boxShadow: `0 8px 24px rgba(15, 23, 42, 0.25)`,
        }}
      >
        <div className="relative z-10 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              {Icon && <Icon size={18} className="text-white/70" />}
              <p className="text-sm font-semibold text-white/90 leading-tight">{label}</p>
            </div>
          </div>
          <p className={`${valueFontSize} font-black text-white leading-none mt-auto truncate`}>{value}</p>
          {note && <p className="text-xs font-medium text-white/60 mt-2">{note}</p>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-[24px] p-6 bg-white overflow-hidden flex flex-col min-h-[120px] ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} ${className}`.trim()}
      style={{ boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)" }}
    >
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={18} style={{ color: accent }} />}
            <p className="text-sm font-semibold text-gray-600 leading-tight">{label}</p>
          </div>
        </div>
        <p className={`${valueFontSize} font-black text-gray-900 leading-none mt-auto truncate`}>{value}</p>
        {note && <p className="text-xs font-medium text-gray-500 mt-2">{note}</p>}
        {children}
      </div>
    </div>
  );
}
