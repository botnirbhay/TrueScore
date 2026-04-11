import { UrlSubmissionForm } from "@/components/forms/url-submission-form";

export default function HomePage() {
  return (
    <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div className="space-y-6">
        <div className="inline-flex rounded-full border border-border bg-panel/80 px-3 py-1 text-sm font-medium text-foreground/70 shadow-sm backdrop-blur">
          MVP landing page
        </div>
        <div className="space-y-4">
          <h1 className="max-w-2xl font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Check a product URL and stage the next steps for a scoring workflow.
          </h1>
          <p className="max-w-xl text-base leading-7 text-foreground/70 sm:text-lg">
            This MVP keeps everything local for now. It gives you a clean entry point for collecting a product URL,
            validating it, and reserving space for future backend analysis.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-panel/90 p-4 shadow-card">
            <p className="text-sm font-medium text-foreground/60">Input</p>
            <p className="mt-2 font-heading text-lg font-semibold">Product URL</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel/90 p-4 shadow-card">
            <p className="text-sm font-medium text-foreground/60">State</p>
            <p className="mt-2 font-heading text-lg font-semibold">Client only</p>
          </div>
          <div className="rounded-2xl border border-border bg-panel/90 p-4 shadow-card">
            <p className="text-sm font-medium text-foreground/60">Next step</p>
            <p className="mt-2 font-heading text-lg font-semibold">API integration</p>
          </div>
        </div>
      </div>

      <UrlSubmissionForm />
    </section>
  );
}
