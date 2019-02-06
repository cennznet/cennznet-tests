"use strict";

const { nodeServerWsIp } = require('./getArgs')
const { ApiPromise } = require('@polkadot/api');
const { WsProvider } = require('@polkadot/rpc-provider');
const typeRegistry = require('@polkadot/types/codec/typeRegistry');
typeRegistry.default.register({
    AssetId: 'u32',
    Topic: 'u256', 
    Value: 'u256',
    AssetOptions: { total_supply: 'Balance' }
});


class WsApi{
    constructor(ip = '127.0.0.1:9944'){
        this._wsIp = ip
        this._provider = null
        this._api = null
    }

    async init(){
        this._provider = new WsProvider(this._wsIp, false)
        this._provider.connect()
        this._api = await ApiPromise.create( this._provider )
    }

    async getApi(){
        return this._api
    }


    close(){
        this._provider.websocket.close()
        this._provider = null
        this._api = null
    }
}


module.exports.bootNodeApi = new WsApi(nodeServerWsIp)
module.exports.WsApi = WsApi


