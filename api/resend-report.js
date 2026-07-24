import { getDb } from "./_firestore.js";
import { collectRegistrations, summarize, buildRegistrantsXlsx } from "./_report.js";
import { sendResendMail } from "./_notify.js";

// 主持人金鑰（可用環境變數 ADMIN_KEY 覆蓋），與 export.js / test-mail.js 一致。
const ADMIN_KEY = process.env.ADMIN_KEY || "feiyang2026";

// 手動觸發：用目前最新資料重新整理統計 + Excel，補寄一封通知信給同工。
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "只接受 GET" });
  }
  if ((req.query.key || "") !== ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: "需要主持人金鑰（?key=）。" });
  }

  try {
    const db = getDb();
    const rows = await collectRegistrations(db);
    const stats = summarize(rows);
    const xlsxBuffer = await buildRegistrantsXlsx(rows);
    const mailed = await sendResendMail({
      stats,
      xlsxBuffer,
      note: String(req.query.note || ""),
    });
    return res.status(200).json({ ok: true, mailed, stats });
  } catch (err) {
    console.error("resend-report error:", err);
    return res.status(500).json({ ok: false, error: "重新整理/寄送失敗，請稍後再試" });
  }
}
