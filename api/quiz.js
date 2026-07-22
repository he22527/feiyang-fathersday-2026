import { getDb, docIdForEmail } from "./_firestore.js";
import { publicQuestions, isAllCorrect, LOTTERY_COLLECTION } from "./_quiz.js";

export default async function handler(req, res) {
  // GET：回傳題目（不含正解）供前端顯示
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, questions: publicQuestions() });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "只接受 GET/POST" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const answers = body.answers || {};

    if (!name) return res.status(400).json({ ok: false, error: "請填寫姓名" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ ok: false, error: "請填寫正確的 Email" });

    const passed = isAllCorrect(answers);
    if (!passed) {
      return res.status(200).json({ ok: true, passed: false, error: "答案不完全正確，請再聽一次分享後重試 🙂" });
    }

    const entry = {
      name,
      email,
      mode: body.mode === "線上" || body.mode === "online" ? "線上" : "實體",
      isFather: body.isFather === true || body.isFather === "是",
      passedAt: new Date().toISOString(),
    };

    const db = getDb();
    await db.collection(LOTTERY_COLLECTION).doc(docIdForEmail(email)).set(entry, { merge: true });

    return res.status(200).json({ ok: true, passed: true });
  } catch (err) {
    console.error("quiz error:", err);
    return res.status(500).json({ ok: false, error: "系統忙線，請稍後再試" });
  }
}
