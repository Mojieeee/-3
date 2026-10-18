#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f "$HOME/blockchain-course/course-env.sh" ]; then . "$HOME/blockchain-course/course-env.sh"; fi
mkdir -p lab3/records
echo '截图3-1：原始示例测试与Gas报告'
REPORT_GAS=true yarn workspace @se-2/hardhat hardhat test test/YourContract.ts --network hardhat 2>&1 | tee lab3/records/3-1-original-tests.log
read -r -p '保存截图3-1后按回车继续：' LAB3_SHOT
echo '截图3-2：强制编译，另在编辑器截取Escrow六个函数源码'
yarn workspace @se-2/hardhat hardhat compile --force 2>&1 | tee lab3/records/3-2-compile.log
read -r -p '保存编译截图后按回车继续：' LAB3_SHOT
echo '截图3-3：完整测试与Gas报告'
yarn hardhat:test 2>&1 | tee lab3/records/3-3-tests.log
echo '以上是本机编译与测试，可保存真实终端截图；尚不代表 POTOS 已部署。'
read -r -p '保存截图3-3后按回车结束：' LAB3_SHOT
