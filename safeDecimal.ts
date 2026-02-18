export class Decimal {
  private plain: string;
  private constructor(plain: string) { this.plain = plain; }

  static tryParse(s: string): Decimal | null {
    const m = s.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/);
    if (!m) return null;
    const coef = m[1];
    const exp = parseInt(m[2], 10);
    if (!Number.isFinite(exp)) return null;

    const parts = coef.split(".");
    const intPart = parts[0].replace(/^\+/, "");
    const fracPart = parts[1] ?? "";
    const digits = (intPart + fracPart).replace(/^0+(?=\d)/, "");
    const scale = fracPart.length;
    const shift = exp - scale;

    if (!/^\d+$/.test(digits)) return null;

    if (shift >= 0) return new Decimal(digits + "0".repeat(shift));

    const pos = digits.length + shift;
    if (pos > 0) {
      const left = digits.slice(0, pos);
      const right = digits.slice(pos).replace(/0+$/, "");
      return new Decimal(right ? `${left}.${right}` : left);
    } else {
      const right = ("0".repeat(-pos) + digits).replace(/0+$/, "");
      return new Decimal(right ? `0.${right}` : "0");
    }
  }

  toPlainString() { return this.plain; }
}
