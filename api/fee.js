

const { bootNodeApi } = require('./websocket');


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

module.exports.SystemFee = SystemFee


// ---- test code 
async function test(){

    console.log( await (new SystemFee()).fetchSysFee() )
}

// test()