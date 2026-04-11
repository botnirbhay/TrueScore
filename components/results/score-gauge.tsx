type ScoreGaugeProps = {
  label: string;
  value: number;
  tone?: "primary" | "muted";
};

function gaugeColor(value: number, tone: "primary" | "muted") {
  if (tone === "muted") {
    return value >= 70 ? "#0f766e" : value >= 50 ? "#b45309" : "#b91c1c";
  }

  return value >= 75 ? "#0f766e" : value >= 55 ? "#b45309" : "#b91c1c";
}

export function ScoreGauge({ label, value, tone = "primary" }: ScoreGaugeProps) {
  const color = gaugeColor(value, tone);

  return (
    <div className="rounded-3xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        <div
          className="grid h-16 w-16 place-items-center rounded-full text-lg font-bold"
          style={{
            background: `conic-gradient(${color} ${value}%, rgba(23,23,23,0.08) 0)`,
            color
          }}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-panel text-sm font-heading text-foreground">
            {value}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/55">{label}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">{value}/100</p>
        </div>
      </div>
    </div>
  );
}

