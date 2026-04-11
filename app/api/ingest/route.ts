import { NextRequest, NextResponse } from "next/server";

import { parseProductMetadataFromHtml } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
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

  console.log("[ingest] fetching product page", { productUrl });

  let html: string;

  try {
    const response = await fetch(productUrl, {
      headers: {
        "user-agent": "TrueScoreBot/0.1 (+https://truescore.local)"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      console.error("[ingest] upstream fetch failed", {
        productUrl,
        status: response.status,
        statusText: response.statusText
      });
      return NextResponse.json({ error: "Failed to fetch the product page." }, { status: 502 });
    }

    html = await response.text();
  } catch (error) {
    console.error("[ingest] request failed", { productUrl, error });
    return NextResponse.json({ error: "Failed to fetch the product page." }, { status: 502 });
  }

  try {
    const parsed = parseProductMetadataFromHtml(html, productUrl);

    console.log("[ingest] parsed metadata", {
      productUrl,
      title: parsed.title,
      brand: parsed.brand,
      price: parsed.price,
      sourceSite: parsed.metadata.sourceSite
    });

    const savedProduct = await prisma.product.create({
      data: {
        originalUrl: productUrl,
        canonicalUrl: productUrl,
        sourceSite: parsed.metadata.sourceSite,
        title: parsed.title,
        brand: parsed.brand,
        imageUrl: parsed.image,
        normalizedBrand: parsed.brand?.trim() ?? null,
        normalizedTitle: parsed.normalizedTitle,
        description: parsed.description,
        metadata: parsed.metadata,
        crawlStatus: "SUCCEEDED",
        lastCrawledAt: new Date()
      }
    });

    console.log("[ingest] saved product", { id: savedProduct.id, productUrl });

    return NextResponse.json({
      product: {
        id: savedProduct.id,
        originalUrl: savedProduct.originalUrl,
        sourceSite: savedProduct.sourceSite,
        title: savedProduct.title,
        normalizedTitle: savedProduct.normalizedTitle,
        brand: savedProduct.brand,
        image: savedProduct.imageUrl,
        description: savedProduct.description,
        metadata: savedProduct.metadata,
        createdAt: savedProduct.createdAt
      }
    });
  } catch (error) {
    console.error("[ingest] parse or persistence failure", { productUrl, error });
    return NextResponse.json({ error: "Failed to parse and save product data." }, { status: 422 });
  }
}

