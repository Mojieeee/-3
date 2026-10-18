import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const AMOUNT = ethers.parseUnits("30", 18);
const INITIAL = ethers.parseUnits("100", 18);

async function deployFixture() {
  const [deployer, buyer, seller, arbiter, stranger] =
    await ethers.getSigners();
  const token = await (await ethers.getContractFactory("MJJToken")).deploy();
  await token.mint(buyer.address, INITIAL);
  const escrow = await (
    await ethers.getContractFactory("Escrow")
  ).deploy(arbiter.address);
  const deadline = (await time.latest()) + 3600;
  return {
    token,
    escrow,
    deployer,
    buyer,
    seller,
    arbiter,
    stranger,
    deadline,
  };
}

async function createdFixture() {
  const f = await deployFixture();
  await f.escrow
    .connect(f.buyer)
    .createOrder(
      f.seller.address,
      await f.token.getAddress(),
      AMOUNT,
      f.deadline,
      "一本书",
    );
  return f;
}

async function paidFixture() {
  const f = await createdFixture();
  await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
  await f.escrow.connect(f.buyer).deposit(0);
  return f;
}

describe("Escrow 课程要求的 8 个用例", function () {
  it("createOrder 记录订单并发出事件", async function () {
    const { token, escrow, buyer, seller, deadline } =
      await loadFixture(deployFixture);
    expect(
      await escrow
        .connect(buyer)
        .createOrder.staticCall(
          seller.address,
          await token.getAddress(),
          AMOUNT,
          deadline,
          "一本书",
        ),
    ).to.equal(0);
    await expect(
      escrow
        .connect(buyer)
        .createOrder(
          seller.address,
          await token.getAddress(),
          AMOUNT,
          deadline,
          "一本书",
        ),
    )
      .to.emit(escrow, "OrderCreated")
      .withArgs(
        0,
        buyer.address,
        seller.address,
        await token.getAddress(),
        AMOUNT,
        deadline,
      );
    const order = await escrow.getOrder(0);
    expect(order.buyer).to.equal(buyer.address);
    expect(order.seller).to.equal(seller.address);
    expect(order.token).to.equal(await token.getAddress());
    expect(order.amount).to.equal(AMOUNT);
    expect(order.deadline).to.equal(deadline);
    expect(order.description).to.equal("一本书");
    expect(order.status).to.equal(0);
    expect(await escrow.orderCount()).to.equal(1);
  });

  it("未 approve 时 deposit 失败且状态与余额回滚", async function () {
    const { token, escrow, buyer } = await loadFixture(createdFixture);
    await expect(escrow.connect(buyer).deposit(0)).to.be.revertedWith(
      "MJJToken: insufficient allowance",
    );
    expect((await escrow.getOrder(0)).status).to.equal(0);
    expect(await token.balanceOf(buyer.address)).to.equal(INITIAL);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("approve 后 deposit 成功，代币进入 Escrow，状态变为 Paid", async function () {
    const { token, escrow, buyer } = await loadFixture(createdFixture);
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await expect(escrow.connect(buyer).deposit(0))
      .to.emit(escrow, "OrderPaid")
      .withArgs(0)
      .and.to.emit(token, "Transfer")
      .withArgs(buyer.address, await escrow.getAddress(), AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(1);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    expect(await token.balanceOf(buyer.address)).to.equal(INITIAL - AMOUNT);
    expect(
      await token.allowance(buyer.address, await escrow.getAddress()),
    ).to.equal(0);
  });

  it("非买家调用 confirm 失败", async function () {
    const { escrow, seller } = await loadFixture(paidFixture);
    await expect(escrow.connect(seller).confirm(0)).to.be.revertedWith(
      "Escrow: caller is not the buyer",
    );
    expect((await escrow.getOrder(0)).status).to.equal(1);
  });

  it("confirm 后卖家收到代币，状态变为 Completed", async function () {
    const { token, escrow, buyer, seller } = await loadFixture(paidFixture);
    await expect(escrow.connect(buyer).confirm(0))
      .to.emit(escrow, "OrderCompleted")
      .withArgs(0);
    expect((await escrow.getOrder(0)).status).to.equal(2);
    expect(await token.balanceOf(seller.address)).to.equal(AMOUNT);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("deadline 之前及恰好相等时 refund 失败，之后退款给买家", async function () {
    const { token, escrow, buyer, deadline } = await loadFixture(paidFixture);
    await expect(escrow.connect(buyer).refund(0)).to.be.revertedWith(
      "Escrow: deadline not reached",
    );
    await time.setNextBlockTimestamp(deadline);
    await expect(escrow.connect(buyer).refund(0)).to.be.revertedWith(
      "Escrow: deadline not reached",
    );
    await time.setNextBlockTimestamp(deadline + 1);
    await expect(escrow.connect(buyer).refund(0))
      .to.emit(escrow, "OrderRefunded")
      .withArgs(0);
    expect((await escrow.getOrder(0)).status).to.equal(3);
    expect(await token.balanceOf(buyer.address)).to.equal(INITIAL);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("非仲裁人调用 resolve 失败", async function () {
    const { escrow, buyer, seller } = await loadFixture(paidFixture);
    await escrow.connect(seller).dispute(0);
    await expect(escrow.connect(buyer).resolve(0, false)).to.be.revertedWith(
      "Escrow: caller is not the arbiter",
    );
    expect((await escrow.getOrder(0)).status).to.equal(4);
  });

  it("dispute 后仲裁人 resolve(false) 退款给买家，状态变为 Refunded", async function () {
    const { token, escrow, buyer, seller, arbiter } =
      await loadFixture(paidFixture);
    await expect(escrow.connect(seller).dispute(0))
      .to.emit(escrow, "OrderDisputed")
      .withArgs(0, seller.address);
    await expect(escrow.connect(arbiter).resolve(0, false))
      .to.emit(escrow, "OrderResolved")
      .withArgs(0, false);
    expect((await escrow.getOrder(0)).status).to.equal(3);
    expect(await token.balanceOf(buyer.address)).to.equal(INITIAL);
    expect(await token.balanceOf(seller.address)).to.equal(0);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(0);
  });
});

describe("Escrow 边界与权限", function () {
  it("拒绝零地址仲裁人和不存在的订单", async function () {
    const { escrow } = await loadFixture(deployFixture);
    await expect(
      (await ethers.getContractFactory("Escrow")).deploy(ethers.ZeroAddress),
    ).to.be.revertedWith("Escrow: arbiter is the zero address");
    await expect(escrow.getOrder(0)).to.be.revertedWith(
      "Escrow: order does not exist",
    );
  });

  it("拒绝无效卖家、零金额和非未来截止时间", async function () {
    const { token, escrow, buyer, seller, deadline } =
      await loadFixture(deployFixture);
    const address = await token.getAddress();
    await expect(
      escrow
        .connect(buyer)
        .createOrder(ethers.ZeroAddress, address, AMOUNT, deadline, ""),
    ).to.be.revertedWith("Escrow: seller is the zero address");
    await expect(
      escrow
        .connect(buyer)
        .createOrder(buyer.address, address, AMOUNT, deadline, ""),
    ).to.be.revertedWith("Escrow: seller is the buyer");
    await expect(
      escrow
        .connect(buyer)
        .createOrder(seller.address, address, 0, deadline, ""),
    ).to.be.revertedWith("Escrow: amount is zero");
    await expect(
      escrow
        .connect(buyer)
        .createOrder(
          seller.address,
          address,
          AMOUNT,
          await time.latest(),
          "",
        ),
    ).to.be.revertedWith("Escrow: deadline is not in the future");
    expect(await escrow.orderCount()).to.equal(0);
  });

  it("非买家不能付款或退款，旁观者不能发起争议", async function () {
    const { escrow, seller, stranger } = await loadFixture(paidFixture);
    await expect(escrow.connect(seller).deposit(0)).to.be.revertedWith(
      "Escrow: caller is not the buyer",
    );
    await expect(escrow.connect(seller).refund(0)).to.be.revertedWith(
      "Escrow: caller is not the buyer",
    );
    await expect(escrow.connect(stranger).dispute(0)).to.be.revertedWith(
      "Escrow: caller is not a party",
    );
  });

  it("授权给卖家不能代替授权给 Escrow", async function () {
    const { token, escrow, buyer, seller } =
      await loadFixture(createdFixture);
    await token.connect(buyer).approve(seller.address, AMOUNT);
    await expect(escrow.connect(buyer).deposit(0)).to.be.revertedWith(
      "MJJToken: insufficient allowance",
    );
  });

  it("未付款不能确认，已付款不能重复付款", async function () {
    const { token, escrow, buyer } = await loadFixture(createdFixture);
    await expect(escrow.connect(buyer).confirm(0)).to.be.revertedWith(
      "Escrow: wrong status",
    );
    await token
      .connect(buyer)
      .approve(await escrow.getAddress(), AMOUNT * 2n);
    await escrow.connect(buyer).deposit(0);
    await expect(escrow.connect(buyer).deposit(0)).to.be.revertedWith(
      "Escrow: wrong status",
    );
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
  });

  it("仲裁人可判给卖家，且不能再次仲裁或确认", async function () {
    const { token, escrow, buyer, seller, arbiter } =
      await loadFixture(paidFixture);
    await expect(escrow.connect(arbiter).resolve(0, true)).to.be.revertedWith(
      "Escrow: wrong status",
    );
    await escrow.connect(buyer).dispute(0);
    await expect(escrow.connect(buyer).confirm(0)).to.be.revertedWith(
      "Escrow: wrong status",
    );
    await expect(escrow.connect(arbiter).resolve(0, true))
      .to.emit(escrow, "OrderResolved")
      .withArgs(0, true);
    expect((await escrow.getOrder(0)).status).to.equal(2);
    expect(await token.balanceOf(seller.address)).to.equal(AMOUNT);
    await expect(escrow.connect(arbiter).resolve(0, true)).to.be.revertedWith(
      "Escrow: wrong status",
    );
    await expect(escrow.connect(buyer).confirm(0)).to.be.revertedWith(
      "Escrow: wrong status",
    );
  });

  it("不同订单单独结算，第一笔完成不动用第二笔资产", async function () {
    const { token, escrow, buyer, seller, deadline } =
      await loadFixture(paidFixture);
    await escrow
      .connect(buyer)
      .createOrder(
        seller.address,
        await token.getAddress(),
        AMOUNT,
        deadline,
        "第二单",
      );
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).deposit(1);
    await escrow.connect(buyer).confirm(0);
    expect((await escrow.getOrder(1)).status).to.equal(1);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    expect(await escrow.orderCount()).to.equal(2);
  });
});
