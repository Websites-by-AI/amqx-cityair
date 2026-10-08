import type { MaturityBand } from "@/lib/types";

const bandColor: Record<string, string> = {
  Starting: "#e11d48",
  Developing: "#d97706",
  Established: "#1f85c2",
  Advanced: "#0e9bb4",
  Leading: "#059669",
};

export function scoreColor(score: number, band?: MaturityBand) {
  if (band && bandColor[band]) return bandColor[band];
  if (score >= 85) return bandColor.Leading;
  if (score >= 70) return bandColor.Advanced;
  if (score >= 55) return bandColor.Established;
  if (score >= 35) return bandColor.Developing;
  return bandColor.Starting;
}

export function ScoreGauge({
  value,
  band,
  size = 168,
  label = "Readiness score",
}: {
  value: number;
  band?: MaturityBand;
  size?: number;
  label?: string;
}) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c * 0.75;
  const color = scoreColor(pct, band);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`} role="img"
        aria-label={`${label}: ${pct} out of 100`}>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.75} ${c}`}
            transform="rotate(135)"
          />
          <circle
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(135)"
            style={{ transition: "stroke-dasharray .8s cubic-bezier(.22,1,.36,1)" }}
          />
          <text
            textAnchor="middle"
            y={6}
            fontSize={size * 0.22}
            fontWeight={800}
            fill="#082641"
          >
            {pct}
          </text>
          <text textAnchor="middle" y={28} fontSize={size * 0.075} fill="#64748b">
            {band ? band : "of 100"}
          </text>
        </g>
      </svg>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export function CategoryBars({
  scores,
  compare,
}: {
  scores: Record<string, number>;
  compare?: Record<string, number>;
}) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="space-y-2.5">
      {entries.map(([label, value]) => (
        <li key={label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold text-brand-900">{label}</span>
            <span className="tabular-nums text-slate-500">
              {value}
              {compare && compare[label] !== undefined && ` / ${compare[label]}`}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="flex h-full">
              <div
                className="h-full rounded-l-full"
                style={{
                  width: `${value}%`,
                  background: scoreColor(value),
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Radar({
  axes,
  size = 300,
}: {
  axes: { label: string; value: number }[];
  size?: number;
}) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 42;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const radius = (Math.max(0, Math.min(100, value)) / 100) * R;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  const poly = axes.map((a, i) => point(i, a.value).join(",")).join(" ");
  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label="Radar chart of domain scores">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => point(i, ring).join(",")).join(" ")}
          fill="none"
          stroke="#e2e8f0"
        />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, 100);
        return (
          <line key={a.label} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" />
        );
      })}
      <polygon points={poly} fill="rgba(31,133,194,0.25)" stroke="#1f85c2" strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = point(i, a.value);
        return <circle key={a.label} cx={x} cy={y} r={3} fill="#0e5485" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, 118);
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            fontSize={9}
            textAnchor={x > cx + 6 ? "start" : x < cx - 6 ? "end" : "middle"}
            dominantBaseline="middle"
            fill="#475569"
          >
            {a.label.length > 18 ? `${a.label.slice(0, 17)}…` : a.label}
          </text>
        );
      })}
    </svg>
  );
}

export function GroupedBars({
  series,
}: {
  series: { name: string; color: string; scores: Record<string, number> }[];
}) {
  const labels = Array.from(
    new Set(series.flatMap((s) => Object.keys(s.scores))),
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <ul className="space-y-3">
        {labels.map((label) => (
          <li key={label}>
            <p className="text-xs font-semibold text-brand-900">{label}</p>
            <div className="mt-1 space-y-1">
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.scores[label] ?? 0}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] tabular-nums text-slate-500">
                    {s.scores[label] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConfidenceDial({ value }: { value: number }) {
  const color = value >= 70 ? "#059669" : value >= 45 ? "#d97706" : "#e11d48";
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="5" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 94.2} 94.2`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-brand-900">
          {value}
        </span>
      </div>
      <div>
        <p className="text-sm font-bold text-brand-950">Evidence confidence</p>
        <p className="text-xs text-slate-500">
          {value >= 70 ? "Well evidenced" : value >= 45 ? "Partly evidenced" : "Weakly evidenced"}
        </p>
      </div>
    </div>
  );
}
