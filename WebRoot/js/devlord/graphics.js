//Authour: DevL0rd
//GitHub: https://github.com/DevL0rd
var Graphics = {}
Graphics.newGraphicsObj = function (canvasID, context, nWidth, nHeight, funcRenderFrame, funcResize, dbg = false) {
	var newGraphicsOBJ = {}
	newGraphicsOBJ.debugenabled = dbg
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
	}
	newGraphicsOBJ.startTime = 0;
	newGraphicsOBJ.frameNumber = 0;
	newGraphicsOBJ.d = new Date().getTime();
	newGraphicsOBJ.canvas = document.getElementById(canvasID);
	newGraphicsOBJ.context = newGraphicsOBJ.canvas.getContext(context);
	document.body.onresize = function () {
		funcResize(newGraphicsOBJ.canvas);
	}
	newGraphicsOBJ.canvas.width = nWidth;
	newGraphicsOBJ.canvas.height = nHeight;
	newGraphicsOBJ.RenderFrame = funcRenderFrame;
	newGraphicsOBJ.context.camerPos = { x: 0, y: 0 };
	newGraphicsOBJ.context.translation = { x: 0, y: 0 };
	newGraphicsOBJ.context.moveCameraTo = function (pos) {
		newGraphicsOBJ.context.camerPos = {
			x: pos.x,
			y: pos.y
		}
		newGraphicsOBJ.context.translation = {
			x: -pos.x + this.canvas.width / 2,
			y: -pos.y + this.canvas.height / 2
		}
		this.translate(-pos.x + this.canvas.width / 2, -pos.y + this.canvas.height / 2);
	}
	Graphics.init(newGraphicsOBJ)
}
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
				};
			};
		} else {
			graphicsObj.PerformanceSampleTick++;
		};
	};
	//Render frame
	if (graphicsObj.NewFrameQueued) {
		graphicsObj.NewFrameQueued = false;
		var fillStyleBKUP = graphicsObj.context.fillStyle
		//TODO double buffer
		//graphicsObj.context.clearRect(-graphicsObj.context.translation.x, -graphicsObj.context.translation.y, graphicsObj.canvas.width, graphicsObj.canvas.height)
		graphicsObj.RenderFrame(graphicsObj.canvas, graphicsObj.context);
		if (graphicsObj.debugenabled) {
			var fillStyleBKUP = graphicsObj.context.fillStyle
			graphicsObj.context.fillStyle = "#f44242"
			graphicsObj.context.fillText(graphicsObj.fps, -graphicsObj.context.translation.x + 10, -graphicsObj.context.translation.y + 10)
			graphicsObj.context.fillStyle = fillStyleBKUP
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
		};
		if (graphicsObj.PerformanceSampleTick >= graphicsObj.PerformanceSampleRate) {
			//if it is time to sample performance, update the FPS displayed on the debug menu.
			graphicsObj.fps = fpsnow;
			//Calculate how long it took to render the frame
			graphicsObj.RenderTimeMS = new Date();
			graphicsObj.RenderTimeMS = graphicsObj.RenderTimeMS - now;
			if (graphicsObj.RenderTimeMS > graphicsObj.ApproxMaxDrawDelay) {
				//Updatehighest time for rendering
				graphicsObj.RenderTimeMS = graphicsObj.ApproxMaxDrawDelay;
			};
		};
	};
	//Request the next animation frame asynchronously from the browser.
	requestAnimationFrame(function () {
		Graphics.init(graphicsObj)
	});

	if (graphicsObj.debugenabled) {
		if (graphicsObj.PerformanceSampleTick >= graphicsObj.PerformanceSampleRate) {
			//if it is time to sample performance
			//record the time the last frame finished rendering.
			graphicsObj.DrawRequestTime = new Date();
		};
	};

}