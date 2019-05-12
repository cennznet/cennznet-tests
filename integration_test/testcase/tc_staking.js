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

const assert = require('assert')
const node = require('../../api/node')
const docker = require('../../api/docker')
const block = require('../../api/block')
const { sleep } = require('../../api/util')
const staking = require('../../api/staking')
const BigNumber = require('big-number');
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

    before(async function(){
        // get address for each validator
        staking.initValidatorConfig()
        // due to 0 fund bonded on Alice, need to bond extra fund for following test cases
        // await staking.bondExtra(cennznetNode.alice.seed, mediumBondAmount)
        
    })

    it("Start a new node for validator <Charlie>", async function() {

        const txResult = await staking.startNewcennznetNode( validator.charlie.sessionKeyNode )    
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

    it('Launch new node for validator <Ferdie> (controller uses new account) and make it stake', async function() {
        this.timeout(180000)

        const currValidator = validator.ferdie
        const transAmount  = '10000000000000000'
        
        // topup to pay tx fee
        await node.transfer('Alice', currValidator.controllerSeed, transAmount, CURRENCY.SPEND)    // spending token topup
        
        // startup a new validator node 
        const txResult = await staking.startNewcennznetNode( currValidator.sessionKeyNode )
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

    it('Controller <Bob> obtains reward. TODO: only check additional_reward here, will check session reward in the future if needed', async function() {
        // additional_reward belongs to Cennznet-node, should be tested here.
        await staking.checkAdditionalReward(validator.charlie.controllerSeed)
    });

    it('Let richer validator <Eve> join in and least-bond staker <Ferdie> will be replaced', async function() {
        this.timeout(120000)
    
        // start up the new node
        const txResult = await staking.startNewcennznetNode(validator.eve.sessionKeyNode)
        assert.equal( txResult, true, `New node [${validator.eve.sessionKeySeed}] failed to join the boot node.`)

        // make controller to stake
        const stakerId = await staking.startStaking(
            validator.eve.stashSeed,
            validator.eve.controllerSeed,
            validator.eve.sessionKeySeed,
            validator.eve.bondAmount)
        assert( stakerId >= 0, `Failed to make controller [${validator.eve.controllerSeed}] stake.`)

        const stakeId_eve = await staking.queryStakingControllerIndex(validator.eve.controllerSeed)
        const stakeId_ferdie = await staking.queryStakingControllerIndex(validator.ferdie.controllerSeed)

        assert( stakeId_eve >= 0, `Failed to make richer controller [${validator.eve.controllerSeed}] into staking list.`) // TODO: failed here
        assert( stakeId_ferdie < 0, `Failed to kick controller [${validator.ferdie.controllerSeed}] out from staking list.`)
    });

    it('Unstake <Eve> and waiting validator <Ferdie> comes back', async function() {    
        await staking.endStaking(validator.eve.controllerSeed)

        const stakeId_eve = await staking.queryStakingControllerIndex(validator.eve.controllerSeed)
        const stakeId_ferdie = await staking.queryStakingControllerIndex(validator.ferdie.controllerSeed)

        assert( stakeId_eve < 0, `Failed to unstake controller [${validator.eve.controllerSeed}].`)
        assert( stakeId_ferdie >= 0, `Failed to put validator [${validator.ferdie.controllerSeed}] back to staking list.`)
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

    it.skip('Offline staker <Charlie> obtains punishment. TODO: Punishment did not work.', async function() {

        const validator = cennznetNode.bob
        
        // await one era to ensure the valiator is leaving.
        // await staking.waitEraChange()

        const bal_preSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        await staking.waitSessionChange()

        const bal_afterSession = await node.queryFreeBalance(validator.address, node.CURRENCY.STAKE)

        // bal_afterSession < bal_preSession,
        assert( BigNumber(bal_preSession).minus(bal_afterSession).gt(0),
                `Validator [${validator.seed}] did not get punishment.(Bal before tx = ${bal_preSession}, Bal after tx = ${bal_afterSession})`)
    });

    it('Make staker <Ferdie> offline and chain is still working, and will work again when <Ferdie> comes back', async function() {
        const currValidator = validator.ferdie
        
        // get last block id
        const preBlockId = await block.getCurrentBlockIndex()

        // shutdown node for validator
        docker.dropNodeByContainerName(currValidator.sessionKeyNode.containerName)

        // await at least 2 blocks
        const currBlockId = await block.waitBlockCnt(3)
        assert(currBlockId > preBlockId, `Chain did not work well. (Current block id [${currBlockId}], previouse is []${preBlockId})`)

        // restart validator bob
        // await sleep(15000)
        staking.startNewcennznetNode(currValidator.sessionKeyNode)
        
        await staking.waitEraChange()

        // check if validator is still in the staking list
        const index = await staking.queryStakingControllerIndex(currValidator.controllerSeed)
        assert(index >= 0, `Validator [${currValidator.stashSeed}] is not in the staking list.`)
    });

    it.skip('TODO:Unstake validator <Ferdie>, the chain would be still working', async function() {
        // get last block id
        const preBlockId = await block.getCurrentBlockIndex()
        // unstake
        await staking.endStaking(validator.ferdie.controllerSeed)
        // await at least 2 blocks
        const currBlockId = await block.waitBlockCnt(3)
        assert(currBlockId > preBlockId, `Chain did not work well. (Current block id [${currBlockId}], previouse is []${preBlockId})`)
    });

});
