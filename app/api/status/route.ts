import { NextRequest, NextResponse } from "next/server";

import { getJob } from "@/lib/job-manager";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")?.trim();

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId." }, { status: 400 });
  }

  const job = getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  console.log("[delivery] status requested", {
    jobId,
    status: job.status
  });

  return NextResponse.json({
    job: {
      id: job.id,
      url: job.url,
      status: job.status,
      message: job.message,
      cached: job.cached,
      error: job.error,
      result: job.result
    }
  });
}
