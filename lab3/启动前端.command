#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f "$HOME/blockchain-course/course-env.sh" ]; then . "$HOME/blockchain-course/course-env.sh"; fi
unset NEXT_PUBLIC_LAB3_LOCAL
echo '将启动 POTOS 测试网前端。打开终端打印的 Local 地址，再进入 /debug 页面。'
echo '请用 MetaMask 连接本人账户；不要把本地测试账户当作本人钱包。'
yarn start
