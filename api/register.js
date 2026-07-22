import { getDb, COLLECTION, docIdForEmail } from "./_firestore.js";
import { sendRegistrationMail } from "./_notify.js";
import { CAP, MILESTONES, collectRegistrations, summarize, buildRegistrantsXlsx } from "./_report.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "只接受 POST" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();

    if (!name) return res.status(400).json({ ok: false, error: "請填寫姓名" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ ok: false, error: "請填寫正確的公司 Email" });

    const db = getDb();
    const docRef = db.collection(COLLECTION).doc(docIdForEmail(email));

    // 額滿檢查：只擋「新報名者」；既有報名者更新資料不受限。
    const existing = await docRef.get();
    if (!existing.exists) {
      const cnt = (await db.collection(COLLECTION).count().get()).data().count;
      if (cnt >= CAP) {
        return res.status(200).json({ ok: false, full: true, count: cnt, cap: CAP, error: `報名已額滿（上限 ${CAP} 人），感謝您的支持！` });
      }
    }

    const record = {
      name,
      email,
      dept: String(body.dept || "").trim(),
      lunch: String(body.lunch || "").trim(),
      isFather: body.isFather === true || body.isFather === "是",
      mode: body.mode === "線上" || body.mode === "online" ? "線上" : "實體",
      message: String(body.message || "").trim().slice(0, 200),
      createdAt: existing.exists ? (existing.data().createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(record, { merge: true });

    // 統計 + 產生所有報名者 Excel
    const rows = await collectRegistrations(db);
    const stats = summarize(rows);
    const milestone = MILESTONES.includes(stats.total) ? stats.total : null;
    const full = stats.total >= CAP;

    let xlsxBuffer = null;
    try { xlsxBuffer = await buildRegistrantsXlsx(rows); } catch (e) { console.error("xlsx build error:", e); }

    // 同步寄通知信給同工（含統計與 Excel 附件）；寄信失敗不影響報名成功。
    let mailed = false;
    try {
      mailed = await sendRegistrationMail(record, { stats, xlsxBuffer, milestone, full, cap: CAP });
    } catch (mailErr) {
      console.error("notify mail error:", mailErr);
    }

    return res.status(200).json({ ok: true, record, mailed, count: stats.total, cap: CAP, full, milestone });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "報名寫入失敗，請稍後再試" });
  }
}
