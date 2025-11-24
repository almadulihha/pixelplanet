/**
 * PixelPlanet Coordinate Helper
 * Utilities for coordinate conversion and chunk management
 */

(function() {
  'use strict';

  console.log('Coordinate Helper loaded');

  window.Coordinates = {
    worldToChunk: function(x, y) {
      const chunkX = Math.floor(x / 256);
      const chunkY = Math.floor(y / 256);
      return { i: chunkX, j: chunkY };
    },

    worldToOffset: function(x, y) {
      const offsetX = ((x % 256) + 256) % 256;
      const offsetY = ((y % 256) + 256) % 256;
      const offset = offsetX + offsetY * 256;
      return offset;
    },

    chunkToWorld: function(i, j, offset) {
      const offsetX = offset % 256;
      const offsetY = Math.floor(offset / 256);
      const x = i * 256 + offsetX;
      const y = j * 256 + offsetY;
      return { x: x, y: y };
    },

    chunkId: function(i, j) {
      return i + j * 256;
    },

    chunkFromId: function(chunkId) {
      const i = chunkId % 256;
      const j = Math.floor(chunkId / 256);
      return { i: i, j: j };
    },

    chunksInArea: function(x1, y1, x2, y2) {
      const chunk1 = this.worldToChunk(x1, y1);
      const chunk2 = this.worldToChunk(x2, y2);
      
      const chunks = [];
      for (let i = chunk1.i; i <= chunk2.i; i++) {
        for (let j = chunk1.j; j <= chunk2.j; j++) {
          chunks.push(this.chunkId(i, j));
        }
      }
      
      return chunks;
    },

    chunkBounds: function(i, j) {
      return {
        x1: i * 256,
        y1: j * 256,
        x2: i * 256 + 255,
        y2: j * 256 + 255
      };
    },

    distance: function(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    },

    manhattanDistance: function(x1, y1, x2, y2) {
      return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    },

    line: function(x1, y1, x2, y2) {
      const pixels = [];
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const sx = x1 < x2 ? 1 : -1;
      const sy = y1 < y2 ? 1 : -1;
      let err = dx - dy;
      let currentX = x1;
      let currentY = y1;

      while (true) {
        pixels.push({ x: currentX, y: currentY });

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

      return pixels;
    },

    rectangle: function(x1, y1, x2, y2, filled) {
      const pixels = [];
      
      if (filled) {
        for (let x = x1; x <= x2; x++) {
          for (let y = y1; y <= y2; y++) {
            pixels.push({ x: x, y: y });
          }
        }
      } else {
        for (let x = x1; x <= x2; x++) {
          pixels.push({ x: x, y: y1 });
          pixels.push({ x: x, y: y2 });
        }
        for (let y = y1 + 1; y < y2; y++) {
          pixels.push({ x: x1, y: y });
          pixels.push({ x: x2, y: y });
        }
      }
      
      return pixels;
    },

    circle: function(centerX, centerY, radius, filled) {
      const pixels = [];
      
      if (filled) {
        for (let y = -radius; y <= radius; y++) {
          for (let x = -radius; x <= radius; x++) {
            if (x * x + y * y <= radius * radius) {
              pixels.push({ x: centerX + x, y: centerY + y });
            }
          }
        }
      } else {
        for (let angle = 0; angle < 360; angle += 1) {
          const rad = angle * Math.PI / 180;
          const x = Math.round(centerX + radius * Math.cos(rad));
          const y = Math.round(centerY + radius * Math.sin(rad));
          
          const exists = pixels.some(function(p) {
            return p.x === x && p.y === y;
          });
          
          if (!exists) {
            pixels.push({ x: x, y: y });
          }
        }
      }
      
      return pixels;
    },

    info: function(x, y) {
      const chunk = this.worldToChunk(x, y);
      const offset = this.worldToOffset(x, y);
      const chunkId = this.chunkId(chunk.i, chunk.j);
      const bounds = this.chunkBounds(chunk.i, chunk.j);
      
      console.log('Coordinate Info for (' + x + ', ' + y + '):');
      console.log('  Chunk: (' + chunk.i + ', ' + chunk.j + ')');
      console.log('  Chunk ID: ' + chunkId);
      console.log('  Offset: ' + offset);
      console.log('  Chunk bounds: (' + bounds.x1 + ',' + bounds.y1 + ') to (' + bounds.x2 + ',' + bounds.y2 + ')');
    }
  };

  console.log('Usage:');
  console.log('  Coordinates.worldToChunk(x, y)');
  console.log('  Coordinates.worldToOffset(x, y)');
  console.log('  Coordinates.chunkToWorld(i, j, offset)');
  console.log('  Coordinates.chunksInArea(x1, y1, x2, y2)');
  console.log('  Coordinates.line(x1, y1, x2, y2)');
  console.log('  Coordinates.rectangle(x1, y1, x2, y2, filled)');
  console.log('  Coordinates.circle(centerX, centerY, radius, filled)');
  console.log('  Coordinates.info(x, y)');

})();
