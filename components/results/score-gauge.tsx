type ScoreGaugeProps = {
  label: string;
  value: number;
  tone?: "primary" | "muted";
};

function gaugeColor(value: number, tone: "primary" | "muted") {
  if (tone === "muted") {
    return value >= 70 ? "#2dd4bf" : value >= 50 ? "#f59e0b" : "#fb7185";
  }

  return value >= 75 ? "#2dd4bf" : value >= 55 ? "#f59e0b" : "#fb7185";
}

export function ScoreGauge({ label, value, tone = "primary" }: ScoreGaugeProps) {
  const color = gaugeColor(value, tone);

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-card backdrop-blur">
      <div className="flex items-center gap-4">
        <div
          className="grid h-16 w-16 place-items-center rounded-full text-lg font-bold"
          style={{
            background: `conic-gradient(${color} ${value}%, rgba(255,255,255,0.08) 0)`,
            color
          }}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-[#0b0f14] text-sm font-heading text-white">
            {value}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-white">{value}/100</p>
        </div>
      </div>
    </div>
  );
}
