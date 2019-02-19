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
const BigNumber = require('big-number');

// issuer
var issuer = null

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

        const ownerSpendingBal_beforeTx = await node.queryFreeBalance(assetOwner, 10)

        // create the asset and get id
        const txResult = await ga.createNewToken(assetOwner, assetAmount)
        const newTokenId = txResult.assetId.toString()
        const tokenBalance_ga = await ga.queryTokenBalance(newTokenId, assetOwner)
        const tokenBalance_owner = await node.queryFreeBalance(assetOwner, newTokenId)

        const ownerSpendingBal_afterTx = await node.queryFreeBalance(assetOwner, 10)

        assert(newTokenId >= 100000, `Token ID (current id = ${newTokenId}) should larger than 1,000,000.`)
        assert(BigNumber(tokenBalance_ga).minus(assetAmount) == 0, 
                `ga.getFreeBalance() did not get correct balance for new token. (expected Value = ${assetAmount}, actual value = ${tokenBalance_ga} )`)
        assert(BigNumber(tokenBalance_owner).minus(assetAmount) == 0, 
                `Token owner's balance is incorrect. (expected Value = ${assetAmount}, actual value = ${tokenBalance_ga} )`)       

        // console.log('ownerSpendingBal_beforeTx =',ownerSpendingBal_beforeTx)
        // console.log('tokenBalance_ga =', tokenBalance_ga)
        // console.log('tokenBalance_owner =',tokenBalance_owner)
        // console.log('ownerSpendingBal_afterTx =',ownerSpendingBal_afterTx)
        // console.log('newTokenId =', newTokenId)
    });

    it.skip('Test_Case_2', async function() {
        this.timeout(60000)
        // TODO:
    });

    // TODO: add more test cases below...
});
