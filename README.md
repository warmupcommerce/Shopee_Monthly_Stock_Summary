# Shopee Sales Analyzer (SaaS-style MVP)

## ทำอะไรได้
อัปโหลดไฟล์ Excel จาก Shopee แล้วได้รายงาน (Excel) พร้อมชีท:
- Summary_SKU+Option (ไว้เช็คความเพี้ยน)
- Summary_SKU
- SKU_ต้องตรวจ
- Top_SKU
- Pareto_80_20
- Totals

SKU จะถูกบังคับเป็น **Text** ในไฟล์ผลลัพธ์ เพื่อลดปัญหา E+15

## รันในเครื่อง
```bash
npm i
npm run dev
```
เปิด http://localhost:3000

## Deploy (Vercel)
1) อัป repo นี้ขึ้น GitHub  
2) เข้า Vercel → New Project → Import repo → Deploy  
3) ได้ลิงก์เว็บทันที

> ถ้าต้องการเพิ่ม VAT/Shipping/Fees/Province/Payment ให้ส่งไฟล์ตัวอย่าง (Order.all...) มา แล้วเพิ่ม mapping ใน `lib/columns.ts` และ logic ใน `lib/report.ts`
