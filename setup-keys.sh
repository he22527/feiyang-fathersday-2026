#!/usr/bin/env bash
# 一鍵設定機密金鑰並重新部署。
# 用法：在專案資料夾開 Git Bash，執行  bash setup-keys.sh
# 前置：把 Firebase 服務帳戶 JSON 下載後改名為 sa.json 放在本資料夾（已被 .gitignore 擋住）。
set -euo pipefail
cd "$(dirname "$0")"

echo "== 飛揚社父親節 · 金鑰設定 =="

# 1) Firebase 服務帳戶私鑰
if [ ! -f sa.json ]; then
  echo "✗ 找不到 sa.json"
  echo "  請先到 Firebase 主控台 → 專案設定(齒輪) → 服務帳戶 → 產生新的私密金鑰，"
  echo "  把下載的 JSON 改名為 sa.json 放到這個資料夾，再重跑本腳本。"
  exit 1
fi
echo "→ 上傳 FIREBASE_SERVICE_ACCOUNT ..."
vercel env rm FIREBASE_SERVICE_ACCOUNT production -y >/dev/null 2>&1 || true
node -e "process.stdout.write(JSON.stringify(require('./sa.json')))" | vercel env add FIREBASE_SERVICE_ACCOUNT production
echo "  ✓ 完成"

# 2) Gmail 應用程式密碼（輸入時不顯示；自動去除空格）
echo
read -rsp "→ 貼上 Gmail 應用程式密碼(16碼，輸入不顯示)，按 Enter：" GPW
echo
GPW="${GPW// /}"
if [ -z "$GPW" ]; then echo "✗ 未輸入密碼"; exit 1; fi
echo "→ 上傳 GMAIL_APP_PASSWORD ..."
vercel env rm GMAIL_APP_PASSWORD production -y >/dev/null 2>&1 || true
printf '%s' "$GPW" | vercel env add GMAIL_APP_PASSWORD production
unset GPW
echo "  ✓ 完成"

# 3) 重新部署
echo
echo "→ 重新部署 production ..."
vercel --prod --yes

echo
echo "全部完成！用瀏覽器開："
echo "  https://feiyang-lottery.vercel.app/api/registrations"
echo '應回 {"ok":true,"count":0,...} 代表 Firestore 已連通。'
