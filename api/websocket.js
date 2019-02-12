"use strict";

const { nodeServerWsIp } = require('./args')
const { ApiPromise } = require('@polkadot/api');
const { Api } = require('cennznet-api')
const { WsProvider } = require('@polkadot/rpc-provider');
const typeRegistry = require('@polkadot/types/codec/typeRegistry');
typeRegistry.default.register({
    AssetId: 'u32',
    Topic: 'u256', 
    Value: 'u256',
    AssetOptions: { total_supply: 'Balance' }
});

const apiType = {
    CENNZ:      0,
    POLKDOT:    10
}

class WsApi{
    constructor(ip = 'ws://127.0.0.1:9944'){
        this._wsIp = ip
        this._provider = null
        this._api = null
        // this._type = apiType.CENNZ
    }

    async init(){
        try{
            this._provider = await new WsProvider(this._wsIp, false)
            this._provider.connect()
            this._api = await Api.create( {provider: this._provider} )  // cennznet-api
            // this._api = await ApiPromise.create( this._provider )    // polkdot-api
        }
        catch(e){
            console.log('Init api failed! Error =', e)
            console.log('ws =', this._wsIp)
        }
    }

    setWsIp(wsIp){
        this._wsIp = wsIp
    }

    getWsIp(){
        return this._wsIp
    }

    async getApi(){
        if ( this._api == null ){
            await this.init()
        }
        return this._api
    }

    close(){
        this._provider.websocket.onClose = null
        this._provider.websocket.close()
        this._provider = null
        this._api = null
    }
}

module.exports.bootNodeApi = new WsApi()
module.exports.WsApi = WsApi


