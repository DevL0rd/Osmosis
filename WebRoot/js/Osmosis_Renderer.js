Graphics.newGraphicsObj("gameCanvas", "2d", window.innerWidth, window.innerHeight, renderFrame, onResize, true)
var canvasTranslation = {
    x: 0,
    y: 0
}
function renderFrame(canvas, context) {
    //draw world border
    //redraw fix...
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (focusedCellId && world.cells[focusedCellId]) {
        context.moveCameraTo(world.cells[focusedCellId].position);
    }
    canvasTranslation = context.translation;
    context.strokeStyle = "red";
    context.strokeRect(0, 0, world.width, world.height);
    var remainingCells = renderFoodCells(world.cells, context);
    remainingCells = renderPlayerCells(remainingCells, context);
    renderCells(remainingCells, context);

    //render forground player cells
    this.QueueFrame();
}
function renderFoodCells(cells, context) {
    var remainingCells = [];
    //render food cells
    for (i in cells) {
        var cell = cells[i];
        if (cell.type == "food") {
            renderCell(cell, context);
        } else {
            remainingCells.push(cell);
        }
    }
    return remainingCells;
}
function renderPlayerCells(cells, context) {
    var remainingCells = [];
    //render player cells
    for (i in cells) {
        var cell = cells[i];
        if (!playersCells[cell.id] && cell.type == "player") {
            renderCell(cell, context);
        } else {
            remainingCells.push(cell);
        }
    }
    return remainingCells;
}
function renderCells(cells, context) {
    for (i in cells) {
        var cell = cells[i];
        renderCell(cell, context);
    }
}
function renderCell(cell, context) {
    context.fillStyle = cell.graphics.color;
    context.beginPath();
    context.arc(cell.position.x, cell.position.y, cell.radius, 0, 2 * Math.PI);
    context.fill();
}
function onResize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}