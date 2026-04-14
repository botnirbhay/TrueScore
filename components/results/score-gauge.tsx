import { Card } from "@/components/ui/card";

type ScoreGaugeProps = {
  label: string;
  value: number;
  tone?: "primary" | "muted";
};

function gaugeTone(value: number, tone: "primary" | "muted") {
  if (tone === "muted") {
    if (value >= 75) {
      return {
        ring: "rgba(94,234,212,0.95)",
        glow: "rgba(94,234,212,0.22)",
        badge: "text-emerald-200"
      };
    }

    if (value >= 55) {
      return {
        ring: "rgba(251,191,36,0.95)",
        glow: "rgba(251,191,36,0.2)",
        badge: "text-amber-200"
      };
    }

    return {
      ring: "rgba(251,113,133,0.95)",
      glow: "rgba(251,113,133,0.2)",
      badge: "text-rose-200"
    };
  }

  if (value >= 80) {
    return {
      ring: "rgba(125,211,252,0.96)",
      glow: "rgba(125,211,252,0.26)",
      badge: "text-sky-100"
    };
  }

  if (value >= 60) {
    return {
      ring: "rgba(251,191,36,0.95)",
      glow: "rgba(251,191,36,0.22)",
      badge: "text-amber-100"
    };
  }

  return {
    ring: "rgba(248,113,113,0.95)",
    glow: "rgba(248,113,113,0.2)",
    badge: "text-rose-100"
  };
}

export function ScoreGauge({ label, value, tone = "primary" }: ScoreGaugeProps) {
  const appearance = gaugeTone(value, tone);

  return (
    <Card className="group px-4 py-4 transition duration-200 hover:border-white/14 hover:bg-[linear-gradient(180deg,rgba(23,29,38,0.92)_0%,rgba(14,18,24,0.98)_100%)]">
      <div className="flex items-center gap-4">
        <div
          className="grid h-16 w-16 place-items-center rounded-full transition duration-200"
          style={{
            background: `conic-gradient(${appearance.ring} ${value}%, rgba(255,255,255,0.08) 0)`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 28px ${appearance.glow}`
          }}
        >
          <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-[#0b1016] text-[13px] font-semibold text-white">
            {value}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-gray-500">{label}</p>
          <p className="mt-1 text-[1.4rem] font-semibold tracking-[-0.04em] text-white">{value}/100</p>
          <p className={`mt-1 text-[12px] font-medium ${appearance.badge}`}>
            {value >= 80 ? "Strong" : value >= 60 ? "Balanced" : "Caution"}
          </p>
        </div>
      </div>
    </Card>
  );
}
