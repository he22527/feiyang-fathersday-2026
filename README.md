# 飛揚社 2026 父親節特別活動 — 報名 + 摸彩抽獎

一套部署在 Vercel 的活動網站：**報名頁**收集與會者資料，寫入 **Firebase Firestore**（專案 `myproject-bf2d2`）當後端資料庫，並同步寄通知信給同工；**摸彩頁**直接從資料庫讀取報名名單進行抽獎。

## 頁面

| 路徑 | 說明 |
|------|------|
| `/`（`public/index.html`） | 活動報名頁（EIA 卡片／時間軸風格）。填寫即列入摸彩名單。 |
| `/lottery`（`public/lottery.html`） | 會後摸彩抽獎程式。可「☁️ 從報名資料庫載入」名單。 |

## 後端 API

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/register` | POST | 寫入一筆報名（以 email 為文件 ID，重複視為更新）到 Firestore，並寄通知信。 |
| `/api/registrations` | GET | 回傳摸彩名單（僅 姓名／身分／是否爸爸，不含 email）。 |

資料存於 Firestore 集合 `registrations`（可用 `FIRESTORE_COLLECTION` 覆蓋），每位報名者一份文件。

## 環境變數（設在 Vercel，勿進 git）

| 變數 | 用途 |
|------|------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 服務帳戶 JSON（整包單行） |
| `FIRESTORE_COLLECTION` | （選填）集合名稱，預設 `registrations` |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Gmail SMTP 寄信（需 Google 應用程式密碼） |
| `NOTIFY_TO` | （選填）通知收件人，逗號分隔；不填用內建 4 位同工 |

## 本機開發

```bash
npm install
cp .env.local.example .env.local   # 填入金鑰
vercel dev                         # 本機起 http://localhost:3000
```

## 部署

推到 GitHub 後由 Vercel 自動部署；或手動：

```bash
vercel --prod
```

通知信收件人：hsuehmei、coshin、taiwan.kwei、g0306（@ceci.com.tw）。
