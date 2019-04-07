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
const { transfer, queryFreeBalance } = require('../../api/node')
const { CURRENCY } = require('../../api/definition')



describe('Generic Asset test suite:', function () {
    
    // asset id
    var assetId = null
    const newTokenStartId = 17000

    // input data
    const assetOwner = 'Alice'

    // designate who can act as follows
    var permission = {    
        update: 'Bob',      // bob
        mint:   'Charlie',  // charlie
        burn:   'Dave',     // dave
    } 

    const assetAmount = 10000 // 1000000000000000000000000

    it('Create a new token', async function() {
        const permissionAddress = ga.getPermissionAddress(permission)

        console.log('before bal = ', (await queryFreeBalance(assetOwner, CURRENCY.SPEND)).toString() )

        // create the asset and get id
        const txResult = await ga.createNewToken(assetOwner, assetAmount, permissionAddress)
        assetId = txResult.assetId.toString()
        const tokenBalance_ga = await ga.queryTokenBalance(assetId, assetOwner)
        const tokenBalance_owner = await node.queryFreeBalance(assetOwner, assetId)

        console.log('after bal = ', (await queryFreeBalance(assetOwner, CURRENCY.SPEND)).toString() )

        assert(assetId >= newTokenStartId, `Token ID (current id = ${assetId}) should larger than ${newTokenStartId}.`)
        assert(BigNumber(tokenBalance_ga).minus(assetAmount) == 0, 
                `ga.getFreeBalance() did not get correct balance for new token. (expected Value = ${assetAmount}, actual value = ${tokenBalance_ga} )`)
        assert(BigNumber(tokenBalance_owner).minus(assetAmount) == 0,
                `Token owner's balance is incorrect. (expected Value = ${assetAmount}, actual value = ${tokenBalance_ga} )`)       

    });

    it('Update permission', async function() {
        const updaterSeed = permission.update
        // swap values of mint and burn
        permission.mint = [permission.burn, permission.burn = permission.mint][0]
        const permissionAddress = ga.getPermissionAddress(permission)

        // get balance before tx
        const spendBal_beforeTx = await ga.queryTokenBalance(CURRENCY.SPEND, updaterSeed)

        // update permission
        const txResult = await ga.updatePermission(updaterSeed, assetId, permissionAddress)
        assert.equal(txResult.bSucc, true, `Update permission failed`)

        // get balance after tx
        let spendBal_afterTx = await ga.queryTokenBalance(CURRENCY.SPEND, updaterSeed)

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
        const ownerAssetBal_beforeTx = await ga.queryTokenBalance(assetId, ownerSeed)
        const burnerSpendBal_beforeTx = await ga.queryTokenBalance(CURRENCY.SPEND, burnerSeed)

        // burn the asset
        const txResult = await ga.burn(burnerSeed, assetId, ownerSeed, burn_amount)
        assert.equal(txResult.bSucc, true, `Burn asset failed`)

        // get balance after tx
        const ownerAssetBal_afterTx = await ga.queryTokenBalance(assetId, ownerSeed)
        const burnerSpendBal_afterTx = await ga.queryTokenBalance(CURRENCY.SPEND, burnerSeed)

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
        const ownerAssetBal_beforeTx = await ga.queryTokenBalance(assetId, ownerSeed)
        const minterSpendBal_beforeTx = await ga.queryTokenBalance(CURRENCY.SPEND, minterSeed)

        // burn the asset
        const txResult = await ga.mint(minterSeed, assetId, ownerSeed, mint_amount)
        assert.equal(txResult.bSucc, true, `Mint asset failed`)

        // get balance after tx
        const ownerAssetBal_afterTx = await ga.queryTokenBalance(assetId, ownerSeed)
        const minterSpendBal_afterTx = await ga.queryTokenBalance(CURRENCY.SPEND, minterSeed)

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
        const toAddress = '5CxGSuTtvzEctvocjAGntoaS6n6jPQjQHp7hDG1gAuxGvbYJ'
        const transAmt = 1000

        // get bal before tx
        let beforeTx_stake = await queryFreeBalance(toAddress, assetId)
        let beforeTx_spend = await queryFreeBalance(toAddress, CURRENCY.SPEND)

        console.log('before bal = ', (await queryFreeBalance(fromSeed, CURRENCY.SPEND)).toString() )
        // transfer
        const txResult = await transfer(fromSeed, toAddress, transAmt, assetId)

        console.log('after bal = ', (await queryFreeBalance(fromSeed, CURRENCY.SPEND)).toString() )
        console.log('txResult.txFee =', txResult.txFee.toString())

        // get bal after tx
        let afterTx_stake = await queryFreeBalance(toAddress, assetId)
        let afterTx_spend = await queryFreeBalance(toAddress, CURRENCY.SPEND)

        assert( (afterTx_stake - beforeTx_stake) == transAmt, 
                `Transfer tx (${fromSeed} -> transfer amount: ${transAmt}, asset id:${assetId} -> ${toAddress}) failed. Payee's balance changed from [${beforeTx_stake}] to [${afterTx_stake}]`)
        assert( beforeTx_spend == afterTx_spend, 
                `Spending token changed from ${beforeTx_spend} to ${afterTx_spend}`)
    });
});
