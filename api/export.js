import { getDb } from "./_firestore.js";
import { LOTTERY_COLLECTION } from "./_quiz.js";
import { buildLotteryXlsx } from "./_report.js";

// 主持人金鑰（可用環境變數 ADMIN_KEY 覆蓋），與前端 ADMIN_TOKEN 一致。
const ADMIN_KEY = process.env.ADMIN_KEY || "feiyang2026";

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
    const buf = await buildLotteryXlsx(db, LOTTERY_COLLECTION);
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
