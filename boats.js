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
	const new_boat = {"name": name, "type": type, "length": length};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.get(key);
}

// function get_boats(req){
//     var q = datastore.createQuery(BOAT).limit(3);
//     const results = {};
//     if(Object.keys(req.query).includes("cursor")){
//         q = q.start(req.query.cursor);
//     }
// 	return datastore.runQuery(q).then( (entities) => {
//             results.items = entities[0].map(ds.fromDatastore);
//             if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
//                 results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
//             }
// 			return results;
// 		});
// }

function get_boats(){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
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

function patch_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.upsert({"key":key, "data":boat});
}

function put_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
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

function unique_boat(req, prop) {
	var boats = get_boats(req);
	return boats
	.then( (boats) => {
		var data = [];
		boats.forEach((entity) => {data.push(entity.name)});
		return data;})
		.then((data) => {
			if (data.find(boatName => boatName === prop)) {
        	return false;
        } else {
        	return true;
        }	
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

function fromDatastore(item){
    item.id = item[datastore.KEY].id;
    return item;
}

function checkIfInt(input) {
	if (Number.isInteger(input)) {
		return true;
	} else {
		return false;
	}
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function(req, res){
    const lodgings = get_boats()
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/:id', function(req, res) {
	const boat = get_boat(req.params.id)
    .then( (boat) => {
	    const accepts = req.accepts(['application/json', 'text/html']);
	    if (!accepts) {
	    	res.status(406).send('Not Acceptable');
	    } else if (accepts === 'application/json') {
	    	try {
	        	res.status(200).type('json').send('Status: 200 OK\n\n' + stringifyExample(req.params.id, boat[0].name, boat[0].type, boat[0].length, req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id))
	    	} catch {
	    		res.status(404).send('Status: 404 Not Found\n\n{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
	    } else if (accepts === 'text/html') {
	    	try {
	        	res.status(200).type('json').send(json2html('Status: 200 OK\n\n' + stringifyExample(req.params.id, boat[0].name, boat[0].type, boat[0].length, req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id)).slice(1,-1));
	    	} catch {
	    		res.status(404).send('Status: 404 Not Found\n\n{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
	    } else {
	    	res.status(500).send("Bad Content type");
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
	unique_boat(req, req.body.name).then(function(results){
		if (req.get('content-type') !== 'application/json') {
			res.status(406).type('json').send('{\n "Error": "Server only accepts application/json data." \n}');
		} else if (!checkProps(req.body, "name|type|length")) {
			res.status(400).type('json').send('{\n "Error": "The request object is missing at least one of the required attributes" \n}');
		} else if (!results) {
			res.status(403).type('json').send('{\n "Error": "Boat name must be unique." \n}');
		} else if (!checkIfInt(req.body.length)){
			res.status(400).type('json').send('{\n "Error": "Length must be a number." \n}');
		} else {
			post_boat(req.body.name, req.body.type, req.body.length)
		    .then( key => {
		    	var data = datastore.get(key);
		    	data.then(boatData => {
		    		res.status(201).type('json').send(stringifyExample(key.id, boatData[0].name, boatData[0].type, boatData[0].length, req.protocol + '://' + req.get("host") + req.baseUrl + "/" + key.id));	
		    	});
		    });	
		} 	
	});   
});

router.patch('/:id', function(req, res){
	if (!checkProps(req.body, "name")) {
		const boat = get_boat(req.params.id).then((boat) => {
			try {
			patch_boat(req.params.id, boat[0].name, req.body.type, req.body.length)
    		.then(res.status(200).end());
    		} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
		});
	} else if (!checkProps(req.body, "type")) {
		const boat = get_boat(req.params.id).then((boat) => {
			try {
			patch_boat(req.params.id, req.body.name, boat[0].type, req.body.length)
    		.then(res.status(200).end());
    		} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
		});
	} else if (!checkProps(req.body, "length")) {
		const boat = get_boat(req.params.id).then((boat) => {
			try {
			patch_boat(req.params.id, req.body.name, req.body.type, boat[0].length)
    		.then(res.status(200).end());
    		} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
		});
	} else if (!checkProps(req.body, "name|type")) {
		const boat = get_boat(req.params.id).then((boat) => {
			try {
			patch_boat(req.params.id, boat[0].name, boat[0].type, req.body.length)
    		.then(res.status(200).end());
    		} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
		});
	} else if (!checkProps(req.body, "name|length")) {
		const boat = get_boat(req.params.id).then((boat) => {
			try {
			patch_boat(req.params.id, boat[0].name, req.body.type, boat[0].length)
    		.then(res.status(200).end());
    		} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
		});
	} else if (!checkProps(req.body, "type|length")) {
		const boat = get_boat(req.params.id).then((boat) => {
			try {
			patch_boat(req.params.id, req.body.name, boat[0].type, boat[0].length)
    		.then(res.status(200).end());
    		} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
		});
	} else {
		try {
		patch_boat(req.params.id, req.body.name, req.body.type, req.body.length)
    	.then(res.status(200).end());
    	} catch {
	    		res.status(404).send('{\n "Error": "No boat with this boat_id exists" \n}');
	    	}
	}
});


router.put('/:id', function(req, res){
	unique_boat(req, req.body.name).then(function(results){
		if (!results) {
			res.status(403).type('json').send('{\n "Error": "Boat name must be unique." \n}');
		} else {
			put_boat(req.params.id, req.body.name, req.body.type, req.body.length)
	    	.then(res.status(303).end());
		}
	    
    });
});

router.put('/', function(req, res){

	res.status(405).type('json').send('{\n "Error": "Cannot edit entire list of boats" \n}');
    
});

router.put('/:bid/loads/:lid', function(req, res){
    put_load(req.params.bid, req.params.lid)
    .then( key => {
    	if (key == -1) {
    		res.status(403).send('{\n "Error": "This load already has an assigned boat" \n}');	
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
    		res.status(404).type('json').send('{\n "Error": "No boat with this boat_id exists" \n}');
    	}
    });  
    
});

router.delete('/', function(req, res){

	res.status(405).type('json').send('{\n "Error": "Cannot delete entire list of boats" \n}');
    
});

/* ------------- End Controller Functions ------------- */

module.exports = router;