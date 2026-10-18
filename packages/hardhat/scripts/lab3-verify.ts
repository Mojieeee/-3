import fs from 'fs';
import path from 'path';
import hre from 'hardhat';
async function main() {
  if ((await hre.ethers.provider.getNetwork()).chainId !== 60600n) throw Error('Wrong chain');
  const results = [];
  for (const name of ['MJJToken', 'Escrow']) {
    const d = await hre.deployments.get(name);
    if (!d.transactionHash) throw Error('Missing transaction');
    const receipt = await hre.ethers.provider.getTransactionReceipt(d.transactionHash);
    const code = await hre.ethers.provider.getCode(d.address);
    if (!receipt || receipt.status !== 1 || code === '0x') throw Error(name + ': verification failed');
    results.push({name,address:d.address,transactionHash:d.transactionHash,status:receipt.status,blockNumber:receipt.blockNumber,gasUsed:receipt.gasUsed.toString(),codeBytes:(code.length-2)/2});
  }
  const output = JSON.stringify(results,null,2);
  fs.writeFileSync(path.resolve(__dirname,'../lab3-records/potos-verification.json'),output+'\n');
  console.log(output);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
