import nodemailer from "nodemailer";

// 收件同工（可用環境變數 NOTIFY_TO 以逗號覆蓋）
const DEFAULT_TO = [
  "hsuehmei@ceci.com.tw",
  "coshin@ceci.com.tw",
  "taiwan.kwei@ceci.com.tw",
  "g0306@ceci.com.tw",
];

export function notifyRecipients() {
  const env = (process.env.NOTIFY_TO || "").trim();
  return env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_TO;
}

// 寄報名通知信。缺少寄信環境變數時回傳 false（不擋報名流程）。
export async function sendRegistrationMail(record) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("未設定 GMAIL_USER / GMAIL_APP_PASSWORD，略過寄信");
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const father = record.isFather ? "是 👨" : "否";
  const html = `
    <div style="font-family:'Microsoft JhengHei',Arial,sans-serif;color:#3a4e60;line-height:1.8">
      <h2 style="color:#5b4636;margin:0 0 8px">🎉 父親節活動－新報名通知</h2>
      <p style="color:#9b8d78;margin:0 0 14px">飛揚社 2026 父親節特別活動</p>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">姓名</td><td><b>${esc(record.name)}</b></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">部門</td><td>${esc(record.dept) || "—"}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">Email</td><td>${esc(record.email)}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">午餐便當</td><td>${esc(record.lunch) || "—"}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">參加方式</td><td>${esc(record.mode)}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">我是爸爸</td><td>${father}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78;vertical-align:top">一句話</td><td>${esc(record.message) || "—"}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">報名時間</td><td>${new Date(record.createdAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>
      </table>
      <p style="color:#a99c86;font-size:12px;margin-top:18px">本信由報名系統自動寄出。</p>
    </div>`;

  await transporter.sendMail({
    from: `飛揚社父親節活動 <${user}>`,
    to: notifyRecipients().join(","),
    subject: `【父親節報名】${record.name}（${record.mode}${record.isFather ? "・爸爸" : ""}）`,
    html,
  });
  return true;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
