import ExcelJS from "exceljs";
import { getDb } from "./_firestore.js";
import { LOTTERY_COLLECTION } from "./_quiz.js";

// 主持人金鑰（可用環境變數 ADMIN_KEY 覆蓋），與前端 ADMIN_TOKEN 一致。
const ADMIN_KEY = process.env.ADMIN_KEY || "feiyang2026";

function tw(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }); }
  catch { return String(ts); }
}

// 匯出「答對 2 題、通關成功者」名單為 Excel（.xlsx），並帶入報名時填的部門/餐點/留言。
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "只接受 GET" });
  }
  if ((req.query.key || "") !== ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: "需要主持人金鑰（?key=）才能下載。" });
  }

  try {
    const db = getDb();
    const [lotSnap, regSnap] = await Promise.all([
      db.collection(LOTTERY_COLLECTION).get(),
      db.collection("registrations").get(),
    ]);

    // 報名資料以 email 建索引，供合併
    const regByEmail = {};
    regSnap.forEach((d) => { const x = d.data() || {}; if (x.email) regByEmail[String(x.email).toLowerCase()] = x; });

    const rows = lotSnap.docs.map((d) => {
      const p = d.data() || {};
      const r = regByEmail[String(p.email || "").toLowerCase()] || {};
      return {
        name: p.name || r.name || "",
        dept: r.dept || "",
        email: p.email || "",
        mode: p.mode === "線上" ? "線上" : "實體",
        lunch: r.lunch || "",
        father: p.isFather ? "是" : "否",
        message: r.message || "",
        passedAt: tw(p.passedAt),
        registeredAt: tw(r.createdAt),
      };
    });
    rows.sort((a, b) => (a.passedAt || "").localeCompare(b.passedAt || ""));

    const wb = new ExcelJS.Workbook();
    wb.creator = "飛揚社父親節報名系統";
    const ws = wb.addWorksheet("通關名單");
    ws.columns = [
      { header: "姓名", key: "name", width: 14 },
      { header: "部門", key: "dept", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "參加方式", key: "mode", width: 10 },
      { header: "午餐便當", key: "lunch", width: 10 },
      { header: "是否爸爸", key: "father", width: 10 },
      { header: "想說的一句話", key: "message", width: 32 },
      { header: "通關時間", key: "passedAt", width: 22 },
      { header: "報名時間", key: "registeredAt", width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4EC" } };
    rows.forEach((r) => ws.addRow(r));
    ws.autoFilter = { from: "A1", to: "I1" };

    const buf = await wb.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);
    const fname = `通關名單_${today}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="lottery-list-${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(fname)}`
    );
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(buf));
  } catch (err) {
    console.error("export error:", err);
    return res.status(500).json({ ok: false, error: "匯出失敗，請稍後再試" });
  }
}
