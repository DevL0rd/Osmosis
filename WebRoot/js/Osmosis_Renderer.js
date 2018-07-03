Graphics.newGraphicsObj("gameCanvas", "2d", window.innerWidth, window.innerHeight, renderFrame, onResize, true)

function renderFrame(canvas, context) {
    //draw world border
    //redraw fix...
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (focusedCellId && world.cells[focusedCellId]) {
        context.moveCameraTo(world.cells[focusedCellId].position)
    }
    context.strokeStyle = "red";
    context.strokeRect(0, 0, world.width, world.height);
    for (i in world.cells) {
        var cell = world.cells[i];
        context.fillStyle = cell.graphics.color;
        context.beginPath();
        context.arc(cell.position.x, cell.position.y, cell.radius, 0, 2 * Math.PI);
        context.fill();
    }
    this.QueueFrame();
}

function onResize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}