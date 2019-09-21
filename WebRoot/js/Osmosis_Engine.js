//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var isServer = (typeof window === 'undefined'); //detect if in browser
if (isServer) {
    //Server specific inits
    var io;
    var log;
    var serverSettings;
    var readdirp = require('readdirp');
    var fs = require('fs');
    var DB = require('../../Devlord_modules/DB.js');
    var Themes = {};
    var skinUrls = [];
    //****SPECIAL obj TRACKERS****
    var players = {};
    var attractors = {};
    var updatedObjs = [];
    var removedObjs = [];
    var foodCount = 0;
    var blackHoleCount = 0;
    var slowTickInterval
} else {
    //Client specific inits
    var pid;
    var playersObjs = {};
    var isPlaying = true;

}
var isRunning = true;
var scoreBoard = [];

//***WORLD DATA STORAGE***
var world = {
    objs: {},
    width: 25000,
    height: 25000,
    playerSpawnSize: 120,
    minMass: 50,
    spitMass: 16,
    spitSpeed: 500,
    maxFoodCount: 5000,
    foodSpawnAmount: 1,
    minFoodSize: 3,
    maxFoodSize: 7,
    maxBlackHoleCount: 3,
    blackHoleSpawnSize: 20,
    blackHoleMinSpawnSpeed: 30,
    blackHoleMaxSpawnSpeed: 50,
    blackHoleExplosionMass: 1000,
    blackHoleMassSuckScalar: 0.005,
    detonationPieces: 30,
    speedDecreaseScalar: 0.9,
    radiusScalar: 20,
    massDecay: 0.01,
    mergeDelayScalar: 60,
    acceleration: 25,
    globalFriction: 0.8,
    forceCutOff: 1,
    objTypes: { food: 1, player: 2, blackhole: 3 },
    attractorAttractionDistance: 300,
    slowTickSpeed: 500
};


//***DELTA CALCULATIONS***
var then = Date.now(); //Init time vars
var now = Date.now(); //Init time vars
var delta = (now - then) / 1000; //Set initial delta
function loopStart() { //Record loop start time and calc new delta
    now = Date.now();
    //Measure new delta
    delta = (now - then) / 1000;
}
function loopEnd() { //Record loop end time and get elapsed time
    then = now;
    elapsedTime = Date.now() - then;
    return elapsedTime;
}



//***GAME LOOP***
function gameLoop() {
    loopStart(); //Track start time, and get new delta.
    updateobjs(); //Update all objs
    if (isServer) {
        spawnTick(); //spawn food and blackholes etc.. when needed
        sendUpdatesToClients(); //send updates to clients
    }
    var elapsedTime = loopEnd(); //Track end time, and get elapsed time.
    //console.log(elapsedTime);

    if (isRunning) {
        if (isServer) {
            setTimeout(gameLoop, 40);
        } else {
            setTimeout(gameLoop, 20); //Do game loop again in 20ms.
        }
    }
}


//***GAME LOOP FUNCTIONS***/
function updateobjs() { //Update every obj.
    for (i in world.objs) {
        var obj = world.objs[i];
        updateobj(obj);
    }
}
function spawnTick() { //spawn food and blackholes etc.. when needed
    var spawnCount = world.foodSpawnAmount; //Track how many that needs to be spawned
    while (spawnCount && foodCount < world.maxFoodCount) {
        spawnRandomFoodobj(); //Spawn a food obj somewhere random
        spawnCount--; //Decrement the ammount that needs to be spawned.
    }
    if (blackHoleCount < world.maxBlackHoleCount) { //Spawn black hole if not enough of them are spawned
        spawnRandomBlackHole();
    }
}
function sendUpdatesToClients() { //Server side only
    io.emit("worldUpdate", { updatedObjs: updatedObjs, removedObjs: removedObjs });  //Send every client the updates
    updatedObjs = []; //Clear update queue
    removedObjs = []; //Clear update queue
}
function updateobj(obj) {
    if (obj.type === world.objTypes.player) { //Update player specific data for obj
        if (isServer) {
            applyMassDecay(obj);
            updateMergeTime(obj);
        }
        calculateMouseMovement(obj);
    }
    //Make objs attract to attractors
    if (isServer) {
        updateAttractorForces(obj);
    }
    if (!obj.isStatic && isMoving(obj)) { //Only update moving objs positions and friction.
        if (!obj.ignoreGlobalFriction) {
            applyGlobalFriction(obj); //Apply friction to objs that don't ignore it.
        }
        applyForceCutoff(obj); //Remove force from objects moving too slowly to notice.
        updatePosition(obj);  //Move obj according to force applied
    }
}


//***updateobj FUNCTIONS***
function updateMergeTime(obj) { //keeps track of when the player obj can merge with itself
    var mNow = Date.now();
    if (obj.mergeTime <= mNow) {
        obj.canMerge = true;
    } else {
        obj.canMerge = false;
    }
}
function calculateMouseMovement(obj) { //Player movement calculations based on mouse position
    dist = (obj.distToMouse - obj.radius); //Get distance to mouse from obj wall
    if (dist > 1) {
        //set the forces on the obj to keep it moving;
        applyGlobalFriction(obj);
        var dSpeedScalar = (dist / 300);
        if (dSpeedScalar > 1.5) dSpeedScalar = 1.5;
        var acell = world.acceleration * dSpeedScalar;
    } else {
        var acell = 0;
    }
    addForce(obj, obj.angle, acell);
    // console.log(velocity + "-" + obj.speed);
    // var velocity = getVelocityOfVector(obj.force) | 1;
    // var acobj = Math.min(velocity, dist);

    // addForce(obj, obj.angle, acobj);
}
function updateAttractorForces(obj) {
    if (!obj.isAttractor) { //don't attract other attractors
        for (i in attractors) { //Update the forces on the current obj with every attractor
            var attractor = attractors[i];
            var distToAttractorSurface = getDistanceBetweenObjs(attractor, obj) - attractor.radius;
            if (distToAttractorSurface <= world.attractorAttractionDistance) { //If objs is within attractor range pull them
                var angleToAttractor = getAngle(attractor.position, obj.position); //Get angle to attractor
                var acceleration = -((1 - distToAttractorSurface / world.attractorAttractionDistance) * 100); //Calculate acceleration based on distance
                addForce(obj, angleToAttractor, acceleration); //Add the force to the obj
            }
        }
    }
}
function applyMassDecay(obj) { //Decay the mass of the obj
    if (obj.mass !== world.minMass) { //If not too small already, remove mass based on mass loss rate
        var newMass = obj.mass - (obj.mass * world.massDecay) * delta;
        if (newMass < world.minMass) newMass = world.minMass;
        setMass(obj, newMass); //Set the new mass of the obj
    }
}
function updatePosition(obj) { //Move obj according to force applied
    obj.position.x += obj.force.x * delta; //Apply force multiplied by delta to x. Keeps the movement stable in case of lagg.
    obj.position.y += obj.force.y * delta; //Apply force multiplied by delta to y.
    if (isServer) {
        detectAndResolveCollisions(obj); //Resolve any collisions as a result of the new position
        updatedObjs.push(obj); //Flag objs as updated
    } else {
        // var zRad = (obj.radius * canvasZoom);
        // if (obj.position.x + zRad + canvasTranslation.x > 0 && obj.position.x - zRad + canvasTranslation.x < window.innerWidth / canvasZoom) {
        //     if (obj.position.y + canvasTranslation.y > 0 && obj.position.y + canvasTranslation.y < + window.innerHeight / canvasZoom) {
        //         detectAndResolveCollisions(obj); //Resolve any collisions as a result of the new position
        //     }
        // }
    }
}



//***COLLISION DETECTION ***/
function detectAndResolveCollisions(obj) {
    var objPairs = getCollidingObjects(obj); //Get any collisions with this obj. Comes in pairs
    // EG:
    // objPairs => [
    //     [objA, objB],
    //     [objA, objB2],
    //     [objA, objB3],
    //     etc...
    // ]
    if (objPairs) { //If there are colliding objs
        for (i in objPairs) {
            var oPair = objPairs[i];
            // oPair => [objA, objB]
            engineEvents.trigger("collision", oPair);
        }
    }
    var objWallCollisions = detectobjToWallCollision(obj); //Get any collisions with the wall
    //EG:
    //objWallCollisions => {
    //  [obj: obj, axis: "x", collisionDepth: collisionDepth, 
    //  obj: obj, axis: "y", collisionDepth: collisionDepth]
    //}
    if (objWallCollisions) {
        handleobjToWallCollision(objWallCollisions);
    }
}


function getCollidingObjects(objA) {
    var collidingobjs = [];
    //Against all objs
    for (objId in world.objs) {
        var objB = world.objs[objId];
        //compare non matching objs, and exclude already checked objs.
        if (objA.id != objB.id) { //don't check against self
            if (isServer) {
                var collidingobjPair = detectCircleToCircleCollision(objA, objB); //check for collision between circles
                if (collidingobjPair) { //if collisions
                    objA.isColliding = true; //flag it as colliding
                    collidingobjs.push(collidingobjPair); //add to collision list
                }
            }
        }
    }
    return collidingobjs;
}
function detectCircleToCircleCollision(objA, objB) { //check for collision between circles
    var radiusAdded = objA.radius + objB.radius;
    var collisionDepth = getDistanceBetweenObjs(objA, objB); //If distance is less than radius added together a collision is occuring
    if (collisionDepth < radiusAdded) return { objA: objA, objB: objB, collisionDepth: collisionDepth };
    return false;
}
function detectobjToWallCollision(obj) { //check for collision of the wall
    var collisonAxi = [];
    if (obj.position.x <= obj.radius || obj.position.x >= world.width - obj.radius) { //Is object colling with wall on x axis
        var collisionDepth = 0;
        if (obj.position.x <= obj.radius) { //Calculate collision depth
            collisionDepth = obj.position.x - obj.radius;
        } else {
            collisionDepth = obj.position.x - world.width + obj.radius;
        }
        collisonAxi.push({
            obj: obj,
            axis: "x",
            collisionDepth: collisionDepth
        }); //Register collision on x axis
    }
    if (obj.position.y <= obj.radius || obj.position.y >= world.height - obj.radius) { //Is object colling with wall on y axis
        var collisionDepth = 0;
        if (obj.position.y <= obj.radius) { //Calculate collision depth
            collisionDepth = obj.position.y - obj.radius;
        } else {
            collisionDepth = obj.position.y - world.height + obj.radius;
        }
        collisonAxi.push({
            obj: obj,
            axis: "y",
            collisionDepth: collisionDepth
        }); //Register collision on y axis
    }
    return collisonAxi;
}
function resolveCircles(c1, c2, transferForce = true) { //Fix colliding circles
    let distance_x = c1.position.x - c2.position.x;
    let distance_y = c1.position.y - c2.position.y;
    let radii_sum = c1.radius + c2.radius;
    let distance = getDistanceBetweenObjs(c1, c2);
    let unit_x = distance_x / distance;
    let unit_y = distance_y / distance;

    c1.position.x = c2.position.x + (radii_sum) * unit_x; //Uncollide
    c1.position.y = c2.position.y + (radii_sum) * unit_y; //Uncollide
    if (transferForce) { //Transfer force from collision
        var massSum = c1.mass + c2.mass;
        var newVelX1 = (c1.force.x * (c1.mass - c2.mass) + (2 * c2.mass * c2.force.x)) / massSum;
        var newVelY1 = (c1.force.y * (c1.mass - c2.mass) + (2 * c2.mass * c2.force.y)) / massSum;
        var newVelX2 = (c2.force.x * (c2.mass - c1.mass) + (2 * c1.mass * c1.force.x)) / massSum;
        var newVelY2 = (c2.force.y * (c2.mass - c1.mass) + (2 * c1.mass * c1.force.y)) / massSum;
        c1.force.x = newVelX1;
        c1.force.y = newVelY1;
        c2.force.x = newVelX2;
        c2.force.y = newVelY2;
    }
}
function handleobjToWallCollision(objCollisions) { //Correct a wall collision
    for (i in objCollisions) { //Loop through collisions
        var objCollision = objCollisions[i];
        objCollision.obj.position[objCollision.axis] -= objCollision.collisionDepth; //Uncollide
        if (objCollision.obj.type === world.objTypes.player) { //Remove forces on axis collision with wall
            objCollision.obj.force[objCollision.axis] = 0;
        } else {
            objCollision.obj.force[objCollision.axis] = -objCollision.obj.force[objCollision.axis];
        }
    }
}
function spawnPlayer(socket) { //Spawn and intialize player vars
    var spawnPos = getRandomSpawn(world.playerSpawnSize); //Get random spawn without collisions
    var playerObj = addObj(spawnPos.x, spawnPos.y, world.playerSpawnSize, "blue", world.objTypes.player, socket); //Spawn player obj, pass socket along for setup
    players[socket.playerId].socket = socket; //Track player cells in special cell tracking
    sendPlayerObjs(playerObj.playerId); //Tell client about about all player cells
    log("Player '" + socket.username + "' has spawned!", false, "Osmosis");
    socket.isPlaying = true; //Flag the socket as playing
    return playerObj;
}
function sendPlayerObjs(playerId) { //sends all the current player objs to player
    players[playerId].socket.emit("getPlayersObjIds", players[playerId].objs);
}

function spawnRandomFoodobj() {
    var foodSize = getRandomInt(world.minFoodSize, world.maxFoodSize); //Randomize food size 
    var spawnPos = getRandomSpawn(foodSize); //Get new spawn point without colliding
    addObj(spawnPos.x, spawnPos.y, foodSize, "transparent"); //Adding 
    foodCount++;
}
function spawnRandomBlackHole() { //Spawn a random black hole
    var spawnPos = getRandomSpawn(world.blackHoleSpawnSize); //Get new spawn point without colliding
    addObj(spawnPos.x, spawnPos.y, world.blackHoleSpawnSize, "black", world.objTypes.blackhole); //Add blackhole to world
    blackHoleCount++;   //Keep track of blackholes
}
function addObj(x, y, mass, color, type = world.objTypes.food, socket) {
    var nObj = {};
    //Setup new object
    nObj.id = generateId();
    nObj.type = type;
    nObj.position = {
        x: x,
        y: y
    };
    nObj.force = {
        x: 0,
        y: 0
    };
    nObj.angle = 0;
    nObj.mergeTime = 0;
    nObj.isStatic = false;
    nObj.ignoreGlobalFriction = false;
    nObj.canMerge = false;
    nObj.isColliding = false;
    nObj.isAttractor = false;
    nObj.graphics = {
        color: color
    };
    nObj.radius = 1; //Initialize mass so it can animate to spawn size
    setMass(nObj, mass); //Set initial spawn mass
    if (socket) { //Pass socket data to object like player id etc
        nObj.playerId = socket.playerId;
        if (!players[socket.playerId]) {
            players[socket.playerId] = { objs: {} };
        }
        //addplayer obj to list
        players[socket.playerId].objs[nObj.id] = true;
        nObj.graphics.texture = socket.profilePicture;
        nObj.name = socket.username;
        nObj.distToMouse = 0;
    }
    if (nObj.type == world.objTypes.blackhole) { //Black hole specific setup
        nObj.isAttractor = true; //Flag as attractor
        nObj.ignoreGlobalFriction = true; //prevent blackhole from slowing down
        attractors[nObj.id] = nObj; //Add it to the attractors list
        setForce(nObj, getRandomAngle(), getRandomInt(world.blackHoleMinSpawnSpeed, world.blackHoleMaxSpawnSpeed)); //Give a random force to blackhole
    }
    world.objs[nObj.id] = nObj;//Put object in world
    updatedObjs.push(nObj); //Keep track of updated objects
    return nObj;
}

function removeobj(obj) {
    if (obj.type === world.objTypes.player) {
        var pid = obj.playerId;
        if (players[pid] && players[pid].objs[obj.id]) {
            delete players[pid].objs[obj.id]; //Remove player from player list
            //Update cell tracking for client
            sendPlayerObjs(pid);
            if (!Object.keys(players[pid].objs).length) {//If no more cells exist for player, emit death event
                players[pid].socket.emit("playerDied");
                players[pid].socket.isPlaying = false;
            }
        }
    } else if (obj.type === world.objTypes.blackhole) {
        blackHoleCount--; //Keep track of blackhole count
    } else if (obj.type === world.objTypes.food) {
        foodCount--; //Keep track of food count
    }
    if (attractors[obj.id]) {
        delete attractors[obj.id];
    }
    removedObjs.push(obj);
    delete world.objs[obj.id];

}
function detonateObj(obj) {
    var newMass = obj.mass / world.detonationPieces;
    var newPieces = world.detonationPieces;
    var spawnDist = obj.radius;
    while (newPieces) {
        var newAngle = getRandomAngle();
        var spawnPos = findNewPoint(obj.position, newAngle, spawnDist);
        // var newSpawnFound = false;
        // while (!newSpawnFound) {
        //     var spawnPos = findNewPoint(obj.position, getRandomAngle(), spawnDist);
        //     newSpawnFound = !testobjCollision({ position: { x: rX, y: rY }, radius: radius });
        // }
        var nFoodobj = addObj(spawnPos.x, spawnPos.y, newMass, "transparent");
        setForce(nFoodobj, newAngle, 200);
        newPieces--;
    }
    removeobj(obj);
}
function splitobjs(objs) {
    for (i in objs) {
        var obj = objs[i];
        splitobj(obj);
    }
}

function splitobj(obj) {
    var newobjMass = obj.mass / 2;
    if (newobjMass >= world.minMass) {
        setMass(obj, newobjMass);
        var spawnPos = findNewPoint(obj.position, obj.angle, (obj.radius * 2) + 1);
        if (players[obj.playerId]) {
            var nObj = addObj(spawnPos.x, spawnPos.y, newobjMass, obj.graphics.color, world.objTypes.player, players[obj.playerId].socket);
            nObj.mergeTime = Date.now() + (obj.mass * world.mergeDelayScalar);
            obj.mergeTime = Date.now() + (obj.mass * world.mergeDelayScalar);
            sendPlayerObjs(obj.playerId);
        } else {
            var nObj = addObj(spawnPos.x, spawnPos.y, newobjMass, obj.graphics.color, world.objTypes.player);
        }
        nObj.angle = getAngle(nObj.position, obj.mousePos);
        addForce(nObj, nObj.angle, world.spitSpeed + getVelocityOfVector(obj.force));

    }
}

function spitobjs(objs) {
    for (i in objs) {
        var obj = objs[i];
        spitobj(obj);
    }
}

function spitobj(obj) {
    var newobjMass = obj.mass - world.spitMass;
    if (newobjMass >= world.minMass) {
        setMass(obj, newobjMass);
        var spawnPos = findNewPoint(obj.position, obj.angle, obj.radius + Math.sqrt(world.spitMass * world.radiusScalar) + 10);
        var nObj = addObj(spawnPos.x, spawnPos.y, world.spitMass, "transparent", world.objTypes.food);
        addForce(nObj, obj.angle, world.spitSpeed + getVelocityOfVector(obj.force));
    }
}

function removePlayer(playerId) {
    var pobjs = getAllPlayerObjs(playerId);
    for (i in pobjs) {
        var obj = pobjs[i];
        removeobj(obj);
    }
    delete players[playerId];
}

function playerOnMouseMove(playerId, mPos) {
    var pobjs = getAllPlayerObjs(playerId);
    for (i in pobjs) {
        var obj = pobjs[i];
        //set the angle of each obj to follow the mouse
        obj.angle = getAngle(obj.position, mPos);
        obj.mousePos = mPos;
        obj.distToMouse = getDistance(obj.position, mPos);
    }
}

function playerOnSplit(playerId) {
    var pobjs = getAllPlayerObjs(playerId);
    //split all of players objs
    splitobjs(pobjs);
}

function playerOnSpit(playerId) {
    var pobjs = getAllPlayerObjs(playerId);
    //split all of players objs
    spitobjs(pobjs);
}

function getAllPlayerObjs(playerId) {
    var pobjs = [];
    if (players[playerId]) {
        for (cId in players[playerId].objs) {
            pobjs.push(world.objs[cId]);
        }
    }
    return pobjs;
}

function getLargestobj(objs) {
    var largestobj;
    for (i in objs) {
        var obj = objs[i];
        if (!largestobj) largestobj = obj;
        if (obj.mass > largestobj.mass) {
            largestobj = obj;
        }
    }
    return largestobj;
}

function getDistanceBetweenObjs(objA, objB) {
    return getDistance(objA.position, objB.position);
}
function getDistance(pos1, pos2) {
    var a = pos1.x - pos2.x;
    var b = pos1.y - pos2.y;
    return Math.sqrt(a * a + b * b);
}

function getAngle(pos1, pos2) {
    return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
}

function findNewPoint(pos, angle, distance) {
    var result = {};
    result.x = Math.round(Math.cos(angle * Math.PI / 180) * distance + pos.x);
    result.y = Math.round(Math.sin(angle * Math.PI / 180) * distance + pos.y);
    return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getForceVector(angle, velocity) {
    return {
        x: velocity * Math.cos(angle * Math.PI / 180),
        y: velocity * Math.sin(angle * Math.PI / 180)
    };
}

function getVelocityOfVector(forceVector) {
    return Math.sqrt(Math.pow(forceVector.x, 2) + Math.pow(forceVector.y, 2));
}

function setForceVector(obj, forceVector) {
    obj.force.x = forceVector.x;
    obj.force.y = forceVector.y;
}

function addForceVector(obj, forceVector) {
    obj.force.x += forceVector.x;
    obj.force.y += forceVector.y;
}

function setForce(obj, angle, speed) {
    var fv = getForceVector(angle, speed);
    setForceVector(obj, fv);
}

function addForce(obj, angle, speed) {
    var fv = getForceVector(angle, speed);
    addForceVector(obj, fv);
}

function addMass(obj, mass) {
    setMass(obj, obj.mass + mass);
}
function takeMass(obj, mass) {
    setMass(obj, obj.mass - mass);
}
function setMass(obj, mass) {
    obj.mass = mass;
    obj.lastRadius = obj.radius;
    obj.radius = Math.sqrt(obj.mass * world.radiusScalar);

    if (isServer) {
        updatedObjs.push(obj);
    }
}
function applyGlobalFriction(obj) {
    obj.force.x -= (obj.force.x * world.globalFriction) * delta;
    obj.force.y -= (obj.force.y * world.globalFriction) * delta;
}
function applyForceCutoff(obj) {
    if (getVelocityOfVector(obj.force) < world.forceCutOff) {
        setForceVector(obj, { x: 0, y: 0 });
    }
}
function isMoving(obj) {
    return (obj.force.x !== 0 || obj.force.y !== 0);
}

function getRandomAngle() {
    return getRandomInt(1, 360) - 180;
}
function testobjCollision(testobj) {
    for (i in world.objs) {
        var obj = world.objs[i];
        var collidingobjPair = detectCircleToCircleCollision(testobj, obj);
        if (collidingobjPair) {
            return true;
        }
    }
    return false;
}
function getRandomSpawn(radius) {
    while (true) {
        var rX = getRandomInt(radius, world.width - radius);
        var rY = getRandomInt(radius, world.height - radius);
        var testobj = { position: { x: rX, y: rY }, radius: radius };
        if (!testobjCollision(testobj)) {
            return {
                x: rX,
                y: rY
            };
        }
    }
}

function generateId() {
    var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
}
function fillWorldWithFood() {
    log("Filling world with food...", false, "Osmosis");
    while (foodCount < world.maxFoodCount) {
        spawnRandomFoodobj();
    }
    log("Food spawning complete!", false, "Osmosis");
}
function slowTick() {
    calcNewScoreboard();
}
function calcNewScoreboard() {
    scoreBoard = [];
    for (pid in players) {
        if (players[pid].socket.isPlaying) {
            var totalMass = 0;
            var pCells = []
            for (objId in players[pid].objs) {
                totalMass += world.objs[objId].mass;
                pCells.push(world.objs[objId])
            }
            var followCell = getLargestobj(pCells) | { id: 0 };
            scoreBoard.push({ username: players[pid].socket.username, playerObjs: players[pid].objs, score: Math.round(totalMass) });
        }
    }
    scoreBoard.sort((a, b) => (a.score < b.score) ? 1 : -1);
    io.emit("getScoreboard", scoreBoard);
}

function init(plugins, servSettings, events, serverio, serverLog, commands) {
    io = serverio;
    log = serverLog;
    serverSettings = servSettings;
    function loadThemes() {
        log("Loading themes...", false, "Osmosis");
        var ThemesPath = __dirname + "/Themes.json";
        if (fs.existsSync(ThemesPath)) {
            Themes = DB.load(ThemesPath);
        } else {
            Themes = {
                "Osmosis": {
                    "cellBorderTexture": {
                        "src": "/img/themes/Osmosis/seemlessRainbow.jpg"
                    },
                    "foodBorderTexture": {
                        "src": "/img/themes/Osmosis/seemlessWater.jpg"
                    },
                    "blackHoleBorderTexture": {
                        "src": "/img/themes/Osmosis/seemlessSpace.jpg"
                    },
                    "bubbleBorderTexture": {
                        "src": "/img/themes/Osmosis/seemlessRainbow.jpg"
                    }
                }
            }
            DB.save(ThemesPath, Themes);
            log("Themes file not found, generating dafults...", false, "Osmosis");
        }
        io.emit("getThemes", Themes);
        log("Themes loaded!", false, "Osmosis");
    }
    function loadSkins() {
        log("Loading skins...", false, "Osmosis");
        skinUrls = [];
        readdirp(serverSettings.webRoot + "/img/skins/", {
            type: 'files',
            fileFilter: ['*.png'],
            directoryFilter: ['!.git'],
            depth: 2
        }).on('data', (fileInfo) => {
            skinUrls.push("./img/skins/" + fileInfo.path);
        }).on('end', () => {
            io.emit("getSkins", skinUrls);
            log("Skins loaded! Found " + skinUrls.length + " skins.", false, "Osmosis");
        });
    }
    log("Starting game engine...", false, "Osmosis");
    loadSkins();
    loadThemes();
    fillWorldWithFood();
    gameLoop();
    log("Engine running!", false, "Osmosis");
    slowTickInterval = setInterval(slowTick, world.slowTickSpeed);
    events.on("connection", function (socket) {
        socket.playerId = generateId();
        socket.isPlaying = false;
        socket.emit("getPlayerId", socket.playerId); //Tell client their player id
        socket.emit("worldData", world);

        socket.on("disconnect", function () {
            //make sure user is playing
            if (socket.playerId) {
                removePlayer(socket.playerId);
            }
        });
        socket.on("mouseMove", function (mousePos) {
            //validate input and make sure user is playing
            if (socket.isPlaying && mousePos && mousePos.y && mousePos.x) {
                playerOnMouseMove(socket.playerId, mousePos);
            }
        });
        socket.on("split", function () {
            //make sure user is playing
            if (socket.isPlaying) {
                playerOnSplit(socket.playerId);
            }
        });
        socket.on("spit", function () {
            //make sure user is playing
            if (socket.isPlaying) {
                playerOnSpit(socket.playerId);
            }
        });

        socket.on("spawn", function () {
            var playerobj = spawnPlayer(socket);
        });
        socket.on("getSkins", function () {
            socket.emit("getSkins", skinUrls);
        });
        socket.on("getThemes", function () {
            socket.emit("getThemes", Themes);
        });

    }, "Osmosis");
    commands.reloadthemes = {
        usage: "reloadThemes",
        help: "Reloads the themes for osmosis.",
        do: function (args, fullMessage) {
            loadThemes();
        }
    }
    commands.reloadskins = {
        usage: "reloadSkins",
        help: "Reloads the skins for osmosis.",
        do: function (args, fullMessage) {
            loadSkins();
        }
    }
}



var engineEvents = {
    "collision": [],
    "on": function (event, callback) {
        if (this[event] && event != "trigger" && event != "on" && event != "addEvent") {
            this[event].push(callback);
        } else {
            log("Event '" + event + "' is not found.", true, "Server");
        }
    },
    "addEvent": function (event) {
        if (!this[event] && event != "trigger" && event != "on" && event != "addEvent") {
            this[event] = [];
        } else {
            log("Event '" + event + "' already exists.", true, "Server");
        }
    },
    "trigger": function (event, params = null) {
        if (this[event] && event != "trigger" && event != "on" && event != "addEvent") {
            for (i in this[event]) {
                this[event][i](params);
            }
        } else {
            log("Event '" + event + "' is not found.", true, "Server");
        }
    }
};

//***GAME LOGIC ***/
engineEvents.on("collision", function (objPair) {
    //eat the smaller obj
    if (objPair.objA.type === world.objTypes.food && objPair.objB.type === world.objTypes.food) {
        resolveCircles(objPair.objA, objPair.objB); //resolve collision and transfer force
        return;
    }
    if (objPair.objA.type == world.objTypes.player && objPair.objB.type == world.objTypes.player && objPair.objA.playerID == objPair.objB.playerID && (!objPair.objA.canMerge || !objPair.objB.canMerge)) {
        resolveCircles(objPair.objA, objPair.objB, false); //Resolve collision and disable force transfer
        return;
    }
    if (isServer) { //Server Side Only
        if (objPair.objA.mass > objPair.objB.mass) {
            var bigObj = objPair.objA
            var smallObj = objPair.objB
        } else {
            var bigObj = objPair.objB
            var smallObj = objPair.objA
        }
        if (bigObj.type === world.objTypes.player) {
            if (smallObj.type === world.objTypes.blackhole) {
                var massToTake = bigObj.mass * world.blackHoleMassSuckScalar;
                takeMass(bigObj, massToTake);
            } else {
                //if obj is halfway over the target obj.
                var eatDepth = bigObj.radius + objPair.objB.radius / 2;
                if (getDistanceBetweenObjs(bigObj, objPair.objB) <= eatDepth) {
                    eatCell(bigObj, smallObj);
                }
            }
        } else if (bigObj.type === world.objTypes.blackhole) {
            var eatDepth = bigObj.radius + smallObj.radius / 2;
            if (getDistanceBetweenObjs(bigObj, smallObj) <= eatDepth) {
                eatCell(bigObj, smallObj);
            }
            if (bigObj.mass > world.blackHoleExplosionMass) {
                detonateObj(bigObj)
            }
        }
    }
});
function eatCell(cellA, preyCell) {
    addMass(cellA, preyCell.mass);
    preyCell.mass = 0; //prevent double mass gain
    removeobj(preyCell);
}
function uninit(events, io, log, commands) {
    isRunning = false;
    //disconnect all sockets
    var sockets = Object.values(io.of("/").connected);
    for (var socketId in sockets) {
        var socket = sockets[socketId];
        socket.disconnect(true);
    }
    clearInterval(slowTickInterval);
    delete commands.reloadThemes;
    delete commands.reloadSkins;
}
if (isServer) {
    module.exports.init = init;
    module.exports.uninit = uninit;
} else {
    //***CLIENT CODE***/
    socket.on("worldData", function (worldData) {
        world = worldData;
        gameLoop();
    });
    socket.on("worldUpdate", function (worldData) {
        for (i in worldData.updatedObjs) {
            var uObj = worldData.updatedObjs[i];
            world.objs[uObj.id] = uObj;
        }
        for (i in worldData.removedObjs) {
            var rObj = worldData.removedObjs[i];
            delete world.objs[rObj.id];
        }
    });

    socket.on("getPlayersObjIds", function (nPlayersObjs) {
        playersObjs = nPlayersObjs;
    });
    socket.on("getPlayerId", function (nPid) {
        pid = nPid;
    })
    var mousePos = {
        x: 0,
        y: 0
    };
    var mousePosRelative
    function trackMouseMove(event) {
        console.log(event)
        if (canvasTranslation && canvasZoom) {
            mousePos = {
                x: event.clientX / canvasZoom,
                y: event.clientY / canvasZoom
            }
            mousePosRelative = {
                x: mousePos.x - canvasTranslation.x,
                y: mousePos.y - canvasTranslation.y
            };
        }
    }
    window.onmousemove = trackMouseMove;
    setInterval(function () {
        if (isPlaying) {
            mousePosRelative = {
                x: mousePos.x - canvasTranslation.x,
                y: mousePos.y - canvasTranslation.y
            };
            socket.emit("mouseMove", mousePosRelative);
        }
    }, 40);
    var pressedKeys = {};
    window.onkeydown = keyDown;
    window.onkeyup = keyUp;
    function keyDown(event) {
        var keyCode = event.which || event.keyCode;
        if (!pressedKeys[keyCode]) {
            pressedKeys[keyCode] = true;
            if (keyCode == 32) { //space
                socket.emit("split");
            } else if (keyCode == 87) {
                socket.emit("spit");
            }
        }
    }
    function keyUp(event) {
        var keyCode = event.which || event.keyCode;
        if (pressedKeys[keyCode]) {
            pressedKeys[keyCode] = false;
        }
    }

}