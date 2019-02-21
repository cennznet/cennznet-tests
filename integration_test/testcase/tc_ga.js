/*
For V2, following need to be included:
    Public Methods:
        1. Issue new token and fetch assertId
        2. fetch multiple assertId ( need to use NextAssetId -> start from 1,000,000 )
    Events:
        1. Created(asset_id: AssetId, creator: AccountId, asset_options: AssetOptions<Balance>)
        2. Transferred(asset_id: AssetId, from: AccountId, to: AccountId, amount: Balance)

*/


"use strict";

const assert = require('assert')
const ga = require('../../api/ga')
const node = require('../../api/node')
const BigNumber = require('big-number')
const {transfer, queryFreeBalance, currency} = require('../../api/node')

// asset id
var newTokenId = null

describe('Generic Asset test cases...', function () {
    
    before(async function(){
        // await bootNodeApi.init()
    })

    after(function(){
        // bootNodeApi.close()
    })
    
    it('Create a new token', async function() {
        this.timeout(60000)

        // input data
        const assetOwner = 'Alice'
        const assetAmount = 100000

        // const ownerSpendingBal_beforeTx = await node.queryFreeBalance(assetOwner, 10)

        // create the asset and get id
        const txResult = await ga.createNewToken(assetOwner, assetAmount)
        newTokenId = txResult.assetId.toString()
        const tokenBalance_ga = await ga.queryTokenBalance(newTokenId, assetOwner)
        const tokenBalance_owner = await node.queryFreeBalance(assetOwner, newTokenId)

        // const ownerSpendingBal_afterTx = await node.queryFreeBalance(assetOwner, 10)

        assert(newTokenId >= 100000, `Token ID (current id = ${newTokenId}) should larger than 1,000,000.`)
        assert(BigNumber(tokenBalance_ga).minus(assetAmount) == 0, 
                `ga.getFreeBalance() did not get correct balance for new token. (expected Value = ${assetAmount}, actual value = ${tokenBalance_ga} )`)
        assert(BigNumber(tokenBalance_owner).minus(assetAmount) == 0, 
                `Token owner's balance is incorrect. (expected Value = ${assetAmount}, actual value = ${tokenBalance_ga} )`)       

    });

    it('Transfer new token', async function() {
        this.timeout(60000)

        const fromSeed = 'Alice'
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000
        const assetId = newTokenId

        // get bal before tx
        let beforeTx_stake = await queryFreeBalance(toAddress, assetId)
        let beforeTx_spend = await queryFreeBalance(toAddress, currency.SPEND)

        // transfer
        await transfer(fromSeed, toAddress, transAmt, assetId)

        // get bal after tx
        let afterTx_stake = await queryFreeBalance(toAddress, assetId)
        let afterTx_spend = await queryFreeBalance(toAddress, currency.SPEND)

        assert( (afterTx_stake - beforeTx_stake) == transAmt, 
                `Transfer tx (${fromSeed} -> transfer amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${beforeTx_stake}] to [${afterTx_stake}]`)
        assert( beforeTx_spend == afterTx_spend, 
                `Spending token changed from ${beforeTx_spend} to ${afterTx_spend}`)
    });
});
