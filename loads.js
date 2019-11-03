const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const ds = require('./datastore');

const datastore = ds.datastore;

const LOAD = "Load";

router.use(bodyParser.json());


/* ------------- Begin load Model Functions ------------- */
function post_load(weight, content, delivery_date){
    var key = datastore.key(LOAD);
    var data = [];
	const new_load = {"weight": weight, "carrier": data, "content": content, "delivery_date": delivery_date};
	return datastore.save({"key":key, "data":new_load}).then(() => {return key});
}

function get_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    return datastore.get(key);
}

function get_loads(req){
    var q = datastore.createQuery(LOAD).limit(3);
    const results = {};
    var prev;
    if(Object.keys(req.query).includes("cursor")){
        console.log(req.query);
        prev = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + req.query.cursor;
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            console.log(entities);
            results.items = entities[0].map(ds.fromDatastore);
            if(typeof prev !== 'undefined'){
                results.previous = prev;
            }
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function put_load(id, weight){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const load = {"weight": weight};
    return datastore.save({"key":key, "data":load});
}

function delete_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    return datastore.delete(key);
}

// function stringifyExample(idValue, weightValue, contentValue, delivery_dateValue, selfUrl){ 
// 	return '{ "id": "' + idValue  + '", "weight": "' + weightValue + '", "content": "' + contentValue + '", "delivery_date": ' + delivery_dateValue + ', "self": "' + selfUrl + '"}'; 
// }

function stringifyExample(idValue, weightValue, boatValue, contentValue, delivery_dateValue, selfUrl){
    var entities = boatValue;
    var data = [];
    var boatUrl = "http://localhost:8080/boats/";  
    //entities.forEach((entity) => {data.push('{ "id": "' + entity + '", "self": "'+ boatUrl + entity + '"}')});
    return '{ "id": "' + idValue  + '", "weight": ' + weightValue + ', "carrier": [' + data + '], "content": "' + contentValue + '", "delivery_date": "' + delivery_dateValue + '", "self": "' + selfUrl + '"}'; 
}



// check request body function from: https://stackoverflow.com/questions/47502236/check-many-req-body-values-nodejs-api
function checkProps(obj, list) {
    if (typeof list === "string") {
        list = list.split("|");
    }
    for (prop of list) {
        let val = obj[prop];
        if (val === null || val === undefined) {
            return false;
        }
    }
    return true;
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function(req, res){
    const loads = get_loads(req)
	.then( (loads) => {
		var entities = loads.items;
		var data = [];
		entities.forEach((entity) => {data.push(stringifyExample(entity.id, entity.weight, entity.content, entity.delivery_date, req.protocol + '://' + req.get("host") + req.baseUrl + '/' + entity.id))});
        if (loads.next !== undefined) {
        	res.status(200).type('json').send('Status: 200 OK\n\n' + '[ ' + data + ', "next": '+ '"' + loads.next + '"' + ' ]');	
        } else {
        	res.status(200).type('json').send('Status: 200 OK\n\n' + '[ ' + data + ' ]');
        }
    });
});

router.get('/:id', function(req, res) {
	const load = get_load(req.params.id)
    .then( (load) => { 
    	try {
        	res.status(200).type('json').send('Status: 200 OK\n\n' + stringifyExample(req.params.id, load[0].weight, load[0].content, load[0].delivery_date, req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id))
    	} catch {
    		res.status(404).send('Status: 404 Not Found\n\n{\n "Error": "No load with this load_id exists" \n}');
    	}
    });   
});

router.post('/', function(req, res){
	if (!checkProps(req.body, "weight|content|delivery_date")) {
		res.status(400).send('Status: 400 Bad Request\n\n{\n "Error": "The request object is missing at least one of the required attributes" \n}');
	} else {
		post_load(req.body.weight, req.body.content, req.body.delivery_date)
	    .then( key => {
            var data = datastore.get(key);
            data.then(loadData => {
                res.status(201).type('json').send('Status: 201 Created\n\n' + stringifyExample(key.id, loadData[0].weight, loadData[0].carrier, loadData[0].content, loadData[0].delivery_date, req.protocol + '://' + req.get("host") + req.baseUrl))
            });
        });       	
	}    
});

router.put('/:id', function(req, res){
    put_load(req.params.id, req.body.weight)
    .then(res.status(200).end());
});

router.delete('/:id', function(req, res){
	const load = get_load(req.params.id)
    .then( (load) => { 
    	try {
    		const checkIfExists = load[0].weight;
        	delete_load(req.params.id).then(res.status(204).type('json').send('Status: 404 Bad Request { "Error": "The request object is missing at least one of the required attributes" }'));
    	} catch {
    		res.status(404).type('json').send('Status: 404 Not Found\n\n{\n "Error": "No load with this load_id exists" \n}');
    	}
    });  
});

/* ------------- End Controller Functions ------------- */

module.exports = router;