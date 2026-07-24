import { getDb } from "./_firestore.js";
import { LOTTERY_COLLECTION } from "./_quiz.js";
import { collectLottery, summarizeLottery, buildLotteryXlsx, buildLotteryCsv } from "./_report.js";
import { sendQuizCloseMail } from "./_notify.js";

// 主持人金鑰（可用環境變數 ADMIN_KEY 覆蓋），與 export.js 一致。
const ADMIN_KEY = process.env.ADMIN_KEY || "feiyang2026";

// 手動觸發一封「摸彩通關截止通知」測試信（標題會加【測試】），
// 用目前實際資料產生統計與 Excel/CSV 附件，方便截止前先確認信件內容。
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
    const rows = await collectLottery(db, LOTTERY_COLLECTION);
    const stats = summarizeLottery(rows);
    const xlsxBuffer = await buildLotteryXlsx(db, LOTTERY_COLLECTION);
    const csvContent = await buildLotteryCsv(db, LOTTERY_COLLECTION);
    const mailed = await sendQuizCloseMail({ stats, xlsxBuffer, csvContent, test: true });
    return res.status(200).json({ ok: true, mailed, stats });
  } catch (err) {
    console.error("test-mail error:", err);
    return res.status(500).json({ ok: false, error: "測試信寄送失敗，請稍後再試" });
  }
}
