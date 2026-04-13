import { ResultsPageClient } from "@/components/results/results-page-client";

type ResultsPageProps = {
  searchParams?: Promise<{
    url?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawUrl = resolvedSearchParams.url;
  const initialUrl = Array.isArray(rawUrl) ? rawUrl[0] ?? "" : rawUrl ?? "";

  return <ResultsPageClient initialUrl={initialUrl} />;
}
