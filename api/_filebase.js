import { S3Client } from "@aws-sdk/client-s3";

// Filebase 是 S3 相容物件儲存，用它當後端資料庫。
// 金鑰只放 Vercel 環境變數，絕不進 repo。
export const BUCKET = process.env.FILEBASE_BUCKET || "myproject";
export const PREFIX = "registrations/";

export function getClient() {
  const accessKeyId = process.env.FILEBASE_KEY;
  const secretAccessKey = process.env.FILEBASE_SECRET;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("缺少 FILEBASE_KEY / FILEBASE_SECRET 環境變數");
  }
  return new S3Client({
    region: "us-east-1",
    endpoint: "https://s3.filebase.com",
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// 用 email 當物件 key，重複報名視為更新。
export function keyForEmail(email) {
  const safe = String(email || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .slice(0, 120);
  return PREFIX + (safe || `anon-${Date.now()}`) + ".json";
}
