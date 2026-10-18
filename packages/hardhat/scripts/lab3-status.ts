import fs from "fs";
import path from "path";
import hre from "hardhat";
import { lab3 } from "./lab3-config";

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 60600n) throw new Error("此脚本只收集 POTOS 测试网的正式部署记录。");
  const tokenDeployment = await hre.deployments.get("MJJToken");
  const escrowDeployment = await hre.deployments.get("Escrow");
  const token = await hre.ethers.getContractAt("MJJToken", tokenDeployment.address);
  const escrow = await hre.ethers.getContractAt("Escrow", escrowDeployment.address);
  const report = {
    recordedAt: new Date().toISOString(),
    chainId: Number(network.chainId),
    student: lab3.studentName,
    studentId: lab3.studentId,
    token: {
      address: tokenDeployment.address,
      owner: await token.owner(),
      symbol: await token.symbol(),
      totalSupply: (await token.totalSupply()).toString(),
      transactionHash: tokenDeployment.transactionHash,
      tag: lab3.tokenTag,
    },
    escrow: {
      address: escrowDeployment.address,
      arbiter: await escrow.arbiter(),
      orderCount: (await escrow.orderCount()).toString(),
      transactionHash: escrowDeployment.transactionHash,
      tag: lab3.escrowTag,
    },
  };
  const output = path.resolve(__dirname, "../lab3-records/potos-deployment.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  console.log("已保存公开部署信息：", output);
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
