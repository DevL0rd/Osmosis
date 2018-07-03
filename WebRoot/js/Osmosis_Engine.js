var world = {};
var focusedCellId;
var isPlaying = true;
var then = Date.now();
var now = Date.now();
var delta = (now - then) / 1000;
var camerPos = {
    x: 0,
    y: 0
}
function loopStart() {
    now = Date.now();
    delta = (now - then) / 1000;
}

function loopEnd() {
    then = now;
}

function updatePosition(cell) {
    if (cell.force.x == 0 && cell.force.y == 0) return false;
    cell.lastPosition = cell.position;
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

function update() {
    for (i in world.cells) {
        var cell = world.cells[i];
        updatePosition(cell);
        updateforce(cell);
    }
};
socket.on("worldData", function (worldData) {
    world = worldData;
    setInterval(function () {
        loopStart();
        update();
        loopEnd();
    }, 16)
});
socket.on("worldUpdate", function (worldData) {
    world = worldData;
});
socket.on("getFocusedCellId", function (cellId) {
    focusedCellId = cellId;
});
var travelAngle = 0;
var mousePos;
function getAngle(pos1, pos2) {
    return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
}
window.onmousemove = trackMouseMove;
function trackMouseMove(event) {
    mousePos = {
        x: event.clientX,
        y: event.clientY
    };
    if (isPlaying && focusedCellId && world.cells[focusedCellId]) {
        socket.emit("mouseMove", { angle: getAngle({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, mousePos) });
    }
}
window.onkeydown = keyDown;
window.onkeyup = keyUp;
var pressedKeys = {};

function keyDown(event) {
    var keyCode = event.which || event.keyCode;
    if (!pressedKeys[keyCode]) {
        pressedKeys[keyCode] = true;
        if (keyCode == 32) { //space
            socket.emit("spaceDown");
        }
    }
}
function keyUp(event) {
    var keyCode = event.which || event.keyCode;
    if (pressedKeys[keyCode]) {
        pressedKeys[keyCode] = false;
        if (keyCode == 32) { //space
            socket.emit("spaceUp");
        }
    }
}