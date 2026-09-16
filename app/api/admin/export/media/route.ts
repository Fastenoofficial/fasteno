import { NextResponse } from "next/server";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getAdminMediaInventory,
  type MediaInventoryRow,
} from "@/lib/admin-media-inventory";

/** GET /api/admin/export/media — complete read-only Storage/reference report. */
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  let cell = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t]/.test(cell)) cell = `'${cell}`;
  return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function csvLine(values: unknown[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}

function mediaCsvRow(row: MediaInventoryRow, generatedAt: string): unknown[] {
  return [
    row.status,
    row.objectPath,
    row.value,
    row.publicUrl,
    row.referenceCount,
    row.sources.join(" | "),
    row.bytes,
    row.createdAt,
    row.updatedAt,
    generatedAt,
  ];
}

function csvStream(
  header: string[],
  rows: MediaInventoryRow[],
  generatedAt: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let rowIndex = -1;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (rowIndex === -1) {
        controller.enqueue(encoder.encode(`\uFEFF${csvLine(header)}`));
        rowIndex = 0;
        return;
      }
      if (rowIndex >= rows.length) {
        controller.close();
        return;
      }

      controller.enqueue(
        encoder.encode(csvLine(mediaCsvRow(rows[rowIndex], generatedAt))),
      );
      rowIndex += 1;
    },
  });
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Media exports need a connected Supabase project (demo mode)." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const profile = await getProfile(user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let report: Awaited<ReturnType<typeof getAdminMediaInventory>>;
  try {
    report = await getAdminMediaInventory();
  } catch (error) {
    console.error(
      "admin media export failed —",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Could not build the media inventory." },
      { status: 503 },
    );
  }

  const header = [
    "status",
    "object_path",
    "stored_or_referenced_value",
    "public_url",
    "reference_count",
    "reference_sources",
    "bytes",
    "created_at",
    "updated_at",
    "report_generated_at",
  ];

  const today = new Date().toISOString().slice(0, 10);
  return new Response(csvStream(header, report.rows, report.generatedAt), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fasteno-media-inventory-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
