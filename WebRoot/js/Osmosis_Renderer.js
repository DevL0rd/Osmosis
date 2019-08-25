Graphics.newGraphicsObj("gameCanvas", "2d", window.innerWidth, window.innerHeight, renderFrame, onResize, true);
var canvasTranslation = {
    x: 0,
    y: 0
};
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
    renderCells(world.cells, context);
    //render forground player cells
    this.QueueFrame();
}

function renderCells(cells, context) {
    for (i in cells) {
        var cell = cells[i];
        if (cell.position.x + canvasTranslation.x > 0 && cell.position.x + canvasTranslation.x < window.innerWidth) {
            if (cell.position.y + canvasTranslation.y > 0 && cell.position.y + canvasTranslation.y < + window.innerHeight) {
                renderCell(cell, context);
            }
        }
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