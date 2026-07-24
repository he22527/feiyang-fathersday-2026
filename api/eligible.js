import { getDb } from "./_firestore.js";
import { LOTTERY_COLLECTION } from "./_quiz.js";
import { excludeTestNames } from "./_report.js";

// 回傳通關成功、可參加摸彩的名單（僅姓名/身分/是否爸爸）。
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "只接受 GET" });
  }
  try {
    const db = getDb();
    const snap = await db.collection(LOTTERY_COLLECTION).get();
    const people = excludeTestNames(snap.docs.map((d) => {
      const x = d.data() || {};
      return { name: x.name, mode: x.mode === "線上" ? "線上" : "實體", isFather: x.isFather === true };
    }));
    people.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, count: people.length, people });
  } catch (err) {
    console.error("eligible error:", err);
    return res.status(500).json({ ok: false, error: "讀取通關名單失敗" });
  }
}
