/**
 * PixelPlanet Pixel Spy
 * Monitors and logs all pixel changes in real-time
 */

(function() {
  'use strict';

  function findWebSocket() {
    for (let prop in window) {
      if (window[prop] instanceof WebSocket) {
        const ws = window[prop];
        if (ws.url && ws.url.includes('wss://pixelplanet.fun/ws')) {
          return ws;
        }
      }
    }
    return null;
  }

  const ws = findWebSocket();
  if (!ws) {
    console.error('WebSocket not found. Make sure you are on pixelplanet.fun');
    return;
  }

  console.log('WebSocket connected:', ws.url);

  let logging = false;
  let verboseMode = false;
  let filterArea = null;
  let filterColors = null;
  
  let stats = {
    total: 0,
    byColor: {},
    byArea: {},
    startTime: Date.now(),
    lastPixel: null
  };

  function parsePixelUpdate(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const opcode = view.getUint8(0);
    
    if (opcode !== 0xC1) return null;
    
    const i = view.getUint8(1);
    const j = view.getUint8(2);
    const offset = (view.getUint8(3) << 16) | view.getUint16(4, false);
    const color = view.getUint8(6);
    
    const x = (i * 256) + (offset % 256);
    const y = (j * 256) + Math.floor(offset / 256);
    
    return { x: x, y: y, color: color, i: i, j: j };
  }

  function passesFilters(pixel) {
    if (filterArea) {
      const area = filterArea;
      if (pixel.x < area.x1 || pixel.x > area.x2 || pixel.y < area.y1 || pixel.y > area.y2) {
        return false;
      }
    }
    
    if (filterColors) {
      if (filterColors.indexOf(pixel.color) === -1) {
        return false;
      }
    }
    
    return true;
  }

  function logPixel(pixel) {
    if (!logging || !passesFilters(pixel)) return;
    
    stats.total++;
    stats.byColor[pixel.color] = (stats.byColor[pixel.color] || 0) + 1;
    stats.lastPixel = pixel;
    
    const chunkKey = pixel.i + ',' + pixel.j;
    stats.byArea[chunkKey] = (stats.byArea[chunkKey] || 0) + 1;
    
    if (verboseMode) {
      console.log('Pixel: (' + pixel.x + ', ' + pixel.y + ') color=' + pixel.color + ' chunk=(' + pixel.i + ',' + pixel.j + ') total=' + stats.total);
    }
  }

  const originalOnMessage = ws.onmessage;
  ws.onmessage = function(event) {
    if (originalOnMessage) {
      originalOnMessage.call(ws, event);
    }
    
    if (event.data instanceof ArrayBuffer) {
      const pixel = parsePixelUpdate(event.data);
      if (pixel) {
        logPixel(pixel);
      }
    } else if (event.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function() {
        const pixel = parsePixelUpdate(this.result);
        if (pixel) {
          logPixel(pixel);
        }
      };
      reader.readAsArrayBuffer(event.data);
    }
  };

  window.PixelSpy = {
    start: function(verbose) {
      logging = true;
      verboseMode = verbose || false;
      stats.startTime = Date.now();
      console.log('Pixel spy started' + (verboseMode ? ' (verbose mode)' : ''));
    },

    stop: function() {
      logging = false;
      console.log('Pixel spy stopped');
    },

    pause: function() {
      logging = false;
      console.log('Pixel spy paused');
    },

    resume: function() {
      logging = true;
      console.log('Pixel spy resumed');
    },

    verbose: function(enabled) {
      verboseMode = enabled;
      console.log('Verbose mode ' + (enabled ? 'enabled' : 'disabled'));
    },

    filterArea: function(x1, y1, x2, y2) {
      filterArea = { x1: x1, y1: y1, x2: x2, y2: y2 };
      console.log('Area filter set: (' + x1 + ',' + y1 + ') to (' + x2 + ',' + y2 + ')');
    },

    filterColors: function(colors) {
      filterColors = colors;
      console.log('Color filter set: ' + colors.join(', '));
    },

    clearFilters: function() {
      filterArea = null;
      filterColors = null;
      console.log('Filters cleared');
    },

    stats: function() {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = (stats.total / elapsed).toFixed(2);
      
      console.log('');
      console.log('PIXEL STATISTICS');
      console.log('Total pixels: ' + stats.total);
      console.log('Elapsed time: ' + elapsed.toFixed(0) + 's');
      console.log('Average rate: ' + rate + ' px/s');
      
      if (stats.lastPixel) {
        console.log('Last pixel: (' + stats.lastPixel.x + ', ' + stats.lastPixel.y + ') color=' + stats.lastPixel.color);
      }
      
      console.log('');
      console.log('Colors used:');
      Object.entries(stats.byColor)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, 20)
        .forEach(function(entry) {
          const color = entry[0];
          const count = entry[1];
          const percent = (count / stats.total * 100).toFixed(1);
          console.log('  Color ' + color + ': ' + count + ' (' + percent + '%)');
        });
    },

    hotspots: function(limit) {
      limit = limit || 10;
      
      console.log('');
      console.log('HOTSPOT CHUNKS (top ' + limit + '):');
      
      Object.entries(stats.byArea)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, limit)
        .forEach(function(entry, index) {
          const chunk = entry[0];
          const count = entry[1];
          const coords = chunk.split(',');
          const centerX = parseInt(coords[0]) * 256 + 128;
          const centerY = parseInt(coords[1]) * 256 + 128;
          console.log('  ' + (index + 1) + '. Chunk (' + chunk + ') center=(' + centerX + ',' + centerY + '): ' + count + ' pixels');
        });
    },

    colorStats: function(color) {
      const count = stats.byColor[color] || 0;
      const percent = stats.total > 0 ? (count / stats.total * 100).toFixed(2) : 0;
      
      console.log('Color ' + color + ': ' + count + ' pixels (' + percent + '%)');
    },

    reset: function() {
      stats = {
        total: 0,
        byColor: {},
        byArea: {},
        startTime: Date.now(),
        lastPixel: null
      };
      console.log('Statistics reset');
    },

    export: function() {
      const data = {
        total: stats.total,
        elapsed: (Date.now() - stats.startTime) / 1000,
        rate: stats.total / ((Date.now() - stats.startTime) / 1000),
        byColor: stats.byColor,
        byArea: stats.byArea
      };
      
      console.log('Exported data:');
      console.log(JSON.stringify(data, null, 2));
      return data;
    },

    status: function() {
      console.log('Pixel Spy Status:');
      console.log('  Logging: ' + (logging ? 'active' : 'inactive'));
      console.log('  Verbose: ' + (verboseMode ? 'enabled' : 'disabled'));
      console.log('  Area filter: ' + (filterArea ? 'active' : 'none'));
      console.log('  Color filter: ' + (filterColors ? filterColors.join(', ') : 'none'));
      console.log('  Total pixels logged: ' + stats.total);
    },

    last: function(count) {
      count = count || 1;
      console.log('Last pixel: ' + (stats.lastPixel ? '(' + stats.lastPixel.x + ', ' + stats.lastPixel.y + ') color=' + stats.lastPixel.color : 'none'));
    }
  };

  console.log('PixelSpy loaded');
  console.log('Usage:');
  console.log('  PixelSpy.start(verbose)');
  console.log('  PixelSpy.stop() / pause() / resume()');
  console.log('  PixelSpy.stats()');
  console.log('  PixelSpy.hotspots(limit)');
  console.log('  PixelSpy.colorStats(color)');
  console.log('  PixelSpy.filterArea(x1, y1, x2, y2)');
  console.log('  PixelSpy.filterColors([1, 2, 3])');
  console.log('  PixelSpy.clearFilters()');
  console.log('  PixelSpy.reset()');
  console.log('  PixelSpy.export()');

})();
