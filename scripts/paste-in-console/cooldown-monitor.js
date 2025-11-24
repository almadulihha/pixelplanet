/**
 * PixelPlanet Cooldown Monitor
 * Tracks pixel placement cooldown
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

  let cooldownEnd = 0;
  let cooldownInterval = null;
  let notificationsEnabled = false;
  let logInterval = 30000; 
  let autoLog = false;

  function parseCooldown(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const opcode = view.getUint8(0);
    
    if (opcode !== 0xC2) return null;
    
    const waitSeconds = view.getUint16(1, false);
    return waitSeconds;
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return hours + 'h ' + minutes + 'm ' + seconds + 's';
    } else if (minutes > 0) {
      return minutes + 'm ' + seconds + 's';
    } else {
      return seconds + 's';
    }
  }

  function handleCooldown(waitSeconds) {
    cooldownEnd = Date.now() + (waitSeconds * 1000);
    
    const timeStr = formatTime(waitSeconds * 1000);
    console.log('COOLDOWN: ' + waitSeconds + ' seconds (' + timeStr + ')');
    console.log('Ready at: ' + new Date(cooldownEnd).toLocaleTimeString());
    
    startCountdown();
  }

  function startCountdown() {
    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }
    
    if (autoLog) {
      cooldownInterval = setInterval(function() {
        const remaining = Math.max(0, cooldownEnd - Date.now());
        
        if (remaining === 0) {
          console.log('READY TO PLACE PIXEL');
          clearInterval(cooldownInterval);
          cooldownInterval = null;
          
          if (notificationsEnabled && Notification.permission === 'granted') {
            new Notification('PixelPlanet Ready', {
              body: 'You can place a pixel now',
              requireInteraction: false
            });
          }
        } else {
          console.log('Cooldown remaining: ' + formatTime(remaining));
        }
      }, logInterval);
    }
  }

  const originalOnMessage = ws.onmessage;
  ws.onmessage = function(event) {
    if (originalOnMessage) {
      originalOnMessage.call(ws, event);
    }
    
    if (event.data instanceof ArrayBuffer) {
      const waitSeconds = parseCooldown(event.data);
      if (waitSeconds !== null) {
        handleCooldown(waitSeconds);
      }
    } else if (event.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function() {
        const waitSeconds = parseCooldown(this.result);
        if (waitSeconds !== null) {
          handleCooldown(waitSeconds);
        }
      };
      reader.readAsArrayBuffer(event.data);
    }
  };

  window.Cooldown = {
    check: function() {
      const remaining = Math.max(0, cooldownEnd - Date.now());
      
      if (remaining === 0) {
        console.log('No cooldown - ready to place pixel');
        return 0;
      } else {
        const timeStr = formatTime(remaining);
        console.log('Cooldown remaining: ' + timeStr);
        console.log('Ready at: ' + new Date(cooldownEnd).toLocaleTimeString());
        return remaining;
      }
    },

    when: function() {
      if (cooldownEnd === 0) {
        console.log('No cooldown recorded yet');
        return null;
      }
      
      const time = new Date(cooldownEnd).toLocaleTimeString();
      console.log('Ready at: ' + time);
      return cooldownEnd;
    },

    remaining: function() {
      const remaining = Math.max(0, cooldownEnd - Date.now());
      return remaining;
    },

    enableNotifications: function() {
      if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        console.log('Desktop notifications enabled');
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(function(permission) {
          if (permission === 'granted') {
            notificationsEnabled = true;
            console.log('Desktop notifications enabled');
          } else {
            console.log('Notification permission denied');
          }
        });
      } else {
        console.log('Notification permission denied. Enable in browser settings.');
      }
    },

    disableNotifications: function() {
      notificationsEnabled = false;
      console.log('Desktop notifications disabled');
    },

    enableAutoLog: function(intervalSeconds) {
      autoLog = true;
      if (intervalSeconds) {
        logInterval = intervalSeconds * 1000;
      }
      console.log('Auto-logging enabled (interval: ' + (logInterval / 1000) + 's)');
      
      if (cooldownEnd > Date.now()) {
        startCountdown();
      }
    },

    disableAutoLog: function() {
      autoLog = false;
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
      console.log('Auto-logging disabled');
    },

    setLogInterval: function(seconds) {
      logInterval = seconds * 1000;
      console.log('Log interval set to ' + seconds + ' seconds');
      
      if (autoLog && cooldownInterval) {
        clearInterval(cooldownInterval);
        startCountdown();
      }
    },

    reset: function() {
      cooldownEnd = 0;
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
      console.log('Cooldown data reset');
    },

    status: function() {
      console.log('Cooldown Monitor Status:');
      console.log('  Auto-logging: ' + (autoLog ? 'enabled' : 'disabled'));
      console.log('  Log interval: ' + (logInterval / 1000) + 's');
      console.log('  Notifications: ' + (notificationsEnabled ? 'enabled' : 'disabled'));
      console.log('  Current cooldown: ' + (cooldownEnd > Date.now() ? formatTime(cooldownEnd - Date.now()) : 'none'));
    }
  };

  console.log('Cooldown Monitor loaded');
  console.log('Usage:');
  console.log('  Cooldown.check()');
  console.log('  Cooldown.when()');
  console.log('  Cooldown.remaining()');
  console.log('  Cooldown.enableNotifications()');
  console.log('  Cooldown.enableAutoLog(intervalSeconds)');
  console.log('  Cooldown.disableAutoLog()');
  console.log('  Cooldown.setLogInterval(seconds)');
  console.log('  Cooldown.status()');

})();
