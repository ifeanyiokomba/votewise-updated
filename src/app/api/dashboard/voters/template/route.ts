import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Returns a CSV template file for voter import. */
export async function GET() {
  const csv = [
    "identifier,fullName,email,phone",
    "VOT/2025001,Jane Doe,jane@org.edu,08012345678",
    "VOT/2025002,John Smith,john@org.edu,08087654321",
    "VOT/2025003,Mary Johnson,mary@org.edu,08011223344",
    "VOT/2025004,Peter Adams,peter@org.edu,08055667788",
    "VOT/2025005,Sarah Lee,sarah@org.edu,08099887766",
  ].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="votewise-voter-template.csv"',
    },
  });
}
