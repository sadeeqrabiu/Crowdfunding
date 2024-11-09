import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Main } from '../wrappers/Main';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Main', () => {
    let code: Cell;
  

    beforeAll(async () => {
        code = await compile('Main');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let main: SandboxContract<Main>;
    let contributor1: SandboxContract<TreasuryContract>;
    let contributor2: SandboxContract<TreasuryContract>;


    beforeEach(async () => {
        blockchain = await Blockchain.create();

        contributor1 = await blockchain.treasury('contributor1');
        contributor2 = await blockchain.treasury('contributor2');
        deployer = await blockchain.treasury('deployer');



        //Current Time Function
        const currentTime = Math.floor(Date.now() / 1000);

        main = blockchain.openContract(Main.createFromConfig({
            owner_address: deployer.address,
            goal_amount: toNano('100'),
            deadline: currentTime + 86400,
        }, code));

        // deployer = await blockchain.treasury('deployer');

        // const deployResult = await main.sendDeploy(deployer.getSender(), toNano('1'));

        // expect(deployResult.transactions).toHaveTransaction({
        //     from: deployer.address,
        //     to: main.address,
        //     deploy: true,
        //     success: true,
        // });
    });


    it('should accept contributions', async () => {
         const contribution = toNano('10');
        

    });
});
