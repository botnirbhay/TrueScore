import { NextRequest, NextResponse } from "next/server";

import { createOrReuseJob } from "@/lib/job-manager";
import { isValidHttpUrl } from "@/lib/utils";

export const runtime = "nodejs";

type IngestRequestBody = {
  url?: string;
};

export async function POST(request: NextRequest) {
  let body: IngestRequestBody;

  try {
    body = (await request.json()) as IngestRequestBody;
  } catch (error) {
    console.error("[ingest] invalid JSON body", error);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const productUrl = body.url?.trim();

  if (!productUrl || !isValidHttpUrl(productUrl)) {
    console.warn("[ingest] rejected invalid URL", { productUrl });
    return NextResponse.json({ error: "Enter a valid URL starting with http:// or https://." }, { status: 400 });
  }

  try {
    const job = createOrReuseJob(productUrl);

    console.log("[ingest] job accepted", {
      productUrl,
      jobId: job.id,
      status: job.status,
      cached: job.cached
    });

    return NextResponse.json({
      job: {
        id: job.id,
        url: job.url,
        status: job.status,
        message: job.message,
        cached: job.cached,
        result: job.result
      }
    });
  } catch (error) {
    console.error("[ingest] failed to create job", { productUrl, error });
    return NextResponse.json({ error: "Failed to queue product processing." }, { status: 500 });
  }
}

