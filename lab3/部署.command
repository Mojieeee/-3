#!/bin/bash
set -euo pipefail
LAB3_REPO=$(cd "$(dirname "$0")/.." && pwd)
cd "$LAB3_REPO"
if [ -f "$HOME/blockchain-course/course-env.sh" ]; then . "$HOME/blockchain-course/course-env.sh"; fi
mkdir -p lab3/records
echo '实验3 POTOS 测试网部署'
echo '只部署 MJJToken 和 Escrow，不铸币、不创建订单。'
node -e 'const c=require("./packages/hardhat/lab3.config.json"); console.log("部署者应为："+c.expectedDeployer); console.log("当前配置的仲裁人："+(c.arbiterAddress||"未填写"));'
LAB3_ARBITER_CONFIG=$(node -p 'require("./packages/hardhat/lab3.config.json").arbiterAddress')
read -r -p "本轮仲裁人地址（直接回车使用 ${LAB3_ARBITER_CONFIG}）：" ARBITER_ADDRESS
ARBITER_ADDRESS=${ARBITER_ADDRESS:-$LAB3_ARBITER_CONFIG}
export ARBITER_ADDRESS
node -e 'const e=require("./packages/hardhat/node_modules/ethers"); const a=process.env.ARBITER_ADDRESS; const c=require("./packages/hardhat/lab3.config.json"); if(!e.isAddress(a)||a===e.ZeroAddress||a.toLowerCase()===c.expectedDeployer.toLowerCase()){console.error("仲裁人地址无效或与本人相同"); process.exit(1)}'
echo '网络为 POTOS Testnet，Chain ID 60600。两次部署会消耗该测试网的 POT。'
read -r -p '确认以上信息后输入 DEPLOY：' LAB3_CONFIRM
case "$LAB3_CONFIRM" in
  [Dd][Ee][Pp][Ll][Oo][Yy]) ;;
  *) echo '未部署。'; exit 0 ;;
esac
read -r -s -p '请本人输入部署账户私钥（输入不回显，仅当前进程使用）：' __RUNTIME_DEPLOYER_PRIVATE_KEY
echo
case "$__RUNTIME_DEPLOYER_PRIVATE_KEY" in
  0x*) ;;
  *) __RUNTIME_DEPLOYER_PRIVATE_KEY="0x$__RUNTIME_DEPLOYER_PRIVATE_KEY" ;;
esac
export __RUNTIME_DEPLOYER_PRIVATE_KEY
trap 'unset __RUNTIME_DEPLOYER_PRIVATE_KEY' EXIT
node - <<'JS'
const {Wallet}=require('./packages/hardhat/node_modules/ethers');
const c=require('./packages/hardhat/lab3.config.json');
try {
  const w=new Wallet(process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY);
  if(w.address.toLowerCase()!==c.expectedDeployer.toLowerCase()) throw Error();
  console.log('签名账户校验通过：'+w.address);
} catch { console.error('输入格式不正确，或不是 lab3.config.json 中的预期账户。未部署。'); process.exit(1); }
JS
yarn deploy --network potos_testnet --tags TokenMJJ202430551184 2>&1 | tee lab3/records/3-4-token-deploy.log
yarn deploy --network potos_testnet --tags EscrowMJJ202430551184 2>&1 | tee lab3/records/3-4-escrow-deploy.log
yarn workspace @se-2/hardhat hardhat run scripts/lab3-status.ts --network potos_testnet 2>&1 | tee lab3/records/potos-status.log
unset __RUNTIME_DEPLOYER_PRIVATE_KEY
python3 lab3/打包共享资料.py
echo '部署结束。先截图两次部署输出，再运行 lab3/启动前端.command。'
