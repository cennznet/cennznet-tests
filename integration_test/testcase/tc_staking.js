// Copyright 2019 Centrality Investments Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

const assert = require('chai').assert
const expect = require('chai').expect
const node = require('../../api/node')
const docker = require('../../api/docker')
const block = require('../../api/block')
const { sleep } = require('../../api/util')
const staking = require('../../api/staking')
const BN = require('bignumber.js');
const { cennznetNode, CURRENCY } = require('../../api/definition')



describe('Staking test suite', () => {

    // define validator information
    const validator = {
        charlie: {
            stashSeed:      'Charlie',
            bondAmount:     '1000000000000000000',
            controllerSeed: 'Bob',
            sessionKeySeed: 'Bunny',
            sessionKeyNode: cennznetNode.bunny
        },
        ferdie: {
            stashSeed:      'Ferdie',
            bondAmount:     '10000000000000000',
            controllerSeed: 'James',
            sessionKeySeed: 'Pig',
            sessionKeyNode: cennznetNode.pig,
        },
        eve: {
            stashSeed:      'Eve',
            bondAmount:     '15000000000000000',
            controllerSeed: 'Dave',
            sessionKeySeed: 'Monkey',
            sessionKeyNode: cennznetNode.monkey,
        }
    }

    var poorestControllerAddress = ''

    before(async function(){
        // get address for each validator
        staking.initValidatorConfig()
        // due to 0 fund bonded on Alice, need to bond extra fund for following test cases
        // await staking.bondExtra(cennznetNode.alice.seed, mediumBondAmount)
        
    })

    it("Start a new node for validator <Charlie>", async function() {

        const txResult = await staking.startNewValidatorNode( validator.charlie.sessionKeyNode )    
        // judge the peer count
        assert.equal( txResult, true, `New node [${validator.charlie.sessionKeySeed}] failed to join the boot node.`)
    });

    it('Make validator <Charlie> begin to stake', async function() {
        const currvalidator = validator.charlie
        const stakerId = await staking.startStaking(
            currvalidator.stashSeed,
            currvalidator.controllerSeed,
            currvalidator.sessionKeySeed,
            currvalidator.bondAmount)

        // check if the validator is in the staker list
        assert( stakerId >= 0, `Failed to make controller [${currvalidator.controllerSeed}] stake.`)
    });

    it('<Eve> nominates on <Charlie> and cancels it, TODO: contains bugs', async function() {
        const nominator = validator.eve
        const nominee = validator.charlie
        const nomineeSeedLst = []
        const nominateAmount = nominator.bondAmount
        
        const totalNominateAmount_beforeTx = await staking.getTotalBondAmount(nominee.stashSeed)
        // console.log('totalNominateAmount_beforeTx =', totalNominateAmount_beforeTx)

        // create nominee list
        nomineeSeedLst.push(nominee.stashSeed)

        await staking.nominateStaker(nominator.stashSeed, nominator.controllerSeed, nominateAmount, nomineeSeedLst)

        const totalNominateAmount_afterTx = await staking.getTotalBondAmount(nominee.stashSeed)
        // console.log('totalNominateAmount_afterTx =', totalNominateAmount_afterTx)

        expect(totalNominateAmount_afterTx)
            .to.be.equal(BN(totalNominateAmount_beforeTx).plus(nominateAmount).toString(), `Total bond amount is wrong after nominate`)

        await staking.unnominateStaker(nominator.controllerSeed)

        const totalNominateAmount_afterUnominate = await staking.getTotalBondAmount(nominee.stashSeed)
        // console.log('totalNominateAmount_afterUnominate =', totalNominateAmount_afterUnominate)

        expect(totalNominateAmount_afterUnominate)
            .to.be.equal(totalNominateAmount_beforeTx, `Total bond amount is wrong after unnominate`)
    });

    it('Launch new node for validator <Ferdie> (controller uses new account) and make it stake', async function() {
        this.timeout(180000)

        const currValidator = validator.ferdie
        const transAmount  = '10000000000000000'
        
        // topup to pay tx fee
        await node.transfer('Alice', currValidator.controllerSeed, transAmount, CURRENCY.SPEND)    // spending token topup
        
        // startup a new validator node 
        const txResult = await staking.startNewValidatorNode( currValidator.sessionKeyNode )
        // judge the result
        assert.equal( txResult, true, `New node [${currValidator.sessionKeySeed}] failed to join the boot node.`)

        // stake
        const stakerId = await staking.startStaking(
            currValidator.stashSeed,
            currValidator.controllerSeed,
            currValidator.sessionKeySeed,
            currValidator.bondAmount)

        // check if the validator is in the staker list
        assert( stakerId >= 0, `Failed to make controller [${currValidator.controllerSeed}] stake.`)
    });

    it.only('Controller <Bob> obtains reward. TODO: only check additional_reward here, will check session reward in the future if needed', async function() {
        // additional_reward belongs to Cennznet-node, should be tested here.
        await staking.checkAdditionalReward(validator.charlie.controllerSeed)
    });

    it('Let richer validator <Eve> join in and least-bond staker <call it staker_x> will be replaced', async function() {
        this.timeout(180000)
    
        // find the least-bond staker's controller
        poorestControllerAddress = await staking.getPoorestStaker()

        // start up the new node
        const txResult = await staking.startNewValidatorNode(validator.eve.sessionKeyNode)
        assert.equal( txResult, true, `New node [${validator.eve.sessionKeySeed}] failed to join the boot node.`)

        // make controller to stake
        const stakerId = await staking.startStaking(
            validator.eve.stashSeed,
            validator.eve.controllerSeed,
            validator.eve.sessionKeySeed,
            validator.eve.bondAmount)
        // assert( stakerId >= 0, `Failed to make controller [${validator.eve.controllerSeed}] stake.`)
        expect(stakerId).to.be.gte(0, `Failed to make controller [${validator.eve.controllerSeed}] stake.`)

        const stakeId_eve = await staking.queryStakingControllerIndex(validator.eve.controllerSeed)
        const stakeId_poorestController = await staking.queryStakingControllerIndex(poorestControllerAddress)

        // assert( stakeId_eve >= 0, `Failed to make richer controller [${validator.eve.controllerSeed}] into staking list.`) // TODO: failed here
        expect(stakeId_eve).to.be.gte(0, `Failed to make richer controller [${validator.eve.controllerSeed}] into staking list.`)
        // assert( stakeId_ferdie < 0, `Failed to kick controller [${validator.ferdie.controllerSeed}] out of staking list.`)
        expect(stakeId_poorestController).to.be.lt(0, `Failed to kick controller [${poorestControllerAddress}] out of staking list.`)
    });

    it('Unstake <Eve> and waiting validator <staker_x> comes back', async function() {   
        this.timeout(120000) 

        await staking.endStaking(validator.eve.controllerSeed)

        // const stakeId_eve = await staking.queryStakingControllerIndex(validator.eve.controllerSeed)
        const stakeId_controllerBack = await staking.queryStakingControllerIndex(poorestControllerAddress)

        // assert( stakeId_eve < 0, `Failed to unstake controller [${validator.eve.controllerSeed}].`)
        assert( stakeId_controllerBack >= 0, `Failed to put validator [${poorestControllerAddress}] back to staking list.`)
    });

    it('Make richest staker <Charlie> offline, chain is still working', async function() {
        // get block number before drop node
        const preBlockNum = await block.getCurrentBlockIndex()

        // stop the session key node
        docker.dropNodeByContainerName(validator.charlie.sessionKeyNode.containerName)

        // await at least 2 blocks
        const currBlockNum = await block.waitBlockCnt(2)

        assert(currBlockNum - preBlockNum >= 2, `Chain did not work well. (Current block id [${currBlockNum}], previous id [${preBlockNum}])`)
    });

    it('Offline staker <Charlie> got slash.', async function() {
        /**
         * Slash only happens when validator is kicked out from staker list.
         * - slash was put on Stash account.
         */
        this.timeout(120000)

        const staker = validator.charlie
        
        // await one era to ensure the valiator is leaving.
        // await staking.waitEraChange()

        const bal_beforeSlash = await node.queryFreeBalance(staker.stashSeed, CURRENCY.STAKE)

        // get block number before drop node
        const preBlockNum = await block.getCurrentBlockIndex()

        // stop the session key node
        docker.dropNodeByContainerName(validator.charlie.sessionKeyNode.containerName)

        // await at least 2 blocks
        const currBlockNum = await block.waitBlockCnt(2)
        // check if node is still generating blocks
        assert(currBlockNum - preBlockNum >= 2, `Chain did not work well. (Current block id [${currBlockNum}], previous id [${preBlockNum}])`)

        // wait for validator being kicked out
        for ( let i = 0; i < 120; i++ ){
            let index = await staking.queryStakingControllerIndex(staker.controllerSeed)    // check avaiable by querying controller seed
            if ( index < 0 ){
                // staker leave
                break
            }
            else{
                await sleep(1000) // sleep 1s
            }
        }

        await block.waitBlockCnt(1)

        const bal_afterSlash = await node.queryFreeBalance(staker.stashSeed, CURRENCY.STAKE)

        // bal_afterSlash < bal_beforeSlash
        assert(
            BN(bal_afterSlash).lt(bal_beforeSlash), 
            `Did not find the slash on staker[${staker.stashSeed}]: bal_afterSlash = ${bal_afterSlash}, bal_beforeSlash = ${bal_beforeSlash}`)    
    });

    it('Make staker <Ferdie> offline and chain stops working, and will work again when <Ferdie> comes back', async function() {
        const currValidator = validator.ferdie
        
        // get last block id
        const preBlockId = await block.getCurrentBlockIndex()

        // shutdown node for validator
        docker.dropNodeByContainerName(currValidator.sessionKeyNode.containerName)

        // await a while to check if new block generated
        for ( let i = 0; i < 10; i++ ){
            let currBlockId = await block.getCurrentBlockIndex()
            assert.equal(currBlockId, preBlockId, `Chain is still working.`)
            await sleep(1000)
        }

        // restart validator bob
        // await sleep(15000)
        staking.startNewValidatorNode(currValidator.sessionKeyNode)
        
        await staking.waitEraChange()

        // check if validator is still in the staking list
        const index = await staking.queryStakingControllerIndex(currValidator.controllerSeed)
        // assert(index >= 0, `Validator [${currValidator.stashSeed}] is not in the staking list.`)
        expect(index).to.be.gte(0, `Validator [${currValidator.stashSeed}] is not in the staking list.`)
    });

    it.skip('Unstake validator <Ferdie>, the chain is still working.TODO: Unstake did not work.', async function() {
        // get last block id
        const preBlockId = await block.getCurrentBlockIndex()
        // unstake
        await staking.endStaking(validator.ferdie.controllerSeed)
        // await at least 2 blocks
        const currBlockId = await block.waitBlockCnt(3)
        assert(currBlockId > preBlockId, `Chain did not work well. (Current block id [${currBlockId}], previouse is []${preBlockId})`)
    });
    
});
