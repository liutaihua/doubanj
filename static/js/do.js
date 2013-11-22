(function(win, doc) {

// 已加载模块, _loaded[fileURL]=true
var _loaded = {},

// 加载中的模块，对付慢文件，_loadingQueue[url]=true|false
_loadingQueue = {},

_isArray = function(e) { return e.constructor === Array; },

// 内部配置文件
_config = {
    // 是否自动加载核心库
    autoload: true,

    root: '/',

    //核心库
    corelib: ['http://t.douban.com/js/jquery.min.js'],

    //模块依赖
    //{
    // moduleName: {
    //     path: 'URL',
    //     type:'js|css',
    //     requires:['moduleName1', 'fileURL']
    //   }
    //}
    mods: {},

},

urlmap = {},

mods = _config.mods,

notin = function(str, pattern) {
  return str.indexOf(pattern) == -1;
},

_require = function(f) { return require(resolve(f)); },

resolve = function(f) {
  f = f.toString();
  var mo = mods[f];
  if (mo) return mo.id || resolve(mo.path);
  if (!notin(f, '://')) return f;
  return f.split(_config.root).pop().split('.js')[0];
},

resolveType = function(f) {
  f = f.toString();
  return f.split('?')[0].slice(-4) === '.css' ? 'css' : 'js';
},

realPath = function(m, type) {
  type = type || 'js';

  if (m in urlmap) return urlmap[m];

  if (type === 'js' && notin(m, '.js') && notin(m, '://')) {
    m = _config.root + 'js/' + m + '.js';
  }

  if (m in urlmap) {
    m = urlmap[m];
  }

  return m;
},

getModConfig = function(m) {
  if (typeof m === 'string') {
    var resolved = resolve(m);
    if (mods[resolved]) return mods[resolved];
    var type = resolveType(m);
    m = {
      id: resolved,
      path: realPath(resolved, type),
      type: type,
    };
  }

  mods[m.id] = m;

  return m;
},

// 插入的参考结点
_jsFiles = doc.getElementsByTagName('script'),

_jsSelf = _jsFiles[_jsFiles.length - 1],

_jsConfig,

Do,

_readyList = [],

_isReady = false,

// 全局模块
_globalList = [],

// 加载js/css文件
_load = function(url, type, charset, cb, context) {
    var refFile = _jsFiles[0];

    if (!url) {
        return;
    }

    if (_loaded[url]) {
        _loadingQueue[url] = false;
        if (cb) {
            cb(url, context);
        }
        return;
    }

    // 加载中的文件有可能是太大，有可能是404
    // 当加载队列中再次出现此模块会再次加载，理论上会出现重复加载
    if (_loadingQueue[url]) {
        setTimeout(function() {
            _load(url, type, charset, cb, context);
        }, 1);
        return;
    }

    _loadingQueue[url] = true;

    var n;
    type = type || url.toLowerCase().split(/\./).pop().replace(/[\?#].*/, '');

    if (type === 'js') {
        n = doc.createElement('script');
        n.setAttribute('type', 'text/javascript');
        n.setAttribute('src', url);
        n.setAttribute('async', true);
    } else if (type === 'css') {
        n = doc.createElement('link');
        n.setAttribute('type', 'text/css');
        n.setAttribute('rel', 'stylesheet');
        n.setAttribute('href', url);
        _loaded[url] = true;
    }

    if (!n) {
        return;
    }

    if (charset) {
        n.charset = charset;
    }

    // CSS无必要监听是否加载完毕
    if (type === 'css') {
      refFile.parentNode.insertBefore(n, refFile);
      if (cb) {
        cb(url, context);
      }
      return;
    }

    n.onload = n.onreadystatechange = function() {
        if (!this.readyState ||
            this.readyState === 'loaded' ||
            this.readyState === 'complete') {

            _loaded[this.getAttribute('src')] = true;

            if (cb) {
                cb(this.getAttribute('src'), context);
            }

            n.onload = n.onreadystatechange = null;
        }
    };

    refFile.parentNode.insertBefore(n, refFile);
},

// 计算加载队列。参数e是一个数组
resolveList = function(list) {
    var ret = [], added = {};

    function push(n) {
      if (!n) return;

      if (_isArray(n)) return concat(n);

      if (added[n]) return;

      added[n] = true;

      var mo = getModConfig(n);
      if (!mo) return;

      ret.push(n);

      concat(mo.requires);
    }
    function concat(list) {
      if (!list || !_isArray(list)) return;

      var i = 0, m;
      while (typeof (m = list[i++]) !== 'undefined') push(m);
    }
    concat(list);

    return ret;
},

_ready = function() {
  _isReady = true;
  if (_readyList.length > 0) {
    Do.apply(this, _readyList);
    _readyList = [];
  }
},

_onDOMContentLoaded = function() {
  if (doc.addEventListener) {
    doc.removeEventListener('DOMContentLoaded', _onDOMContentLoaded, false);
  } else if (doc.attachEvent) {
    doc.detachEvent('onreadystatechange', _onDOMContentLoaded);
  }
  _ready();
},

_doScrollCheck = function() {
  if (_isReady) {
    return;
  }

  try {
    doc.documentElement.doScroll('left');
  } catch (err) {
    return win.setTimeout(_doScrollCheck, 1);
  }

  _ready();
},

// reference jQuery's bindReady method.
_bindReady = function() {
  if (doc.readyState === 'complete') {
    return win.setTimeout(_ready, 1);
  }

  var toplevel = false;

  if (doc.addEventListener) {
    doc.addEventListener('DOMContentLoaded', _onDOMContentLoaded, false);
    win.addEventListener('load', _ready, false);
  } else if (doc.attachEvent) {
    doc.attachEvent('onreadystatechange', _onDOMContentLoaded);
    win.attachEvent('onload', _ready);

    try {
      toplevel = (win.frameElement === null);
    } catch (err) {}

    if (document.documentElement.doScroll && toplevel) {
      _doScrollCheck();
    }
  }
},

// 一个异步队列对象
_Queue = function(e) {
    if (!e || !_isArray(e)) {
        return;
    }

    this.queue = e;

    this.loaded = [];

    // 队列当前要加载的模块
    this.current = null;
};

_Queue.prototype = {

    _interval: 10,

    start: function() {
        var o = this;
        this.current = this.next();

        if (!this.current) {
            this.end = true;
            return;
        }

        this.run();
    },

    run: function() {
        var o = this, mod, currentMod = this.current;

        if (typeof currentMod === 'function') {
            currentMod.call(Do, _require);
            this.start();
            return;
        } else if (typeof currentMod === 'string') {
          var mod = getModConfig(currentMod);
          if (!mod) return this.start();

          _load(mod.path, mod.type, mod.charset, function(e) {
             o.start();
          }, o);
        }
    },

    next: function() { return this.queue.shift(); }
};

// 初始配置
_jsConfig = _jsSelf.getAttribute('data-cfg-autoload');
if (typeof _jsConfig === 'string') {
  _config.autoload = (_jsConfig.toLowerCase() === 'true') ? true : false;
}

_jsConfig = _jsSelf.getAttribute('data-cfg-corelib');
if (typeof _jsConfig === 'string') {
  _config.corelib = _jsConfig.split(',');
}

_jsConfig = _jsSelf.getAttribute('data-cfg-root');
if (typeof _jsConfig === 'string') {
  _config.root = _jsConfig;
}

Do = function() {
    var args = [].slice.call(arguments), thread;
    if (_globalList.length > 0) {
       args = _globalList.concat(args);
    }

    if (_config.autoload) {
       args = _config.corelib.concat(args);
    }

    thread = new _Queue(resolveList(args));
    thread.start();
};

Do.urls = function(obj) {
  for (var k in obj) {
    urlmap[k] = obj[k];
  }
};

Do.ready = function() {
    var args = [].slice.call(arguments);
    if (_isReady) {
      return Do.apply(this, args);
    }
    _readyList = _readyList.concat(args);
};

Do.css = function(str) {
   var css = doc.getElementById('do-inline-css');
   if (!css) {
       css = doc.createElement('style');
       css.type = 'text/css';
       css.id = 'do-inline-css';
       doc.getElementsByTagName('head')[0].appendChild(css);
   }

   if (css.styleSheet) {
       css.styleSheet.cssText = css.styleSheet.cssText + str;
   } else {
       css.appendChild(doc.createTextNode(str));
   }
};

if (_config.autoload) {
  // so we can use Do.urls to map corelib js later in document
  setTimeout(function() {
    Do(_config.corelib);
  }, 0);
}

Do.define = Do.add;
Do._config = _config;
Do._mods = mods;

_bindReady();

win.Do = Do;

})(window, document);

// @@nowrap
// ported from `component/component.js`
/**
 * hasOwnProperty.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (has.call(require.modules, path)) return path;
  }

  if (has.call(require.aliases, index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!has.call(require.modules, from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return has.call(require.modules, localRequire.resolve(path));
  };

  return localRequire;
};

