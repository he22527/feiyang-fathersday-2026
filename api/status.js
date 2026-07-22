import { getDb, COLLECTION } from "./_firestore.js";
import { CAP } from "./_report.js";

// 給前端查目前報名人數與是否額滿。
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "只接受 GET" });
  }
  try {
    const db = getDb();
    const cnt = (await db.collection(COLLECTION).count().get()).data().count;
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, count: cnt, cap: CAP, full: cnt >= CAP, remaining: Math.max(0, CAP - cnt) });
  } catch (err) {
    console.error("status error:", err);
    return res.status(500).json({ ok: false, error: "讀取報名狀態失敗" });
  }
}
