
Graphics.newGraphicsObj("gameCanvas", "2d", window.innerWidth, window.innerHeight, renderFrame, onResize, true);

var currentTheme = "Osmosis"
var canvasTranslation = {
    x: 0,
    y: 0
};
var context;
var ThemeCache = {};
var patternContext;
function loadThemeData() {
    if (Themes[currentTheme]) {
        //cache unloaded graphics and flag when they are loaded
        var srcs = Themes[currentTheme]
        var allSourcesLoaded = true;
        for (srcName in Themes[currentTheme]) {
            var src = Themes[currentTheme][srcName].src;
            if (!ThemeCache[src]) {
                ThemeCache[src] = { isLoaded: false, texture: new Image() };
                ThemeCache[src].texture.src = src;
                ThemeCache[src].texture.onload = function () {
                    ThemeCache[this.getAttribute('src')].isLoaded = true;
                };
                allSourcesLoaded = false;
            } else {
                if (ThemeCache[src].isLoaded) {
                    if (!ThemeCache[src].pattern && patternContext) {
                        ThemeCache[src].pattern = patternContext.createPattern(ThemeCache[src].texture, 'repeat');
                    }
                } else {
                    allSourcesLoaded = false;
                }
            }
        }
        if (!allSourcesLoaded) {
            setTimeout(loadThemeData, 200);
        }
    }
}
function renderFrame(canvas, context) {
    //draw world border
    //redraw fix...
    canvas.width = window.innerWidth;
    if (!patternContext) {
        patternContext = context;
    }
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
var skinCache = {};
var textures = {}
function renderCell(cell, context) {
    context.fillStyle = cell.graphics.color;
    context.strokeStyle = cell.graphics.color;
    //cache unloaded graphics and flag when they are loaded
    if (cell.graphics.texture) {
        if (!skinCache[cell.graphics.texture]) {
            var newTexture = new Image();
            newTexture.src = cell.graphics.texture;
            skinCache[cell.graphics.texture] = { isLoaded: false, texture: newTexture };
            newTexture.onload = function () {
                skinCache[this.getAttribute('src')].isLoaded = true;
            };
        }
    }
    //If the cell has a skin loaded, draw it, else draw a basic cell
    if (skinCache[cell.graphics.texture] && skinCache[cell.graphics.texture].isLoaded) {
        context.save();
        context.beginPath();
        context.arc(cell.position.x, cell.position.y, cell.radius, 0, 2 * Math.PI);
        context.clip();
        var wh = cell.radius * 2;
        var ro = cell.radius
        context.drawImage(skinCache[cell.graphics.texture].texture, cell.position.x - ro, cell.position.y - ro, wh, wh);
        context.strokeStyle = cell.graphics.color;
        context.lineWidth = 12;
        context.fillStyle = "white";
        if (Themes[currentTheme] && ThemeCache[Themes[currentTheme].cellBorderTexture.src] && ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern) {
            context.strokeStyle = ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern;
            context.fillStyle = context.strokeStyle;
        }
        context.stroke();
        context.closePath();
        if (cell.type === world.cellTypes.player) {
            context.font = "bold " + cell.radius * 0.5 + "px Verdana";
            var nameX = cell.position.x - context.measureText(cell.name).width / 2;
            context.fillText(cell.name, nameX, cell.position.y);
            context.fillStyle = "rgba(255, 255, 255, 0.6)";
            context.fillText(cell.name, nameX, cell.position.y);
            context.font = "bold " + cell.radius * 0.25 + "px Verdana";
            var massRounded = Math.round(cell.mass);
            var massTextMeasured = context.measureText(massRounded)
            var massX = cell.position.x - massTextMeasured.width / 2;
            var massY = cell.position.y + cell.radius * 0.5
            context.fillStyle = "white";
            if (Themes[currentTheme] && ThemeCache[Themes[currentTheme].cellBorderTexture.src] && ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern) {
                context.fillStyle = ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern;
            }
            context.fillText(massRounded, massX, massY);
            context.fillStyle = "rgba(255, 255, 255, 0.6)";
            context.fillText(massRounded, massX, massY);
        }
        context.restore();
    } else {
        context.beginPath();
        context.arc(cell.position.x, cell.position.y, cell.radius, 0, 2 * Math.PI);
        context.fill();
        if (Themes[currentTheme] && ThemeCache[Themes[currentTheme].foodBorderTexture.src] && ThemeCache[Themes[currentTheme].foodBorderTexture.src].pattern) {
            context.strokeStyle = ThemeCache[Themes[currentTheme].foodBorderTexture.src].pattern;
        }
        context.lineWidth = 5;
        context.stroke();
    }

}
function onResize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}