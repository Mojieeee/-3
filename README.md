# 实验3：托管交易合约与合约工程化（MJJ）

基于 [kyonRay/my-first-dapp](https://github.com/kyonRay/my-first-dapp) / Scaffold-ETH 2，保留原项目 MIT 许可。

## 组员直接运行

要求 Node.js >=20.18.3、Yarn 3（仓库附带 Yarn 3.2.3），首次运行：

```bash
git clone https://github.com/Mojieeee/-3.git mjj-lab3
cd mjj-lab3
yarn install
yarn start
```

打开终端显示的本机网址（通常 [http://localhost:3000/debug](http://localhost:3000/debug)），连接 MetaMask，切换 POTOS Testnet（Chain ID 60600）。组员访问已部署合约只需启动前端，无需运行 yarn chain 或 yarn deploy，也无需把私钥交给他人。

## 本轮角色与链上地址

| 角色 | 账户 |
| --- | --- |
| 买家 mjj | `0x6A18a7821d0E8F5f1ABBA1960c4438dF6edd9622` |
| 卖家 wsy | `0x1f5a8566880c0D242F145B9172812eC18F50D1Ea` |
| 仲裁人 hmk | `0x779ED69bf966eb5b9E5F16f18E9d1a34f314Be87` |

- MJJToken：`0x55611EB38243142583C12D4D9c4F9e4f534029b9`
- 当前 Escrow：`0xc8B5D09F028CCfaF8cf03Eb55C31e62acef8FD52`
- 旧 Escrow `0x3Db9AcACc13DcA53eA5Dc17bee9d38541e22fEC1` 的仲裁人是 wsy，本轮不使用。
- 部署交易记录：`packages/hardhat/lab3-records/potos-deployment.json`。

每笔订单用实际 ID，先读取买卖双方和状态。正常订单完成前不要发起争议。角色操作和截图要求见 `lab3/协同操作说明.txt`。

## 本地验证

```bash
yarn compile
yarn hardhat:test
yarn hardhat:check-types
yarn next:check-types
```

Escrow 有8个课程测试及7个边界测试，另有2个原始示例测试。内存链测试不代表真实测试网交易。链上订单流程、组员交易和报告截图须实际完成。

合约和测试位于 `packages/hardhat`；前端合约地址与 ABI 位于 `packages/nextjs/contracts/deployedContracts.ts`。包含针对 POTOS RPC 空错误消息的真实 revert 数据解码，显示合约实际返回的失败原因。

部署脚本仅允许课程测试网及本地链，校验签名账户。自行部署需要本人在本机提供临时签名配置；仓库不包含钱包私钥、助记词或钱包文件。请不要向 GitHub 提交这些内容。

## AI 使用

使用 Codex 辅助实现与验证合约、测试、部署配置及前端错误显示，并整理操作说明。学习者仍需理解代码并用真实实验记录填写报告。
