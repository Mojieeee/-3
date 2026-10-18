import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { checkDeployment, getArbiter, lab3 } from "../scripts/lab3-config";

const deployEscrow: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await checkDeployment(hre);
  const arbiter = await getArbiter(hre);
  // Escrow's arbiter is immutable through the course interface: never silently reuse a different one.
  const existing = await hre.deployments.getOrNull("Escrow");
  if (existing) {
    const contract = await hre.ethers.getContractAt("Escrow", existing.address);
    if ((await contract.arbiter()).toLowerCase() !== arbiter.toLowerCase()) {
      throw new Error("已有 Escrow 的仲裁人与当前配置不同。请先核对部署记录，不要继续复用错误合约。");
    }
  }
  await hre.deployments.deploy("Escrow", {
    from: deployer,
    args: [arbiter],
    log: true,
    autoMine: true,
  });
};
export default deployEscrow;
deployEscrow.tags = [lab3.escrowTag];
