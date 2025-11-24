/**
 * PixelPlanet Auto Painter
 * Automatically draws images pixel by pixel
 * WebSocket: wss://pixelplanet.fun/ws
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
    console.log('Placed pixel at (' + x + ', ' + y + ') color=' + color);
  }

  window.PixelPainter = {
    pixel: function(x, y, color) {
      placePixel(x, y, color);
    },

    drawSquare: function(startX, startY, size, color, delay) {
      delay = delay || 1000;
      let count = 0;
      
      for (let x = startX; x < startX + size; x++) {
        for (let y = startY; y < startY + size; y++) {
          setTimeout(function() {
            placePixel(x, y, color);
          }, count * delay);
          count++;
        }
      }
      
      const eta = (count * delay / 60000).toFixed(1);
      console.log('Drawing ' + size + 'x' + size + ' square (' + count + ' pixels, ETA: ' + eta + ' min)');
    },

    drawLine: function(x1, y1, x2, y2, color, delay) {
      delay = delay || 1000;
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = x1 < x2 ? 1 : -1;
      const sy = y1 < y2 ? 1 : -1;
      let err = dx - dy;
      let count = 0;
      let currentX = x1;
      let currentY = y1;

      while (true) {
        (function(cx, cy, c) {
          setTimeout(function() {
            placePixel(cx, cy, color);
          }, c * delay);
        })(currentX, currentY, count);
        
        count++;

        if (currentX === x2 && currentY === y2) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) { 
          err -= dy; 
          currentX += sx; 
        }
        if (e2 < dx) { 
          err += dx; 
          currentY += sy; 
        }
      }
      
      console.log('Drawing line (' + count + ' pixels)');
    },

    drawRectangle: function(x1, y1, x2, y2, color, delay) {
      delay = delay || 1000;
      let count = 0;

      for (let x = x1; x <= x2; x++) {
        setTimeout(function() { placePixel(x, y1, color); }, count * delay);
        count++;
        setTimeout(function() { placePixel(x, y2, color); }, count * delay);
        count++;
      }

      for (let y = y1 + 1; y < y2; y++) {
        setTimeout(function() { placePixel(x1, y, color); }, count * delay);
        count++;
        setTimeout(function() { placePixel(x2, y, color); }, count * delay);
        count++;
      }
      
      console.log('Drawing rectangle (' + count + ' pixels)');
    },

    drawCircle: function(centerX, centerY, radius, color, delay) {
      delay = delay || 1000;
      let count = 0;
      
      for (let angle = 0; angle < 360; angle += 1) {
        const rad = angle * Math.PI / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        setTimeout(function() {
          placePixel(x, y, color);
        }, count * delay);
        count++;
      }
      
      console.log('Drawing circle (' + count + ' pixels)');
    },

    drawTemplate: function(startX, startY, template, delay) {
      delay = delay || 1000;
      let count = 0;
      
      template.forEach(function(row, y) {
        row.forEach(function(color, x) {
          if (color !== null && color !== undefined) {
            (function(px, py, c, cnt) {
              setTimeout(function() {
                placePixel(px, py, c);
              }, cnt * delay);
            })(startX + x, startY + y, color, count);
            count++;
          }
        });
      });
      
      const eta = (count * delay / 60000).toFixed(1);
      console.log('Drawing template (' + count + ' pixels, ETA: ' + eta + ' min)');
    },

    drawFromImage: function(startX, startY, imageData, delay) {
      delay = delay || 1000;
      let count = 0;
      
      for (let y = 0; y < imageData.length; y++) {
        for (let x = 0; x < imageData[y].length; x++) {
          const color = imageData[y][x];
          if (color !== null) {
            (function(px, py, c, cnt) {
              setTimeout(function() {
                placePixel(px, py, c);
              }, cnt * delay);
            })(startX + x, startY + y, color, count);
            count++;
          }
        }
      }
      
      const eta = (count * delay / 60000).toFixed(1);
      console.log('Drawing image (' + count + ' pixels, ETA: ' + eta + ' min)');
    }
  };

  window.Templates = {
    heart: [
      [null, 3, null, 3, null],
      [3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3],
      [null, 3, 3, 3, null],
      [null, null, 3, null, null]
    ],

    smiley: [
      [null, 3, 3, 3, null],
      [3, 0, 0, 0, 3],
      [3, 5, 0, 5, 3],
      [3, 0, 0, 0, 3],
      [null, 3, 3, 3, null]
    ],

    cross: [
      [null, null, 2, null, null],
      [null, null, 2, null, null],
      [2, 2, 2, 2, 2],
      [null, null, 2, null, null],
      [null, null, 2, null, null]
    ],

    diamond: [
      [null, null, 4, null, null],
      [null, 4, 4, 4, null],
      [4, 4, 4, 4, 4],
      [null, 4, 4, 4, null],
      [null, null, 4, null, null]
    ]
  };

  console.log('PixelPainter loaded');
  console.log('Usage:');
  console.log('  PixelPainter.pixel(x, y, color)');
  console.log('  PixelPainter.drawSquare(x, y, size, color, delay)');
  console.log('  PixelPainter.drawLine(x1, y1, x2, y2, color, delay)');
  console.log('  PixelPainter.drawRectangle(x1, y1, x2, y2, color, delay)');
  console.log('  PixelPainter.drawCircle(centerX, centerY, radius, color, delay)');
  console.log('  PixelPainter.drawTemplate(x, y, template, delay)');
  console.log('');
  console.log('Templates: Templates.heart, Templates.smiley, Templates.cross, Templates.diamond');

})();
