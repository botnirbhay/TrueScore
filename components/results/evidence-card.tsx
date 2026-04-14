import { Card } from "@/components/ui/card";

type EvidenceCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function EvidenceCard({ title, eyebrow, children }: EvidenceCardProps) {
  return (
    <Card className="px-5 py-5 xl:px-6 xl:py-6">
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">{eyebrow}</p> : null}
      <h3 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
