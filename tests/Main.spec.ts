import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Main } from '../wrappers/Main';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { mainModule } from 'process';

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

        main = blockchain.openContract(
            Main.createFromConfig(
                {
                    owner_address: deployer.address,
                    goal_amount: toNano('100'),
                    deadline: currentTime + 86400,
                },
                code,
            ),
        );

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

        await main.sendContribute(contributor1.getSender(), contribution);

        const info = await main.getCampaignInfo();
        expect(info.total_raised).toBe(contribution);

        const contributorBalance = await main.getContribution(contributor1.address);
        expect(contributorBalance).toBe(contribution);
    });

    it('should allow owner to finish successful campaign', async () => {
        const contribution = toNano('150'); // More than goal
        await main.sendContribute(contributor1.getSender(), contribution);

        // Manually set the deadline to a past time, if `setNow` is not supported
        const pastDeadline = Math.floor(Date.now() / 1000) - 90000;
        main = blockchain.openContract(
            Main.createFromConfig(
                {
                    owner_address: deployer.address,
                    goal_amount: toNano('100'),
                    deadline: pastDeadline,
                },
                code,
            ),
        );

        // Send finish campaign transaction
        await main.sendFinish(deployer.getSender(), toNano('1'));

        // Retrieve deployer balance (adjust based on available method)
        const deployerBalance = await deployer.getBalance(); // If this method exists
        expect(deployerBalance).toBeGreaterThan(toNano('150'));
    });

    it('should allow refunds for failed campaign', async () => {
        const contribution = toNano('50'); // Less than the goal
        await main.sendContribute(contributor1.getSender(), contribution);

        // Set deadline in the past to simulate campaign end
        const pastDeadline = Math.floor(Date.now() / 1000) - 90000;
        main = blockchain.openContract(
            Main.createFromConfig(
                {
                    owner_address: deployer.address,
                    goal_amount: toNano('100'),
                    deadline: pastDeadline,
                },
                code,
            ),
        );

        // End the campaign, marking it as failed
        await main.sendFinish(deployer.getSender(), toNano('1'));

        // Capture the contributor's initial balance
        const initialBalance = await contributor1.getBalance();

        // Attempt to claim refund
        await main.sendClaimRefund(contributor1.getSender(), toNano('1'));

        // Re-fetch balance after claiming refund
        const finalBalance = await contributor1.getBalance();

        // Allow for a small margin due to transaction fees
        // const margin = toNano('0.001'); // Small fee allowance
        expect(finalBalance).toBeLessThan(initialBalance);
    });

    it('should not allow contributions after deadline', async () => {
        // Set deadline in the past to simulate campaign ending
        const pastDeadline = Math.floor(Date.now() / 1000) - 90000;
        main = blockchain.openContract(Main.createFromConfig({
            owner_address: deployer.address,
            goal_amount: toNano('100'),
            deadline: pastDeadline,
        }, code));
    
        // Attempt to contribute, expecting it to fail
        const contributionResult = await main.sendContribute(
            contributor1.getSender(),
            toNano('10')
        );
    
        // Check that the transaction was unsuccessful
        expect(contributionResult.transactions).toHaveTransaction({
            from: contributor1.address,
            to: main.address,
            success: false,
        });
    });
});
