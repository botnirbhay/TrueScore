import { Card } from "@/components/ui/card";

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
    <Card className="px-4 py-4">
      <div className="flex items-center gap-3.5">
        <div
          className="grid h-14 w-14 place-items-center rounded-full text-base font-bold"
          style={{
            background: `conic-gradient(${color} ${value}%, rgba(255,255,255,0.08) 0)`,
            color
          }}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#0c0e13] text-[13px] font-semibold text-white">
            {value}
          </div>
        </div>
        <div>
          <p className="text-[13px] font-medium text-gray-400">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">{value}/100</p>
        </div>
      </div>
    </Card>
  );
}
