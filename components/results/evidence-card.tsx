type EvidenceCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

export function EvidenceCard({ title, eyebrow, children }: EvidenceCardProps) {
  return (
    <article className="rounded-3xl border border-border bg-white p-5 shadow-card">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/45">{eyebrow}</p> : null}
      <h3 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

