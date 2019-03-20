"use strict";

const assert = require('assert')
const cennzx = require('../../api/cennzx')
const ga = require('../../api/ga')
const node = require('../../api/node')


describe('CennzX test suite', function () {
    
    var coreAsssetId = -1
    var tokenAsssetId = -1
    const tokenIssuerSeed = 'Bob'
    const tokenTotalAmount = 1000000
    
    before( async function(){
        // coreAsssetId = await cennzx.getCoreAssetId()
        // tokenAsssetId = await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)
        // console.log('tokenAsssetId = ', tokenAsssetId)
    })

    after(function(){
    })

    it('Add liquidity', async function() {
        
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 10000
        const coreAmountInput       = 10000

        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        tokenAsssetId = (await ga.createNewToken(tokenIssuerSeed, tokenTotalAmount)).assetId.toString()
        console.log('coreAsssetId = ', coreAsssetId)
        console.log('tokenAsssetId = ', tokenAsssetId)

        let issuerCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        let issuerTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        
        console.log('issuerCoreAsssetBal =', issuerCoreAsssetBal.toString())
        console.log('issuerTokenAsssetBal =', issuerTokenAsssetBal.toString())

        await cennzx.addLiquidity(tokenIssuerSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)

        console.log('-------------------')

        let getLiquidityBalance = await cennzx.getLiquidityBalance(tokenAsssetId, tokenIssuerSeed)
        let getTotalLiquidity = await cennzx.getTotalLiquidity(tokenAsssetId, tokenIssuerSeed)
        let getExchangeAddress = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)

        let exchangeCoreAsssetBal = await node.queryFreeBalance(getExchangeAddress, coreAsssetId)
        let exchangeTokenAsssetBal = await node.queryFreeBalance(getExchangeAddress, tokenAsssetId)

        issuerCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        issuerTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)

        console.log('getLiquidityBalance =',    getLiquidityBalance.toString())
        console.log('getTotalLiquidity =',      getTotalLiquidity.toString())
        console.log('getExchangeAddress =',     getExchangeAddress.toString())
        console.log('exchangeCoreAsssetBal =',  exchangeCoreAsssetBal.toString())
        console.log('exchangeTokenAsssetBal =', exchangeTokenAsssetBal.toString())
        console.log('issuerCoreAsssetBal =',    issuerCoreAsssetBal.toString())
        console.log('issuerTokenAsssetBal =',   issuerTokenAsssetBal.toString())
    });

    it('Add liquidity again', async function() {
        
        const minLiquidityWanted    = 2
        const maxAssetAmountInput   = 20000
        const coreAmountInput       = 10000

        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        tokenAsssetId = '1000019'
        console.log('coreAsssetId = ', coreAsssetId)
        console.log('tokenAsssetId = ', tokenAsssetId)

        let issuerCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        let issuerTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        
        console.log('issuerCoreAsssetBal =', issuerCoreAsssetBal.toString())
        console.log('issuerTokenAsssetBal =', issuerTokenAsssetBal.toString())

        const result = await cennzx.addLiquidity(tokenIssuerSeed, tokenAsssetId, minLiquidityWanted, maxAssetAmountInput, coreAmountInput)
        console.log('result =', result.bSucc)

        console.log('-------------------')

        let getLiquidityBalance = await cennzx.getLiquidityBalance(tokenAsssetId, tokenIssuerSeed)
        let getTotalLiquidity = await cennzx.getTotalLiquidity(tokenAsssetId, tokenIssuerSeed)
        let getExchangeAddress = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)

        let exchangeCoreAsssetBal = await node.queryFreeBalance(getExchangeAddress, coreAsssetId)
        let exchangeTokenAsssetBal = await node.queryFreeBalance(getExchangeAddress, tokenAsssetId)

        issuerCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        issuerTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)

        console.log('getLiquidityBalance =',    getLiquidityBalance.toString())
        console.log('getTotalLiquidity =',      getTotalLiquidity.toString())
        console.log('getExchangeAddress =',     getExchangeAddress.toString())
        console.log('exchangeCoreAsssetBal =',  exchangeCoreAsssetBal.toString())
        console.log('exchangeTokenAsssetBal =', exchangeTokenAsssetBal.toString())
        console.log('issuerCoreAsssetBal =',    issuerCoreAsssetBal.toString())
        console.log('issuerTokenAsssetBal =',   issuerTokenAsssetBal.toString())
    });

    it.only('Remove liquidity', async function() {
        

        coreAsssetId = (await cennzx.getCoreAssetId()).toString()
        tokenAsssetId = '1000019'
        console.log('coreAsssetId = ', coreAsssetId)
        console.log('tokenAsssetId = ', tokenAsssetId)

        let issuerCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        let issuerTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)
        
        console.log('issuerCoreAsssetBal =', issuerCoreAsssetBal.toString())
        console.log('issuerTokenAsssetBal =', issuerTokenAsssetBal.toString())

        

        console.log('-------------------')

        let getLiquidityBalance = await cennzx.getLiquidityBalance(tokenAsssetId, tokenIssuerSeed)
        let getTotalLiquidity = await cennzx.getTotalLiquidity(tokenAsssetId, tokenIssuerSeed)
        let getExchangeAddress = await cennzx.getExchangeAddress(tokenAsssetId, tokenIssuerSeed)

        let exchangeCoreAsssetBal = await node.queryFreeBalance(getExchangeAddress, coreAsssetId)
        let exchangeTokenAsssetBal = await node.queryFreeBalance(getExchangeAddress, tokenAsssetId)

        issuerCoreAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, coreAsssetId)
        issuerTokenAsssetBal = await node.queryFreeBalance(tokenIssuerSeed, tokenAsssetId)

        console.log('getLiquidityBalance =',    getLiquidityBalance.toString())
        console.log('getTotalLiquidity =',      getTotalLiquidity.toString())
        console.log('getExchangeAddress =',     getExchangeAddress.toString())
        console.log('exchangeCoreAsssetBal =',  exchangeCoreAsssetBal.toString())
        console.log('exchangeTokenAsssetBal =', exchangeTokenAsssetBal.toString())
        console.log('issuerCoreAsssetBal =',    issuerCoreAsssetBal.toString())
        console.log('issuerTokenAsssetBal =',   issuerTokenAsssetBal.toString())
    });
});