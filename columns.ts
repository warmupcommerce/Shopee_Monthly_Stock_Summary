export const COL = {
  parentSku: ["เลขอ้างอิง Parent SKU", "Parent SKU"],
  productName: ["ชื่อสินค้า", "Product Name"],
  skuRef: ["เลขอ้างอิง SKU (SKU Reference No.)", "SKU Reference No."],
  optionName: ["ชื่อตัวเลือก", "Variation Name", "Option Name"],
  qty: ["จำนวนขายได้", "Quantity Sold", "จำนวน"],
  shopeeDiscount: ["ส่วนลดจาก Shopee", "Shopee Discount"],
  status: ["สถานะการสั่งซื้อ", "Order Status", "สถานะคำสั่งซื้อ", "OrderStatus"],
};
export function pickCol(row: any, keys: string[]) {
  for (const k of keys) if (k in row) return row[k];
  return undefined;
}
