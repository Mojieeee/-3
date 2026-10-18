"""Whitelist-only source bundle. No .env, mnemonic, private key, or wallet keystore is copied."""
from pathlib import Path
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
paths = [
    "packages/hardhat/contracts/MJJToken.sol",
    "packages/hardhat/contracts/Escrow.sol",
    "packages/hardhat/test/Escrow.ts",
    "packages/hardhat/deploy/01_deploy_token.ts",
    "packages/hardhat/deploy/02_deploy_escrow.ts",
    "packages/hardhat/scripts/lab3-config.ts",
    "packages/hardhat/scripts/lab3-status.ts",
    "packages/hardhat/scripts/lab3-local-walkthrough.ts",
    "packages/hardhat/lab3.config.json",
    "packages/nextjs/scaffold.config.ts",
    "lab3/协同操作说明.txt",
    "lab3/部署.command", "lab3/启动前端.command", "lab3/本地自检.command",
    "lab3/打包共享资料.py",
]
live = root / "packages/hardhat/lab3-records/potos-deployment.json"
if live.exists():
    paths += ["packages/hardhat/lab3-records/potos-deployment.json",
              "packages/nextjs/contracts/deployedContracts.ts"]
    # Deployment artifacts contain public ABI and bytecode, not signing credentials.
    for name in ["MJJToken.json", "Escrow.json", ".chainId"]:
        paths.append("packages/hardhat/deployments/potos_testnet/" + name)
else:
    print("尚无 POTOS 正式部署记录：共享包仅含源码和操作说明，不含本地演练地址。")

dest = root / "lab3/实验3_莫均杰_公开共享包.zip"
base_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as archive:
    for rel in paths:
        source = root / rel
        if not source.is_file():
            raise FileNotFoundError(source)
        archive.write(source, rel)
    archive.writestr("使用说明.txt", "本包是课程仓库的增量文件。先 git clone https://github.com/kyonRay/my-first-dapp.git，"
        f"然后进入仓库运行 git checkout {base_commit}，"
        "再把包内目录合并到仓库根目录，运行 yarn install、yarn compile。"
        "参阅 lab3/协同操作说明.txt。每人自己的部署配置不能照抄他人的钱包、代币身份或仲裁人。\n")
print(dest)
