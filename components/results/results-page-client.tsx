"use client";

import { AnalysisWorkspace } from "@/components/results/analysis-workspace";

type ResultsPageClientProps = {
  initialUrl: string;
};

export function ResultsPageClient({ initialUrl }: ResultsPageClientProps) {
  return <AnalysisWorkspace initialUrl={initialUrl} />;
}
