"use strict";

const { sleep } = require('./util')
const { Api } = require('@cennznet/api')
const { WsProvider } = require('@cennznet/api/polkadot')
const { nodeServerWsIp } = require('./args')


class WsApi{
    constructor(ip = 'ws://127.0.0.1:9944'){
        this._wsIp = ip
        this._provider = null
        this._api = null
        // this._type = apiType.CENNZ
    }

    async init(){
        // if api is existing , just use it
        if ( this._api != null ){
            return
        }

        // repeat trying if connection is failed
        for ( let i = 0; i < 120; i++ ){
            try{
                this._provider = await new WsProvider(this._wsIp)
                this._api = await Api.create(this._provider)
                break
            }
            catch(e){
                console.log('Init api failed!')
                console.log('error =', e)
                this._provider = null
                this._api = null
            }

            await sleep(500)
        }

        if ( this._api == null ){
            throw new Error('Api.create(...) failed!')
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
        this._provider.websocket.close()
        this._provider = null
        this._api = null
    }
}

module.exports.bootNodeApi = new WsApi(nodeServerWsIp)
module.exports.WsApi = WsApi






