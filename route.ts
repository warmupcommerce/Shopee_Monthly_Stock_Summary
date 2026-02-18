import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { parseExcel, buildWorkbook } from "@/lib/report";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseExcel(buf);

    const { wb, totals, topSku, pareto } = await buildWorkbook(rows);

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filename = `report-${id}.xlsx`;
    const outDir = path.join(process.cwd(), "outputs");
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    await wb.xlsx.writeFile(outPath);

    return NextResponse.json({ ok: true, totals, topSku, pareto, filename });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
