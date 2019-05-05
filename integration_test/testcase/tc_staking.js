
"use strict";

const assert = require('assert')
const node = require('../../api/node')
const docker = require('../../api/docker')
const block = require('../../api/block')
const { sleep } = require('../../api/util')
const staking = require('../../api/staking')
const BigNumber = require('big-number');
const { validatorNode } = require('../../api/definition')



describe('Staking test suite', () => {

    const smallBondAmount   = 100000000
    const mediumBondAmount  = 150000000
    const largeBondAmount   = 200000000

    before(async function(){

        // get address for each validator
        staking.initValidatorConfig()
        // due to 0 fund bonded on Alice, need to bond extra fund for following test cases
        await staking.bondExtra(validatorNode.alice.seed, mediumBondAmount)
    })

    it("New controller Bob(for validator Charlie) joins in", async function() {

        const txResult = await staking.startNewValidatorNode( validatorNode.bob )    
        // judge the peer count
        assert( txResult == true, `New validator [${validatorNode.bob.seed}] failed to join the boot node.`)
    });

    it.only('Make controller Bob begin to stake', async function() {
        // Bob is inheret account which has been stashed, so don't need to bond() again
        const stashAccSeed = 'Charlie'
        const controllerSeed = validatorNode.bob.seed
        const bondAmount = largeBondAmount

        await staking.stakeValidator(stashAccSeed, controllerSeed, bondAmount)
    });

    it('Startup controller James (new account) and make it stake', async function() {
        this.timeout(120000)

        const stashAccSeed = 'Dave'
        const controllerSeed = validatorNode.james.seed
        const bondAmount = smallBondAmount
        const trans_amount  = 100000 //10000000000000000
        

        // topup to pay tx fee
        // await node.transfer('Alice', validatorNode.james.address, trans_amount, 0)     // staking token
        await node.transfer('Alice', validatorNode.james.address, trans_amount, 10)    // spending token
        
        // startup a new validator node 
        const txResult = await staking.startNewValidatorNode( validatorNode.james )
        // judge the result
        assert( txResult == true, `New validator [${validatorNode.james.seed}] failed to join the boot node.`)
        
        // bond
        // await staking.bond(validatorNode.james.seed, bond_amount)
        
        // stake
        await staking.stakeValidator(stashAccSeed, controllerSeed, bondAmount)
    });

    it.skip('TODO: Staker James obtains reward', async function() {
        // TODO: reward is not working for the new staking module
        await staking.checkReward(validatorNode.james)
    });

    it('Let richer controller Eve join in and least-bond staker James will be replaced', async function() {
        this.timeout(120000)

        const stashAccSeed = 'Ferdie'
        const controllerSeed = validatorNode.eve.seed 
        const bondAmount = largeBondAmount
    
        // start up the new node
        await staking.startNewValidatorNode(validatorNode.eve)

        // make controller to stake
        await staking.stakeValidator(stashAccSeed, controllerSeed, bondAmount)

        // await staking.waitEraChange()

        const stakeId_eve = await staking.queryStakingIndex(validatorNode.eve.seed)
        const stakeId_james = await staking.queryStakingIndex(validatorNode.james.seed)

        assert( stakeId_eve >= 0, `Failed to make richer validator [${validatorNode.eve.seed}] into staking list.`)
        assert( stakeId_james < 0, `Failed to kick validator [${validatorNode.james.seed}] out from staking list.`)
    });

    it('Unstake Eve and waiting controller James comes back', async function() {    
        await staking.unstakeValidator(validatorNode.eve.seed)

        const stakeId_eve = await staking.queryStakingIndex(validatorNode.eve.seed)
        const stakeId_james = await staking.queryStakingIndex(validatorNode.james.seed)

        assert( stakeId_eve < 0, `Failed to unstake validator [${validatorNode.eve.seed}].`)
        assert( stakeId_james >= 0, `Failed to put validator [${validatorNode.james.seed}] back to staking list.`)
    });

    it('Shutdown Bob (one of three stakers), chain is still working', async function() {
        // get block number before drop node
        const preBlockNum = await block.getCurrentBlockNumber()

        // stop the docker container
        docker.dropNode(validatorNode.bob.containerName)

        // await at least 2 blocks
        const currBlockNum = await block.waitBlockCnt(2)

        assert(currBlockNum - preBlockNum >= 2, `Chain did not work well. (Current block id [${currBlockNum}], previous id [${preBlockNum}])`)
    });

    it.skip('Offline staker <Bob> obtains punishment. TODO: Punishment did not work.', async function() {

        const validator = validatorNode.bob
        
        // await one era to ensure the valiator is leaving.
        // await staking.waitEraChange()

        const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        await staking.waitSessionChange()

        const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        // bal_afterSession < bal_preSession,
        assert( BigNumber(bal_preSession).minus(bal_afterSession).gt(0),
                `Validator [${validator.seed}] did not get punishment.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)
    });

    it('Two stakers left (Alice and James), shutdown James, then chain stop working, and will recovery after staker James is back', async function() {
        const validator = validatorNode.james

        // get last block id
        const preBlockId = await block.waitBlockCnt(0)

        // shutdown node
        docker.dropNode(validator.containerName)

        // sleep 5s and restart validator bob
        await sleep(5000)
        staking.startNewValidatorNode(validator)
        
        // await at least 2 blocks
        const currBlockId = await block.waitBlockCnt(2)
        assert(currBlockId > preBlockId, `Chain did not work well. (Current block id [${currBlockId}], previouse is []${preBlockId})`)

        // check if Bob is in the staking list
        const index = await staking.queryStakingIndex(validator.seed)
        assert(index >= 0, `Validator [${validator.seed}] is not in the staking list.`)
    });

    it('Unstake controller James', async function() {
        await staking.unstakeValidator(validatorNode.james.seed)
    });

});
