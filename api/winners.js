import { getDb } from "./_firestore.js";
import { WINNERS_COLLECTION, WINNERS_DOC } from "./_quiz.js";

// GET：讀取已公布的中獎結果；POST：儲存/公布一次抽獎結果。
export default async function handler(req, res) {
  const db = getDb();
  const ref = db.collection(WINNERS_COLLECTION).doc(WINNERS_DOC);

  if (req.method === "GET") {
    try {
      const doc = await ref.get();
      res.setHeader("Cache-Control", "no-store");
      if (!doc.exists) return res.status(200).json({ ok: true, results: [], drawnAt: null });
      const d = doc.data() || {};
      return res.status(200).json({ ok: true, results: d.results || [], drawnAt: d.drawnAt || null });
    } catch (err) {
      console.error("winners get error:", err);
      return res.status(500).json({ ok: false, error: "讀取中獎結果失敗" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const results = Array.isArray(body.results) ? body.results : [];
      const payload = { results, drawnAt: new Date().toISOString() };
      await ref.set(payload);
      return res.status(200).json({ ok: true, ...payload });
    } catch (err) {
      console.error("winners post error:", err);
      return res.status(500).json({ ok: false, error: "公布中獎結果失敗" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "只接受 GET/POST" });
}
