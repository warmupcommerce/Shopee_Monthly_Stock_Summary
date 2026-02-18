import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { normalizeSku } from "./normalizeSku";
import { COL, pickCol } from "./columns";

export type Row = {
  parentSku: string;
  productName: string;
  skuRef: string;
  optionName: string;
  qty: number;
  discount: number;
};

export function parseExcel(buffer: Buffer): Row[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) as any[];
  const rows: Row[] = [];

  for (const r of json) {
    const statusRaw = String(pickCol(r, COL.status) ?? "").trim();
    if (statusRaw && statusRaw !== "สำเร็จแล้ว") continue;

    const skuRef = normalizeSku(pickCol(r, COL.skuRef));
    if (!skuRef) continue;

    const qty = Number(pickCol(r, COL.qty) ?? 0) || 0;
    const discount = Number(pickCol(r, COL.shopeeDiscount) ?? 0) || 0;

    rows.push({
      parentSku: String(pickCol(r, COL.parentSku) ?? "").trim(),
      productName: String(pickCol(r, COL.productName) ?? "").trim(),
      skuRef,
      optionName: String(pickCol(r, COL.optionName) ?? "").trim(),
      qty,
      discount,
    });
  }
  return rows;
}

function groupSkuOption(rows: Row[]) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.parentSku}||${r.productName}||${r.skuRef}||${r.optionName}`;
    const cur = map.get(key);
    if (!cur) map.set(key, { ...r });
    else { cur.qty += r.qty; cur.discount += r.discount; }
  }
  return Array.from(map.values());
}

function groupSkuOnly(rows: Row[]) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.skuRef;
    const cur = map.get(key);
    if (!cur) map.set(key, { ...r });
    else { cur.qty += r.qty; cur.discount += r.discount; }
  }
  return Array.from(map.values());
}

function anomalies(rows: Row[]) {
  const skuMap = new Map<string, { parents: Set<string>, names: Set<string>, options: Set<string> }>();
  for (const r of rows) {
    const x = skuMap.get(r.skuRef) ?? { parents: new Set(), names: new Set(), options: new Set() };
    if (r.parentSku) x.parents.add(r.parentSku);
    if (r.productName) x.names.add(r.productName);
    x.options.add(r.optionName ?? "");
    skuMap.set(r.skuRef, x);
  }
  const out: any[] = [];
  for (const [sku, v] of skuMap.entries()) {
    const issues: string[] = [];
    if (v.parents.size > 1) issues.push("Parent SKU ต่าง");
    if (v.names.size > 1) issues.push("ชื่อสินค้า ต่าง");
    if (v.options.size > 1) issues.push("ตัวเลือก ต่าง/ว่างปน");
    if (issues.length) out.push({ sku, p: v.parents.size, n: v.names.size, o: v.options.size, reason: issues.join(", ") });
  }
  out.sort((a,b)=> (b.p+b.n+b.o)-(a.p+a.n+a.o));
  return out;
}

function topSku(skuOnly: any[], n=200) {
  return [...skuOnly].sort((a,b)=> b.qty - a.qty).slice(0,n);
}

function pareto80(top: any[]) {
  const total = top.reduce((s,r)=>s+r.qty,0);
  let cum = 0, idx = 0;
  while (idx < top.length && (cum/total) < 0.8) { cum += top[idx].qty; idx++; }
  return { cutoffSkuCount: idx, cutoffPct: total ? (cum/total) : 0 };
}

export async function buildWorkbook(rows: Row[]) {
  const skuOpt = groupSkuOption(rows);
  const skuOnly = groupSkuOnly(rows);
  const anom = anomalies(rows);
  const top = topSku(skuOnly, 200);
  const p = pareto80(top);

  const wb = new ExcelJS.Workbook();

  const s1 = wb.addWorksheet("Summary_SKU+Option");
  s1.columns = [
    { header: "เลขอ้างอิง Parent SKU", key: "parentSku", width: 20 },
    { header: "ชื่อสินค้า", key: "productName", width: 34 },
    { header: "เลขอ้างอิง SKU (SKU Reference No.)", key: "skuRef", width: 26 },
    { header: "ชื่อตัวเลือก", key: "optionName", width: 22 },
    { header: "จำนวนขายได้", key: "qty", width: 12 },
    { header: "ส่วนลดจาก Shopee", key: "discount", width: 16 },
  ];
  s1.getColumn(3).numFmt = "@";
  skuOpt.forEach(r => s1.addRow(r));

  const s2 = wb.addWorksheet("Summary_SKU");
  s2.columns = [
    { header: "เลขอ้างอิง SKU (SKU Reference No.)", key: "skuRef", width: 26 },
    { header: "เลขอ้างอิง Parent SKU (ตัวอย่าง)", key: "parentSku", width: 22 },
    { header: "ชื่อสินค้า (ตัวอย่าง)", key: "productName", width: 34 },
    { header: "ชื่อตัวเลือก (ตัวอย่าง)", key: "optionName", width: 22 },
    { header: "จำนวนขายได้", key: "qty", width: 12 },
    { header: "ส่วนลดจาก Shopee", key: "discount", width: 16 },
  ];
  s2.getColumn(1).numFmt = "@";
  skuOnly.forEach(r => s2.addRow(r));

  const s3 = wb.addWorksheet("SKU_ต้องตรวจ");
  s3.columns = [
    { header: "เลขอ้างอิง SKU (SKU Reference No.)", key: "sku", width: 26 },
    { header: "จำนวน Parent SKU", key: "p", width: 16 },
    { header: "จำนวนชื่อสินค้า", key: "n", width: 16 },
    { header: "จำนวนตัวเลือก", key: "o", width: 14 },
    { header: "สาเหตุ", key: "reason", width: 42 },
  ];
  s3.getColumn(1).numFmt = "@";
  anom.forEach(r => s3.addRow(r));

  const s4 = wb.addWorksheet("Top_SKU");
  s4.columns = [
    { header: "อันดับ", key: "rank", width: 8 },
    { header: "เลขอ้างอิง SKU (SKU Reference No.)", key: "skuRef", width: 26 },
    { header: "ชื่อสินค้า (ตัวอย่าง)", key: "productName", width: 34 },
    { header: "จำนวนขายได้", key: "qty", width: 12 },
    { header: "ส่วนลดจาก Shopee", key: "discount", width: 16 },
  ];
  s4.getColumn(2).numFmt = "@";
  top.slice(0,100).forEach((r,i)=> s4.addRow({ rank: i+1, ...r }));

  const s5 = wb.addWorksheet("Pareto_80_20");
  s5.columns = [
    { header: "อันดับ", key: "rank", width: 8 },
    { header: "เลขอ้างอิง SKU (SKU Reference No.)", key: "skuRef", width: 26 },
    { header: "จำนวนขายได้", key: "qty", width: 12 },
    { header: "ยอดสะสม", key: "cum", width: 12 },
    { header: "% สะสม", key: "cumPct", width: 10 },
  ];
  s5.getColumn(2).numFmt = "@";
  const total = top.reduce((s,r)=>s+r.qty,0);
  let cum = 0;
  top.slice(0,200).forEach((r,i)=> {
    cum += r.qty;
    s5.addRow({ rank: i+1, skuRef: r.skuRef, qty: r.qty, cum, cumPct: total ? (cum/total) : 0 });
  });
  s5.getColumn(5).numFmt = "0.00%";
  s5.addRow({});
  s5.addRow({ rank: "", skuRef: "Cutoff (>=80%)", qty: "", cum: p.cutoffSkuCount, cumPct: p.cutoffPct });

  const totalsQty = skuOpt.reduce((s,r)=>s+r.qty,0);
  const totalsDisc = skuOpt.reduce((s,r)=>s+r.discount,0);
  const s6 = wb.addWorksheet("Totals");
  s6.columns = [{ header: "Metric", key: "m", width: 26 }, { header: "Value", key: "v", width: 20 }];
  s6.addRow({ m: "Total Quantity Sold", v: totalsQty });
  s6.addRow({ m: "Total Shopee Discount", v: totalsDisc });
  s6.addRow({ m: "Unique SKU (SKU-only)", v: skuOnly.length });
  s6.addRow({ m: "Rows (SKU+Option)", v: skuOpt.length });

  return {
    wb,
    totals: { qty: totalsQty, discount: totalsDisc, uniqueSku: skuOnly.length, rows: skuOpt.length },
    topSku: top.slice(0, 50).map(r => ({ sku: r.skuRef, qty: r.qty, discount: r.discount, product: r.productName })),
    pareto: p
  };
}

