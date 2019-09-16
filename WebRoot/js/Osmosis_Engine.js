var world = {};
var pid;
var focusedCellId;
var playersCells = {};
var isPlaying = true;
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
        updateCell(cell);
    }
    //resolveCollisions();
}

function isMoving(cell) {
    return (cell.force.x !== 0 || cell.force.y !== 0);
}
function updateCell(cell) {
    if (cell.type === world.cellTypes.player) {
        //updateMass(cell); //Server side only
        calculateNewCellForces(cell);
        //updateMergeTime(cell); //Server side only
    }
    if (isMoving(cell) || cell.type === world.cellTypes.player) {
        if (cell.type != world.cellTypes.player) {
            applyGlobalFriction(cell);
        }
        applyForceCutoff(cell);
        updatePosition(cell);
    }
}
function calculateNewCellForces(cell) {
    var dist = (cell.distToMouse - cell.radius);
    if (!cell.isColliding) {
        if (dist > 1) {
            //set the forces on the cell to keep it moving;
            applyGlobalFriction(cell);
            var dSpeedScalar = (dist / 200);
            if (dSpeedScalar > 1.5) dSpeedScalar = 1.5;
            // if (dSpeedScalar < 1) dSpeedScalar = 1;
            var nSpeed = cell.speed * dSpeedScalar;
        } else {
            var nSpeed = 0;
        }
        setForce(cell, cell.angle, nSpeed);
    }
}
function applyGlobalFriction(cell) {
    if (cell.type === world.cellTypes.player) {
        var defaultSpeed = (world.travelSpeed / Math.sqrt(cell.mass * world.speedDecreaseScalar)) * world.travelSpeed;
        if (cell.speed < defaultSpeed) {
            cell.speed = defaultSpeed;
        } else {
            cell.speed -= (cell.speed * world.globalFriction) * delta;
        }
    } else {
        cell.force.x -= (cell.force.x * world.globalFriction) * delta;
        cell.force.y -= (cell.force.y * world.globalFriction) * delta;
    }
}

function applyForceCutoff(cell) {
    if (cell.force.x < world.forceCutOff && cell.force.x > -world.forceCutOff) cell.force.x = 0;
    if (cell.force.y < world.forceCutOff && cell.force.y > -world.forceCutOff) cell.force.y = 0;
}

function updatePosition(cell) {
    cell.position.x += cell.force.x * delta;
    cell.position.y += cell.force.y * delta;
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
        var cellA = world.cells[keys[iA]];
        cellA.isColliding = false;
        //Check moving cells
        if (isMoving(cellA)) {
            //Against all cells
            for (iB in keys) {
                var cellB = world.cells[keys[iB]];
                //compare non matching cells, and exclude already checked cells.
                var is
                if (iA != iB) {
                    var collidingCellPair = detectCellToCellCollision(cellA, cellB);
                    if (collidingCellPair) {
                        cellA.isColliding = true;
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
    if ((cellPair.cellA.canMerge && cellPair.cellB.canMerge) || ((cellPair.cellA.type === world.cellTypes.player || cellPair.cellB.type === world.cellTypes.player) && (cellPair.cellA.type === world.cellTypes.food || cellPair.cellB.type === world.cellTypes.food))) {
        //eat the smaller cell
        if (cellPair.cellA.mass > cellPair.cellB.mass && cellPair.cellA.type === world.cellTypes.player) {
            //if cell is halfway over the target cell.
            var eatDepth = cellPair.cellA.radius + cellPair.cellB.radius / 2;
            if (getDistanceBetweenCells(cellPair.cellA, cellPair.cellB) <= eatDepth) {
                //addMass(cellPair.cellA, cellPair.cellB.mass); //Server Side Only
                cellPair.cellB.mass = 0; //prevent double mass gain
                //removeCell(cellPair.cellB); //Server Side Only
            }
        } else if (cellPair.cellB.type === world.cellTypes.player) {
            //if cell is halfway over the target cell.
            var eatDepth = cellPair.cellA.radius / 2 + cellPair.cellB.radius;
            if (getDistanceBetweenCells(cellPair.cellA, cellPair.cellB) <= eatDepth) {
                //addMass(cellPair.cellB, cellPair.cellA.mass); //Server Side Only
                //prevent double mass gain
                cellPair.cellA.mass = 0;
                //removeCell(cellPair.cellA); //Server Side Only
            }
        }
    } else {
        //resolve circles
        resolveCircles(cellPair.cellA, cellPair.cellB);
        cellPair.cellA.justCollided = true;
        cellPair.cellB.justCollided = true;
    }
}
function resolveCircles(c1, c2) {
    let distance_x = c1.position.x - c2.position.x;
    let distance_y = c1.position.y - c2.position.y;
    let radii_sum = c1.radius + c2.radius;
    let length = getDistanceBetweenCells(c1, c2);
    let unit_x = distance_x / length;
    let unit_y = distance_y / length;
    c1.position.x = c2.position.x + (radii_sum) * unit_x;
    c1.position.y = c2.position.y + (radii_sum) * unit_y;
    var massSum = c1.mass + c2.mass;
    if (c1.mass > c2.mass) {
        var newVelX1 = (c1.force.x * (c1.mass - c2.mass) + (2 * c2.mass * c2.force.x)) / massSum;
        var newVelY1 = (c1.force.y * (c1.mass - c2.mass) + (2 * c2.mass * c2.force.y)) / massSum;
        c1.force.x = newVelX1;
        c1.force.y = newVelY1;
    } else {
        var newVelX2 = (c2.force.x * (c2.mass - c1.mass) + (2 * c1.mass * c1.force.x)) / massSum;
        var newVelY2 = (c2.force.y * (c2.mass - c1.mass) + (2 * c1.mass * c1.force.y)) / massSum;
        c2.force.x = newVelX2;
        c2.force.y = newVelY2;
    }
}

function handleCellToWallCollision(cellCollisions) {
    for (i in cellCollisions) {
        var cellCollision = cellCollisions[i];
        cellCollision.cell.position[cellCollision.axis] -= cellCollision.collisionDepth;
    }
}
function getAllPlayerCells() {
    var playerCells = [];
    for (i in playersCells) {
        if (world.cells[playersCells[i]]) {
            playerCells.push(world.cells[playersCells[i]]);
        }
    }
    return playerCells;
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
function gameLoop() {
    loopStart();
    updateCells();
    var elapsedTime = loopEnd();
    //console.log(elapsedTime);
    setTimeout(gameLoop, 10);
}

socket.on("worldData", function (worldData) {
    world = worldData;
    gameLoop();
});

socket.on("worldUpdate", function (worldData) {
    for (i in worldData.updatedCells) {
        var uCell = worldData.updatedCells[i];
        world.cells[uCell.id] = uCell;
    }
    for (i in worldData.removedCells) {
        var rCell = worldData.removedCells[i];
        delete world.cells[rCell.id];
    }
});

socket.on("getFocusedCellId", function (cellId) {
    focusedCellId = cellId;
});

socket.on("getPlayersCellIds", function (nPlayersCells) {
    playersCells = nPlayersCells;
});
socket.on("getPlayerId", function (nPid) {
    pid = nPid;
})
var mousePos = {
    x: 0,
    y: 0
};
var mousePosRelative
var mouseMoved = false;
window.onmousemove = trackMouseMove;

function trackMouseMove(event) {
    mousePos = {
        x: event.clientX,
        y: event.clientY
    }
}

setInterval(function () {
    if (isPlaying) {
        mousePosRelative = {
            x: mousePos.x - canvasTranslation.x,
            y: mousePos.y - canvasTranslation.y
        };
        socket.emit("mouseMove", mousePosRelative);
    }
}, 20);

var pressedKeys = {};
window.onkeydown = keyDown;
window.onkeyup = keyUp;

function keyDown(event) {
    var keyCode = event.which || event.keyCode;
    if (!pressedKeys[keyCode]) {
        pressedKeys[keyCode] = true;
        if (keyCode == 32) { //space
            socket.emit("split");
        }
    }
}

function keyUp(event) {
    var keyCode = event.which || event.keyCode;
    if (pressedKeys[keyCode]) {
        pressedKeys[keyCode] = false;
    }
}