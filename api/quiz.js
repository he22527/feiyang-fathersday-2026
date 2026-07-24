import { getDb, docIdForEmail } from "./_firestore.js";
import {
  publicQuestions, isAllCorrect, LOTTERY_COLLECTION,
  QUIZ_OPEN_AT, QUIZ_CLOSE_AT, quizIsOpen, quizIsClosed,
  QUIZ_STATE_COLLECTION, QUIZ_CLOSE_NOTIFIED_DOC,
} from "./_quiz.js";
import { sendQuizPassMail, sendQuizCloseMail } from "./_notify.js";
import { collectLottery, summarizeLottery, buildLotteryXlsx } from "./_report.js";

// 截止時間一到，寄出全部填答者資料檔給同工；用 Firestore 文件 create() 當原子鎖，確保只寄一次。
async function maybeSendCloseNotice(db) {
  if (!quizIsClosed()) return;
  const lockRef = db.collection(QUIZ_STATE_COLLECTION).doc(QUIZ_CLOSE_NOTIFIED_DOC);
  try {
    await lockRef.create({ sentAt: new Date().toISOString() });
  } catch {
    return; // 已經寄過（或搶鎖失敗），略過
  }
  try {
    const rows = await collectLottery(db, LOTTERY_COLLECTION);
    const stats = summarizeLottery(rows);
    const xlsxBuffer = await buildLotteryXlsx(db, LOTTERY_COLLECTION);
    await sendQuizCloseMail({ stats, xlsxBuffer });
  } catch (err) {
    console.error("quiz close notify error:", err);
  }
}

export default async function handler(req, res) {
  // GET：回傳題目（不含正解）供前端顯示；順便檢查是否該寄出截止通知
  if (req.method === "GET") {
    const db = getDb();
    await maybeSendCloseNotice(db);
    return res.status(200).json({
      ok: true, questions: publicQuestions(),
      openAt: QUIZ_OPEN_AT, closeAt: QUIZ_CLOSE_AT,
      isOpen: quizIsOpen() && !quizIsClosed(),
    });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "只接受 GET/POST" });
  }

  try {
    // 時間閘門：開放前、截止後一律不受理送出
    if (!quizIsOpen()) {
      return res.status(403).json({ ok: false, notOpen: true, openAt: QUIZ_OPEN_AT, error: "作答尚未開放，將於 2026/08/07 11:50 開放。" });
    }
    if (quizIsClosed()) {
      return res.status(403).json({ ok: false, closed: true, closeAt: QUIZ_CLOSE_AT, error: "作答已於 2026/08/07 13:00 截止。" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const answers = body.answers || {};

    if (!name) return res.status(400).json({ ok: false, error: "請填寫姓名" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ ok: false, error: "請填寫正確的 Email" });

    const passed = isAllCorrect(answers);
    if (!passed) {
      return res.status(200).json({ ok: true, passed: false, error: "答案不完全正確，請再聽一次分享後重試 🙂" });
    }

    const entry = {
      name,
      email,
      mode: body.mode === "線上" || body.mode === "online" ? "線上" : "實體",
      isFather: body.isFather === true || body.isFather === "是",
      passedAt: new Date().toISOString(),
    };

    const db = getDb();
    await db.collection(LOTTERY_COLLECTION).doc(docIdForEmail(email)).set(entry, { merge: true });

    // 統計符合抽獎資格人數／爸爸人數，並自動寄通關名單 Excel 通知同工；寄信失敗不影響通關成功。
    let mailed = false;
    try {
      const rows = await collectLottery(db, LOTTERY_COLLECTION);
      const stats = summarizeLottery(rows);
      const xlsxBuffer = await buildLotteryXlsx(db, LOTTERY_COLLECTION);
      mailed = await sendQuizPassMail(entry, { stats, xlsxBuffer });
    } catch (mailErr) {
      console.error("quiz notify mail error:", mailErr);
    }

    return res.status(200).json({ ok: true, passed: true, mailed });
  } catch (err) {
    console.error("quiz error:", err);
    return res.status(500).json({ ok: false, error: "系統忙線，請稍後再試" });
  }
}
