const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";
const LOAD = "Load";

router.use(bodyParser.json());



/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length){
    var key = datastore.key(BOAT);
    var data = [];
	const new_boat = {"name": name, "type": type, "length": length, "loads": data};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.get(key);
}

function get_boats(req){
    var q = datastore.createQuery(BOAT).limit(3);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function get_boat_loads(req, id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.get(key)
    .then( (boats) => {
        const boat = boats[0];
        const load_keys = boat.loads.map( (g_id) => {
            return datastore.key([LOAD, parseInt(g_id,10)]);
        });
        return datastore.get(load_keys);
    })
    .then((loads) => {
        loads = loads[0].map(ds.fromDatastore);
        return loads;
    });
}

function put_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    var data = [];
    const boat = {"name": name, "type": type, "length": length, "loads": data};
    return datastore.save({"key":key, "data":boat});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

function put_load(bid, lid){
    const l_key = datastore.key([BOAT, parseInt(bid,10)]);
    return datastore.get(l_key)
    .then( (boat) => {
        if( typeof(boat[0].loads) === 'undefined'){
            boat[0].loads = [];
        }
        
        var newArrs = boat[0].loads;

        if (newArrs.find(newArr => newArr === lid)) {
        	return -1;
        } else {
        	boat[0].loads.push(lid);
        	return datastore.save({"key":l_key, "data":boat[0]});
        }
    });

}

function stringifyExample(idValue, nameValue, typeValue, lengthValue, selfUrl){
	return '{ "id": "' + idValue  + '", "name": "' + nameValue + '", "type": "' + typeValue + '", "length": ' + lengthValue + ', "self": "' + selfUrl + '"}'; 
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
    const boats = get_boats(req)
	.then( (boats) => {
		var entities = boats.items;
		var data = [];
		entities.forEach((entity) => {data.push(stringifyExample(entity.id, entity.name, entity.type, entity.length, entity.loads, req.protocol + '://' + req.get("host") + req.baseUrl + '/' + entity.id))});
        if (boats.next !== undefined) {
        	res.status(200).type('json').send('Status: 200 OK\n\n' + '[ ' + data + ', "next": '+ '"' + boats.next + '"' + ' ]');	
        } else {
        	res.status(200).type('json').send('Status: 200 OK\n\n' + '[ ' + data + ' ]');
        }
        
    });
});

router.get('/:id', function(req, res) {
	const boat = get_boat(req.params.id)
    .then( (boat) => { 
    	try {
        	res.status(200).type('json').send('Status: 200 OK\n\n' + stringifyExample(req.params.id, boat[0].name, boat[0].type, boat[0].length, boat[0].loads, req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id))
    	} catch {
    		res.status(404).send('Status: 404 Not Found\n\n{\n "Error": "No boat with this boat_id exists" \n}');
    	}
    });   
});

router.get('/:id/loads', function(req, res){
    const boats = get_boat_loads(req, req.params.id)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.post('/', function(req, res){
	if (!checkProps(req.body, "name|type|length")) {
		res.status(400).send('Status: 400 Bad Request\n\n{\n "Error": "The request object is missing at least one of the required attributes" \n}');
	} else {
		post_boat(req.body.name, req.body.type, req.body.length)
	    .then( key => {
	    	var data = datastore.get(key);
	    	data.then(boatData => {
	    		res.status(201).type('json').send('Status: 201 Created\n\n' + stringifyExample(key.id, boatData[0].name, boatData[0].type, boatData[0].length, req.protocol + '://' + req.get("host") + req.baseUrl));	
	    	});
	    });	
	}    
});

router.put('/:id', function(req, res){
    put_boat(req.params.id, req.body.name, req.body.type, req.body.length)
    .then(res.status(200).end());
});


router.put('/:bid/loads/:lid', function(req, res){
    put_load(req.params.bid, req.params.lid)
    .then( key => {
    	if (key == -1) {
    		res.status(403).send('Status: 403 Bad Request\n\n{\n "Error": "This load already has an assigned boat" \n}');	
    	} else {
    		res.status(204).type('json').end();
    	}
    });
});

router.delete('/:id', function(req, res){

	const boat = get_boat(req.params.id)
    .then( (boat) => { 
    	try {
    		const checkIfExists = boat[0].name;
        	delete_boat(req.params.id).then(res.status(204).end());
    	} catch {
    		res.status(404).type('json').send('Status: 404 Not Found\n\n{\n "Error": "No boat with this boat_id exists" \n}');
    	}
    });  
    
});

/* ------------- End Controller Functions ------------- */

module.exports = router;