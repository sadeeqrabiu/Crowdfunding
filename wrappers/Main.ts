import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type MainConfig = {
    owner_address: Address;
    goal_amount: bigint;
    deadline: number;
};

export function mainConfigToCell(config: MainConfig): Cell {
    return beginCell().endCell();
}

export class Main implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Main(address);
    }

    static createFromConfig(config: MainConfig, code: Cell, workchain = 0) {
      // const data = mainConfigToCell(config);
      const data = beginCell()
            .storeUint(0, 1) // init
            .storeAddress(config.owner_address)
            .storeCoins(config.goal_amount)
            .storeUint(config.deadline, 64)
            .storeCoins(0) // total_raised
            .storeDict(null) // contributors
            .storeUint(1, 1) // is_active
            .endCell();
        const init = { code, data };
        return new Main(contractAddress(workchain, init), init);
    }

    // async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    //     await provider.internal(via, {
    //         value,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         body: beginCell().endCell(),
    //     });
    // }
    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32) // op: initialize
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }
    async sendContribute(
        provider: ContractProvider,
        via: Sender,
        value: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32) // op: contribute
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }

    async sendFinish(
        provider: ContractProvider,
        via: Sender,
        value: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32) // op: finish
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }

    async sendClaimRefund(
        provider: ContractProvider,
        via: Sender,
        value: bigint
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32) // op: claim_refund
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }
    async getCampaignInfo(provider: ContractProvider) {
        const { stack } = await provider.get('get_campaign_info', []);
        return {
            goal_amount: stack.readBigNumber(),
            deadline: stack.readNumber(),
            total_raised: stack.readBigNumber(),
        };
    }

    async getContribution(provider: ContractProvider, address: Address) {
        const { stack } = await provider.get('get_contribution', [
            { type: 'slice', cell: beginCell().storeAddress(address).endCell() },
        ]);
        return stack.readBigNumber();
    }
}
