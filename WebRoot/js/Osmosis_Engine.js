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
function updateCell(cell) {
    applyGlobalFriction(cell);
    applyForceCutoff(cell);
    updatePosition(cell);
}

function applyGlobalFriction(cell) {
    cell.force.x -= (cell.force.x * world.globalFriction) * delta;
    cell.force.y -= (cell.force.y * world.globalFriction) * delta;
}

function applyForceCutoff(cell) {
    if (cell.force.x < world.forceCutOff && cell.force.x > -world.forceCutOff) cell.force.x = 0;
    if (cell.force.y < world.forceCutOff && cell.force.y > -world.forceCutOff) cell.force.y = 0;
}

function updatePosition(cell) {
    if (cell.force.x == 0 && cell.force.y == 0) return false;
    cell.position.x += cell.force.x * delta;
    cell.position.y += cell.force.y * delta;
}
function playerOnMouseMove(mPos) {
    var pCells = getAllPlayerCells();
    for (i in pCells) {
        var cell = pCells[i];
        //set the angle of each cell to follow the mouse
        cell.angle = getAngle(cell.position, mPos);
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
function getAngle(pos1, pos2) {
    return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
}
function gameLoop() {
    loopStart();
    updateCells();
    var elapsedTime = loopEnd();
    //console.log(elapsedTime);
    setTimeout(gameLoop, 16);
}

socket.on("worldData", function (worldData) {
    world = worldData;
    gameLoop();
    socket.emit("spawn");
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

var mousePos;
var mouseMoved = false;
window.onmousemove = trackMouseMove;

function trackMouseMove(event) {
    mousePos = {
        x: event.clientX - canvasTranslation.x,
        y: event.clientY - canvasTranslation.y
    };
    playerOnMouseMove(mousePos);
    mouseMoved = true;
}

setInterval(function () {
    if (isPlaying && mouseMoved) {
        socket.emit("mouseMove", mousePos);
        mouseMoved = false;
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
        }
    }
}

function keyUp(event) {
    var keyCode = event.which || event.keyCode;
    if (pressedKeys[keyCode]) {
        pressedKeys[keyCode] = false;
    }
}