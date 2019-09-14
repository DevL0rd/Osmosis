var world = {};
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
    //Server side only
    //resolveCollisions();
}

function isMoving(cell) {
    return (cell.force.x !== 0 || cell.force.y !== 0);
}
function updateCell(cell) {
    if (cell.type === world.cellTypes.player) {
        //Server side only
        //updateMass(cell);
        var dist = (cell.distToMouse - cell.radius);
        if (dist > 1) {
            //set the forces on the cell to keep it moving;
            applyGlobalFriction(cell);
            var dSpeedScalar = (dist / 200);
            if (dSpeedScalar > 2) dSpeedScalar = 2;
            // if (dSpeedScalar < 1) dSpeedScalar = 1;
            var nSpeed = cell.speed * dSpeedScalar;
        } else {
            var nSpeed = 0;
        }
        setForce(cell, cell.angle, nSpeed);
    }
    if (isMoving(cell) || cell.type === world.cellTypes.player) {
        if (cell.type != world.cellTypes.player) {
            applyGlobalFriction(cell);
        }
        applyForceCutoff(cell);
        updatePosition(cell);
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
function getAllPlayerCells() {
    var playerCells = [];
    for (i in playersCells) {
        if (world.cells[playersCells[i]]) {
            playerCells.push(world.cells[playersCells[i]]);
        }
    }
    return playerCells;
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