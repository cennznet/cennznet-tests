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
// const { transfer, queryFreeBalance } = require('../../api/node')
const { CURRENCY } = require('../../api/definition')


describe('Generic Asset test suite:', function () {
    
    // asset id
    var assetId = null
    const newTokenStartId = 17000

    // input data
    const assetOwner = 'Alice'//'Alice'

    // designate who can act as follows
    var permission = {    
        update: 'Bob',      // bob
        mint:   'Charlie',  // charlie
        burn:   'Dave',     // dave
    } 

    const assetAmount = 10000 // 1000000000000000000000000

    before(async function(){
        await node.topupTestAccount()    // only for remote test
    })

    it.only('Create a new token', async function() {
        const permissionAddress = await ga.getPermissionAddress(permission)

        // get spending bal before tx
        const spendBal_beforeTx = await node.queryFreeBalance(assetOwner, CURRENCY.SPEND)

        // create the asset and get id
        const txResult = await ga.createNewToken(assetOwner, assetAmount, permissionAddress)
        assetId = txResult.assetId
        // console.log('assetId =', assetId)
        assert(assetId >= newTokenStartId, `Token ID (current id = ${assetId}) should larger than ${newTokenStartId}.`)

        const assetBalance = await node.queryFreeBalance(assetOwner, assetId)

        // get spending bal after tx
        const spendBal_afterTx = await node.queryFreeBalance(assetOwner, CURRENCY.SPEND)

        // check asset balance
        assert.equal(
            assetBalance.toString(),
            assetAmount.toString(),
            `Token owner's asset balance is wrong.`)    
        
        // check tx fee
        assert.equal(
            spendBal_afterTx.toString(),
            BigNumber(spendBal_beforeTx).minus(txResult.txFee).toString(),
            `Spending token balance is wrong.`
        )
    });

    it('Update permission', async function() {
        const updaterSeed = permission.update
        // swap values of mint and burn
        permission.mint = [permission.burn, permission.burn = permission.mint][0]
        const permissionAddress = await ga.getPermissionAddress(permission)

        // get balance before tx
        const spendBal_beforeTx = await node.queryFreeBalance(updaterSeed, CURRENCY.SPEND)

        // update permission
        const txResult = await ga.updatePermission(updaterSeed, assetId, permissionAddress)
        assert.equal(txResult.bSucc, true, `Update permission failed`)

        // get balance after tx
        const spendBal_afterTx = await node.queryFreeBalance(updaterSeed, CURRENCY.SPEND)

        // check the spending token balance
        assert.equal(
            BigNumber(spendBal_afterTx).toString(), 
            BigNumber(spendBal_beforeTx).minus(txResult.txFee).toString(),
            `Spending token balance is wrong.`)
    });

    it('Burn amount of asset', async function() {
        const burnerSeed = permission.burn
        const ownerSeed = assetOwner
        const burn_amount = 500

        // get balance before tx
        const ownerAssetBal_beforeTx = await node.queryFreeBalance(ownerSeed, assetId)
        const burnerSpendBal_beforeTx = await node.queryFreeBalance(burnerSeed, CURRENCY.SPEND)

        // burn the asset
        const txResult = await ga.burn(burnerSeed, assetId, ownerSeed, burn_amount)
        assert.equal(txResult.bSucc, true, `Burn asset failed`)

        // get balance after tx
        const ownerAssetBal_afterTx = await node.queryFreeBalance(ownerSeed, assetId)
        const burnerSpendBal_afterTx = await node.queryFreeBalance(burnerSeed, CURRENCY.SPEND)

        // check asset balance
        assert.equal(
            BigNumber(ownerAssetBal_afterTx).toString(),
            BigNumber(ownerAssetBal_beforeTx).minus(burn_amount).toString(),
            `Owner's asset balance is wrong.`
        )

        // check trader's spending token balance
        assert.equal(
            BigNumber(burnerSpendBal_afterTx).toString(),
            BigNumber(burnerSpendBal_beforeTx).minus(txResult.txFee).toString(),
            `Spending token balance of tx sender is wrong.`
        ) 
    });

    it('Mint amount of asset', async function() {
        const minterSeed = permission.mint
        const ownerSeed = assetOwner
        const mint_amount = 5000

        // get balance before tx
        const ownerAssetBal_beforeTx = await node.queryFreeBalance(ownerSeed, assetId)
        const minterSpendBal_beforeTx = await node.queryFreeBalance(minterSeed, CURRENCY.SPEND)

        // burn the asset
        const txResult = await ga.mint(minterSeed, assetId, ownerSeed, mint_amount)
        assert.equal(txResult.bSucc, true, `Mint asset failed`)

        // get balance after tx
        const ownerAssetBal_afterTx = await node.queryFreeBalance(ownerSeed, assetId)
        const minterSpendBal_afterTx = await node.queryFreeBalance(minterSeed, CURRENCY.SPEND)

        // check asset balance
        assert.equal(
            BigNumber(ownerAssetBal_afterTx).toString(),
            BigNumber(ownerAssetBal_beforeTx).add(mint_amount).toString(),
            `Owner's asset balance is wrong.`
        )

        // check trader's spending token balance
        assert.equal(
            BigNumber(minterSpendBal_afterTx).toString(),
            BigNumber(minterSpendBal_beforeTx).minus(txResult.txFee).toString(),
            `Spending token balance of tx sender is wrong.`
        )
    });

    it('Transfer new token', async function() {

        const fromSeed = assetOwner
        const toSeed = 'James'
        const transAmt = 1000

        // get bal before tx
        const beforeTx_payeeAssetBal = await node.queryFreeBalance(toSeed, assetId)
        const beforeTx_payerSpendBal = await node.queryFreeBalance(fromSeed, CURRENCY.SPEND)

        // transfer
        const txResult = await node.transfer(fromSeed, toSeed, transAmt, assetId)

        // get bal after tx
        const afterTx_payeeassetBal = await node.queryFreeBalance(toSeed, assetId)
        const afterTx_payerSpendBal = await node.queryFreeBalance(fromSeed, CURRENCY.SPEND)

        assert.notEqual(txResult.txFee, 0, `Transaction fee is 0`)

        // check payee's asset balance
        assert.equal( 
            BigNumber(afterTx_payeeassetBal).toString(), 
            BigNumber(beforeTx_payeeAssetBal).add(transAmt).toString(),
            `Asset balance is wrong.`)
        // check payer's spending token balance
        assert.equal( 
            BigNumber(afterTx_payerSpendBal).toString(), 
            BigNumber(beforeTx_payerSpendBal).minus(txResult.txFee).toString(),
            `Spending token balance is wrong.`)
    });
});
