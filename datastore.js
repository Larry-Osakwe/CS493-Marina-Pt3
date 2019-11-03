const projectId = 'w4-node-datastore-osakwel';

const {Datastore} = require('@google-cloud/datastore');

module.exports.Datastore = Datastore;
module.exports.datastore = new Datastore();
module.exports.fromDatastore = function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}
