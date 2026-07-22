// 摸彩通關題目與正解（正解只存在伺服器端，前端拿不到）。
// 依講員戴豐源博士《沙灘上的雙重腳印》分享內容設計，可自行修改。
export const QUESTIONS = [
  {
    id: "q1",
    title: "本次講員戴豐源博士分享的講題是？",
    options: ["《沙灘上的雙重腳印》", "《高山上的足跡》", "《海邊的日出》"],
    answer: 0,
  },
  {
    id: "q2",
    title: "講員以「耶和華必在你前面行，祂必與你同在」勉勵大家，這段經文出自？",
    options: ["詩篇 23 篇", "申命記 31:8", "腓立比書 4:13"],
    answer: 1,
  },
];

// 作答開放時間（台灣時間 2026/08/07 11:30）；可用環境變數 QUIZ_OPEN_AT 覆蓋。
export const QUIZ_OPEN_AT = process.env.QUIZ_OPEN_AT || "2026-07-22T02:46:00+08:00";
export function quizIsOpen() {
  return Date.now() >= new Date(QUIZ_OPEN_AT).getTime();
}

// 給前端顯示用（不含正解）
export function publicQuestions() {
  return QUESTIONS.map(({ id, title, options }) => ({ id, title, options }));
}

// 檢查作答是否全對；answers 形如 { q1: 0, q2: 1 }
export function isAllCorrect(answers) {
  return QUESTIONS.every((q) => Number(answers?.[q.id]) === q.answer);
}

export const LOTTERY_COLLECTION = process.env.LOTTERY_COLLECTION || "lottery";
export const WINNERS_DOC = process.env.WINNERS_DOC || "current";
export const WINNERS_COLLECTION = process.env.WINNERS_COLLECTION || "winners";
