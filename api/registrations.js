import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getClient, BUCKET, PREFIX } from "./_filebase.js";

async function streamToString(stream) {
  if (typeof stream.transformToString === "function") return stream.transformToString();
  const chunks = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString("utf-8");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "只接受 GET" });
  }

  try {
    const client = getClient();
    const keys = [];
    let token;
    do {
      const out = await client.send(
        new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token })
      );
      (out.Contents || []).forEach((o) => o.Key && o.Key.endsWith(".json") && keys.push(o.Key));
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);

    const people = [];
    await Promise.all(
      keys.map(async (Key) => {
        try {
          const obj = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
          const data = JSON.parse(await streamToString(obj.Body));
          // 只回傳摸彩需要的欄位，不外洩 email / 一句話
          people.push({
            name: data.name,
            mode: data.mode === "線上" ? "線上" : "實體",
            isFather: data.isFather === true,
          });
        } catch (_) {}
      })
    );

    people.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"));
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, count: people.length, people });
  } catch (err) {
    console.error("registrations error:", err);
    return res.status(500).json({ ok: false, error: "讀取名單失敗" });
  }
}
