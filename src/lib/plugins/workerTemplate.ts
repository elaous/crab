// Injected into each plugin Worker — provides the api.* surface via postMessage
export const PLUGIN_WORKER_TEMPLATE = `
"use strict";
var _callId = 0;
var _pending = {};
var _toolHandlers = {};

var api = {
  scene: {
    getObjects: function() { return _call('SCENE_GET_OBJECTS', {}); },
    getSelectedIds: function() { return _call('SCENE_GET_SELECTED', {}); },
    addObject: function(type, position) {
      return _call('SCENE_ADD_OBJECT', { type: type, position: position || {} });
    },
    updateObject: function(id, patch) {
      return _call('SCENE_UPDATE_OBJECT', { id: id, patch: patch });
    },
    removeObjects: function(ids) {
      return _call('SCENE_REMOVE_OBJECTS', { ids: ids });
    },
  },
  registerTool: function(tool) {
    var run = tool.run;
    _toolHandlers[tool.id] = run;
    self.postMessage({
      type: 'REGISTER_TOOL',
      tool: { id: tool.id, label: tool.label, icon: tool.icon || '', description: tool.description || '' },
    });
  },
  log: function() {
    var args = Array.prototype.slice.call(arguments).map(function(a) {
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    });
    self.postMessage({ type: 'LOG', args: args });
  },
};

function _call(type, payload) {
  var id = ++_callId;
  return new Promise(function(resolve, reject) {
    _pending[id] = { resolve: resolve, reject: reject };
    self.postMessage({ type: type, payload: payload, callId: id });
    setTimeout(function() {
      if (_pending[id]) {
        delete _pending[id];
        reject(new Error('Plugin API timeout: ' + type));
      }
    }, 10000);
  });
}

self.onmessage = function(e) {
  var msg = e.data;
  if (msg.type === 'RESPONSE') {
    var p = _pending[msg.callId];
    if (p) {
      delete _pending[msg.callId];
      if (msg.error) p.reject(new Error(msg.error));
      else p.resolve(msg.result);
    }
  } else if (msg.type === 'TOOL_INVOKED') {
    var run = _toolHandlers[msg.toolId];
    if (run) {
      Promise.resolve().then(function() { return run(); }).catch(function(err) {
        self.postMessage({ type: 'LOG', args: ['[error] ' + err.message] });
      });
    }
  } else if (msg.type === 'INIT') {
    try {
      /* === PLUGIN CODE START === */
      __PLUGIN_CODE__
      /* === PLUGIN CODE END === */
      self.postMessage({ type: 'PLUGIN_READY' });
    } catch(err) {
      self.postMessage({ type: 'PLUGIN_ERROR', error: err.message });
    }
  }
};
`
