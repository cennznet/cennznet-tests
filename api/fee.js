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

const { bootNodeApi } = require('./websocket');
const BN = require('bignumber.js')


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
        let fee = await api.query.fees.feeRegistry('0x0100')
        return fee.toString()
    }
    
    async _queryByteFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.fees.feeRegistry('0x0101')
        return fee.toString()
    }
    
    async _queryTransferFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.fees.feeRegistry('0x0000')
        return fee.toString()
    }

    async _queryCreationFee(){
        const api = await bootNodeApi.getApi()
        let fee =  await api.query.genericAsset.creationFee()
        return parseInt(fee.toString())
    }

    async calulateTransferFee(txByteLength){
        await this.fetchSysFees()
        const totalTxFee = BN(this.transferFee).plus(this.baseFee).plus(BN(this.byteFee).times(txByteLength))
        return totalTxFee.toFixed()
    }
}

// create a global fee object
const systemFee = new SystemFee()

module.exports.systemFee = systemFee


module.exports.calulateTxFee = async function(txByteLength){
    systemFee.fetchSysFees()
    return systemFee.calulateTransferFee(txByteLength)
}

module.exports.queryTxFee = async function (blockHash, extrinsicIndex, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    let txFee = 0

    // check all events in the block to find out fee charged
    const events = await api.query.system.events.at(blockHash)
    events.forEach((record) => {
        // extract the phase, event and the event types
        const { event, phase } = record;
        const types = event.typeDef;

        // console.log('record =', record)
        if (event.section.toLowerCase() == 'fees' && event.method.toLowerCase() == 'charged'){

            const index = parseInt(event.data[0].toString())
            const feeAmount = event.data[1].toString()
            // locate the same tx with index
            if ( index == extrinsicIndex ){
                txFee = feeAmount.toString()
            }
        }
    });

    return parseInt(txFee)
}

module.exports.queryCurrentTxFee = async function (extrinsicIndex, nodeApi = bootNodeApi){
    const api = await nodeApi.getApi()
    let txFee = await api.query.fees.currentTransactionFee(extrinsicIndex)
    return parseInt(txFee)
}