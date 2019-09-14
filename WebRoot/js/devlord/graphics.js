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

function getDistance(pos1, pos2) {
	var a = pos1.x - pos2.x;
	var b = pos1.y - pos2.y;
	return Math.sqrt(a * a + b * b);
}
var Graphics = {};
var ct = 0;
var zt = 0;
Graphics.newGraphicsObj = function (canvasID, context, nWidth, nHeight, funcRenderFrame, funcResize, dbg = false) {
	var newGraphicsOBJ = {};
	newGraphicsOBJ.debugenabled = dbg;
	newGraphicsOBJ.NewFrameQueued = true;
	newGraphicsOBJ.PerformanceSampleRate = 10;
	newGraphicsOBJ.DrawDelay = 0;
	newGraphicsOBJ.ApproxMaxDrawDelay = 0;
	newGraphicsOBJ.PerformanceSampleTick = 0;
	newGraphicsOBJ.DrawRequestTime = 0;
	newGraphicsOBJ.RenderTimeMS = 0;
	newGraphicsOBJ.fps = 0;
	newGraphicsOBJ.QueueFrame = function () {
		this.NewFrameQueued = true;
	};
	newGraphicsOBJ.startTime = 0;
	newGraphicsOBJ.frameNumber = 0;
	newGraphicsOBJ.d = new Date().getTime();
	newGraphicsOBJ.canvas = document.getElementById(canvasID);
	newGraphicsOBJ.context = newGraphicsOBJ.canvas.getContext(context);
	document.body.onresize = function () {
		funcResize(newGraphicsOBJ.canvas);
	};
	newGraphicsOBJ.canvas.width = nWidth;
	newGraphicsOBJ.canvas.height = nHeight;
	newGraphicsOBJ.RenderFrame = funcRenderFrame;
	newGraphicsOBJ.context.cameraPos = { x: 0, y: 0 };
	newGraphicsOBJ.context.lastCameraPos = { x: 0, y: 0 };
	newGraphicsOBJ.context.translation = { x: 0, y: 0 };
	newGraphicsOBJ.context.zoom = 1;
	newGraphicsOBJ.context.lastZoom = 1;
	newGraphicsOBJ.context.zoomTo = function (zoom) {
		if (zoom != newGraphicsOBJ.context.zoom) {
			var eZ = newGraphicsOBJ.context.lastZoom + (zoom - newGraphicsOBJ.context.lastZoom) * EasingFunctions.easeInOutQuad(zt);
			newGraphicsOBJ.context.zoom = eZ;
			if (zt < 1) {
				zt += 0.01;
			} else {
				zt = 0;
				newGraphicsOBJ.context.lastZoom = newGraphicsOBJ.context.zoom;
			}
		} else {
			zt = 0;
			newGraphicsOBJ.context.lastZoom = newGraphicsOBJ.context.zoom;
		}

		//newGraphicsOBJ.context.moveCameraTo(newGraphicsOBJ.context.cameraPos)
	};
	newGraphicsOBJ.context.moveCameraTo = function (pos) {
		newGraphicsOBJ.context.scale(newGraphicsOBJ.context.zoom, newGraphicsOBJ.context.zoom);
		// var eX = EasingFunctions.easeInOutQuad(t) * pos.x;
		var eX = newGraphicsOBJ.context.lastCameraPos.x + (pos.x - newGraphicsOBJ.context.lastCameraPos.x) * EasingFunctions.easeInOutQuad(ct);
		// var eY = EasingFunctions.easeInOutQuad(t) * pos.y;
		var eY = newGraphicsOBJ.context.lastCameraPos.y + (pos.y - newGraphicsOBJ.context.lastCameraPos.y) * EasingFunctions.easeInOutQuad(ct);
		newGraphicsOBJ.context.cameraPos = {
			x: eX,
			y: eY
		};
		var tx = -eX + (this.canvas.width / (newGraphicsOBJ.context.zoom * 2))
		var ty = -eY + (this.canvas.height / (newGraphicsOBJ.context.zoom * 2))
		newGraphicsOBJ.context.translation = {
			x: tx,
			y: ty
		};
		if (ct > 1) {
			ct = 1;
		}
		if (ct < 1) {
			ct += 0.005;
		} else if (getDistance(newGraphicsOBJ.context.lastCameraPos, newGraphicsOBJ.context.cameraPos) > 30) {
			ct = 0;
		}
		newGraphicsOBJ.context.lastCameraPos = newGraphicsOBJ.context.cameraPos;
		this.translate(tx, ty);

	};
	Graphics.init(newGraphicsOBJ);
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