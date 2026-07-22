// 一鍵設定機密金鑰並重新部署（跨平台，PowerShell 直接可跑）。
// 用法：在專案資料夾執行  node setup-keys.mjs
// 前置：把 Firebase 服務帳戶 JSON 下載後改名為 sa.json 放在本資料夾（已被 .gitignore 擋住）。
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import readline from "node:readline";

function run(args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn("vercel", args, { stdio: ["pipe", "inherit", "inherit"], shell: true });
    if (input !== undefined) p.stdin.write(input);
    p.stdin.end();
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error("vercel " + args.join(" ") + " 離開碼 " + code))));
    p.on("error", reject);
  });
}

function askHidden(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = () => {}; // 輸入不顯示
    process.stdout.write(q);
    rl.question("", (ans) => { rl.close(); process.stdout.write("\n"); resolve(ans); });
  });
}

async function setEnv(name, value) {
  try { await run(["env", "rm", name, "production", "-y"]); } catch {} // 不存在就略過
  await run(["env", "add", name, "production"], value); // value 走 stdin，無多餘換行
}

async function main() {
  console.log("== 飛揚社父親節 · 金鑰設定 ==\n");

  // 1) Firebase 服務帳戶
  let sa;
  try {
    sa = JSON.parse(readFileSync(new URL("./sa.json", import.meta.url)));
  } catch {
    console.error("✗ 找不到或無法解析 sa.json，請確認已放到本資料夾。");
    process.exit(1);
  }
  if (sa.type !== "service_account" || !sa.private_key) {
    console.error("✗ sa.json 不是服務帳戶金鑰，請從『服務帳戶』頁面重新下載。");
    process.exit(1);
  }
  console.log("→ 上傳 FIREBASE_SERVICE_ACCOUNT ...");
  await setEnv("FIREBASE_SERVICE_ACCOUNT", JSON.stringify(sa));
  console.log("  ✓ 完成\n");

  // 2) Gmail 應用程式密碼
  const pw = (await askHidden("→ 貼上 Gmail 應用程式密碼(16碼，輸入不顯示)，按 Enter：")).replace(/\s/g, "");
  if (!pw) { console.error("✗ 未輸入密碼"); process.exit(1); }
  console.log("→ 上傳 GMAIL_APP_PASSWORD ...");
  await setEnv("GMAIL_APP_PASSWORD", pw);
  console.log("  ✓ 完成\n");

  // 3) 重新部署
  console.log("→ 重新部署 production ...");
  await run(["--prod", "--yes"]);

  console.log("\n全部完成！用瀏覽器開：");
  console.log("  https://feiyang-lottery.vercel.app/api/registrations");
  console.log('應回 {"ok":true,"count":0,...} 代表 Firestore 已連通。');
  console.log("（可放心刪掉 sa.json，之後要改再重下載即可）");
}

main().catch((e) => { console.error("✗ 失敗：", e.message); process.exit(1); });
