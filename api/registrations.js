import { getDb, COLLECTION } from "./_firestore.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "只接受 GET" });
  }

  try {
    const db = getDb();
    const snap = await db.collection(COLLECTION).get();

    // 只回傳摸彩需要的欄位，不外洩 email / 一句話
    const people = snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        name: data.name,
        mode: data.mode === "線上" ? "線上" : "實體",
        isFather: data.isFather === true,
      };
    });

    people.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, count: people.length, people });
  } catch (err) {
    console.error("registrations error:", err);
    return res.status(500).json({ ok: false, error: "讀取名單失敗" });
  }
}
