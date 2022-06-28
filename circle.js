const Layout = require('Layout');
  
const c = E.compiledC(`
    // int circle(int, int)
    float sin(float x) {
      float PI = 3.14159265358f;
      // exploit symmetry - we're only accurate when x is small
      int xi = (int)(x/PI);
      x -= xi*PI;
      if (x>PI/2) x=PI-x;
      // Taylor series expansion of 'sin'
      float r = x; // running total
      float x2 = x*x; // precalculate x^2
      float xpow = x; // running power
      unsigned int factorial = 1; // running factorial
      unsigned int i;
      for (i=1;i<10;i++) {
        xpow = xpow*x2;
        factorial *= (i*2)*((i*2)+1);
        float term = xpow / factorial;
        if (i&1) r-=term; else r+=term;
      }
      // symmetry
      if (xi&1) r=-r;
      return r;
    }
    float cos(float x) {
      float PI = 3.14159265358f;
      return sin(x + (PI/2));
    }
    int circle(unsigned char *params, unsigned char *data){
      int w = params[0];
      int h = params[1];
      int margin = params[2];
      int p100 = params[3];
      float thetaInc = params[4] / 100.0;
      float PI = 3.14159265358f;
      float n = PI / 180.0;
      float p = p100 / 100.0;
      for (int i=0; i<w*h; i++) {
        data[i] = ' ';
      }
      for(float theta=0; theta<=90; theta=theta+thetaInc) {
        float c = cos(theta * n);
        float s = sin(theta * n);
        int w2 = w/2;
        int h2 = h/2;
        for (int r = w2 - margin; r < w2; r++) {
  
          int x1 = (int) r * c;
          int y1 = r * s;
          if (360 * p > 90 - theta) {
            int x = w2 - x1;
            int y = h2 + y1;
            data[w * y + x] = 'X';
          }
          if (p > 0.25 && 360 * p > 90 + theta) {
            int x = w2 - x1;
            int y = h2 - y1;
            data[w * y + x] = 'X';
          }
          if (p > 0.5 && 360 * p > 270 - theta) {
            int x = w2 + x1;
            int y = h2 - y1;
            data[w * y + x] = 'X';
          }
          if (p > 0.75 && 360 * p > 270 + theta) {
            int x = w2 + x1;
            int y = h2 + y1;
            data[w * y + x] = 'X';
          }
        }
      }
      return 1;
    }
  `);
  
  var round = Math.round;
  function sin(x) {
    "compiled"
    var PI = 3.14159265358;
    // exploit symmetry - we're only accurate when x is small
    var xi = round(x/PI);
    x -= xi*PI;
    if (x>PI/2) x=PI-x;
    // Taylor series expansion of 'sin'
    var r = x; // running total
    var x2 = x*x; // precalculate x^2
    var xpow = x; // running power
    var factorial = 1; // running factorial
    var i;
    for (i=1;i<10;i++) {
      xpow = xpow*x2;
      factorial *= (i*2)*((i*2)+1);
      var term = xpow / factorial;
      if (i&1) r-=term; else r+=term;
    }
    // symmetry
    if (xi&1) r=-r;
    return r;
  }
  function cos(x) {
    "compiled"
    var PI = 3.14159265358;
    return sin(x + (PI/2));
  }
  function circle(params, data){
    "compiled"
    var w = params[0];
    var h = params[1];
    var margin = params[2];
    var p100 = params[3];
    var PI = 3.14159265358;
    var n = PI / 180.0;
    var p = p100 / 100.0;
    var thetaInc = params[4] / 100.0;
    for (var i=0; i<2500; i++) {
      data[i] = ' ';
    }
    for(var theta=0; theta<=90; theta=thetaInc+thetaInc) {
      var c = cos(theta * n);
      var s = sin(theta * n);
      var w2 = w/2;
      var h2 = h/2;
      for (var r = w2 - margin; r < w2; r++) {
        var x1 = round(r * c);
        var y1 = round(r * s);
        if (360 * p > 90 - theta) {
          var x = w2 - x1;
          var y = h2 + y1;
          data[w * y + x] = 'X';
        }
        /*if (p > 0.25 && 360 * p > 90 + theta) {
          var x = w2 - x1;
          var y = h2 - y1;
          data[w * y + x] = 'X';
        }
        if (p > 0.5 && 360 * p > 270 - theta) {
          var x = w2 + x1;
          var y = h2 - y1;
          data[w * y + x] = 'X';
        }
        if (p > 0.75 && 360 * p > 270 + theta) {
          var x = w2 + x1;
          var y = h2 + y1;
          data[w * y + x] = 'X';
        }*/
      }
    }
    return data;
  }
  
  function getCircle(ops) {
    const w = ops.w;
    const h = ops.h;
    const p = ops.p;
    const border = ops.border;
    const col = ops.col;
    // Uint8Array supports int up to 255, so max with and height is limited to that
    var params = new Uint8Array(5);
    params[0] = w;
    params[1] = h;
    params[2] = border || 1;
    params[3] = p * 100;
    params[4] = 100;
    if (w > 100) params[4] = 25;
    else if (w > 50) params[4] = 50;
    var data = new Uint8Array(w*h);
    var paramsAddr = E.getAddressOf(params,true);
    var dataAddr = E.getAddressOf(data,true);
    if (!paramsAddr) {
      params = E.toString(params);
      paramsAddr = E.getAddressOf(params,true);
    }
    if (!dataAddr) {
      data = E.toString(data);
      dataAddr = E.getAddressOf(data,true);
    }
    if (!paramsAddr || !dataAddr) throw new Error('Can\'t get data address');
    c.circle(paramsAddr, dataAddr);
    //circle(params, data);
    //console.log('DD1',data)
    //console.log('DD2',  E.toString(data))
    const img = Graphics.createImage(E.toString(data));
    img.width = w;
    img.height = h;
    img.bpp = 1;
    img.transparent = 0;
    img.palette = new Uint16Array([0, g.setColor(col).getColor()]);
    delete data;
    delete dataAddr;
    delete params;
    delete paramsAddr;
    return img;
  }
  
  
  class uiCircle {
    constructor(params) {
      params = params || {};
      this.id = params.id;
      this.type = 'custom';
      this.pad = params.pad || 0;
      this.width = params.width;
      this.height = params.height;
      this.border = params.border;
      this.p = params.p !== null && !isNaN(params.p) ? params.p : 1;
      this.cb = params.cb;
    }
    render(l) {
      l = l || this;
      const x = l.x + l.pad/2;
      const y = l.y + l.pad/2;
      const w = l.w - l.pad;
      const h = l.h - l.pad;
      g.drawImage(getCircle({ w: l.w, h: l.h, p:1, border: l.border, col: '#fff' }), x, y);
      g.drawImage(getCircle({ w: l.w, h: l.h, p: l.p, border: l.border, col: '#f00' }), x, y);
    }
  }
  
  
  
  var idx = 0;
  var steps = 40;
  var refresh = 200;
  var interval;

const testLayout = new Layout({
    type:"v",
    bgCol: g.theme.bg2,
    filly: true,
    c: [
      new uiCircle({
        id: 'circle1',
        height: 150,
        width: 150,
        pad: 4,
        border: 20,
        cb: () => {
          if (interval) stop();
          else start();
        }
      })
    ]
  });
  
  function start() {
    interval = setInterval(() => {
      testLayout.circle1.p = (1/steps) * (idx++%(steps+1));
      testLayout.render();
      //testLayout.clear(testLayout.circle1);
      //testLayout.render(testLayout.circle1);
    }, refresh);
  }
  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
  }
  
  testLayout.render();