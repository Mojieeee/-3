import fs from "fs";
import path from "path";
import assert from "assert/strict";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { lab3 } from "./lab3-config";

async function main() {
  if (hre.network.name !== "hardhat") throw new Error("本演练只允许运行在 Hardhat 内存链。");
  const [buyer, , seller, arbiter] = await hre.ethers.getSigners();
  process.env.ARBITER_ADDRESS = arbiter.address;
  // Exercise the real deployment scripts, but never contact POTOS or use the user's wallet.
  await hre.run("deploy", { tags: `${lab3.tokenTag},${lab3.escrowTag}` });
  const token = await hre.ethers.getContractAt("MJJToken", (await hre.deployments.get("MJJToken")).address);
  const escrow = await hre.ethers.getContractAt("Escrow", (await hre.deployments.get("Escrow")).address);
  const escrowAddress = await escrow.getAddress();
  assert.equal((await escrow.arbiter()).toLowerCase(), arbiter.address.toLowerCase());
  const amount = hre.ethers.parseUnits("30", 18);
  const records: Array<Record<string, unknown>> = [];
  async function record(label: string, tx: { wait: () => Promise<any> }) {
    const receipt = await tx.wait();
    records.push({
      label,
      hash: receipt.hash,
      block: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status,
      logs: receipt.logs.map((log: any) => ({ address: log.address, topics: log.topics, data: log.data })),
    });
    console.log(`${label}: gas=${receipt.gasUsed} tx=${receipt.hash}`);
  }
  async function expectedFailure(label: string, action: () => Promise<unknown>, reason: string) {
    try {
      await action();
    } catch (error: any) {
      if (!String(error.message).includes(reason)) throw error;
      records.push({ label, expectedRevert: reason });
      console.log(`${label}: ${reason}（预期失败）`);
      return;
    }
    throw new Error(label + " 应当失败，但没有失败");
  }
  await record("mint 100", await token.mint(buyer.address, hre.ethers.parseUnits("100", 18)));
  const deadline = (await time.latest()) + 1800;
  await record(
    "订单0 createOrder",
    await escrow.createOrder(seller.address, await token.getAddress(), amount, deadline, "实验3订单"),
  );
  await expectedFailure("订单0 未授权付款", () => escrow.deposit(0), "MJJToken: insufficient allowance");
  await record("订单0 approve", await token.approve(escrowAddress, amount));
  await record("订单0 deposit", await escrow.deposit(0));
  assert.equal((await escrow.getOrder(0)).status, 1n);
  await expectedFailure("卖家确认", () => escrow.connect(seller).confirm(0), "Escrow: caller is not the buyer");
  await expectedFailure("未到期退款", () => escrow.refund(0), "Escrow: deadline not reached");
  await record("订单0 confirm", await escrow.confirm(0));
  assert.equal((await escrow.getOrder(0)).status, 2n);
  assert.equal(await token.balanceOf(seller.address), amount);
  await record(
    "订单1 createOrder",
    await escrow.createOrder(seller.address, await token.getAddress(), amount, deadline, "争议订单"),
  );
  await record("订单1 approve", await token.approve(escrowAddress, amount));
  await record("订单1 deposit", await escrow.deposit(1));
  await record("订单1 dispute", await escrow.connect(seller).dispute(1));
  assert.equal((await escrow.getOrder(1)).status, 4n);
  await expectedFailure("买家仲裁", () => escrow.resolve(1, false), "Escrow: caller is not the arbiter");
  await record("订单1 resolve false", await escrow.connect(arbiter).resolve(1, false));
  assert.equal((await escrow.getOrder(1)).status, 3n);
  assert.equal(await token.balanceOf(buyer.address), hre.ethers.parseUnits("70", 18));
  const refundDeadline = (await time.latest()) + 180;
  await record(
    "订单2 createOrder",
    await escrow.createOrder(seller.address, await token.getAddress(), amount, refundDeadline, "选做退款"),
  );
  await record("订单2 approve", await token.approve(escrowAddress, amount));
  await record("订单2 deposit", await escrow.deposit(2));
  await expectedFailure("订单2 提前退款", () => escrow.refund(2), "Escrow: deadline not reached");
  await time.increaseTo(refundDeadline + 1);
  await record("订单2 refund", await escrow.refund(2));
  assert.equal((await escrow.getOrder(2)).status, 3n);
  assert.equal(await token.balanceOf(escrowAddress), 0n);
  const output = path.resolve(__dirname, "../lab3-records/local-walkthrough.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(
    output,
    JSON.stringify(
      {
        scope: "仅本地 Hardhat 内存链演练，不是 POTOS 交易，不代表三名真人已协作",
        chainId: 31337,
        recordedAt: new Date().toISOString(),
        buyer: buyer.address,
        seller: seller.address,
        arbiter: arbiter.address,
        token: await token.getAddress(),
        escrow: escrowAddress,
        records,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("本地正常成交、争议退款、到期退款全部通过。公开记录：", output);
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
