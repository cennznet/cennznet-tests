

const { bootNodeApi } = require('./websocket');


class SystemFee{
    constructor(){
        this.baseFee = -1
        this.byteFee = -1
        this.transferFee = -1
        this.creationFee = -1
    }

    async fetchSysFees(){
        if ( this.baseFee == -1 && this.byteFee == -1 && this.transferFee == -1){
            this.baseFee = await this._queryBaseFee()
            this.byteFee = await this._queryByteFee()
            this.transferFee = await this._queryTransferFee()
            // this.creationFee = await this._queryCreationFee()
        }
        
        return this
    }

    async _queryBaseFee(){
        const api = await bootNodeApi.getApi()
        let fee = await api.query.fees.transactionBaseFee()
        return parseInt(fee.toString())
    }
    
    async _queryByteFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.fees.transactionByteFee()
        return parseInt(fee.toString())
    }
    
    async _queryTransferFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.genericAsset.transferFee()
        return parseInt(fee.toString())
    }

    async _queryCreationFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.genericAsset.creationFee()
        return parseInt(fee.toString())
    }

    async calulateTransferFee(txByteLength){
        await this.fetchSysFees()
        const totalTxFee = this.transferFee + this.baseFee + this.byteFee * txByteLength
        return totalTxFee
    }
}

// create a global fee object
const systemFee = new SystemFee()

module.exports.systemFee = systemFee


module.exports.calulateTxFee = async function(txByteLength){
    systemFee.fetchSysFees()
    return systemFee.calulateTransferFee(txByteLength)
}

module.exports.queryTxFee = async function (blockHash, txHash, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    let extrinsic_index = -1
    let txFee = 0

    const blockInfo = await api.rpc.chain.getBlock(blockHash)

    // get extrinsic_index for tx
    blockInfo.block.extrinsics.forEach( (extrinsic, index) => {
        if ( extrinsic.hash.toString() == txHash ){
            extrinsic_index = index
        }
    })

    // check all events in the block to find out fee charged
    const events = await api.query.system.events.at(blockHash)
    events.forEach((record) => {
        // extract the phase, event and the event types
        const { event, phase } = record;
        const types = event.typeDef;

        if (event.section.toLowerCase() == 'fees' && event.method.toLowerCase() == 'charged'){

            const index = parseInt(event.data[0].toString())
            const feeAmount = event.data[1].toString()
            // locate the same tx with index
            if ( index == extrinsic_index ){
                txFee = feeAmount.toString()
            }
        }
    });

    return parseInt(txFee)
}

module.exports.queryTxFee2 = async function (txHash, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    let txFee = await api.query.fees.currentTransactionFee(txHash)



    return parseInt(txFee)
}