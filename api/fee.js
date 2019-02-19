

const { bootNodeApi } = require('./websocket');
const { getRunContainer } = require('./docker');

const { xxhashAsHex } = require('@polkadot/util-crypto');
const { Keyring, decodeAddress } = require('@polkadot/keyring');
const { stringToU8a, u8aToHex } = require('@polkadot/util');
const { Address, u32, u128 } = require('@polkadot/types') ;
const { AssetId } = require('cennznet-runtime-types');
const { SimpleKeyring, Wallet } = require('cennznet-wallet')


class SystemFee{
    constructor(){
        this.baseFee = 0
        this.byteFee = 0
        this.transferFee = 0
        this.transactionFee = 0
    }

    async fetchSysFee(){
        this.baseFee = await this._queryBaseFee()
        this.byteFee = await this._queryByteFee()
        this.transferFee = await this._queryTransferFee()
        return this
    }

    async _queryBaseFee(){
        const api = await bootNodeApi.getApi()
        let fee = await api.query.balances.transactionBaseFee()
        return parseInt(fee.toString())
    }
    
    async _queryByteFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.balances.transactionByteFee()
        return parseInt(fee.toString())
    }
    
    async _queryTransferFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.balances.transferFee()
        return parseInt(fee.toString())
    }
}




// ---- test code 
async function test(){

    console.log( await (new SystemFee()).fetchSysFee() )
}

// test()