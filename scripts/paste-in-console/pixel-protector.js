/**
 * PixelPlanet Pixel Protector
 * Monitors an area and auto-fixes changed pixels
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

  let protectedArea = null;
  let pixelMap = new Map();
  let monitoring = false;
  let autoFix = true;
  let fixDelay = 2000;

  function placePixel(x, y, color) {
    const i = Math.floor(x / 256);
    const j = Math.floor(y / 256);
    const offset = (x % 256) + ((y % 256) * 256);
    
    const buffer = new ArrayBuffer(7);
    const view = new DataView(buffer);
    view.setUint8(0, 0xC1);
    view.setUint8(1, i);
    view.setUint8(2, j);
    view.setUint8(3, offset >>> 16);
    view.setUint16(4, offset & 0xFFFF, false);
    view.setUint8(6, color);
    
    ws.send(buffer);
  }

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
    
    return { x: x, y: y, color: color };
  }

  function checkAndProtect(x, y, newColor) {
    if (!protectedArea || !monitoring) return;
    
    const area = protectedArea;
    
    if (x >= area.x1 && x <= area.x2 && y >= area.y1 && y <= area.y2) {
      const key = x + ',' + y;
      const expected = pixelMap.get(key) || area.defaultColor;
      
      if (newColor !== expected) {
        console.warn('GRIEFED: (' + x + ', ' + y + ') changed to color ' + newColor + ', expected ' + expected);
        
        if (autoFix) {
          console.log('Auto-fixing in ' + (fixDelay / 1000) + ' seconds...');
          setTimeout(function() {
            placePixel(x, y, expected);
            console.log('Fixed pixel at (' + x + ', ' + y + ')');
          }, fixDelay);
        }
      }
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
        checkAndProtect(pixel.x, pixel.y, pixel.color);
      }
    } else if (event.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function() {
        const pixel = parsePixelUpdate(this.result);
        if (pixel) {
          checkAndProtect(pixel.x, pixel.y, pixel.color);
        }
      };
      reader.readAsArrayBuffer(event.data);
    }
  };

  window.PixelProtector = {
    protect: function(x1, y1, x2, y2, defaultColor) {
      protectedArea = {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        defaultColor: defaultColor
      };
      
      monitoring = true;
      pixelMap.clear();
      
      for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
          pixelMap.set(x + ',' + y, defaultColor);
        }
      }
      
      const width = x2 - x1 + 1;
      const height = y2 - y1 + 1;
      const pixels = width * height;
      
      console.log('PROTECTING AREA: (' + x1 + ',' + y1 + ') to (' + x2 + ',' + y2 + ')');
      console.log('Size: ' + width + 'x' + height + ' (' + pixels + ' pixels)');
      console.log('Expected color: ' + defaultColor);
    },

    stop: function() {
      monitoring = false;
      protectedArea = null;
      pixelMap.clear();
      console.log('Protection stopped');
    },

    pause: function() {
      monitoring = false;
      console.log('Protection paused');
    },

    resume: function() {
      if (protectedArea) {
        monitoring = true;
        console.log('Protection resumed');
      } else {
        console.log('No area to protect. Use PixelProtector.protect() first');
      }
    },

    setPixel: function(x, y, color) {
      if (protectedArea) {
        pixelMap.set(x + ',' + y, color);
        console.log('Set expected color for (' + x + ',' + y + ') = ' + color);
      } else {
        console.log('No protected area. Use PixelProtector.protect() first');
      }
    },

    setArea: function(x1, y1, x2, y2, color) {
      if (protectedArea) {
        for (let x = x1; x <= x2; x++) {
          for (let y = y1; y <= y2; y++) {
            pixelMap.set(x + ',' + y, color);
          }
        }
        const pixels = (x2 - x1 + 1) * (y2 - y1 + 1);
        console.log('Set expected color for ' + pixels + ' pixels');
      } else {
        console.log('No protected area. Use PixelProtector.protect() first');
      }
    },

    loadTemplate: function(startX, startY, template) {
      if (!protectedArea) {
        console.log('No protected area. Use PixelProtector.protect() first');
        return;
      }
      
      let count = 0;
      template.forEach(function(row, y) {
        row.forEach(function(color, x) {
          if (color !== null && color !== undefined) {
            pixelMap.set((startX + x) + ',' + (startY + y), color);
            count++;
          }
        });
      });
      
      console.log('Loaded template: ' + count + ' pixels');
    },

    setAutoFix: function(enabled) {
      autoFix = enabled;
      console.log('Auto-fix ' + (enabled ? 'enabled' : 'disabled'));
    },

    setFixDelay: function(milliseconds) {
      fixDelay = milliseconds;
      console.log('Fix delay set to ' + milliseconds + 'ms');
    },

    status: function() {
      if (!protectedArea) {
        console.log('Status: No area protected');
        return;
      }
      
      const area = protectedArea;
      const width = area.x2 - area.x1 + 1;
      const height = area.y2 - area.y1 + 1;
      const pixels = width * height;
      
      console.log('Status: ' + (monitoring ? 'ACTIVE' : 'PAUSED'));
      console.log('Area: (' + area.x1 + ',' + area.y1 + ') to (' + area.x2 + ',' + area.y2 + ')');
      console.log('Size: ' + width + 'x' + height + ' (' + pixels + ' pixels)');
      console.log('Auto-fix: ' + (autoFix ? 'enabled' : 'disabled'));
      console.log('Fix delay: ' + fixDelay + 'ms');
      console.log('Unique colors: ' + new Set(pixelMap.values()).size);
    },

    exportMap: function() {
      const exported = {};
      pixelMap.forEach(function(color, key) {
        exported[key] = color;
      });
      console.log('Exported pixel map:');
      console.log(JSON.stringify(exported));
      return exported;
    },

    importMap: function(mapData) {
      pixelMap.clear();
      Object.keys(mapData).forEach(function(key) {
        pixelMap.set(key, mapData[key]);
      });
      console.log('Imported ' + pixelMap.size + ' pixels');
    }
  };

  console.log('PixelProtector loaded');
  console.log('Usage:');
  console.log('  PixelProtector.protect(x1, y1, x2, y2, defaultColor)');
  console.log('  PixelProtector.setPixel(x, y, color)');
  console.log('  PixelProtector.setArea(x1, y1, x2, y2, color)');
  console.log('  PixelProtector.loadTemplate(x, y, template)');
  console.log('  PixelProtector.pause() / resume() / stop()');
  console.log('  PixelProtector.setAutoFix(true/false)');
  console.log('  PixelProtector.setFixDelay(milliseconds)');
  console.log('  PixelProtector.status()');

})();
