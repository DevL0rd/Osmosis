//Authour: Dustin Harris
//GitHub: https://github.com/DevL0rd

var world = {
    cells: {},
    globalFriction: 0.5,
    radiusScalar: 0.3,
    massDecay: 0.01,
    minMass: 10,
    playerSpawnSize: 50,
    minSpeedScalar: 0.99,
    forceCutOff: 0.05,
    width: 500,
    height: 500,
    foodCount: 0,
    maxFoodCount: 25,
    foodSpawnSpeed: 1000,
    foodSpawnAmount: 5,
    minFoodSize: 3,
    maxFoodSize: 10
}
var players = {};
var then = Date.now();
var now = Date.now();
var delta = (now - then) / 1000;

function loopStart() {
    now = Date.now();
    delta = (now - then) / 1000;
}

function loopEnd() {
    then = now;
}

function updateWorld() {
    for (i in world.cells) {
        var cell = world.cells[i];
        updateforce(cell);
        updatePosition(cell);
        //Server side only
        if (cell.type == "player") {
            updateMass(cell);
        }
    }
    resolveCollisions();
}

function foodTick() {
    var spawnCount = world.foodSpawnAmount;
    while (spawnCount > 0 && world.foodCount < world.maxFoodCount) {
        spawnRandomFoodCell()
        spawnCount--;
    }
}

function spawnRandomFoodCell() {
    var foodSize = getRandomInt(world.minFoodSize, world.maxFoodSize);
    var spawnPos = getRandomSpawn(foodSize);
    addCell(spawnPos.x, spawnPos.y, foodSize);
    world.foodCount++;
}

setInterval(foodTick, world.foodSpawnSpeed);

function updateforce(cell) {
    cell.force.x -= (cell.force.x * world.globalFriction) * delta;
    cell.force.y -= (cell.force.y * world.globalFriction) * delta;
    if (cell.force.x < world.forceCutOff && cell.force.x > -world.forceCutOff) cell.force.x = 0;
    if (cell.force.y < world.forceCutOff && cell.force.y > -world.forceCutOff) cell.force.y = 0;
    if (cell.type == "player") {
        var fv = getForceVector(cell.angle, cell.speed);
        cell.force.x = fv.x;
        cell.force.y = fv.y;
    }
}

function updatePosition(cell) {
    if (cell.force.x == 0 && cell.force.y == 0) return false;
    cell.position.x += cell.force.x * delta;
    cell.position.y += cell.force.y * delta;
}

function updateMass(cell) {
    if (cell.mass != world.minMass) {
        var newMass = cell.mass - (cell.mass * world.massDecay) * delta;
        if (newMass < world.minMass) newMass = world.minMass;
        changeMass(cell, newMass);
    }
}

function addMass(cell, mass) {
    changeMass(cell, cell.mass + mass);
}

function changeMass(cell, mass) {
    cell.mass = mass;
    cell.radius = cell.mass * world.radiusScalar;
    //TODO fix
    cell.speed = 100 - (mass * 0.1);
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

function getCollidingCells() {
    var collidingCells = [];
    var keys = Object.keys(world.cells);
    for (iA in keys) {
        var cellA = world.cells[keys[iA]]
        //check against all cells
        for (iB in keys) {
            var cellB = world.cells[keys[iB]];
            //compare only moving cells, and uncompared cells.
            if (iB > iA && (cellA.force.x != 0 || cellA.force.y != 0 || cellB.force.x != 0 || cellB.force.y != 0)) {
                var collidingCellPair = detectCellToCellCollision(cellA, cellB);
                if (collidingCellPair) {
                    collidingCells.push(collidingCellPair);
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
        //get only moving cells
        if (cell.force.x != 0 || cell.force.y != 0) {
            var cellCollision = detectCellToWallCollision(cell);
            if (cellCollision) {
                collidingCells.push(cellCollision);
            }
        }
    }
    return collidingCells;
}

function detectCellToCellCollision(cellA, cellB) {
    var radiusAdded = cellA.radius + cellB.radius
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
    if (cellPair.cellA.mass > cellPair.cellB.mass) {
        //if cell is halfway over the target cell.
        if (getDistanceBetweenCells(cellPair.cellA, cellPair.cellB) >= cellPair.cellB.radius) {
            addMass(cellPair.cellA, cellPair.cellB.mass);
            removeCell(cellPair.cellB);
        }
    } else {
        //if cell is halfway over the target cell.
        if (getDistanceBetweenCells(cellPair.cellA, cellPair.cellB) >= cellPair.cellA.radius) {
            addMass(cellPair.cellB, cellPair.cellA.mass);
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

function addCell(x, y, mass, type = "food", playerId) {
    var nCell = {};
    nCell.type = type;
    nCell.position = {
        x: x,
        y: y
    }
    nCell.lastPosition = Object.assign(nCell.position, {});
    nCell.force = {
        x: 0,
        y: 0
    }
    nCell.angle = 0;
    nCell.graphics = {
        color: "rgb(0,255,255)"
    };
    changeMass(nCell, mass);
    nCell.id = generateId();
    if (playerId) {
        nCell.playerId = playerId;
        if (!players[playerId]) {
            players[playerId] = { cells: {} };
        }
        //addplayer cell to list
        players[playerId].cells[nCell.id] = true;
    }
    world.cells[nCell.id] = nCell;
    return nCell;
}

function removeCell(cell) {
    if (cell.type == "food") {
        world.foodCount--;
    } else if (cell.type == "player") {
        if (players[cell.playerId] && players[cell.playerId].cells[cell.id]) {
            var playerCells = getAllPlayerCells(cell.playerId);
            var largestCell = getLargestCell(playerCells);
            var socket = players[cell.playerId].socket;
            socket.focusedCellId = largestCell.id;
            socket.emit("getFocusedCellId", largestCell.id);
            delete players[cell.playerId].cells[cell.id];
        }
    }
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
        changeMass(cell, newCellMass);
        var spawnPos = findNewPoint(cell.position.x, cell.position.y, cell.angle, (cell.radius * 2) + 5);
        var nCell = addCell(spawnPos.x, spawnPos.y, newCellMass, "player", cell.playerId);
        nCell.angle = cell.angle;
        var fv = getForceVector(nCell.angle, cell.speed + 50);
        nCell.force.x += fv.x;
        nCell.force.y += fv.y;
        nCell.graphics.color = "purple";
    }
}

function getRandomSpawn(size) {
    var rX = getRandomInt(size, world.width - size);
    var rY = getRandomInt(size, world.height - size);
    return {
        x: rX,
        y: rY
    };
    //TODO prevent spawning inside of something.
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
    var largestCell
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

function getForceVector(angle, velocity) {
    return {
        x: velocity * Math.cos(angle * Math.PI / 180),
        y: velocity * Math.sin(angle * Math.PI / 180)
    };
}

function getVelocityOfVector(forceVector) {
    return Math.sqrt(Math.pow(forceVector.x, 2) + Math.pow(forceVector.y, 2));
}

function getDistance(pos1, pos2) {
    var a = pos1.x - pos2.x;
    var b = pos1.y - pos2.y;
    return Math.sqrt(a * a + b * b);
}

function getAngle(pos1, pos2) {
    return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
}

function findNewPoint(x, y, angle, distance) {
    var result = {};
    result.x = Math.round(Math.cos(angle * Math.PI / 180) * distance + x);
    result.y = Math.round(Math.sin(angle * Math.PI / 180) * distance + y);
    return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId() {
    var timestamp = (new Date().getTime() / 1000 | 0).toString(16);
    return timestamp + 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        return (Math.random() * 16 | 0).toString(16);
    }).toLowerCase();
}

function init(plugins, settings, events, io, log, commands) {
    setInterval(function () {
        loopStart();
        updateWorld();
        //send updates to client
        io.emit("worldUpdate", world);
        loopEnd();
    }, 40)
    events.on("connection", function (socket) {
        socket.emit("worldData", world);
        var spawnPos = getRandomSpawn(50);
        socket.playerId = generateId();
        var playerCell = addCell(spawnPos.x, spawnPos.y, world.playerSpawnSize, "player", socket.playerId);
        socket.focusedCellId = playerCell.id;
        socket.emit("getFocusedCellId", socket.focusedCellId);
        players[socket.playerId].socket = socket;
        socket.emit("getPlayersCellIds", players[socket.playerId].cells);
        socket.on("disconnect", function () {
            if (socket.playerId && players[socket.playerId]) {
                for (i in players[socket.playerId].cells) {
                    if (world.cells[i]) {
                        var cell = world.cells[i];
                        removeCell(cell);
                    }
                }
                delete players[socket.playerId];
            }
        });
        socket.on("mouseMove", function (mousePos) {
            if (socket.playerId) {
                var pCells = getAllPlayerCells(socket.playerId);
                for (i in pCells) {
                    var cell = pCells[i];
                    cell.angle = getAngle(cell.position, mousePos);
                }
            }
        });
        socket.on("spaceDown", function () {
            if (socket.playerId) {
                var pCells = getAllPlayerCells(socket.playerId);
                splitCells(pCells);
            }
        });
    });
}
module.exports.init = init