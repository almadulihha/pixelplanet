/**
 * PixelPlanet Canvas Manager
 * Register and manage canvas/chunk subscriptions
 */

(function() {
  'use strict';

  // Find WebSocket connection
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

  let registeredChunks = new Set();
  let currentCanvas = null;

  window.CanvasManager = {
    registerCanvas: function(canvasId) {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      view.setUint8(0, 0xA0);
      view.setUint8(1, canvasId);
      ws.send(buffer);
      
      currentCanvas = canvasId;
      console.log('Registered canvas: ' + canvasId);
    },

    registerChunk: function(chunkId) {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0xA1);
      view.setUint16(1, chunkId, false);
      ws.send(buffer);
      
      registeredChunks.add(chunkId);
      console.log('Registered chunk: ' + chunkId);
    },

    registerChunkByCoords: function(i, j) {
      const chunkId = i + j * 256;
      this.registerChunk(chunkId);
    },

    registerMultipleChunks: function(chunkIds) {
      const buffer = new ArrayBuffer(2 + chunkIds.length * 2);
      const view = new DataView(buffer);
      view.setUint8(0, 0xA3);
      view.setUint8(1, chunkIds.length);
      
      for (let i = 0; i < chunkIds.length; i++) {
        view.setUint16(2 + i * 2, chunkIds[i], false);
      }
      
      ws.send(buffer);
      
      chunkIds.forEach(function(id) {
        registeredChunks.add(id);
      });
      
      console.log('Registered ' + chunkIds.length + ' chunks');
    },

    registerArea: function(x1, y1, x2, y2) {
      const chunk1 = {
        i: Math.floor(x1 / 256),
        j: Math.floor(y1 / 256)
      };
      const chunk2 = {
        i: Math.floor(x2 / 256),
        j: Math.floor(y2 / 256)
      };
      
      const chunkIds = [];
      for (let i = chunk1.i; i <= chunk2.i; i++) {
        for (let j = chunk1.j; j <= chunk2.j; j++) {
          chunkIds.push(i + j * 256);
        }
      }
      
      this.registerMultipleChunks(chunkIds);
    },

    requestChatHistory: function() {
      const buffer = new ArrayBuffer(1);
      const view = new DataView(buffer);
      view.setUint8(0, 0xA5);
      ws.send(buffer);
      
      console.log('Requested chat history');
    },

    listRegisteredChunks: function() {
      console.log('Registered chunks (' + registeredChunks.size + '):');
      
      const sorted = Array.from(registeredChunks).sort(function(a, b) {
        return a - b;
      });
      
      sorted.forEach(function(chunkId) {
        const i = chunkId % 256;
        const j = Math.floor(chunkId / 256);
        const centerX = i * 256 + 128;
        const centerY = j * 256 + 128;
        console.log('  Chunk ' + chunkId + ' (' + i + ',' + j + ') center: (' + centerX + ',' + centerY + ')');
      });
    },

    clearRegistered: function() {
      registeredChunks.clear();
      console.log('Cleared registered chunks list');
    },

    currentCanvas: function() {
      if (currentCanvas !== null) {
        console.log('Current canvas: ' + currentCanvas);
      } else {
        console.log('No canvas registered yet');
      }
      return currentCanvas;
    },

    status: function() {
      console.log('Canvas Manager Status:');
      console.log('  Current canvas: ' + (currentCanvas !== null ? currentCanvas : 'none'));
      console.log('  Registered chunks: ' + registeredChunks.size);
    }
  };

  console.log('Canvas Manager loaded');
  console.log('Usage:');
  console.log('  CanvasManager.registerCanvas(canvasId)');
  console.log('  CanvasManager.registerChunk(chunkId)');
  console.log('  CanvasManager.registerChunkByCoords(i, j)');
  console.log('  CanvasManager.registerMultipleChunks([id1, id2, ...])');
  console.log('  CanvasManager.registerArea(x1, y1, x2, y2)');
  console.log('  CanvasManager.requestChatHistory()');
  console.log('  CanvasManager.listRegisteredChunks()');
  console.log('  CanvasManager.status()');

})();
