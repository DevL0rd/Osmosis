
var gDebug = true;
var debugCulling = false;
var debugBlackholeFinder = true;
var debugAttractorRadius = true;
Graphics.newGraphics("gameCanvas", "2d", renderFrame, gDebug);

var currentTheme = "Osmosis"
var canvasTranslation = {
    x: 0,
    y: 0
};
var canvasZoom = 1;
var maxZoomMass = 2500;
var context;
var ThemeCache = {};
var patternContext;
var themeLoaded = false;
function loadThemeData() {
    themeLoaded = false;
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
        } else {
            themeLoaded = true;
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
        var nz = 1 - (world.cells[focusedCellId].mass / maxZoomMass);
        context.zoomTo(nz);
        canvasZoom = nz;
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
        var zRad = (cell.radius * context.zoom);
        if (cell.position.x + zRad + canvasTranslation.x > 0 && cell.position.x - zRad + canvasTranslation.x < window.innerWidth / context.zoom) {
            if (cell.position.y + canvasTranslation.y > 0 && cell.position.y + canvasTranslation.y < + window.innerHeight / context.zoom) {
                renderCell(cell, context);
            } else if (gDebug && debugCulling) {
                context.beginPath();
                context.moveTo(cell.position.x, cell.position.y - zRad - 50);
                context.lineTo(cell.position.x, cell.position.y + zRad + 50);
                context.strokeStyle = "red";
                context.lineWidth = 5;
                context.stroke();
                context.closePath();
            }
        } else if (gDebug && debugCulling) {
            context.beginPath();
            context.moveTo(cell.position.x - zRad - 50, cell.position.y);
            context.lineTo(cell.position.x + zRad + 50, cell.position.y);
            context.strokeStyle = "red";
            context.lineWidth = 5;
            context.stroke();
            context.closePath();
        }
        if (focusedCellId && world.cells[focusedCellId]) {
            if (debugBlackholeFinder && cell.type === world.cellTypes.blackhole) {
                context.beginPath();
                context.moveTo(world.cells[focusedCellId].position.x, world.cells[focusedCellId].position.y);
                context.lineTo(cell.position.x, cell.position.y);
                context.strokeStyle = "purple";
                context.lineWidth = 5;
                context.stroke();
                context.closePath();
            }
        }
    }
}
var skinCache = {};
var textures = {}
function renderCell(cell, context) {
    //cache unloaded graphics and flag when they are loaded
    var drawBasicCell = true; //set to false if can render with textures
    if (cell.graphics.texture) {
        if (!skinCache[cell.graphics.texture]) {
            var newTexture = new Image();
            newTexture.src = cell.graphics.texture;
            skinCache[cell.graphics.texture] = { isLoaded: false, texture: newTexture };
            newTexture.onload = function () {
                skinCache[this.getAttribute('src')].isLoaded = true;
            };
        } else {
            //If the cell has a skin loaded, draw it, else draw a basic cell
            if (skinCache[cell.graphics.texture].isLoaded) {
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
                if (themeLoaded) {
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
                    if (themeLoaded) {
                        context.fillStyle = ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern;
                    }
                    context.fillText(massRounded, massX, massY);
                    context.fillStyle = "rgba(255, 255, 255, 0.6)";
                    context.fillText(massRounded, massX, massY);
                }
                context.restore();
                drawBasicCell = false;// already fancy drew it
            }
        }
    }
    if (drawBasicCell) {
        context.beginPath();
        context.arc(cell.position.x, cell.position.y, cell.radius, 0, 2 * Math.PI);
        context.fillStyle = cell.graphics.color;
        if (themeLoaded) {
            context.strokeStyle = ThemeCache[Themes[currentTheme].foodBorderTexture.src].pattern;
        } else {
            context.strokeStyle = cell.graphics.color;
        }
        context.fill();
        context.lineWidth = 5;
        context.stroke();
    }
    if (debugAttractorRadius && cell.type === world.cellTypes.blackhole) {
        var attrRadius = cell.radius + world.attractorAttractionDistance;
        context.beginPath();
        context.arc(cell.position.x, cell.position.y, attrRadius, 0, 2 * Math.PI);
        context.lineWidth = 5;
        context.strokeStyle = "purple";
        context.stroke();
    }
}


Graphics.newGraphics("loginCanvas", "2d", renderLoginCanvas, gDebug);

function renderLoginCanvasOnResize(canvas) {
    canvas.width = $("#loginContent").innerWidth();
    canvas.height = $("#loginContent").innerHeight();
}

var bubbles = [];
var bubblesThen = Date.now();
var bubblesNow = Date.now();
var bubblesDelta = (bubblesNow - bubblesThen) / 1000;

function bubbleLoopStart() {
    bubblesNow = Date.now();
    bubblesDelta = (bubblesNow - bubblesThen) / 1000;
}

function bubbleLoopEnd() {
    bubblesThen = bubblesNow;
    elapsedTime = Date.now() - bubblesThen;
    return elapsedTime;
}
function spawnBubble() {

    if ($("#mainMenu").is(":visible") || $("#login").is(":visible")) {
        var radius = randomInt(15, 45);
        var isColliding = true;
        while (isColliding) {
            if ($("#mainMenu").is(":visible")) {
                if (randomInt(0, 1)) {
                    var leftSpawnX = -radius;
                    var leftSpawnY = randomInt(15, $("#menuContent").innerHeight());
                } else {
                    var leftSpawnX = randomInt(15, $("#menuContent").innerWidth());
                    var leftSpawnY = $("#menuContent").innerHeight() + radius;
                }
            } else if ($("#login").is(":visible")) {
                if (randomInt(0, 1)) {
                    var leftSpawnX = -radius;
                    var leftSpawnY = randomInt(15, $("#loginContent").innerHeight());
                } else {
                    var leftSpawnX = randomInt(15, $("#loginContent").innerWidth());
                    var leftSpawnY = $("#loginContent").innerHeight() + radius;
                }
            }

            for (i in bubbles) {
                var bubble = bubbles[i];
                isColliding = checkCollision({ x: leftSpawnX, y: leftSpawnY, radius: radius }, bubble);
            }
            bubbles.push({ x: leftSpawnX, y: leftSpawnY, fx: randomInt(50, 100), fy: randomInt(50, 100), radius: radius });
        }
    }
}

function checkCollision(bubbleA, bubbleB) {
    var collisionDepth = bubbleA.radius + bubbleB.radius;
    var distance = getDistance(bubbleA, bubbleB);
    if (distance <= collisionDepth) {
        return true;
    } else {
        return false;
    }
}

function renderLoginCanvas(canvas, context) {
    if ($("#login").is(":visible")) {
        bubbleLoopStart();
        renderLoginCanvasOnResize(canvas);
        updateBubbles();
        drawBubbles(context);
        bubbleLoopEnd();
    }
    this.QueueFrame();
}

Graphics.newGraphics("menuCanvas", "2d", renderMenuCanvas, gDebug);
function renderMenuCanvasOnResize(canvas) {
    canvas.width = $("#menuContent").innerWidth();
    canvas.height = $("#menuContent").innerHeight();
}

function updateBubbles() {
    var keepBubbles = [];
    for (i in bubbles) {
        var bubble = bubbles[i];
        bubble.x += bubble.fx * bubblesDelta;
        bubble.y -= bubble.fy * bubblesDelta;
        if (bubble.x < $("#menuContent").innerWidth() + bubble.radius && bubble.y > -bubble.radius) {
            keepBubbles.push(bubble);
        }
    }
    bubbles = keepBubbles;
}

function drawBubbles(context) {
    for (i in bubbles) {
        var bubble = bubbles[i];
        drawBubble(bubble, context);
    }
}
function drawBubble(bubble, context) {
    context.save();
    context.strokeStyle = "rgba(80, 80, 255, 0.9)";
    if (Themes[currentTheme] && ThemeCache[Themes[currentTheme].bubbleBorderTexture.src] && ThemeCache[Themes[currentTheme].bubbleBorderTexture.src].pattern) {
        context.strokeStyle = ThemeCache[Themes[currentTheme].bubbleBorderTexture.src].pattern;
    }
    context.beginPath();
    context.arc(bubble.x, bubble.y, bubble.radius, 0, 2 * Math.PI);
    context.lineWidth = 5;
    context.stroke();
    context.restore();
}
function renderMenuCanvas(canvas, context) {
    if ($("#mainMenu").is(":visible")) {
        bubbleLoopStart();
        renderMenuCanvasOnResize(canvas);
        updateBubbles();
        drawBubbles(context);
        bubbleLoopEnd();
    }
    this.QueueFrame();
}
setInterval(spawnBubble, 400);
resizeGraphics();
function randomInt(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}