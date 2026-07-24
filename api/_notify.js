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

// 缺少寄信環境變數時回傳 null（呼叫端不擋原本流程）。
function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("未設定 GMAIL_USER / GMAIL_APP_PASSWORD，略過寄信");
    return null;
  }
  return { user, transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) };
}

// 摸彩通關通知收件人：報名同工 4 位 + 機械部 張平興
const QUIZ_EXTRA_TO = ["pxin@ceci.com.tw"];
export function quizNotifyRecipients() {
  const env = (process.env.QUIZ_NOTIFY_TO || "").trim();
  if (env) return env.split(",").map((s) => s.trim()).filter(Boolean);
  return [...notifyRecipients(), ...QUIZ_EXTRA_TO];
}

// 寄報名通知信。缺少寄信環境變數時回傳 false（不擋報名流程）。
// extra = { stats, xlsxBuffer, milestone, full, cap }
export async function sendRegistrationMail(record, extra = {}) {
  const mailer = getTransporter();
  if (!mailer) return false;
  const { user, transporter } = mailer;

  const { stats, xlsxBuffer, milestone, full, cap = 85 } = extra;
  const father = record.isFather ? "是 👨" : "否";

  // 額滿 / 里程碑提醒橫幅
  let banner = "";
  if (full) {
    banner = `<div style="background:#fdecea;border:1px solid #f5c6c0;color:#b3261e;border-radius:10px;padding:12px 16px;margin:0 0 14px;font-weight:bold">🚫 報名人數已達上限 ${cap} 人，系統已停止接受新報名。</div>`;
  } else if (milestone) {
    banner = `<div style="background:#fff6e5;border:1px solid #f0d9a8;color:#a9702f;border-radius:10px;padding:12px 16px;margin:0 0 14px;font-weight:bold">🔔 報名人數已達 ${milestone} 人（上限 ${cap}）。</div>`;
  }

  // 統計區塊
  let statsHtml = "";
  if (stats) {
    const mapRows = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span style="display:inline-block;background:#eef4ef;border-radius:8px;padding:2px 9px;margin:2px 4px 2px 0">${esc(k)}：<b>${v}</b></span>`).join("");
    statsHtml = `
      <h3 style="color:#2f7d57;margin:18px 0 6px">📊 目前報名統計</h3>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">目前總人數</td><td><b style="font-size:18px;color:#2f7d57">${stats.total}</b> / ${cap}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">參加方式</td><td>實體 <b>${stats.mode.實體}</b>　線上 <b>${stats.mode.線上}</b></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">是否爸爸</td><td>是 <b>${stats.fatherYes}</b>　否 <b>${stats.fatherNo}</b></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78;vertical-align:top">餐點</td><td>${mapRows(stats.lunch)}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78;vertical-align:top">部門</td><td>${mapRows(stats.dept)}</td></tr>
      </table>`;
  }

  const html = `
    <div style="font-family:'Microsoft JhengHei',Arial,sans-serif;color:#3a4e60;line-height:1.8">
      <h2 style="color:#5b4636;margin:0 0 8px">🎉 父親節活動－新報名通知</h2>
      <p style="color:#9b8d78;margin:0 0 14px">飛揚社 2026 父親節特別活動</p>
      ${banner}
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
      ${statsHtml}
      <p style="color:#a99c86;font-size:12px;margin-top:18px">附件為目前所有報名者的 Excel 名單。本信由報名系統自動寄出。</p>
    </div>`;

  const attachments = [];
  if (xlsxBuffer) {
    attachments.push({
      filename: `報名名單_${new Date().toISOString().slice(0, 10)}.xlsx`,
      content: Buffer.from(xlsxBuffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  const totalTag = stats ? `｜共 ${stats.total} 人` : "";
  await transporter.sendMail({
    from: `飛揚社父親節活動 <${user}>`,
    to: notifyRecipients().join(","),
    subject: `【父親節報名】${record.name}（${record.mode}${record.isFather ? "・爸爸" : ""}）${totalTag}${full ? "｜已額滿" : milestone ? `｜達${milestone}人` : ""}`,
    html,
    attachments,
  });
  return true;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// 寄摸彩通關成功通知信給同工。extra = { stats, xlsxBuffer }
export async function sendQuizPassMail(entry, extra = {}) {
  const mailer = getTransporter();
  if (!mailer) return false;
  const { user, transporter } = mailer;

  const { stats, xlsxBuffer } = extra;
  const father = entry.isFather ? "是 👨" : "否";

  let statsHtml = "";
  if (stats) {
    statsHtml = `
      <h3 style="color:#2f7d57;margin:18px 0 6px">📊 目前摸彩通關統計</h3>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">符合抽獎資格人數</td><td><b style="font-size:18px;color:#2f7d57">${stats.total}</b> 人</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">其中為爸爸</td><td><b>${stats.fatherYes}</b> 人</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">參加方式</td><td>實體 <b>${stats.mode.實體}</b>　線上 <b>${stats.mode.線上}</b></td></tr>
      </table>`;
  }

  const html = `
    <div style="font-family:'Microsoft JhengHei',Arial,sans-serif;color:#3a4e60;line-height:1.8">
      <h2 style="color:#5b4636;margin:0 0 8px">🎟️ 父親節活動－摸彩通關成功通知</h2>
      <p style="color:#9b8d78;margin:0 0 14px">飛揚社 2026 父親節特別活動</p>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">姓名</td><td><b>${esc(entry.name)}</b></td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">Email</td><td>${esc(entry.email)}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">參加方式</td><td>${esc(entry.mode)}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">我是爸爸</td><td>${father}</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">通關時間</td><td>${new Date(entry.passedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>
      </table>
      ${statsHtml}
      <p style="color:#a99c86;font-size:12px;margin-top:18px">附件為目前所有摸彩通關成功者的 Excel 名單。本信由摸彩通關系統自動寄出。</p>
    </div>`;

  const attachments = [];
  if (xlsxBuffer) {
    attachments.push({
      filename: `通關名單_${new Date().toISOString().slice(0, 10)}.xlsx`,
      content: Buffer.from(xlsxBuffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  await transporter.sendMail({
    from: `飛揚社父親節活動 <${user}>`,
    to: quizNotifyRecipients().join(","),
    subject: `【摸彩通關】${entry.name}（${entry.mode}${entry.isFather ? "・爸爸" : ""}）｜符合資格共 ${stats ? stats.total : "?"} 人`,
    html,
    attachments,
  });
  return true;
}

// 摸彩通關截止時，寄全部填答者資料檔給同工。extra = { stats, xlsxBuffer, test }
export async function sendQuizCloseMail(extra = {}) {
  const mailer = getTransporter();
  if (!mailer) return false;
  const { user, transporter } = mailer;

  const { stats, xlsxBuffer, test = false } = extra;

  let statsHtml = "";
  if (stats) {
    statsHtml = `
      <h3 style="color:#2f7d57;margin:18px 0 6px">📊 最終統計</h3>
      <table style="border-collapse:collapse;font-size:15px">
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">符合抽獎資格人數</td><td><b style="font-size:18px;color:#2f7d57">${stats.total}</b> 人</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">其中為爸爸</td><td><b>${stats.fatherYes}</b> 人</td></tr>
        <tr><td style="padding:4px 14px 4px 0;color:#9b8d78">參加方式</td><td>實體 <b>${stats.mode.實體}</b>　線上 <b>${stats.mode.線上}</b></td></tr>
      </table>`;
  }

  const testBanner = test
    ? `<div style="background:#fff6e5;border:1px solid #f0d9a8;color:#a9702f;border-radius:10px;padding:12px 16px;margin:0 0 14px;font-weight:bold">⚠️ 這是一封測試信，非正式截止通知。附件為目前（測試當下）的填答者資料檔。</div>`
    : "";

  const html = `
    <div style="font-family:'Microsoft JhengHei',Arial,sans-serif;color:#3a4e60;line-height:1.8">
      <h2 style="color:#5b4636;margin:0 0 8px">🔒 父親節活動－摸彩通關已截止</h2>
      <p style="color:#9b8d78;margin:0 0 14px">飛揚社 2026 父親節特別活動</p>
      ${testBanner}
      <p>摸彩通關填答已截止，附件為所有填答者資料檔（Excel），請留存作為抽獎依據。</p>
      ${statsHtml}
      <p style="color:#a99c86;font-size:12px;margin-top:18px">本信由摸彩通關系統自動寄出。</p>
    </div>`;

  const attachments = [];
  if (xlsxBuffer) {
    attachments.push({
      filename: `通關名單_${new Date().toISOString().slice(0, 10)}.xlsx`,
      content: Buffer.from(xlsxBuffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  await transporter.sendMail({
    from: `飛揚社父親節活動 <${user}>`,
    to: quizNotifyRecipients().join(","),
    subject: `${test ? "【測試】" : ""}【摸彩通關已截止】填答者資料檔｜符合資格共 ${stats ? stats.total : "?"} 人`,
    html,
    attachments,
  });
  return true;
}
