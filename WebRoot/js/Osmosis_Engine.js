var world = {};
var focusedCellId;
var playersCells = {};
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
function resolveCollisions() {
    // var collidingCells = getCollidingCells();
    // collidingCells.forEach(function (cellPair) {
    //     handleCellToCellCollision(cellPair);
    // })
    var wallCollidingCells = getCellsCollidingWithWall();
    wallCollidingCells.forEach(function (cellCollisions) {
        handleCellToWallCollision(cellCollisions);
    })
}
function handleCellToWallCollision(cellCollisions) {
    for (i in cellCollisions) {
        var cellCollision = cellCollisions[i];
        cellCollision.cell.position[cellCollision.axis] -= cellCollision.collisionDepth;
    }
}
function update() {
    for (i in world.cells) {
        var cell = world.cells[i];
        updatePosition(cell);
        updateforce(cell);
    }
    resolveCollisions();
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
socket.on("getPlayersCellIds", function (nPlayersCells) {
    playersCells = nPlayersCells;
});
var travelAngle = 0;
var mousePos;
function getAngle(pos1, pos2) {
    return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
}
window.onmousemove = trackMouseMove;
function trackMouseMove(event) {
    mousePos = {
        x: event.clientX - canvasTranslation.x,
        y: event.clientY - canvasTranslation.y
    };

}
setInterval(function () {
    if (isPlaying && mousePos && focusedCellId && world.cells[focusedCellId]) {
        socket.emit("mouseMove", mousePos);
        delete mousePos;
    }
}, 40);
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