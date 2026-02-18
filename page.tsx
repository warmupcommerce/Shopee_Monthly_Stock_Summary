"use client";
import React, { useMemo, useRef, useState } from "react";

type ApiResp = {
  ok: boolean;
  totals?: { qty: number; discount: number; uniqueSku: number; rows: number };
  topSku?: Array<{ sku: string; qty: number; discount: number; product: string }>;
  pareto?: { cutoffSkuCount: number; cutoffPct: number };
  filename?: string;
  error?: string;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

export default function Page() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<ApiResp | null>(null);
  const canRun = useMemo(() => !!file && !busy, [file, busy]);

  async function run() {
    if (!file) return;
    setBusy(true);
    setResp(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/report", { method: "POST", body: form });
      const data = (await r.json()) as ApiResp;
      if (!r.ok || !data.ok) throw new Error(data.error || "Request failed");
      setResp(data);
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? "Unknown error" });
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    if (!resp?.filename) return;
    const r = await fetch(`/api/download?f=${encodeURIComponent(resp.filename)}`);
    if (!r.ok) return;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = resp.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Shopee Sales Analyzer</div>
            <div className="sub">Upload Shopee Excel → Summary SKU, SKU anomalies, Top SKU, Pareto 80/20 + Export Excel (SKU as Text)</div>
          </div>
        </div>
        <span className="badge">SaaS-style MVP</span>
      </div>

      <div className="grid">
        <div className="card">
          <h2>อัปโหลดไฟล์ (รายเดือน)</h2>
          <p>รองรับคอลัมน์ไทย/อังกฤษ และจะกรองเฉพาะ “สำเร็จแล้ว” หากมีคอลัมน์สถานะ</p>

          <div style={{ marginTop: 12 }}>
            <div className="row">
              <input ref={inputRef} type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button className="btn primary" disabled={!canRun} onClick={run}>
                {busy ? "กำลังประมวลผล..." : "สร้างรายงาน"}
              </button>
              <button className="btn" disabled={!resp?.filename || busy} onClick={download}>
                ดาวน์โหลด Excel
              </button>
            </div>

            {resp?.totals && (
              <div className="kpis">
                <div className="kpi"><div className="label">จำนวนขายได้รวม</div><div className="value">{fmt(resp.totals.qty)}</div></div>
                <div className="kpi"><div className="label">ส่วนลดจาก Shopee รวม</div><div className="value">{fmt(resp.totals.discount)}</div></div>
                <div className="kpi"><div className="label">จำนวน SKU (unique)</div><div className="value">{fmt(resp.totals.uniqueSku)}</div></div>
                <div className="kpi"><div className="label">จำนวนแถว (SKU+Option)</div><div className="value">{fmt(resp.totals.rows)}</div></div>
              </div>
            )}

            {resp?.error && (
              <div className="footer" style={{ color: "rgba(255,180,180,0.92)" }}>Error: {resp.error}</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Preview</h2>
          <p>Top SKU (ตามจำนวนขายได้) และจุดตัด Pareto 80/20</p>
          {resp?.topSku?.length ? (
            <>
              <div className="row" style={{ margin: "10px 0" }}>
                <span className="badge warn">Top SKU</span>
                {resp.pareto && (
                  <span className="badge">Pareto: {resp.pareto.cutoffSkuCount} SKU ครอบคลุม {Math.round(resp.pareto.cutoffPct * 100)}%</span>
                )}
              </div>
              <table className="table">
                <thead><tr><th>SKU</th><th>ชื่อสินค้า</th><th style={{ textAlign: "right" }}>จำนวน</th></tr></thead>
                <tbody>
                  {resp.topSku.slice(0, 10).map((r) => (
                    <tr key={r.sku}><td>{r.sku}</td><td>{r.product}</td><td style={{ textAlign: "right" }}>{fmt(r.qty)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="footer">อัปโหลดไฟล์เพื่อดู preview</div>
          )}
        </div>
      </div>

      <div className="footer">
        ต้องการเพิ่ม VAT/Shipping/Fees/Province/Payment: ส่งไฟล์ “Order.all…” ที่มีคอลัมน์เหล่านี้มา แล้วเพิ่ม mapping ได้ทันที
      </div>
    </div>
  );
}
