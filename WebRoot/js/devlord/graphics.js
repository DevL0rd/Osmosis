//Authour: DevL0rd
//GitHub: https://github.com/DevL0rd
EasingFunctions = {
	// no easing, no acceleration
	linear: function (t) { return t },
	// accelerating from zero velocity
	easeInQuad: function (t) { return t * t },
	// decelerating to zero velocity
	easeOutQuad: function (t) { return t * (2 - t) },
	// acceleration until halfway, then deceleration
	easeInOutQuad: function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t },
	// accelerating from zero velocity 
	easeInCubic: function (t) { return t * t * t },
	// decelerating to zero velocity 
	easeOutCubic: function (t) { return (--t) * t * t + 1 },
	// acceleration until halfway, then deceleration 
	easeInOutCubic: function (t) { return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1 },
	// accelerating from zero velocity 
	easeInQuart: function (t) { return t * t * t * t },
	// decelerating to zero velocity 
	easeOutQuart: function (t) { return 1 - (--t) * t * t * t },
	// acceleration until halfway, then deceleration
	easeInOutQuart: function (t) { return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t },
	// accelerating from zero velocity
	easeInQuint: function (t) { return t * t * t * t * t },
	// decelerating to zero velocity
	easeOutQuint: function (t) { return 1 + (--t) * t * t * t * t },
	// acceleration until halfway, then deceleration 
	easeInOutQuint: function (t) { return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t }
}
var gOBJs = [];
function resizeGraphics() {
	for (i in gOBJs) {
		var gOBJ = gOBJs[i];
		gOBJ.canvas.width = $(gOBJ.canvas.parentElement).innerWidth();
		gOBJ.canvas.height = $(gOBJ.canvas.parentElement).innerHeight();
	}
}
document.body.onresize = function () {
	resizeGraphics()
};
function getDistance(pos1, pos2) {
	var a = pos1.x - pos2.x;
	var b = pos1.y - pos2.y;
	return Math.sqrt(a * a + b * b);
}
var Graphics = {};
var ct = 0;
var zt = 0;
Graphics.newGraphics = function (canvasID, context, funcRenderFrame, dbg = false) {
	var gOBJ = {};
	gOBJ.debugenabled = dbg;
	gOBJ.NewFrameQueued = true;
	gOBJ.PerformanceSampleRate = 10;
	gOBJ.DrawDelay = 0;
	gOBJ.ApproxMaxDrawDelay = 0;
	gOBJ.PerformanceSampleTick = 0;
	gOBJ.DrawRequestTime = 0;
	gOBJ.RenderTimeMS = 0;
	gOBJ.fps = 0;
	gOBJ.QueueFrame = function () {
		this.NewFrameQueued = true;
	};
	gOBJ.startTime = 0;
	gOBJ.frameNumber = 0;
	gOBJ.d = new Date().getTime();
	gOBJ.canvas = document.getElementById(canvasID);
	gOBJ.context = gOBJ.canvas.getContext(context);
	gOBJ.canvas.width = gOBJ.canvas.parentElement.innerWidth;
	gOBJ.canvas.height = gOBJ.canvas.parentElement.innerHeight;
	gOBJ.RenderFrame = funcRenderFrame;
	gOBJ.context.cameraPos = { x: 0, y: 0 };
	gOBJ.context.lastCameraPos = { x: 0, y: 0 };
	gOBJ.context.translation = { x: 0, y: 0 };
	gOBJ.context.zoom = 1;
	gOBJ.context.lastZoom = 1;
	gOBJ.context.zoomTo = function (zoom) {
		if (zoom != gOBJ.context.zoom) {
			var eZ = gOBJ.context.lastZoom + (zoom - gOBJ.context.lastZoom) * EasingFunctions.easeInOutQuad(zt);
			gOBJ.context.zoom = eZ;
			if (zt < 1) {
				zt += 0.01;
			} else {
				zt = 0;
				gOBJ.context.lastZoom = gOBJ.context.zoom;
			}
		} else {
			zt = 0;
			gOBJ.context.lastZoom = gOBJ.context.zoom;
		}

		//gOBJ.context.moveCameraTo(gOBJ.context.cameraPos)
	};
	gOBJ.context.moveCameraTo = function (pos) {
		gOBJ.context.scale(gOBJ.context.zoom, gOBJ.context.zoom);
		// var eX = EasingFunctions.easeInOutQuad(t) * pos.x;
		var eX = gOBJ.context.lastCameraPos.x + (pos.x - gOBJ.context.lastCameraPos.x) * EasingFunctions.easeInOutQuad(ct);
		// var eY = EasingFunctions.easeInOutQuad(t) * pos.y;
		var eY = gOBJ.context.lastCameraPos.y + (pos.y - gOBJ.context.lastCameraPos.y) * EasingFunctions.easeInOutQuad(ct);
		gOBJ.context.cameraPos = {
			x: eX,
			y: eY
		};
		var tx = -eX + (this.canvas.width / (gOBJ.context.zoom * 2))
		var ty = -eY + (this.canvas.height / (gOBJ.context.zoom * 2))
		gOBJ.context.translation = {
			x: tx,
			y: ty
		};
		if (ct > 1) {
			ct = 1;
		}
		if (ct < 1) {
			ct += 0.005;
		} else if (getDistance(gOBJ.context.lastCameraPos, gOBJ.context.cameraPos) > 300) {
			ct = 0;
		}
		gOBJ.context.lastCameraPos = gOBJ.context.cameraPos;
		this.translate(tx, ty);

	};

	gOBJs.push(gOBJ);
	Graphics.init(gOBJ);
};
Graphics.init = function (graphicsObj) {
	var now = new Date();
	if (graphicsObj.debugenabled) {
		if (graphicsObj.PerformanceSampleTick >= graphicsObj.PerformanceSampleRate) {
			//Time to check performance
			graphicsObj.PerformanceSampleTick = 0;
			//Take current and subtract it with time of the last draw request
			graphicsObj.DrawDelay = now - graphicsObj.DrawRequestTime;
			var NewDrawDelay = graphicsObj.DrawDelay + graphicsObj.RenderTimeMS;
			if (NewDrawDelay > graphicsObj.ApproxMaxDrawDelay) {
				//If the draw delay is greater than the largest one recorded, update it if it changed by less than 3 or is = to 0
				if (NewDrawDelay - graphicsObj.ApproxMaxDrawDelay < 3 || graphicsObj.ApproxMaxDrawDelay == 0) {
					//If the delay increases to fast, this will be skipped,
					graphicsObj.ApproxMaxDrawDelay = NewDrawDelay;
				}
			}
		} else {
			graphicsObj.PerformanceSampleTick++;
		}
	}
	//Render frame
	if (graphicsObj.NewFrameQueued) {
		graphicsObj.NewFrameQueued = false;
		var fillStyleBKUP = graphicsObj.context.fillStyle;
		//TODO double buffer
		//graphicsObj.context.clearRect(-graphicsObj.context.translation.x, -graphicsObj.context.translation.y, graphicsObj.canvas.width, graphicsObj.canvas.height);
		graphicsObj.RenderFrame(graphicsObj.canvas, graphicsObj.context);
		if (graphicsObj.debugenabled) {
			var fillStyleBKUP = graphicsObj.context.fillStyle;
			graphicsObj.context.fillStyle = "#f44242";
			graphicsObj.context.fillText(graphicsObj.fps, -graphicsObj.context.translation.x + 10, -graphicsObj.context.translation.y + 10);
			graphicsObj.context.fillStyle = fillStyleBKUP;
		}
	}

	if (graphicsObj.debugenabled) {
		//keep track of FPS if debug is enabled
		graphicsObj.frameNumber++;
		graphicsObj.d = new Date().getTime(),
			currentTime = (graphicsObj.d - graphicsObj.startTime) / 1000,
			fpsnow = Math.floor((graphicsObj.frameNumber / currentTime));
		if (currentTime > 1) {
			graphicsObj.startTime = new Date().getTime();
			graphicsObj.frameNumber = 0;
		}
		if (graphicsObj.PerformanceSampleTick >= graphicsObj.PerformanceSampleRate) {
			//if it is time to sample performance, update the FPS displayed on the debug menu.
			graphicsObj.fps = fpsnow;
			//Calculate how long it took to render the frame
			graphicsObj.RenderTimeMS = new Date();
			graphicsObj.RenderTimeMS = graphicsObj.RenderTimeMS - now;
			if (graphicsObj.RenderTimeMS > graphicsObj.ApproxMaxDrawDelay) {
				//Updatehighest time for rendering
				graphicsObj.RenderTimeMS = graphicsObj.ApproxMaxDrawDelay;
			}
		}
	}
	//Request the next animation frame asynchronously from the browser.
	requestAnimationFrame(function () {
		Graphics.init(graphicsObj);
	});

	if (graphicsObj.debugenabled) {
		if (graphicsObj.PerformanceSampleTick >= graphicsObj.PerformanceSampleRate) {
			//if it is time to sample performance
			//record the time the last frame finished rendering.
			graphicsObj.DrawRequestTime = new Date();
		}
	}

};