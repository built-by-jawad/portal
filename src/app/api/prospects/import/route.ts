import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
import { importProspectsCsv } from "@/lib/actions";

// Expects the google-maps-scraper-kit CSV layout: title,phone,emails,website,category,address,
// review_rating,review_count — see importProspectsCsv for the exact header matching rules.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  try {
    const result = await importProspectsCsv(rows);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Import failed" }, { status: 400 });
  }
}
