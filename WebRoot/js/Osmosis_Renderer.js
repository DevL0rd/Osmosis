

var debug = false;
var debugGraphics = true;
var debugCulling = false;
var debugBlackholeFinder = true;
var debugAttractorRadius = true;
var debugPlayerFinder = true
var debugForce = true;
Graphics.newGraphics("gameCanvas", "2d", renderFrame, debugGraphics);
var currentTheme = "Osmosis";
var canvasTranslation = {
    x: 0,
    y: 0
};
var canvasZoom = 1;
var maxZoomMass = 15000;
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
            setTimeout(loadThemeData, 40);
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
    if (playersObjs) {
        var avgX = 0;
        var avgY = 0;
        var playerObjCount = 0;
        var addedMass = 0
        for (objId in playersObjs) {
            if (world.objs[objId]) {
                playerObjCount++;
                avgX += world.objs[objId].position.x
                avgY += world.objs[objId].position.y
                addedMass += world.objs[objId].mass
            }
        }
        if (playerObjCount) {
            var nz = 1 - (addedMass / maxZoomMass);
            context.zoomTo(nz);
            canvasZoom = nz;
            var camPos = { x: avgX / playerObjCount, y: avgY / playerObjCount }
            context.moveCameraTo(camPos);
        } else {
            if (scoreBoard.length > 0) {
                var avgX = 0;
                var avgY = 0;
                var playerObjCount = 0;
                var addedMass = 0
                for (objId in scoreBoard[0].playerObjs) {
                    if (world.objs[objId]) {
                        playerObjCount++;
                        avgX += world.objs[objId].position.x
                        avgY += world.objs[objId].position.y
                        addedMass += world.objs[objId].mass
                    }
                }
                if (playerObjCount) {
                    var nz = 1 - (addedMass / maxZoomMass);
                    context.zoomTo(nz);
                    canvasZoom = nz;
                    var camPos = { x: avgX / playerObjCount, y: avgY / playerObjCount }
                    context.moveCameraTo(camPos);
                }
            }
        }

    }
    canvasTranslation = context.translation;
    if (themeLoaded) {
        bg_image = ThemeCache[Themes[currentTheme].bgImage.src].texture;
        context.save();
        var imgW = bg_image.width;
        var imgH = bg_image.height;
        for (var py = +.5 + ((canvasTranslation.y + world.height) * 0.4) % imgH; py < (world.height + imgH); py += imgH) {
            for (var px = +.5 + ((canvasTranslation.x + world.width) * 0.4) % imgW; px < (world.width + imgW); px += imgW) {
                context.drawImage(bg_image, px - imgW - 2, py - imgH - 2, imgW, imgH);
            }
        }
        context.restore()

    }
    //grid
    context.strokeStyle = "rgba(255, 255, 255, 0.2)";
    context.lineWidth = 10;
    for (var x = -.5 + world.width % 250; x < world.width; x += 250) {
        if (x + canvasTranslation.x > 0 && x + canvasTranslation.x < window.innerWidth / context.zoom) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x, world.height);
            context.stroke();
        }
    }
    for (y = -.5 + world.height % 250; y < world.height; y += 250) {
        if (y + canvasTranslation.y > 0 && y + canvasTranslation.y < window.innerHeight / context.zoom) {
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(world.width, y);
            context.stroke();
        }
    }
    context.strokeStyle = "red";
    context.strokeRect(0, 0, world.width, world.height);
    renderObjs(world.objs, context);
    this.QueueFrame();
}
function renderObjs(objs, context) {
    var playerCells = [];
    for (i in objs) {
        var obj = objs[i];
        if (obj.type == world.objTypes.player) {
            playerCells.push(obj);
        } else {
            var zRad = (obj.radius * context.zoom);
            if (obj.position.x + zRad + canvasTranslation.x > 0 && obj.position.x - zRad + canvasTranslation.x < window.innerWidth / context.zoom) {
                if (obj.position.y + zRad + canvasTranslation.y > 0 && obj.position.y - zRad + canvasTranslation.y < window.innerHeight / context.zoom) {
                    renderObj(obj, context);
                } else {
                    delete cellsRT[obj.id];
                }
            } else {
                delete cellsRT[obj.id];
            }
        }
        playerCells.sort((a, b) => (a.mass < b.mass) ? 1 : -1);
        for (i in playerCells) {
            var obj = playerCells[i];
            var zRad = (obj.radius * context.zoom);
            if (obj.position.x + zRad + canvasTranslation.x > 0 && obj.position.x - zRad + canvasTranslation.x < window.innerWidth / context.zoom) {
                if (obj.position.y + canvasTranslation.y > 0 && obj.position.y + canvasTranslation.y < + window.innerHeight / context.zoom) {
                    renderObj(obj, context);
                } else {
                    delete cellsRT[obj.id];
                }
            } else {
                delete cellsRT[obj.id];
            }
        }
        if (debug && debugBlackholeFinder && obj.type === world.objTypes.blackhole) {
            context.beginPath();

            context.cameraPos.x, context.cameraPos.y
            var lineAngle = getAngle(context.cameraPos, obj.position);
            var newPoint1 = findNewPoint(context.cameraPos, lineAngle, 150 - 20);
            var newPoint2 = findNewPoint(context.cameraPos, lineAngle, 150 + 20);
            context.moveTo(newPoint1.x, newPoint1.y);
            context.lineTo(newPoint2.x, newPoint2.y);
            context.strokeStyle = "rgba(128,0,128, 0.3)";
            context.lineWidth = 5;
            context.stroke();
            context.closePath();
        } else if (debug && debugPlayerFinder && obj.type === world.objTypes.player && obj.playerId != pid) {
            context.beginPath();
            var lineAngle = getAngle(context.cameraPos, obj.position);
            var newPoint = findNewPoint(context.cameraPos, lineAngle, 150);
            var newPoint1 = findNewPoint(context.cameraPos, lineAngle, 150 - 20);
            var newPoint2 = findNewPoint(context.cameraPos, lineAngle, 150 + 20);
            context.moveTo(newPoint1.x, newPoint1.y);
            context.lineTo(newPoint2.x, newPoint2.y);
            context.strokeStyle = "rgba(255,0,0, 0.5)";
            context.lineWidth = 8;
            context.stroke();
            context.closePath();
            context.beginPath();
            context.arc(newPoint.x, newPoint.y, obj.mass * 0.01, 0, 2 * Math.PI);
            context.fillStyle = "rgba(255,0,0, 0.5)";
            context.lineWidth = 4;
            context.fill();
            context.closePath();
        }

    }
}
var skinCache = {};
var textures = {}
var cellsRT = {};
function renderObj(obj, context) {
    if (!cellsRT[obj.id]) cellsRT[obj.id] = { t: 0, lastRadius: 1 };
    if (obj.radius != cellsRT[obj.id].lastRadius) {
        var animRadius = cellsRT[obj.id].lastRadius + (obj.radius - cellsRT[obj.id].lastRadius) * EasingFunctions.easeInOutQuad(cellsRT[obj.id].t);
        if (cellsRT[obj.id].t < 1) {
            cellsRT[obj.id].t += 0.02;
        } else {
            cellsRT[obj.id].lastRadius = obj.radius;
            cellsRT[obj.id].t = 0;
        }
    } else {
        var animRadius = obj.radius
    }

    //cache unloaded graphics and flag when they are loaded
    if (obj.graphics.texture) {
        if (!skinCache[obj.graphics.texture]) {
            var newTexture = new Image();
            newTexture.src = obj.graphics.texture;
            skinCache[obj.graphics.texture] = { isLoaded: false, texture: newTexture };
            newTexture.onload = function () {
                skinCache[this.getAttribute('src')].isLoaded = true;
            };
        } else {
            //If the obj has a skin loaded, draw it, else draw a basic obj
            if (skinCache[obj.graphics.texture].isLoaded) {
                context.save();
                context.beginPath();
                context.arc(obj.position.x, obj.position.y, animRadius, 0, 2 * Math.PI);
                context.clip();
                var wh = animRadius * 2;
                context.drawImage(skinCache[obj.graphics.texture].texture, obj.position.x - animRadius, obj.position.y - animRadius, wh, wh);
                context.strokeStyle = obj.graphics.color;
                context.lineWidth = 12;
                context.fillStyle = "white";
                if (themeLoaded) {
                    context.strokeStyle = ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern;
                    context.fillStyle = context.strokeStyle;
                }
                context.stroke();
                context.closePath();
                if (obj.type === world.objTypes.player) {
                    context.font = "bold " + animRadius * 0.5 + "px Verdana";
                    var nameX = obj.position.x - context.measureText(obj.name).width / 2;
                    context.fillText(obj.name, nameX, obj.position.y);
                    context.fillStyle = "rgba(255, 255, 255, 0.6)";
                    context.fillText(obj.name, nameX, obj.position.y);
                    context.font = "bold " + animRadius * 0.25 + "px Verdana";
                    var massRounded = Math.round(obj.mass);
                    var massTextMeasured = context.measureText(massRounded)
                    var massX = obj.position.x - massTextMeasured.width / 2;
                    var massY = obj.position.y + animRadius * 0.5
                    context.fillStyle = "white";
                    if (themeLoaded) {
                        context.fillStyle = ThemeCache[Themes[currentTheme].cellBorderTexture.src].pattern;
                    }
                    context.fillText(massRounded, massX, massY);
                    context.fillStyle = "rgba(255, 255, 255, 0.6)";
                    context.fillText(massRounded, massX, massY);
                }
                context.restore();
                if (debug && debugForce && isMoving(obj)) {
                    context.beginPath();
                    context.strokeStyle = "green";
                    context.lineWidth = 10;
                    context.moveTo(obj.position.x, obj.position.y);
                    context.lineTo(obj.position.x + obj.force.x, obj.position.y + obj.force.y);
                    context.stroke();
                    context.closePath();
                }
                return;
            }
        }
    }
    //draw a basic obj
    if (debug && debugForce && isMoving(obj)) {
        context.beginPath();
        context.strokeStyle = "green";
        context.lineWidth = 10;
        context.moveTo(obj.position.x, obj.position.y);
        context.lineTo(obj.position.x + obj.force.x, obj.position.y + obj.force.y);
        context.stroke();
        context.closePath();
    }
    context.beginPath();
    context.arc(obj.position.x, obj.position.y, animRadius, 0, 2 * Math.PI);
    context.fillStyle = obj.graphics.color;
    if (themeLoaded) {
        if (obj.type == world.objTypes.blackhole) {
            context.strokeStyle = ThemeCache[Themes[currentTheme].blackHoleBorderTexture.src].pattern;
        } else {
            context.strokeStyle = ThemeCache[Themes[currentTheme].foodBorderTexture.src].pattern;
        }
    } else {
        context.strokeStyle = obj.graphics.color;
    }
    context.fill();
    context.lineWidth = 5;
    context.stroke();

    if (debug && debugAttractorRadius && obj.type === world.objTypes.blackhole) {
        var attrRadius = animRadius + world.attractorAttractionDistance;
        context.beginPath();
        context.arc(obj.position.x, obj.position.y, attrRadius, 0, 2 * Math.PI);
        context.lineWidth = 5;
        context.strokeStyle = "purple";
        context.stroke();
    }
}


Graphics.newGraphics("loginCanvas", "2d", renderLoginCanvas, debugGraphics);

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

Graphics.newGraphics("menuCanvas", "2d", renderMenuCanvas, debugGraphics);
function renderMenuCanvasOnResize(canvas) {
    canvas.width = $("#menuContent").innerWidth();
    canvas.height = $("#menuContent").innerHeight();
}

function updateBubbles() {
    var keepBubbles = [];
    if ($("#mainMenu").is(":visible")) {
        var targetWidth = $("#menuContent").innerWidth();
    } else if ($("#login").is(":visible")) {
        var targetWidth = $("#loginContent").innerWidth();
    }
    for (i in bubbles) {
        var bubble = bubbles[i];
        bubble.x += bubble.fx * bubblesDelta;
        bubble.y -= bubble.fy * bubblesDelta;
        if (bubble.x < targetWidth + bubble.radius && bubble.y > -bubble.radius) {
            keepBubbles.push(bubble);
        }
    }
    bubbles = keepBubbles;
}

function drawBubbles(context) {
    //context.filter = "blur(3px)";
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