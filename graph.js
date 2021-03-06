g.setBgColor(g.theme.bg);
g.clear();

var gr = require("graph");
var data = [10,1,3,8,8,10,12,12,0,10,8,3,1,10];

/**
 * Calculate intersection between two lines
 * https://dirask.com/posts/JavaScript-calculate-intersection-point-of-two-lines-for-given-4-points-VjvnAj
 */
function calculateIntersection(p1, p2, p3, p4) {
    var c2x = p3.x - p4.x; // (x3 - x4)
  	var c3x = p1.x - p2.x; // (x1 - x2)
  	var c2y = p3.y - p4.y; // (y3 - y4)
  	var c3y = p1.y - p2.y; // (y1 - y2)
  
  	// down part of intersection point formula
  	var d  = c3x * c2y - c3y * c2x;
  	if (d == 0) {
    	throw new Error('Number of intersection points is zero or infinity.');
    }
  
  	// upper part of intersection point formula
  	var u1 = p1.x * p2.y - p1.y * p2.x; // (x1 * y2 - y1 * x2)
  	var u4 = p3.x * p4.y - p3.y * p4.x; // (x3 * y4 - y3 * x4)
  
  	// intersection point formula
  	var px = (u1 * c2x - c3x * u4) / d;
  	var py = (u1 * c2y - c3y * u4) / d;
  	
  	var p = { x: px, y: py };
  
  	return p;
}



/**
 * Draw a filled line graph using two overlapped poligons, one for the graph line and one for the graph background.
 * The polygon for the graph line is calculated using the same coordinated provided by drawAxes, similarly to what is done in drawLine.
 * The polygon for the graph background is calculated by shifting the graph down by the desired graph line thickess and appying some adjustments to local peaks and local dips.
 * Local peaks are adjusted by shringking the graph background to make space for the line, while local dips are adjusted by expanding the graph background
 *
 * @param g
 * @param data
 * @param options
 *   @param options.width
 *   @param options.height
 *   @param options.x
 *   @param options.y
 *   @param options.border
 *   @param options.col
 *   @param options.bgCol
 *   @param options.dots
 *   @param options.dotRadius
 *   @param options.dotCol
 *   @param options.dotBg
 *   @param options.select
 */
gr.drawPolygon = function(g, data, options) {
  options = options||{};
  const b = options.border || 6;
  const dotRadius = options.dotRadius || b;
  const dotCol = options.dotCol || options.col || g.theme.fg;
  const dotBg = options.dotBg || g.theme.bgH || g.theme.bg;
  const bgCol = options.bgCol || g.theme.bg2;

  if (options.dots) {
    options.y += dotRadius;
    options.height -= dotRadius;
  }

  var o = gr.drawAxes(g,data,options);
  if (options.dots) {
    g.setClipRect(o.x, o.y-dotRadius, o.x+o.w, o.y+o.h);
  } else {
    g.setClipRect(o.x, o.y, o.x+o.w, o.y+o.h);
  }
  if (options.axes || options.gridy || options.gridx) {
    o.w -= 3;
    o.h -= 4;
    o.x += 3;
  }
  var line = [];
  var poly = [];
  // fill polygon from actual data
  for (var i in data) {
    const x = o.getx(i);
    const y = o.gety(data[i]);
    line.push(x, y);
  }

  // close polygon
  line.push(o.x+o.w, o.y+o.h);
  if (options.axes || options.gridy || options.gridx) {
    line.push(o.x-3, o.y+o.h);
  } else {
    line.push(o.x, o.y+o.h);
  }

  // create a clone of the fist polygon
  poly = line.clone();

  // draw first polygon (graph line)
  g.setColor(options.col || g.theme.fg);
  line[1] += b;
  line[line.length-3] += b;
  line[line.length-1] += b;
  g.fillPoly(line);

  // move second polygon (graph filling) down and adjust it to create background
  var finished;
  poly.forEach((p, i) => {
    // end now if finished
    if (finished) {
      // is y
      if (i%2 !== 0) poly[i] += b;
      return;
    }
    if (i%2 !== 0) {
      // is y
      poly[i] += b;
      return;
    }
    // is x
    // get siblings
    const prevY = poly[i-1];
    const curY = poly[i+1];
    const nextY = poly[i+3];
    // check direction
    const hasDecreased = prevY < curY;
    const hasIncreased = prevY > curY;
    const willIncrease = nextY < curY;
    const willDecrease = nextY > curY;
    // first element
    if (isNaN(prevY)) {
      if (willIncrease) {
        poly[i] += b;
      }
      else if (willDecrease) {
        // calculate intersection vertical line on x = 0
        const inter = calculateIntersection(
          { x: o.x, y: 0 },
          { x: o.x, y: o.h },
          { x: p, y: curY - b },
          { x: poly[i+2]+b, y: poly[i+3] - b }
        );
        poly[i] = inter.x - b;
        poly[i+1] = inter.y;
      }
      return;
    }
    // end of graph
    if (p >= o.x+o.w) {
      if (hasDecreased) poly[i] -= b;
      else if (hasIncreased) {
        // calculate intersection vertical line on x = w
        const inter = calculateIntersection(
          { x: poly[i-2], y: prevY },
          { x: p + b, y: curY - b },
          { x: o.x+o.w, y: 0 },
          { x: o.x+o.w, y: o.h }
        );
        poly[i] = inter.x;
        poly[i+1] = inter.y;
      }
      // stop processing x since visible parth of graph is over
      finished = true;
      return;
    }
    // add border when coming down
    if (hasDecreased) {
      poly[i] -= b;
    }
    // add border when going up
    if (hasIncreased && !willDecrease) {
      poly[i] += b;
    }
    // increase space on dip \/ -> \./
    if (hasDecreased && willIncrease) {
      // add new point after current
      poly.splice(i+2, 0, p, poly[i+1]);
    }
    // decrease space on peak /.\ -> /\
    if (hasIncreased && willDecrease) {
      // calculate intersection point between the two lines
      const inter = calculateIntersection(
        { x: poly[i-2], y: prevY },
        { x: p+b, y: curY - b },
        { x: p-b, y: curY - b },
        { x: poly[i+2], y: nextY }
      );
      poly[i] = inter.x;
      poly[i+1] = inter.y;
    }
  });

  // if dots are visible, increase length of polygon
  if (options.dots) {
    poly[1] += dotRadius*2;
    poly[poly.length-3] += dotRadius;
    poly[poly.length-1] += dotRadius;
  }

  // draw second polygon (graph filling)
  g.setColor(bgCol);
  g.fillPoly(poly);

  g.setColor(g.theme.fg);

  if (options.dots) {
    // draw dots
    line.forEach((p, i) => {
      if (i >= data.length * 2) return;
      if (i%2 === 0) {
        const x = line[i];
        const y = line[i+1] + dotRadius/2;
        g.setColor(dotBg);
        g.fillCircle(x, y, dotRadius-1);
        g.setColor(dotCol);
        g.drawCircle(x, y, dotRadius);
      }
    });
  }
  function findClosest(line, point) {
    var closest = 0;
    for (var i in data){
      const x = line[i*2];
      if (Math.abs(point.x - x) < Math.abs(point.x - line[closest])) {
        closest = i*2;
      }
    }
    return {
      idx: closest/2,
      val: data[closest/2],
      x: line[closest],
      y: line[closest+1] + dotRadius/2
    };
  }

  var selected;
  var dotsTimeout;
  function resetSelection() {
    if (!selected) return;
    // remove line
    g.setColor(g.theme.bg);
    g.drawLine(selected.x, o.y, selected.x, selected.y);
    g.setColor(bgCol);
    g.drawLine(selected.x, selected.y, selected.x, o.y+o.h+b);
    // restore axes
    const axesUpdated = selected.x < o.x + dotRadius || selected.y < o.y+o.h - dotRadius;
    if (options.axes && axesUpdated) {
      g.setColor(g.theme.fg);
      gr.drawAxes(g, data, options);
    }
    // restore original dot
    if (options.dots) {
      g.setColor(dotBg);
      g.fillCircle(selected.x, selected.y, dotRadius-1);
      g.setColor(dotCol);
      g.drawCircle(selected.x, selected.y, dotRadius);
    }

    selected = null;
    o.emit('deselected');
  }
  function drawSelection(e) {
    selected = findClosest(line, e);
    g.setColor(dotCol);
    if (options.dots) g.fillCircle(selected.x, selected.y, dotRadius-1);
    g.drawLine(selected.x, o.y, selected.x, o.y+o.h+b);

    o.emit('selected', selected);

    if (dotsTimeout) clearTimeout(dotsTimeout);
    dotsTimeout = setTimeout(() => {
      resetSelection();
    }, 3000);
  }

  function touchHandler(z, e) {
    if (selected) resetSelection();
    drawSelection(e);
  }

  function dragHandler(e) {
    resetSelection();
    drawSelection(e);
  }

  o.setSelect = function(enabled) {
    options.select = enabled;
    resetSelection();
    Bangle.removeListener('touch', touchHandler);
    Bangle.removeListener('drag', dragHandler);
    if (enabled) {
      Bangle.on('touch', touchHandler);
      Bangle.on('drag', dragHandler);
    }
  };

  // if selectable dots are enabled, start listener
  if (options.select) {
    o.setSelect(true);
  }

  // redraw axes over the graph
  if (options.axes || options.gridy || options.gridx) {
    gr.drawAxes(g, data, options);
  }

  // return info that can be used for plotting extra things on the chart
  return o;
};

var ab;
function draw() {
  ab = !ab;
  if (ab) {
    data = [10,1,3,8,8,10,12,12,0,10,8,3,1,10];
  } else {
    data = [0,10,1,3,8,8,10,12,12,0,10,8,3,1,10,0];
  }
  const st = Date.now();
  g.clear();
  const o = gr.drawPolygon(g, data, { y: 10, height: 50, border: 2, dotRadius: 3, select: true, dots: true, axes: true, gridy: 3, gridx: 3 });
  console.log('drawn in', Date.now() - st);
  return o;
}
function timed() {
  data.push(data.shift());
  g.clear();
  gr.drawPolygon(g, data, { y: 10, height: 50, border: 2, dotRadius: 3, axes: true, gridy: 1, gridx: 3 });
}
//setInterval(timed, 1000);
//Bangle.on('touch', draw);
const view = draw();