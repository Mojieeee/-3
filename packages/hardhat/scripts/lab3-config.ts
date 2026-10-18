import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress, isAddress, ZeroAddress } from "ethers";
import lab3 from "../lab3.config.json";

export { lab3 };

export async function checkDeployment(hre: HardhatRuntimeEnvironment) {
  const local = hre.network.name === "hardhat" || hre.network.name === "localhost";
  if (!local && hre.network.name !== "potos_testnet") {
    throw new Error("本课程部署脚本只允许 hardhat、localhost 或 potos_testnet。");
  }
  if (!local && !/^0x[0-9a-fA-F]{64}$/.test(process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY ?? "")) {
    throw new Error("缺少本次终端的部署授权。请本人运行部署.command；不会使用示例默认私钥部署测试网。");
  }
  const { deployer } = await hre.getNamedAccounts();
  if (!local && getAddress(deployer) !== getAddress(lab3.expectedDeployer)) {
    throw new Error(`当前签名地址 ${deployer} 与 lab3.config.json 的 expectedDeployer 不一致。`);
  }
  return { local, deployer };
}

export async function getArbiter(hre: HardhatRuntimeEnvironment) {
  const { local, deployer } = await checkDeployment(hre);
  const supplied = process.env.ARBITER_ADDRESS || lab3.arbiterAddress;
  if (!supplied && local) {
    // This account is only for the explicitly selected local exercise.
    return (await hre.ethers.getSigners())[3].address;
  }
  if (!isAddress(supplied) || getAddress(supplied) === ZeroAddress) {
    throw new Error("请在 lab3.config.json 填入组内仲裁人的真实公开地址，或设置 ARBITER_ADDRESS。");
  }
  if (!local && getAddress(supplied) === getAddress(deployer)) {
    throw new Error("仲裁人须为组内另一位同学，不能填本轮买家自己的地址。");
  }
  return getAddress(supplied);
}
