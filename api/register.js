import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getClient, BUCKET, keyForEmail } from "./_filebase.js";
import { sendRegistrationMail } from "./_notify.js";

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

    const record = {
      name,
      email,
      dept: String(body.dept || "").trim(),
      lunch: String(body.lunch || "").trim(),
      isFather: body.isFather === true || body.isFather === "是",
      mode: body.mode === "線上" || body.mode === "online" ? "線上" : "實體",
      message: String(body.message || "").trim().slice(0, 200),
      createdAt: new Date().toISOString(),
    };

    const client = getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: keyForEmail(email),
        Body: JSON.stringify(record),
        ContentType: "application/json",
      })
    );

    // 同步寄通知信給同工；寄信失敗不影響報名成功。
    let mailed = false;
    try {
      mailed = await sendRegistrationMail(record);
    } catch (mailErr) {
      console.error("notify mail error:", mailErr);
    }

    return res.status(200).json({ ok: true, record, mailed });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "報名寫入失敗，請稍後再試" });
  }
}
