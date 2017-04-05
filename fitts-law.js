"use strict";

/**
 * Create dimensions from the given values and store them for later use.
 * All values should be positive and make sense.
 * @param {number} width The outer width of the area.
 * @param {number} height The outer height of the area.
 * @param {number} top Margin form the top edge.
 * @param {number} right Margin form the right edge.
 * @param {number} bottom Margin form the bottom edge.
 * @param {number} left Margin form the left edge.
 */
function makeDimension(width, height, top, right, bottom, left) {
	return {width: width,
		height: height,
		innerWidth: width - (left + right),
		innerHeight: height - (top + bottom),
		top: top,
		right: right,
		bottom: bottom,
		left: left,
		cx: (width - (left + right)) / 2 + left,
		cy: (height - (top + bottom)) / 2 + top};
}

// set up dimensions for the plotting.
var testDimension = makeDimension(800, 600, 30, 30, 30, 30);

var LIVE_STAY = 1000;
var MAX_TIME = 2000;
var UPDATE_DELAY = MAX_TIME;
var MAX_SPEED = 6; // pixel/ms

function rHit(r, rTarget) {
	return ((plotHitsDimension.innerWidth / 2) / rTarget) * r;
};

function v(v) {
	var colour = 'rgb(' + clampInt(0, 255, (v / MAX_SPEED) * 255) + ', 0, 0)';
	return colour;
};

var trials = [
	{
		w: 30,
		a: 350
	},
	{
		w: 30,
		a: 400
	},
	{
		w: 30,
		a: 450
	},
	{
		w: 55,
		a: 350
	},
	{
		w: 55,
		a: 400
	},
	{
		w: 55,
		a: 450
	},
];

var fittsTest = {
	target: {x: 0, y: 0, r: 10},
	start: {x: 0, y: 0, t: 0},
	last: {},
	

	isoPositions: [],
	currentPosition: 0,
	currentCount: 0,
	miss: 0,
	isoLimits: {minD: 120, maxD: 300, minW:10 , maxW: 100},
	isoParams: {num: 23, distance: 200, width: 50, randomize: false},
	
	currentPath: [],
	active: false,
	
	data: [],
	currentDataSet: 0,
	dataCnt: 0,
	
	colour: d3.scale.category10(),
	
	sumID: 0,
	sumTime: 0,
	
	updateTimeoutHandle: undefined,
	
	startTrials: function(){
		this.data = [];
		this.currentDataSet = 0;
		this.dataCnt = 0;
		this.sumID = 0;
		this.sumTime = 0;
		this.miss = 0;
		this.currentCount = 0;
		this.currentPosition = 0;
		this.isoPositions = [];
		this.last = {};
		this.start = {x: 0, y: 0, t: 0};
		this.target = {x: 0, y: 0, r: 10};
		this.nextTrial();
	},
	
	nextTrial: function(){
		if(this.dataCnt < trials.length){
			var trialParams = trials[this.dataCnt];
			
			this.currentCount = 0;
		
			this.isoParams.distance = trialParams.a;
			this.isoParams.width = trialParams.w;
			this.updateISOCircles();
		
			this.active = false;
			this.addDataSet();
			$('#title').html('Trial ' + (this.dataCnt));
			$('button').hide();
			$('#test-area').show();
		} else {
			$('#title').html('Trials Completed');
			$('button').show();
			$('#test-area').hide();
		}
	},
	
	generateTarget: function() {
		this.target = this.isoPositions[this.currentPosition];
		this.target.distance = this.isoParams.distance;
		this.currentPosition = (this.currentPosition + Math.ceil(this.isoPositions.length/2)) % this.isoPositions.length;
		
		var target = testAreaSVG.selectAll('#target').data([this.target]);
		
		var insert = function(d) {
			d.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', function(d) { return d.w / 2; });
		}

		target.enter()
			.append('circle')
				.attr('id', 'target')
				.style('fill', 'red')
				.call(insert);
									
		target.transition()
				.call(insert);

		
		this.active = true;
	},
	
	updateISOCircles: function() {
		this.currentCount = 0;
		
		this.generateISOPositions(this.isoParams.num,
			this.isoParams.distance,
			this.isoParams.width);

		var circles = testAreaSVG.selectAll('circle').data(this.isoPositions);
		
		var insert = function(d) {
			d.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.attr('r', function(d) { return d.w / 2; });
		}

		circles.enter()
			.append('circle')
				.attr('class', 'iso')
				.call(insert);
									
		circles.transition()
			.call(insert);
		
		circles.exit()
			.transition()
				.attr('r', 0)
				.remove();
				
		this.currentPosition = 0;
		this.generateTarget();
		this.active = false;
	},
	
	generateISOPositions: function(num, d, w) {
		this.isoPositions = [];
		
		for (var i = 0; i < num; i++) {
			this.isoPositions[i] = {x: testDimension.cx + ((d/2) * Math.cos((2 * Math.PI * i) / num)),
				y: testDimension.cy + ((d/2) * Math.sin((2 * Math.PI * i) / num)),
				w: w};
		}
	},
	
	removeTarget: function() {
		testAreaSVG.selectAll('#target').data([])
			.exit()
				.remove();
				
		this.active = false;
		this.currentPath = [];
	},
	
	mouseClicked: function(x, y) {
		
		if (distance({x: x, y: y}, this.target) < (this.target.w / 2)) {
			this.addDataPoint({start: this.start,
							   target: this.target,
							   path: this.currentPath,
							   hit: {x: x, y: y, t: (new Date).getTime()}});
			this.removeTarget();
			
			if(this.currentCount >= 15){
				this.currentCount = 0;
				this.currentPosition = 0;
				this.miss = 0;
				this.nextTrial();
			} else {
				this.currentCount++;
				this.generateTarget();
			}

			
			this.last = {x: x, y: y, t: (new Date).getTime()};
			this.start = this.last;
			this.currentPath.push(this.last);
		}
		else {
			this.miss++;
		}
	},
	
	mouseMoved: function(x, y) {
		if (this.active) {
			// skip if the mouse did actually not move
			// that should practically never happen...
			if (x == this.last.x && y == this.last.y) {
				return;
			}
			
			// set timeout for updating plots
			if (this.updateTimeoutHandle) {
				window.clearTimeout(this.updateTimeoutHandle);
			}
			this.updateTimeoutHandle = window.setTimeout(this.updatePlots, UPDATE_DELAY, this);
			
			
			var newPoint = {x: x, y: y, t: (new Date).getTime()}
			this.currentPath.push(newPoint)
			
			var dt = newPoint.t - this.last.t;
			var dist = distance(this.last, {x: x, y: y})
			if (dt > 0)
				var speed = dist / dt;
			else
				var speed = 0;
			
			testAreaSVG.append('line')
				// .attr('class', '')
				.attr('x1', this.last.x)
				.attr('x2', newPoint.x)
				.attr('y1', this.last.y)
				.attr('y2', newPoint.y)
				.style('stroke', v(speed))
				.transition()
					.duration(5000)
					.style('stroke-opacity', 0)
					.remove();
				
			this.last = newPoint;
		}
	},
	
	addDataPoint: function(data) {
		// add point to data array for plotting into ID/time scatter plot
		if (this.active == false)
			return;

		var dt = data.hit.t - data.start.t;
	
		if (dt < MAX_TIME)  // skip if obvious outlier
		{
			var dist = distance(data.target, data.start);
			var id = shannon(dist, data.target.w);
				
			
			var newPoint = {
				time: dt,
				distance: data.target.distance,
				width: data.target.w,
				hitX: data.hit.x,
				hitY: data.hit.y,
				hitT: data.hit.t,
				startX: data.start.x,
				startY: data.start.y,
				startT: data.start.t,
				targetX: data.target.x,
				targetY: data.target.y
			};

			this.data[this.currentDataSet].data.push(newPoint);
		}
	},
	
	addDataSet: function() {
		var colour = this.colour(randomAB(0, 10));
		
		this.data.push({data:[], colour: colour});
		this.dataCnt = this.data.length;
		
		this.currentDataSet = this.data.length - 1;
	},
	
	updatePlots: function(that) {
		that.active = false;		
	}
};

// _empirical_ covariance
function cov(data, extractorA, extractorB) {
	
	if (data.length <= 1) { // no covariance for 0 or 1 element.
		return 0;
	}

	var mA = mean(data, extractorA);
	var mB = mean(data, extractorB);
	
	var cov = 0;
	for (var i = 0; i < data.length; i++) {
		cov += (extractorA(data[i]) - mA) * (extractorB(data[i]) - mB);
	}
	
	return cov / (data.length - 1);
}

function variance(data, extractor) {
	return cov(data, extractor, extractor);
}

function mean(data, extractor) {
	var sum = 0;
	for (var i = 0; i < data.length; i++) {
		sum += extractor(data[i]);
	}
	return sum / data.length;
}

function randomAB(a, b) {
	return a + Math.random() * (b - a);
}

function assSize(assArr) {
	var size = 0;
	for (var _ in assArr) {
		size++;
	}
	return size;
}

function assFirstKey(assArr) {
	for (var key in assArr) {
		return key;
		break;
	}
}

function assIsKey(needle, assArr) {
	for (var key in assArr) {
		if (needle == key) {
			return true;
		}
	}
	return false;
}


/**
 * Project a point q onto the line p0-p1
 * Code taken from: http://www.alecjacobson.com/weblog/?p=1486
 */
function project(A, B, p) {
	var AB = minus(B, A);
	var AB_squared = dot(AB, AB);
	if (AB_squared == 0) {
		return A;
	}
	else {
		var Ap = minus(p, A);
		var t = dot(Ap, AB) / AB_squared;
		return {x: A.x + t * AB.x,
				y: A.y + t * AB.y,
				t: t};
	}
}



function mouseMoved()
{
	var m = d3.svg.mouse(this);
	fittsTest.mouseMoved(m[0], m[1])
}

function mouseClicked()
{
	var m = d3.svg.mouse(this);
	fittsTest.mouseClicked(m[0], m[1]);
}

function dot(a, b) {
	return (a.x * b.x) + (a.y * b.y);
}

// coutesy of http://stackoverflow.com/questions/3461453/determine-which-side-of-a-line-a-point-lies
function isLeft(A, B, p){
     return ((B.x - A.x)*(p.y - A.y) - (B.y - A.y)*(p.x - A.x)) >= 0 ? 1: -1;
}

function minus(a, b) {
	return {x: a.x - b.x, y: a.y - b.y};
}

function distance(a, b) {
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function sign(a) {
	return a >=0 ? 1 : -1;
}

function rgb2Hex(r, g, b) {
	return '#' +
		clampInt(0, 255, r).toString(16) +
		clampInt(0, 255, g).toString(16) +
		clampInt(0, 255, b).toString(16);
}

function clampInt(lower, upper, x) {
	return Math.min(upper, Math.max(lower, Math.floor(x)));
}

function shannon(A, W) {
	return Math.log(A / W + 1) / Math.log(2);
}

function bgRect(d, dim) {
	return d.append('rect')
		.attr('cx', 0)
		.attr('cy', 0)
		.attr('width', dim.width)
		.attr('height', dim.height)
		.attr('class', 'back');
}



var testAreaSVG = d3.select('#test-area').append('svg')
	.attr('width', testDimension.width)
	.attr('height', testDimension.height)
	.style('pointer-events', 'all')
    	.on('mousemove', mouseMoved)
	.on('mousedown', mouseClicked)
	.call(bgRect, testDimension);

// init code
// should probably go somewhere else though. 

fittsTest.startTrials();
