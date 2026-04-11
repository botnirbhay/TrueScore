type EvidenceCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function EvidenceCard({ title, eyebrow, children }: EvidenceCardProps) {
  return (
    <article className="rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 shadow-card backdrop-blur xl:p-6">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">{eyebrow}</p> : null}
      <h3 className="mt-2 font-heading text-xl font-semibold tracking-tight text-white">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}
