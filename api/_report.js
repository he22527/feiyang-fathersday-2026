import ExcelJS from "exceljs";

export const CAP = Number(process.env.REG_CAP || 85);        // 報名人數上限
export const MILESTONES = [50, 60, 70, 80];                   // 提醒門檻

function tw(ts) {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }); }
  catch { return String(ts); }
}

// 讀取所有報名者
export async function collectRegistrations(db) {
  const snap = await db.collection("registrations").get();
  return snap.docs.map((d) => d.data() || {});
}

// 統計：總人數、餐點、部門、是否爸爸、參加方式
export function summarize(rows) {
  const lunch = {}, dept = {}, mode = { 實體: 0, 線上: 0 };
  let fatherYes = 0, fatherNo = 0;
  for (const r of rows) {
    const l = r.lunch || "(未填)"; lunch[l] = (lunch[l] || 0) + 1;
    const dp = (r.dept || "").trim() || "(未填)"; dept[dp] = (dept[dp] || 0) + 1;
    if (r.isFather) fatherYes++; else fatherNo++;
    mode[r.mode === "線上" ? "線上" : "實體"]++;
  }
  return { total: rows.length, lunch, dept, mode, fatherYes, fatherNo };
}

// 產生「所有報名者」Excel
export async function buildRegistrantsXlsx(rows) {
  const sorted = rows.slice().sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const wb = new ExcelJS.Workbook();
  wb.creator = "飛揚社父親節報名系統";
  const ws = wb.addWorksheet("報名名單");
  ws.columns = [
    { header: "序", key: "idx", width: 5 },
    { header: "姓名", key: "name", width: 14 },
    { header: "部門", key: "dept", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "參加方式", key: "mode", width: 10 },
    { header: "午餐便當", key: "lunch", width: 10 },
    { header: "是否爸爸", key: "father", width: 10 },
    { header: "想說的一句話", key: "message", width: 34 },
    { header: "報名時間", key: "createdAt", width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4EC" } };
  sorted.forEach((r, i) => ws.addRow({
    idx: i + 1,
    name: r.name || "",
    dept: r.dept || "",
    email: r.email || "",
    mode: r.mode === "線上" ? "線上" : "實體",
    lunch: r.lunch || "",
    father: r.isFather ? "是" : "否",
    message: r.message || "",
    createdAt: tw(r.createdAt),
  }));
  ws.autoFilter = { from: "A1", to: "I1" };
  return await wb.xlsx.writeBuffer();
}

// 讀取摸彩通關（LOTTERY_COLLECTION）名單
export async function collectLottery(db, lotteryCollection) {
  const snap = await db.collection(lotteryCollection).get();
  return snap.docs.map((d) => d.data() || {});
}

// 統計：符合抽獎資格人數、其中為爸爸人數、參加方式
export function summarizeLottery(rows) {
  const mode = { 實體: 0, 線上: 0 };
  let fatherYes = 0, fatherNo = 0;
  for (const r of rows) {
    if (r.isFather) fatherYes++; else fatherNo++;
    mode[r.mode === "線上" ? "線上" : "實體"]++;
  }
  return { total: rows.length, fatherYes, fatherNo, mode };
}

// 產生「通關成功者」Excel（合併報名時填的部門/餐點/留言）
export async function buildLotteryXlsx(db, lotteryCollection) {
  const [lotSnap, regSnap] = await Promise.all([
    db.collection(lotteryCollection).get(),
    db.collection("registrations").get(),
  ]);

  const regByEmail = {};
  regSnap.forEach((d) => { const x = d.data() || {}; if (x.email) regByEmail[String(x.email).toLowerCase()] = x; });

  const rows = lotSnap.docs.map((d) => {
    const p = d.data() || {};
    const r = regByEmail[String(p.email || "").toLowerCase()] || {};
    return {
      name: p.name || r.name || "",
      dept: r.dept || "",
      email: p.email || "",
      mode: p.mode === "線上" ? "線上" : "實體",
      lunch: r.lunch || "",
      father: p.isFather ? "是" : "否",
      message: r.message || "",
      passedAt: tw(p.passedAt),
      registeredAt: tw(r.createdAt),
    };
  });
  rows.sort((a, b) => (a.passedAt || "").localeCompare(b.passedAt || ""));

  const wb = new ExcelJS.Workbook();
  wb.creator = "飛揚社父親節報名系統";
  const ws = wb.addWorksheet("通關名單");
  ws.columns = [
    { header: "姓名", key: "name", width: 14 },
    { header: "部門", key: "dept", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "參加方式", key: "mode", width: 10 },
    { header: "午餐便當", key: "lunch", width: 10 },
    { header: "是否爸爸", key: "father", width: 10 },
    { header: "想說的一句話", key: "message", width: 32 },
    { header: "通關時間", key: "passedAt", width: 22 },
    { header: "報名時間", key: "registeredAt", width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4EC" } };
  rows.forEach((r) => ws.addRow(r));
  ws.autoFilter = { from: "A1", to: "I1" };
  return await wb.xlsx.writeBuffer();
}
