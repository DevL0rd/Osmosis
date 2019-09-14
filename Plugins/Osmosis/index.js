//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd
var io;
var log;
var serverSettings;
const readdirp = require('readdirp');
var fs = require('fs');
var DB = require('../../Devlord_modules/DB.js');
var world = {
    cells: {},
    cellTypes: { food: 1, player: 2 },
    travelSpeed: 50,
    speedDecreaseScalar: 0.1,
    globalFriction: 0.5,
    radiusScalar: 20,
    massDecay: 0.01,
    minMass: 20,
    playerSpawnSize: 120,
    forceCutOff: 0.05,
    width: 15000,
    height: 15000,
    foodCount: 0,
    maxFoodCount: 5000,
    foodSpawnSpeed: 100,
    foodSpawnAmount: 1,
    minFoodSize: 3,
    maxFoodSize: 7
};



var players = {};
var updatedCells = [];
var removedCells = [];
var then = Date.now();
var now = Date.now();
var delta = (now - then) / 1000;

function loopStart() {
    now = Date.now();
    delta = (now - then) / 1000;
}

function loopEnd() {
    then = now;
    elapsedTime = Date.now() - then;
    return elapsedTime;
}
function updateCells() {
    for (i in world.cells) {
        var cell = world.cells[i];
        //Server side only
        updateCell(cell);
    }
    resolveCollisions();
}
function updateCell(cell) {
    if (cell.type === world.cellTypes.player) {
        updateMass(cell);
        //set the forces on the cell to keep it moving;
        setForce(cell, cell.angle, cell.speed);
    }
    if (isMoving(cell)) {
        applyGlobalFriction(cell);
        applyForceCutoff(cell);
        updatePosition(cell);
    }
}

function foodTick() {
    var spawnCount = world.foodSpawnAmount;
    while (spawnCount > 0 && world.foodCount < world.maxFoodCount) {
        spawnRandomFoodCell();
        spawnCount--;
    }
}

function spawnRandomFoodCell() {
    var foodSize = getRandomInt(world.minFoodSize, world.maxFoodSize);
    var spawnPos = getRandomSpawn(foodSize);
    addCell(spawnPos.x, spawnPos.y, foodSize, "transparent");
    world.foodCount++;
}


function applyGlobalFriction(cell) {
    cell.force.x -= (cell.force.x * world.globalFriction) * delta;
    cell.force.y -= (cell.force.y * world.globalFriction) * delta;
}
function updatePosition(cell) {
    if (cell.force.x === 0 && cell.force.y === 0) return false;
    cell.position.x += cell.force.x * delta;
    cell.position.y += cell.force.y * delta;
    updatedCells.push(cell);
}
function applyForceCutoff(cell) {
    if (cell.force.x < world.forceCutOff && cell.force.x > -world.forceCutOff) cell.force.x = 0;
    if (cell.force.y < world.forceCutOff && cell.force.y > -world.forceCutOff) cell.force.y = 0;
}
function updateMass(cell) {
    if (cell.mass !== world.minMass) {
        var newMass = cell.mass - (cell.mass * world.massDecay) * delta;
        if (newMass < world.minMass) newMass = world.minMass;
        setMass(cell, newMass);
    }
}

function resolveCollisions() {
    var collidingCells = getCollidingCells();
    collidingCells.forEach(function (cellPair) {
        handleCellToCellCollision(cellPair);
    })
    var wallCollidingCells = getCellsCollidingWithWall();
    wallCollidingCells.forEach(function (cellCollisions) {
        handleCellToWallCollision(cellCollisions);
    })
}

function isMoving(cell) {
    return (cell.force.x !== 0 || cell.force.y !== 0);
}

function getCollidingCells() {
    var collidingCells = [];
    var keys = Object.keys(world.cells);
    for (iA in keys) {
        var cellA = world.cells[keys[iA]];
        //Check moving cells
        if (isMoving(cellA)) {
            //Against all cells
            for (iB in keys) {
                var cellB = world.cells[keys[iB]];
                //compare non matching cells, and exclude already checked cells, and do an AABB collision check for approximation.
                if (iA != iB) {
                    var collidingCellPair = detectCellToCellCollision(cellA, cellB);
                    if (collidingCellPair) {
                        collidingCells.push(collidingCellPair);
                    }
                }
            }
        }
    }
    return collidingCells;
}

function getCellsCollidingWithWall() {
    var collidingCells = [];
    for (i in world.cells) {
        var cell = world.cells[i];
        if (isMoving(cell)) {
            var cellCollision = detectCellToWallCollision(cell);
            if (cellCollision) {
                collidingCells.push(cellCollision);
            }
        }
    }
    return collidingCells;
}

function detectCellToCellCollision(cellA, cellB) {
    var radiusAdded = cellA.radius + cellB.radius;
    var collisionDepth = getDistanceBetweenCells(cellA, cellB);
    if (collisionDepth < radiusAdded) return { cellA: cellA, cellB: cellB, collisionDepth: collisionDepth };
    return false;
}

function detectCellToWallCollision(cell) {
    var collisonAxi = [];
    if (cell.position.x <= cell.radius || cell.position.x >= world.width - cell.radius) {
        var collisionDepth = 0;
        if (cell.position.x <= cell.radius) {
            collisionDepth = cell.position.x - cell.radius;
        } else {
            collisionDepth = cell.position.x - world.width + cell.radius;
        }
        collisonAxi.push({
            cell: cell,
            axis: "x",
            collisionDepth: collisionDepth
        });
    }
    if (cell.position.y <= cell.radius || cell.position.y >= world.height - cell.radius) {
        var collisionDepth = 0;
        if (cell.position.y <= cell.radius) {
            collisionDepth = cell.position.y - cell.radius;
        } else {
            collisionDepth = cell.position.y - world.height + cell.radius;
        }
        collisonAxi.push({
            cell: cell,
            axis: "y",
            collisionDepth: collisionDepth
        });
    }
    return collisonAxi;
}

function handleCellToCellCollision(cellPair) {
    if (cellPair.cellA.mass > cellPair.cellB.mass && cellPair.cellA.type === world.cellTypes.player) {
        //if cell is halfway over the target cell.

        var eatDepth = cellPair.cellA.radius + cellPair.cellB.radius / 2;
        if (getDistanceBetweenCells(cellPair.cellA, cellPair.cellB) <= eatDepth) {
            addMass(cellPair.cellA, cellPair.cellB.mass);
            cellPair.cellB.mass = 0; //prevent double mass gain
            removeCell(cellPair.cellB);
        }
    } else if (cellPair.cellB.type === world.cellTypes.player) {
        //if cell is halfway over the target cell.
        var eatDepth = cellPair.cellA.radius / 2 + cellPair.cellB.radius;
        if (getDistanceBetweenCells(cellPair.cellA, cellPair.cellB) <= eatDepth) {
            addMass(cellPair.cellB, cellPair.cellA.mass);
            cellPair.cellA.mass = 0; //prevent double mass gain
            removeCell(cellPair.cellA);
        }
    }
}

function handleCellToWallCollision(cellCollisions) {
    for (i in cellCollisions) {
        var cellCollision = cellCollisions[i];
        cellCollision.cell.position[cellCollision.axis] -= cellCollision.collisionDepth;
    }
}
function addCell(x, y, mass, color, type = world.cellTypes.food, socket) {
    var nCell = {};
    nCell.type = type;
    nCell.position = {
        x: x,
        y: y
    };
    nCell.lastPosition = Object.assign(nCell.position, {});
    nCell.force = {
        x: 0,
        y: 0
    };
    nCell.angle = 0;
    nCell.graphics = {
        color: color
    };
    setMass(nCell, mass);
    nCell.id = generateId();
    if (socket) {
        nCell.playerId = socket.playerId;
        if (!players[socket.playerId]) {
            players[socket.playerId] = { cells: {} };
        }
        //addplayer cell to list
        players[socket.playerId].cells[nCell.id] = true;
        if (socket.profilePicture != "/img/profilePics/noprofilepic.jpg") {
            nCell.graphics.texture = socket.profilePicture;
        }
        nCell.name = socket.username;
    }
    world.cells[nCell.id] = nCell;
    updatedCells.push(nCell);
    return nCell;
}

function removeCell(cell) {
    if (cell.type === world.cellTypes.food) {
        world.foodCount--;
    } else if (cell.type === world.cellTypes.player) {
        if (players[cell.playerId] && players[cell.playerId].cells[cell.id]) {
            var playerCells = getAllPlayerCells(cell.playerId);
            var largestCell = getLargestCell(playerCells);
            players[cell.playerId].focusedCellId = largestCell.id;
            sendPlayersCells(cell.playerId);
            sendPlayerFocusedCell(cell.playerId);
            delete players[cell.playerId].cells[cell.id];
        }
    }
    removedCells.push(cell);
    delete world.cells[cell.id];
}

function splitCells(cells) {
    for (i in cells) {
        var cell = cells[i];
        splitCell(cell);
    }
}

function splitCell(cell) {
    var newCellMass = cell.mass / 2;
    if (newCellMass >= world.minMass) {
        setMass(cell, newCellMass);
        var spawnPos = findNewPoint(cell.position, cell.angle, (cell.radius * 2) + 5);
        if (players[cell.playerId]) {
            var nCell = addCell(spawnPos.x, spawnPos.y, newCellMass, cell.graphics.color, world.cellTypes.player, players[cell.playerId].socket);
        } else {
            var nCell = addCell(spawnPos.x, spawnPos.y, newCellMass, cell.graphics.color, world.cellTypes.player);
        }
        nCell.angle = cell.angle;
        setForce(nCell, nCell.angle, cell.speed + 50);
    }
}

function removePlayer(playerId) {
    var pCells = getAllPlayerCells(playerId);
    for (i in pCells) {
        var cell = pCells[i];
        removeCell(cell);
    }
    delete players[playerId];
}

function playerOnMouseMove(playerId, mousePos) {
    var pCells = getAllPlayerCells(playerId);
    for (i in pCells) {
        var cell = pCells[i];
        //set the angle of each cell to follow the mouse
        cell.angle = getAngle(cell.position, mousePos);
    }
}

function playerOnSplit(playerId) {
    var pCells = getAllPlayerCells(playerId);
    //split all of players cells
    splitCells(pCells);
}

function sendPlayersCells(playerId) {
    players[playerId].socket.emit("getPlayersCellIds", players[playerId].cells);
}
function sendPlayerFocusedCell(playerId) {
    players[playerId].socket.emit("getFocusedCellId", players[playerId].focusedCellId);
}

function spawnPlayer(socket) {
    var spawnPos = getRandomSpawn(50);
    socket.playerId = generateId();
    var playerCell = addCell(spawnPos.x, spawnPos.y, world.playerSpawnSize, "blue", world.cellTypes.player, socket);
    players[socket.playerId].socket = socket;
    players[socket.playerId].focusedCellId = playerCell.id;
    sendPlayerFocusedCell(playerCell.playerId);
    sendPlayersCells(playerCell.playerId);
    log("Player '" + socket.username + "' has spawned!", false, "Osmosis");
    return playerCell;
}


function testCellCollision(testCell) {
    for (i in world.cells) {
        var cell = world.cells[i];
        var collidingCellPair = detectCellToCellCollision(testCell, cell);
        if (collidingCellPair) {
            return true;
        }
    }
    return false;
}

function getRandomSpawn(radius) {
    while (true) {
        var rX = getRandomInt(radius, world.width - radius);
        var rY = getRandomInt(radius, world.height - radius);
        var testCell = { position: { x: rX, y: rY }, radius: radius };
        if (!testCellCollision(testCell)) {
            return {
                x: rX,
                y: rY
            };
        }
    }
}

function getAllPlayerCells(playerId) {
    var playerCells = [];
    if (players[playerId]) {
        for (cId in players[playerId].cells) {
            playerCells.push(world.cells[cId]);
        }
    }
    return playerCells;
}

function getLargestCell(cells) {
    var largestCell;
    for (i in cells) {
        var cell = cells[i];
        if (!largestCell) largestCell = cell;
        if (cell.mass > largestCell.mass) {
            largestCell = cell;
        }
    }
    return largestCell;
}

function getDistanceBetweenCells(cellA, cellB) {
    return getDistance(cellA.position, cellB.position);
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

function setForceVector(cell, forceVector) {
    cell.force.x = forceVector.x;
    cell.force.y = forceVector.y;
}

function addForceVector(cell, forceVector) {
    cell.force.x += forceVector.x;
    cell.force.y += forceVector.y;
}

function setForce(cell, angle, speed) {
    var fv = getForceVector(angle, speed);
    setForceVector(cell, fv);
}

function addForce(cell, angle, speed) {
    var fv = getForceVector(angle, speed);
    addForceVector(cell, fv);
}

function addMass(cell, mass) {
    setMass(cell, cell.mass + mass);
}

function setMass(cell, mass) {
    cell.mass = mass;
    cell.radius = Math.sqrt(cell.mass * world.radiusScalar);
    cell.speed = (world.travelSpeed / Math.sqrt(mass * world.speedDecreaseScalar)) * world.travelSpeed;
}

function generateId() {
    var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
}

function gameLoop() {
    loopStart();
    foodTick();
    updateCells();
    //send updates to client
    io.emit("worldUpdate", { updatedCells: updatedCells, removedCells: removedCells });
    updatedCells = [];
    removedCells = [];
    var elapsedTime = loopEnd();
    //console.log(elapsedTime);

    //keep updates to client steady
    setTimeout(gameLoop, 40);
}

function fillWorldWithFood() {
    log("Filling world with food...", false, "Osmosis");
    while (world.foodCount < world.maxFoodCount) {
        spawnRandomFoodCell();
    }
    log("Food spawning complete!", false, "Osmosis");
}

function init(plugins, servSettings, events, serverio, serverLog, commands) {
    io = serverio;
    log = serverLog;
    serverSettings = servSettings;

    log("Starting game engine...", false, "Osmosis");
    loadSkins();
    loadThemes();
    fillWorldWithFood();
    gameLoop();
    log("Engine running!", false, "Osmosis");

    events.on("connection", function (socket) {
        socket.emit("worldData", world);
        socket.on("disconnect", function () {
            //make sure user is playing
            if (socket.playerId) {
                removePlayer(socket.playerId);
            }
        });
        socket.on("mouseMove", function (mousePos) {
            //validate input and make sure user is playing
            if (socket.playerId && mousePos && mousePos.y && mousePos.x) {
                playerOnMouseMove(socket.playerId, mousePos);
            }
        });
        socket.on("split", function () {
            //make sure user is playing
            if (socket.playerId) {
                playerOnSplit(socket.playerId);
            }
        });
        socket.on("spawn", function () {
            var playerCell = spawnPlayer(socket);
        });
        socket.on("getSkins", function () {
            socket.emit("getSkins", skinUrls);
        });
        socket.on("getThemes", function () {
            socket.emit("getThemes", Themes);
        });

    });
    commands.reloadThemes = {
        usage: "reloadThemes",
        help: "Reloads the themes for osmosis.",
        do: function (args, fullMessage) {
            loadThemes();
        }
    }
    commands.reloadSkins = {
        usage: "reloadSkins",
        help: "Reloads the skins for osmosis.",
        do: function (args, fullMessage) {
            loadSkins();
        }
    }
}
var Themes = {};
function loadThemes() {
    log("Loading themes...", false, "Osmosis");
    var ThemesPath = __dirname + "/Themes.json";
    if (fs.existsSync(ThemesPath)) {
        Themes = DB.load(ThemesPath);
    } else {
        Themes = {
            "Osmosis": {
                "cellBorderTexture": { "src": "/img/themes/Osmosis/seemlessWater.jpg" },
                "foodBorderTexture": { "src": "/img/themes/Osmosis/seemlessSpace.jpg" }
            }
        }
        DB.save(ThemesPath, Themes);
        log("Themes file not found, generating dafults...", false, "Osmosis");
    }
    io.emit("getThemes", Themes);
    log("Themes loaded!", false, "Osmosis");
}
var skinUrls = [];
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


module.exports.init = init;