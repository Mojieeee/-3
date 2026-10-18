import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { checkDeployment, lab3 } from "../scripts/lab3-config";

const deployToken: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await checkDeployment(hre);
  await hre.deployments.deploy("MJJToken", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};
export default deployToken;
deployToken.tags = [lab3.tokenTag];
