import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase 專案：myproject-bf2d2
// 報名資料存 Firestore 集合（預設 registrations，可用環境變數覆蓋）。
export const COLLECTION = process.env.FIRESTORE_COLLECTION || "registrations";

function serviceAccount() {
  // 首選：整包服務帳戶 JSON 放在 FIREBASE_SERVICE_ACCOUNT。
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const j = JSON.parse(raw);
    return {
      projectId: j.project_id,
      clientEmail: j.client_email,
      privateKey: String(j.private_key || "").replace(/\\n/g, "\n"),
    };
  }
  // 備援：三個欄位分開放。
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  throw new Error("缺少 FIREBASE_SERVICE_ACCOUNT（或 FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY）環境變數");
}

let _db = null;
export function getDb() {
  if (_db) return _db;
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount()) });
  }
  _db = getFirestore();
  return _db;
}

// 用 email 當文件 ID，重複報名視為更新。
export function docIdForEmail(email) {
  const safe = String(email || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .slice(0, 120);
  return safe || `anon-${Date.now()}`;
}
