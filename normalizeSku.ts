import { Decimal } from "./safeDecimal";

export function normalizeSku(raw: any): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).replace(/\u200b|\ufeff/g, "").trim();
  if (!s || ["nan","none","null","undefined"].includes(s.toLowerCase())) return "";
  s = s.replace(/,/g, "");

  if (/^\d+\.0+$/.test(s)) return s.split(".", 1)[0];

  if (/[eE][+-]?\d+/.test(s)) {
    const d = Decimal.tryParse(s);
    if (d) return d.toPlainString();
  }

  if (/^\d+\.0$/.test(s)) return s.slice(0, -2);
  return s;
}
