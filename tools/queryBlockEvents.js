
const { bootNodeApi } = require('../api/websocket');

async function queryBlockEvents(blockId) {
    const api = await bootNodeApi.getApi()

    const blockHash = await api.rpc.chain.getBlockHash(blockId)

    // check all events in the block to find out fee charged
    const events = await api.query.system.events.at(blockHash)
    events.forEach((record) => {
        // extract the phase, event and the event types
        const { event, phase } = record;
        const types = event.typeDef;
        // show what we are busy with
        console.log(event.section + ':' + event.method + '::' + 'phase=' + phase.toString());
        console.log(event.meta.documentation.toString());
        // loop through each of the parameters, displaying the type and data
        event.data.forEach((data, index) => {
            console.log(types[index].type + ';' + data.toString());
        });
    });


}

async function run(){
    await queryBlockEvents(5)
}


run()