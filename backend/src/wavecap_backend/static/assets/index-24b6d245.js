var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _provider, _providerCalled, _a, _focused, _cleanup, _setup, _b, _online, _cleanup2, _setup2, _c, _gcTimeout, _d, _initialState, _revertState, _cache, _client, _retryer, _defaultOptions, _abortSignalConsumed, _dispatch, dispatch_fn, _e, _client2, _currentQuery, _currentQueryInitialState, _currentResult, _currentResultState, _currentResultOptions, _currentThenable, _selectError, _selectFn, _selectResult, _lastQueryWithDefinedData, _staleTimeoutId, _refetchIntervalId, _currentRefetchInterval, _trackedProps, _executeFetch, executeFetch_fn, _updateStaleTimeout, updateStaleTimeout_fn, _computeRefetchInterval, computeRefetchInterval_fn, _updateRefetchInterval, updateRefetchInterval_fn, _updateTimers, updateTimers_fn, _clearStaleTimeout, clearStaleTimeout_fn, _clearRefetchInterval, clearRefetchInterval_fn, _updateQuery, updateQuery_fn, _notify, notify_fn, _f, _client3, _observers, _mutationCache, _retryer2, _dispatch2, dispatch_fn2, _g, _mutations, _scopes, _mutationId, _h, _client4, _currentResult2, _currentMutation, _mutateOptions, _updateResult, updateResult_fn, _notify2, notify_fn2, _i, _queries, _j, _queryCache, _mutationCache2, _defaultOptions2, _queryDefaults, _mutationDefaults, _mountCount, _unsubscribeFocus, _unsubscribeOnline, _k;
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity)
      fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy)
      fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var l$1 = Symbol.for("react.element"), n$1 = Symbol.for("react.portal"), p$2 = Symbol.for("react.fragment"), q$1 = Symbol.for("react.strict_mode"), r$1 = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z$1 = Symbol.iterator;
function A$1(a) {
  if (null === a || "object" !== typeof a)
    return null;
  a = z$1 && a[z$1] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var B$1 = { isMounted: function() {
  return false;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, C$1 = Object.assign, D$1 = {};
function E$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
E$1.prototype.isReactComponent = {};
E$1.prototype.setState = function(a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a)
    throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, a, b, "setState");
};
E$1.prototype.forceUpdate = function(a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};
function F() {
}
F.prototype = E$1.prototype;
function G$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
var H$1 = G$1.prototype = new F();
H$1.constructor = G$1;
C$1(H$1, E$1.prototype);
H$1.isPureReactComponent = true;
var I$1 = Array.isArray, J = Object.prototype.hasOwnProperty, K$1 = { current: null }, L$1 = { key: true, ref: true, __self: true, __source: true };
function M$1(a, b, e) {
  var d, c = {}, k2 = null, h = null;
  if (null != b)
    for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b)
      J.call(b, d) && !L$1.hasOwnProperty(d) && (c[d] = b[d]);
  var g = arguments.length - 2;
  if (1 === g)
    c.children = e;
  else if (1 < g) {
    for (var f2 = Array(g), m2 = 0; m2 < g; m2++)
      f2[m2] = arguments[m2 + 2];
    c.children = f2;
  }
  if (a && a.defaultProps)
    for (d in g = a.defaultProps, g)
      void 0 === c[d] && (c[d] = g[d]);
  return { $$typeof: l$1, type: a, key: k2, ref: h, props: c, _owner: K$1.current };
}
function N$1(a, b) {
  return { $$typeof: l$1, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
}
function O$1(a) {
  return "object" === typeof a && null !== a && a.$$typeof === l$1;
}
function escape(a) {
  var b = { "=": "=0", ":": "=2" };
  return "$" + a.replace(/[=:]/g, function(a2) {
    return b[a2];
  });
}
var P$1 = /\/+/g;
function Q$1(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
}
function R$1(a, b, e, d, c) {
  var k2 = typeof a;
  if ("undefined" === k2 || "boolean" === k2)
    a = null;
  var h = false;
  if (null === a)
    h = true;
  else
    switch (k2) {
      case "string":
      case "number":
        h = true;
        break;
      case "object":
        switch (a.$$typeof) {
          case l$1:
          case n$1:
            h = true;
        }
    }
  if (h)
    return h = a, c = c(h), a = "" === d ? "." + Q$1(h, 0) : d, I$1(c) ? (e = "", null != a && (e = a.replace(P$1, "$&/") + "/"), R$1(c, b, e, "", function(a2) {
      return a2;
    })) : null != c && (O$1(c) && (c = N$1(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P$1, "$&/") + "/") + a)), b.push(c)), 1;
  h = 0;
  d = "" === d ? "." : d + ":";
  if (I$1(a))
    for (var g = 0; g < a.length; g++) {
      k2 = a[g];
      var f2 = d + Q$1(k2, g);
      h += R$1(k2, b, e, f2, c);
    }
  else if (f2 = A$1(a), "function" === typeof f2)
    for (a = f2.call(a), g = 0; !(k2 = a.next()).done; )
      k2 = k2.value, f2 = d + Q$1(k2, g++), h += R$1(k2, b, e, f2, c);
  else if ("object" === k2)
    throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
  return h;
}
function S$1(a, b, e) {
  if (null == a)
    return a;
  var d = [], c = 0;
  R$1(a, d, "", "", function(a2) {
    return b.call(e, a2, c++);
  });
  return d;
}
function T$1(a) {
  if (-1 === a._status) {
    var b = a._result;
    b = b();
    b.then(function(b2) {
      if (0 === a._status || -1 === a._status)
        a._status = 1, a._result = b2;
    }, function(b2) {
      if (0 === a._status || -1 === a._status)
        a._status = 2, a._result = b2;
    });
    -1 === a._status && (a._status = 0, a._result = b);
  }
  if (1 === a._status)
    return a._result.default;
  throw a._result;
}
var U$1 = { current: null }, V$1 = { transition: null }, W$1 = { ReactCurrentDispatcher: U$1, ReactCurrentBatchConfig: V$1, ReactCurrentOwner: K$1 };
function X$2() {
  throw Error("act(...) is not supported in production builds of React.");
}
react_production_min.Children = { map: S$1, forEach: function(a, b, e) {
  S$1(a, function() {
    b.apply(this, arguments);
  }, e);
}, count: function(a) {
  var b = 0;
  S$1(a, function() {
    b++;
  });
  return b;
}, toArray: function(a) {
  return S$1(a, function(a2) {
    return a2;
  }) || [];
}, only: function(a) {
  if (!O$1(a))
    throw Error("React.Children.only expected to receive a single React element child.");
  return a;
} };
react_production_min.Component = E$1;
react_production_min.Fragment = p$2;
react_production_min.Profiler = r$1;
react_production_min.PureComponent = G$1;
react_production_min.StrictMode = q$1;
react_production_min.Suspense = w;
react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$1;
react_production_min.act = X$2;
react_production_min.cloneElement = function(a, b, e) {
  if (null === a || void 0 === a)
    throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
  var d = C$1({}, a.props), c = a.key, k2 = a.ref, h = a._owner;
  if (null != b) {
    void 0 !== b.ref && (k2 = b.ref, h = K$1.current);
    void 0 !== b.key && (c = "" + b.key);
    if (a.type && a.type.defaultProps)
      var g = a.type.defaultProps;
    for (f2 in b)
      J.call(b, f2) && !L$1.hasOwnProperty(f2) && (d[f2] = void 0 === b[f2] && void 0 !== g ? g[f2] : b[f2]);
  }
  var f2 = arguments.length - 2;
  if (1 === f2)
    d.children = e;
  else if (1 < f2) {
    g = Array(f2);
    for (var m2 = 0; m2 < f2; m2++)
      g[m2] = arguments[m2 + 2];
    d.children = g;
  }
  return { $$typeof: l$1, type: a.type, key: c, ref: k2, props: d, _owner: h };
};
react_production_min.createContext = function(a) {
  a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
  a.Provider = { $$typeof: t, _context: a };
  return a.Consumer = a;
};
react_production_min.createElement = M$1;
react_production_min.createFactory = function(a) {
  var b = M$1.bind(null, a);
  b.type = a;
  return b;
};
react_production_min.createRef = function() {
  return { current: null };
};
react_production_min.forwardRef = function(a) {
  return { $$typeof: v$1, render: a };
};
react_production_min.isValidElement = O$1;
react_production_min.lazy = function(a) {
  return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T$1 };
};
react_production_min.memo = function(a, b) {
  return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
};
react_production_min.startTransition = function(a) {
  var b = V$1.transition;
  V$1.transition = {};
  try {
    a();
  } finally {
    V$1.transition = b;
  }
};
react_production_min.unstable_act = X$2;
react_production_min.useCallback = function(a, b) {
  return U$1.current.useCallback(a, b);
};
react_production_min.useContext = function(a) {
  return U$1.current.useContext(a);
};
react_production_min.useDebugValue = function() {
};
react_production_min.useDeferredValue = function(a) {
  return U$1.current.useDeferredValue(a);
};
react_production_min.useEffect = function(a, b) {
  return U$1.current.useEffect(a, b);
};
react_production_min.useId = function() {
  return U$1.current.useId();
};
react_production_min.useImperativeHandle = function(a, b, e) {
  return U$1.current.useImperativeHandle(a, b, e);
};
react_production_min.useInsertionEffect = function(a, b) {
  return U$1.current.useInsertionEffect(a, b);
};
react_production_min.useLayoutEffect = function(a, b) {
  return U$1.current.useLayoutEffect(a, b);
};
react_production_min.useMemo = function(a, b) {
  return U$1.current.useMemo(a, b);
};
react_production_min.useReducer = function(a, b, e) {
  return U$1.current.useReducer(a, b, e);
};
react_production_min.useRef = function(a) {
  return U$1.current.useRef(a);
};
react_production_min.useState = function(a) {
  return U$1.current.useState(a);
};
react_production_min.useSyncExternalStore = function(a, b, e) {
  return U$1.current.useSyncExternalStore(a, b, e);
};
react_production_min.useTransition = function() {
  return U$1.current.useTransition();
};
react_production_min.version = "18.3.1";
{
  react.exports = react_production_min;
}
var reactExports = react.exports;
const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f = reactExports, k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m$1 = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p$1 = { key: true, ref: true, __self: true, __source: true };
function q(c, a, g) {
  var b, d = {}, e = null, h = null;
  void 0 !== g && (e = "" + g);
  void 0 !== a.key && (e = "" + a.key);
  void 0 !== a.ref && (h = a.ref);
  for (b in a)
    m$1.call(a, b) && !p$1.hasOwnProperty(b) && (d[b] = a[b]);
  if (c && c.defaultProps)
    for (b in a = c.defaultProps, a)
      void 0 === d[b] && (d[b] = a[b]);
  return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
}
reactJsxRuntime_production_min.Fragment = l;
reactJsxRuntime_production_min.jsx = q;
reactJsxRuntime_production_min.jsxs = q;
{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}
var jsxRuntimeExports = jsxRuntime.exports;
var client = {};
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function(exports) {
  function f2(a, b) {
    var c = a.length;
    a.push(b);
    a:
      for (; 0 < c; ) {
        var d = c - 1 >>> 1, e = a[d];
        if (0 < g(e, b))
          a[d] = b, a[c] = e, c = d;
        else
          break a;
      }
  }
  function h(a) {
    return 0 === a.length ? null : a[0];
  }
  function k2(a) {
    if (0 === a.length)
      return null;
    var b = a[0], c = a.pop();
    if (c !== b) {
      a[0] = c;
      a:
        for (var d = 0, e = a.length, w2 = e >>> 1; d < w2; ) {
          var m2 = 2 * (d + 1) - 1, C2 = a[m2], n2 = m2 + 1, x2 = a[n2];
          if (0 > g(C2, c))
            n2 < e && 0 > g(x2, C2) ? (a[d] = x2, a[n2] = c, d = n2) : (a[d] = C2, a[m2] = c, d = m2);
          else if (n2 < e && 0 > g(x2, c))
            a[d] = x2, a[n2] = c, d = n2;
          else
            break a;
        }
    }
    return b;
  }
  function g(a, b) {
    var c = a.sortIndex - b.sortIndex;
    return 0 !== c ? c : a.id - b.id;
  }
  if ("object" === typeof performance && "function" === typeof performance.now) {
    var l2 = performance;
    exports.unstable_now = function() {
      return l2.now();
    };
  } else {
    var p2 = Date, q2 = p2.now();
    exports.unstable_now = function() {
      return p2.now() - q2;
    };
  }
  var r2 = [], t2 = [], u2 = 1, v2 = null, y2 = 3, z2 = false, A2 = false, B2 = false, D2 = "function" === typeof setTimeout ? setTimeout : null, E2 = "function" === typeof clearTimeout ? clearTimeout : null, F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
  "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function G2(a) {
    for (var b = h(t2); null !== b; ) {
      if (null === b.callback)
        k2(t2);
      else if (b.startTime <= a)
        k2(t2), b.sortIndex = b.expirationTime, f2(r2, b);
      else
        break;
      b = h(t2);
    }
  }
  function H2(a) {
    B2 = false;
    G2(a);
    if (!A2)
      if (null !== h(r2))
        A2 = true, I2(J2);
      else {
        var b = h(t2);
        null !== b && K2(H2, b.startTime - a);
      }
  }
  function J2(a, b) {
    A2 = false;
    B2 && (B2 = false, E2(L2), L2 = -1);
    z2 = true;
    var c = y2;
    try {
      G2(b);
      for (v2 = h(r2); null !== v2 && (!(v2.expirationTime > b) || a && !M2()); ) {
        var d = v2.callback;
        if ("function" === typeof d) {
          v2.callback = null;
          y2 = v2.priorityLevel;
          var e = d(v2.expirationTime <= b);
          b = exports.unstable_now();
          "function" === typeof e ? v2.callback = e : v2 === h(r2) && k2(r2);
          G2(b);
        } else
          k2(r2);
        v2 = h(r2);
      }
      if (null !== v2)
        var w2 = true;
      else {
        var m2 = h(t2);
        null !== m2 && K2(H2, m2.startTime - b);
        w2 = false;
      }
      return w2;
    } finally {
      v2 = null, y2 = c, z2 = false;
    }
  }
  var N2 = false, O2 = null, L2 = -1, P2 = 5, Q2 = -1;
  function M2() {
    return exports.unstable_now() - Q2 < P2 ? false : true;
  }
  function R2() {
    if (null !== O2) {
      var a = exports.unstable_now();
      Q2 = a;
      var b = true;
      try {
        b = O2(true, a);
      } finally {
        b ? S2() : (N2 = false, O2 = null);
      }
    } else
      N2 = false;
  }
  var S2;
  if ("function" === typeof F2)
    S2 = function() {
      F2(R2);
    };
  else if ("undefined" !== typeof MessageChannel) {
    var T2 = new MessageChannel(), U2 = T2.port2;
    T2.port1.onmessage = R2;
    S2 = function() {
      U2.postMessage(null);
    };
  } else
    S2 = function() {
      D2(R2, 0);
    };
  function I2(a) {
    O2 = a;
    N2 || (N2 = true, S2());
  }
  function K2(a, b) {
    L2 = D2(function() {
      a(exports.unstable_now());
    }, b);
  }
  exports.unstable_IdlePriority = 5;
  exports.unstable_ImmediatePriority = 1;
  exports.unstable_LowPriority = 4;
  exports.unstable_NormalPriority = 3;
  exports.unstable_Profiling = null;
  exports.unstable_UserBlockingPriority = 2;
  exports.unstable_cancelCallback = function(a) {
    a.callback = null;
  };
  exports.unstable_continueExecution = function() {
    A2 || z2 || (A2 = true, I2(J2));
  };
  exports.unstable_forceFrameRate = function(a) {
    0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P2 = 0 < a ? Math.floor(1e3 / a) : 5;
  };
  exports.unstable_getCurrentPriorityLevel = function() {
    return y2;
  };
  exports.unstable_getFirstCallbackNode = function() {
    return h(r2);
  };
  exports.unstable_next = function(a) {
    switch (y2) {
      case 1:
      case 2:
      case 3:
        var b = 3;
        break;
      default:
        b = y2;
    }
    var c = y2;
    y2 = b;
    try {
      return a();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_pauseExecution = function() {
  };
  exports.unstable_requestPaint = function() {
  };
  exports.unstable_runWithPriority = function(a, b) {
    switch (a) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        a = 3;
    }
    var c = y2;
    y2 = a;
    try {
      return b();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_scheduleCallback = function(a, b, c) {
    var d = exports.unstable_now();
    "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
    switch (a) {
      case 1:
        var e = -1;
        break;
      case 2:
        e = 250;
        break;
      case 5:
        e = 1073741823;
        break;
      case 4:
        e = 1e4;
        break;
      default:
        e = 5e3;
    }
    e = c + e;
    a = { id: u2++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
    c > d ? (a.sortIndex = c, f2(t2, a), null === h(r2) && a === h(t2) && (B2 ? (E2(L2), L2 = -1) : B2 = true, K2(H2, c - d))) : (a.sortIndex = e, f2(r2, a), A2 || z2 || (A2 = true, I2(J2)));
    return a;
  };
  exports.unstable_shouldYield = M2;
  exports.unstable_wrapCallback = function(a) {
    var b = y2;
    return function() {
      var c = y2;
      y2 = b;
      try {
        return a.apply(this, arguments);
      } finally {
        y2 = c;
      }
    };
  };
})(scheduler_production_min);
{
  scheduler.exports = scheduler_production_min;
}
var schedulerExports = scheduler.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var aa = reactExports, ca = schedulerExports;
function p(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++)
    b += "&args[]=" + encodeURIComponent(arguments[c]);
  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var da = /* @__PURE__ */ new Set(), ea = {};
function fa(a, b) {
  ha(a, b);
  ha(a + "Capture", b);
}
function ha(a, b) {
  ea[a] = b;
  for (a = 0; a < b.length; a++)
    da.add(b[a]);
}
var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
function oa(a) {
  if (ja.call(ma, a))
    return true;
  if (ja.call(la, a))
    return false;
  if (ka.test(a))
    return ma[a] = true;
  la[a] = true;
  return false;
}
function pa(a, b, c, d) {
  if (null !== c && 0 === c.type)
    return false;
  switch (typeof b) {
    case "function":
    case "symbol":
      return true;
    case "boolean":
      if (d)
        return false;
      if (null !== c)
        return !c.acceptsBooleans;
      a = a.toLowerCase().slice(0, 5);
      return "data-" !== a && "aria-" !== a;
    default:
      return false;
  }
}
function qa(a, b, c, d) {
  if (null === b || "undefined" === typeof b || pa(a, b, c, d))
    return true;
  if (d)
    return false;
  if (null !== c)
    switch (c.type) {
      case 3:
        return !b;
      case 4:
        return false === b;
      case 5:
        return isNaN(b);
      case 6:
        return isNaN(b) || 1 > b;
    }
  return false;
}
function v(a, b, c, d, e, f2, g) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e;
  this.mustUseProperty = c;
  this.propertyName = a;
  this.type = b;
  this.sanitizeURL = f2;
  this.removeEmptyString = g;
}
var z = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
  z[a] = new v(a, 0, false, a, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
  var b = a[0];
  z[b] = new v(b, 1, false, a[1], null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
  z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
  z[a] = new v(a, 2, false, a, null, false, false);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
  z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function(a) {
  z[a] = new v(a, 3, true, a, null, false, false);
});
["capture", "download"].forEach(function(a) {
  z[a] = new v(a, 4, false, a, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function(a) {
  z[a] = new v(a, 6, false, a, null, false, false);
});
["rowSpan", "start"].forEach(function(a) {
  z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
});
var ra = /[\-:]([a-z])/g;
function sa(a) {
  return a[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
  var b = a.replace(
    ra,
    sa
  );
  z[b] = new v(b, 1, false, a, null, false, false);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
});
z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
});
function ta(a, b, c, d) {
  var e = z.hasOwnProperty(b) ? z[b] : null;
  if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1])
    qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
}
var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
var Ia = Symbol.for("react.offscreen");
var Ja = Symbol.iterator;
function Ka(a) {
  if (null === a || "object" !== typeof a)
    return null;
  a = Ja && a[Ja] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var A = Object.assign, La;
function Ma(a) {
  if (void 0 === La)
    try {
      throw Error();
    } catch (c) {
      var b = c.stack.trim().match(/\n( *(at )?)/);
      La = b && b[1] || "";
    }
  return "\n" + La + a;
}
var Na = false;
function Oa(a, b) {
  if (!a || Na)
    return "";
  Na = true;
  var c = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (b)
      if (b = function() {
        throw Error();
      }, Object.defineProperty(b.prototype, "props", { set: function() {
        throw Error();
      } }), "object" === typeof Reflect && Reflect.construct) {
        try {
          Reflect.construct(b, []);
        } catch (l2) {
          var d = l2;
        }
        Reflect.construct(a, [], b);
      } else {
        try {
          b.call();
        } catch (l2) {
          d = l2;
        }
        a.call(b.prototype);
      }
    else {
      try {
        throw Error();
      } catch (l2) {
        d = l2;
      }
      a();
    }
  } catch (l2) {
    if (l2 && d && "string" === typeof l2.stack) {
      for (var e = l2.stack.split("\n"), f2 = d.stack.split("\n"), g = e.length - 1, h = f2.length - 1; 1 <= g && 0 <= h && e[g] !== f2[h]; )
        h--;
      for (; 1 <= g && 0 <= h; g--, h--)
        if (e[g] !== f2[h]) {
          if (1 !== g || 1 !== h) {
            do
              if (g--, h--, 0 > h || e[g] !== f2[h]) {
                var k2 = "\n" + e[g].replace(" at new ", " at ");
                a.displayName && k2.includes("<anonymous>") && (k2 = k2.replace("<anonymous>", a.displayName));
                return k2;
              }
            while (1 <= g && 0 <= h);
          }
          break;
        }
    }
  } finally {
    Na = false, Error.prepareStackTrace = c;
  }
  return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
}
function Pa(a) {
  switch (a.tag) {
    case 5:
      return Ma(a.type);
    case 16:
      return Ma("Lazy");
    case 13:
      return Ma("Suspense");
    case 19:
      return Ma("SuspenseList");
    case 0:
    case 2:
    case 15:
      return a = Oa(a.type, false), a;
    case 11:
      return a = Oa(a.type.render, false), a;
    case 1:
      return a = Oa(a.type, true), a;
    default:
      return "";
  }
}
function Qa(a) {
  if (null == a)
    return null;
  if ("function" === typeof a)
    return a.displayName || a.name || null;
  if ("string" === typeof a)
    return a;
  switch (a) {
    case ya:
      return "Fragment";
    case wa:
      return "Portal";
    case Aa:
      return "Profiler";
    case za:
      return "StrictMode";
    case Ea:
      return "Suspense";
    case Fa:
      return "SuspenseList";
  }
  if ("object" === typeof a)
    switch (a.$$typeof) {
      case Ca:
        return (a.displayName || "Context") + ".Consumer";
      case Ba:
        return (a._context.displayName || "Context") + ".Provider";
      case Da:
        var b = a.render;
        a = a.displayName;
        a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
        return a;
      case Ga:
        return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
      case Ha:
        b = a._payload;
        a = a._init;
        try {
          return Qa(a(b));
        } catch (c) {
        }
    }
  return null;
}
function Ra(a) {
  var b = a.type;
  switch (a.tag) {
    case 24:
      return "Cache";
    case 9:
      return (b.displayName || "Context") + ".Consumer";
    case 10:
      return (b._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return b;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Qa(b);
    case 8:
      return b === za ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if ("function" === typeof b)
        return b.displayName || b.name || null;
      if ("string" === typeof b)
        return b;
  }
  return null;
}
function Sa(a) {
  switch (typeof a) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return a;
    case "object":
      return a;
    default:
      return "";
  }
}
function Ta(a) {
  var b = a.type;
  return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
}
function Ua(a) {
  var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
  if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
    var e = c.get, f2 = c.set;
    Object.defineProperty(a, b, { configurable: true, get: function() {
      return e.call(this);
    }, set: function(a2) {
      d = "" + a2;
      f2.call(this, a2);
    } });
    Object.defineProperty(a, b, { enumerable: c.enumerable });
    return { getValue: function() {
      return d;
    }, setValue: function(a2) {
      d = "" + a2;
    }, stopTracking: function() {
      a._valueTracker = null;
      delete a[b];
    } };
  }
}
function Va(a) {
  a._valueTracker || (a._valueTracker = Ua(a));
}
function Wa(a) {
  if (!a)
    return false;
  var b = a._valueTracker;
  if (!b)
    return true;
  var c = b.getValue();
  var d = "";
  a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
  a = d;
  return a !== c ? (b.setValue(a), true) : false;
}
function Xa(a) {
  a = a || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a)
    return null;
  try {
    return a.activeElement || a.body;
  } catch (b) {
    return a.body;
  }
}
function Ya(a, b) {
  var c = b.checked;
  return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
}
function Za(a, b) {
  var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
  c = Sa(null != b.value ? b.value : c);
  a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
}
function ab(a, b) {
  b = b.checked;
  null != b && ta(a, "checked", b, false);
}
function bb(a, b) {
  ab(a, b);
  var c = Sa(b.value), d = b.type;
  if (null != c)
    if ("number" === d) {
      if (0 === c && "" === a.value || a.value != c)
        a.value = "" + c;
    } else
      a.value !== "" + c && (a.value = "" + c);
  else if ("submit" === d || "reset" === d) {
    a.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
}
function db(a, b, c) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value))
      return;
    b = "" + a._wrapperState.initialValue;
    c || b === a.value || (a.value = b);
    a.defaultValue = b;
  }
  c = a.name;
  "" !== c && (a.name = "");
  a.defaultChecked = !!a._wrapperState.initialChecked;
  "" !== c && (a.name = c);
}
function cb(a, b, c) {
  if ("number" !== b || Xa(a.ownerDocument) !== a)
    null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
}
var eb = Array.isArray;
function fb(a, b, c, d) {
  a = a.options;
  if (b) {
    b = {};
    for (var e = 0; e < c.length; e++)
      b["$" + c[e]] = true;
    for (c = 0; c < a.length; c++)
      e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
  } else {
    c = "" + Sa(c);
    b = null;
    for (e = 0; e < a.length; e++) {
      if (a[e].value === c) {
        a[e].selected = true;
        d && (a[e].defaultSelected = true);
        return;
      }
      null !== b || a[e].disabled || (b = a[e]);
    }
    null !== b && (b.selected = true);
  }
}
function gb(a, b) {
  if (null != b.dangerouslySetInnerHTML)
    throw Error(p(91));
  return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
}
function hb(a, b) {
  var c = b.value;
  if (null == c) {
    c = b.children;
    b = b.defaultValue;
    if (null != c) {
      if (null != b)
        throw Error(p(92));
      if (eb(c)) {
        if (1 < c.length)
          throw Error(p(93));
        c = c[0];
      }
      b = c;
    }
    null == b && (b = "");
    c = b;
  }
  a._wrapperState = { initialValue: Sa(c) };
}
function ib(a, b) {
  var c = Sa(b.value), d = Sa(b.defaultValue);
  null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
  null != d && (a.defaultValue = "" + d);
}
function jb(a) {
  var b = a.textContent;
  b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
}
function kb(a) {
  switch (a) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function lb(a, b) {
  return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
}
var mb, nb = function(a) {
  return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
    MSApp.execUnsafeLocalFunction(function() {
      return a(b, c, d, e);
    });
  } : a;
}(function(a, b) {
  if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a)
    a.innerHTML = b;
  else {
    mb = mb || document.createElement("div");
    mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
    for (b = mb.firstChild; a.firstChild; )
      a.removeChild(a.firstChild);
    for (; b.firstChild; )
      a.appendChild(b.firstChild);
  }
});
function ob(a, b) {
  if (b) {
    var c = a.firstChild;
    if (c && c === a.lastChild && 3 === c.nodeType) {
      c.nodeValue = b;
      return;
    }
  }
  a.textContent = b;
}
var pb = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
}, qb = ["Webkit", "ms", "Moz", "O"];
Object.keys(pb).forEach(function(a) {
  qb.forEach(function(b) {
    b = b + a.charAt(0).toUpperCase() + a.substring(1);
    pb[b] = pb[a];
  });
});
function rb(a, b, c) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
}
function sb(a, b) {
  a = a.style;
  for (var c in b)
    if (b.hasOwnProperty(c)) {
      var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
      "float" === c && (c = "cssFloat");
      d ? a.setProperty(c, e) : a[c] = e;
    }
}
var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
function ub(a, b) {
  if (b) {
    if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML))
      throw Error(p(137, a));
    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children)
        throw Error(p(60));
      if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML))
        throw Error(p(61));
    }
    if (null != b.style && "object" !== typeof b.style)
      throw Error(p(62));
  }
}
function vb(a, b) {
  if (-1 === a.indexOf("-"))
    return "string" === typeof b.is;
  switch (a) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var wb = null;
function xb(a) {
  a = a.target || a.srcElement || window;
  a.correspondingUseElement && (a = a.correspondingUseElement);
  return 3 === a.nodeType ? a.parentNode : a;
}
var yb = null, zb = null, Ab = null;
function Bb(a) {
  if (a = Cb(a)) {
    if ("function" !== typeof yb)
      throw Error(p(280));
    var b = a.stateNode;
    b && (b = Db(b), yb(a.stateNode, a.type, b));
  }
}
function Eb(a) {
  zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
}
function Fb() {
  if (zb) {
    var a = zb, b = Ab;
    Ab = zb = null;
    Bb(a);
    if (b)
      for (a = 0; a < b.length; a++)
        Bb(b[a]);
  }
}
function Gb(a, b) {
  return a(b);
}
function Hb() {
}
var Ib = false;
function Jb(a, b, c) {
  if (Ib)
    return a(b, c);
  Ib = true;
  try {
    return Gb(a, b, c);
  } finally {
    if (Ib = false, null !== zb || null !== Ab)
      Hb(), Fb();
  }
}
function Kb(a, b) {
  var c = a.stateNode;
  if (null === c)
    return null;
  var d = Db(c);
  if (null === d)
    return null;
  c = d[b];
  a:
    switch (b) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
        a = !d;
        break a;
      default:
        a = false;
    }
  if (a)
    return null;
  if (c && "function" !== typeof c)
    throw Error(p(231, b, typeof c));
  return c;
}
var Lb = false;
if (ia)
  try {
    var Mb = {};
    Object.defineProperty(Mb, "passive", { get: function() {
      Lb = true;
    } });
    window.addEventListener("test", Mb, Mb);
    window.removeEventListener("test", Mb, Mb);
  } catch (a) {
    Lb = false;
  }
function Nb(a, b, c, d, e, f2, g, h, k2) {
  var l2 = Array.prototype.slice.call(arguments, 3);
  try {
    b.apply(c, l2);
  } catch (m2) {
    this.onError(m2);
  }
}
var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
  Ob = true;
  Pb = a;
} };
function Tb(a, b, c, d, e, f2, g, h, k2) {
  Ob = false;
  Pb = null;
  Nb.apply(Sb, arguments);
}
function Ub(a, b, c, d, e, f2, g, h, k2) {
  Tb.apply(this, arguments);
  if (Ob) {
    if (Ob) {
      var l2 = Pb;
      Ob = false;
      Pb = null;
    } else
      throw Error(p(198));
    Qb || (Qb = true, Rb = l2);
  }
}
function Vb(a) {
  var b = a, c = a;
  if (a.alternate)
    for (; b.return; )
      b = b.return;
  else {
    a = b;
    do
      b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
    while (a);
  }
  return 3 === b.tag ? c : null;
}
function Wb(a) {
  if (13 === a.tag) {
    var b = a.memoizedState;
    null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
    if (null !== b)
      return b.dehydrated;
  }
  return null;
}
function Xb(a) {
  if (Vb(a) !== a)
    throw Error(p(188));
}
function Yb(a) {
  var b = a.alternate;
  if (!b) {
    b = Vb(a);
    if (null === b)
      throw Error(p(188));
    return b !== a ? null : a;
  }
  for (var c = a, d = b; ; ) {
    var e = c.return;
    if (null === e)
      break;
    var f2 = e.alternate;
    if (null === f2) {
      d = e.return;
      if (null !== d) {
        c = d;
        continue;
      }
      break;
    }
    if (e.child === f2.child) {
      for (f2 = e.child; f2; ) {
        if (f2 === c)
          return Xb(e), a;
        if (f2 === d)
          return Xb(e), b;
        f2 = f2.sibling;
      }
      throw Error(p(188));
    }
    if (c.return !== d.return)
      c = e, d = f2;
    else {
      for (var g = false, h = e.child; h; ) {
        if (h === c) {
          g = true;
          c = e;
          d = f2;
          break;
        }
        if (h === d) {
          g = true;
          d = e;
          c = f2;
          break;
        }
        h = h.sibling;
      }
      if (!g) {
        for (h = f2.child; h; ) {
          if (h === c) {
            g = true;
            c = f2;
            d = e;
            break;
          }
          if (h === d) {
            g = true;
            d = f2;
            c = e;
            break;
          }
          h = h.sibling;
        }
        if (!g)
          throw Error(p(189));
      }
    }
    if (c.alternate !== d)
      throw Error(p(190));
  }
  if (3 !== c.tag)
    throw Error(p(188));
  return c.stateNode.current === c ? a : b;
}
function Zb(a) {
  a = Yb(a);
  return null !== a ? $b(a) : null;
}
function $b(a) {
  if (5 === a.tag || 6 === a.tag)
    return a;
  for (a = a.child; null !== a; ) {
    var b = $b(a);
    if (null !== b)
      return b;
    a = a.sibling;
  }
  return null;
}
var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
function mc(a) {
  if (lc && "function" === typeof lc.onCommitFiberRoot)
    try {
      lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
    } catch (b) {
    }
}
var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
function nc(a) {
  a >>>= 0;
  return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
}
var rc = 64, sc = 4194304;
function tc(a) {
  switch (a & -a) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return a & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return a & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return a;
  }
}
function uc(a, b) {
  var c = a.pendingLanes;
  if (0 === c)
    return 0;
  var d = 0, e = a.suspendedLanes, f2 = a.pingedLanes, g = c & 268435455;
  if (0 !== g) {
    var h = g & ~e;
    0 !== h ? d = tc(h) : (f2 &= g, 0 !== f2 && (d = tc(f2)));
  } else
    g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f2 && (d = tc(f2));
  if (0 === d)
    return 0;
  if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f2 = b & -b, e >= f2 || 16 === e && 0 !== (f2 & 4194240)))
    return b;
  0 !== (d & 4) && (d |= c & 16);
  b = a.entangledLanes;
  if (0 !== b)
    for (a = a.entanglements, b &= d; 0 < b; )
      c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
  return d;
}
function vc(a, b) {
  switch (a) {
    case 1:
    case 2:
    case 4:
      return b + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return b + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function wc(a, b) {
  for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f2 = a.pendingLanes; 0 < f2; ) {
    var g = 31 - oc(f2), h = 1 << g, k2 = e[g];
    if (-1 === k2) {
      if (0 === (h & c) || 0 !== (h & d))
        e[g] = vc(h, b);
    } else
      k2 <= b && (a.expiredLanes |= h);
    f2 &= ~h;
  }
}
function xc(a) {
  a = a.pendingLanes & -1073741825;
  return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
}
function yc() {
  var a = rc;
  rc <<= 1;
  0 === (rc & 4194240) && (rc = 64);
  return a;
}
function zc(a) {
  for (var b = [], c = 0; 31 > c; c++)
    b.push(a);
  return b;
}
function Ac(a, b, c) {
  a.pendingLanes |= b;
  536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
  a = a.eventTimes;
  b = 31 - oc(b);
  a[b] = c;
}
function Bc(a, b) {
  var c = a.pendingLanes & ~b;
  a.pendingLanes = b;
  a.suspendedLanes = 0;
  a.pingedLanes = 0;
  a.expiredLanes &= b;
  a.mutableReadLanes &= b;
  a.entangledLanes &= b;
  b = a.entanglements;
  var d = a.eventTimes;
  for (a = a.expirationTimes; 0 < c; ) {
    var e = 31 - oc(c), f2 = 1 << e;
    b[e] = 0;
    d[e] = -1;
    a[e] = -1;
    c &= ~f2;
  }
}
function Cc(a, b) {
  var c = a.entangledLanes |= b;
  for (a = a.entanglements; c; ) {
    var d = 31 - oc(c), e = 1 << d;
    e & b | a[d] & b && (a[d] |= b);
    c &= ~e;
  }
}
var C = 0;
function Dc(a) {
  a &= -a;
  return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
}
var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Sc(a, b) {
  switch (a) {
    case "focusin":
    case "focusout":
      Lc = null;
      break;
    case "dragenter":
    case "dragleave":
      Mc = null;
      break;
    case "mouseover":
    case "mouseout":
      Nc = null;
      break;
    case "pointerover":
    case "pointerout":
      Oc.delete(b.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Pc.delete(b.pointerId);
  }
}
function Tc(a, b, c, d, e, f2) {
  if (null === a || a.nativeEvent !== f2)
    return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f2, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
  a.eventSystemFlags |= d;
  b = a.targetContainers;
  null !== e && -1 === b.indexOf(e) && b.push(e);
  return a;
}
function Uc(a, b, c, d, e) {
  switch (b) {
    case "focusin":
      return Lc = Tc(Lc, a, b, c, d, e), true;
    case "dragenter":
      return Mc = Tc(Mc, a, b, c, d, e), true;
    case "mouseover":
      return Nc = Tc(Nc, a, b, c, d, e), true;
    case "pointerover":
      var f2 = e.pointerId;
      Oc.set(f2, Tc(Oc.get(f2) || null, a, b, c, d, e));
      return true;
    case "gotpointercapture":
      return f2 = e.pointerId, Pc.set(f2, Tc(Pc.get(f2) || null, a, b, c, d, e)), true;
  }
  return false;
}
function Vc(a) {
  var b = Wc(a.target);
  if (null !== b) {
    var c = Vb(b);
    if (null !== c) {
      if (b = c.tag, 13 === b) {
        if (b = Wb(c), null !== b) {
          a.blockedOn = b;
          Ic(a.priority, function() {
            Gc(c);
          });
          return;
        }
      } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
        a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
        return;
      }
    }
  }
  a.blockedOn = null;
}
function Xc(a) {
  if (null !== a.blockedOn)
    return false;
  for (var b = a.targetContainers; 0 < b.length; ) {
    var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
    if (null === c) {
      c = a.nativeEvent;
      var d = new c.constructor(c.type, c);
      wb = d;
      c.target.dispatchEvent(d);
      wb = null;
    } else
      return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
    b.shift();
  }
  return true;
}
function Zc(a, b, c) {
  Xc(a) && c.delete(b);
}
function $c() {
  Jc = false;
  null !== Lc && Xc(Lc) && (Lc = null);
  null !== Mc && Xc(Mc) && (Mc = null);
  null !== Nc && Xc(Nc) && (Nc = null);
  Oc.forEach(Zc);
  Pc.forEach(Zc);
}
function ad(a, b) {
  a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
}
function bd(a) {
  function b(b2) {
    return ad(b2, a);
  }
  if (0 < Kc.length) {
    ad(Kc[0], a);
    for (var c = 1; c < Kc.length; c++) {
      var d = Kc[c];
      d.blockedOn === a && (d.blockedOn = null);
    }
  }
  null !== Lc && ad(Lc, a);
  null !== Mc && ad(Mc, a);
  null !== Nc && ad(Nc, a);
  Oc.forEach(b);
  Pc.forEach(b);
  for (c = 0; c < Qc.length; c++)
    d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
  for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); )
    Vc(c), null === c.blockedOn && Qc.shift();
}
var cd = ua.ReactCurrentBatchConfig, dd = true;
function ed(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 1, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function gd(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 4, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function fd(a, b, c, d) {
  if (dd) {
    var e = Yc(a, b, c, d);
    if (null === e)
      hd(a, b, d, id, c), Sc(a, d);
    else if (Uc(e, a, b, c, d))
      d.stopPropagation();
    else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
      for (; null !== e; ) {
        var f2 = Cb(e);
        null !== f2 && Ec(f2);
        f2 = Yc(a, b, c, d);
        null === f2 && hd(a, b, d, id, c);
        if (f2 === e)
          break;
        e = f2;
      }
      null !== e && d.stopPropagation();
    } else
      hd(a, b, d, null, c);
  }
}
var id = null;
function Yc(a, b, c, d) {
  id = null;
  a = xb(d);
  a = Wc(a);
  if (null !== a)
    if (b = Vb(a), null === b)
      a = null;
    else if (c = b.tag, 13 === c) {
      a = Wb(b);
      if (null !== a)
        return a;
      a = null;
    } else if (3 === c) {
      if (b.stateNode.current.memoizedState.isDehydrated)
        return 3 === b.tag ? b.stateNode.containerInfo : null;
      a = null;
    } else
      b !== a && (a = null);
  id = a;
  return null;
}
function jd(a) {
  switch (a) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (ec()) {
        case fc:
          return 1;
        case gc:
          return 4;
        case hc:
        case ic:
          return 16;
        case jc:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var kd = null, ld = null, md = null;
function nd() {
  if (md)
    return md;
  var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f2 = e.length;
  for (a = 0; a < c && b[a] === e[a]; a++)
    ;
  var g = c - a;
  for (d = 1; d <= g && b[c - d] === e[f2 - d]; d++)
    ;
  return md = e.slice(a, 1 < d ? 1 - d : void 0);
}
function od(a) {
  var b = a.keyCode;
  "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
  10 === a && (a = 13);
  return 32 <= a || 13 === a ? a : 0;
}
function pd() {
  return true;
}
function qd() {
  return false;
}
function rd(a) {
  function b(b2, d, e, f2, g) {
    this._reactName = b2;
    this._targetInst = e;
    this.type = d;
    this.nativeEvent = f2;
    this.target = g;
    this.currentTarget = null;
    for (var c in a)
      a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f2) : f2[c]);
    this.isDefaultPrevented = (null != f2.defaultPrevented ? f2.defaultPrevented : false === f2.returnValue) ? pd : qd;
    this.isPropagationStopped = qd;
    return this;
  }
  A(b.prototype, { preventDefault: function() {
    this.defaultPrevented = true;
    var a2 = this.nativeEvent;
    a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
  }, stopPropagation: function() {
    var a2 = this.nativeEvent;
    a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
  }, persist: function() {
  }, isPersistent: pd });
  return b;
}
var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
  return a.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
  return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
}, movementX: function(a) {
  if ("movementX" in a)
    return a.movementX;
  a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
  return wd;
}, movementY: function(a) {
  return "movementY" in a ? a.movementY : xd;
} }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
  return "clipboardData" in a ? a.clipboardData : window.clipboardData;
} }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, Nd = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function Pd(a) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
}
function zd() {
  return Pd;
}
var Qd = A({}, ud, { key: function(a) {
  if (a.key) {
    var b = Md[a.key] || a.key;
    if ("Unidentified" !== b)
      return b;
  }
  return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
  return "keypress" === a.type ? od(a) : 0;
}, keyCode: function(a) {
  return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
}, which: function(a) {
  return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
} }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
  deltaX: function(a) {
    return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
  },
  deltaY: function(a) {
    return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
ia && "documentMode" in document && (be = document.documentMode);
var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
function ge(a, b) {
  switch (a) {
    case "keyup":
      return -1 !== $d.indexOf(b.keyCode);
    case "keydown":
      return 229 !== b.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return true;
    default:
      return false;
  }
}
function he(a) {
  a = a.detail;
  return "object" === typeof a && "data" in a ? a.data : null;
}
var ie = false;
function je(a, b) {
  switch (a) {
    case "compositionend":
      return he(b);
    case "keypress":
      if (32 !== b.which)
        return null;
      fe = true;
      return ee;
    case "textInput":
      return a = b.data, a === ee && fe ? null : a;
    default:
      return null;
  }
}
function ke(a, b) {
  if (ie)
    return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
  switch (a) {
    case "paste":
      return null;
    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length)
          return b.char;
        if (b.which)
          return String.fromCharCode(b.which);
      }
      return null;
    case "compositionend":
      return de && "ko" !== b.locale ? null : b.data;
    default:
      return null;
  }
}
var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
function me(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
}
function ne(a, b, c, d) {
  Eb(d);
  b = oe(b, "onChange");
  0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
}
var pe = null, qe = null;
function re(a) {
  se(a, 0);
}
function te(a) {
  var b = ue(a);
  if (Wa(b))
    return a;
}
function ve(a, b) {
  if ("change" === a)
    return b;
}
var we = false;
if (ia) {
  var xe;
  if (ia) {
    var ye = "oninput" in document;
    if (!ye) {
      var ze = document.createElement("div");
      ze.setAttribute("oninput", "return;");
      ye = "function" === typeof ze.oninput;
    }
    xe = ye;
  } else
    xe = false;
  we = xe && (!document.documentMode || 9 < document.documentMode);
}
function Ae() {
  pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
}
function Be(a) {
  if ("value" === a.propertyName && te(qe)) {
    var b = [];
    ne(b, qe, a, xb(a));
    Jb(re, b);
  }
}
function Ce(a, b, c) {
  "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
}
function De(a) {
  if ("selectionchange" === a || "keyup" === a || "keydown" === a)
    return te(qe);
}
function Ee(a, b) {
  if ("click" === a)
    return te(b);
}
function Fe(a, b) {
  if ("input" === a || "change" === a)
    return te(b);
}
function Ge(a, b) {
  return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
}
var He = "function" === typeof Object.is ? Object.is : Ge;
function Ie(a, b) {
  if (He(a, b))
    return true;
  if ("object" !== typeof a || null === a || "object" !== typeof b || null === b)
    return false;
  var c = Object.keys(a), d = Object.keys(b);
  if (c.length !== d.length)
    return false;
  for (d = 0; d < c.length; d++) {
    var e = c[d];
    if (!ja.call(b, e) || !He(a[e], b[e]))
      return false;
  }
  return true;
}
function Je(a) {
  for (; a && a.firstChild; )
    a = a.firstChild;
  return a;
}
function Ke(a, b) {
  var c = Je(a);
  a = 0;
  for (var d; c; ) {
    if (3 === c.nodeType) {
      d = a + c.textContent.length;
      if (a <= b && d >= b)
        return { node: c, offset: b - a };
      a = d;
    }
    a: {
      for (; c; ) {
        if (c.nextSibling) {
          c = c.nextSibling;
          break a;
        }
        c = c.parentNode;
      }
      c = void 0;
    }
    c = Je(c);
  }
}
function Le(a, b) {
  return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
}
function Me() {
  for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
    try {
      var c = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c = false;
    }
    if (c)
      a = b.contentWindow;
    else
      break;
    b = Xa(a.document);
  }
  return b;
}
function Ne(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
}
function Oe(a) {
  var b = Me(), c = a.focusedElem, d = a.selectionRange;
  if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
    if (null !== d && Ne(c)) {
      if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c)
        c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
      else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
        a = a.getSelection();
        var e = c.textContent.length, f2 = Math.min(d.start, e);
        d = void 0 === d.end ? f2 : Math.min(d.end, e);
        !a.extend && f2 > d && (e = d, d = f2, f2 = e);
        e = Ke(c, f2);
        var g = Ke(
          c,
          d
        );
        e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f2 > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
      }
    }
    b = [];
    for (a = c; a = a.parentNode; )
      1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
    "function" === typeof c.focus && c.focus();
    for (c = 0; c < b.length; c++)
      a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
  }
}
var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
function Ue(a, b, c) {
  var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
  Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
}
function Ve(a, b) {
  var c = {};
  c[a.toLowerCase()] = b.toLowerCase();
  c["Webkit" + a] = "webkit" + b;
  c["Moz" + a] = "moz" + b;
  return c;
}
var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
function Ze(a) {
  if (Xe[a])
    return Xe[a];
  if (!We[a])
    return a;
  var b = We[a], c;
  for (c in b)
    if (b.hasOwnProperty(c) && c in Ye)
      return Xe[a] = b[c];
  return a;
}
var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ff(a, b) {
  df.set(a, b);
  fa(b, [a]);
}
for (var gf = 0; gf < ef.length; gf++) {
  var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
  ff(jf, "on" + kf);
}
ff($e, "onAnimationEnd");
ff(af, "onAnimationIteration");
ff(bf, "onAnimationStart");
ff("dblclick", "onDoubleClick");
ff("focusin", "onFocus");
ff("focusout", "onBlur");
ff(cf, "onTransitionEnd");
ha("onMouseEnter", ["mouseout", "mouseover"]);
ha("onMouseLeave", ["mouseout", "mouseover"]);
ha("onPointerEnter", ["pointerout", "pointerover"]);
ha("onPointerLeave", ["pointerout", "pointerover"]);
fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
function nf(a, b, c) {
  var d = a.type || "unknown-event";
  a.currentTarget = c;
  Ub(d, b, void 0, a);
  a.currentTarget = null;
}
function se(a, b) {
  b = 0 !== (b & 4);
  for (var c = 0; c < a.length; c++) {
    var d = a[c], e = d.event;
    d = d.listeners;
    a: {
      var f2 = void 0;
      if (b)
        for (var g = d.length - 1; 0 <= g; g--) {
          var h = d[g], k2 = h.instance, l2 = h.currentTarget;
          h = h.listener;
          if (k2 !== f2 && e.isPropagationStopped())
            break a;
          nf(e, h, l2);
          f2 = k2;
        }
      else
        for (g = 0; g < d.length; g++) {
          h = d[g];
          k2 = h.instance;
          l2 = h.currentTarget;
          h = h.listener;
          if (k2 !== f2 && e.isPropagationStopped())
            break a;
          nf(e, h, l2);
          f2 = k2;
        }
    }
  }
  if (Qb)
    throw a = Rb, Qb = false, Rb = null, a;
}
function D(a, b) {
  var c = b[of];
  void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
  var d = a + "__bubble";
  c.has(d) || (pf(b, a, 2, false), c.add(d));
}
function qf(a, b, c) {
  var d = 0;
  b && (d |= 4);
  pf(c, a, d, b);
}
var rf = "_reactListening" + Math.random().toString(36).slice(2);
function sf(a) {
  if (!a[rf]) {
    a[rf] = true;
    da.forEach(function(b2) {
      "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
    });
    var b = 9 === a.nodeType ? a : a.ownerDocument;
    null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
  }
}
function pf(a, b, c, d) {
  switch (jd(b)) {
    case 1:
      var e = ed;
      break;
    case 4:
      e = gd;
      break;
    default:
      e = fd;
  }
  c = e.bind(null, b, c, a);
  e = void 0;
  !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
  d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
}
function hd(a, b, c, d, e) {
  var f2 = d;
  if (0 === (b & 1) && 0 === (b & 2) && null !== d)
    a:
      for (; ; ) {
        if (null === d)
          return;
        var g = d.tag;
        if (3 === g || 4 === g) {
          var h = d.stateNode.containerInfo;
          if (h === e || 8 === h.nodeType && h.parentNode === e)
            break;
          if (4 === g)
            for (g = d.return; null !== g; ) {
              var k2 = g.tag;
              if (3 === k2 || 4 === k2) {
                if (k2 = g.stateNode.containerInfo, k2 === e || 8 === k2.nodeType && k2.parentNode === e)
                  return;
              }
              g = g.return;
            }
          for (; null !== h; ) {
            g = Wc(h);
            if (null === g)
              return;
            k2 = g.tag;
            if (5 === k2 || 6 === k2) {
              d = f2 = g;
              continue a;
            }
            h = h.parentNode;
          }
        }
        d = d.return;
      }
  Jb(function() {
    var d2 = f2, e2 = xb(c), g2 = [];
    a: {
      var h2 = df.get(a);
      if (void 0 !== h2) {
        var k3 = td, n2 = a;
        switch (a) {
          case "keypress":
            if (0 === od(c))
              break a;
          case "keydown":
          case "keyup":
            k3 = Rd;
            break;
          case "focusin":
            n2 = "focus";
            k3 = Fd;
            break;
          case "focusout":
            n2 = "blur";
            k3 = Fd;
            break;
          case "beforeblur":
          case "afterblur":
            k3 = Fd;
            break;
          case "click":
            if (2 === c.button)
              break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            k3 = Bd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            k3 = Dd;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            k3 = Vd;
            break;
          case $e:
          case af:
          case bf:
            k3 = Hd;
            break;
          case cf:
            k3 = Xd;
            break;
          case "scroll":
            k3 = vd;
            break;
          case "wheel":
            k3 = Zd;
            break;
          case "copy":
          case "cut":
          case "paste":
            k3 = Jd;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            k3 = Td;
        }
        var t2 = 0 !== (b & 4), J2 = !t2 && "scroll" === a, x2 = t2 ? null !== h2 ? h2 + "Capture" : null : h2;
        t2 = [];
        for (var w2 = d2, u2; null !== w2; ) {
          u2 = w2;
          var F2 = u2.stateNode;
          5 === u2.tag && null !== F2 && (u2 = F2, null !== x2 && (F2 = Kb(w2, x2), null != F2 && t2.push(tf(w2, F2, u2))));
          if (J2)
            break;
          w2 = w2.return;
        }
        0 < t2.length && (h2 = new k3(h2, n2, null, c, e2), g2.push({ event: h2, listeners: t2 }));
      }
    }
    if (0 === (b & 7)) {
      a: {
        h2 = "mouseover" === a || "pointerover" === a;
        k3 = "mouseout" === a || "pointerout" === a;
        if (h2 && c !== wb && (n2 = c.relatedTarget || c.fromElement) && (Wc(n2) || n2[uf]))
          break a;
        if (k3 || h2) {
          h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
          if (k3) {
            if (n2 = c.relatedTarget || c.toElement, k3 = d2, n2 = n2 ? Wc(n2) : null, null !== n2 && (J2 = Vb(n2), n2 !== J2 || 5 !== n2.tag && 6 !== n2.tag))
              n2 = null;
          } else
            k3 = null, n2 = d2;
          if (k3 !== n2) {
            t2 = Bd;
            F2 = "onMouseLeave";
            x2 = "onMouseEnter";
            w2 = "mouse";
            if ("pointerout" === a || "pointerover" === a)
              t2 = Td, F2 = "onPointerLeave", x2 = "onPointerEnter", w2 = "pointer";
            J2 = null == k3 ? h2 : ue(k3);
            u2 = null == n2 ? h2 : ue(n2);
            h2 = new t2(F2, w2 + "leave", k3, c, e2);
            h2.target = J2;
            h2.relatedTarget = u2;
            F2 = null;
            Wc(e2) === d2 && (t2 = new t2(x2, w2 + "enter", n2, c, e2), t2.target = u2, t2.relatedTarget = J2, F2 = t2);
            J2 = F2;
            if (k3 && n2)
              b: {
                t2 = k3;
                x2 = n2;
                w2 = 0;
                for (u2 = t2; u2; u2 = vf(u2))
                  w2++;
                u2 = 0;
                for (F2 = x2; F2; F2 = vf(F2))
                  u2++;
                for (; 0 < w2 - u2; )
                  t2 = vf(t2), w2--;
                for (; 0 < u2 - w2; )
                  x2 = vf(x2), u2--;
                for (; w2--; ) {
                  if (t2 === x2 || null !== x2 && t2 === x2.alternate)
                    break b;
                  t2 = vf(t2);
                  x2 = vf(x2);
                }
                t2 = null;
              }
            else
              t2 = null;
            null !== k3 && wf(g2, h2, k3, t2, false);
            null !== n2 && null !== J2 && wf(g2, J2, n2, t2, true);
          }
        }
      }
      a: {
        h2 = d2 ? ue(d2) : window;
        k3 = h2.nodeName && h2.nodeName.toLowerCase();
        if ("select" === k3 || "input" === k3 && "file" === h2.type)
          var na = ve;
        else if (me(h2))
          if (we)
            na = Fe;
          else {
            na = De;
            var xa = Ce;
          }
        else
          (k3 = h2.nodeName) && "input" === k3.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
        if (na && (na = na(a, d2))) {
          ne(g2, na, c, e2);
          break a;
        }
        xa && xa(a, h2, d2);
        "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
      }
      xa = d2 ? ue(d2) : window;
      switch (a) {
        case "focusin":
          if (me(xa) || "true" === xa.contentEditable)
            Qe = xa, Re = d2, Se = null;
          break;
        case "focusout":
          Se = Re = Qe = null;
          break;
        case "mousedown":
          Te = true;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Te = false;
          Ue(g2, c, e2);
          break;
        case "selectionchange":
          if (Pe)
            break;
        case "keydown":
        case "keyup":
          Ue(g2, c, e2);
      }
      var $a;
      if (ae)
        b: {
          switch (a) {
            case "compositionstart":
              var ba = "onCompositionStart";
              break b;
            case "compositionend":
              ba = "onCompositionEnd";
              break b;
            case "compositionupdate":
              ba = "onCompositionUpdate";
              break b;
          }
          ba = void 0;
        }
      else
        ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
      ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
      if ($a = ce ? je(a, c) : ke(a, c))
        d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
    }
    se(g2, b);
  });
}
function tf(a, b, c) {
  return { instance: a, listener: b, currentTarget: c };
}
function oe(a, b) {
  for (var c = b + "Capture", d = []; null !== a; ) {
    var e = a, f2 = e.stateNode;
    5 === e.tag && null !== f2 && (e = f2, f2 = Kb(a, c), null != f2 && d.unshift(tf(a, f2, e)), f2 = Kb(a, b), null != f2 && d.push(tf(a, f2, e)));
    a = a.return;
  }
  return d;
}
function vf(a) {
  if (null === a)
    return null;
  do
    a = a.return;
  while (a && 5 !== a.tag);
  return a ? a : null;
}
function wf(a, b, c, d, e) {
  for (var f2 = b._reactName, g = []; null !== c && c !== d; ) {
    var h = c, k2 = h.alternate, l2 = h.stateNode;
    if (null !== k2 && k2 === d)
      break;
    5 === h.tag && null !== l2 && (h = l2, e ? (k2 = Kb(c, f2), null != k2 && g.unshift(tf(c, k2, h))) : e || (k2 = Kb(c, f2), null != k2 && g.push(tf(c, k2, h))));
    c = c.return;
  }
  0 !== g.length && a.push({ event: b, listeners: g });
}
var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
function zf(a) {
  return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
}
function Af(a, b, c) {
  b = zf(b);
  if (zf(a) !== b && c)
    throw Error(p(425));
}
function Bf() {
}
var Cf = null, Df = null;
function Ef(a, b) {
  return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}
var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
  return Hf.resolve(null).then(a).catch(If);
} : Ff;
function If(a) {
  setTimeout(function() {
    throw a;
  });
}
function Kf(a, b) {
  var c = b, d = 0;
  do {
    var e = c.nextSibling;
    a.removeChild(c);
    if (e && 8 === e.nodeType)
      if (c = e.data, "/$" === c) {
        if (0 === d) {
          a.removeChild(e);
          bd(b);
          return;
        }
        d--;
      } else
        "$" !== c && "$?" !== c && "$!" !== c || d++;
    c = e;
  } while (c);
  bd(b);
}
function Lf(a) {
  for (; null != a; a = a.nextSibling) {
    var b = a.nodeType;
    if (1 === b || 3 === b)
      break;
    if (8 === b) {
      b = a.data;
      if ("$" === b || "$!" === b || "$?" === b)
        break;
      if ("/$" === b)
        return null;
    }
  }
  return a;
}
function Mf(a) {
  a = a.previousSibling;
  for (var b = 0; a; ) {
    if (8 === a.nodeType) {
      var c = a.data;
      if ("$" === c || "$!" === c || "$?" === c) {
        if (0 === b)
          return a;
        b--;
      } else
        "/$" === c && b++;
    }
    a = a.previousSibling;
  }
  return null;
}
var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
function Wc(a) {
  var b = a[Of];
  if (b)
    return b;
  for (var c = a.parentNode; c; ) {
    if (b = c[uf] || c[Of]) {
      c = b.alternate;
      if (null !== b.child || null !== c && null !== c.child)
        for (a = Mf(a); null !== a; ) {
          if (c = a[Of])
            return c;
          a = Mf(a);
        }
      return b;
    }
    a = c;
    c = a.parentNode;
  }
  return null;
}
function Cb(a) {
  a = a[Of] || a[uf];
  return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
}
function ue(a) {
  if (5 === a.tag || 6 === a.tag)
    return a.stateNode;
  throw Error(p(33));
}
function Db(a) {
  return a[Pf] || null;
}
var Sf = [], Tf = -1;
function Uf(a) {
  return { current: a };
}
function E(a) {
  0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
}
function G(a, b) {
  Tf++;
  Sf[Tf] = a.current;
  a.current = b;
}
var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
function Yf(a, b) {
  var c = a.type.contextTypes;
  if (!c)
    return Vf;
  var d = a.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b)
    return d.__reactInternalMemoizedMaskedChildContext;
  var e = {}, f2;
  for (f2 in c)
    e[f2] = b[f2];
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
  return e;
}
function Zf(a) {
  a = a.childContextTypes;
  return null !== a && void 0 !== a;
}
function $f() {
  E(Wf);
  E(H);
}
function ag(a, b, c) {
  if (H.current !== Vf)
    throw Error(p(168));
  G(H, b);
  G(Wf, c);
}
function bg(a, b, c) {
  var d = a.stateNode;
  b = b.childContextTypes;
  if ("function" !== typeof d.getChildContext)
    return c;
  d = d.getChildContext();
  for (var e in d)
    if (!(e in b))
      throw Error(p(108, Ra(a) || "Unknown", e));
  return A({}, c, d);
}
function cg(a) {
  a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
  Xf = H.current;
  G(H, a);
  G(Wf, Wf.current);
  return true;
}
function dg(a, b, c) {
  var d = a.stateNode;
  if (!d)
    throw Error(p(169));
  c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
  G(Wf, c);
}
var eg = null, fg = false, gg = false;
function hg(a) {
  null === eg ? eg = [a] : eg.push(a);
}
function ig(a) {
  fg = true;
  hg(a);
}
function jg() {
  if (!gg && null !== eg) {
    gg = true;
    var a = 0, b = C;
    try {
      var c = eg;
      for (C = 1; a < c.length; a++) {
        var d = c[a];
        do
          d = d(true);
        while (null !== d);
      }
      eg = null;
      fg = false;
    } catch (e) {
      throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
    } finally {
      C = b, gg = false;
    }
  }
  return null;
}
var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
function tg(a, b) {
  kg[lg++] = ng;
  kg[lg++] = mg;
  mg = a;
  ng = b;
}
function ug(a, b, c) {
  og[pg++] = rg;
  og[pg++] = sg;
  og[pg++] = qg;
  qg = a;
  var d = rg;
  a = sg;
  var e = 32 - oc(d) - 1;
  d &= ~(1 << e);
  c += 1;
  var f2 = 32 - oc(b) + e;
  if (30 < f2) {
    var g = e - e % 5;
    f2 = (d & (1 << g) - 1).toString(32);
    d >>= g;
    e -= g;
    rg = 1 << 32 - oc(b) + e | c << e | d;
    sg = f2 + a;
  } else
    rg = 1 << f2 | c << e | d, sg = a;
}
function vg(a) {
  null !== a.return && (tg(a, 1), ug(a, 1, 0));
}
function wg(a) {
  for (; a === mg; )
    mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
  for (; a === qg; )
    qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
}
var xg = null, yg = null, I = false, zg = null;
function Ag(a, b) {
  var c = Bg(5, null, null, 0);
  c.elementType = "DELETED";
  c.stateNode = b;
  c.return = a;
  b = a.deletions;
  null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
}
function Cg(a, b) {
  switch (a.tag) {
    case 5:
      var c = a.type;
      b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
    case 6:
      return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
    case 13:
      return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
    default:
      return false;
  }
}
function Dg(a) {
  return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
}
function Eg(a) {
  if (I) {
    var b = yg;
    if (b) {
      var c = b;
      if (!Cg(a, b)) {
        if (Dg(a))
          throw Error(p(418));
        b = Lf(c.nextSibling);
        var d = xg;
        b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
      }
    } else {
      if (Dg(a))
        throw Error(p(418));
      a.flags = a.flags & -4097 | 2;
      I = false;
      xg = a;
    }
  }
}
function Fg(a) {
  for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; )
    a = a.return;
  xg = a;
}
function Gg(a) {
  if (a !== xg)
    return false;
  if (!I)
    return Fg(a), I = true, false;
  var b;
  (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
  if (b && (b = yg)) {
    if (Dg(a))
      throw Hg(), Error(p(418));
    for (; b; )
      Ag(a, b), b = Lf(b.nextSibling);
  }
  Fg(a);
  if (13 === a.tag) {
    a = a.memoizedState;
    a = null !== a ? a.dehydrated : null;
    if (!a)
      throw Error(p(317));
    a: {
      a = a.nextSibling;
      for (b = 0; a; ) {
        if (8 === a.nodeType) {
          var c = a.data;
          if ("/$" === c) {
            if (0 === b) {
              yg = Lf(a.nextSibling);
              break a;
            }
            b--;
          } else
            "$" !== c && "$!" !== c && "$?" !== c || b++;
        }
        a = a.nextSibling;
      }
      yg = null;
    }
  } else
    yg = xg ? Lf(a.stateNode.nextSibling) : null;
  return true;
}
function Hg() {
  for (var a = yg; a; )
    a = Lf(a.nextSibling);
}
function Ig() {
  yg = xg = null;
  I = false;
}
function Jg(a) {
  null === zg ? zg = [a] : zg.push(a);
}
var Kg = ua.ReactCurrentBatchConfig;
function Lg(a, b, c) {
  a = c.ref;
  if (null !== a && "function" !== typeof a && "object" !== typeof a) {
    if (c._owner) {
      c = c._owner;
      if (c) {
        if (1 !== c.tag)
          throw Error(p(309));
        var d = c.stateNode;
      }
      if (!d)
        throw Error(p(147, a));
      var e = d, f2 = "" + a;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f2)
        return b.ref;
      b = function(a2) {
        var b2 = e.refs;
        null === a2 ? delete b2[f2] : b2[f2] = a2;
      };
      b._stringRef = f2;
      return b;
    }
    if ("string" !== typeof a)
      throw Error(p(284));
    if (!c._owner)
      throw Error(p(290, a));
  }
  return a;
}
function Mg(a, b) {
  a = Object.prototype.toString.call(b);
  throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
}
function Ng(a) {
  var b = a._init;
  return b(a._payload);
}
function Og(a) {
  function b(b2, c2) {
    if (a) {
      var d2 = b2.deletions;
      null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
    }
  }
  function c(c2, d2) {
    if (!a)
      return null;
    for (; null !== d2; )
      b(c2, d2), d2 = d2.sibling;
    return null;
  }
  function d(a2, b2) {
    for (a2 = /* @__PURE__ */ new Map(); null !== b2; )
      null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
    return a2;
  }
  function e(a2, b2) {
    a2 = Pg(a2, b2);
    a2.index = 0;
    a2.sibling = null;
    return a2;
  }
  function f2(b2, c2, d2) {
    b2.index = d2;
    if (!a)
      return b2.flags |= 1048576, c2;
    d2 = b2.alternate;
    if (null !== d2)
      return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
    b2.flags |= 2;
    return c2;
  }
  function g(b2) {
    a && null === b2.alternate && (b2.flags |= 2);
    return b2;
  }
  function h(a2, b2, c2, d2) {
    if (null === b2 || 6 !== b2.tag)
      return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function k2(a2, b2, c2, d2) {
    var f3 = c2.type;
    if (f3 === ya)
      return m2(a2, b2, c2.props.children, d2, c2.key);
    if (null !== b2 && (b2.elementType === f3 || "object" === typeof f3 && null !== f3 && f3.$$typeof === Ha && Ng(f3) === b2.type))
      return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
    d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
    d2.ref = Lg(a2, b2, c2);
    d2.return = a2;
    return d2;
  }
  function l2(a2, b2, c2, d2) {
    if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation)
      return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2.children || []);
    b2.return = a2;
    return b2;
  }
  function m2(a2, b2, c2, d2, f3) {
    if (null === b2 || 7 !== b2.tag)
      return b2 = Tg(c2, a2.mode, d2, f3), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function q2(a2, b2, c2) {
    if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2)
      return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
    if ("object" === typeof b2 && null !== b2) {
      switch (b2.$$typeof) {
        case va:
          return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
        case wa:
          return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
        case Ha:
          var d2 = b2._init;
          return q2(a2, d2(b2._payload), c2);
      }
      if (eb(b2) || Ka(b2))
        return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
      Mg(a2, b2);
    }
    return null;
  }
  function r2(a2, b2, c2, d2) {
    var e2 = null !== b2 ? b2.key : null;
    if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2)
      return null !== e2 ? null : h(a2, b2, "" + c2, d2);
    if ("object" === typeof c2 && null !== c2) {
      switch (c2.$$typeof) {
        case va:
          return c2.key === e2 ? k2(a2, b2, c2, d2) : null;
        case wa:
          return c2.key === e2 ? l2(a2, b2, c2, d2) : null;
        case Ha:
          return e2 = c2._init, r2(
            a2,
            b2,
            e2(c2._payload),
            d2
          );
      }
      if (eb(c2) || Ka(c2))
        return null !== e2 ? null : m2(a2, b2, c2, d2, null);
      Mg(a2, c2);
    }
    return null;
  }
  function y2(a2, b2, c2, d2, e2) {
    if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2)
      return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
    if ("object" === typeof d2 && null !== d2) {
      switch (d2.$$typeof) {
        case va:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k2(b2, a2, d2, e2);
        case wa:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l2(b2, a2, d2, e2);
        case Ha:
          var f3 = d2._init;
          return y2(a2, b2, c2, f3(d2._payload), e2);
      }
      if (eb(d2) || Ka(d2))
        return a2 = a2.get(c2) || null, m2(b2, a2, d2, e2, null);
      Mg(b2, d2);
    }
    return null;
  }
  function n2(e2, g2, h2, k3) {
    for (var l3 = null, m3 = null, u2 = g2, w2 = g2 = 0, x2 = null; null !== u2 && w2 < h2.length; w2++) {
      u2.index > w2 ? (x2 = u2, u2 = null) : x2 = u2.sibling;
      var n3 = r2(e2, u2, h2[w2], k3);
      if (null === n3) {
        null === u2 && (u2 = x2);
        break;
      }
      a && u2 && null === n3.alternate && b(e2, u2);
      g2 = f2(n3, g2, w2);
      null === m3 ? l3 = n3 : m3.sibling = n3;
      m3 = n3;
      u2 = x2;
    }
    if (w2 === h2.length)
      return c(e2, u2), I && tg(e2, w2), l3;
    if (null === u2) {
      for (; w2 < h2.length; w2++)
        u2 = q2(e2, h2[w2], k3), null !== u2 && (g2 = f2(u2, g2, w2), null === m3 ? l3 = u2 : m3.sibling = u2, m3 = u2);
      I && tg(e2, w2);
      return l3;
    }
    for (u2 = d(e2, u2); w2 < h2.length; w2++)
      x2 = y2(u2, e2, w2, h2[w2], k3), null !== x2 && (a && null !== x2.alternate && u2.delete(null === x2.key ? w2 : x2.key), g2 = f2(x2, g2, w2), null === m3 ? l3 = x2 : m3.sibling = x2, m3 = x2);
    a && u2.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function t2(e2, g2, h2, k3) {
    var l3 = Ka(h2);
    if ("function" !== typeof l3)
      throw Error(p(150));
    h2 = l3.call(h2);
    if (null == h2)
      throw Error(p(151));
    for (var u2 = l3 = null, m3 = g2, w2 = g2 = 0, x2 = null, n3 = h2.next(); null !== m3 && !n3.done; w2++, n3 = h2.next()) {
      m3.index > w2 ? (x2 = m3, m3 = null) : x2 = m3.sibling;
      var t3 = r2(e2, m3, n3.value, k3);
      if (null === t3) {
        null === m3 && (m3 = x2);
        break;
      }
      a && m3 && null === t3.alternate && b(e2, m3);
      g2 = f2(t3, g2, w2);
      null === u2 ? l3 = t3 : u2.sibling = t3;
      u2 = t3;
      m3 = x2;
    }
    if (n3.done)
      return c(
        e2,
        m3
      ), I && tg(e2, w2), l3;
    if (null === m3) {
      for (; !n3.done; w2++, n3 = h2.next())
        n3 = q2(e2, n3.value, k3), null !== n3 && (g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
      I && tg(e2, w2);
      return l3;
    }
    for (m3 = d(e2, m3); !n3.done; w2++, n3 = h2.next())
      n3 = y2(m3, e2, w2, n3.value, k3), null !== n3 && (a && null !== n3.alternate && m3.delete(null === n3.key ? w2 : n3.key), g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
    a && m3.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function J2(a2, d2, f3, h2) {
    "object" === typeof f3 && null !== f3 && f3.type === ya && null === f3.key && (f3 = f3.props.children);
    if ("object" === typeof f3 && null !== f3) {
      switch (f3.$$typeof) {
        case va:
          a: {
            for (var k3 = f3.key, l3 = d2; null !== l3; ) {
              if (l3.key === k3) {
                k3 = f3.type;
                if (k3 === ya) {
                  if (7 === l3.tag) {
                    c(a2, l3.sibling);
                    d2 = e(l3, f3.props.children);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                } else if (l3.elementType === k3 || "object" === typeof k3 && null !== k3 && k3.$$typeof === Ha && Ng(k3) === l3.type) {
                  c(a2, l3.sibling);
                  d2 = e(l3, f3.props);
                  d2.ref = Lg(a2, l3, f3);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                }
                c(a2, l3);
                break;
              } else
                b(a2, l3);
              l3 = l3.sibling;
            }
            f3.type === ya ? (d2 = Tg(f3.props.children, a2.mode, h2, f3.key), d2.return = a2, a2 = d2) : (h2 = Rg(f3.type, f3.key, f3.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f3), h2.return = a2, a2 = h2);
          }
          return g(a2);
        case wa:
          a: {
            for (l3 = f3.key; null !== d2; ) {
              if (d2.key === l3)
                if (4 === d2.tag && d2.stateNode.containerInfo === f3.containerInfo && d2.stateNode.implementation === f3.implementation) {
                  c(a2, d2.sibling);
                  d2 = e(d2, f3.children || []);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                } else {
                  c(a2, d2);
                  break;
                }
              else
                b(a2, d2);
              d2 = d2.sibling;
            }
            d2 = Sg(f3, a2.mode, h2);
            d2.return = a2;
            a2 = d2;
          }
          return g(a2);
        case Ha:
          return l3 = f3._init, J2(a2, d2, l3(f3._payload), h2);
      }
      if (eb(f3))
        return n2(a2, d2, f3, h2);
      if (Ka(f3))
        return t2(a2, d2, f3, h2);
      Mg(a2, f3);
    }
    return "string" === typeof f3 && "" !== f3 || "number" === typeof f3 ? (f3 = "" + f3, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f3), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f3, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
  }
  return J2;
}
var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
function $g() {
  Zg = Yg = Xg = null;
}
function ah(a) {
  var b = Wg.current;
  E(Wg);
  a._currentValue = b;
}
function bh(a, b, c) {
  for (; null !== a; ) {
    var d = a.alternate;
    (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
    if (a === c)
      break;
    a = a.return;
  }
}
function ch(a, b) {
  Xg = a;
  Zg = Yg = null;
  a = a.dependencies;
  null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
}
function eh(a) {
  var b = a._currentValue;
  if (Zg !== a)
    if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
      if (null === Xg)
        throw Error(p(308));
      Yg = a;
      Xg.dependencies = { lanes: 0, firstContext: a };
    } else
      Yg = Yg.next = a;
  return b;
}
var fh = null;
function gh(a) {
  null === fh ? fh = [a] : fh.push(a);
}
function hh(a, b, c, d) {
  var e = b.interleaved;
  null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
  b.interleaved = c;
  return ih(a, d);
}
function ih(a, b) {
  a.lanes |= b;
  var c = a.alternate;
  null !== c && (c.lanes |= b);
  c = a;
  for (a = a.return; null !== a; )
    a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
  return 3 === c.tag ? c.stateNode : null;
}
var jh = false;
function kh(a) {
  a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function lh(a, b) {
  a = a.updateQueue;
  b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
}
function mh(a, b) {
  return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
}
function nh(a, b, c) {
  var d = a.updateQueue;
  if (null === d)
    return null;
  d = d.shared;
  if (0 !== (K & 2)) {
    var e = d.pending;
    null === e ? b.next = b : (b.next = e.next, e.next = b);
    d.pending = b;
    return ih(a, c);
  }
  e = d.interleaved;
  null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
  d.interleaved = b;
  return ih(a, c);
}
function oh(a, b, c) {
  b = b.updateQueue;
  if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
function ph(a, b) {
  var c = a.updateQueue, d = a.alternate;
  if (null !== d && (d = d.updateQueue, c === d)) {
    var e = null, f2 = null;
    c = c.firstBaseUpdate;
    if (null !== c) {
      do {
        var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
        null === f2 ? e = f2 = g : f2 = f2.next = g;
        c = c.next;
      } while (null !== c);
      null === f2 ? e = f2 = b : f2 = f2.next = b;
    } else
      e = f2 = b;
    c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f2, shared: d.shared, effects: d.effects };
    a.updateQueue = c;
    return;
  }
  a = c.lastBaseUpdate;
  null === a ? c.firstBaseUpdate = b : a.next = b;
  c.lastBaseUpdate = b;
}
function qh(a, b, c, d) {
  var e = a.updateQueue;
  jh = false;
  var f2 = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
  if (null !== h) {
    e.shared.pending = null;
    var k2 = h, l2 = k2.next;
    k2.next = null;
    null === g ? f2 = l2 : g.next = l2;
    g = k2;
    var m2 = a.alternate;
    null !== m2 && (m2 = m2.updateQueue, h = m2.lastBaseUpdate, h !== g && (null === h ? m2.firstBaseUpdate = l2 : h.next = l2, m2.lastBaseUpdate = k2));
  }
  if (null !== f2) {
    var q2 = e.baseState;
    g = 0;
    m2 = l2 = k2 = null;
    h = f2;
    do {
      var r2 = h.lane, y2 = h.eventTime;
      if ((d & r2) === r2) {
        null !== m2 && (m2 = m2.next = {
          eventTime: y2,
          lane: 0,
          tag: h.tag,
          payload: h.payload,
          callback: h.callback,
          next: null
        });
        a: {
          var n2 = a, t2 = h;
          r2 = b;
          y2 = c;
          switch (t2.tag) {
            case 1:
              n2 = t2.payload;
              if ("function" === typeof n2) {
                q2 = n2.call(y2, q2, r2);
                break a;
              }
              q2 = n2;
              break a;
            case 3:
              n2.flags = n2.flags & -65537 | 128;
            case 0:
              n2 = t2.payload;
              r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
              if (null === r2 || void 0 === r2)
                break a;
              q2 = A({}, q2, r2);
              break a;
            case 2:
              jh = true;
          }
        }
        null !== h.callback && 0 !== h.lane && (a.flags |= 64, r2 = e.effects, null === r2 ? e.effects = [h] : r2.push(h));
      } else
        y2 = { eventTime: y2, lane: r2, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m2 ? (l2 = m2 = y2, k2 = q2) : m2 = m2.next = y2, g |= r2;
      h = h.next;
      if (null === h)
        if (h = e.shared.pending, null === h)
          break;
        else
          r2 = h, h = r2.next, r2.next = null, e.lastBaseUpdate = r2, e.shared.pending = null;
    } while (1);
    null === m2 && (k2 = q2);
    e.baseState = k2;
    e.firstBaseUpdate = l2;
    e.lastBaseUpdate = m2;
    b = e.shared.interleaved;
    if (null !== b) {
      e = b;
      do
        g |= e.lane, e = e.next;
      while (e !== b);
    } else
      null === f2 && (e.shared.lanes = 0);
    rh |= g;
    a.lanes = g;
    a.memoizedState = q2;
  }
}
function sh(a, b, c) {
  a = b.effects;
  b.effects = null;
  if (null !== a)
    for (b = 0; b < a.length; b++) {
      var d = a[b], e = d.callback;
      if (null !== e) {
        d.callback = null;
        d = c;
        if ("function" !== typeof e)
          throw Error(p(191, e));
        e.call(d);
      }
    }
}
var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
function xh(a) {
  if (a === th)
    throw Error(p(174));
  return a;
}
function yh(a, b) {
  G(wh, b);
  G(vh, a);
  G(uh, th);
  a = b.nodeType;
  switch (a) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
      break;
    default:
      a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
  }
  E(uh);
  G(uh, b);
}
function zh() {
  E(uh);
  E(vh);
  E(wh);
}
function Ah(a) {
  xh(wh.current);
  var b = xh(uh.current);
  var c = lb(b, a.type);
  b !== c && (G(vh, a), G(uh, c));
}
function Bh(a) {
  vh.current === a && (E(uh), E(vh));
}
var L = Uf(0);
function Ch(a) {
  for (var b = a; null !== b; ) {
    if (13 === b.tag) {
      var c = b.memoizedState;
      if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data))
        return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.flags & 128))
        return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }
    if (b === a)
      break;
    for (; null === b.sibling; ) {
      if (null === b.return || b.return === a)
        return null;
      b = b.return;
    }
    b.sibling.return = b.return;
    b = b.sibling;
  }
  return null;
}
var Dh = [];
function Eh() {
  for (var a = 0; a < Dh.length; a++)
    Dh[a]._workInProgressVersionPrimary = null;
  Dh.length = 0;
}
var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
function P() {
  throw Error(p(321));
}
function Mh(a, b) {
  if (null === b)
    return false;
  for (var c = 0; c < b.length && c < a.length; c++)
    if (!He(a[c], b[c]))
      return false;
  return true;
}
function Nh(a, b, c, d, e, f2) {
  Hh = f2;
  M = b;
  b.memoizedState = null;
  b.updateQueue = null;
  b.lanes = 0;
  Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
  a = c(d, e);
  if (Jh) {
    f2 = 0;
    do {
      Jh = false;
      Kh = 0;
      if (25 <= f2)
        throw Error(p(301));
      f2 += 1;
      O = N = null;
      b.updateQueue = null;
      Fh.current = Qh;
      a = c(d, e);
    } while (Jh);
  }
  Fh.current = Rh;
  b = null !== N && null !== N.next;
  Hh = 0;
  O = N = M = null;
  Ih = false;
  if (b)
    throw Error(p(300));
  return a;
}
function Sh() {
  var a = 0 !== Kh;
  Kh = 0;
  return a;
}
function Th() {
  var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  null === O ? M.memoizedState = O = a : O = O.next = a;
  return O;
}
function Uh() {
  if (null === N) {
    var a = M.alternate;
    a = null !== a ? a.memoizedState : null;
  } else
    a = N.next;
  var b = null === O ? M.memoizedState : O.next;
  if (null !== b)
    O = b, N = a;
  else {
    if (null === a)
      throw Error(p(310));
    N = a;
    a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
    null === O ? M.memoizedState = O = a : O = O.next = a;
  }
  return O;
}
function Vh(a, b) {
  return "function" === typeof b ? b(a) : b;
}
function Wh(a) {
  var b = Uh(), c = b.queue;
  if (null === c)
    throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = N, e = d.baseQueue, f2 = c.pending;
  if (null !== f2) {
    if (null !== e) {
      var g = e.next;
      e.next = f2.next;
      f2.next = g;
    }
    d.baseQueue = e = f2;
    c.pending = null;
  }
  if (null !== e) {
    f2 = e.next;
    d = d.baseState;
    var h = g = null, k2 = null, l2 = f2;
    do {
      var m2 = l2.lane;
      if ((Hh & m2) === m2)
        null !== k2 && (k2 = k2.next = { lane: 0, action: l2.action, hasEagerState: l2.hasEagerState, eagerState: l2.eagerState, next: null }), d = l2.hasEagerState ? l2.eagerState : a(d, l2.action);
      else {
        var q2 = {
          lane: m2,
          action: l2.action,
          hasEagerState: l2.hasEagerState,
          eagerState: l2.eagerState,
          next: null
        };
        null === k2 ? (h = k2 = q2, g = d) : k2 = k2.next = q2;
        M.lanes |= m2;
        rh |= m2;
      }
      l2 = l2.next;
    } while (null !== l2 && l2 !== f2);
    null === k2 ? g = d : k2.next = h;
    He(d, b.memoizedState) || (dh = true);
    b.memoizedState = d;
    b.baseState = g;
    b.baseQueue = k2;
    c.lastRenderedState = d;
  }
  a = c.interleaved;
  if (null !== a) {
    e = a;
    do
      f2 = e.lane, M.lanes |= f2, rh |= f2, e = e.next;
    while (e !== a);
  } else
    null === e && (c.lanes = 0);
  return [b.memoizedState, c.dispatch];
}
function Xh(a) {
  var b = Uh(), c = b.queue;
  if (null === c)
    throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = c.dispatch, e = c.pending, f2 = b.memoizedState;
  if (null !== e) {
    c.pending = null;
    var g = e = e.next;
    do
      f2 = a(f2, g.action), g = g.next;
    while (g !== e);
    He(f2, b.memoizedState) || (dh = true);
    b.memoizedState = f2;
    null === b.baseQueue && (b.baseState = f2);
    c.lastRenderedState = f2;
  }
  return [f2, d];
}
function Yh() {
}
function Zh(a, b) {
  var c = M, d = Uh(), e = b(), f2 = !He(d.memoizedState, e);
  f2 && (d.memoizedState = e, dh = true);
  d = d.queue;
  $h(ai.bind(null, c, d, a), [a]);
  if (d.getSnapshot !== b || f2 || null !== O && O.memoizedState.tag & 1) {
    c.flags |= 2048;
    bi(9, ci.bind(null, c, d, e, b), void 0, null);
    if (null === Q)
      throw Error(p(349));
    0 !== (Hh & 30) || di(c, b, e);
  }
  return e;
}
function di(a, b, c) {
  a.flags |= 16384;
  a = { getSnapshot: b, value: c };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
}
function ci(a, b, c, d) {
  b.value = c;
  b.getSnapshot = d;
  ei(b) && fi(a);
}
function ai(a, b, c) {
  return c(function() {
    ei(b) && fi(a);
  });
}
function ei(a) {
  var b = a.getSnapshot;
  a = a.value;
  try {
    var c = b();
    return !He(a, c);
  } catch (d) {
    return true;
  }
}
function fi(a) {
  var b = ih(a, 1);
  null !== b && gi(b, a, 1, -1);
}
function hi(a) {
  var b = Th();
  "function" === typeof a && (a = a());
  b.memoizedState = b.baseState = a;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
  b.queue = a;
  a = a.dispatch = ii.bind(null, M, a);
  return [b.memoizedState, a];
}
function bi(a, b, c, d) {
  a = { tag: a, create: b, destroy: c, deps: d, next: null };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
  return a;
}
function ji() {
  return Uh().memoizedState;
}
function ki(a, b, c, d) {
  var e = Th();
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
}
function li(a, b, c, d) {
  var e = Uh();
  d = void 0 === d ? null : d;
  var f2 = void 0;
  if (null !== N) {
    var g = N.memoizedState;
    f2 = g.destroy;
    if (null !== d && Mh(d, g.deps)) {
      e.memoizedState = bi(b, c, f2, d);
      return;
    }
  }
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, f2, d);
}
function mi(a, b) {
  return ki(8390656, 8, a, b);
}
function $h(a, b) {
  return li(2048, 8, a, b);
}
function ni(a, b) {
  return li(4, 2, a, b);
}
function oi(a, b) {
  return li(4, 4, a, b);
}
function pi(a, b) {
  if ("function" === typeof b)
    return a = a(), b(a), function() {
      b(null);
    };
  if (null !== b && void 0 !== b)
    return a = a(), b.current = a, function() {
      b.current = null;
    };
}
function qi(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return li(4, 4, pi.bind(null, b, a), c);
}
function ri() {
}
function si(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1]))
    return d[0];
  c.memoizedState = [a, b];
  return a;
}
function ti(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1]))
    return d[0];
  a = a();
  c.memoizedState = [a, b];
  return a;
}
function ui(a, b, c) {
  if (0 === (Hh & 21))
    return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
  He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
  return b;
}
function vi(a, b) {
  var c = C;
  C = 0 !== c && 4 > c ? c : 4;
  a(true);
  var d = Gh.transition;
  Gh.transition = {};
  try {
    a(false), b();
  } finally {
    C = c, Gh.transition = d;
  }
}
function wi() {
  return Uh().memoizedState;
}
function xi(a, b, c) {
  var d = yi(a);
  c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a))
    Ai(b, c);
  else if (c = hh(a, b, c, d), null !== c) {
    var e = R();
    gi(c, a, d, e);
    Bi(c, b, d);
  }
}
function ii(a, b, c) {
  var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a))
    Ai(b, e);
  else {
    var f2 = a.alternate;
    if (0 === a.lanes && (null === f2 || 0 === f2.lanes) && (f2 = b.lastRenderedReducer, null !== f2))
      try {
        var g = b.lastRenderedState, h = f2(g, c);
        e.hasEagerState = true;
        e.eagerState = h;
        if (He(h, g)) {
          var k2 = b.interleaved;
          null === k2 ? (e.next = e, gh(b)) : (e.next = k2.next, k2.next = e);
          b.interleaved = e;
          return;
        }
      } catch (l2) {
      } finally {
      }
    c = hh(a, b, e, d);
    null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
  }
}
function zi(a) {
  var b = a.alternate;
  return a === M || null !== b && b === M;
}
function Ai(a, b) {
  Jh = Ih = true;
  var c = a.pending;
  null === c ? b.next = b : (b.next = c.next, c.next = b);
  a.pending = b;
}
function Bi(a, b, c) {
  if (0 !== (c & 4194240)) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b) {
  Th().memoizedState = [a, void 0 === b ? null : b];
  return a;
}, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return ki(
    4194308,
    4,
    pi.bind(null, b, a),
    c
  );
}, useLayoutEffect: function(a, b) {
  return ki(4194308, 4, a, b);
}, useInsertionEffect: function(a, b) {
  return ki(4, 2, a, b);
}, useMemo: function(a, b) {
  var c = Th();
  b = void 0 === b ? null : b;
  a = a();
  c.memoizedState = [a, b];
  return a;
}, useReducer: function(a, b, c) {
  var d = Th();
  b = void 0 !== c ? c(b) : b;
  d.memoizedState = d.baseState = b;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
  d.queue = a;
  a = a.dispatch = xi.bind(null, M, a);
  return [d.memoizedState, a];
}, useRef: function(a) {
  var b = Th();
  a = { current: a };
  return b.memoizedState = a;
}, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
  return Th().memoizedState = a;
}, useTransition: function() {
  var a = hi(false), b = a[0];
  a = vi.bind(null, a[1]);
  Th().memoizedState = a;
  return [b, a];
}, useMutableSource: function() {
}, useSyncExternalStore: function(a, b, c) {
  var d = M, e = Th();
  if (I) {
    if (void 0 === c)
      throw Error(p(407));
    c = c();
  } else {
    c = b();
    if (null === Q)
      throw Error(p(349));
    0 !== (Hh & 30) || di(d, b, c);
  }
  e.memoizedState = c;
  var f2 = { value: c, getSnapshot: b };
  e.queue = f2;
  mi(ai.bind(
    null,
    d,
    f2,
    a
  ), [a]);
  d.flags |= 2048;
  bi(9, ci.bind(null, d, f2, c, b), void 0, null);
  return c;
}, useId: function() {
  var a = Th(), b = Q.identifierPrefix;
  if (I) {
    var c = sg;
    var d = rg;
    c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
    b = ":" + b + "R" + c;
    c = Kh++;
    0 < c && (b += "H" + c.toString(32));
    b += ":";
  } else
    c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
  return a.memoizedState = b;
}, unstable_isNewReconciler: false }, Ph = {
  readContext: eh,
  useCallback: si,
  useContext: eh,
  useEffect: $h,
  useImperativeHandle: qi,
  useInsertionEffect: ni,
  useLayoutEffect: oi,
  useMemo: ti,
  useReducer: Wh,
  useRef: ji,
  useState: function() {
    return Wh(Vh);
  },
  useDebugValue: ri,
  useDeferredValue: function(a) {
    var b = Uh();
    return ui(b, N.memoizedState, a);
  },
  useTransition: function() {
    var a = Wh(Vh)[0], b = Uh().memoizedState;
    return [a, b];
  },
  useMutableSource: Yh,
  useSyncExternalStore: Zh,
  useId: wi,
  unstable_isNewReconciler: false
}, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
  return Xh(Vh);
}, useDebugValue: ri, useDeferredValue: function(a) {
  var b = Uh();
  return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
}, useTransition: function() {
  var a = Xh(Vh)[0], b = Uh().memoizedState;
  return [a, b];
}, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
function Ci(a, b) {
  if (a && a.defaultProps) {
    b = A({}, b);
    a = a.defaultProps;
    for (var c in a)
      void 0 === b[c] && (b[c] = a[c]);
    return b;
  }
  return b;
}
function Di(a, b, c, d) {
  b = a.memoizedState;
  c = c(d, b);
  c = null === c || void 0 === c ? b : A({}, b, c);
  a.memoizedState = c;
  0 === a.lanes && (a.updateQueue.baseState = c);
}
var Ei = { isMounted: function(a) {
  return (a = a._reactInternals) ? Vb(a) === a : false;
}, enqueueSetState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueReplaceState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.tag = 1;
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueForceUpdate: function(a, b) {
  a = a._reactInternals;
  var c = R(), d = yi(a), e = mh(c, d);
  e.tag = 2;
  void 0 !== b && null !== b && (e.callback = b);
  b = nh(a, e, d);
  null !== b && (gi(b, a, d, c), oh(b, a, d));
} };
function Fi(a, b, c, d, e, f2, g) {
  a = a.stateNode;
  return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f2, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f2) : true;
}
function Gi(a, b, c) {
  var d = false, e = Vf;
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? f2 = eh(f2) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f2 = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
  b = new b(c, f2);
  a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Ei;
  a.stateNode = b;
  b._reactInternals = a;
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f2);
  return b;
}
function Hi(a, b, c, d) {
  a = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
  b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
}
function Ii(a, b, c, d) {
  var e = a.stateNode;
  e.props = c;
  e.state = a.memoizedState;
  e.refs = {};
  kh(a);
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? e.context = eh(f2) : (f2 = Zf(b) ? Xf : H.current, e.context = Yf(a, f2));
  e.state = a.memoizedState;
  f2 = b.getDerivedStateFromProps;
  "function" === typeof f2 && (Di(a, b, f2, c), e.state = a.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
  "function" === typeof e.componentDidMount && (a.flags |= 4194308);
}
function Ji(a, b) {
  try {
    var c = "", d = b;
    do
      c += Pa(d), d = d.return;
    while (d);
    var e = c;
  } catch (f2) {
    e = "\nError generating stack: " + f2.message + "\n" + f2.stack;
  }
  return { value: a, source: b, stack: e, digest: null };
}
function Ki(a, b, c) {
  return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
}
function Li(a, b) {
  try {
    console.error(b.value);
  } catch (c) {
    setTimeout(function() {
      throw c;
    });
  }
}
var Mi = "function" === typeof WeakMap ? WeakMap : Map;
function Ni(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  c.payload = { element: null };
  var d = b.value;
  c.callback = function() {
    Oi || (Oi = true, Pi = d);
    Li(a, b);
  };
  return c;
}
function Qi(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  var d = a.type.getDerivedStateFromError;
  if ("function" === typeof d) {
    var e = b.value;
    c.payload = function() {
      return d(e);
    };
    c.callback = function() {
      Li(a, b);
    };
  }
  var f2 = a.stateNode;
  null !== f2 && "function" === typeof f2.componentDidCatch && (c.callback = function() {
    Li(a, b);
    "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
    var c2 = b.stack;
    this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
  });
  return c;
}
function Si(a, b, c) {
  var d = a.pingCache;
  if (null === d) {
    d = a.pingCache = new Mi();
    var e = /* @__PURE__ */ new Set();
    d.set(b, e);
  } else
    e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
  e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
}
function Ui(a) {
  do {
    var b;
    if (b = 13 === a.tag)
      b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
    if (b)
      return a;
    a = a.return;
  } while (null !== a);
  return null;
}
function Vi(a, b, c, d, e) {
  if (0 === (a.mode & 1))
    return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
  a.flags |= 65536;
  a.lanes = e;
  return a;
}
var Wi = ua.ReactCurrentOwner, dh = false;
function Xi(a, b, c, d) {
  b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
}
function Yi(a, b, c, d, e) {
  c = c.render;
  var f2 = b.ref;
  ch(b, e);
  d = Nh(a, b, c, d, f2, e);
  c = Sh();
  if (null !== a && !dh)
    return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && c && vg(b);
  b.flags |= 1;
  Xi(a, b, d, e);
  return b.child;
}
function $i(a, b, c, d, e) {
  if (null === a) {
    var f2 = c.type;
    if ("function" === typeof f2 && !aj(f2) && void 0 === f2.defaultProps && null === c.compare && void 0 === c.defaultProps)
      return b.tag = 15, b.type = f2, bj(a, b, f2, d, e);
    a = Rg(c.type, null, d, b, b.mode, e);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  f2 = a.child;
  if (0 === (a.lanes & e)) {
    var g = f2.memoizedProps;
    c = c.compare;
    c = null !== c ? c : Ie;
    if (c(g, d) && a.ref === b.ref)
      return Zi(a, b, e);
  }
  b.flags |= 1;
  a = Pg(f2, d);
  a.ref = b.ref;
  a.return = b;
  return b.child = a;
}
function bj(a, b, c, d, e) {
  if (null !== a) {
    var f2 = a.memoizedProps;
    if (Ie(f2, d) && a.ref === b.ref)
      if (dh = false, b.pendingProps = d = f2, 0 !== (a.lanes & e))
        0 !== (a.flags & 131072) && (dh = true);
      else
        return b.lanes = a.lanes, Zi(a, b, e);
  }
  return cj(a, b, c, d, e);
}
function dj(a, b, c) {
  var d = b.pendingProps, e = d.children, f2 = null !== a ? a.memoizedState : null;
  if ("hidden" === d.mode)
    if (0 === (b.mode & 1))
      b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
    else {
      if (0 === (c & 1073741824))
        return a = null !== f2 ? f2.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
      b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
      d = null !== f2 ? f2.baseLanes : c;
      G(ej, fj);
      fj |= d;
    }
  else
    null !== f2 ? (d = f2.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
  Xi(a, b, e, c);
  return b.child;
}
function gj(a, b) {
  var c = b.ref;
  if (null === a && null !== c || null !== a && a.ref !== c)
    b.flags |= 512, b.flags |= 2097152;
}
function cj(a, b, c, d, e) {
  var f2 = Zf(c) ? Xf : H.current;
  f2 = Yf(b, f2);
  ch(b, e);
  c = Nh(a, b, c, d, f2, e);
  d = Sh();
  if (null !== a && !dh)
    return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && d && vg(b);
  b.flags |= 1;
  Xi(a, b, c, e);
  return b.child;
}
function hj(a, b, c, d, e) {
  if (Zf(c)) {
    var f2 = true;
    cg(b);
  } else
    f2 = false;
  ch(b, e);
  if (null === b.stateNode)
    ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
  else if (null === a) {
    var g = b.stateNode, h = b.memoizedProps;
    g.props = h;
    var k2 = g.context, l2 = c.contextType;
    "object" === typeof l2 && null !== l2 ? l2 = eh(l2) : (l2 = Zf(c) ? Xf : H.current, l2 = Yf(b, l2));
    var m2 = c.getDerivedStateFromProps, q2 = "function" === typeof m2 || "function" === typeof g.getSnapshotBeforeUpdate;
    q2 || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k2 !== l2) && Hi(b, g, d, l2);
    jh = false;
    var r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    k2 = b.memoizedState;
    h !== d || r2 !== k2 || Wf.current || jh ? ("function" === typeof m2 && (Di(b, c, m2, d), k2 = b.memoizedState), (h = jh || Fi(b, c, h, d, r2, k2, l2)) ? (q2 || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k2), g.props = d, g.state = k2, g.context = l2, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
  } else {
    g = b.stateNode;
    lh(a, b);
    h = b.memoizedProps;
    l2 = b.type === b.elementType ? h : Ci(b.type, h);
    g.props = l2;
    q2 = b.pendingProps;
    r2 = g.context;
    k2 = c.contextType;
    "object" === typeof k2 && null !== k2 ? k2 = eh(k2) : (k2 = Zf(c) ? Xf : H.current, k2 = Yf(b, k2));
    var y2 = c.getDerivedStateFromProps;
    (m2 = "function" === typeof y2 || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q2 || r2 !== k2) && Hi(b, g, d, k2);
    jh = false;
    r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    var n2 = b.memoizedState;
    h !== q2 || r2 !== n2 || Wf.current || jh ? ("function" === typeof y2 && (Di(b, c, y2, d), n2 = b.memoizedState), (l2 = jh || Fi(b, c, l2, d, r2, n2, k2) || false) ? (m2 || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n2, k2), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n2, k2)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n2), g.props = d, g.state = n2, g.context = k2, d = l2) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), d = false);
  }
  return jj(a, b, c, d, f2, e);
}
function jj(a, b, c, d, e, f2) {
  gj(a, b);
  var g = 0 !== (b.flags & 128);
  if (!d && !g)
    return e && dg(b, c, false), Zi(a, b, f2);
  d = b.stateNode;
  Wi.current = b;
  var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
  b.flags |= 1;
  null !== a && g ? (b.child = Ug(b, a.child, null, f2), b.child = Ug(b, null, h, f2)) : Xi(a, b, h, f2);
  b.memoizedState = d.state;
  e && dg(b, c, true);
  return b.child;
}
function kj(a) {
  var b = a.stateNode;
  b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
  yh(a, b.containerInfo);
}
function lj(a, b, c, d, e) {
  Ig();
  Jg(e);
  b.flags |= 256;
  Xi(a, b, c, d);
  return b.child;
}
var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
function nj(a) {
  return { baseLanes: a, cachePool: null, transitions: null };
}
function oj(a, b, c) {
  var d = b.pendingProps, e = L.current, f2 = false, g = 0 !== (b.flags & 128), h;
  (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
  if (h)
    f2 = true, b.flags &= -129;
  else if (null === a || null !== a.memoizedState)
    e |= 1;
  G(L, e & 1);
  if (null === a) {
    Eg(b);
    a = b.memoizedState;
    if (null !== a && (a = a.dehydrated, null !== a))
      return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
    g = d.children;
    a = d.fallback;
    return f2 ? (d = b.mode, f2 = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f2 ? (f2.childLanes = 0, f2.pendingProps = g) : f2 = pj(g, d, 0, null), a = Tg(a, d, c, null), f2.return = b, a.return = b, f2.sibling = a, b.child = f2, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
  }
  e = a.memoizedState;
  if (null !== e && (h = e.dehydrated, null !== h))
    return rj(a, b, g, d, h, e, c);
  if (f2) {
    f2 = d.fallback;
    g = b.mode;
    e = a.child;
    h = e.sibling;
    var k2 = { mode: "hidden", children: d.children };
    0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k2, b.deletions = null) : (d = Pg(e, k2), d.subtreeFlags = e.subtreeFlags & 14680064);
    null !== h ? f2 = Pg(h, f2) : (f2 = Tg(f2, g, c, null), f2.flags |= 2);
    f2.return = b;
    d.return = b;
    d.sibling = f2;
    b.child = d;
    d = f2;
    f2 = b.child;
    g = a.child.memoizedState;
    g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
    f2.memoizedState = g;
    f2.childLanes = a.childLanes & ~c;
    b.memoizedState = mj;
    return d;
  }
  f2 = a.child;
  a = f2.sibling;
  d = Pg(f2, { mode: "visible", children: d.children });
  0 === (b.mode & 1) && (d.lanes = c);
  d.return = b;
  d.sibling = null;
  null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
  b.child = d;
  b.memoizedState = null;
  return d;
}
function qj(a, b) {
  b = pj({ mode: "visible", children: b }, a.mode, 0, null);
  b.return = a;
  return a.child = b;
}
function sj(a, b, c, d) {
  null !== d && Jg(d);
  Ug(b, a.child, null, c);
  a = qj(b, b.pendingProps.children);
  a.flags |= 2;
  b.memoizedState = null;
  return a;
}
function rj(a, b, c, d, e, f2, g) {
  if (c) {
    if (b.flags & 256)
      return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
    if (null !== b.memoizedState)
      return b.child = a.child, b.flags |= 128, null;
    f2 = d.fallback;
    e = b.mode;
    d = pj({ mode: "visible", children: d.children }, e, 0, null);
    f2 = Tg(f2, e, g, null);
    f2.flags |= 2;
    d.return = b;
    f2.return = b;
    d.sibling = f2;
    b.child = d;
    0 !== (b.mode & 1) && Ug(b, a.child, null, g);
    b.child.memoizedState = nj(g);
    b.memoizedState = mj;
    return f2;
  }
  if (0 === (b.mode & 1))
    return sj(a, b, g, null);
  if ("$!" === e.data) {
    d = e.nextSibling && e.nextSibling.dataset;
    if (d)
      var h = d.dgst;
    d = h;
    f2 = Error(p(419));
    d = Ki(f2, d, void 0);
    return sj(a, b, g, d);
  }
  h = 0 !== (g & a.childLanes);
  if (dh || h) {
    d = Q;
    if (null !== d) {
      switch (g & -g) {
        case 4:
          e = 2;
          break;
        case 16:
          e = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          e = 32;
          break;
        case 536870912:
          e = 268435456;
          break;
        default:
          e = 0;
      }
      e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
      0 !== e && e !== f2.retryLane && (f2.retryLane = e, ih(a, e), gi(d, a, e, -1));
    }
    tj();
    d = Ki(Error(p(421)));
    return sj(a, b, g, d);
  }
  if ("$?" === e.data)
    return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
  a = f2.treeContext;
  yg = Lf(e.nextSibling);
  xg = b;
  I = true;
  zg = null;
  null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
  b = qj(b, d.children);
  b.flags |= 4096;
  return b;
}
function vj(a, b, c) {
  a.lanes |= b;
  var d = a.alternate;
  null !== d && (d.lanes |= b);
  bh(a.return, b, c);
}
function wj(a, b, c, d, e) {
  var f2 = a.memoizedState;
  null === f2 ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f2.isBackwards = b, f2.rendering = null, f2.renderingStartTime = 0, f2.last = d, f2.tail = c, f2.tailMode = e);
}
function xj(a, b, c) {
  var d = b.pendingProps, e = d.revealOrder, f2 = d.tail;
  Xi(a, b, d.children, c);
  d = L.current;
  if (0 !== (d & 2))
    d = d & 1 | 2, b.flags |= 128;
  else {
    if (null !== a && 0 !== (a.flags & 128))
      a:
        for (a = b.child; null !== a; ) {
          if (13 === a.tag)
            null !== a.memoizedState && vj(a, c, b);
          else if (19 === a.tag)
            vj(a, c, b);
          else if (null !== a.child) {
            a.child.return = a;
            a = a.child;
            continue;
          }
          if (a === b)
            break a;
          for (; null === a.sibling; ) {
            if (null === a.return || a.return === b)
              break a;
            a = a.return;
          }
          a.sibling.return = a.return;
          a = a.sibling;
        }
    d &= 1;
  }
  G(L, d);
  if (0 === (b.mode & 1))
    b.memoizedState = null;
  else
    switch (e) {
      case "forwards":
        c = b.child;
        for (e = null; null !== c; )
          a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
        c = e;
        null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
        wj(b, false, e, c, f2);
        break;
      case "backwards":
        c = null;
        e = b.child;
        for (b.child = null; null !== e; ) {
          a = e.alternate;
          if (null !== a && null === Ch(a)) {
            b.child = e;
            break;
          }
          a = e.sibling;
          e.sibling = c;
          c = e;
          e = a;
        }
        wj(b, true, c, null, f2);
        break;
      case "together":
        wj(b, false, null, null, void 0);
        break;
      default:
        b.memoizedState = null;
    }
  return b.child;
}
function ij(a, b) {
  0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
}
function Zi(a, b, c) {
  null !== a && (b.dependencies = a.dependencies);
  rh |= b.lanes;
  if (0 === (c & b.childLanes))
    return null;
  if (null !== a && b.child !== a.child)
    throw Error(p(153));
  if (null !== b.child) {
    a = b.child;
    c = Pg(a, a.pendingProps);
    b.child = c;
    for (c.return = b; null !== a.sibling; )
      a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
    c.sibling = null;
  }
  return b.child;
}
function yj(a, b, c) {
  switch (b.tag) {
    case 3:
      kj(b);
      Ig();
      break;
    case 5:
      Ah(b);
      break;
    case 1:
      Zf(b.type) && cg(b);
      break;
    case 4:
      yh(b, b.stateNode.containerInfo);
      break;
    case 10:
      var d = b.type._context, e = b.memoizedProps.value;
      G(Wg, d._currentValue);
      d._currentValue = e;
      break;
    case 13:
      d = b.memoizedState;
      if (null !== d) {
        if (null !== d.dehydrated)
          return G(L, L.current & 1), b.flags |= 128, null;
        if (0 !== (c & b.child.childLanes))
          return oj(a, b, c);
        G(L, L.current & 1);
        a = Zi(a, b, c);
        return null !== a ? a.sibling : null;
      }
      G(L, L.current & 1);
      break;
    case 19:
      d = 0 !== (c & b.childLanes);
      if (0 !== (a.flags & 128)) {
        if (d)
          return xj(a, b, c);
        b.flags |= 128;
      }
      e = b.memoizedState;
      null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
      G(L, L.current);
      if (d)
        break;
      else
        return null;
    case 22:
    case 23:
      return b.lanes = 0, dj(a, b, c);
  }
  return Zi(a, b, c);
}
var zj, Aj, Bj, Cj;
zj = function(a, b) {
  for (var c = b.child; null !== c; ) {
    if (5 === c.tag || 6 === c.tag)
      a.appendChild(c.stateNode);
    else if (4 !== c.tag && null !== c.child) {
      c.child.return = c;
      c = c.child;
      continue;
    }
    if (c === b)
      break;
    for (; null === c.sibling; ) {
      if (null === c.return || c.return === b)
        return;
      c = c.return;
    }
    c.sibling.return = c.return;
    c = c.sibling;
  }
};
Aj = function() {
};
Bj = function(a, b, c, d) {
  var e = a.memoizedProps;
  if (e !== d) {
    a = b.stateNode;
    xh(uh.current);
    var f2 = null;
    switch (c) {
      case "input":
        e = Ya(a, e);
        d = Ya(a, d);
        f2 = [];
        break;
      case "select":
        e = A({}, e, { value: void 0 });
        d = A({}, d, { value: void 0 });
        f2 = [];
        break;
      case "textarea":
        e = gb(a, e);
        d = gb(a, d);
        f2 = [];
        break;
      default:
        "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
    }
    ub(c, d);
    var g;
    c = null;
    for (l2 in e)
      if (!d.hasOwnProperty(l2) && e.hasOwnProperty(l2) && null != e[l2])
        if ("style" === l2) {
          var h = e[l2];
          for (g in h)
            h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
        } else
          "dangerouslySetInnerHTML" !== l2 && "children" !== l2 && "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && "autoFocus" !== l2 && (ea.hasOwnProperty(l2) ? f2 || (f2 = []) : (f2 = f2 || []).push(l2, null));
    for (l2 in d) {
      var k2 = d[l2];
      h = null != e ? e[l2] : void 0;
      if (d.hasOwnProperty(l2) && k2 !== h && (null != k2 || null != h))
        if ("style" === l2)
          if (h) {
            for (g in h)
              !h.hasOwnProperty(g) || k2 && k2.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
            for (g in k2)
              k2.hasOwnProperty(g) && h[g] !== k2[g] && (c || (c = {}), c[g] = k2[g]);
          } else
            c || (f2 || (f2 = []), f2.push(
              l2,
              c
            )), c = k2;
        else
          "dangerouslySetInnerHTML" === l2 ? (k2 = k2 ? k2.__html : void 0, h = h ? h.__html : void 0, null != k2 && h !== k2 && (f2 = f2 || []).push(l2, k2)) : "children" === l2 ? "string" !== typeof k2 && "number" !== typeof k2 || (f2 = f2 || []).push(l2, "" + k2) : "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && (ea.hasOwnProperty(l2) ? (null != k2 && "onScroll" === l2 && D("scroll", a), f2 || h === k2 || (f2 = [])) : (f2 = f2 || []).push(l2, k2));
    }
    c && (f2 = f2 || []).push("style", c);
    var l2 = f2;
    if (b.updateQueue = l2)
      b.flags |= 4;
  }
};
Cj = function(a, b, c, d) {
  c !== d && (b.flags |= 4);
};
function Dj(a, b) {
  if (!I)
    switch (a.tailMode) {
      case "hidden":
        b = a.tail;
        for (var c = null; null !== b; )
          null !== b.alternate && (c = b), b = b.sibling;
        null === c ? a.tail = null : c.sibling = null;
        break;
      case "collapsed":
        c = a.tail;
        for (var d = null; null !== c; )
          null !== c.alternate && (d = c), c = c.sibling;
        null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
    }
}
function S(a) {
  var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
  if (b)
    for (var e = a.child; null !== e; )
      c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
  else
    for (e = a.child; null !== e; )
      c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
  a.subtreeFlags |= d;
  a.childLanes = c;
  return b;
}
function Ej(a, b, c) {
  var d = b.pendingProps;
  wg(b);
  switch (b.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return S(b), null;
    case 1:
      return Zf(b.type) && $f(), S(b), null;
    case 3:
      d = b.stateNode;
      zh();
      E(Wf);
      E(H);
      Eh();
      d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
      if (null === a || null === a.child)
        Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
      Aj(a, b);
      S(b);
      return null;
    case 5:
      Bh(b);
      var e = xh(wh.current);
      c = b.type;
      if (null !== a && null != b.stateNode)
        Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      else {
        if (!d) {
          if (null === b.stateNode)
            throw Error(p(166));
          S(b);
          return null;
        }
        a = xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.type;
          var f2 = b.memoizedProps;
          d[Of] = b;
          d[Pf] = f2;
          a = 0 !== (b.mode & 1);
          switch (c) {
            case "dialog":
              D("cancel", d);
              D("close", d);
              break;
            case "iframe":
            case "object":
            case "embed":
              D("load", d);
              break;
            case "video":
            case "audio":
              for (e = 0; e < lf.length; e++)
                D(lf[e], d);
              break;
            case "source":
              D("error", d);
              break;
            case "img":
            case "image":
            case "link":
              D(
                "error",
                d
              );
              D("load", d);
              break;
            case "details":
              D("toggle", d);
              break;
            case "input":
              Za(d, f2);
              D("invalid", d);
              break;
            case "select":
              d._wrapperState = { wasMultiple: !!f2.multiple };
              D("invalid", d);
              break;
            case "textarea":
              hb(d, f2), D("invalid", d);
          }
          ub(c, f2);
          e = null;
          for (var g in f2)
            if (f2.hasOwnProperty(g)) {
              var h = f2[g];
              "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f2.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f2.suppressHydrationWarning && Af(
                d.textContent,
                h,
                a
              ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
            }
          switch (c) {
            case "input":
              Va(d);
              db(d, f2, true);
              break;
            case "textarea":
              Va(d);
              jb(d);
              break;
            case "select":
            case "option":
              break;
            default:
              "function" === typeof f2.onClick && (d.onclick = Bf);
          }
          d = e;
          b.updateQueue = d;
          null !== d && (b.flags |= 4);
        } else {
          g = 9 === e.nodeType ? e : e.ownerDocument;
          "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
          "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
          a[Of] = b;
          a[Pf] = d;
          zj(a, b, false, false);
          b.stateNode = a;
          a: {
            g = vb(c, d);
            switch (c) {
              case "dialog":
                D("cancel", a);
                D("close", a);
                e = d;
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", a);
                e = d;
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++)
                  D(lf[e], a);
                e = d;
                break;
              case "source":
                D("error", a);
                e = d;
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  a
                );
                D("load", a);
                e = d;
                break;
              case "details":
                D("toggle", a);
                e = d;
                break;
              case "input":
                Za(a, d);
                e = Ya(a, d);
                D("invalid", a);
                break;
              case "option":
                e = d;
                break;
              case "select":
                a._wrapperState = { wasMultiple: !!d.multiple };
                e = A({}, d, { value: void 0 });
                D("invalid", a);
                break;
              case "textarea":
                hb(a, d);
                e = gb(a, d);
                D("invalid", a);
                break;
              default:
                e = d;
            }
            ub(c, e);
            h = e;
            for (f2 in h)
              if (h.hasOwnProperty(f2)) {
                var k2 = h[f2];
                "style" === f2 ? sb(a, k2) : "dangerouslySetInnerHTML" === f2 ? (k2 = k2 ? k2.__html : void 0, null != k2 && nb(a, k2)) : "children" === f2 ? "string" === typeof k2 ? ("textarea" !== c || "" !== k2) && ob(a, k2) : "number" === typeof k2 && ob(a, "" + k2) : "suppressContentEditableWarning" !== f2 && "suppressHydrationWarning" !== f2 && "autoFocus" !== f2 && (ea.hasOwnProperty(f2) ? null != k2 && "onScroll" === f2 && D("scroll", a) : null != k2 && ta(a, f2, k2, g));
              }
            switch (c) {
              case "input":
                Va(a);
                db(a, d, false);
                break;
              case "textarea":
                Va(a);
                jb(a);
                break;
              case "option":
                null != d.value && a.setAttribute("value", "" + Sa(d.value));
                break;
              case "select":
                a.multiple = !!d.multiple;
                f2 = d.value;
                null != f2 ? fb(a, !!d.multiple, f2, false) : null != d.defaultValue && fb(
                  a,
                  !!d.multiple,
                  d.defaultValue,
                  true
                );
                break;
              default:
                "function" === typeof e.onClick && (a.onclick = Bf);
            }
            switch (c) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                d = !!d.autoFocus;
                break a;
              case "img":
                d = true;
                break a;
              default:
                d = false;
            }
          }
          d && (b.flags |= 4);
        }
        null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      }
      S(b);
      return null;
    case 6:
      if (a && null != b.stateNode)
        Cj(a, b, a.memoizedProps, d);
      else {
        if ("string" !== typeof d && null === b.stateNode)
          throw Error(p(166));
        c = xh(wh.current);
        xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.memoizedProps;
          d[Of] = b;
          if (f2 = d.nodeValue !== c) {
            if (a = xg, null !== a)
              switch (a.tag) {
                case 3:
                  Af(d.nodeValue, c, 0 !== (a.mode & 1));
                  break;
                case 5:
                  true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
              }
          }
          f2 && (b.flags |= 4);
        } else
          d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
      }
      S(b);
      return null;
    case 13:
      E(L);
      d = b.memoizedState;
      if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
        if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128))
          Hg(), Ig(), b.flags |= 98560, f2 = false;
        else if (f2 = Gg(b), null !== d && null !== d.dehydrated) {
          if (null === a) {
            if (!f2)
              throw Error(p(318));
            f2 = b.memoizedState;
            f2 = null !== f2 ? f2.dehydrated : null;
            if (!f2)
              throw Error(p(317));
            f2[Of] = b;
          } else
            Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
          S(b);
          f2 = false;
        } else
          null !== zg && (Fj(zg), zg = null), f2 = true;
        if (!f2)
          return b.flags & 65536 ? b : null;
      }
      if (0 !== (b.flags & 128))
        return b.lanes = c, b;
      d = null !== d;
      d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
      null !== b.updateQueue && (b.flags |= 4);
      S(b);
      return null;
    case 4:
      return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
    case 10:
      return ah(b.type._context), S(b), null;
    case 17:
      return Zf(b.type) && $f(), S(b), null;
    case 19:
      E(L);
      f2 = b.memoizedState;
      if (null === f2)
        return S(b), null;
      d = 0 !== (b.flags & 128);
      g = f2.rendering;
      if (null === g)
        if (d)
          Dj(f2, false);
        else {
          if (0 !== T || null !== a && 0 !== (a.flags & 128))
            for (a = b.child; null !== a; ) {
              g = Ch(a);
              if (null !== g) {
                b.flags |= 128;
                Dj(f2, false);
                d = g.updateQueue;
                null !== d && (b.updateQueue = d, b.flags |= 4);
                b.subtreeFlags = 0;
                d = c;
                for (c = b.child; null !== c; )
                  f2 = c, a = d, f2.flags &= 14680066, g = f2.alternate, null === g ? (f2.childLanes = 0, f2.lanes = a, f2.child = null, f2.subtreeFlags = 0, f2.memoizedProps = null, f2.memoizedState = null, f2.updateQueue = null, f2.dependencies = null, f2.stateNode = null) : (f2.childLanes = g.childLanes, f2.lanes = g.lanes, f2.child = g.child, f2.subtreeFlags = 0, f2.deletions = null, f2.memoizedProps = g.memoizedProps, f2.memoizedState = g.memoizedState, f2.updateQueue = g.updateQueue, f2.type = g.type, a = g.dependencies, f2.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
                G(L, L.current & 1 | 2);
                return b.child;
              }
              a = a.sibling;
            }
          null !== f2.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        }
      else {
        if (!d)
          if (a = Ch(g), null !== a) {
            if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f2, true), null === f2.tail && "hidden" === f2.tailMode && !g.alternate && !I)
              return S(b), null;
          } else
            2 * B() - f2.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        f2.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f2.last, null !== c ? c.sibling = g : b.child = g, f2.last = g);
      }
      if (null !== f2.tail)
        return b = f2.tail, f2.rendering = b, f2.tail = b.sibling, f2.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
      S(b);
      return null;
    case 22:
    case 23:
      return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(p(156, b.tag));
}
function Ij(a, b) {
  wg(b);
  switch (b.tag) {
    case 1:
      return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 3:
      return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
    case 5:
      return Bh(b), null;
    case 13:
      E(L);
      a = b.memoizedState;
      if (null !== a && null !== a.dehydrated) {
        if (null === b.alternate)
          throw Error(p(340));
        Ig();
      }
      a = b.flags;
      return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 19:
      return E(L), null;
    case 4:
      return zh(), null;
    case 10:
      return ah(b.type._context), null;
    case 22:
    case 23:
      return Hj(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
function Lj(a, b) {
  var c = a.ref;
  if (null !== c)
    if ("function" === typeof c)
      try {
        c(null);
      } catch (d) {
        W(a, b, d);
      }
    else
      c.current = null;
}
function Mj(a, b, c) {
  try {
    c();
  } catch (d) {
    W(a, b, d);
  }
}
var Nj = false;
function Oj(a, b) {
  Cf = dd;
  a = Me();
  if (Ne(a)) {
    if ("selectionStart" in a)
      var c = { start: a.selectionStart, end: a.selectionEnd };
    else
      a: {
        c = (c = a.ownerDocument) && c.defaultView || window;
        var d = c.getSelection && c.getSelection();
        if (d && 0 !== d.rangeCount) {
          c = d.anchorNode;
          var e = d.anchorOffset, f2 = d.focusNode;
          d = d.focusOffset;
          try {
            c.nodeType, f2.nodeType;
          } catch (F2) {
            c = null;
            break a;
          }
          var g = 0, h = -1, k2 = -1, l2 = 0, m2 = 0, q2 = a, r2 = null;
          b:
            for (; ; ) {
              for (var y2; ; ) {
                q2 !== c || 0 !== e && 3 !== q2.nodeType || (h = g + e);
                q2 !== f2 || 0 !== d && 3 !== q2.nodeType || (k2 = g + d);
                3 === q2.nodeType && (g += q2.nodeValue.length);
                if (null === (y2 = q2.firstChild))
                  break;
                r2 = q2;
                q2 = y2;
              }
              for (; ; ) {
                if (q2 === a)
                  break b;
                r2 === c && ++l2 === e && (h = g);
                r2 === f2 && ++m2 === d && (k2 = g);
                if (null !== (y2 = q2.nextSibling))
                  break;
                q2 = r2;
                r2 = q2.parentNode;
              }
              q2 = y2;
            }
          c = -1 === h || -1 === k2 ? null : { start: h, end: k2 };
        } else
          c = null;
      }
    c = c || { start: 0, end: 0 };
  } else
    c = null;
  Df = { focusedElem: a, selectionRange: c };
  dd = false;
  for (V = b; null !== V; )
    if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a)
      a.return = b, V = a;
    else
      for (; null !== V; ) {
        b = V;
        try {
          var n2 = b.alternate;
          if (0 !== (b.flags & 1024))
            switch (b.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (null !== n2) {
                  var t2 = n2.memoizedProps, J2 = n2.memoizedState, x2 = b.stateNode, w2 = x2.getSnapshotBeforeUpdate(b.elementType === b.type ? t2 : Ci(b.type, t2), J2);
                  x2.__reactInternalSnapshotBeforeUpdate = w2;
                }
                break;
              case 3:
                var u2 = b.stateNode.containerInfo;
                1 === u2.nodeType ? u2.textContent = "" : 9 === u2.nodeType && u2.documentElement && u2.removeChild(u2.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(p(163));
            }
        } catch (F2) {
          W(b, b.return, F2);
        }
        a = b.sibling;
        if (null !== a) {
          a.return = b.return;
          V = a;
          break;
        }
        V = b.return;
      }
  n2 = Nj;
  Nj = false;
  return n2;
}
function Pj(a, b, c) {
  var d = b.updateQueue;
  d = null !== d ? d.lastEffect : null;
  if (null !== d) {
    var e = d = d.next;
    do {
      if ((e.tag & a) === a) {
        var f2 = e.destroy;
        e.destroy = void 0;
        void 0 !== f2 && Mj(b, c, f2);
      }
      e = e.next;
    } while (e !== d);
  }
}
function Qj(a, b) {
  b = b.updateQueue;
  b = null !== b ? b.lastEffect : null;
  if (null !== b) {
    var c = b = b.next;
    do {
      if ((c.tag & a) === a) {
        var d = c.create;
        c.destroy = d();
      }
      c = c.next;
    } while (c !== b);
  }
}
function Rj(a) {
  var b = a.ref;
  if (null !== b) {
    var c = a.stateNode;
    switch (a.tag) {
      case 5:
        a = c;
        break;
      default:
        a = c;
    }
    "function" === typeof b ? b(a) : b.current = a;
  }
}
function Sj(a) {
  var b = a.alternate;
  null !== b && (a.alternate = null, Sj(b));
  a.child = null;
  a.deletions = null;
  a.sibling = null;
  5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
  a.stateNode = null;
  a.return = null;
  a.dependencies = null;
  a.memoizedProps = null;
  a.memoizedState = null;
  a.pendingProps = null;
  a.stateNode = null;
  a.updateQueue = null;
}
function Tj(a) {
  return 5 === a.tag || 3 === a.tag || 4 === a.tag;
}
function Uj(a) {
  a:
    for (; ; ) {
      for (; null === a.sibling; ) {
        if (null === a.return || Tj(a.return))
          return null;
        a = a.return;
      }
      a.sibling.return = a.return;
      for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
        if (a.flags & 2)
          continue a;
        if (null === a.child || 4 === a.tag)
          continue a;
        else
          a.child.return = a, a = a.child;
      }
      if (!(a.flags & 2))
        return a.stateNode;
    }
}
function Vj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d)
    a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
  else if (4 !== d && (a = a.child, null !== a))
    for (Vj(a, b, c), a = a.sibling; null !== a; )
      Vj(a, b, c), a = a.sibling;
}
function Wj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d)
    a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
  else if (4 !== d && (a = a.child, null !== a))
    for (Wj(a, b, c), a = a.sibling; null !== a; )
      Wj(a, b, c), a = a.sibling;
}
var X$1 = null, Xj = false;
function Yj(a, b, c) {
  for (c = c.child; null !== c; )
    Zj(a, b, c), c = c.sibling;
}
function Zj(a, b, c) {
  if (lc && "function" === typeof lc.onCommitFiberUnmount)
    try {
      lc.onCommitFiberUnmount(kc, c);
    } catch (h) {
    }
  switch (c.tag) {
    case 5:
      U || Lj(c, b);
    case 6:
      var d = X$1, e = Xj;
      X$1 = null;
      Yj(a, b, c);
      X$1 = d;
      Xj = e;
      null !== X$1 && (Xj ? (a = X$1, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X$1.removeChild(c.stateNode));
      break;
    case 18:
      null !== X$1 && (Xj ? (a = X$1, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X$1, c.stateNode));
      break;
    case 4:
      d = X$1;
      e = Xj;
      X$1 = c.stateNode.containerInfo;
      Xj = true;
      Yj(a, b, c);
      X$1 = d;
      Xj = e;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
        e = d = d.next;
        do {
          var f2 = e, g = f2.destroy;
          f2 = f2.tag;
          void 0 !== g && (0 !== (f2 & 2) ? Mj(c, b, g) : 0 !== (f2 & 4) && Mj(c, b, g));
          e = e.next;
        } while (e !== d);
      }
      Yj(a, b, c);
      break;
    case 1:
      if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount))
        try {
          d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
        } catch (h) {
          W(c, b, h);
        }
      Yj(a, b, c);
      break;
    case 21:
      Yj(a, b, c);
      break;
    case 22:
      c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
      break;
    default:
      Yj(a, b, c);
  }
}
function ak(a) {
  var b = a.updateQueue;
  if (null !== b) {
    a.updateQueue = null;
    var c = a.stateNode;
    null === c && (c = a.stateNode = new Kj());
    b.forEach(function(b2) {
      var d = bk.bind(null, a, b2);
      c.has(b2) || (c.add(b2), b2.then(d, d));
    });
  }
}
function ck(a, b) {
  var c = b.deletions;
  if (null !== c)
    for (var d = 0; d < c.length; d++) {
      var e = c[d];
      try {
        var f2 = a, g = b, h = g;
        a:
          for (; null !== h; ) {
            switch (h.tag) {
              case 5:
                X$1 = h.stateNode;
                Xj = false;
                break a;
              case 3:
                X$1 = h.stateNode.containerInfo;
                Xj = true;
                break a;
              case 4:
                X$1 = h.stateNode.containerInfo;
                Xj = true;
                break a;
            }
            h = h.return;
          }
        if (null === X$1)
          throw Error(p(160));
        Zj(f2, g, e);
        X$1 = null;
        Xj = false;
        var k2 = e.alternate;
        null !== k2 && (k2.return = null);
        e.return = null;
      } catch (l2) {
        W(e, b, l2);
      }
    }
  if (b.subtreeFlags & 12854)
    for (b = b.child; null !== b; )
      dk(b, a), b = b.sibling;
}
function dk(a, b) {
  var c = a.alternate, d = a.flags;
  switch (a.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      ck(b, a);
      ek(a);
      if (d & 4) {
        try {
          Pj(3, a, a.return), Qj(3, a);
        } catch (t2) {
          W(a, a.return, t2);
        }
        try {
          Pj(5, a, a.return);
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 1:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      break;
    case 5:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      if (a.flags & 32) {
        var e = a.stateNode;
        try {
          ob(e, "");
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      if (d & 4 && (e = a.stateNode, null != e)) {
        var f2 = a.memoizedProps, g = null !== c ? c.memoizedProps : f2, h = a.type, k2 = a.updateQueue;
        a.updateQueue = null;
        if (null !== k2)
          try {
            "input" === h && "radio" === f2.type && null != f2.name && ab(e, f2);
            vb(h, g);
            var l2 = vb(h, f2);
            for (g = 0; g < k2.length; g += 2) {
              var m2 = k2[g], q2 = k2[g + 1];
              "style" === m2 ? sb(e, q2) : "dangerouslySetInnerHTML" === m2 ? nb(e, q2) : "children" === m2 ? ob(e, q2) : ta(e, m2, q2, l2);
            }
            switch (h) {
              case "input":
                bb(e, f2);
                break;
              case "textarea":
                ib(e, f2);
                break;
              case "select":
                var r2 = e._wrapperState.wasMultiple;
                e._wrapperState.wasMultiple = !!f2.multiple;
                var y2 = f2.value;
                null != y2 ? fb(e, !!f2.multiple, y2, false) : r2 !== !!f2.multiple && (null != f2.defaultValue ? fb(
                  e,
                  !!f2.multiple,
                  f2.defaultValue,
                  true
                ) : fb(e, !!f2.multiple, f2.multiple ? [] : "", false));
            }
            e[Pf] = f2;
          } catch (t2) {
            W(a, a.return, t2);
          }
      }
      break;
    case 6:
      ck(b, a);
      ek(a);
      if (d & 4) {
        if (null === a.stateNode)
          throw Error(p(162));
        e = a.stateNode;
        f2 = a.memoizedProps;
        try {
          e.nodeValue = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 3:
      ck(b, a);
      ek(a);
      if (d & 4 && null !== c && c.memoizedState.isDehydrated)
        try {
          bd(b.containerInfo);
        } catch (t2) {
          W(a, a.return, t2);
        }
      break;
    case 4:
      ck(b, a);
      ek(a);
      break;
    case 13:
      ck(b, a);
      ek(a);
      e = a.child;
      e.flags & 8192 && (f2 = null !== e.memoizedState, e.stateNode.isHidden = f2, !f2 || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
      d & 4 && ak(a);
      break;
    case 22:
      m2 = null !== c && null !== c.memoizedState;
      a.mode & 1 ? (U = (l2 = U) || m2, ck(b, a), U = l2) : ck(b, a);
      ek(a);
      if (d & 8192) {
        l2 = null !== a.memoizedState;
        if ((a.stateNode.isHidden = l2) && !m2 && 0 !== (a.mode & 1))
          for (V = a, m2 = a.child; null !== m2; ) {
            for (q2 = V = m2; null !== V; ) {
              r2 = V;
              y2 = r2.child;
              switch (r2.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Pj(4, r2, r2.return);
                  break;
                case 1:
                  Lj(r2, r2.return);
                  var n2 = r2.stateNode;
                  if ("function" === typeof n2.componentWillUnmount) {
                    d = r2;
                    c = r2.return;
                    try {
                      b = d, n2.props = b.memoizedProps, n2.state = b.memoizedState, n2.componentWillUnmount();
                    } catch (t2) {
                      W(d, c, t2);
                    }
                  }
                  break;
                case 5:
                  Lj(r2, r2.return);
                  break;
                case 22:
                  if (null !== r2.memoizedState) {
                    gk(q2);
                    continue;
                  }
              }
              null !== y2 ? (y2.return = r2, V = y2) : gk(q2);
            }
            m2 = m2.sibling;
          }
        a:
          for (m2 = null, q2 = a; ; ) {
            if (5 === q2.tag) {
              if (null === m2) {
                m2 = q2;
                try {
                  e = q2.stateNode, l2 ? (f2 = e.style, "function" === typeof f2.setProperty ? f2.setProperty("display", "none", "important") : f2.display = "none") : (h = q2.stateNode, k2 = q2.memoizedProps.style, g = void 0 !== k2 && null !== k2 && k2.hasOwnProperty("display") ? k2.display : null, h.style.display = rb("display", g));
                } catch (t2) {
                  W(a, a.return, t2);
                }
              }
            } else if (6 === q2.tag) {
              if (null === m2)
                try {
                  q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
                } catch (t2) {
                  W(a, a.return, t2);
                }
            } else if ((22 !== q2.tag && 23 !== q2.tag || null === q2.memoizedState || q2 === a) && null !== q2.child) {
              q2.child.return = q2;
              q2 = q2.child;
              continue;
            }
            if (q2 === a)
              break a;
            for (; null === q2.sibling; ) {
              if (null === q2.return || q2.return === a)
                break a;
              m2 === q2 && (m2 = null);
              q2 = q2.return;
            }
            m2 === q2 && (m2 = null);
            q2.sibling.return = q2.return;
            q2 = q2.sibling;
          }
      }
      break;
    case 19:
      ck(b, a);
      ek(a);
      d & 4 && ak(a);
      break;
    case 21:
      break;
    default:
      ck(
        b,
        a
      ), ek(a);
  }
}
function ek(a) {
  var b = a.flags;
  if (b & 2) {
    try {
      a: {
        for (var c = a.return; null !== c; ) {
          if (Tj(c)) {
            var d = c;
            break a;
          }
          c = c.return;
        }
        throw Error(p(160));
      }
      switch (d.tag) {
        case 5:
          var e = d.stateNode;
          d.flags & 32 && (ob(e, ""), d.flags &= -33);
          var f2 = Uj(a);
          Wj(a, f2, e);
          break;
        case 3:
        case 4:
          var g = d.stateNode.containerInfo, h = Uj(a);
          Vj(a, h, g);
          break;
        default:
          throw Error(p(161));
      }
    } catch (k2) {
      W(a, a.return, k2);
    }
    a.flags &= -3;
  }
  b & 4096 && (a.flags &= -4097);
}
function hk(a, b, c) {
  V = a;
  ik(a);
}
function ik(a, b, c) {
  for (var d = 0 !== (a.mode & 1); null !== V; ) {
    var e = V, f2 = e.child;
    if (22 === e.tag && d) {
      var g = null !== e.memoizedState || Jj;
      if (!g) {
        var h = e.alternate, k2 = null !== h && null !== h.memoizedState || U;
        h = Jj;
        var l2 = U;
        Jj = g;
        if ((U = k2) && !l2)
          for (V = e; null !== V; )
            g = V, k2 = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k2 ? (k2.return = g, V = k2) : jk(e);
        for (; null !== f2; )
          V = f2, ik(f2), f2 = f2.sibling;
        V = e;
        Jj = h;
        U = l2;
      }
      kk(a);
    } else
      0 !== (e.subtreeFlags & 8772) && null !== f2 ? (f2.return = e, V = f2) : kk(a);
  }
}
function kk(a) {
  for (; null !== V; ) {
    var b = V;
    if (0 !== (b.flags & 8772)) {
      var c = b.alternate;
      try {
        if (0 !== (b.flags & 8772))
          switch (b.tag) {
            case 0:
            case 11:
            case 15:
              U || Qj(5, b);
              break;
            case 1:
              var d = b.stateNode;
              if (b.flags & 4 && !U)
                if (null === c)
                  d.componentDidMount();
                else {
                  var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
                  d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
                }
              var f2 = b.updateQueue;
              null !== f2 && sh(b, f2, d);
              break;
            case 3:
              var g = b.updateQueue;
              if (null !== g) {
                c = null;
                if (null !== b.child)
                  switch (b.child.tag) {
                    case 5:
                      c = b.child.stateNode;
                      break;
                    case 1:
                      c = b.child.stateNode;
                  }
                sh(b, g, c);
              }
              break;
            case 5:
              var h = b.stateNode;
              if (null === c && b.flags & 4) {
                c = h;
                var k2 = b.memoizedProps;
                switch (b.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    k2.autoFocus && c.focus();
                    break;
                  case "img":
                    k2.src && (c.src = k2.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (null === b.memoizedState) {
                var l2 = b.alternate;
                if (null !== l2) {
                  var m2 = l2.memoizedState;
                  if (null !== m2) {
                    var q2 = m2.dehydrated;
                    null !== q2 && bd(q2);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(p(163));
          }
        U || b.flags & 512 && Rj(b);
      } catch (r2) {
        W(b, b.return, r2);
      }
    }
    if (b === a) {
      V = null;
      break;
    }
    c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function gk(a) {
  for (; null !== V; ) {
    var b = V;
    if (b === a) {
      V = null;
      break;
    }
    var c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function jk(a) {
  for (; null !== V; ) {
    var b = V;
    try {
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          var c = b.return;
          try {
            Qj(4, b);
          } catch (k2) {
            W(b, c, k2);
          }
          break;
        case 1:
          var d = b.stateNode;
          if ("function" === typeof d.componentDidMount) {
            var e = b.return;
            try {
              d.componentDidMount();
            } catch (k2) {
              W(b, e, k2);
            }
          }
          var f2 = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, f2, k2);
          }
          break;
        case 5:
          var g = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, g, k2);
          }
      }
    } catch (k2) {
      W(b, b.return, k2);
    }
    if (b === a) {
      V = null;
      break;
    }
    var h = b.sibling;
    if (null !== h) {
      h.return = b.return;
      V = h;
      break;
    }
    V = b.return;
  }
}
var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
function R() {
  return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
}
function yi(a) {
  if (0 === (a.mode & 1))
    return 1;
  if (0 !== (K & 2) && 0 !== Z)
    return Z & -Z;
  if (null !== Kg.transition)
    return 0 === Bk && (Bk = yc()), Bk;
  a = C;
  if (0 !== a)
    return a;
  a = window.event;
  a = void 0 === a ? 16 : jd(a.type);
  return a;
}
function gi(a, b, c, d) {
  if (50 < yk)
    throw yk = 0, zk = null, Error(p(185));
  Ac(a, c, d);
  if (0 === (K & 2) || a !== Q)
    a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
}
function Dk(a, b) {
  var c = a.callbackNode;
  wc(a, b);
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d)
    null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
  else if (b = d & -d, a.callbackPriority !== b) {
    null != c && bc(c);
    if (1 === b)
      0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
        0 === (K & 6) && jg();
      }), c = null;
    else {
      switch (Dc(d)) {
        case 1:
          c = fc;
          break;
        case 4:
          c = gc;
          break;
        case 16:
          c = hc;
          break;
        case 536870912:
          c = jc;
          break;
        default:
          c = hc;
      }
      c = Fk(c, Gk.bind(null, a));
    }
    a.callbackPriority = b;
    a.callbackNode = c;
  }
}
function Gk(a, b) {
  Ak = -1;
  Bk = 0;
  if (0 !== (K & 6))
    throw Error(p(327));
  var c = a.callbackNode;
  if (Hk() && a.callbackNode !== c)
    return null;
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d)
    return null;
  if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b)
    b = Ik(a, d);
  else {
    b = d;
    var e = K;
    K |= 2;
    var f2 = Jk();
    if (Q !== a || Z !== b)
      uk = null, Gj = B() + 500, Kk(a, b);
    do
      try {
        Lk();
        break;
      } catch (h) {
        Mk(a, h);
      }
    while (1);
    $g();
    mk.current = f2;
    K = e;
    null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
  }
  if (0 !== b) {
    2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
    if (1 === b)
      throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
    if (6 === b)
      Ck(a, d);
    else {
      e = a.current.alternate;
      if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f2 = xc(a), 0 !== f2 && (d = f2, b = Nk(a, f2))), 1 === b))
        throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      a.finishedWork = e;
      a.finishedLanes = d;
      switch (b) {
        case 0:
        case 1:
          throw Error(p(345));
        case 2:
          Pk(a, tk, uk);
          break;
        case 3:
          Ck(a, d);
          if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
            if (0 !== uc(a, 0))
              break;
            e = a.suspendedLanes;
            if ((e & d) !== d) {
              R();
              a.pingedLanes |= a.suspendedLanes & e;
              break;
            }
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 4:
          Ck(a, d);
          if ((d & 4194240) === d)
            break;
          b = a.eventTimes;
          for (e = -1; 0 < d; ) {
            var g = 31 - oc(d);
            f2 = 1 << g;
            g = b[g];
            g > e && (e = g);
            d &= ~f2;
          }
          d = e;
          d = B() - d;
          d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
          if (10 < d) {
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 5:
          Pk(a, tk, uk);
          break;
        default:
          throw Error(p(329));
      }
    }
  }
  Dk(a, B());
  return a.callbackNode === c ? Gk.bind(null, a) : null;
}
function Nk(a, b) {
  var c = sk;
  a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
  a = Ik(a, b);
  2 !== a && (b = tk, tk = c, null !== b && Fj(b));
  return a;
}
function Fj(a) {
  null === tk ? tk = a : tk.push.apply(tk, a);
}
function Ok(a) {
  for (var b = a; ; ) {
    if (b.flags & 16384) {
      var c = b.updateQueue;
      if (null !== c && (c = c.stores, null !== c))
        for (var d = 0; d < c.length; d++) {
          var e = c[d], f2 = e.getSnapshot;
          e = e.value;
          try {
            if (!He(f2(), e))
              return false;
          } catch (g) {
            return false;
          }
        }
    }
    c = b.child;
    if (b.subtreeFlags & 16384 && null !== c)
      c.return = b, b = c;
    else {
      if (b === a)
        break;
      for (; null === b.sibling; ) {
        if (null === b.return || b.return === a)
          return true;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
  }
  return true;
}
function Ck(a, b) {
  b &= ~rk;
  b &= ~qk;
  a.suspendedLanes |= b;
  a.pingedLanes &= ~b;
  for (a = a.expirationTimes; 0 < b; ) {
    var c = 31 - oc(b), d = 1 << c;
    a[c] = -1;
    b &= ~d;
  }
}
function Ek(a) {
  if (0 !== (K & 6))
    throw Error(p(327));
  Hk();
  var b = uc(a, 0);
  if (0 === (b & 1))
    return Dk(a, B()), null;
  var c = Ik(a, b);
  if (0 !== a.tag && 2 === c) {
    var d = xc(a);
    0 !== d && (b = d, c = Nk(a, d));
  }
  if (1 === c)
    throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
  if (6 === c)
    throw Error(p(345));
  a.finishedWork = a.current.alternate;
  a.finishedLanes = b;
  Pk(a, tk, uk);
  Dk(a, B());
  return null;
}
function Qk(a, b) {
  var c = K;
  K |= 1;
  try {
    return a(b);
  } finally {
    K = c, 0 === K && (Gj = B() + 500, fg && jg());
  }
}
function Rk(a) {
  null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
  var b = K;
  K |= 1;
  var c = ok.transition, d = C;
  try {
    if (ok.transition = null, C = 1, a)
      return a();
  } finally {
    C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
  }
}
function Hj() {
  fj = ej.current;
  E(ej);
}
function Kk(a, b) {
  a.finishedWork = null;
  a.finishedLanes = 0;
  var c = a.timeoutHandle;
  -1 !== c && (a.timeoutHandle = -1, Gf(c));
  if (null !== Y)
    for (c = Y.return; null !== c; ) {
      var d = c;
      wg(d);
      switch (d.tag) {
        case 1:
          d = d.type.childContextTypes;
          null !== d && void 0 !== d && $f();
          break;
        case 3:
          zh();
          E(Wf);
          E(H);
          Eh();
          break;
        case 5:
          Bh(d);
          break;
        case 4:
          zh();
          break;
        case 13:
          E(L);
          break;
        case 19:
          E(L);
          break;
        case 10:
          ah(d.type._context);
          break;
        case 22:
        case 23:
          Hj();
      }
      c = c.return;
    }
  Q = a;
  Y = a = Pg(a.current, null);
  Z = fj = b;
  T = 0;
  pk = null;
  rk = qk = rh = 0;
  tk = sk = null;
  if (null !== fh) {
    for (b = 0; b < fh.length; b++)
      if (c = fh[b], d = c.interleaved, null !== d) {
        c.interleaved = null;
        var e = d.next, f2 = c.pending;
        if (null !== f2) {
          var g = f2.next;
          f2.next = e;
          d.next = g;
        }
        c.pending = d;
      }
    fh = null;
  }
  return a;
}
function Mk(a, b) {
  do {
    var c = Y;
    try {
      $g();
      Fh.current = Rh;
      if (Ih) {
        for (var d = M.memoizedState; null !== d; ) {
          var e = d.queue;
          null !== e && (e.pending = null);
          d = d.next;
        }
        Ih = false;
      }
      Hh = 0;
      O = N = M = null;
      Jh = false;
      Kh = 0;
      nk.current = null;
      if (null === c || null === c.return) {
        T = 1;
        pk = b;
        Y = null;
        break;
      }
      a: {
        var f2 = a, g = c.return, h = c, k2 = b;
        b = Z;
        h.flags |= 32768;
        if (null !== k2 && "object" === typeof k2 && "function" === typeof k2.then) {
          var l2 = k2, m2 = h, q2 = m2.tag;
          if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
            var r2 = m2.alternate;
            r2 ? (m2.updateQueue = r2.updateQueue, m2.memoizedState = r2.memoizedState, m2.lanes = r2.lanes) : (m2.updateQueue = null, m2.memoizedState = null);
          }
          var y2 = Ui(g);
          if (null !== y2) {
            y2.flags &= -257;
            Vi(y2, g, h, f2, b);
            y2.mode & 1 && Si(f2, l2, b);
            b = y2;
            k2 = l2;
            var n2 = b.updateQueue;
            if (null === n2) {
              var t2 = /* @__PURE__ */ new Set();
              t2.add(k2);
              b.updateQueue = t2;
            } else
              n2.add(k2);
            break a;
          } else {
            if (0 === (b & 1)) {
              Si(f2, l2, b);
              tj();
              break a;
            }
            k2 = Error(p(426));
          }
        } else if (I && h.mode & 1) {
          var J2 = Ui(g);
          if (null !== J2) {
            0 === (J2.flags & 65536) && (J2.flags |= 256);
            Vi(J2, g, h, f2, b);
            Jg(Ji(k2, h));
            break a;
          }
        }
        f2 = k2 = Ji(k2, h);
        4 !== T && (T = 2);
        null === sk ? sk = [f2] : sk.push(f2);
        f2 = g;
        do {
          switch (f2.tag) {
            case 3:
              f2.flags |= 65536;
              b &= -b;
              f2.lanes |= b;
              var x2 = Ni(f2, k2, b);
              ph(f2, x2);
              break a;
            case 1:
              h = k2;
              var w2 = f2.type, u2 = f2.stateNode;
              if (0 === (f2.flags & 128) && ("function" === typeof w2.getDerivedStateFromError || null !== u2 && "function" === typeof u2.componentDidCatch && (null === Ri || !Ri.has(u2)))) {
                f2.flags |= 65536;
                b &= -b;
                f2.lanes |= b;
                var F2 = Qi(f2, h, b);
                ph(f2, F2);
                break a;
              }
          }
          f2 = f2.return;
        } while (null !== f2);
      }
      Sk(c);
    } catch (na) {
      b = na;
      Y === c && null !== c && (Y = c = c.return);
      continue;
    }
    break;
  } while (1);
}
function Jk() {
  var a = mk.current;
  mk.current = Rh;
  return null === a ? Rh : a;
}
function tj() {
  if (0 === T || 3 === T || 2 === T)
    T = 4;
  null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
}
function Ik(a, b) {
  var c = K;
  K |= 2;
  var d = Jk();
  if (Q !== a || Z !== b)
    uk = null, Kk(a, b);
  do
    try {
      Tk();
      break;
    } catch (e) {
      Mk(a, e);
    }
  while (1);
  $g();
  K = c;
  mk.current = d;
  if (null !== Y)
    throw Error(p(261));
  Q = null;
  Z = 0;
  return T;
}
function Tk() {
  for (; null !== Y; )
    Uk(Y);
}
function Lk() {
  for (; null !== Y && !cc(); )
    Uk(Y);
}
function Uk(a) {
  var b = Vk(a.alternate, a, fj);
  a.memoizedProps = a.pendingProps;
  null === b ? Sk(a) : Y = b;
  nk.current = null;
}
function Sk(a) {
  var b = a;
  do {
    var c = b.alternate;
    a = b.return;
    if (0 === (b.flags & 32768)) {
      if (c = Ej(c, b, fj), null !== c) {
        Y = c;
        return;
      }
    } else {
      c = Ij(c, b);
      if (null !== c) {
        c.flags &= 32767;
        Y = c;
        return;
      }
      if (null !== a)
        a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
      else {
        T = 6;
        Y = null;
        return;
      }
    }
    b = b.sibling;
    if (null !== b) {
      Y = b;
      return;
    }
    Y = b = a;
  } while (null !== b);
  0 === T && (T = 5);
}
function Pk(a, b, c) {
  var d = C, e = ok.transition;
  try {
    ok.transition = null, C = 1, Wk(a, b, c, d);
  } finally {
    ok.transition = e, C = d;
  }
  return null;
}
function Wk(a, b, c, d) {
  do
    Hk();
  while (null !== wk);
  if (0 !== (K & 6))
    throw Error(p(327));
  c = a.finishedWork;
  var e = a.finishedLanes;
  if (null === c)
    return null;
  a.finishedWork = null;
  a.finishedLanes = 0;
  if (c === a.current)
    throw Error(p(177));
  a.callbackNode = null;
  a.callbackPriority = 0;
  var f2 = c.lanes | c.childLanes;
  Bc(a, f2);
  a === Q && (Y = Q = null, Z = 0);
  0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
    Hk();
    return null;
  }));
  f2 = 0 !== (c.flags & 15990);
  if (0 !== (c.subtreeFlags & 15990) || f2) {
    f2 = ok.transition;
    ok.transition = null;
    var g = C;
    C = 1;
    var h = K;
    K |= 4;
    nk.current = null;
    Oj(a, c);
    dk(c, a);
    Oe(Df);
    dd = !!Cf;
    Df = Cf = null;
    a.current = c;
    hk(c);
    dc();
    K = h;
    C = g;
    ok.transition = f2;
  } else
    a.current = c;
  vk && (vk = false, wk = a, xk = e);
  f2 = a.pendingLanes;
  0 === f2 && (Ri = null);
  mc(c.stateNode);
  Dk(a, B());
  if (null !== b)
    for (d = a.onRecoverableError, c = 0; c < b.length; c++)
      e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
  if (Oi)
    throw Oi = false, a = Pi, Pi = null, a;
  0 !== (xk & 1) && 0 !== a.tag && Hk();
  f2 = a.pendingLanes;
  0 !== (f2 & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
  jg();
  return null;
}
function Hk() {
  if (null !== wk) {
    var a = Dc(xk), b = ok.transition, c = C;
    try {
      ok.transition = null;
      C = 16 > a ? 16 : a;
      if (null === wk)
        var d = false;
      else {
        a = wk;
        wk = null;
        xk = 0;
        if (0 !== (K & 6))
          throw Error(p(331));
        var e = K;
        K |= 4;
        for (V = a.current; null !== V; ) {
          var f2 = V, g = f2.child;
          if (0 !== (V.flags & 16)) {
            var h = f2.deletions;
            if (null !== h) {
              for (var k2 = 0; k2 < h.length; k2++) {
                var l2 = h[k2];
                for (V = l2; null !== V; ) {
                  var m2 = V;
                  switch (m2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(8, m2, f2);
                  }
                  var q2 = m2.child;
                  if (null !== q2)
                    q2.return = m2, V = q2;
                  else
                    for (; null !== V; ) {
                      m2 = V;
                      var r2 = m2.sibling, y2 = m2.return;
                      Sj(m2);
                      if (m2 === l2) {
                        V = null;
                        break;
                      }
                      if (null !== r2) {
                        r2.return = y2;
                        V = r2;
                        break;
                      }
                      V = y2;
                    }
                }
              }
              var n2 = f2.alternate;
              if (null !== n2) {
                var t2 = n2.child;
                if (null !== t2) {
                  n2.child = null;
                  do {
                    var J2 = t2.sibling;
                    t2.sibling = null;
                    t2 = J2;
                  } while (null !== t2);
                }
              }
              V = f2;
            }
          }
          if (0 !== (f2.subtreeFlags & 2064) && null !== g)
            g.return = f2, V = g;
          else
            b:
              for (; null !== V; ) {
                f2 = V;
                if (0 !== (f2.flags & 2048))
                  switch (f2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(9, f2, f2.return);
                  }
                var x2 = f2.sibling;
                if (null !== x2) {
                  x2.return = f2.return;
                  V = x2;
                  break b;
                }
                V = f2.return;
              }
        }
        var w2 = a.current;
        for (V = w2; null !== V; ) {
          g = V;
          var u2 = g.child;
          if (0 !== (g.subtreeFlags & 2064) && null !== u2)
            u2.return = g, V = u2;
          else
            b:
              for (g = w2; null !== V; ) {
                h = V;
                if (0 !== (h.flags & 2048))
                  try {
                    switch (h.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Qj(9, h);
                    }
                  } catch (na) {
                    W(h, h.return, na);
                  }
                if (h === g) {
                  V = null;
                  break b;
                }
                var F2 = h.sibling;
                if (null !== F2) {
                  F2.return = h.return;
                  V = F2;
                  break b;
                }
                V = h.return;
              }
        }
        K = e;
        jg();
        if (lc && "function" === typeof lc.onPostCommitFiberRoot)
          try {
            lc.onPostCommitFiberRoot(kc, a);
          } catch (na) {
          }
        d = true;
      }
      return d;
    } finally {
      C = c, ok.transition = b;
    }
  }
  return false;
}
function Xk(a, b, c) {
  b = Ji(c, b);
  b = Ni(a, b, 1);
  a = nh(a, b, 1);
  b = R();
  null !== a && (Ac(a, 1, b), Dk(a, b));
}
function W(a, b, c) {
  if (3 === a.tag)
    Xk(a, a, c);
  else
    for (; null !== b; ) {
      if (3 === b.tag) {
        Xk(b, a, c);
        break;
      } else if (1 === b.tag) {
        var d = b.stateNode;
        if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
          a = Ji(c, a);
          a = Qi(b, a, 1);
          b = nh(b, a, 1);
          a = R();
          null !== b && (Ac(b, 1, a), Dk(b, a));
          break;
        }
      }
      b = b.return;
    }
}
function Ti(a, b, c) {
  var d = a.pingCache;
  null !== d && d.delete(b);
  b = R();
  a.pingedLanes |= a.suspendedLanes & c;
  Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
  Dk(a, b);
}
function Yk(a, b) {
  0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
  var c = R();
  a = ih(a, b);
  null !== a && (Ac(a, b, c), Dk(a, c));
}
function uj(a) {
  var b = a.memoizedState, c = 0;
  null !== b && (c = b.retryLane);
  Yk(a, c);
}
function bk(a, b) {
  var c = 0;
  switch (a.tag) {
    case 13:
      var d = a.stateNode;
      var e = a.memoizedState;
      null !== e && (c = e.retryLane);
      break;
    case 19:
      d = a.stateNode;
      break;
    default:
      throw Error(p(314));
  }
  null !== d && d.delete(b);
  Yk(a, c);
}
var Vk;
Vk = function(a, b, c) {
  if (null !== a)
    if (a.memoizedProps !== b.pendingProps || Wf.current)
      dh = true;
    else {
      if (0 === (a.lanes & c) && 0 === (b.flags & 128))
        return dh = false, yj(a, b, c);
      dh = 0 !== (a.flags & 131072) ? true : false;
    }
  else
    dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
  b.lanes = 0;
  switch (b.tag) {
    case 2:
      var d = b.type;
      ij(a, b);
      a = b.pendingProps;
      var e = Yf(b, H.current);
      ch(b, c);
      e = Nh(null, b, d, a, e, c);
      var f2 = Sh();
      b.flags |= 1;
      "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f2 = true, cg(b)) : f2 = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f2, c)) : (b.tag = 0, I && f2 && vg(b), Xi(null, b, e, c), b = b.child);
      return b;
    case 16:
      d = b.elementType;
      a: {
        ij(a, b);
        a = b.pendingProps;
        e = d._init;
        d = e(d._payload);
        b.type = d;
        e = b.tag = Zk(d);
        a = Ci(d, a);
        switch (e) {
          case 0:
            b = cj(null, b, d, a, c);
            break a;
          case 1:
            b = hj(null, b, d, a, c);
            break a;
          case 11:
            b = Yi(null, b, d, a, c);
            break a;
          case 14:
            b = $i(null, b, d, Ci(d.type, a), c);
            break a;
        }
        throw Error(p(
          306,
          d,
          ""
        ));
      }
      return b;
    case 0:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
    case 1:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
    case 3:
      a: {
        kj(b);
        if (null === a)
          throw Error(p(387));
        d = b.pendingProps;
        f2 = b.memoizedState;
        e = f2.element;
        lh(a, b);
        qh(b, d, null, c);
        var g = b.memoizedState;
        d = g.element;
        if (f2.isDehydrated)
          if (f2 = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f2, b.memoizedState = f2, b.flags & 256) {
            e = Ji(Error(p(423)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else if (d !== e) {
            e = Ji(Error(p(424)), b);
            b = lj(a, b, d, c, e);
            break a;
          } else
            for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; )
              c.flags = c.flags & -3 | 4096, c = c.sibling;
        else {
          Ig();
          if (d === e) {
            b = Zi(a, b, c);
            break a;
          }
          Xi(a, b, d, c);
        }
        b = b.child;
      }
      return b;
    case 5:
      return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f2 = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f2 && Ef(d, f2) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
    case 6:
      return null === a && Eg(b), null;
    case 13:
      return oj(a, b, c);
    case 4:
      return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
    case 11:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
    case 7:
      return Xi(a, b, b.pendingProps, c), b.child;
    case 8:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 12:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 10:
      a: {
        d = b.type._context;
        e = b.pendingProps;
        f2 = b.memoizedProps;
        g = e.value;
        G(Wg, d._currentValue);
        d._currentValue = g;
        if (null !== f2)
          if (He(f2.value, g)) {
            if (f2.children === e.children && !Wf.current) {
              b = Zi(a, b, c);
              break a;
            }
          } else
            for (f2 = b.child, null !== f2 && (f2.return = b); null !== f2; ) {
              var h = f2.dependencies;
              if (null !== h) {
                g = f2.child;
                for (var k2 = h.firstContext; null !== k2; ) {
                  if (k2.context === d) {
                    if (1 === f2.tag) {
                      k2 = mh(-1, c & -c);
                      k2.tag = 2;
                      var l2 = f2.updateQueue;
                      if (null !== l2) {
                        l2 = l2.shared;
                        var m2 = l2.pending;
                        null === m2 ? k2.next = k2 : (k2.next = m2.next, m2.next = k2);
                        l2.pending = k2;
                      }
                    }
                    f2.lanes |= c;
                    k2 = f2.alternate;
                    null !== k2 && (k2.lanes |= c);
                    bh(
                      f2.return,
                      c,
                      b
                    );
                    h.lanes |= c;
                    break;
                  }
                  k2 = k2.next;
                }
              } else if (10 === f2.tag)
                g = f2.type === b.type ? null : f2.child;
              else if (18 === f2.tag) {
                g = f2.return;
                if (null === g)
                  throw Error(p(341));
                g.lanes |= c;
                h = g.alternate;
                null !== h && (h.lanes |= c);
                bh(g, c, b);
                g = f2.sibling;
              } else
                g = f2.child;
              if (null !== g)
                g.return = f2;
              else
                for (g = f2; null !== g; ) {
                  if (g === b) {
                    g = null;
                    break;
                  }
                  f2 = g.sibling;
                  if (null !== f2) {
                    f2.return = g.return;
                    g = f2;
                    break;
                  }
                  g = g.return;
                }
              f2 = g;
            }
        Xi(a, b, e.children, c);
        b = b.child;
      }
      return b;
    case 9:
      return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
    case 14:
      return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
    case 15:
      return bj(a, b, b.type, b.pendingProps, c);
    case 17:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
    case 19:
      return xj(a, b, c);
    case 22:
      return dj(a, b, c);
  }
  throw Error(p(156, b.tag));
};
function Fk(a, b) {
  return ac(a, b);
}
function $k(a, b, c, d) {
  this.tag = a;
  this.key = c;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function Bg(a, b, c, d) {
  return new $k(a, b, c, d);
}
function aj(a) {
  a = a.prototype;
  return !(!a || !a.isReactComponent);
}
function Zk(a) {
  if ("function" === typeof a)
    return aj(a) ? 1 : 0;
  if (void 0 !== a && null !== a) {
    a = a.$$typeof;
    if (a === Da)
      return 11;
    if (a === Ga)
      return 14;
  }
  return 2;
}
function Pg(a, b) {
  var c = a.alternate;
  null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
  c.flags = a.flags & 14680064;
  c.childLanes = a.childLanes;
  c.lanes = a.lanes;
  c.child = a.child;
  c.memoizedProps = a.memoizedProps;
  c.memoizedState = a.memoizedState;
  c.updateQueue = a.updateQueue;
  b = a.dependencies;
  c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
  c.sibling = a.sibling;
  c.index = a.index;
  c.ref = a.ref;
  return c;
}
function Rg(a, b, c, d, e, f2) {
  var g = 2;
  d = a;
  if ("function" === typeof a)
    aj(a) && (g = 1);
  else if ("string" === typeof a)
    g = 5;
  else
    a:
      switch (a) {
        case ya:
          return Tg(c.children, e, f2, b);
        case za:
          g = 8;
          e |= 8;
          break;
        case Aa:
          return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f2, a;
        case Ea:
          return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f2, a;
        case Fa:
          return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f2, a;
        case Ia:
          return pj(c, e, f2, b);
        default:
          if ("object" === typeof a && null !== a)
            switch (a.$$typeof) {
              case Ba:
                g = 10;
                break a;
              case Ca:
                g = 9;
                break a;
              case Da:
                g = 11;
                break a;
              case Ga:
                g = 14;
                break a;
              case Ha:
                g = 16;
                d = null;
                break a;
            }
          throw Error(p(130, null == a ? a : typeof a, ""));
      }
  b = Bg(g, c, b, e);
  b.elementType = a;
  b.type = d;
  b.lanes = f2;
  return b;
}
function Tg(a, b, c, d) {
  a = Bg(7, a, d, b);
  a.lanes = c;
  return a;
}
function pj(a, b, c, d) {
  a = Bg(22, a, d, b);
  a.elementType = Ia;
  a.lanes = c;
  a.stateNode = { isHidden: false };
  return a;
}
function Qg(a, b, c) {
  a = Bg(6, a, null, b);
  a.lanes = c;
  return a;
}
function Sg(a, b, c) {
  b = Bg(4, null !== a.children ? a.children : [], a.key, b);
  b.lanes = c;
  b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
  return b;
}
function al(a, b, c, d, e) {
  this.tag = b;
  this.containerInfo = a;
  this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode = this.pendingContext = this.context = null;
  this.callbackPriority = 0;
  this.eventTimes = zc(0);
  this.expirationTimes = zc(-1);
  this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
  this.entanglements = zc(0);
  this.identifierPrefix = d;
  this.onRecoverableError = e;
  this.mutableSourceEagerHydrationData = null;
}
function bl(a, b, c, d, e, f2, g, h, k2) {
  a = new al(a, b, c, h, k2);
  1 === b ? (b = 1, true === f2 && (b |= 8)) : b = 0;
  f2 = Bg(3, null, null, b);
  a.current = f2;
  f2.stateNode = a;
  f2.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
  kh(f2);
  return a;
}
function cl(a, b, c) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
}
function dl(a) {
  if (!a)
    return Vf;
  a = a._reactInternals;
  a: {
    if (Vb(a) !== a || 1 !== a.tag)
      throw Error(p(170));
    var b = a;
    do {
      switch (b.tag) {
        case 3:
          b = b.stateNode.context;
          break a;
        case 1:
          if (Zf(b.type)) {
            b = b.stateNode.__reactInternalMemoizedMergedChildContext;
            break a;
          }
      }
      b = b.return;
    } while (null !== b);
    throw Error(p(171));
  }
  if (1 === a.tag) {
    var c = a.type;
    if (Zf(c))
      return bg(a, c, b);
  }
  return b;
}
function el(a, b, c, d, e, f2, g, h, k2) {
  a = bl(c, d, true, a, e, f2, g, h, k2);
  a.context = dl(null);
  c = a.current;
  d = R();
  e = yi(c);
  f2 = mh(d, e);
  f2.callback = void 0 !== b && null !== b ? b : null;
  nh(c, f2, e);
  a.current.lanes = e;
  Ac(a, e, d);
  Dk(a, d);
  return a;
}
function fl(a, b, c, d) {
  var e = b.current, f2 = R(), g = yi(e);
  c = dl(c);
  null === b.context ? b.context = c : b.pendingContext = c;
  b = mh(f2, g);
  b.payload = { element: a };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  a = nh(e, b, g);
  null !== a && (gi(a, e, g, f2), oh(a, e, g));
  return g;
}
function gl(a) {
  a = a.current;
  if (!a.child)
    return null;
  switch (a.child.tag) {
    case 5:
      return a.child.stateNode;
    default:
      return a.child.stateNode;
  }
}
function hl(a, b) {
  a = a.memoizedState;
  if (null !== a && null !== a.dehydrated) {
    var c = a.retryLane;
    a.retryLane = 0 !== c && c < b ? c : b;
  }
}
function il(a, b) {
  hl(a, b);
  (a = a.alternate) && hl(a, b);
}
function jl() {
  return null;
}
var kl = "function" === typeof reportError ? reportError : function(a) {
  console.error(a);
};
function ll(a) {
  this._internalRoot = a;
}
ml.prototype.render = ll.prototype.render = function(a) {
  var b = this._internalRoot;
  if (null === b)
    throw Error(p(409));
  fl(a, b, null, null);
};
ml.prototype.unmount = ll.prototype.unmount = function() {
  var a = this._internalRoot;
  if (null !== a) {
    this._internalRoot = null;
    var b = a.containerInfo;
    Rk(function() {
      fl(null, a, null, null);
    });
    b[uf] = null;
  }
};
function ml(a) {
  this._internalRoot = a;
}
ml.prototype.unstable_scheduleHydration = function(a) {
  if (a) {
    var b = Hc();
    a = { blockedOn: null, target: a, priority: b };
    for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++)
      ;
    Qc.splice(c, 0, a);
    0 === c && Vc(a);
  }
};
function nl(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
}
function ol(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
}
function pl() {
}
function ql(a, b, c, d, e) {
  if (e) {
    if ("function" === typeof d) {
      var f2 = d;
      d = function() {
        var a2 = gl(g);
        f2.call(a2);
      };
    }
    var g = el(b, d, a, 0, null, false, false, "", pl);
    a._reactRootContainer = g;
    a[uf] = g.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk();
    return g;
  }
  for (; e = a.lastChild; )
    a.removeChild(e);
  if ("function" === typeof d) {
    var h = d;
    d = function() {
      var a2 = gl(k2);
      h.call(a2);
    };
  }
  var k2 = bl(a, 0, false, null, null, false, false, "", pl);
  a._reactRootContainer = k2;
  a[uf] = k2.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  Rk(function() {
    fl(b, k2, c, d);
  });
  return k2;
}
function rl(a, b, c, d, e) {
  var f2 = c._reactRootContainer;
  if (f2) {
    var g = f2;
    if ("function" === typeof e) {
      var h = e;
      e = function() {
        var a2 = gl(g);
        h.call(a2);
      };
    }
    fl(b, g, a, e);
  } else
    g = ql(c, b, a, e, d);
  return gl(g);
}
Ec = function(a) {
  switch (a.tag) {
    case 3:
      var b = a.stateNode;
      if (b.current.memoizedState.isDehydrated) {
        var c = tc(b.pendingLanes);
        0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
      }
      break;
    case 13:
      Rk(function() {
        var b2 = ih(a, 1);
        if (null !== b2) {
          var c2 = R();
          gi(b2, a, 1, c2);
        }
      }), il(a, 1);
  }
};
Fc = function(a) {
  if (13 === a.tag) {
    var b = ih(a, 134217728);
    if (null !== b) {
      var c = R();
      gi(b, a, 134217728, c);
    }
    il(a, 134217728);
  }
};
Gc = function(a) {
  if (13 === a.tag) {
    var b = yi(a), c = ih(a, b);
    if (null !== c) {
      var d = R();
      gi(c, a, b, d);
    }
    il(a, b);
  }
};
Hc = function() {
  return C;
};
Ic = function(a, b) {
  var c = C;
  try {
    return C = a, b();
  } finally {
    C = c;
  }
};
yb = function(a, b, c) {
  switch (b) {
    case "input":
      bb(a, c);
      b = c.name;
      if ("radio" === c.type && null != b) {
        for (c = a; c.parentNode; )
          c = c.parentNode;
        c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
        for (b = 0; b < c.length; b++) {
          var d = c[b];
          if (d !== a && d.form === a.form) {
            var e = Db(d);
            if (!e)
              throw Error(p(90));
            Wa(d);
            bb(d, e);
          }
        }
      }
      break;
    case "textarea":
      ib(a, c);
      break;
    case "select":
      b = c.value, null != b && fb(a, !!c.multiple, b, false);
  }
};
Gb = Qk;
Hb = Rk;
var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
  a = Zb(a);
  return null === a ? null : a.stateNode;
}, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vl.isDisabled && vl.supportsFiber)
    try {
      kc = vl.inject(ul), lc = vl;
    } catch (a) {
    }
}
reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
reactDom_production_min.createPortal = function(a, b) {
  var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!nl(b))
    throw Error(p(200));
  return cl(a, b, null, c);
};
reactDom_production_min.createRoot = function(a, b) {
  if (!nl(a))
    throw Error(p(299));
  var c = false, d = "", e = kl;
  null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
  b = bl(a, 1, false, null, null, c, false, d, e);
  a[uf] = b.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  return new ll(b);
};
reactDom_production_min.findDOMNode = function(a) {
  if (null == a)
    return null;
  if (1 === a.nodeType)
    return a;
  var b = a._reactInternals;
  if (void 0 === b) {
    if ("function" === typeof a.render)
      throw Error(p(188));
    a = Object.keys(a).join(",");
    throw Error(p(268, a));
  }
  a = Zb(b);
  a = null === a ? null : a.stateNode;
  return a;
};
reactDom_production_min.flushSync = function(a) {
  return Rk(a);
};
reactDom_production_min.hydrate = function(a, b, c) {
  if (!ol(b))
    throw Error(p(200));
  return rl(null, a, b, true, c);
};
reactDom_production_min.hydrateRoot = function(a, b, c) {
  if (!nl(a))
    throw Error(p(405));
  var d = null != c && c.hydratedSources || null, e = false, f2 = "", g = kl;
  null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f2 = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
  b = el(b, null, a, 1, null != c ? c : null, e, false, f2, g);
  a[uf] = b.current;
  sf(a);
  if (d)
    for (a = 0; a < d.length; a++)
      c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
        c,
        e
      );
  return new ml(b);
};
reactDom_production_min.render = function(a, b, c) {
  if (!ol(b))
    throw Error(p(200));
  return rl(null, a, b, false, c);
};
reactDom_production_min.unmountComponentAtNode = function(a) {
  if (!ol(a))
    throw Error(p(40));
  return a._reactRootContainer ? (Rk(function() {
    rl(null, null, a, false, function() {
      a._reactRootContainer = null;
      a[uf] = null;
    });
  }), true) : false;
};
reactDom_production_min.unstable_batchedUpdates = Qk;
reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
  if (!ol(c))
    throw Error(p(200));
  if (null == a || void 0 === a._reactInternals)
    throw Error(p(38));
  return rl(a, b, c, false, d);
};
reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
function checkDCE() {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
    return;
  }
  try {
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    console.error(err);
  }
}
{
  checkDCE();
  reactDom.exports = reactDom_production_min;
}
var reactDomExports = reactDom.exports;
var m = reactDomExports;
{
  client.createRoot = m.createRoot;
  client.hydrateRoot = m.hydrateRoot;
}
var Subscribable = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Set();
    this.subscribe = this.subscribe.bind(this);
  }
  subscribe(listener) {
    this.listeners.add(listener);
    this.onSubscribe();
    return () => {
      this.listeners.delete(listener);
      this.onUnsubscribe();
    };
  }
  hasListeners() {
    return this.listeners.size > 0;
  }
  onSubscribe() {
  }
  onUnsubscribe() {
  }
};
var defaultTimeoutProvider = {
  // We need the wrapper function syntax below instead of direct references to
  // global setTimeout etc.
  //
  // BAD: `setTimeout: setTimeout`
  // GOOD: `setTimeout: (cb, delay) => setTimeout(cb, delay)`
  //
  // If we use direct references here, then anything that wants to spy on or
  // replace the global setTimeout (like tests) won't work since we'll already
  // have a hard reference to the original implementation at the time when this
  // file was imported.
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (timeoutId) => clearTimeout(timeoutId),
  setInterval: (callback, delay) => setInterval(callback, delay),
  clearInterval: (intervalId) => clearInterval(intervalId)
};
var TimeoutManager = (_a = class {
  constructor() {
    // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
    // type at app boot; and if we leave that type, then any new timer provider
    // would need to support ReturnType<typeof setTimeout>, which is infeasible.
    //
    // We settle for type safety for the TimeoutProvider type, and accept that
    // this class is unsafe internally to allow for extension.
    __privateAdd(this, _provider, defaultTimeoutProvider);
    __privateAdd(this, _providerCalled, false);
  }
  setTimeoutProvider(provider) {
    __privateSet(this, _provider, provider);
  }
  setTimeout(callback, delay) {
    return __privateGet(this, _provider).setTimeout(callback, delay);
  }
  clearTimeout(timeoutId) {
    __privateGet(this, _provider).clearTimeout(timeoutId);
  }
  setInterval(callback, delay) {
    return __privateGet(this, _provider).setInterval(callback, delay);
  }
  clearInterval(intervalId) {
    __privateGet(this, _provider).clearInterval(intervalId);
  }
}, _provider = new WeakMap(), _providerCalled = new WeakMap(), _a);
var timeoutManager = new TimeoutManager();
function systemSetTimeoutZero(callback) {
  setTimeout(callback, 0);
}
var isServer = typeof window === "undefined" || "Deno" in globalThis;
function noop() {
}
function functionalUpdate(updater, input) {
  return typeof updater === "function" ? updater(input) : updater;
}
function isValidTimeout(value) {
  return typeof value === "number" && value >= 0 && value !== Infinity;
}
function timeUntilStale(updatedAt, staleTime) {
  return Math.max(updatedAt + (staleTime || 0) - Date.now(), 0);
}
function resolveStaleTime(staleTime, query) {
  return typeof staleTime === "function" ? staleTime(query) : staleTime;
}
function resolveEnabled(enabled, query) {
  return typeof enabled === "function" ? enabled(query) : enabled;
}
function matchQuery(filters, query) {
  const {
    type = "all",
    exact,
    fetchStatus,
    predicate,
    queryKey,
    stale
  } = filters;
  if (queryKey) {
    if (exact) {
      if (query.queryHash !== hashQueryKeyByOptions(queryKey, query.options)) {
        return false;
      }
    } else if (!partialMatchKey(query.queryKey, queryKey)) {
      return false;
    }
  }
  if (type !== "all") {
    const isActive = query.isActive();
    if (type === "active" && !isActive) {
      return false;
    }
    if (type === "inactive" && isActive) {
      return false;
    }
  }
  if (typeof stale === "boolean" && query.isStale() !== stale) {
    return false;
  }
  if (fetchStatus && fetchStatus !== query.state.fetchStatus) {
    return false;
  }
  if (predicate && !predicate(query)) {
    return false;
  }
  return true;
}
function matchMutation(filters, mutation) {
  const { exact, status, predicate, mutationKey } = filters;
  if (mutationKey) {
    if (!mutation.options.mutationKey) {
      return false;
    }
    if (exact) {
      if (hashKey(mutation.options.mutationKey) !== hashKey(mutationKey)) {
        return false;
      }
    } else if (!partialMatchKey(mutation.options.mutationKey, mutationKey)) {
      return false;
    }
  }
  if (status && mutation.state.status !== status) {
    return false;
  }
  if (predicate && !predicate(mutation)) {
    return false;
  }
  return true;
}
function hashQueryKeyByOptions(queryKey, options) {
  const hashFn = (options == null ? void 0 : options.queryKeyHashFn) || hashKey;
  return hashFn(queryKey);
}
function hashKey(queryKey) {
  return JSON.stringify(
    queryKey,
    (_, val) => isPlainObject(val) ? Object.keys(val).sort().reduce((result, key) => {
      result[key] = val[key];
      return result;
    }, {}) : val
  );
}
function partialMatchKey(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    return Object.keys(b).every((key) => partialMatchKey(a[key], b[key]));
  }
  return false;
}
var hasOwn = Object.prototype.hasOwnProperty;
function replaceEqualDeep(a, b) {
  if (a === b) {
    return a;
  }
  const array = isPlainArray(a) && isPlainArray(b);
  if (!array && !(isPlainObject(a) && isPlainObject(b)))
    return b;
  const aItems = array ? a : Object.keys(a);
  const aSize = aItems.length;
  const bItems = array ? b : Object.keys(b);
  const bSize = bItems.length;
  const copy = array ? new Array(bSize) : {};
  let equalItems = 0;
  for (let i = 0; i < bSize; i++) {
    const key = array ? i : bItems[i];
    const aItem = a[key];
    const bItem = b[key];
    if (aItem === bItem) {
      copy[key] = aItem;
      if (array ? i < aSize : hasOwn.call(a, key))
        equalItems++;
      continue;
    }
    if (aItem === null || bItem === null || typeof aItem !== "object" || typeof bItem !== "object") {
      copy[key] = bItem;
      continue;
    }
    const v2 = replaceEqualDeep(aItem, bItem);
    copy[key] = v2;
    if (v2 === aItem)
      equalItems++;
  }
  return aSize === bSize && equalItems === aSize ? a : copy;
}
function shallowEqualObjects(a, b) {
  if (!b || Object.keys(a).length !== Object.keys(b).length) {
    return false;
  }
  for (const key in a) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}
function isPlainArray(value) {
  return Array.isArray(value) && value.length === Object.keys(value).length;
}
function isPlainObject(o) {
  if (!hasObjectPrototype(o)) {
    return false;
  }
  const ctor = o.constructor;
  if (ctor === void 0) {
    return true;
  }
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }
  if (Object.getPrototypeOf(o) !== Object.prototype) {
    return false;
  }
  return true;
}
function hasObjectPrototype(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}
function sleep(timeout) {
  return new Promise((resolve) => {
    timeoutManager.setTimeout(resolve, timeout);
  });
}
function replaceData(prevData, data, options) {
  if (typeof options.structuralSharing === "function") {
    return options.structuralSharing(prevData, data);
  } else if (options.structuralSharing !== false) {
    return replaceEqualDeep(prevData, data);
  }
  return data;
}
function addToEnd(items, item, max = 0) {
  const newItems = [...items, item];
  return max && newItems.length > max ? newItems.slice(1) : newItems;
}
function addToStart(items, item, max = 0) {
  const newItems = [item, ...items];
  return max && newItems.length > max ? newItems.slice(0, -1) : newItems;
}
var skipToken = Symbol();
function ensureQueryFn(options, fetchOptions) {
  if (!options.queryFn && (fetchOptions == null ? void 0 : fetchOptions.initialPromise)) {
    return () => fetchOptions.initialPromise;
  }
  if (!options.queryFn || options.queryFn === skipToken) {
    return () => Promise.reject(new Error(`Missing queryFn: '${options.queryHash}'`));
  }
  return options.queryFn;
}
function shouldThrowError(throwOnError, params) {
  if (typeof throwOnError === "function") {
    return throwOnError(...params);
  }
  return !!throwOnError;
}
var FocusManager = (_b = class extends Subscribable {
  constructor() {
    super();
    __privateAdd(this, _focused, void 0);
    __privateAdd(this, _cleanup, void 0);
    __privateAdd(this, _setup, void 0);
    __privateSet(this, _setup, (onFocus) => {
      if (!isServer && window.addEventListener) {
        const listener = () => onFocus();
        window.addEventListener("visibilitychange", listener, false);
        return () => {
          window.removeEventListener("visibilitychange", listener);
        };
      }
      return;
    });
  }
  onSubscribe() {
    if (!__privateGet(this, _cleanup)) {
      this.setEventListener(__privateGet(this, _setup));
    }
  }
  onUnsubscribe() {
    var _a2;
    if (!this.hasListeners()) {
      (_a2 = __privateGet(this, _cleanup)) == null ? void 0 : _a2.call(this);
      __privateSet(this, _cleanup, void 0);
    }
  }
  setEventListener(setup) {
    var _a2;
    __privateSet(this, _setup, setup);
    (_a2 = __privateGet(this, _cleanup)) == null ? void 0 : _a2.call(this);
    __privateSet(this, _cleanup, setup((focused) => {
      if (typeof focused === "boolean") {
        this.setFocused(focused);
      } else {
        this.onFocus();
      }
    }));
  }
  setFocused(focused) {
    const changed = __privateGet(this, _focused) !== focused;
    if (changed) {
      __privateSet(this, _focused, focused);
      this.onFocus();
    }
  }
  onFocus() {
    const isFocused = this.isFocused();
    this.listeners.forEach((listener) => {
      listener(isFocused);
    });
  }
  isFocused() {
    var _a2;
    if (typeof __privateGet(this, _focused) === "boolean") {
      return __privateGet(this, _focused);
    }
    return ((_a2 = globalThis.document) == null ? void 0 : _a2.visibilityState) !== "hidden";
  }
}, _focused = new WeakMap(), _cleanup = new WeakMap(), _setup = new WeakMap(), _b);
var focusManager = new FocusManager();
function pendingThenable() {
  let resolve;
  let reject;
  const thenable = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  thenable.status = "pending";
  thenable.catch(() => {
  });
  function finalize(data) {
    Object.assign(thenable, data);
    delete thenable.resolve;
    delete thenable.reject;
  }
  thenable.resolve = (value) => {
    finalize({
      status: "fulfilled",
      value
    });
    resolve(value);
  };
  thenable.reject = (reason) => {
    finalize({
      status: "rejected",
      reason
    });
    reject(reason);
  };
  return thenable;
}
var defaultScheduler = systemSetTimeoutZero;
function createNotifyManager() {
  let queue = [];
  let transactions = 0;
  let notifyFn = (callback) => {
    callback();
  };
  let batchNotifyFn = (callback) => {
    callback();
  };
  let scheduleFn = defaultScheduler;
  const schedule = (callback) => {
    if (transactions) {
      queue.push(callback);
    } else {
      scheduleFn(() => {
        notifyFn(callback);
      });
    }
  };
  const flush = () => {
    const originalQueue = queue;
    queue = [];
    if (originalQueue.length) {
      scheduleFn(() => {
        batchNotifyFn(() => {
          originalQueue.forEach((callback) => {
            notifyFn(callback);
          });
        });
      });
    }
  };
  return {
    batch: (callback) => {
      let result;
      transactions++;
      try {
        result = callback();
      } finally {
        transactions--;
        if (!transactions) {
          flush();
        }
      }
      return result;
    },
    /**
     * All calls to the wrapped function will be batched.
     */
    batchCalls: (callback) => {
      return (...args) => {
        schedule(() => {
          callback(...args);
        });
      };
    },
    schedule,
    /**
     * Use this method to set a custom notify function.
     * This can be used to for example wrap notifications with `React.act` while running tests.
     */
    setNotifyFunction: (fn) => {
      notifyFn = fn;
    },
    /**
     * Use this method to set a custom function to batch notifications together into a single tick.
     * By default React Query will use the batch function provided by ReactDOM or React Native.
     */
    setBatchNotifyFunction: (fn) => {
      batchNotifyFn = fn;
    },
    setScheduler: (fn) => {
      scheduleFn = fn;
    }
  };
}
var notifyManager = createNotifyManager();
var OnlineManager = (_c = class extends Subscribable {
  constructor() {
    super();
    __privateAdd(this, _online, true);
    __privateAdd(this, _cleanup2, void 0);
    __privateAdd(this, _setup2, void 0);
    __privateSet(this, _setup2, (onOnline) => {
      if (!isServer && window.addEventListener) {
        const onlineListener = () => onOnline(true);
        const offlineListener = () => onOnline(false);
        window.addEventListener("online", onlineListener, false);
        window.addEventListener("offline", offlineListener, false);
        return () => {
          window.removeEventListener("online", onlineListener);
          window.removeEventListener("offline", offlineListener);
        };
      }
      return;
    });
  }
  onSubscribe() {
    if (!__privateGet(this, _cleanup2)) {
      this.setEventListener(__privateGet(this, _setup2));
    }
  }
  onUnsubscribe() {
    var _a2;
    if (!this.hasListeners()) {
      (_a2 = __privateGet(this, _cleanup2)) == null ? void 0 : _a2.call(this);
      __privateSet(this, _cleanup2, void 0);
    }
  }
  setEventListener(setup) {
    var _a2;
    __privateSet(this, _setup2, setup);
    (_a2 = __privateGet(this, _cleanup2)) == null ? void 0 : _a2.call(this);
    __privateSet(this, _cleanup2, setup(this.setOnline.bind(this)));
  }
  setOnline(online) {
    const changed = __privateGet(this, _online) !== online;
    if (changed) {
      __privateSet(this, _online, online);
      this.listeners.forEach((listener) => {
        listener(online);
      });
    }
  }
  isOnline() {
    return __privateGet(this, _online);
  }
}, _online = new WeakMap(), _cleanup2 = new WeakMap(), _setup2 = new WeakMap(), _c);
var onlineManager = new OnlineManager();
function defaultRetryDelay(failureCount) {
  return Math.min(1e3 * 2 ** failureCount, 3e4);
}
function canFetch(networkMode) {
  return (networkMode ?? "online") === "online" ? onlineManager.isOnline() : true;
}
var CancelledError = class extends Error {
  constructor(options) {
    super("CancelledError");
    this.revert = options == null ? void 0 : options.revert;
    this.silent = options == null ? void 0 : options.silent;
  }
};
function createRetryer(config) {
  let isRetryCancelled = false;
  let failureCount = 0;
  let continueFn;
  const thenable = pendingThenable();
  const isResolved = () => thenable.status !== "pending";
  const cancel = (cancelOptions) => {
    var _a2;
    if (!isResolved()) {
      const error = new CancelledError(cancelOptions);
      reject(error);
      (_a2 = config.onCancel) == null ? void 0 : _a2.call(config, error);
    }
  };
  const cancelRetry = () => {
    isRetryCancelled = true;
  };
  const continueRetry = () => {
    isRetryCancelled = false;
  };
  const canContinue = () => focusManager.isFocused() && (config.networkMode === "always" || onlineManager.isOnline()) && config.canRun();
  const canStart = () => canFetch(config.networkMode) && config.canRun();
  const resolve = (value) => {
    if (!isResolved()) {
      continueFn == null ? void 0 : continueFn();
      thenable.resolve(value);
    }
  };
  const reject = (value) => {
    if (!isResolved()) {
      continueFn == null ? void 0 : continueFn();
      thenable.reject(value);
    }
  };
  const pause = () => {
    return new Promise((continueResolve) => {
      var _a2;
      continueFn = (value) => {
        if (isResolved() || canContinue()) {
          continueResolve(value);
        }
      };
      (_a2 = config.onPause) == null ? void 0 : _a2.call(config);
    }).then(() => {
      var _a2;
      continueFn = void 0;
      if (!isResolved()) {
        (_a2 = config.onContinue) == null ? void 0 : _a2.call(config);
      }
    });
  };
  const run = () => {
    if (isResolved()) {
      return;
    }
    let promiseOrValue;
    const initialPromise = failureCount === 0 ? config.initialPromise : void 0;
    try {
      promiseOrValue = initialPromise ?? config.fn();
    } catch (error) {
      promiseOrValue = Promise.reject(error);
    }
    Promise.resolve(promiseOrValue).then(resolve).catch((error) => {
      var _a2;
      if (isResolved()) {
        return;
      }
      const retry = config.retry ?? (isServer ? 0 : 3);
      const retryDelay = config.retryDelay ?? defaultRetryDelay;
      const delay = typeof retryDelay === "function" ? retryDelay(failureCount, error) : retryDelay;
      const shouldRetry = retry === true || typeof retry === "number" && failureCount < retry || typeof retry === "function" && retry(failureCount, error);
      if (isRetryCancelled || !shouldRetry) {
        reject(error);
        return;
      }
      failureCount++;
      (_a2 = config.onFail) == null ? void 0 : _a2.call(config, failureCount, error);
      sleep(delay).then(() => {
        return canContinue() ? void 0 : pause();
      }).then(() => {
        if (isRetryCancelled) {
          reject(error);
        } else {
          run();
        }
      });
    });
  };
  return {
    promise: thenable,
    status: () => thenable.status,
    cancel,
    continue: () => {
      continueFn == null ? void 0 : continueFn();
      return thenable;
    },
    cancelRetry,
    continueRetry,
    canStart,
    start: () => {
      if (canStart()) {
        run();
      } else {
        pause().then(run);
      }
      return thenable;
    }
  };
}
var Removable = (_d = class {
  constructor() {
    __privateAdd(this, _gcTimeout, void 0);
  }
  destroy() {
    this.clearGcTimeout();
  }
  scheduleGc() {
    this.clearGcTimeout();
    if (isValidTimeout(this.gcTime)) {
      __privateSet(this, _gcTimeout, timeoutManager.setTimeout(() => {
        this.optionalRemove();
      }, this.gcTime));
    }
  }
  updateGcTime(newGcTime) {
    this.gcTime = Math.max(
      this.gcTime || 0,
      newGcTime ?? (isServer ? Infinity : 5 * 60 * 1e3)
    );
  }
  clearGcTimeout() {
    if (__privateGet(this, _gcTimeout)) {
      timeoutManager.clearTimeout(__privateGet(this, _gcTimeout));
      __privateSet(this, _gcTimeout, void 0);
    }
  }
}, _gcTimeout = new WeakMap(), _d);
var Query = (_e = class extends Removable {
  constructor(config) {
    super();
    __privateAdd(this, _dispatch);
    __privateAdd(this, _initialState, void 0);
    __privateAdd(this, _revertState, void 0);
    __privateAdd(this, _cache, void 0);
    __privateAdd(this, _client, void 0);
    __privateAdd(this, _retryer, void 0);
    __privateAdd(this, _defaultOptions, void 0);
    __privateAdd(this, _abortSignalConsumed, void 0);
    __privateSet(this, _abortSignalConsumed, false);
    __privateSet(this, _defaultOptions, config.defaultOptions);
    this.setOptions(config.options);
    this.observers = [];
    __privateSet(this, _client, config.client);
    __privateSet(this, _cache, __privateGet(this, _client).getQueryCache());
    this.queryKey = config.queryKey;
    this.queryHash = config.queryHash;
    __privateSet(this, _initialState, getDefaultState$1(this.options));
    this.state = config.state ?? __privateGet(this, _initialState);
    this.scheduleGc();
  }
  get meta() {
    return this.options.meta;
  }
  get promise() {
    var _a2;
    return (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.promise;
  }
  setOptions(options) {
    this.options = { ...__privateGet(this, _defaultOptions), ...options };
    this.updateGcTime(this.options.gcTime);
    if (this.state && this.state.data === void 0) {
      const defaultState = getDefaultState$1(this.options);
      if (defaultState.data !== void 0) {
        this.setData(defaultState.data, {
          updatedAt: defaultState.dataUpdatedAt,
          manual: true
        });
        __privateSet(this, _initialState, defaultState);
      }
    }
  }
  optionalRemove() {
    if (!this.observers.length && this.state.fetchStatus === "idle") {
      __privateGet(this, _cache).remove(this);
    }
  }
  setData(newData, options) {
    const data = replaceData(this.state.data, newData, this.options);
    __privateMethod(this, _dispatch, dispatch_fn).call(this, {
      data,
      type: "success",
      dataUpdatedAt: options == null ? void 0 : options.updatedAt,
      manual: options == null ? void 0 : options.manual
    });
    return data;
  }
  setState(state, setStateOptions) {
    __privateMethod(this, _dispatch, dispatch_fn).call(this, { type: "setState", state, setStateOptions });
  }
  cancel(options) {
    var _a2, _b2;
    const promise = (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.promise;
    (_b2 = __privateGet(this, _retryer)) == null ? void 0 : _b2.cancel(options);
    return promise ? promise.then(noop).catch(noop) : Promise.resolve();
  }
  destroy() {
    super.destroy();
    this.cancel({ silent: true });
  }
  reset() {
    this.destroy();
    this.setState(__privateGet(this, _initialState));
  }
  isActive() {
    return this.observers.some(
      (observer) => resolveEnabled(observer.options.enabled, this) !== false
    );
  }
  isDisabled() {
    if (this.getObserversCount() > 0) {
      return !this.isActive();
    }
    return this.options.queryFn === skipToken || this.state.dataUpdateCount + this.state.errorUpdateCount === 0;
  }
  isStatic() {
    if (this.getObserversCount() > 0) {
      return this.observers.some(
        (observer) => resolveStaleTime(observer.options.staleTime, this) === "static"
      );
    }
    return false;
  }
  isStale() {
    if (this.getObserversCount() > 0) {
      return this.observers.some(
        (observer) => observer.getCurrentResult().isStale
      );
    }
    return this.state.data === void 0 || this.state.isInvalidated;
  }
  isStaleByTime(staleTime = 0) {
    if (this.state.data === void 0) {
      return true;
    }
    if (staleTime === "static") {
      return false;
    }
    if (this.state.isInvalidated) {
      return true;
    }
    return !timeUntilStale(this.state.dataUpdatedAt, staleTime);
  }
  onFocus() {
    var _a2;
    const observer = this.observers.find((x2) => x2.shouldFetchOnWindowFocus());
    observer == null ? void 0 : observer.refetch({ cancelRefetch: false });
    (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.continue();
  }
  onOnline() {
    var _a2;
    const observer = this.observers.find((x2) => x2.shouldFetchOnReconnect());
    observer == null ? void 0 : observer.refetch({ cancelRefetch: false });
    (_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.continue();
  }
  addObserver(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
      this.clearGcTimeout();
      __privateGet(this, _cache).notify({ type: "observerAdded", query: this, observer });
    }
  }
  removeObserver(observer) {
    if (this.observers.includes(observer)) {
      this.observers = this.observers.filter((x2) => x2 !== observer);
      if (!this.observers.length) {
        if (__privateGet(this, _retryer)) {
          if (__privateGet(this, _abortSignalConsumed)) {
            __privateGet(this, _retryer).cancel({ revert: true });
          } else {
            __privateGet(this, _retryer).cancelRetry();
          }
        }
        this.scheduleGc();
      }
      __privateGet(this, _cache).notify({ type: "observerRemoved", query: this, observer });
    }
  }
  getObserversCount() {
    return this.observers.length;
  }
  invalidate() {
    if (!this.state.isInvalidated) {
      __privateMethod(this, _dispatch, dispatch_fn).call(this, { type: "invalidate" });
    }
  }
  async fetch(options, fetchOptions) {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2, _l;
    if (this.state.fetchStatus !== "idle" && // If the promise in the retyer is already rejected, we have to definitely
    // re-start the fetch; there is a chance that the query is still in a
    // pending state when that happens
    ((_a2 = __privateGet(this, _retryer)) == null ? void 0 : _a2.status()) !== "rejected") {
      if (this.state.data !== void 0 && (fetchOptions == null ? void 0 : fetchOptions.cancelRefetch)) {
        this.cancel({ silent: true });
      } else if (__privateGet(this, _retryer)) {
        __privateGet(this, _retryer).continueRetry();
        return __privateGet(this, _retryer).promise;
      }
    }
    if (options) {
      this.setOptions(options);
    }
    if (!this.options.queryFn) {
      const observer = this.observers.find((x2) => x2.options.queryFn);
      if (observer) {
        this.setOptions(observer.options);
      }
    }
    const abortController = new AbortController();
    const addSignalProperty = (object) => {
      Object.defineProperty(object, "signal", {
        enumerable: true,
        get: () => {
          __privateSet(this, _abortSignalConsumed, true);
          return abortController.signal;
        }
      });
    };
    const fetchFn = () => {
      const queryFn = ensureQueryFn(this.options, fetchOptions);
      const createQueryFnContext = () => {
        const queryFnContext2 = {
          client: __privateGet(this, _client),
          queryKey: this.queryKey,
          meta: this.meta
        };
        addSignalProperty(queryFnContext2);
        return queryFnContext2;
      };
      const queryFnContext = createQueryFnContext();
      __privateSet(this, _abortSignalConsumed, false);
      if (this.options.persister) {
        return this.options.persister(
          queryFn,
          queryFnContext,
          this
        );
      }
      return queryFn(queryFnContext);
    };
    const createFetchContext = () => {
      const context2 = {
        fetchOptions,
        options: this.options,
        queryKey: this.queryKey,
        client: __privateGet(this, _client),
        state: this.state,
        fetchFn
      };
      addSignalProperty(context2);
      return context2;
    };
    const context = createFetchContext();
    (_b2 = this.options.behavior) == null ? void 0 : _b2.onFetch(context, this);
    __privateSet(this, _revertState, this.state);
    if (this.state.fetchStatus === "idle" || this.state.fetchMeta !== ((_c2 = context.fetchOptions) == null ? void 0 : _c2.meta)) {
      __privateMethod(this, _dispatch, dispatch_fn).call(this, { type: "fetch", meta: (_d2 = context.fetchOptions) == null ? void 0 : _d2.meta });
    }
    __privateSet(this, _retryer, createRetryer({
      initialPromise: fetchOptions == null ? void 0 : fetchOptions.initialPromise,
      fn: context.fetchFn,
      onCancel: (error) => {
        if (error instanceof CancelledError && error.revert) {
          this.setState({
            ...__privateGet(this, _revertState),
            fetchStatus: "idle"
          });
        }
        abortController.abort();
      },
      onFail: (failureCount, error) => {
        __privateMethod(this, _dispatch, dispatch_fn).call(this, { type: "failed", failureCount, error });
      },
      onPause: () => {
        __privateMethod(this, _dispatch, dispatch_fn).call(this, { type: "pause" });
      },
      onContinue: () => {
        __privateMethod(this, _dispatch, dispatch_fn).call(this, { type: "continue" });
      },
      retry: context.options.retry,
      retryDelay: context.options.retryDelay,
      networkMode: context.options.networkMode,
      canRun: () => true
    }));
    try {
      const data = await __privateGet(this, _retryer).start();
      if (data === void 0) {
        if (false)
          ;
        throw new Error(`${this.queryHash} data is undefined`);
      }
      this.setData(data);
      (_f2 = (_e2 = __privateGet(this, _cache).config).onSuccess) == null ? void 0 : _f2.call(_e2, data, this);
      (_h2 = (_g2 = __privateGet(this, _cache).config).onSettled) == null ? void 0 : _h2.call(
        _g2,
        data,
        this.state.error,
        this
      );
      return data;
    } catch (error) {
      if (error instanceof CancelledError) {
        if (error.silent) {
          return __privateGet(this, _retryer).promise;
        } else if (error.revert) {
          if (this.state.data === void 0) {
            throw error;
          }
          return this.state.data;
        }
      }
      __privateMethod(this, _dispatch, dispatch_fn).call(this, {
        type: "error",
        error
      });
      (_j2 = (_i2 = __privateGet(this, _cache).config).onError) == null ? void 0 : _j2.call(
        _i2,
        error,
        this
      );
      (_l = (_k2 = __privateGet(this, _cache).config).onSettled) == null ? void 0 : _l.call(
        _k2,
        this.state.data,
        error,
        this
      );
      throw error;
    } finally {
      this.scheduleGc();
    }
  }
}, _initialState = new WeakMap(), _revertState = new WeakMap(), _cache = new WeakMap(), _client = new WeakMap(), _retryer = new WeakMap(), _defaultOptions = new WeakMap(), _abortSignalConsumed = new WeakMap(), _dispatch = new WeakSet(), dispatch_fn = function(action) {
  const reducer = (state) => {
    switch (action.type) {
      case "failed":
        return {
          ...state,
          fetchFailureCount: action.failureCount,
          fetchFailureReason: action.error
        };
      case "pause":
        return {
          ...state,
          fetchStatus: "paused"
        };
      case "continue":
        return {
          ...state,
          fetchStatus: "fetching"
        };
      case "fetch":
        return {
          ...state,
          ...fetchState(state.data, this.options),
          fetchMeta: action.meta ?? null
        };
      case "success":
        const newState = {
          ...state,
          data: action.data,
          dataUpdateCount: state.dataUpdateCount + 1,
          dataUpdatedAt: action.dataUpdatedAt ?? Date.now(),
          error: null,
          isInvalidated: false,
          status: "success",
          ...!action.manual && {
            fetchStatus: "idle",
            fetchFailureCount: 0,
            fetchFailureReason: null
          }
        };
        __privateSet(this, _revertState, action.manual ? newState : void 0);
        return newState;
      case "error":
        const error = action.error;
        return {
          ...state,
          error,
          errorUpdateCount: state.errorUpdateCount + 1,
          errorUpdatedAt: Date.now(),
          fetchFailureCount: state.fetchFailureCount + 1,
          fetchFailureReason: error,
          fetchStatus: "idle",
          status: "error"
        };
      case "invalidate":
        return {
          ...state,
          isInvalidated: true
        };
      case "setState":
        return {
          ...state,
          ...action.state
        };
    }
  };
  this.state = reducer(this.state);
  notifyManager.batch(() => {
    this.observers.forEach((observer) => {
      observer.onQueryUpdate();
    });
    __privateGet(this, _cache).notify({ query: this, type: "updated", action });
  });
}, _e);
function fetchState(data, options) {
  return {
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: canFetch(options.networkMode) ? "fetching" : "paused",
    ...data === void 0 && {
      error: null,
      status: "pending"
    }
  };
}
function getDefaultState$1(options) {
  const data = typeof options.initialData === "function" ? options.initialData() : options.initialData;
  const hasData = data !== void 0;
  const initialDataUpdatedAt = hasData ? typeof options.initialDataUpdatedAt === "function" ? options.initialDataUpdatedAt() : options.initialDataUpdatedAt : 0;
  return {
    data,
    dataUpdateCount: 0,
    dataUpdatedAt: hasData ? initialDataUpdatedAt ?? Date.now() : 0,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchMeta: null,
    isInvalidated: false,
    status: hasData ? "success" : "pending",
    fetchStatus: "idle"
  };
}
var QueryObserver = (_f = class extends Subscribable {
  constructor(client2, options) {
    super();
    __privateAdd(this, _executeFetch);
    __privateAdd(this, _updateStaleTimeout);
    __privateAdd(this, _computeRefetchInterval);
    __privateAdd(this, _updateRefetchInterval);
    __privateAdd(this, _updateTimers);
    __privateAdd(this, _clearStaleTimeout);
    __privateAdd(this, _clearRefetchInterval);
    __privateAdd(this, _updateQuery);
    __privateAdd(this, _notify);
    __privateAdd(this, _client2, void 0);
    __privateAdd(this, _currentQuery, void 0);
    __privateAdd(this, _currentQueryInitialState, void 0);
    __privateAdd(this, _currentResult, void 0);
    __privateAdd(this, _currentResultState, void 0);
    __privateAdd(this, _currentResultOptions, void 0);
    __privateAdd(this, _currentThenable, void 0);
    __privateAdd(this, _selectError, void 0);
    __privateAdd(this, _selectFn, void 0);
    __privateAdd(this, _selectResult, void 0);
    // This property keeps track of the last query with defined data.
    // It will be used to pass the previous data and query to the placeholder function between renders.
    __privateAdd(this, _lastQueryWithDefinedData, void 0);
    __privateAdd(this, _staleTimeoutId, void 0);
    __privateAdd(this, _refetchIntervalId, void 0);
    __privateAdd(this, _currentRefetchInterval, void 0);
    __privateAdd(this, _trackedProps, /* @__PURE__ */ new Set());
    this.options = options;
    __privateSet(this, _client2, client2);
    __privateSet(this, _selectError, null);
    __privateSet(this, _currentThenable, pendingThenable());
    this.bindMethods();
    this.setOptions(options);
  }
  bindMethods() {
    this.refetch = this.refetch.bind(this);
  }
  onSubscribe() {
    if (this.listeners.size === 1) {
      __privateGet(this, _currentQuery).addObserver(this);
      if (shouldFetchOnMount(__privateGet(this, _currentQuery), this.options)) {
        __privateMethod(this, _executeFetch, executeFetch_fn).call(this);
      } else {
        this.updateResult();
      }
      __privateMethod(this, _updateTimers, updateTimers_fn).call(this);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      this.destroy();
    }
  }
  shouldFetchOnReconnect() {
    return shouldFetchOn(
      __privateGet(this, _currentQuery),
      this.options,
      this.options.refetchOnReconnect
    );
  }
  shouldFetchOnWindowFocus() {
    return shouldFetchOn(
      __privateGet(this, _currentQuery),
      this.options,
      this.options.refetchOnWindowFocus
    );
  }
  destroy() {
    this.listeners = /* @__PURE__ */ new Set();
    __privateMethod(this, _clearStaleTimeout, clearStaleTimeout_fn).call(this);
    __privateMethod(this, _clearRefetchInterval, clearRefetchInterval_fn).call(this);
    __privateGet(this, _currentQuery).removeObserver(this);
  }
  setOptions(options) {
    const prevOptions = this.options;
    const prevQuery = __privateGet(this, _currentQuery);
    this.options = __privateGet(this, _client2).defaultQueryOptions(options);
    if (this.options.enabled !== void 0 && typeof this.options.enabled !== "boolean" && typeof this.options.enabled !== "function" && typeof resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) !== "boolean") {
      throw new Error(
        "Expected enabled to be a boolean or a callback that returns a boolean"
      );
    }
    __privateMethod(this, _updateQuery, updateQuery_fn).call(this);
    __privateGet(this, _currentQuery).setOptions(this.options);
    if (prevOptions._defaulted && !shallowEqualObjects(this.options, prevOptions)) {
      __privateGet(this, _client2).getQueryCache().notify({
        type: "observerOptionsUpdated",
        query: __privateGet(this, _currentQuery),
        observer: this
      });
    }
    const mounted = this.hasListeners();
    if (mounted && shouldFetchOptionally(
      __privateGet(this, _currentQuery),
      prevQuery,
      this.options,
      prevOptions
    )) {
      __privateMethod(this, _executeFetch, executeFetch_fn).call(this);
    }
    this.updateResult();
    if (mounted && (__privateGet(this, _currentQuery) !== prevQuery || resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) !== resolveEnabled(prevOptions.enabled, __privateGet(this, _currentQuery)) || resolveStaleTime(this.options.staleTime, __privateGet(this, _currentQuery)) !== resolveStaleTime(prevOptions.staleTime, __privateGet(this, _currentQuery)))) {
      __privateMethod(this, _updateStaleTimeout, updateStaleTimeout_fn).call(this);
    }
    const nextRefetchInterval = __privateMethod(this, _computeRefetchInterval, computeRefetchInterval_fn).call(this);
    if (mounted && (__privateGet(this, _currentQuery) !== prevQuery || resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) !== resolveEnabled(prevOptions.enabled, __privateGet(this, _currentQuery)) || nextRefetchInterval !== __privateGet(this, _currentRefetchInterval))) {
      __privateMethod(this, _updateRefetchInterval, updateRefetchInterval_fn).call(this, nextRefetchInterval);
    }
  }
  getOptimisticResult(options) {
    const query = __privateGet(this, _client2).getQueryCache().build(__privateGet(this, _client2), options);
    const result = this.createResult(query, options);
    if (shouldAssignObserverCurrentProperties(this, result)) {
      __privateSet(this, _currentResult, result);
      __privateSet(this, _currentResultOptions, this.options);
      __privateSet(this, _currentResultState, __privateGet(this, _currentQuery).state);
    }
    return result;
  }
  getCurrentResult() {
    return __privateGet(this, _currentResult);
  }
  trackResult(result, onPropTracked) {
    return new Proxy(result, {
      get: (target, key) => {
        this.trackProp(key);
        onPropTracked == null ? void 0 : onPropTracked(key);
        if (key === "promise" && !this.options.experimental_prefetchInRender && __privateGet(this, _currentThenable).status === "pending") {
          __privateGet(this, _currentThenable).reject(
            new Error(
              "experimental_prefetchInRender feature flag is not enabled"
            )
          );
        }
        return Reflect.get(target, key);
      }
    });
  }
  trackProp(key) {
    __privateGet(this, _trackedProps).add(key);
  }
  getCurrentQuery() {
    return __privateGet(this, _currentQuery);
  }
  refetch({ ...options } = {}) {
    return this.fetch({
      ...options
    });
  }
  fetchOptimistic(options) {
    const defaultedOptions = __privateGet(this, _client2).defaultQueryOptions(options);
    const query = __privateGet(this, _client2).getQueryCache().build(__privateGet(this, _client2), defaultedOptions);
    return query.fetch().then(() => this.createResult(query, defaultedOptions));
  }
  fetch(fetchOptions) {
    return __privateMethod(this, _executeFetch, executeFetch_fn).call(this, {
      ...fetchOptions,
      cancelRefetch: fetchOptions.cancelRefetch ?? true
    }).then(() => {
      this.updateResult();
      return __privateGet(this, _currentResult);
    });
  }
  createResult(query, options) {
    var _a2;
    const prevQuery = __privateGet(this, _currentQuery);
    const prevOptions = this.options;
    const prevResult = __privateGet(this, _currentResult);
    const prevResultState = __privateGet(this, _currentResultState);
    const prevResultOptions = __privateGet(this, _currentResultOptions);
    const queryChange = query !== prevQuery;
    const queryInitialState = queryChange ? query.state : __privateGet(this, _currentQueryInitialState);
    const { state } = query;
    let newState = { ...state };
    let isPlaceholderData = false;
    let data;
    if (options._optimisticResults) {
      const mounted = this.hasListeners();
      const fetchOnMount = !mounted && shouldFetchOnMount(query, options);
      const fetchOptionally = mounted && shouldFetchOptionally(query, prevQuery, options, prevOptions);
      if (fetchOnMount || fetchOptionally) {
        newState = {
          ...newState,
          ...fetchState(state.data, query.options)
        };
      }
      if (options._optimisticResults === "isRestoring") {
        newState.fetchStatus = "idle";
      }
    }
    let { error, errorUpdatedAt, status } = newState;
    data = newState.data;
    let skipSelect = false;
    if (options.placeholderData !== void 0 && data === void 0 && status === "pending") {
      let placeholderData;
      if ((prevResult == null ? void 0 : prevResult.isPlaceholderData) && options.placeholderData === (prevResultOptions == null ? void 0 : prevResultOptions.placeholderData)) {
        placeholderData = prevResult.data;
        skipSelect = true;
      } else {
        placeholderData = typeof options.placeholderData === "function" ? options.placeholderData(
          (_a2 = __privateGet(this, _lastQueryWithDefinedData)) == null ? void 0 : _a2.state.data,
          __privateGet(this, _lastQueryWithDefinedData)
        ) : options.placeholderData;
      }
      if (placeholderData !== void 0) {
        status = "success";
        data = replaceData(
          prevResult == null ? void 0 : prevResult.data,
          placeholderData,
          options
        );
        isPlaceholderData = true;
      }
    }
    if (options.select && data !== void 0 && !skipSelect) {
      if (prevResult && data === (prevResultState == null ? void 0 : prevResultState.data) && options.select === __privateGet(this, _selectFn)) {
        data = __privateGet(this, _selectResult);
      } else {
        try {
          __privateSet(this, _selectFn, options.select);
          data = options.select(data);
          data = replaceData(prevResult == null ? void 0 : prevResult.data, data, options);
          __privateSet(this, _selectResult, data);
          __privateSet(this, _selectError, null);
        } catch (selectError) {
          __privateSet(this, _selectError, selectError);
        }
      }
    }
    if (__privateGet(this, _selectError)) {
      error = __privateGet(this, _selectError);
      data = __privateGet(this, _selectResult);
      errorUpdatedAt = Date.now();
      status = "error";
    }
    const isFetching = newState.fetchStatus === "fetching";
    const isPending = status === "pending";
    const isError = status === "error";
    const isLoading = isPending && isFetching;
    const hasData = data !== void 0;
    const result = {
      status,
      fetchStatus: newState.fetchStatus,
      isPending,
      isSuccess: status === "success",
      isError,
      isInitialLoading: isLoading,
      isLoading,
      data,
      dataUpdatedAt: newState.dataUpdatedAt,
      error,
      errorUpdatedAt,
      failureCount: newState.fetchFailureCount,
      failureReason: newState.fetchFailureReason,
      errorUpdateCount: newState.errorUpdateCount,
      isFetched: newState.dataUpdateCount > 0 || newState.errorUpdateCount > 0,
      isFetchedAfterMount: newState.dataUpdateCount > queryInitialState.dataUpdateCount || newState.errorUpdateCount > queryInitialState.errorUpdateCount,
      isFetching,
      isRefetching: isFetching && !isPending,
      isLoadingError: isError && !hasData,
      isPaused: newState.fetchStatus === "paused",
      isPlaceholderData,
      isRefetchError: isError && hasData,
      isStale: isStale(query, options),
      refetch: this.refetch,
      promise: __privateGet(this, _currentThenable),
      isEnabled: resolveEnabled(options.enabled, query) !== false
    };
    const nextResult = result;
    if (this.options.experimental_prefetchInRender) {
      const finalizeThenableIfPossible = (thenable) => {
        if (nextResult.status === "error") {
          thenable.reject(nextResult.error);
        } else if (nextResult.data !== void 0) {
          thenable.resolve(nextResult.data);
        }
      };
      const recreateThenable = () => {
        const pending = __privateSet(this, _currentThenable, nextResult.promise = pendingThenable());
        finalizeThenableIfPossible(pending);
      };
      const prevThenable = __privateGet(this, _currentThenable);
      switch (prevThenable.status) {
        case "pending":
          if (query.queryHash === prevQuery.queryHash) {
            finalizeThenableIfPossible(prevThenable);
          }
          break;
        case "fulfilled":
          if (nextResult.status === "error" || nextResult.data !== prevThenable.value) {
            recreateThenable();
          }
          break;
        case "rejected":
          if (nextResult.status !== "error" || nextResult.error !== prevThenable.reason) {
            recreateThenable();
          }
          break;
      }
    }
    return nextResult;
  }
  updateResult() {
    const prevResult = __privateGet(this, _currentResult);
    const nextResult = this.createResult(__privateGet(this, _currentQuery), this.options);
    __privateSet(this, _currentResultState, __privateGet(this, _currentQuery).state);
    __privateSet(this, _currentResultOptions, this.options);
    if (__privateGet(this, _currentResultState).data !== void 0) {
      __privateSet(this, _lastQueryWithDefinedData, __privateGet(this, _currentQuery));
    }
    if (shallowEqualObjects(nextResult, prevResult)) {
      return;
    }
    __privateSet(this, _currentResult, nextResult);
    const shouldNotifyListeners = () => {
      if (!prevResult) {
        return true;
      }
      const { notifyOnChangeProps } = this.options;
      const notifyOnChangePropsValue = typeof notifyOnChangeProps === "function" ? notifyOnChangeProps() : notifyOnChangeProps;
      if (notifyOnChangePropsValue === "all" || !notifyOnChangePropsValue && !__privateGet(this, _trackedProps).size) {
        return true;
      }
      const includedProps = new Set(
        notifyOnChangePropsValue ?? __privateGet(this, _trackedProps)
      );
      if (this.options.throwOnError) {
        includedProps.add("error");
      }
      return Object.keys(__privateGet(this, _currentResult)).some((key) => {
        const typedKey = key;
        const changed = __privateGet(this, _currentResult)[typedKey] !== prevResult[typedKey];
        return changed && includedProps.has(typedKey);
      });
    };
    __privateMethod(this, _notify, notify_fn).call(this, { listeners: shouldNotifyListeners() });
  }
  onQueryUpdate() {
    this.updateResult();
    if (this.hasListeners()) {
      __privateMethod(this, _updateTimers, updateTimers_fn).call(this);
    }
  }
}, _client2 = new WeakMap(), _currentQuery = new WeakMap(), _currentQueryInitialState = new WeakMap(), _currentResult = new WeakMap(), _currentResultState = new WeakMap(), _currentResultOptions = new WeakMap(), _currentThenable = new WeakMap(), _selectError = new WeakMap(), _selectFn = new WeakMap(), _selectResult = new WeakMap(), _lastQueryWithDefinedData = new WeakMap(), _staleTimeoutId = new WeakMap(), _refetchIntervalId = new WeakMap(), _currentRefetchInterval = new WeakMap(), _trackedProps = new WeakMap(), _executeFetch = new WeakSet(), executeFetch_fn = function(fetchOptions) {
  __privateMethod(this, _updateQuery, updateQuery_fn).call(this);
  let promise = __privateGet(this, _currentQuery).fetch(
    this.options,
    fetchOptions
  );
  if (!(fetchOptions == null ? void 0 : fetchOptions.throwOnError)) {
    promise = promise.catch(noop);
  }
  return promise;
}, _updateStaleTimeout = new WeakSet(), updateStaleTimeout_fn = function() {
  __privateMethod(this, _clearStaleTimeout, clearStaleTimeout_fn).call(this);
  const staleTime = resolveStaleTime(
    this.options.staleTime,
    __privateGet(this, _currentQuery)
  );
  if (isServer || __privateGet(this, _currentResult).isStale || !isValidTimeout(staleTime)) {
    return;
  }
  const time = timeUntilStale(__privateGet(this, _currentResult).dataUpdatedAt, staleTime);
  const timeout = time + 1;
  __privateSet(this, _staleTimeoutId, timeoutManager.setTimeout(() => {
    if (!__privateGet(this, _currentResult).isStale) {
      this.updateResult();
    }
  }, timeout));
}, _computeRefetchInterval = new WeakSet(), computeRefetchInterval_fn = function() {
  return (typeof this.options.refetchInterval === "function" ? this.options.refetchInterval(__privateGet(this, _currentQuery)) : this.options.refetchInterval) ?? false;
}, _updateRefetchInterval = new WeakSet(), updateRefetchInterval_fn = function(nextInterval) {
  __privateMethod(this, _clearRefetchInterval, clearRefetchInterval_fn).call(this);
  __privateSet(this, _currentRefetchInterval, nextInterval);
  if (isServer || resolveEnabled(this.options.enabled, __privateGet(this, _currentQuery)) === false || !isValidTimeout(__privateGet(this, _currentRefetchInterval)) || __privateGet(this, _currentRefetchInterval) === 0) {
    return;
  }
  __privateSet(this, _refetchIntervalId, timeoutManager.setInterval(() => {
    if (this.options.refetchIntervalInBackground || focusManager.isFocused()) {
      __privateMethod(this, _executeFetch, executeFetch_fn).call(this);
    }
  }, __privateGet(this, _currentRefetchInterval)));
}, _updateTimers = new WeakSet(), updateTimers_fn = function() {
  __privateMethod(this, _updateStaleTimeout, updateStaleTimeout_fn).call(this);
  __privateMethod(this, _updateRefetchInterval, updateRefetchInterval_fn).call(this, __privateMethod(this, _computeRefetchInterval, computeRefetchInterval_fn).call(this));
}, _clearStaleTimeout = new WeakSet(), clearStaleTimeout_fn = function() {
  if (__privateGet(this, _staleTimeoutId)) {
    timeoutManager.clearTimeout(__privateGet(this, _staleTimeoutId));
    __privateSet(this, _staleTimeoutId, void 0);
  }
}, _clearRefetchInterval = new WeakSet(), clearRefetchInterval_fn = function() {
  if (__privateGet(this, _refetchIntervalId)) {
    timeoutManager.clearInterval(__privateGet(this, _refetchIntervalId));
    __privateSet(this, _refetchIntervalId, void 0);
  }
}, _updateQuery = new WeakSet(), updateQuery_fn = function() {
  const query = __privateGet(this, _client2).getQueryCache().build(__privateGet(this, _client2), this.options);
  if (query === __privateGet(this, _currentQuery)) {
    return;
  }
  const prevQuery = __privateGet(this, _currentQuery);
  __privateSet(this, _currentQuery, query);
  __privateSet(this, _currentQueryInitialState, query.state);
  if (this.hasListeners()) {
    prevQuery == null ? void 0 : prevQuery.removeObserver(this);
    query.addObserver(this);
  }
}, _notify = new WeakSet(), notify_fn = function(notifyOptions) {
  notifyManager.batch(() => {
    if (notifyOptions.listeners) {
      this.listeners.forEach((listener) => {
        listener(__privateGet(this, _currentResult));
      });
    }
    __privateGet(this, _client2).getQueryCache().notify({
      query: __privateGet(this, _currentQuery),
      type: "observerResultsUpdated"
    });
  });
}, _f);
function shouldLoadOnMount(query, options) {
  return resolveEnabled(options.enabled, query) !== false && query.state.data === void 0 && !(query.state.status === "error" && options.retryOnMount === false);
}
function shouldFetchOnMount(query, options) {
  return shouldLoadOnMount(query, options) || query.state.data !== void 0 && shouldFetchOn(query, options, options.refetchOnMount);
}
function shouldFetchOn(query, options, field) {
  if (resolveEnabled(options.enabled, query) !== false && resolveStaleTime(options.staleTime, query) !== "static") {
    const value = typeof field === "function" ? field(query) : field;
    return value === "always" || value !== false && isStale(query, options);
  }
  return false;
}
function shouldFetchOptionally(query, prevQuery, options, prevOptions) {
  return (query !== prevQuery || resolveEnabled(prevOptions.enabled, query) === false) && (!options.suspense || query.state.status !== "error") && isStale(query, options);
}
function isStale(query, options) {
  return resolveEnabled(options.enabled, query) !== false && query.isStaleByTime(resolveStaleTime(options.staleTime, query));
}
function shouldAssignObserverCurrentProperties(observer, optimisticResult) {
  if (!shallowEqualObjects(observer.getCurrentResult(), optimisticResult)) {
    return true;
  }
  return false;
}
function infiniteQueryBehavior(pages) {
  return {
    onFetch: (context, query) => {
      var _a2, _b2, _c2, _d2, _e2;
      const options = context.options;
      const direction = (_c2 = (_b2 = (_a2 = context.fetchOptions) == null ? void 0 : _a2.meta) == null ? void 0 : _b2.fetchMore) == null ? void 0 : _c2.direction;
      const oldPages = ((_d2 = context.state.data) == null ? void 0 : _d2.pages) || [];
      const oldPageParams = ((_e2 = context.state.data) == null ? void 0 : _e2.pageParams) || [];
      let result = { pages: [], pageParams: [] };
      let currentPage = 0;
      const fetchFn = async () => {
        let cancelled = false;
        const addSignalProperty = (object) => {
          Object.defineProperty(object, "signal", {
            enumerable: true,
            get: () => {
              if (context.signal.aborted) {
                cancelled = true;
              } else {
                context.signal.addEventListener("abort", () => {
                  cancelled = true;
                });
              }
              return context.signal;
            }
          });
        };
        const queryFn = ensureQueryFn(context.options, context.fetchOptions);
        const fetchPage = async (data, param, previous) => {
          if (cancelled) {
            return Promise.reject();
          }
          if (param == null && data.pages.length) {
            return Promise.resolve(data);
          }
          const createQueryFnContext = () => {
            const queryFnContext2 = {
              client: context.client,
              queryKey: context.queryKey,
              pageParam: param,
              direction: previous ? "backward" : "forward",
              meta: context.options.meta
            };
            addSignalProperty(queryFnContext2);
            return queryFnContext2;
          };
          const queryFnContext = createQueryFnContext();
          const page = await queryFn(queryFnContext);
          const { maxPages } = context.options;
          const addTo = previous ? addToStart : addToEnd;
          return {
            pages: addTo(data.pages, page, maxPages),
            pageParams: addTo(data.pageParams, param, maxPages)
          };
        };
        if (direction && oldPages.length) {
          const previous = direction === "backward";
          const pageParamFn = previous ? getPreviousPageParam : getNextPageParam;
          const oldData = {
            pages: oldPages,
            pageParams: oldPageParams
          };
          const param = pageParamFn(options, oldData);
          result = await fetchPage(oldData, param, previous);
        } else {
          const remainingPages = pages ?? oldPages.length;
          do {
            const param = currentPage === 0 ? oldPageParams[0] ?? options.initialPageParam : getNextPageParam(options, result);
            if (currentPage > 0 && param == null) {
              break;
            }
            result = await fetchPage(result, param);
            currentPage++;
          } while (currentPage < remainingPages);
        }
        return result;
      };
      if (context.options.persister) {
        context.fetchFn = () => {
          var _a3, _b3;
          return (_b3 = (_a3 = context.options).persister) == null ? void 0 : _b3.call(
            _a3,
            fetchFn,
            {
              client: context.client,
              queryKey: context.queryKey,
              meta: context.options.meta,
              signal: context.signal
            },
            query
          );
        };
      } else {
        context.fetchFn = fetchFn;
      }
    }
  };
}
function getNextPageParam(options, { pages, pageParams }) {
  const lastIndex = pages.length - 1;
  return pages.length > 0 ? options.getNextPageParam(
    pages[lastIndex],
    pages,
    pageParams[lastIndex],
    pageParams
  ) : void 0;
}
function getPreviousPageParam(options, { pages, pageParams }) {
  var _a2;
  return pages.length > 0 ? (_a2 = options.getPreviousPageParam) == null ? void 0 : _a2.call(options, pages[0], pages, pageParams[0], pageParams) : void 0;
}
var Mutation = (_g = class extends Removable {
  constructor(config) {
    super();
    __privateAdd(this, _dispatch2);
    __privateAdd(this, _client3, void 0);
    __privateAdd(this, _observers, void 0);
    __privateAdd(this, _mutationCache, void 0);
    __privateAdd(this, _retryer2, void 0);
    __privateSet(this, _client3, config.client);
    this.mutationId = config.mutationId;
    __privateSet(this, _mutationCache, config.mutationCache);
    __privateSet(this, _observers, []);
    this.state = config.state || getDefaultState();
    this.setOptions(config.options);
    this.scheduleGc();
  }
  setOptions(options) {
    this.options = options;
    this.updateGcTime(this.options.gcTime);
  }
  get meta() {
    return this.options.meta;
  }
  addObserver(observer) {
    if (!__privateGet(this, _observers).includes(observer)) {
      __privateGet(this, _observers).push(observer);
      this.clearGcTimeout();
      __privateGet(this, _mutationCache).notify({
        type: "observerAdded",
        mutation: this,
        observer
      });
    }
  }
  removeObserver(observer) {
    __privateSet(this, _observers, __privateGet(this, _observers).filter((x2) => x2 !== observer));
    this.scheduleGc();
    __privateGet(this, _mutationCache).notify({
      type: "observerRemoved",
      mutation: this,
      observer
    });
  }
  optionalRemove() {
    if (!__privateGet(this, _observers).length) {
      if (this.state.status === "pending") {
        this.scheduleGc();
      } else {
        __privateGet(this, _mutationCache).remove(this);
      }
    }
  }
  continue() {
    var _a2;
    return ((_a2 = __privateGet(this, _retryer2)) == null ? void 0 : _a2.continue()) ?? // continuing a mutation assumes that variables are set, mutation must have been dehydrated before
    this.execute(this.state.variables);
  }
  async execute(variables) {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j2, _k2, _l, _m, _n, _o, _p, _q, _r, _s, _t;
    const onContinue = () => {
      __privateMethod(this, _dispatch2, dispatch_fn2).call(this, { type: "continue" });
    };
    const mutationFnContext = {
      client: __privateGet(this, _client3),
      meta: this.options.meta,
      mutationKey: this.options.mutationKey
    };
    __privateSet(this, _retryer2, createRetryer({
      fn: () => {
        if (!this.options.mutationFn) {
          return Promise.reject(new Error("No mutationFn found"));
        }
        return this.options.mutationFn(variables, mutationFnContext);
      },
      onFail: (failureCount, error) => {
        __privateMethod(this, _dispatch2, dispatch_fn2).call(this, { type: "failed", failureCount, error });
      },
      onPause: () => {
        __privateMethod(this, _dispatch2, dispatch_fn2).call(this, { type: "pause" });
      },
      onContinue,
      retry: this.options.retry ?? 0,
      retryDelay: this.options.retryDelay,
      networkMode: this.options.networkMode,
      canRun: () => __privateGet(this, _mutationCache).canRun(this)
    }));
    const restored = this.state.status === "pending";
    const isPaused = !__privateGet(this, _retryer2).canStart();
    try {
      if (restored) {
        onContinue();
      } else {
        __privateMethod(this, _dispatch2, dispatch_fn2).call(this, { type: "pending", variables, isPaused });
        await ((_b2 = (_a2 = __privateGet(this, _mutationCache).config).onMutate) == null ? void 0 : _b2.call(
          _a2,
          variables,
          this,
          mutationFnContext
        ));
        const context = await ((_d2 = (_c2 = this.options).onMutate) == null ? void 0 : _d2.call(
          _c2,
          variables,
          mutationFnContext
        ));
        if (context !== this.state.context) {
          __privateMethod(this, _dispatch2, dispatch_fn2).call(this, {
            type: "pending",
            context,
            variables,
            isPaused
          });
        }
      }
      const data = await __privateGet(this, _retryer2).start();
      await ((_f2 = (_e2 = __privateGet(this, _mutationCache).config).onSuccess) == null ? void 0 : _f2.call(
        _e2,
        data,
        variables,
        this.state.context,
        this,
        mutationFnContext
      ));
      await ((_h2 = (_g2 = this.options).onSuccess) == null ? void 0 : _h2.call(
        _g2,
        data,
        variables,
        this.state.context,
        mutationFnContext
      ));
      await ((_j2 = (_i2 = __privateGet(this, _mutationCache).config).onSettled) == null ? void 0 : _j2.call(
        _i2,
        data,
        null,
        this.state.variables,
        this.state.context,
        this,
        mutationFnContext
      ));
      await ((_l = (_k2 = this.options).onSettled) == null ? void 0 : _l.call(
        _k2,
        data,
        null,
        variables,
        this.state.context,
        mutationFnContext
      ));
      __privateMethod(this, _dispatch2, dispatch_fn2).call(this, { type: "success", data });
      return data;
    } catch (error) {
      try {
        await ((_n = (_m = __privateGet(this, _mutationCache).config).onError) == null ? void 0 : _n.call(
          _m,
          error,
          variables,
          this.state.context,
          this,
          mutationFnContext
        ));
        await ((_p = (_o = this.options).onError) == null ? void 0 : _p.call(
          _o,
          error,
          variables,
          this.state.context,
          mutationFnContext
        ));
        await ((_r = (_q = __privateGet(this, _mutationCache).config).onSettled) == null ? void 0 : _r.call(
          _q,
          void 0,
          error,
          this.state.variables,
          this.state.context,
          this,
          mutationFnContext
        ));
        await ((_t = (_s = this.options).onSettled) == null ? void 0 : _t.call(
          _s,
          void 0,
          error,
          variables,
          this.state.context,
          mutationFnContext
        ));
        throw error;
      } finally {
        __privateMethod(this, _dispatch2, dispatch_fn2).call(this, { type: "error", error });
      }
    } finally {
      __privateGet(this, _mutationCache).runNext(this);
    }
  }
}, _client3 = new WeakMap(), _observers = new WeakMap(), _mutationCache = new WeakMap(), _retryer2 = new WeakMap(), _dispatch2 = new WeakSet(), dispatch_fn2 = function(action) {
  const reducer = (state) => {
    switch (action.type) {
      case "failed":
        return {
          ...state,
          failureCount: action.failureCount,
          failureReason: action.error
        };
      case "pause":
        return {
          ...state,
          isPaused: true
        };
      case "continue":
        return {
          ...state,
          isPaused: false
        };
      case "pending":
        return {
          ...state,
          context: action.context,
          data: void 0,
          failureCount: 0,
          failureReason: null,
          error: null,
          isPaused: action.isPaused,
          status: "pending",
          variables: action.variables,
          submittedAt: Date.now()
        };
      case "success":
        return {
          ...state,
          data: action.data,
          failureCount: 0,
          failureReason: null,
          error: null,
          status: "success",
          isPaused: false
        };
      case "error":
        return {
          ...state,
          data: void 0,
          error: action.error,
          failureCount: state.failureCount + 1,
          failureReason: action.error,
          isPaused: false,
          status: "error"
        };
    }
  };
  this.state = reducer(this.state);
  notifyManager.batch(() => {
    __privateGet(this, _observers).forEach((observer) => {
      observer.onMutationUpdate(action);
    });
    __privateGet(this, _mutationCache).notify({
      mutation: this,
      type: "updated",
      action
    });
  });
}, _g);
function getDefaultState() {
  return {
    context: void 0,
    data: void 0,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    status: "idle",
    variables: void 0,
    submittedAt: 0
  };
}
var MutationCache = (_h = class extends Subscribable {
  constructor(config = {}) {
    super();
    __privateAdd(this, _mutations, void 0);
    __privateAdd(this, _scopes, void 0);
    __privateAdd(this, _mutationId, void 0);
    this.config = config;
    __privateSet(this, _mutations, /* @__PURE__ */ new Set());
    __privateSet(this, _scopes, /* @__PURE__ */ new Map());
    __privateSet(this, _mutationId, 0);
  }
  build(client2, options, state) {
    const mutation = new Mutation({
      client: client2,
      mutationCache: this,
      mutationId: ++__privateWrapper(this, _mutationId)._,
      options: client2.defaultMutationOptions(options),
      state
    });
    this.add(mutation);
    return mutation;
  }
  add(mutation) {
    __privateGet(this, _mutations).add(mutation);
    const scope = scopeFor(mutation);
    if (typeof scope === "string") {
      const scopedMutations = __privateGet(this, _scopes).get(scope);
      if (scopedMutations) {
        scopedMutations.push(mutation);
      } else {
        __privateGet(this, _scopes).set(scope, [mutation]);
      }
    }
    this.notify({ type: "added", mutation });
  }
  remove(mutation) {
    if (__privateGet(this, _mutations).delete(mutation)) {
      const scope = scopeFor(mutation);
      if (typeof scope === "string") {
        const scopedMutations = __privateGet(this, _scopes).get(scope);
        if (scopedMutations) {
          if (scopedMutations.length > 1) {
            const index2 = scopedMutations.indexOf(mutation);
            if (index2 !== -1) {
              scopedMutations.splice(index2, 1);
            }
          } else if (scopedMutations[0] === mutation) {
            __privateGet(this, _scopes).delete(scope);
          }
        }
      }
    }
    this.notify({ type: "removed", mutation });
  }
  canRun(mutation) {
    const scope = scopeFor(mutation);
    if (typeof scope === "string") {
      const mutationsWithSameScope = __privateGet(this, _scopes).get(scope);
      const firstPendingMutation = mutationsWithSameScope == null ? void 0 : mutationsWithSameScope.find(
        (m2) => m2.state.status === "pending"
      );
      return !firstPendingMutation || firstPendingMutation === mutation;
    } else {
      return true;
    }
  }
  runNext(mutation) {
    var _a2;
    const scope = scopeFor(mutation);
    if (typeof scope === "string") {
      const foundMutation = (_a2 = __privateGet(this, _scopes).get(scope)) == null ? void 0 : _a2.find((m2) => m2 !== mutation && m2.state.isPaused);
      return (foundMutation == null ? void 0 : foundMutation.continue()) ?? Promise.resolve();
    } else {
      return Promise.resolve();
    }
  }
  clear() {
    notifyManager.batch(() => {
      __privateGet(this, _mutations).forEach((mutation) => {
        this.notify({ type: "removed", mutation });
      });
      __privateGet(this, _mutations).clear();
      __privateGet(this, _scopes).clear();
    });
  }
  getAll() {
    return Array.from(__privateGet(this, _mutations));
  }
  find(filters) {
    const defaultedFilters = { exact: true, ...filters };
    return this.getAll().find(
      (mutation) => matchMutation(defaultedFilters, mutation)
    );
  }
  findAll(filters = {}) {
    return this.getAll().filter((mutation) => matchMutation(filters, mutation));
  }
  notify(event) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event);
      });
    });
  }
  resumePausedMutations() {
    const pausedMutations = this.getAll().filter((x2) => x2.state.isPaused);
    return notifyManager.batch(
      () => Promise.all(
        pausedMutations.map((mutation) => mutation.continue().catch(noop))
      )
    );
  }
}, _mutations = new WeakMap(), _scopes = new WeakMap(), _mutationId = new WeakMap(), _h);
function scopeFor(mutation) {
  var _a2;
  return (_a2 = mutation.options.scope) == null ? void 0 : _a2.id;
}
var MutationObserver$1 = (_i = class extends Subscribable {
  constructor(client2, options) {
    super();
    __privateAdd(this, _updateResult);
    __privateAdd(this, _notify2);
    __privateAdd(this, _client4, void 0);
    __privateAdd(this, _currentResult2, void 0);
    __privateAdd(this, _currentMutation, void 0);
    __privateAdd(this, _mutateOptions, void 0);
    __privateSet(this, _client4, client2);
    this.setOptions(options);
    this.bindMethods();
    __privateMethod(this, _updateResult, updateResult_fn).call(this);
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this);
    this.reset = this.reset.bind(this);
  }
  setOptions(options) {
    var _a2;
    const prevOptions = this.options;
    this.options = __privateGet(this, _client4).defaultMutationOptions(options);
    if (!shallowEqualObjects(this.options, prevOptions)) {
      __privateGet(this, _client4).getMutationCache().notify({
        type: "observerOptionsUpdated",
        mutation: __privateGet(this, _currentMutation),
        observer: this
      });
    }
    if ((prevOptions == null ? void 0 : prevOptions.mutationKey) && this.options.mutationKey && hashKey(prevOptions.mutationKey) !== hashKey(this.options.mutationKey)) {
      this.reset();
    } else if (((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state.status) === "pending") {
      __privateGet(this, _currentMutation).setOptions(this.options);
    }
  }
  onUnsubscribe() {
    var _a2;
    if (!this.hasListeners()) {
      (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    }
  }
  onMutationUpdate(action) {
    __privateMethod(this, _updateResult, updateResult_fn).call(this);
    __privateMethod(this, _notify2, notify_fn2).call(this, action);
  }
  getCurrentResult() {
    return __privateGet(this, _currentResult2);
  }
  reset() {
    var _a2;
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, void 0);
    __privateMethod(this, _updateResult, updateResult_fn).call(this);
    __privateMethod(this, _notify2, notify_fn2).call(this);
  }
  mutate(variables, options) {
    var _a2;
    __privateSet(this, _mutateOptions, options);
    (_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.removeObserver(this);
    __privateSet(this, _currentMutation, __privateGet(this, _client4).getMutationCache().build(__privateGet(this, _client4), this.options));
    __privateGet(this, _currentMutation).addObserver(this);
    return __privateGet(this, _currentMutation).execute(variables);
  }
}, _client4 = new WeakMap(), _currentResult2 = new WeakMap(), _currentMutation = new WeakMap(), _mutateOptions = new WeakMap(), _updateResult = new WeakSet(), updateResult_fn = function() {
  var _a2;
  const state = ((_a2 = __privateGet(this, _currentMutation)) == null ? void 0 : _a2.state) ?? getDefaultState();
  __privateSet(this, _currentResult2, {
    ...state,
    isPending: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
    isIdle: state.status === "idle",
    mutate: this.mutate,
    reset: this.reset
  });
}, _notify2 = new WeakSet(), notify_fn2 = function(action) {
  notifyManager.batch(() => {
    var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2;
    if (__privateGet(this, _mutateOptions) && this.hasListeners()) {
      const variables = __privateGet(this, _currentResult2).variables;
      const onMutateResult = __privateGet(this, _currentResult2).context;
      const context = {
        client: __privateGet(this, _client4),
        meta: this.options.meta,
        mutationKey: this.options.mutationKey
      };
      if ((action == null ? void 0 : action.type) === "success") {
        (_b2 = (_a2 = __privateGet(this, _mutateOptions)).onSuccess) == null ? void 0 : _b2.call(
          _a2,
          action.data,
          variables,
          onMutateResult,
          context
        );
        (_d2 = (_c2 = __privateGet(this, _mutateOptions)).onSettled) == null ? void 0 : _d2.call(
          _c2,
          action.data,
          null,
          variables,
          onMutateResult,
          context
        );
      } else if ((action == null ? void 0 : action.type) === "error") {
        (_f2 = (_e2 = __privateGet(this, _mutateOptions)).onError) == null ? void 0 : _f2.call(
          _e2,
          action.error,
          variables,
          onMutateResult,
          context
        );
        (_h2 = (_g2 = __privateGet(this, _mutateOptions)).onSettled) == null ? void 0 : _h2.call(
          _g2,
          void 0,
          action.error,
          variables,
          onMutateResult,
          context
        );
      }
    }
    this.listeners.forEach((listener) => {
      listener(__privateGet(this, _currentResult2));
    });
  });
}, _i);
var QueryCache = (_j = class extends Subscribable {
  constructor(config = {}) {
    super();
    __privateAdd(this, _queries, void 0);
    this.config = config;
    __privateSet(this, _queries, /* @__PURE__ */ new Map());
  }
  build(client2, options, state) {
    const queryKey = options.queryKey;
    const queryHash = options.queryHash ?? hashQueryKeyByOptions(queryKey, options);
    let query = this.get(queryHash);
    if (!query) {
      query = new Query({
        client: client2,
        queryKey,
        queryHash,
        options: client2.defaultQueryOptions(options),
        state,
        defaultOptions: client2.getQueryDefaults(queryKey)
      });
      this.add(query);
    }
    return query;
  }
  add(query) {
    if (!__privateGet(this, _queries).has(query.queryHash)) {
      __privateGet(this, _queries).set(query.queryHash, query);
      this.notify({
        type: "added",
        query
      });
    }
  }
  remove(query) {
    const queryInMap = __privateGet(this, _queries).get(query.queryHash);
    if (queryInMap) {
      query.destroy();
      if (queryInMap === query) {
        __privateGet(this, _queries).delete(query.queryHash);
      }
      this.notify({ type: "removed", query });
    }
  }
  clear() {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        this.remove(query);
      });
    });
  }
  get(queryHash) {
    return __privateGet(this, _queries).get(queryHash);
  }
  getAll() {
    return [...__privateGet(this, _queries).values()];
  }
  find(filters) {
    const defaultedFilters = { exact: true, ...filters };
    return this.getAll().find(
      (query) => matchQuery(defaultedFilters, query)
    );
  }
  findAll(filters = {}) {
    const queries = this.getAll();
    return Object.keys(filters).length > 0 ? queries.filter((query) => matchQuery(filters, query)) : queries;
  }
  notify(event) {
    notifyManager.batch(() => {
      this.listeners.forEach((listener) => {
        listener(event);
      });
    });
  }
  onFocus() {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onFocus();
      });
    });
  }
  onOnline() {
    notifyManager.batch(() => {
      this.getAll().forEach((query) => {
        query.onOnline();
      });
    });
  }
}, _queries = new WeakMap(), _j);
var QueryClient = (_k = class {
  constructor(config = {}) {
    __privateAdd(this, _queryCache, void 0);
    __privateAdd(this, _mutationCache2, void 0);
    __privateAdd(this, _defaultOptions2, void 0);
    __privateAdd(this, _queryDefaults, void 0);
    __privateAdd(this, _mutationDefaults, void 0);
    __privateAdd(this, _mountCount, void 0);
    __privateAdd(this, _unsubscribeFocus, void 0);
    __privateAdd(this, _unsubscribeOnline, void 0);
    __privateSet(this, _queryCache, config.queryCache || new QueryCache());
    __privateSet(this, _mutationCache2, config.mutationCache || new MutationCache());
    __privateSet(this, _defaultOptions2, config.defaultOptions || {});
    __privateSet(this, _queryDefaults, /* @__PURE__ */ new Map());
    __privateSet(this, _mutationDefaults, /* @__PURE__ */ new Map());
    __privateSet(this, _mountCount, 0);
  }
  mount() {
    __privateWrapper(this, _mountCount)._++;
    if (__privateGet(this, _mountCount) !== 1)
      return;
    __privateSet(this, _unsubscribeFocus, focusManager.subscribe(async (focused) => {
      if (focused) {
        await this.resumePausedMutations();
        __privateGet(this, _queryCache).onFocus();
      }
    }));
    __privateSet(this, _unsubscribeOnline, onlineManager.subscribe(async (online) => {
      if (online) {
        await this.resumePausedMutations();
        __privateGet(this, _queryCache).onOnline();
      }
    }));
  }
  unmount() {
    var _a2, _b2;
    __privateWrapper(this, _mountCount)._--;
    if (__privateGet(this, _mountCount) !== 0)
      return;
    (_a2 = __privateGet(this, _unsubscribeFocus)) == null ? void 0 : _a2.call(this);
    __privateSet(this, _unsubscribeFocus, void 0);
    (_b2 = __privateGet(this, _unsubscribeOnline)) == null ? void 0 : _b2.call(this);
    __privateSet(this, _unsubscribeOnline, void 0);
  }
  isFetching(filters) {
    return __privateGet(this, _queryCache).findAll({ ...filters, fetchStatus: "fetching" }).length;
  }
  isMutating(filters) {
    return __privateGet(this, _mutationCache2).findAll({ ...filters, status: "pending" }).length;
  }
  /**
   * Imperative (non-reactive) way to retrieve data for a QueryKey.
   * Should only be used in callbacks or functions where reading the latest data is necessary, e.g. for optimistic updates.
   *
   * Hint: Do not use this function inside a component, because it won't receive updates.
   * Use `useQuery` to create a `QueryObserver` that subscribes to changes.
   */
  getQueryData(queryKey) {
    var _a2;
    const options = this.defaultQueryOptions({ queryKey });
    return (_a2 = __privateGet(this, _queryCache).get(options.queryHash)) == null ? void 0 : _a2.state.data;
  }
  ensureQueryData(options) {
    const defaultedOptions = this.defaultQueryOptions(options);
    const query = __privateGet(this, _queryCache).build(this, defaultedOptions);
    const cachedData = query.state.data;
    if (cachedData === void 0) {
      return this.fetchQuery(options);
    }
    if (options.revalidateIfStale && query.isStaleByTime(resolveStaleTime(defaultedOptions.staleTime, query))) {
      void this.prefetchQuery(defaultedOptions);
    }
    return Promise.resolve(cachedData);
  }
  getQueriesData(filters) {
    return __privateGet(this, _queryCache).findAll(filters).map(({ queryKey, state }) => {
      const data = state.data;
      return [queryKey, data];
    });
  }
  setQueryData(queryKey, updater, options) {
    const defaultedOptions = this.defaultQueryOptions({ queryKey });
    const query = __privateGet(this, _queryCache).get(
      defaultedOptions.queryHash
    );
    const prevData = query == null ? void 0 : query.state.data;
    const data = functionalUpdate(updater, prevData);
    if (data === void 0) {
      return void 0;
    }
    return __privateGet(this, _queryCache).build(this, defaultedOptions).setData(data, { ...options, manual: true });
  }
  setQueriesData(filters, updater, options) {
    return notifyManager.batch(
      () => __privateGet(this, _queryCache).findAll(filters).map(({ queryKey }) => [
        queryKey,
        this.setQueryData(queryKey, updater, options)
      ])
    );
  }
  getQueryState(queryKey) {
    var _a2;
    const options = this.defaultQueryOptions({ queryKey });
    return (_a2 = __privateGet(this, _queryCache).get(
      options.queryHash
    )) == null ? void 0 : _a2.state;
  }
  removeQueries(filters) {
    const queryCache = __privateGet(this, _queryCache);
    notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        queryCache.remove(query);
      });
    });
  }
  resetQueries(filters, options) {
    const queryCache = __privateGet(this, _queryCache);
    return notifyManager.batch(() => {
      queryCache.findAll(filters).forEach((query) => {
        query.reset();
      });
      return this.refetchQueries(
        {
          type: "active",
          ...filters
        },
        options
      );
    });
  }
  cancelQueries(filters, cancelOptions = {}) {
    const defaultedCancelOptions = { revert: true, ...cancelOptions };
    const promises = notifyManager.batch(
      () => __privateGet(this, _queryCache).findAll(filters).map((query) => query.cancel(defaultedCancelOptions))
    );
    return Promise.all(promises).then(noop).catch(noop);
  }
  invalidateQueries(filters, options = {}) {
    return notifyManager.batch(() => {
      __privateGet(this, _queryCache).findAll(filters).forEach((query) => {
        query.invalidate();
      });
      if ((filters == null ? void 0 : filters.refetchType) === "none") {
        return Promise.resolve();
      }
      return this.refetchQueries(
        {
          ...filters,
          type: (filters == null ? void 0 : filters.refetchType) ?? (filters == null ? void 0 : filters.type) ?? "active"
        },
        options
      );
    });
  }
  refetchQueries(filters, options = {}) {
    const fetchOptions = {
      ...options,
      cancelRefetch: options.cancelRefetch ?? true
    };
    const promises = notifyManager.batch(
      () => __privateGet(this, _queryCache).findAll(filters).filter((query) => !query.isDisabled() && !query.isStatic()).map((query) => {
        let promise = query.fetch(void 0, fetchOptions);
        if (!fetchOptions.throwOnError) {
          promise = promise.catch(noop);
        }
        return query.state.fetchStatus === "paused" ? Promise.resolve() : promise;
      })
    );
    return Promise.all(promises).then(noop);
  }
  fetchQuery(options) {
    const defaultedOptions = this.defaultQueryOptions(options);
    if (defaultedOptions.retry === void 0) {
      defaultedOptions.retry = false;
    }
    const query = __privateGet(this, _queryCache).build(this, defaultedOptions);
    return query.isStaleByTime(
      resolveStaleTime(defaultedOptions.staleTime, query)
    ) ? query.fetch(defaultedOptions) : Promise.resolve(query.state.data);
  }
  prefetchQuery(options) {
    return this.fetchQuery(options).then(noop).catch(noop);
  }
  fetchInfiniteQuery(options) {
    options.behavior = infiniteQueryBehavior(options.pages);
    return this.fetchQuery(options);
  }
  prefetchInfiniteQuery(options) {
    return this.fetchInfiniteQuery(options).then(noop).catch(noop);
  }
  ensureInfiniteQueryData(options) {
    options.behavior = infiniteQueryBehavior(options.pages);
    return this.ensureQueryData(options);
  }
  resumePausedMutations() {
    if (onlineManager.isOnline()) {
      return __privateGet(this, _mutationCache2).resumePausedMutations();
    }
    return Promise.resolve();
  }
  getQueryCache() {
    return __privateGet(this, _queryCache);
  }
  getMutationCache() {
    return __privateGet(this, _mutationCache2);
  }
  getDefaultOptions() {
    return __privateGet(this, _defaultOptions2);
  }
  setDefaultOptions(options) {
    __privateSet(this, _defaultOptions2, options);
  }
  setQueryDefaults(queryKey, options) {
    __privateGet(this, _queryDefaults).set(hashKey(queryKey), {
      queryKey,
      defaultOptions: options
    });
  }
  getQueryDefaults(queryKey) {
    const defaults = [...__privateGet(this, _queryDefaults).values()];
    const result = {};
    defaults.forEach((queryDefault) => {
      if (partialMatchKey(queryKey, queryDefault.queryKey)) {
        Object.assign(result, queryDefault.defaultOptions);
      }
    });
    return result;
  }
  setMutationDefaults(mutationKey, options) {
    __privateGet(this, _mutationDefaults).set(hashKey(mutationKey), {
      mutationKey,
      defaultOptions: options
    });
  }
  getMutationDefaults(mutationKey) {
    const defaults = [...__privateGet(this, _mutationDefaults).values()];
    const result = {};
    defaults.forEach((queryDefault) => {
      if (partialMatchKey(mutationKey, queryDefault.mutationKey)) {
        Object.assign(result, queryDefault.defaultOptions);
      }
    });
    return result;
  }
  defaultQueryOptions(options) {
    if (options._defaulted) {
      return options;
    }
    const defaultedOptions = {
      ...__privateGet(this, _defaultOptions2).queries,
      ...this.getQueryDefaults(options.queryKey),
      ...options,
      _defaulted: true
    };
    if (!defaultedOptions.queryHash) {
      defaultedOptions.queryHash = hashQueryKeyByOptions(
        defaultedOptions.queryKey,
        defaultedOptions
      );
    }
    if (defaultedOptions.refetchOnReconnect === void 0) {
      defaultedOptions.refetchOnReconnect = defaultedOptions.networkMode !== "always";
    }
    if (defaultedOptions.throwOnError === void 0) {
      defaultedOptions.throwOnError = !!defaultedOptions.suspense;
    }
    if (!defaultedOptions.networkMode && defaultedOptions.persister) {
      defaultedOptions.networkMode = "offlineFirst";
    }
    if (defaultedOptions.queryFn === skipToken) {
      defaultedOptions.enabled = false;
    }
    return defaultedOptions;
  }
  defaultMutationOptions(options) {
    if (options == null ? void 0 : options._defaulted) {
      return options;
    }
    return {
      ...__privateGet(this, _defaultOptions2).mutations,
      ...(options == null ? void 0 : options.mutationKey) && this.getMutationDefaults(options.mutationKey),
      ...options,
      _defaulted: true
    };
  }
  clear() {
    __privateGet(this, _queryCache).clear();
    __privateGet(this, _mutationCache2).clear();
  }
}, _queryCache = new WeakMap(), _mutationCache2 = new WeakMap(), _defaultOptions2 = new WeakMap(), _queryDefaults = new WeakMap(), _mutationDefaults = new WeakMap(), _mountCount = new WeakMap(), _unsubscribeFocus = new WeakMap(), _unsubscribeOnline = new WeakMap(), _k);
var QueryClientContext = reactExports.createContext(
  void 0
);
var useQueryClient = (queryClient2) => {
  const client2 = reactExports.useContext(QueryClientContext);
  if (queryClient2) {
    return queryClient2;
  }
  if (!client2) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }
  return client2;
};
var QueryClientProvider = ({
  client: client2,
  children
}) => {
  reactExports.useEffect(() => {
    client2.mount();
    return () => {
      client2.unmount();
    };
  }, [client2]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientContext.Provider, { value: client2, children });
};
var IsRestoringContext = reactExports.createContext(false);
var useIsRestoring = () => reactExports.useContext(IsRestoringContext);
IsRestoringContext.Provider;
function createValue() {
  let isReset = false;
  return {
    clearReset: () => {
      isReset = false;
    },
    reset: () => {
      isReset = true;
    },
    isReset: () => {
      return isReset;
    }
  };
}
var QueryErrorResetBoundaryContext = reactExports.createContext(createValue());
var useQueryErrorResetBoundary = () => reactExports.useContext(QueryErrorResetBoundaryContext);
var ensurePreventErrorBoundaryRetry = (options, errorResetBoundary) => {
  if (options.suspense || options.throwOnError || options.experimental_prefetchInRender) {
    if (!errorResetBoundary.isReset()) {
      options.retryOnMount = false;
    }
  }
};
var useClearResetErrorBoundary = (errorResetBoundary) => {
  reactExports.useEffect(() => {
    errorResetBoundary.clearReset();
  }, [errorResetBoundary]);
};
var getHasError = ({
  result,
  errorResetBoundary,
  throwOnError,
  query,
  suspense
}) => {
  return result.isError && !errorResetBoundary.isReset() && !result.isFetching && query && (suspense && result.data === void 0 || shouldThrowError(throwOnError, [result.error, query]));
};
var ensureSuspenseTimers = (defaultedOptions) => {
  if (defaultedOptions.suspense) {
    const MIN_SUSPENSE_TIME_MS = 1e3;
    const clamp = (value) => value === "static" ? value : Math.max(value ?? MIN_SUSPENSE_TIME_MS, MIN_SUSPENSE_TIME_MS);
    const originalStaleTime = defaultedOptions.staleTime;
    defaultedOptions.staleTime = typeof originalStaleTime === "function" ? (...args) => clamp(originalStaleTime(...args)) : clamp(originalStaleTime);
    if (typeof defaultedOptions.gcTime === "number") {
      defaultedOptions.gcTime = Math.max(
        defaultedOptions.gcTime,
        MIN_SUSPENSE_TIME_MS
      );
    }
  }
};
var willFetch = (result, isRestoring) => result.isLoading && result.isFetching && !isRestoring;
var shouldSuspend = (defaultedOptions, result) => (defaultedOptions == null ? void 0 : defaultedOptions.suspense) && result.isPending;
var fetchOptimistic = (defaultedOptions, observer, errorResetBoundary) => observer.fetchOptimistic(defaultedOptions).catch(() => {
  errorResetBoundary.clearReset();
});
function useBaseQuery(options, Observer, queryClient2) {
  var _a2, _b2, _c2, _d2, _e2;
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const client2 = useQueryClient(queryClient2);
  const defaultedOptions = client2.defaultQueryOptions(options);
  (_b2 = (_a2 = client2.getDefaultOptions().queries) == null ? void 0 : _a2._experimental_beforeQuery) == null ? void 0 : _b2.call(
    _a2,
    defaultedOptions
  );
  defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
  ensureSuspenseTimers(defaultedOptions);
  ensurePreventErrorBoundaryRetry(defaultedOptions, errorResetBoundary);
  useClearResetErrorBoundary(errorResetBoundary);
  const isNewCacheEntry = !client2.getQueryCache().get(defaultedOptions.queryHash);
  const [observer] = reactExports.useState(
    () => new Observer(
      client2,
      defaultedOptions
    )
  );
  const result = observer.getOptimisticResult(defaultedOptions);
  const shouldSubscribe = !isRestoring && options.subscribed !== false;
  reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => {
        const unsubscribe = shouldSubscribe ? observer.subscribe(notifyManager.batchCalls(onStoreChange)) : noop;
        observer.updateResult();
        return unsubscribe;
      },
      [observer, shouldSubscribe]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  reactExports.useEffect(() => {
    observer.setOptions(defaultedOptions);
  }, [defaultedOptions, observer]);
  if (shouldSuspend(defaultedOptions, result)) {
    throw fetchOptimistic(defaultedOptions, observer, errorResetBoundary);
  }
  if (getHasError({
    result,
    errorResetBoundary,
    throwOnError: defaultedOptions.throwOnError,
    query: client2.getQueryCache().get(defaultedOptions.queryHash),
    suspense: defaultedOptions.suspense
  })) {
    throw result.error;
  }
  (_d2 = (_c2 = client2.getDefaultOptions().queries) == null ? void 0 : _c2._experimental_afterQuery) == null ? void 0 : _d2.call(
    _c2,
    defaultedOptions,
    result
  );
  if (defaultedOptions.experimental_prefetchInRender && !isServer && willFetch(result, isRestoring)) {
    const promise = isNewCacheEntry ? (
      // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
      fetchOptimistic(defaultedOptions, observer, errorResetBoundary)
    ) : (
      // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
      (_e2 = client2.getQueryCache().get(defaultedOptions.queryHash)) == null ? void 0 : _e2.promise
    );
    promise == null ? void 0 : promise.catch(noop).finally(() => {
      observer.updateResult();
    });
  }
  return !defaultedOptions.notifyOnChangeProps ? observer.trackResult(result) : result;
}
function useQuery(options, queryClient2) {
  return useBaseQuery(options, QueryObserver, queryClient2);
}
function useMutation(options, queryClient2) {
  const client2 = useQueryClient(queryClient2);
  const [observer] = reactExports.useState(
    () => new MutationObserver$1(
      client2,
      options
    )
  );
  reactExports.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  const mutate = reactExports.useCallback(
    (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(noop);
    },
    [observer]
  );
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) {
    throw result.error;
  }
  return { ...result, mutate, mutateAsync: result.mutate };
}
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  if (!deps || deps.length === 0) {
    return baseModule();
  }
  const links = document.getElementsByTagName("link");
  return Promise.all(deps.map((dep) => {
    dep = assetsURL(dep);
    if (dep in seen)
      return;
    seen[dep] = true;
    const isCss = dep.endsWith(".css");
    const cssSelector = isCss ? '[rel="stylesheet"]' : "";
    const isBaseRelative = !!importerUrl;
    if (isBaseRelative) {
      for (let i = links.length - 1; i >= 0; i--) {
        const link2 = links[i];
        if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
          return;
        }
      }
    } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
      return;
    }
    const link = document.createElement("link");
    link.rel = isCss ? "stylesheet" : scriptRel;
    if (!isCss) {
      link.as = "script";
      link.crossOrigin = "";
    }
    link.href = dep;
    document.head.appendChild(link);
    if (isCss) {
      return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(new Error(`Unable to preload CSS for ${dep}`)));
      });
    }
  })).then(() => baseModule()).catch((err) => {
    const e = new Event("vite:preloadError", { cancelable: true });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  });
};
var PopStateEventType = "popstate";
function createBrowserHistory(options = {}) {
  function createBrowserLocation(window2, globalHistory) {
    let { pathname, search, hash } = window2.location;
    return createLocation(
      "",
      { pathname, search, hash },
      // state defaults to `null` because `window.history.state` does
      globalHistory.state && globalHistory.state.usr || null,
      globalHistory.state && globalHistory.state.key || "default"
    );
  }
  function createBrowserHref(window2, to) {
    return typeof to === "string" ? to : createPath(to);
  }
  return getUrlBasedHistory(
    createBrowserLocation,
    createBrowserHref,
    null,
    options
  );
}
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined")
      console.warn(message);
    try {
      throw new Error(message);
    } catch (e) {
    }
  }
}
function createKey() {
  return Math.random().toString(36).substring(2, 10);
}
function getHistoryState(location, index2) {
  return {
    usr: location.state,
    key: location.key,
    idx: index2
  };
}
function createLocation(current, to, state = null, key) {
  let location = {
    pathname: typeof current === "string" ? current : current.pathname,
    search: "",
    hash: "",
    ...typeof to === "string" ? parsePath(to) : to,
    state,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: to && to.key || key || createKey()
  };
  return location;
}
function createPath({
  pathname = "/",
  search = "",
  hash = ""
}) {
  if (search && search !== "?")
    pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#")
    pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substring(hashIndex);
      path = path.substring(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substring(searchIndex);
      path = path.substring(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
function getUrlBasedHistory(getLocation, createHref2, validateLocation, options = {}) {
  let { window: window2 = document.defaultView, v5Compat = false } = options;
  let globalHistory = window2.history;
  let action = "POP";
  let listener = null;
  let index2 = getIndex();
  if (index2 == null) {
    index2 = 0;
    globalHistory.replaceState({ ...globalHistory.state, idx: index2 }, "");
  }
  function getIndex() {
    let state = globalHistory.state || { idx: null };
    return state.idx;
  }
  function handlePop() {
    action = "POP";
    let nextIndex = getIndex();
    let delta = nextIndex == null ? null : nextIndex - index2;
    index2 = nextIndex;
    if (listener) {
      listener({ action, location: history.location, delta });
    }
  }
  function push(to, state) {
    action = "PUSH";
    let location = createLocation(history.location, to, state);
    if (validateLocation)
      validateLocation(location, to);
    index2 = getIndex() + 1;
    let historyState = getHistoryState(location, index2);
    let url = history.createHref(location);
    try {
      globalHistory.pushState(historyState, "", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "DataCloneError") {
        throw error;
      }
      window2.location.assign(url);
    }
    if (v5Compat && listener) {
      listener({ action, location: history.location, delta: 1 });
    }
  }
  function replace2(to, state) {
    action = "REPLACE";
    let location = createLocation(history.location, to, state);
    if (validateLocation)
      validateLocation(location, to);
    index2 = getIndex();
    let historyState = getHistoryState(location, index2);
    let url = history.createHref(location);
    globalHistory.replaceState(historyState, "", url);
    if (v5Compat && listener) {
      listener({ action, location: history.location, delta: 0 });
    }
  }
  function createURL(to) {
    return createBrowserURLImpl(to);
  }
  let history = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window2, globalHistory);
    },
    listen(fn) {
      if (listener) {
        throw new Error("A history only accepts one active listener");
      }
      window2.addEventListener(PopStateEventType, handlePop);
      listener = fn;
      return () => {
        window2.removeEventListener(PopStateEventType, handlePop);
        listener = null;
      };
    },
    createHref(to) {
      return createHref2(window2, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };
    },
    push,
    replace: replace2,
    go(n2) {
      return globalHistory.go(n2);
    }
  };
  return history;
}
function createBrowserURLImpl(to, isAbsolute = false) {
  let base = "http://localhost";
  if (typeof window !== "undefined") {
    base = window.location.origin !== "null" ? window.location.origin : window.location.href;
  }
  invariant(base, "No window.location.(origin|href) available to create URL");
  let href = typeof to === "string" ? to : createPath(to);
  href = href.replace(/ $/, "%20");
  if (!isAbsolute && href.startsWith("//")) {
    href = base + href;
  }
  return new URL(href, base);
}
function matchRoutes(routes, locationArg, basename = "/") {
  return matchRoutesImpl(routes, locationArg, basename, false);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname);
    matches = matchRouteBranch(
      branches[i],
      decoded,
      allowPartial
    );
  }
  return matches;
}
function flattenRoutes(routes, branches = [], parentsMeta = [], parentPath = "", _hasParentOptionalSegments = false) {
  let flattenRoute = (route, index2, hasParentOptionalSegments = _hasParentOptionalSegments, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index2,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      if (!meta.relativePath.startsWith(parentPath) && hasParentOptionalSegments) {
        return;
      }
      invariant(
        meta.relativePath.startsWith(parentPath),
        `Absolute route path "${meta.relativePath}" nested under path "${parentPath}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`
      );
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        `Index routes must not have child routes. Please remove all child routes from route path "${path}".`
      );
      flattenRoutes(
        route.children,
        branches,
        routesMeta,
        path,
        hasParentOptionalSegments
      );
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index2) => {
    var _a2;
    if (route.path === "" || !((_a2 = route.path) == null ? void 0 : _a2.includes("?"))) {
      flattenRoute(route, index2);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index2, true, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0)
    return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(
    ...restExploded.map(
      (subpath) => subpath === "" ? required : [required, subpath].join("/")
    )
  );
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map(
    (exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded
  );
}
function rankRouteBranches(branches) {
  branches.sort(
    (a, b) => a.score !== b.score ? b.score - a.score : compareIndexes(
      a.routesMeta.map((meta) => meta.childrenIndex),
      b.routesMeta.map((meta) => meta.childrenIndex)
    )
  );
}
var paramRe = /^:[\w-]+$/;
var dynamicSegmentValue = 3;
var indexRouteValue = 2;
var emptySegmentValue = 1;
var staticSegmentValue = 10;
var splatPenalty = -2;
var isSplat = (s) => s === "*";
function computeScore(path, index2) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index2) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s) => !isSplat(s)).reduce(
    (score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue),
    initialScore
  );
}
function compareIndexes(a, b) {
  let siblings = a.length === b.length && a.slice(0, -1).every((n2, i) => n2 === b[i]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a[a.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial = false) {
  let { routesMeta } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i];
    let end = i === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath(
      { path: meta.relativePath, caseSensitive: meta.caseSensitive, end },
      remainingPathname
    );
    let route = meta.route;
    if (!match && end && allowPartial && !routesMeta[routesMeta.length - 1].route.index) {
      match = matchPath(
        {
          path: meta.relativePath,
          caseSensitive: meta.caseSensitive,
          end: false
        },
        remainingPathname
      );
    }
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(
        joinPaths([matchedPathname, match.pathnameBase])
      ),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = { path: pattern, caseSensitive: false, end: true };
  }
  let [matcher, compiledParams] = compilePath(
    pattern.path,
    pattern.caseSensitive,
    pattern.end
  );
  let match = pathname.match(matcher);
  if (!match)
    return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce(
    (memo2, { paramName, isOptional }, index2) => {
      if (paramName === "*") {
        let splatValue = captureGroups[index2] || "";
        pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
      }
      const value = captureGroups[index2];
      if (isOptional && !value) {
        memo2[paramName] = void 0;
      } else {
        memo2[paramName] = (value || "").replace(/%2F/g, "/");
      }
      return memo2;
    },
    {}
  );
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive = false, end = true) {
  warning(
    path === "*" || !path.endsWith("*") || path.endsWith("/*"),
    `Route path "${path}" will be treated as if it were "${path.replace(/\*$/, "/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${path.replace(/\*$/, "/*")}".`
  );
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(
    /\/:([\w-]+)(\?)?/g,
    (_, paramName, isOptional) => {
      params.push({ paramName, isOptional: isOptional != null });
      return isOptional ? "/?([^\\/]+)?" : "/([^\\/]+)";
    }
  ).replace(/\/([\w-]+)\?(\/|$)/g, "(/$1)?$2");
  if (path.endsWith("*")) {
    params.push({ paramName: "*" });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else
    ;
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v2) => decodeURIComponent(v2).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(
      false,
      `The URL path "${value}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${error}).`
    );
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/")
    return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
function resolvePath(to, fromPathname = "/") {
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to === "string" ? parsePath(to) : to;
  let pathname = toPathname ? toPathname.startsWith("/") ? toPathname : resolvePathname(toPathname, fromPathname) : fromPathname;
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = fromPathname.replace(/\/+$/, "").split("/");
  let relativeSegments = relativePath.split("/");
  relativeSegments.forEach((segment) => {
    if (segment === "..") {
      if (segments.length > 1)
        segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });
  return segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return `Cannot include a '${char}' character in a manually specified \`to.${field}\` field [${JSON.stringify(
    path
  )}].  Please separate it out to the \`to.${dest}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function getPathContributingMatches(matches) {
  return matches.filter(
    (match, index2) => index2 === 0 || match.route.path && match.route.path.length > 0
  );
}
function getResolveToMatches(matches) {
  let pathMatches = getPathContributingMatches(matches);
  return pathMatches.map(
    (match, idx) => idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase
  );
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative = false) {
  let to;
  if (typeof toArg === "string") {
    to = parsePath(toArg);
  } else {
    to = { ...toArg };
    invariant(
      !to.pathname || !to.pathname.includes("?"),
      getInvalidPathError("?", "pathname", "search", to)
    );
    invariant(
      !to.pathname || !to.pathname.includes("#"),
      getInvalidPathError("#", "pathname", "hash", to)
    );
    invariant(
      !to.search || !to.search.includes("#"),
      getInvalidPathError("#", "search", "hash", to)
    );
  }
  let isEmptyPath = toArg === "" || to.pathname === "";
  let toPathname = isEmptyPath ? "/" : to.pathname;
  let from;
  if (toPathname == null) {
    from = locationPathname;
  } else {
    let routePathnameIndex = routePathnames.length - 1;
    if (!isPathRelative && toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      while (toSegments[0] === "..") {
        toSegments.shift();
        routePathnameIndex -= 1;
      }
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from);
  let hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/");
  let hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  if (!path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash)) {
    path.pathname += "/";
  }
  return path;
}
var joinPaths = (paths) => paths.join("/").replace(/\/\/+/g, "/");
var normalizePathname = (pathname) => pathname.replace(/\/+$/, "").replace(/^\/*/, "/");
var normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search;
var normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
var validMutationMethodsArr = [
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
];
new Set(
  validMutationMethodsArr
);
var validRequestMethodsArr = [
  "GET",
  ...validMutationMethodsArr
];
new Set(validRequestMethodsArr);
var DataRouterContext = reactExports.createContext(null);
DataRouterContext.displayName = "DataRouter";
var DataRouterStateContext = reactExports.createContext(null);
DataRouterStateContext.displayName = "DataRouterState";
reactExports.createContext(false);
var ViewTransitionContext = reactExports.createContext({
  isTransitioning: false
});
ViewTransitionContext.displayName = "ViewTransition";
var FetchersContext = reactExports.createContext(
  /* @__PURE__ */ new Map()
);
FetchersContext.displayName = "Fetchers";
var AwaitContext = reactExports.createContext(null);
AwaitContext.displayName = "Await";
var NavigationContext = reactExports.createContext(
  null
);
NavigationContext.displayName = "Navigation";
var LocationContext = reactExports.createContext(
  null
);
LocationContext.displayName = "Location";
var RouteContext = reactExports.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
RouteContext.displayName = "Route";
var RouteErrorContext = reactExports.createContext(null);
RouteErrorContext.displayName = "RouteError";
function useHref(to, { relative } = {}) {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useHref() may be used only in the context of a <Router> component.`
  );
  let { basename, navigator: navigator2 } = reactExports.useContext(NavigationContext);
  let { hash, pathname, search } = useResolvedPath(to, { relative });
  let joinedPathname = pathname;
  if (basename !== "/") {
    joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname]);
  }
  return navigator2.createHref({ pathname: joinedPathname, search, hash });
}
function useInRouterContext() {
  return reactExports.useContext(LocationContext) != null;
}
function useLocation() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useLocation() may be used only in the context of a <Router> component.`
  );
  return reactExports.useContext(LocationContext).location;
}
var navigateEffectWarning = `You should call navigate() in a React.useEffect(), not when your component is first rendered.`;
function useIsomorphicLayoutEffect(cb2) {
  let isStatic = reactExports.useContext(NavigationContext).static;
  if (!isStatic) {
    reactExports.useLayoutEffect(cb2);
  }
}
function useNavigate() {
  let { isDataRoute } = reactExports.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useNavigate() may be used only in the context of a <Router> component.`
  );
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  let { basename, navigator: navigator2 } = reactExports.useContext(NavigationContext);
  let { matches } = reactExports.useContext(RouteContext);
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(
    (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning);
      if (!activeRef.current)
        return;
      if (typeof to === "number") {
        navigator2.go(to);
        return;
      }
      let path = resolveTo(
        to,
        JSON.parse(routePathnamesJson),
        locationPathname,
        options.relative === "path"
      );
      if (dataRouterContext == null && basename !== "/") {
        path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
      }
      (!!options.replace ? navigator2.replace : navigator2.push)(
        path,
        options.state,
        options
      );
    },
    [
      basename,
      navigator2,
      routePathnamesJson,
      locationPathname,
      dataRouterContext
    ]
  );
  return navigate;
}
reactExports.createContext(null);
function useResolvedPath(to, { relative } = {}) {
  let { matches } = reactExports.useContext(RouteContext);
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));
  return reactExports.useMemo(
    () => resolveTo(
      to,
      JSON.parse(routePathnamesJson),
      locationPathname,
      relative === "path"
    ),
    [to, routePathnamesJson, locationPathname, relative]
  );
}
function useRoutesImpl(routes, locationArg, dataRouterState, unstable_onError, future) {
  var _a2;
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useRoutes() may be used only in the context of a <Router> component.`
  );
  let { navigator: navigator2 } = reactExports.useContext(NavigationContext);
  let { matches: parentMatches } = reactExports.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  let parentPathname = routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  let parentRoute = routeMatch && routeMatch.route;
  {
    let parentPath = parentRoute && parentRoute.path || "";
    warningOnce(
      parentPathname,
      !parentRoute || parentPath.endsWith("*") || parentPath.endsWith("*?"),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${parentPathname}" (under <Route path="${parentPath}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${parentPath}"> to <Route path="${parentPath === "/" ? "*" : `${parentPath}/*`}">.`
    );
  }
  let locationFromContext = useLocation();
  let location;
  if (locationArg) {
    let parsedLocationArg = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
    invariant(
      parentPathnameBase === "/" || ((_a2 = parsedLocationArg.pathname) == null ? void 0 : _a2.startsWith(parentPathnameBase)),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${parentPathnameBase}" but pathname "${parsedLocationArg.pathname}" was given in the \`location\` prop.`
    );
    location = parsedLocationArg;
  } else {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, { pathname: remainingPathname });
  {
    warning(
      parentRoute || matches != null,
      `No routes matched location "${location.pathname}${location.search}${location.hash}" `
    );
    warning(
      matches == null || matches[matches.length - 1].route.element !== void 0 || matches[matches.length - 1].route.Component !== void 0 || matches[matches.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${location.pathname}${location.search}${location.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`
    );
  }
  let renderedMatches = _renderMatches(
    matches && matches.map(
      (match) => Object.assign({}, match, {
        params: Object.assign({}, parentParams, match.params),
        pathname: joinPaths([
          parentPathnameBase,
          // Re-encode pathnames that were decoded inside matchRoutes
          navigator2.encodeLocation ? navigator2.encodeLocation(match.pathname).pathname : match.pathname
        ]),
        pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
          parentPathnameBase,
          // Re-encode pathnames that were decoded inside matchRoutes
          navigator2.encodeLocation ? navigator2.encodeLocation(match.pathnameBase).pathname : match.pathnameBase
        ])
      })
    ),
    parentMatches,
    dataRouterState,
    unstable_onError,
    future
  );
  if (locationArg && renderedMatches) {
    return /* @__PURE__ */ reactExports.createElement(
      LocationContext.Provider,
      {
        value: {
          location: {
            pathname: "/",
            search: "",
            hash: "",
            state: null,
            key: "default",
            ...location
          },
          navigationType: "POP"
          /* Pop */
        }
      },
      renderedMatches
    );
  }
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = { padding: "0.5rem", backgroundColor: lightgrey };
  let codeStyles = { padding: "2px 4px", backgroundColor: lightgrey };
  let devInfo = null;
  {
    console.error(
      "Error handled by React Router default ErrorBoundary:",
      error
    );
    devInfo = /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("p", null, "💿 Hey developer 👋"), /* @__PURE__ */ reactExports.createElement("p", null, "You can provide a way better UX than this when your app throws errors by providing your own ", /* @__PURE__ */ reactExports.createElement("code", { style: codeStyles }, "ErrorBoundary"), " or", " ", /* @__PURE__ */ reactExports.createElement("code", { style: codeStyles }, "errorElement"), " prop on your route."));
  }
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ reactExports.createElement("h3", { style: { fontStyle: "italic" } }, message), stack ? /* @__PURE__ */ reactExports.createElement("pre", { style: preStyles }, stack) : null, devInfo);
}
var defaultErrorElement = /* @__PURE__ */ reactExports.createElement(DefaultErrorComponent, null);
var RenderErrorBoundary = class extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    if (this.props.unstable_onError) {
      this.props.unstable_onError(error, errorInfo);
    } else {
      console.error(
        "React Router caught the following error during render",
        error
      );
    }
  }
  render() {
    return this.state.error !== void 0 ? /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, { value: this.props.routeContext }, /* @__PURE__ */ reactExports.createElement(
      RouteErrorContext.Provider,
      {
        value: this.state.error,
        children: this.props.component
      }
    )) : this.props.children;
  }
};
function RenderedRoute({ routeContext, match, children }) {
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, { value: routeContext }, children);
}
function _renderMatches(matches, parentMatches = [], dataRouterState = null, unstable_onError = null, future = null) {
  if (matches == null) {
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if (parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = dataRouterState == null ? void 0 : dataRouterState.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex(
      (m2) => m2.route.id && (errors == null ? void 0 : errors[m2.route.id]) !== void 0
    );
    invariant(
      errorIndex >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(
        errors
      ).join(",")}`
    );
    renderedMatches = renderedMatches.slice(
      0,
      Math.min(renderedMatches.length, errorIndex + 1)
    );
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState) {
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }
      if (match.route.id) {
        let { loaderData, errors: errors2 } = dataRouterState;
        let needsToRunLoader = match.route.loader && !loaderData.hasOwnProperty(match.route.id) && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  return renderedMatches.reduceRight(
    (outlet, match, index2) => {
      let error;
      let shouldRenderHydrateFallback = false;
      let errorElement = null;
      let hydrateFallbackElement = null;
      if (dataRouterState) {
        error = errors && match.route.id ? errors[match.route.id] : void 0;
        errorElement = match.route.errorElement || defaultErrorElement;
        if (renderFallback) {
          if (fallbackIndex < 0 && index2 === 0) {
            warningOnce(
              "route-fallback",
              false,
              "No `HydrateFallback` element provided to render during initial hydration"
            );
            shouldRenderHydrateFallback = true;
            hydrateFallbackElement = null;
          } else if (fallbackIndex === index2) {
            shouldRenderHydrateFallback = true;
            hydrateFallbackElement = match.route.hydrateFallbackElement || null;
          }
        }
      }
      let matches2 = parentMatches.concat(renderedMatches.slice(0, index2 + 1));
      let getChildren = () => {
        let children;
        if (error) {
          children = errorElement;
        } else if (shouldRenderHydrateFallback) {
          children = hydrateFallbackElement;
        } else if (match.route.Component) {
          children = /* @__PURE__ */ reactExports.createElement(match.route.Component, null);
        } else if (match.route.element) {
          children = match.route.element;
        } else {
          children = outlet;
        }
        return /* @__PURE__ */ reactExports.createElement(
          RenderedRoute,
          {
            match,
            routeContext: {
              outlet,
              matches: matches2,
              isDataRoute: dataRouterState != null
            },
            children
          }
        );
      };
      return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index2 === 0) ? /* @__PURE__ */ reactExports.createElement(
        RenderErrorBoundary,
        {
          location: dataRouterState.location,
          revalidation: dataRouterState.revalidation,
          component: errorElement,
          error,
          children: getChildren(),
          routeContext: { outlet: null, matches: matches2, isDataRoute: true },
          unstable_onError
        }
      ) : getChildren();
    },
    null
  );
}
function getDataRouterConsoleError(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function useDataRouterContext(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  invariant(ctx, getDataRouterConsoleError(hookName));
  return ctx;
}
function useDataRouterState(hookName) {
  let state = reactExports.useContext(DataRouterStateContext);
  invariant(state, getDataRouterConsoleError(hookName));
  return state;
}
function useRouteContext(hookName) {
  let route = reactExports.useContext(RouteContext);
  invariant(route, getDataRouterConsoleError(hookName));
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext(hookName);
  let thisRoute = route.matches[route.matches.length - 1];
  invariant(
    thisRoute.route.id,
    `${hookName} can only be used on routes that contain a unique "id"`
  );
  return thisRoute.route.id;
}
function useRouteId() {
  return useCurrentRouteId(
    "useRouteId"
    /* UseRouteId */
  );
}
function useRouteError() {
  var _a2;
  let error = reactExports.useContext(RouteErrorContext);
  let state = useDataRouterState(
    "useRouteError"
    /* UseRouteError */
  );
  let routeId = useCurrentRouteId(
    "useRouteError"
    /* UseRouteError */
  );
  if (error !== void 0) {
    return error;
  }
  return (_a2 = state.errors) == null ? void 0 : _a2[routeId];
}
function useNavigateStable() {
  let { router } = useDataRouterContext(
    "useNavigate"
    /* UseNavigateStable */
  );
  let id2 = useCurrentRouteId(
    "useNavigate"
    /* UseNavigateStable */
  );
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(
    async (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning);
      if (!activeRef.current)
        return;
      if (typeof to === "number") {
        router.navigate(to);
      } else {
        await router.navigate(to, { fromRouteId: id2, ...options });
      }
    },
    [router, id2]
  );
  return navigate;
}
var alreadyWarned = {};
function warningOnce(key, cond, message) {
  if (!cond && !alreadyWarned[key]) {
    alreadyWarned[key] = true;
    warning(false, message);
  }
}
reactExports.memo(DataRoutes);
function DataRoutes({
  routes,
  future,
  state,
  unstable_onError
}) {
  return useRoutesImpl(routes, void 0, state, unstable_onError, future);
}
function Router({
  basename: basenameProp = "/",
  children = null,
  location: locationProp,
  navigationType = "POP",
  navigator: navigator2,
  static: staticProp = false
}) {
  invariant(
    !useInRouterContext(),
    `You cannot render a <Router> inside another <Router>. You should never have more than one in your app.`
  );
  let basename = basenameProp.replace(/^\/*/, "/");
  let navigationContext = reactExports.useMemo(
    () => ({
      basename,
      navigator: navigator2,
      static: staticProp,
      future: {}
    }),
    [basename, navigator2, staticProp]
  );
  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default"
  } = locationProp;
  let locationContext = reactExports.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    if (trailingPathname == null) {
      return null;
    }
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key
      },
      navigationType
    };
  }, [basename, pathname, search, hash, state, key, navigationType]);
  warning(
    locationContext != null,
    `<Router basename="${basename}"> is not able to match the URL "${pathname}${search}${hash}" because it does not start with the basename, so the <Router> won't render anything.`
  );
  if (locationContext == null) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(NavigationContext.Provider, { value: navigationContext }, /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, { children, value: locationContext }));
}
var defaultMethod = "get";
var defaultEncType = "application/x-www-form-urlencoded";
function isHtmlElement(object) {
  return object != null && typeof object.tagName === "string";
}
function isButtonElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "button";
}
function isFormElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "form";
}
function isInputElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "input";
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && // Ignore everything but left clicks
  (!target || target === "_self") && // Let browser handle "target=_blank" etc.
  !isModifiedEvent(event);
}
function createSearchParams(init = "") {
  return new URLSearchParams(
    typeof init === "string" || Array.isArray(init) || init instanceof URLSearchParams ? init : Object.keys(init).reduce((memo2, key) => {
      let value = init[key];
      return memo2.concat(
        Array.isArray(value) ? value.map((v2) => [key, v2]) : [[key, value]]
      );
    }, [])
  );
}
function getSearchParamsForLocation(locationSearch, defaultSearchParams) {
  let searchParams = createSearchParams(locationSearch);
  if (defaultSearchParams) {
    defaultSearchParams.forEach((_, key) => {
      if (!searchParams.has(key)) {
        defaultSearchParams.getAll(key).forEach((value) => {
          searchParams.append(key, value);
        });
      }
    });
  }
  return searchParams;
}
var _formDataSupportsSubmitter = null;
function isFormDataSubmitterSupported() {
  if (_formDataSupportsSubmitter === null) {
    try {
      new FormData(
        document.createElement("form"),
        // @ts-expect-error if FormData supports the submitter parameter, this will throw
        0
      );
      _formDataSupportsSubmitter = false;
    } catch (e) {
      _formDataSupportsSubmitter = true;
    }
  }
  return _formDataSupportsSubmitter;
}
var supportedFormEncTypes = /* @__PURE__ */ new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain"
]);
function getFormEncType(encType) {
  if (encType != null && !supportedFormEncTypes.has(encType)) {
    warning(
      false,
      `"${encType}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${defaultEncType}"`
    );
    return null;
  }
  return encType;
}
function getFormSubmissionInfo(target, basename) {
  let method;
  let action;
  let encType;
  let formData;
  let body;
  if (isFormElement(target)) {
    let attr = target.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null;
    method = target.getAttribute("method") || defaultMethod;
    encType = getFormEncType(target.getAttribute("enctype")) || defaultEncType;
    formData = new FormData(target);
  } else if (isButtonElement(target) || isInputElement(target) && (target.type === "submit" || target.type === "image")) {
    let form = target.form;
    if (form == null) {
      throw new Error(
        `Cannot submit a <button> or <input type="submit"> without a <form>`
      );
    }
    let attr = target.getAttribute("formaction") || form.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null;
    method = target.getAttribute("formmethod") || form.getAttribute("method") || defaultMethod;
    encType = getFormEncType(target.getAttribute("formenctype")) || getFormEncType(form.getAttribute("enctype")) || defaultEncType;
    formData = new FormData(form, target);
    if (!isFormDataSubmitterSupported()) {
      let { name, type, value } = target;
      if (type === "image") {
        let prefix = name ? `${name}.` : "";
        formData.append(`${prefix}x`, "0");
        formData.append(`${prefix}y`, "0");
      } else if (name) {
        formData.append(name, value);
      }
    }
  } else if (isHtmlElement(target)) {
    throw new Error(
      `Cannot submit element that is not <form>, <button>, or <input type="submit|image">`
    );
  } else {
    method = defaultMethod;
    action = null;
    encType = defaultEncType;
    body = target;
  }
  if (formData && encType === "text/plain") {
    body = formData;
    formData = void 0;
  }
  return { action, method: method.toLowerCase(), encType, formData, body };
}
Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function invariant2(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function singleFetchUrl(reqUrl, basename, extension) {
  let url = typeof reqUrl === "string" ? new URL(
    reqUrl,
    // This can be called during the SSR flow via PrefetchPageLinksImpl so
    // don't assume window is available
    typeof window === "undefined" ? "server://singlefetch/" : window.location.origin
  ) : reqUrl;
  if (url.pathname === "/") {
    url.pathname = `_root.${extension}`;
  } else if (basename && stripBasename(url.pathname, basename) === "/") {
    url.pathname = `${basename.replace(/\/$/, "")}/_root.${extension}`;
  } else {
    url.pathname = `${url.pathname.replace(/\/$/, "")}.${extension}`;
  }
  return url;
}
async function loadRouteModule(route, routeModulesCache) {
  if (route.id in routeModulesCache) {
    return routeModulesCache[route.id];
  }
  try {
    let routeModule = await __vitePreload(() => import(
      /* @vite-ignore */
      /* webpackIgnore: true */
      route.module
    ), true ? [] : void 0);
    routeModulesCache[route.id] = routeModule;
    return routeModule;
  } catch (error) {
    console.error(
      `Error loading route module \`${route.module}\`, reloading page...`
    );
    console.error(error);
    if (window.__reactRouterContext && window.__reactRouterContext.isSpaMode && // @ts-expect-error
    void 0) {
      throw error;
    }
    window.location.reload();
    return new Promise(() => {
    });
  }
}
function isPageLinkDescriptor(object) {
  return object != null && typeof object.page === "string";
}
function isHtmlLinkDescriptor(object) {
  if (object == null) {
    return false;
  }
  if (object.href == null) {
    return object.rel === "preload" && typeof object.imageSrcSet === "string" && typeof object.imageSizes === "string";
  }
  return typeof object.rel === "string" && typeof object.href === "string";
}
async function getKeyedPrefetchLinks(matches, manifest, routeModules) {
  let links = await Promise.all(
    matches.map(async (match) => {
      let route = manifest.routes[match.route.id];
      if (route) {
        let mod = await loadRouteModule(route, routeModules);
        return mod.links ? mod.links() : [];
      }
      return [];
    })
  );
  return dedupeLinkDescriptors(
    links.flat(1).filter(isHtmlLinkDescriptor).filter((link) => link.rel === "stylesheet" || link.rel === "preload").map(
      (link) => link.rel === "stylesheet" ? { ...link, rel: "prefetch", as: "style" } : { ...link, rel: "prefetch" }
    )
  );
}
function getNewMatchesForLinks(page, nextMatches, currentMatches, manifest, location, mode) {
  let isNew = (match, index2) => {
    if (!currentMatches[index2])
      return true;
    return match.route.id !== currentMatches[index2].route.id;
  };
  let matchPathChanged = (match, index2) => {
    var _a2;
    return (
      // param change, /users/123 -> /users/456
      currentMatches[index2].pathname !== match.pathname || // splat param changed, which is not present in match.path
      // e.g. /files/images/avatar.jpg -> files/finances.xls
      ((_a2 = currentMatches[index2].route.path) == null ? void 0 : _a2.endsWith("*")) && currentMatches[index2].params["*"] !== match.params["*"]
    );
  };
  if (mode === "assets") {
    return nextMatches.filter(
      (match, index2) => isNew(match, index2) || matchPathChanged(match, index2)
    );
  }
  if (mode === "data") {
    return nextMatches.filter((match, index2) => {
      var _a2;
      let manifestRoute = manifest.routes[match.route.id];
      if (!manifestRoute || !manifestRoute.hasLoader) {
        return false;
      }
      if (isNew(match, index2) || matchPathChanged(match, index2)) {
        return true;
      }
      if (match.route.shouldRevalidate) {
        let routeChoice = match.route.shouldRevalidate({
          currentUrl: new URL(
            location.pathname + location.search + location.hash,
            window.origin
          ),
          currentParams: ((_a2 = currentMatches[0]) == null ? void 0 : _a2.params) || {},
          nextUrl: new URL(page, window.origin),
          nextParams: match.params,
          defaultShouldRevalidate: true
        });
        if (typeof routeChoice === "boolean") {
          return routeChoice;
        }
      }
      return true;
    });
  }
  return [];
}
function getModuleLinkHrefs(matches, manifest, { includeHydrateFallback } = {}) {
  return dedupeHrefs(
    matches.map((match) => {
      let route = manifest.routes[match.route.id];
      if (!route)
        return [];
      let hrefs = [route.module];
      if (route.clientActionModule) {
        hrefs = hrefs.concat(route.clientActionModule);
      }
      if (route.clientLoaderModule) {
        hrefs = hrefs.concat(route.clientLoaderModule);
      }
      if (includeHydrateFallback && route.hydrateFallbackModule) {
        hrefs = hrefs.concat(route.hydrateFallbackModule);
      }
      if (route.imports) {
        hrefs = hrefs.concat(route.imports);
      }
      return hrefs;
    }).flat(1)
  );
}
function dedupeHrefs(hrefs) {
  return [...new Set(hrefs)];
}
function sortKeys(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}
function dedupeLinkDescriptors(descriptors, preloads) {
  let set = /* @__PURE__ */ new Set();
  let preloadsSet = new Set(preloads);
  return descriptors.reduce((deduped, descriptor) => {
    let alreadyModulePreload = preloads && !isPageLinkDescriptor(descriptor) && descriptor.as === "script" && descriptor.href && preloadsSet.has(descriptor.href);
    if (alreadyModulePreload) {
      return deduped;
    }
    let key = JSON.stringify(sortKeys(descriptor));
    if (!set.has(key)) {
      set.add(key);
      deduped.push({ key, link: descriptor });
    }
    return deduped;
  }, []);
}
function useDataRouterContext2() {
  let context = reactExports.useContext(DataRouterContext);
  invariant2(
    context,
    "You must render this element inside a <DataRouterContext.Provider> element"
  );
  return context;
}
function useDataRouterStateContext() {
  let context = reactExports.useContext(DataRouterStateContext);
  invariant2(
    context,
    "You must render this element inside a <DataRouterStateContext.Provider> element"
  );
  return context;
}
var FrameworkContext = reactExports.createContext(void 0);
FrameworkContext.displayName = "FrameworkContext";
function useFrameworkContext() {
  let context = reactExports.useContext(FrameworkContext);
  invariant2(
    context,
    "You must render this element inside a <HydratedRouter> element"
  );
  return context;
}
function usePrefetchBehavior(prefetch, theirElementProps) {
  let frameworkContext = reactExports.useContext(FrameworkContext);
  let [maybePrefetch, setMaybePrefetch] = reactExports.useState(false);
  let [shouldPrefetch, setShouldPrefetch] = reactExports.useState(false);
  let { onFocus, onBlur, onMouseEnter, onMouseLeave, onTouchStart } = theirElementProps;
  let ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (prefetch === "render") {
      setShouldPrefetch(true);
    }
    if (prefetch === "viewport") {
      let callback = (entries) => {
        entries.forEach((entry) => {
          setShouldPrefetch(entry.isIntersecting);
        });
      };
      let observer = new IntersectionObserver(callback, { threshold: 0.5 });
      if (ref.current)
        observer.observe(ref.current);
      return () => {
        observer.disconnect();
      };
    }
  }, [prefetch]);
  reactExports.useEffect(() => {
    if (maybePrefetch) {
      let id2 = setTimeout(() => {
        setShouldPrefetch(true);
      }, 100);
      return () => {
        clearTimeout(id2);
      };
    }
  }, [maybePrefetch]);
  let setIntent = () => {
    setMaybePrefetch(true);
  };
  let cancelIntent = () => {
    setMaybePrefetch(false);
    setShouldPrefetch(false);
  };
  if (!frameworkContext) {
    return [false, ref, {}];
  }
  if (prefetch !== "intent") {
    return [shouldPrefetch, ref, {}];
  }
  return [
    shouldPrefetch,
    ref,
    {
      onFocus: composeEventHandlers(onFocus, setIntent),
      onBlur: composeEventHandlers(onBlur, cancelIntent),
      onMouseEnter: composeEventHandlers(onMouseEnter, setIntent),
      onMouseLeave: composeEventHandlers(onMouseLeave, cancelIntent),
      onTouchStart: composeEventHandlers(onTouchStart, setIntent)
    }
  ];
}
function composeEventHandlers(theirHandler, ourHandler) {
  return (event) => {
    theirHandler && theirHandler(event);
    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}
function PrefetchPageLinks({ page, ...linkProps }) {
  let { router } = useDataRouterContext2();
  let matches = reactExports.useMemo(
    () => matchRoutes(router.routes, page, router.basename),
    [router.routes, page, router.basename]
  );
  if (!matches) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(PrefetchPageLinksImpl, { page, matches, ...linkProps });
}
function useKeyedPrefetchLinks(matches) {
  let { manifest, routeModules } = useFrameworkContext();
  let [keyedPrefetchLinks, setKeyedPrefetchLinks] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let interrupted = false;
    void getKeyedPrefetchLinks(matches, manifest, routeModules).then(
      (links) => {
        if (!interrupted) {
          setKeyedPrefetchLinks(links);
        }
      }
    );
    return () => {
      interrupted = true;
    };
  }, [matches, manifest, routeModules]);
  return keyedPrefetchLinks;
}
function PrefetchPageLinksImpl({
  page,
  matches: nextMatches,
  ...linkProps
}) {
  let location = useLocation();
  let { manifest, routeModules } = useFrameworkContext();
  let { basename } = useDataRouterContext2();
  let { loaderData, matches } = useDataRouterStateContext();
  let newMatchesForData = reactExports.useMemo(
    () => getNewMatchesForLinks(
      page,
      nextMatches,
      matches,
      manifest,
      location,
      "data"
    ),
    [page, nextMatches, matches, manifest, location]
  );
  let newMatchesForAssets = reactExports.useMemo(
    () => getNewMatchesForLinks(
      page,
      nextMatches,
      matches,
      manifest,
      location,
      "assets"
    ),
    [page, nextMatches, matches, manifest, location]
  );
  let dataHrefs = reactExports.useMemo(() => {
    if (page === location.pathname + location.search + location.hash) {
      return [];
    }
    let routesParams = /* @__PURE__ */ new Set();
    let foundOptOutRoute = false;
    nextMatches.forEach((m2) => {
      var _a2;
      let manifestRoute = manifest.routes[m2.route.id];
      if (!manifestRoute || !manifestRoute.hasLoader) {
        return;
      }
      if (!newMatchesForData.some((m22) => m22.route.id === m2.route.id) && m2.route.id in loaderData && ((_a2 = routeModules[m2.route.id]) == null ? void 0 : _a2.shouldRevalidate)) {
        foundOptOutRoute = true;
      } else if (manifestRoute.hasClientLoader) {
        foundOptOutRoute = true;
      } else {
        routesParams.add(m2.route.id);
      }
    });
    if (routesParams.size === 0) {
      return [];
    }
    let url = singleFetchUrl(page, basename, "data");
    if (foundOptOutRoute && routesParams.size > 0) {
      url.searchParams.set(
        "_routes",
        nextMatches.filter((m2) => routesParams.has(m2.route.id)).map((m2) => m2.route.id).join(",")
      );
    }
    return [url.pathname + url.search];
  }, [
    basename,
    loaderData,
    location,
    manifest,
    newMatchesForData,
    nextMatches,
    page,
    routeModules
  ]);
  let moduleHrefs = reactExports.useMemo(
    () => getModuleLinkHrefs(newMatchesForAssets, manifest),
    [newMatchesForAssets, manifest]
  );
  let keyedPrefetchLinks = useKeyedPrefetchLinks(newMatchesForAssets);
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, dataHrefs.map((href) => /* @__PURE__ */ reactExports.createElement("link", { key: href, rel: "prefetch", as: "fetch", href, ...linkProps })), moduleHrefs.map((href) => /* @__PURE__ */ reactExports.createElement("link", { key: href, rel: "modulepreload", href, ...linkProps })), keyedPrefetchLinks.map(({ key, link }) => (
    // these don't spread `linkProps` because they are full link descriptors
    // already with their own props
    /* @__PURE__ */ reactExports.createElement("link", { key, nonce: linkProps.nonce, ...link })
  )));
}
function mergeRefs(...refs) {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        ref.current = value;
      }
    });
  };
}
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
try {
  if (isBrowser) {
    window.__reactRouterVersion = // @ts-expect-error
    "7.9.1";
  }
} catch (e) {
}
function BrowserRouter({
  basename,
  children,
  window: window2
}) {
  let historyRef = reactExports.useRef();
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory({ window: window2, v5Compat: true });
  }
  let history = historyRef.current;
  let [state, setStateImpl] = reactExports.useState({
    action: history.action,
    location: history.location
  });
  let setState = reactExports.useCallback(
    (newState) => {
      reactExports.startTransition(() => setStateImpl(newState));
    },
    [setStateImpl]
  );
  reactExports.useLayoutEffect(() => history.listen(setState), [history, setState]);
  return /* @__PURE__ */ reactExports.createElement(
    Router,
    {
      basename,
      children,
      location: state.location,
      navigationType: state.action,
      navigator: history
    }
  );
}
var ABSOLUTE_URL_REGEX2 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
var Link = reactExports.forwardRef(
  function LinkWithRef({
    onClick,
    discover = "render",
    prefetch = "none",
    relative,
    reloadDocument,
    replace: replace2,
    state,
    target,
    to,
    preventScrollReset,
    viewTransition,
    ...rest
  }, forwardedRef) {
    let { basename } = reactExports.useContext(NavigationContext);
    let isAbsolute = typeof to === "string" && ABSOLUTE_URL_REGEX2.test(to);
    let absoluteHref;
    let isExternal = false;
    if (typeof to === "string" && isAbsolute) {
      absoluteHref = to;
      if (isBrowser) {
        try {
          let currentUrl = new URL(window.location.href);
          let targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to);
          let path = stripBasename(targetUrl.pathname, basename);
          if (targetUrl.origin === currentUrl.origin && path != null) {
            to = path + targetUrl.search + targetUrl.hash;
          } else {
            isExternal = true;
          }
        } catch (e) {
          warning(
            false,
            `<Link to="${to}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`
          );
        }
      }
    }
    let href = useHref(to, { relative });
    let [shouldPrefetch, prefetchRef, prefetchHandlers] = usePrefetchBehavior(
      prefetch,
      rest
    );
    let internalOnClick = useLinkClickHandler(to, {
      replace: replace2,
      state,
      target,
      preventScrollReset,
      relative,
      viewTransition
    });
    function handleClick(event) {
      if (onClick)
        onClick(event);
      if (!event.defaultPrevented) {
        internalOnClick(event);
      }
    }
    let link = (
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      /* @__PURE__ */ reactExports.createElement(
        "a",
        {
          ...rest,
          ...prefetchHandlers,
          href: absoluteHref || href,
          onClick: isExternal || reloadDocument ? onClick : handleClick,
          ref: mergeRefs(forwardedRef, prefetchRef),
          target,
          "data-discover": !isAbsolute && discover === "render" ? "true" : void 0
        }
      )
    );
    return shouldPrefetch && !isAbsolute ? /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, link, /* @__PURE__ */ reactExports.createElement(PrefetchPageLinks, { page: href })) : link;
  }
);
Link.displayName = "Link";
var NavLink = reactExports.forwardRef(
  function NavLinkWithRef({
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = false,
    className: classNameProp = "",
    end = false,
    style: styleProp,
    to,
    viewTransition,
    children,
    ...rest
  }, ref) {
    let path = useResolvedPath(to, { relative: rest.relative });
    let location = useLocation();
    let routerState = reactExports.useContext(DataRouterStateContext);
    let { navigator: navigator2, basename } = reactExports.useContext(NavigationContext);
    let isTransitioning = routerState != null && // Conditional usage is OK here because the usage of a data router is static
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useViewTransitionState(path) && viewTransition === true;
    let toPathname = navigator2.encodeLocation ? navigator2.encodeLocation(path).pathname : path.pathname;
    let locationPathname = location.pathname;
    let nextLocationPathname = routerState && routerState.navigation && routerState.navigation.location ? routerState.navigation.location.pathname : null;
    if (!caseSensitive) {
      locationPathname = locationPathname.toLowerCase();
      nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null;
      toPathname = toPathname.toLowerCase();
    }
    if (nextLocationPathname && basename) {
      nextLocationPathname = stripBasename(nextLocationPathname, basename) || nextLocationPathname;
    }
    const endSlashPosition = toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
    let isActive = locationPathname === toPathname || !end && locationPathname.startsWith(toPathname) && locationPathname.charAt(endSlashPosition) === "/";
    let isPending = nextLocationPathname != null && (nextLocationPathname === toPathname || !end && nextLocationPathname.startsWith(toPathname) && nextLocationPathname.charAt(toPathname.length) === "/");
    let renderProps = {
      isActive,
      isPending,
      isTransitioning
    };
    let ariaCurrent = isActive ? ariaCurrentProp : void 0;
    let className;
    if (typeof classNameProp === "function") {
      className = classNameProp(renderProps);
    } else {
      className = [
        classNameProp,
        isActive ? "active" : null,
        isPending ? "pending" : null,
        isTransitioning ? "transitioning" : null
      ].filter(Boolean).join(" ");
    }
    let style = typeof styleProp === "function" ? styleProp(renderProps) : styleProp;
    return /* @__PURE__ */ reactExports.createElement(
      Link,
      {
        ...rest,
        "aria-current": ariaCurrent,
        className,
        ref,
        style,
        to,
        viewTransition
      },
      typeof children === "function" ? children(renderProps) : children
    );
  }
);
NavLink.displayName = "NavLink";
var Form = reactExports.forwardRef(
  ({
    discover = "render",
    fetcherKey,
    navigate,
    reloadDocument,
    replace: replace2,
    state,
    method = defaultMethod,
    action,
    onSubmit,
    relative,
    preventScrollReset,
    viewTransition,
    ...props
  }, forwardedRef) => {
    let submit = useSubmit();
    let formAction = useFormAction(action, { relative });
    let formMethod = method.toLowerCase() === "get" ? "get" : "post";
    let isAbsolute = typeof action === "string" && ABSOLUTE_URL_REGEX2.test(action);
    let submitHandler = (event) => {
      onSubmit && onSubmit(event);
      if (event.defaultPrevented)
        return;
      event.preventDefault();
      let submitter = event.nativeEvent.submitter;
      let submitMethod = (submitter == null ? void 0 : submitter.getAttribute("formmethod")) || method;
      submit(submitter || event.currentTarget, {
        fetcherKey,
        method: submitMethod,
        navigate,
        replace: replace2,
        state,
        relative,
        preventScrollReset,
        viewTransition
      });
    };
    return /* @__PURE__ */ reactExports.createElement(
      "form",
      {
        ref: forwardedRef,
        method: formMethod,
        action: formAction,
        onSubmit: reloadDocument ? onSubmit : submitHandler,
        ...props,
        "data-discover": !isAbsolute && discover === "render" ? "true" : void 0
      }
    );
  }
);
Form.displayName = "Form";
function getDataRouterConsoleError2(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function useDataRouterContext3(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  invariant(ctx, getDataRouterConsoleError2(hookName));
  return ctx;
}
function useLinkClickHandler(to, {
  target,
  replace: replaceProp,
  state,
  preventScrollReset,
  relative,
  viewTransition
} = {}) {
  let navigate = useNavigate();
  let location = useLocation();
  let path = useResolvedPath(to, { relative });
  return reactExports.useCallback(
    (event) => {
      if (shouldProcessLinkClick(event, target)) {
        event.preventDefault();
        let replace2 = replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path);
        navigate(to, {
          replace: replace2,
          state,
          preventScrollReset,
          relative,
          viewTransition
        });
      }
    },
    [
      location,
      navigate,
      path,
      replaceProp,
      state,
      target,
      to,
      preventScrollReset,
      relative,
      viewTransition
    ]
  );
}
function useSearchParams(defaultInit) {
  warning(
    typeof URLSearchParams !== "undefined",
    `You cannot use the \`useSearchParams\` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.`
  );
  let defaultSearchParamsRef = reactExports.useRef(createSearchParams(defaultInit));
  let hasSetSearchParamsRef = reactExports.useRef(false);
  let location = useLocation();
  let searchParams = reactExports.useMemo(
    () => (
      // Only merge in the defaults if we haven't yet called setSearchParams.
      // Once we call that we want those to take precedence, otherwise you can't
      // remove a param with setSearchParams({}) if it has an initial value
      getSearchParamsForLocation(
        location.search,
        hasSetSearchParamsRef.current ? null : defaultSearchParamsRef.current
      )
    ),
    [location.search]
  );
  let navigate = useNavigate();
  let setSearchParams = reactExports.useCallback(
    (nextInit, navigateOptions) => {
      const newSearchParams = createSearchParams(
        typeof nextInit === "function" ? nextInit(new URLSearchParams(searchParams)) : nextInit
      );
      hasSetSearchParamsRef.current = true;
      navigate("?" + newSearchParams, navigateOptions);
    },
    [navigate, searchParams]
  );
  return [searchParams, setSearchParams];
}
var fetcherId = 0;
var getUniqueFetcherId = () => `__${String(++fetcherId)}__`;
function useSubmit() {
  let { router } = useDataRouterContext3(
    "useSubmit"
    /* UseSubmit */
  );
  let { basename } = reactExports.useContext(NavigationContext);
  let currentRouteId = useRouteId();
  return reactExports.useCallback(
    async (target, options = {}) => {
      let { action, method, encType, formData, body } = getFormSubmissionInfo(
        target,
        basename
      );
      if (options.navigate === false) {
        let key = options.fetcherKey || getUniqueFetcherId();
        await router.fetch(key, currentRouteId, options.action || action, {
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          flushSync: options.flushSync
        });
      } else {
        await router.navigate(options.action || action, {
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          replace: options.replace,
          state: options.state,
          fromRouteId: currentRouteId,
          flushSync: options.flushSync,
          viewTransition: options.viewTransition
        });
      }
    },
    [router, basename, currentRouteId]
  );
}
function useFormAction(action, { relative } = {}) {
  let { basename } = reactExports.useContext(NavigationContext);
  let routeContext = reactExports.useContext(RouteContext);
  invariant(routeContext, "useFormAction must be used inside a RouteContext");
  let [match] = routeContext.matches.slice(-1);
  let path = { ...useResolvedPath(action ? action : ".", { relative }) };
  let location = useLocation();
  if (action == null) {
    path.search = location.search;
    let params = new URLSearchParams(path.search);
    let indexValues = params.getAll("index");
    let hasNakedIndexParam = indexValues.some((v2) => v2 === "");
    if (hasNakedIndexParam) {
      params.delete("index");
      indexValues.filter((v2) => v2).forEach((v2) => params.append("index", v2));
      let qs = params.toString();
      path.search = qs ? `?${qs}` : "";
    }
  }
  if ((!action || action === ".") && match.route.index) {
    path.search = path.search ? path.search.replace(/^\?/, "?index&") : "?index";
  }
  if (basename !== "/") {
    path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
  }
  return createPath(path);
}
function useViewTransitionState(to, { relative } = {}) {
  let vtContext = reactExports.useContext(ViewTransitionContext);
  invariant(
    vtContext != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?"
  );
  let { basename } = useDataRouterContext3(
    "useViewTransitionState"
    /* useViewTransitionState */
  );
  let path = useResolvedPath(to, { relative });
  if (!vtContext.isTransitioning) {
    return false;
  }
  let currentPath = stripBasename(vtContext.currentLocation.pathname, basename) || vtContext.currentLocation.pathname;
  let nextPath = stripBasename(vtContext.nextLocation.pathname, basename) || vtContext.nextLocation.pathname;
  return matchPath(path.pathname, nextPath) != null || matchPath(path.pathname, currentPath) != null;
}
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().trim();
const createLucideIcon = (iconName, iconNode) => {
  const Component = reactExports.forwardRef(
    ({ color = "currentColor", size = 24, strokeWidth = 2, absoluteStrokeWidth, className = "", children, ...rest }, ref) => reactExports.createElement(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: ["lucide", `lucide-${toKebabCase(iconName)}`, className].join(" "),
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    )
  );
  Component.displayName = `${iconName}`;
  return Component;
};
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Activity = createLucideIcon("Activity", [
  ["path", { d: "M22 12h-4l-3 9L9 3l-3 9H2", key: "d5dnw9" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const AlertTriangle = createLucideIcon("AlertTriangle", [
  [
    "path",
    {
      d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
      key: "c3ski4"
    }
  ],
  ["path", { d: "M12 9v4", key: "juzpu7" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ArrowDownCircle = createLucideIcon("ArrowDownCircle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 8v8", key: "napkw2" }],
  ["path", { d: "m8 12 4 4 4-4", key: "k98ssh" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BarChart3 = createLucideIcon("BarChart3", [
  ["path", { d: "M3 3v18h18", key: "1s2lah" }],
  ["path", { d: "M18 17V9", key: "2bz60n" }],
  ["path", { d: "M13 17V5", key: "1frdt8" }],
  ["path", { d: "M8 17v-3", key: "17ska0" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BellOff = createLucideIcon("BellOff", [
  ["path", { d: "M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5", key: "o7mx20" }],
  ["path", { d: "M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7", key: "16f1lm" }],
  ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0", key: "qgo35s" }],
  ["path", { d: "m2 2 20 20", key: "1ooewy" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Bell = createLucideIcon("Bell", [
  ["path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", key: "1qo2s2" }],
  ["path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0", key: "qgo35s" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CalendarClock = createLucideIcon("CalendarClock", [
  ["path", { d: "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5", key: "1osxxc" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M3 10h5", key: "r794hk" }],
  ["path", { d: "M17.5 17.5 16 16.25V14", key: "re2vv1" }],
  ["path", { d: "M22 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z", key: "ame013" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CheckCircle2 = createLucideIcon("CheckCircle2", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChevronDown = createLucideIcon("ChevronDown", [
  ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ChevronRight = createLucideIcon("ChevronRight", [
  ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Clock = createLucideIcon("Clock", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Download = createLucideIcon("Download", [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Globe = createLucideIcon("Globe", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Info = createLucideIcon("Info", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Layers = createLucideIcon("Layers", [
  [
    "path",
    {
      d: "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",
      key: "8b97xw"
    }
  ],
  ["path", { d: "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65", key: "dd6zsq" }],
  ["path", { d: "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65", key: "ep9fru" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Loader2 = createLucideIcon("Loader2", [
  ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LogIn = createLucideIcon("LogIn", [
  ["path", { d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", key: "u53s6r" }],
  ["polyline", { points: "10 17 15 12 10 7", key: "1ail0h" }],
  ["line", { x1: "15", x2: "3", y1: "12", y2: "12", key: "v6grx8" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LogOut = createLucideIcon("LogOut", [
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
  ["polyline", { points: "16 17 21 12 16 7", key: "1gabdz" }],
  ["line", { x1: "21", x2: "9", y1: "12", y2: "12", key: "1uyos4" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MapPin = createLucideIcon("MapPin", [
  ["path", { d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", key: "2oe9fu" }],
  ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Menu = createLucideIcon("Menu", [
  ["line", { x1: "4", x2: "20", y1: "12", y2: "12", key: "1e0a9i" }],
  ["line", { x1: "4", x2: "20", y1: "6", y2: "6", key: "1owob3" }],
  ["line", { x1: "4", x2: "20", y1: "18", y2: "18", key: "yk5zj1" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MicOff = createLucideIcon("MicOff", [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
  ["path", { d: "M18.89 13.23A7.12 7.12 0 0 0 19 12v-2", key: "80xlxr" }],
  ["path", { d: "M5 10v2a7 7 0 0 0 12 5", key: "p2k8kg" }],
  ["path", { d: "M15 9.34V5a3 3 0 0 0-5.68-1.33", key: "1gzdoj" }],
  ["path", { d: "M9 9v3a3 3 0 0 0 5.12 2.12", key: "r2i35w" }],
  ["line", { x1: "12", x2: "12", y1: "19", y2: "22", key: "x3vr5v" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MoreHorizontal = createLucideIcon("MoreHorizontal", [
  ["circle", { cx: "12", cy: "12", r: "1", key: "41hilf" }],
  ["circle", { cx: "19", cy: "12", r: "1", key: "1wjl8i" }],
  ["circle", { cx: "5", cy: "12", r: "1", key: "1pcz8c" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pause = createLucideIcon("Pause", [
  ["rect", { width: "4", height: "16", x: "6", y: "4", key: "iffhe4" }],
  ["rect", { width: "4", height: "16", x: "14", y: "4", key: "sjin7j" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pencil = createLucideIcon("Pencil", [
  ["path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z", key: "5qss01" }],
  ["path", { d: "m15 5 4 4", key: "1mk7zo" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Play = createLucideIcon("Play", [
  ["polygon", { points: "5 3 19 12 5 21 5 3", key: "191637" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Radio = createLucideIcon("Radio", [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RefreshCw = createLucideIcon("RefreshCw", [
  ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
  ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
  ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
  ["path", { d: "M8 16H3v5", key: "1cv678" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RotateCcw = createLucideIcon("RotateCcw", [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Save = createLucideIcon("Save", [
  ["path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z", key: "1owoqh" }],
  ["polyline", { points: "17 21 17 13 7 13 7 21", key: "1md35c" }],
  ["polyline", { points: "7 3 7 8 15 8", key: "8nz8an" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Search = createLucideIcon("Search", [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Settings = createLucideIcon("Settings", [
  [
    "path",
    {
      d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      key: "1qme2f"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Square = createLucideIcon("Square", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Star = createLucideIcon("Star", [
  [
    "polygon",
    {
      points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2",
      key: "8f66p6"
    }
  ]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Terminal = createLucideIcon("Terminal", [
  ["polyline", { points: "4 17 10 11 4 5", key: "akl6gq" }],
  ["line", { x1: "12", x2: "20", y1: "19", y2: "19", key: "q2wloq" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Volume2 = createLucideIcon("Volume2", [
  ["polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5", key: "16drj5" }],
  ["path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07", key: "ltjumu" }],
  ["path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14", key: "1kegas" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VolumeX = createLucideIcon("VolumeX", [
  ["polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5", key: "16drj5" }],
  ["line", { x1: "22", x2: "16", y1: "9", y2: "15", key: "1ewh16" }],
  ["line", { x1: "16", x2: "22", y1: "9", y2: "15", key: "5ykzw1" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const WifiOff = createLucideIcon("WifiOff", [
  ["line", { x1: "2", x2: "22", y1: "2", y2: "22", key: "a6p6uj" }],
  ["path", { d: "M8.5 16.5a5 5 0 0 1 7 0", key: "sej527" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 4.17-2.65", key: "11utq1" }],
  ["path", { d: "M10.66 5c4.01-.36 8.14.9 11.34 3.76", key: "hxefdu" }],
  ["path", { d: "M16.85 11.25a10 10 0 0 1 2.22 1.68", key: "q734kn" }],
  ["path", { d: "M5 13a10 10 0 0 1 5.24-2.76", key: "piq4yl" }],
  ["line", { x1: "12", x2: "12.01", y1: "20", y2: "20", key: "of4bc4" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Wifi = createLucideIcon("Wifi", [
  ["path", { d: "M5 13a10 10 0 0 1 14 0", key: "6v8j51" }],
  ["path", { d: "M8.5 16.5a5 5 0 0 1 7 0", key: "sej527" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0", key: "dnpr2z" }],
  ["line", { x1: "12", x2: "12.01", y1: "20", y2: "20", key: "of4bc4" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XCircle = createLucideIcon("XCircle", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
]);
/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const X = createLucideIcon("X", [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
]);
const AuthContext = reactExports.createContext(void 0);
const AUTH_TOKEN_STORAGE_KEY = "wavecap-auth-token";
const readStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return value && value.length > 0 ? value : null;
};
const persistToken = (token) => {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};
const buildAuthHeaders = (token) => {
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};
const AuthProvider = ({ children }) => {
  const [token, setToken] = reactExports.useState(() => readStoredToken());
  const [role, setRole] = reactExports.useState("read_only");
  const [defaultRole, setDefaultRole] = reactExports.useState("read_only");
  const [authenticated, setAuthenticated] = reactExports.useState(false);
  const [requiresPassword, setRequiresPassword] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  const [loginVisible, setLoginVisible] = reactExports.useState(false);
  const defaultRoleRef = reactExports.useRef("read_only");
  reactExports.useEffect(() => {
    defaultRoleRef.current = defaultRole;
  }, [defaultRole]);
  const updateAccessDescriptor = reactExports.useCallback((descriptor) => {
    setDefaultRole(descriptor.defaultRole);
    setRole(descriptor.role);
    setAuthenticated(descriptor.authenticated);
    setRequiresPassword(descriptor.requiresPassword);
    if (descriptor.authenticated) {
      setLoginVisible(false);
    }
  }, []);
  const applyToken = reactExports.useCallback((value) => {
    setToken(value);
    persistToken(value);
  }, []);
  const handleUnauthorized = reactExports.useCallback(() => {
    applyToken(null);
    setAuthenticated(false);
    setRole(defaultRoleRef.current);
    setLoginVisible(true);
  }, [applyToken]);
  const refreshAccess = reactExports.useCallback(
    async (options = {}) => {
      const activeToken = options.tokenOverride !== void 0 ? options.tokenOverride : token;
      const headers = buildAuthHeaders(activeToken ?? null);
      try {
        const response = await fetch("/api/access", { headers });
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!response.ok) {
          throw new Error(
            `Failed to load access descriptor (status ${response.status})`
          );
        }
        const descriptor = await response.json();
        updateAccessDescriptor(descriptor);
        if (options.persist) {
          applyToken(activeToken ?? null);
        }
      } catch (error) {
        console.error("Failed to refresh access descriptor", error);
      } finally {
        setLoading(false);
      }
    },
    [applyToken, handleUnauthorized, token, updateAccessDescriptor]
  );
  reactExports.useEffect(() => {
    const initialToken = readStoredToken();
    void refreshAccess({ tokenOverride: initialToken, persist: true });
  }, [refreshAccess]);
  const authFetch = reactExports.useCallback(
    async (input, init) => {
      const headers = new Headers((init == null ? void 0 : init.headers) ?? void 0);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
      }
      return response;
    },
    [handleUnauthorized, token]
  );
  const login = reactExports.useCallback(
    async ({ password, identifier }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, identifier })
      });
      if (response.status === 401) {
        throw new Error("Invalid credentials.");
      }
      if (!response.ok) {
        throw new Error("Unable to complete sign-in.");
      }
      const data = await response.json();
      await refreshAccess({ tokenOverride: data.token, persist: true });
    },
    [refreshAccess]
  );
  const logout = reactExports.useCallback(async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: buildAuthHeaders(token)
        });
      }
    } catch (error) {
      console.warn("Failed to logout cleanly", error);
    } finally {
      await refreshAccess({ tokenOverride: null, persist: true });
    }
  }, [refreshAccess, token]);
  const requestLogin = reactExports.useCallback(() => {
    setLoginVisible(true);
  }, []);
  const contextValue = reactExports.useMemo(
    () => ({
      role,
      defaultRole,
      authenticated,
      requiresPassword,
      token,
      loading,
      loginVisible,
      setLoginVisible,
      requestLogin,
      login,
      logout,
      authFetch,
      refreshAccess
    }),
    [
      authFetch,
      authenticated,
      defaultRole,
      loading,
      login,
      loginVisible,
      logout,
      refreshAccess,
      requestLogin,
      requiresPassword,
      role,
      setLoginVisible,
      token
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AuthContext.Provider, { value: contextValue, children });
};
const useAuth = () => {
  const context = reactExports.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
const API_BASE$2 = "/api";
const STREAM_TRANSCRIPTION_PREVIEW_LIMIT = 100;
const STREAMS_QUERY_KEY = ["streams"];
const toError = (value, fallback) => {
  if (value instanceof Error) {
    return value;
  }
  return new Error(fallback);
};
const normalizeStream = (stream) => ({
  ...stream,
  transcriptions: (stream.transcriptions ?? []).slice(
    0,
    STREAM_TRANSCRIPTION_PREVIEW_LIMIT
  )
});
const useStreams = () => {
  const [error, setError] = reactExports.useState(null);
  const { authFetch } = useAuth();
  const queryClient2 = useQueryClient();
  const buildHeaders = reactExports.useCallback((contentType) => {
    const headers = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    return headers;
  }, []);
  const fetchStreamsRequest = reactExports.useCallback(async () => {
    try {
      const params = new URLSearchParams({
        maxTranscriptions: String(STREAM_TRANSCRIPTION_PREVIEW_LIMIT)
      });
      const response = await authFetch(
        `${API_BASE$2}/streams?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const normalized = data.map(normalizeStream);
      setError(null);
      return normalized;
    } catch (err) {
      const errorObject = toError(err, "Failed to fetch streams");
      console.error("Error fetching streams:", errorObject);
      setError(errorObject.message);
      throw errorObject;
    }
  }, [authFetch]);
  const streamsQuery = useQuery({
    queryKey: STREAMS_QUERY_KEY,
    queryFn: fetchStreamsRequest
  });
  const { data: streamsData, isFetching, isFetched, refetch } = streamsQuery;
  const updateCachedStreams = reactExports.useCallback(
    (updater) => {
      queryClient2.setQueryData(STREAMS_QUERY_KEY, (current) => {
        const currentArray = Array.isArray(current) ? current : [];
        return updater(currentArray);
      });
    },
    [queryClient2]
  );
  const fetchStreams = reactExports.useCallback(async () => {
    try {
      await refetch({ throwOnError: true });
    } catch (err) {
      const errorObject = toError(err, "Failed to fetch streams");
      setError(errorObject.message);
      throw errorObject;
    }
  }, [refetch]);
  const startStreamMutation = useMutation({
    mutationFn: async (streamId) => {
      const response = await authFetch(`${API_BASE$2}/streams/${streamId}/start`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }
          const nextStatus = (stream.source ?? "audio") === "audio" ? "queued" : "transcribing";
          if (stream.enabled === true && stream.status === nextStatus && stream.error === null) {
            return stream;
          }
          changed = true;
          return {
            ...stream,
            enabled: true,
            status: nextStatus,
            error: null
          };
        });
        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(
        err,
        "Failed to start stream transcription"
      );
      console.error("Error starting stream transcription:", errorObject);
      setError(errorObject.message);
    }
  });
  const stopStreamMutation = useMutation({
    mutationFn: async (streamId) => {
      const response = await authFetch(`${API_BASE$2}/streams/${streamId}/stop`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }
          if (stream.enabled === false && stream.status === "stopped" && stream.error === null) {
            return stream;
          }
          changed = true;
          return {
            ...stream,
            enabled: false,
            status: "stopped",
            error: null
          };
        });
        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(
        err,
        "Failed to stop stream transcription"
      );
      console.error("Error stopping stream transcription:", errorObject);
      setError(errorObject.message);
    }
  });
  const resetStreamMutation = useMutation({
    mutationFn: async (streamId) => {
      const response = await authFetch(`${API_BASE$2}/streams/${streamId}/reset`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: (_, streamId) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }
          if (!stream.transcriptions || stream.transcriptions.length === 0) {
            return stream;
          }
          changed = true;
          return {
            ...stream,
            transcriptions: []
          };
        });
        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(err, "Failed to reset stream");
      console.error("Error resetting stream:", errorObject);
      setError(errorObject.message);
    }
  });
  const reviewTranscriptionMutation = useMutation({
    mutationFn: async ({ transcriptionId, updates }) => {
      const response = await authFetch(
        `${API_BASE$2}/transcriptions/${transcriptionId}/review`,
        {
          method: "PATCH",
          headers: buildHeaders("application/json"),
          body: JSON.stringify(updates)
        }
      );
      if (!response.ok) {
        let message = `HTTP error! status: ${response.status}`;
        try {
          const data = await response.json();
          if (typeof (data == null ? void 0 : data.error) === "string" && data.error.length > 0) {
            message = data.error;
          }
        } catch {
        }
        throw new Error(message);
      }
      return await response.json();
    },
    onSuccess: (updated) => {
      setError(null);
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== updated.streamId) {
            return stream;
          }
          const existingTranscriptions = stream.transcriptions ?? [];
          const filtered = existingTranscriptions.filter(
            (item) => item.id !== updated.id
          );
          const nextTranscriptions = [updated, ...filtered].slice(
            0,
            STREAM_TRANSCRIPTION_PREVIEW_LIMIT
          );
          changed = true;
          return {
            ...stream,
            transcriptions: nextTranscriptions
          };
        });
        return changed ? next : previous;
      });
    },
    onError: (err) => {
      const errorObject = toError(
        err,
        "Failed to update transcription review"
      );
      console.error("Error updating transcription review:", errorObject);
      setError(errorObject.message);
    }
  });
  const startStreamTranscription = reactExports.useCallback(
    (streamId) => startStreamMutation.mutateAsync(streamId),
    [startStreamMutation]
  );
  const stopStreamTranscription = reactExports.useCallback(
    (streamId) => stopStreamMutation.mutateAsync(streamId),
    [stopStreamMutation]
  );
  const resetStream = reactExports.useCallback(
    (streamId) => resetStreamMutation.mutateAsync(streamId),
    [resetStreamMutation]
  );
  const reviewTranscription = reactExports.useCallback(
    (transcriptionId, updates) => reviewTranscriptionMutation.mutateAsync({
      transcriptionId,
      updates
    }),
    [reviewTranscriptionMutation]
  );
  const addTranscription = reactExports.useCallback(
    (transcription) => {
      updateCachedStreams((previous) => {
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== transcription.streamId) {
            return stream;
          }
          const existingTranscriptions = stream.transcriptions ?? [];
          const filtered = existingTranscriptions.filter(
            (item) => item.id !== transcription.id
          );
          const nextTranscriptions = [transcription, ...filtered].slice(
            0,
            STREAM_TRANSCRIPTION_PREVIEW_LIMIT
          );
          changed = true;
          return {
            ...stream,
            transcriptions: nextTranscriptions
          };
        });
        return changed ? next : previous;
      });
    },
    [updateCachedStreams]
  );
  const patchStream = reactExports.useCallback(
    (streamId, updates) => {
      updateCachedStreams((previous) => {
        if (!Array.isArray(previous) || previous.length === 0) {
          return previous;
        }
        let changed = false;
        const next = previous.map((stream) => {
          if (stream.id !== streamId) {
            return stream;
          }
          const resolvedUpdates = typeof updates === "function" ? updates(stream) : updates;
          if (!resolvedUpdates) {
            return stream;
          }
          let needsUpdate = false;
          for (const key of Object.keys(resolvedUpdates)) {
            if (resolvedUpdates[key] !== void 0 && stream[key] !== resolvedUpdates[key]) {
              needsUpdate = true;
              break;
            }
          }
          if (!needsUpdate) {
            return stream;
          }
          changed = true;
          return {
            ...stream,
            ...resolvedUpdates
          };
        });
        return changed ? next : previous;
      });
    },
    [updateCachedStreams]
  );
  const updateStreams = reactExports.useCallback(
    (newStreams) => {
      updateCachedStreams((previous) => mergeStreamUpdates(previous, newStreams));
    },
    [updateCachedStreams]
  );
  const streams = streamsData ?? [];
  return {
    streams,
    loading: isFetching,
    initialized: isFetched,
    error,
    fetchStreams,
    startStreamTranscription,
    stopStreamTranscription,
    resetStream,
    addTranscription,
    patchStream,
    updateStreams,
    reviewTranscription
  };
};
const mergeStreamUpdates = (previous, incoming) => {
  if (!Array.isArray(incoming)) {
    return previous;
  }
  if (incoming.length === 0) {
    return previous;
  }
  const previousById = new Map(previous.map((stream) => [stream.id, stream]));
  const incomingById = new Map(incoming.map((stream) => [stream.id, stream]));
  let hasChanges = false;
  const updatedExisting = previous.map((stream) => {
    const update = incomingById.get(stream.id);
    if (!update) {
      return stream;
    }
    const hasIncomingTranscriptions = Array.isArray(update.transcriptions);
    const mergedTranscriptions = hasIncomingTranscriptions ? update.transcriptions ?? [] : stream.transcriptions ?? [];
    const next = normalizeStream({
      ...stream,
      ...update,
      transcriptions: mergedTranscriptions
    });
    for (const key of Object.keys(next)) {
      if (next[key] !== stream[key]) {
        hasChanges = true;
        return next;
      }
    }
    return stream;
  });
  const newStreams = incoming.filter((stream) => !previousById.has(stream.id)).map(
    (stream) => normalizeStream({
      id: stream.id,
      name: stream.name ?? "Unnamed stream",
      url: stream.url ?? "",
      status: stream.status ?? "stopped",
      enabled: stream.enabled ?? false,
      createdAt: stream.createdAt ?? (/* @__PURE__ */ new Date(0)).toISOString(),
      language: stream.language,
      error: stream.error ?? null,
      source: stream.source,
      webhookToken: stream.webhookToken ?? null,
      ignoreFirstSeconds: stream.ignoreFirstSeconds,
      lastActivityAt: stream.lastActivityAt ?? null,
      transcriptions: stream.transcriptions ?? []
    })
  );
  if (newStreams.length > 0) {
    hasChanges = true;
  }
  if (!hasChanges) {
    return previous;
  }
  return [...updatedExisting, ...newStreams];
};
const safeTimestamp$2 = (value) => {
  if (!value)
    return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
const dedupeAndSortTranscriptions$1 = (transcriptions) => {
  const seen2 = /* @__PURE__ */ new Set();
  const deduped = transcriptions.filter((t2) => {
    if (seen2.has(t2.id))
      return false;
    seen2.add(t2.id);
    return true;
  });
  return deduped.sort((a, b) => {
    const timeA = safeTimestamp$2(a.timestamp);
    const timeB = safeTimestamp$2(b.timestamp);
    return timeA - timeB;
  });
};
const useCombinedViewData = ({
  streams,
  combinedStreamViews,
  streamsInitialized,
  loading
}) => {
  const normalizedStreams = reactExports.useMemo(
    () => Array.isArray(streams) ? streams : [],
    [streams]
  );
  return reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    const virtualStreams = [];
    const streamLookup = new Map(
      normalizedStreams.map((stream) => [stream.id, stream])
    );
    combinedStreamViews.forEach((view) => {
      const members = view.streamIds.map((streamId) => streamLookup.get(streamId)).filter((stream) => Boolean(stream));
      const missingStreamIds = view.streamIds.filter(
        (streamId) => !streamLookup.has(streamId)
      );
      const combinedTranscriptions = dedupeAndSortTranscriptions$1(
        members.flatMap((stream) => stream.transcriptions ?? [])
      );
      const trimmedTranscriptions = combinedTranscriptions.length > STREAM_TRANSCRIPTION_PREVIEW_LIMIT ? combinedTranscriptions.slice(
        combinedTranscriptions.length - STREAM_TRANSCRIPTION_PREVIEW_LIMIT
      ) : combinedTranscriptions;
      const activityCandidates = [];
      trimmedTranscriptions.forEach((transcription) => {
        activityCandidates.push(safeTimestamp$2(transcription.timestamp));
      });
      members.forEach((stream) => {
        const activity = safeTimestamp$2(stream.lastActivityAt) || safeTimestamp$2(stream.createdAt);
        if (activity > 0) {
          activityCandidates.push(activity);
        }
      });
      const lastActivityMs = activityCandidates.length > 0 ? Math.max(...activityCandidates) : 0;
      const lastActivityAt = lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null;
      const createdCandidates = members.map((stream) => safeTimestamp$2(stream.createdAt)).filter((value) => value > 0);
      const createdAtMs = createdCandidates.length > 0 ? Math.min(...createdCandidates) : Date.now();
      const createdAt = new Date(createdAtMs).toISOString();
      const anyTranscribing = members.some(
        (stream) => stream.status === "transcribing"
      );
      const anyQueued = members.some((stream) => stream.status === "queued");
      const anyEnabled = members.some((stream) => stream.enabled);
      const anyError = members.some(
        (stream) => stream.status === "error" || Boolean(stream.error)
      );
      const hasMissingAfterLoad = streamsInitialized && !loading && normalizedStreams.length > 0 && missingStreamIds.length > 0;
      let status = "stopped";
      if (hasMissingAfterLoad) {
        status = "error";
      } else if (anyError) {
        status = "error";
      } else if (anyTranscribing) {
        status = "transcribing";
      } else if (anyQueued) {
        status = "queued";
      }
      const enabled = status === "transcribing" || status === "queued" || anyEnabled;
      const errorMessage = hasMissingAfterLoad ? `Missing streams: ${missingStreamIds.join(", ")}` : anyError ? "One or more streams reporting errors" : null;
      const combinedStream = {
        id: view.id,
        name: view.name,
        url: `combined:${view.id}`,
        status,
        enabled,
        pinned: false,
        createdAt,
        transcriptions: trimmedTranscriptions,
        source: "combined",
        ignoreFirstSeconds: 0,
        lastActivityAt,
        error: errorMessage,
        combinedStreamIds: [...view.streamIds]
      };
      map.set(view.id, {
        view,
        stream: combinedStream,
        members,
        missingStreamIds
      });
      virtualStreams.push(combinedStream);
    });
    return { map, virtualStreams };
  }, [combinedStreamViews, normalizedStreams, streamsInitialized, loading]);
};
const COMMAND_TIMEOUT_MS = 1e4;
const IDLE_DISCONNECT_DELAY_MS = 15 * 60 * 1e3;
const IDLE_DISCONNECT_CLOSE_CODE = 4e3;
const STALE_CONNECTION_TIMEOUT_MS = 2 * 60 * 1e3;
const STALE_CHECK_INTERVAL_MS = 30 * 1e3;
const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1e3;
const FAST_RETRY_THRESHOLD = 5;
const createRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};
const useWebSocket = (url, options = {}) => {
  const [socket, setSocket] = reactExports.useState(null);
  const socketRef = reactExports.useRef(null);
  const [isConnected, setIsConnected] = reactExports.useState(false);
  const [lastMessage, setLastMessage] = reactExports.useState(
    null
  );
  const [error, setError] = reactExports.useState(null);
  const reconnectTimeoutRef = reactExports.useRef();
  const reconnectAttempts = reactExports.useRef(0);
  const pendingRequestsRef = reactExports.useRef(/* @__PURE__ */ new Map());
  const shouldReloadOnReconnectRef = reactExports.useRef(false);
  const isManualCloseRef = reactExports.useRef(false);
  const idleDisconnectRef = reactExports.useRef(false);
  const idleTimeoutRef = reactExports.useRef();
  const connectionIdRef = reactExports.useRef(0);
  const lastMessageTimeRef = reactExports.useRef(Date.now());
  const staleCheckIntervalRef = reactExports.useRef();
  const authToken = options.token ?? null;
  const handleUnauthorized = options.onUnauthorized;
  const clearReconnectTimer = reactExports.useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = void 0;
    }
  }, []);
  const clearIdleTimeout = reactExports.useCallback(() => {
    if (idleTimeoutRef.current) {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = void 0;
    }
  }, []);
  const clearStaleCheckInterval = reactExports.useCallback(() => {
    if (staleCheckIntervalRef.current) {
      window.clearInterval(staleCheckIntervalRef.current);
      staleCheckIntervalRef.current = void 0;
    }
  }, []);
  const resolveBaseUrl = reactExports.useCallback(() => {
    const baseUrl = authToken ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(authToken)}` : url;
    if (baseUrl.startsWith("ws://") || baseUrl.startsWith("wss://")) {
      return baseUrl;
    }
    if (typeof window === "undefined") {
      return baseUrl;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (baseUrl.startsWith("/")) {
      return `${protocol}//${window.location.host}${baseUrl}`;
    }
    try {
      const absolute = new URL(baseUrl, window.location.href);
      if (absolute.protocol === "http:" || absolute.protocol === "https:") {
        absolute.protocol = absolute.protocol === "https:" ? "wss:" : "ws:";
      }
      return absolute.toString();
    } catch {
      const normalized = baseUrl.startsWith("//") ? baseUrl.slice(2) : baseUrl;
      return `${protocol}//${normalized}`;
    }
  }, [authToken, url]);
  const connect = reactExports.useCallback(() => {
    try {
      const connectionId = connectionIdRef.current + 1;
      connectionIdRef.current = connectionId;
      const ws = new WebSocket(resolveBaseUrl());
      ws.onopen = () => {
        if (connectionIdRef.current !== connectionId) {
          return;
        }
        console.log("🔌 WebSocket connected to:", url);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        idleDisconnectRef.current = false;
        shouldReloadOnReconnectRef.current = false;
      };
      ws.onmessage = (event) => {
        if (connectionIdRef.current !== connectionId) {
          return;
        }
        lastMessageTimeRef.current = Date.now();
        try {
          const message = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", message.type, message);
          if (message.type === "ack") {
            const pending = pendingRequestsRef.current.get(message.requestId);
            if (pending) {
              window.clearTimeout(pending.timeoutId);
              pending.resolve({
                success: true,
                action: message.action,
                message: message.message
              });
              pendingRequestsRef.current.delete(message.requestId);
            }
            setLastMessage(message);
            return;
          }
          if (message.type === "error" && message.requestId) {
            const pending = pendingRequestsRef.current.get(message.requestId);
            if (pending) {
              window.clearTimeout(pending.timeoutId);
              pending.resolve({
                success: false,
                action: pending.action,
                message: message.message
              });
              pendingRequestsRef.current.delete(message.requestId);
            }
            if (message.message && message.message.toLowerCase().includes("editor access required")) {
              handleUnauthorized == null ? void 0 : handleUnauthorized();
            }
            setLastMessage(message);
            return;
          }
          if (message.type === "error" && message.message) {
            if (message.message.toLowerCase().includes("editor access required")) {
              handleUnauthorized == null ? void 0 : handleUnauthorized();
            }
          }
          setLastMessage(message);
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      ws.onclose = (event) => {
        if (connectionIdRef.current !== connectionId) {
          return;
        }
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        socketRef.current = null;
        const wasManualClose = isManualCloseRef.current;
        const wasIdleClose = idleDisconnectRef.current;
        isManualCloseRef.current = false;
        pendingRequestsRef.current.forEach((pending) => {
          window.clearTimeout(pending.timeoutId);
          pending.resolve({
            success: false,
            action: pending.action,
            message: "WebSocket disconnected before the server responded."
          });
        });
        pendingRequestsRef.current.clear();
        if (event.code === 4401) {
          handleUnauthorized == null ? void 0 : handleUnauthorized();
          return;
        }
        if (wasIdleClose) {
          reconnectAttempts.current = 0;
          shouldReloadOnReconnectRef.current = false;
          setError("WebSocket connection paused while this tab was inactive.");
          return;
        }
        if (wasManualClose) {
          reconnectAttempts.current = 0;
          shouldReloadOnReconnectRef.current = false;
          return;
        }
        reconnectAttempts.current++;
        const attempt = reconnectAttempts.current;
        const baseDelay = attempt <= FAST_RETRY_THRESHOLD ? 1e3 * Math.pow(2, attempt) : 3e4 * Math.pow(1.5, attempt - FAST_RETRY_THRESHOLD);
        const delay = Math.min(baseDelay, MAX_RECONNECT_DELAY_MS);
        if (attempt > FAST_RETRY_THRESHOLD) {
          setError(`Connection lost. Retrying in ${Math.round(delay / 1e3)}s... (attempt ${attempt})`);
        }
        console.log(`🔌 WebSocket reconnecting in ${Math.round(delay / 1e3)}s (attempt ${attempt})...`);
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };
      ws.onerror = (event) => {
        if (connectionIdRef.current !== connectionId) {
          return;
        }
        console.error("WebSocket error:", event);
        setError("WebSocket connection error - server may not be running");
      };
      setSocket(ws);
      socketRef.current = ws;
    } catch (err) {
      console.error("Error creating WebSocket:", err);
      setError("Failed to create WebSocket connection");
    }
  }, [handleUnauthorized, resolveBaseUrl, url]);
  reactExports.useEffect(() => {
    connect();
    return () => {
      clearReconnectTimer();
      clearIdleTimeout();
      if (socketRef.current) {
        isManualCloseRef.current = true;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [clearIdleTimeout, clearReconnectTimer, connect]);
  reactExports.useEffect(() => {
    return () => {
      clearReconnectTimer();
    };
  }, [clearReconnectTimer]);
  reactExports.useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }
    const startIdleTimer = () => {
      clearIdleTimeout();
      if (!document.hidden) {
        return;
      }
      idleTimeoutRef.current = window.setTimeout(() => {
        idleTimeoutRef.current = void 0;
        if (!document.hidden) {
          return;
        }
        const activeSocket = socketRef.current;
        if (!activeSocket) {
          return;
        }
        idleDisconnectRef.current = true;
        shouldReloadOnReconnectRef.current = false;
        isManualCloseRef.current = true;
        activeSocket.close(
          IDLE_DISCONNECT_CLOSE_CODE,
          "WebSocket idle disconnect"
        );
      }, IDLE_DISCONNECT_DELAY_MS);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        startIdleTimer();
        return;
      }
      clearIdleTimeout();
      if (idleDisconnectRef.current && !socketRef.current && !isConnected) {
        connect();
      }
    };
    const handleInteraction = () => {
      if (document.hidden) {
        return;
      }
      clearIdleTimeout();
      if (idleDisconnectRef.current && !socketRef.current && !isConnected) {
        connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleInteraction);
    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    if (document.hidden) {
      startIdleTimer();
    }
    return () => {
      clearIdleTimeout();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleInteraction);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [clearIdleTimeout, connect, isConnected]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    clearStaleCheckInterval();
    if (!isConnected) {
      return;
    }
    lastMessageTimeRef.current = Date.now();
    staleCheckIntervalRef.current = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
      if (timeSinceLastMessage > STALE_CONNECTION_TIMEOUT_MS) {
        console.warn(
          `🔌 WebSocket connection appears stale (no messages for ${Math.round(timeSinceLastMessage / 1e3)}s), reconnecting...`
        );
        if (socketRef.current) {
          socketRef.current.close();
        }
      }
    }, STALE_CHECK_INTERVAL_MS);
    return () => {
      clearStaleCheckInterval();
    };
  }, [clearStaleCheckInterval, isConnected]);
  const sendMessage = reactExports.useCallback(
    (message) => {
      if (!socket || !isConnected) {
        const connectionError = new Error(
          "Cannot send message - WebSocket not connected"
        );
        console.warn("⚠️ Cannot send message - WebSocket not connected:", {
          socket: !!socket,
          isConnected
        });
        throw connectionError;
      }
      console.log("📤 Sending WebSocket message:", message);
      socket.send(JSON.stringify(message));
    },
    [socket, isConnected]
  );
  const sendCommand = reactExports.useCallback(
    (message) => {
      if (!socket || !isConnected) {
        return Promise.resolve({
          success: false,
          action: message.type,
          message: "WebSocket is disconnected. Please try again."
        });
      }
      const requestId = message.requestId ?? createRequestId();
      const payload = {
        ...message,
        requestId
      };
      return new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          pendingRequestsRef.current.delete(requestId);
          resolve({
            success: false,
            action: message.type,
            message: "Server did not respond. Please try again."
          });
        }, COMMAND_TIMEOUT_MS);
        pendingRequestsRef.current.set(requestId, {
          resolve,
          timeoutId,
          action: message.type
        });
        try {
          sendMessage(payload);
        } catch (error2) {
          window.clearTimeout(timeoutId);
          pendingRequestsRef.current.delete(requestId);
          resolve({
            success: false,
            action: message.type,
            message: error2 instanceof Error ? error2.message : "Failed to send command."
          });
        }
      });
    },
    [isConnected, sendMessage, socket]
  );
  const reconnect = reactExports.useCallback(() => {
    clearReconnectTimer();
    reconnectAttempts.current = 0;
    setError(null);
    if (socketRef.current) {
      isManualCloseRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
    }
    connect();
  }, [clearReconnectTimer, connect]);
  const startTranscription = reactExports.useCallback(
    (streamId) => {
      return sendCommand({
        type: "start_transcription",
        streamId
      });
    },
    [sendCommand]
  );
  const stopTranscription = reactExports.useCallback(
    (streamId) => {
      return sendCommand({
        type: "stop_transcription",
        streamId
      });
    },
    [sendCommand]
  );
  const resetStream = reactExports.useCallback(
    (streamId) => {
      return sendCommand({
        type: "reset_stream",
        streamId
      });
    },
    [sendCommand]
  );
  const updateStream = reactExports.useCallback(
    (streamId, {
      name,
      language,
      ignoreFirstSeconds
    }) => {
      const message = {
        type: "update_stream",
        streamId,
        ...name !== void 0 ? { name } : {},
        ...language !== void 0 ? { language } : {},
        ...ignoreFirstSeconds !== void 0 ? { ignoreFirstSeconds } : {}
      };
      return sendCommand(message);
    },
    [sendCommand]
  );
  return {
    socket,
    isConnected,
    lastMessage,
    error,
    sendMessage,
    sendCommand,
    startTranscription,
    stopTranscription,
    resetStream,
    updateStream,
    reconnect
  };
};
const STREAM_TITLE_COLLATOR = new Intl.Collator(void 0, {
  numeric: true,
  sensitivity: "base"
});
const getStreamTitle = (stream) => {
  var _a2, _b2;
  const trimmedName = (_a2 = stream.name) == null ? void 0 : _a2.trim();
  if (trimmedName) {
    return trimmedName;
  }
  const trimmedUrl = (_b2 = stream.url) == null ? void 0 : _b2.trim();
  if (trimmedUrl) {
    return trimmedUrl;
  }
  return "Untitled stream";
};
const compareStreamsByName = (a, b) => {
  const nameComparison = STREAM_TITLE_COLLATOR.compare(
    getStreamTitle(a),
    getStreamTitle(b)
  );
  if (nameComparison !== 0) {
    return nameComparison;
  }
  return a.id.localeCompare(b.id);
};
const MIN_SILENCE_MS = 1200;
const MAX_SILENCE_MS = 6e3;
const GAP_MULTIPLIER = 1.6;
const DURATION_SILENCE_SCALE = 0.6;
const PAGER_INCIDENT_GROUP_WINDOW_MS = 9e4;
const calculateAverageConfidence = (transcriptions) => {
  let total = 0;
  let count = 0;
  transcriptions.forEach((transcription) => {
    if (transcription.eventType && transcription.eventType !== "transcription") {
      return;
    }
    const { confidence } = transcription;
    if (typeof confidence === "number" && Number.isFinite(confidence)) {
      total += confidence;
      count += 1;
    }
  });
  if (count === 0) {
    return null;
  }
  return total / count;
};
const sanitizeForId = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(-24);
const hashString$1 = (value) => {
  let hash = 0;
  for (let index2 = 0; index2 < value.length; index2 += 1) {
    hash = hash * 31 + value.charCodeAt(index2) >>> 0;
  }
  return hash.toString(36);
};
const normaliseIncidentId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const getRecordingElementId = (recordingUrl) => {
  const normalized = recordingUrl.trim();
  const suffix = sanitizeForId(normalized) || "recording";
  const hash = hashString$1(normalized);
  return `audio-${suffix}-${hash}`;
};
const getTranscriptionDurationMs = (transcription) => {
  if (transcription.segments && transcription.segments.length > 0) {
    const finiteStarts = transcription.segments.map(
      (segment) => typeof segment.start === "number" && Number.isFinite(segment.start) ? segment.start : null
    ).filter((value) => value !== null);
    const finiteEnds = transcription.segments.map(
      (segment) => typeof segment.end === "number" && Number.isFinite(segment.end) ? segment.end : null
    ).filter((value) => value !== null);
    if (finiteStarts.length > 0 && finiteEnds.length > 0) {
      const minStart = Math.min(...finiteStarts);
      const maxEnd = Math.max(...finiteEnds);
      const durationSeconds = Math.max(0, maxEnd - minStart);
      if (Number.isFinite(durationSeconds)) {
        return durationSeconds * 1e3;
      }
    }
  }
  if (typeof transcription.duration === "number" && transcription.duration > 0) {
    return transcription.duration * 1e3;
  }
  return 0;
};
const getSegmentDisplayStart = (segment, transcription) => {
  const segmentStart = typeof segment.start === "number" && Number.isFinite(segment.start) ? segment.start : null;
  const fallbackStart = typeof transcription.recordingStartOffset === "number" && Number.isFinite(transcription.recordingStartOffset) ? Math.max(0, transcription.recordingStartOffset) : null;
  if (segmentStart !== null && segmentStart > 0) {
    return segmentStart;
  }
  if (fallbackStart !== null) {
    return fallbackStart;
  }
  return segmentStart ?? 0;
};
const getBlankAudioSegmentBounds = (transcription) => {
  const startOffset = typeof transcription.recordingStartOffset === "number" && Number.isFinite(transcription.recordingStartOffset) ? Math.max(0, transcription.recordingStartOffset) : 0;
  const durationSecondsRaw = getTranscriptionDurationMs(transcription) / 1e3;
  const durationSeconds = Number.isFinite(durationSecondsRaw) ? Math.max(0, durationSecondsRaw) : 0;
  const effectiveDuration = durationSeconds > 0 ? durationSeconds : 0.25;
  const endOffset = startOffset + effectiveDuration;
  return {
    start: startOffset,
    end: endOffset
  };
};
const shouldIsolateTranscription = (transcription) => {
  switch (transcription.eventType) {
    case "recording_started":
    case "recording_stopped":
    case "transcription_started":
    case "transcription_stopped":
    case "upstream_disconnected":
    case "upstream_reconnected":
      return true;
    default:
      return false;
  }
};
const groupTranscriptions = (transcriptions) => {
  const groups = [];
  transcriptions.forEach((transcription) => {
    var _a2;
    const timestampMs = new Date(transcription.timestamp).getTime();
    if (Number.isNaN(timestampMs)) {
      return;
    }
    const durationMs = getTranscriptionDurationMs(transcription);
    const endMs = durationMs > 0 ? timestampMs + durationMs : timestampMs;
    const incidentId = normaliseIncidentId(
      (_a2 = transcription.pagerIncident) == null ? void 0 : _a2.incidentId
    );
    const lastGroup = groups[groups.length - 1];
    const startNewGroup = () => {
      const initialAverage = calculateAverageConfidence([transcription]);
      groups.push({
        id: transcription.id,
        startTimestamp: transcription.timestamp,
        endTimestamp: transcription.timestamp,
        averageConfidence: initialAverage,
        lastTimestampMs: timestampMs,
        lastEndMs: endMs,
        totalGapMs: 0,
        gapSamples: 0,
        transcriptions: [transcription],
        pagerIncidentId: incidentId
      });
    };
    if (!lastGroup) {
      startNewGroup();
      return;
    }
    const lastTranscription = lastGroup.transcriptions[lastGroup.transcriptions.length - 1];
    if (shouldIsolateTranscription(transcription) || shouldIsolateTranscription(lastTranscription)) {
      startNewGroup();
      return;
    }
    const gapMs = Math.max(0, timestampMs - lastGroup.lastEndMs);
    if (!lastGroup.pagerIncidentId && incidentId) {
      lastGroup.pagerIncidentId = incidentId;
    }
    const lastIncidentId = normaliseIncidentId(lastGroup.pagerIncidentId);
    const averageGapMs = lastGroup.gapSamples > 0 ? lastGroup.totalGapMs / lastGroup.gapSamples : 0;
    const lastDurationMs = getTranscriptionDurationMs(lastTranscription);
    const durationMsThreshold = Math.max(
      MIN_SILENCE_MS,
      lastDurationMs * DURATION_SILENCE_SCALE,
      durationMs * DURATION_SILENCE_SCALE
    );
    const dynamicGapThreshold = averageGapMs > 0 ? averageGapMs * GAP_MULTIPLIER : MIN_SILENCE_MS;
    const incidentGapThreshold = incidentId && lastIncidentId && incidentId === lastIncidentId ? PAGER_INCIDENT_GROUP_WINDOW_MS : 0;
    const baseSilenceThreshold = Math.min(
      MAX_SILENCE_MS,
      Math.max(MIN_SILENCE_MS, dynamicGapThreshold, durationMsThreshold)
    );
    const silenceThresholdMs = incidentGapThreshold > 0 ? Math.max(baseSilenceThreshold, incidentGapThreshold) : baseSilenceThreshold;
    if (gapMs > silenceThresholdMs) {
      startNewGroup();
      return;
    }
    lastGroup.transcriptions.push(transcription);
    lastGroup.lastTimestampMs = timestampMs;
    lastGroup.lastEndMs = Math.max(lastGroup.lastEndMs, endMs);
    lastGroup.endTimestamp = transcription.timestamp;
    lastGroup.averageConfidence = calculateAverageConfidence(
      lastGroup.transcriptions
    );
    lastGroup.totalGapMs += gapMs;
    lastGroup.gapSamples += 1;
  });
  return groups;
};
const prepareTranscriptions = (transcriptions) => {
  if (!transcriptions || transcriptions.length === 0) {
    return {
      sortedTranscriptions: [],
      groupedTranscriptions: []
    };
  }
  const sortedTranscriptions = [...transcriptions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const groupedTranscriptions = groupTranscriptions(sortedTranscriptions);
  return { sortedTranscriptions, groupedTranscriptions };
};
const dedupeAndSortTranscriptions = (transcriptions) => {
  if (transcriptions.length === 0) {
    return [];
  }
  const map = /* @__PURE__ */ new Map();
  transcriptions.forEach((transcription) => {
    map.set(transcription.id, transcription);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};
const sortByTimestampDescending = (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
const DEFAULT_FALLBACK_LIMIT = 5;
const selectVisibleTranscriptions = (liveTranscriptions, options = {}) => {
  const historyTranscriptions = options.historyTranscriptions ?? [];
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs;
  const hasWindow = typeof windowMs === "number" && Number.isFinite(windowMs) && windowMs > 0;
  const cutoff = hasWindow ? now - windowMs : null;
  const historyIds = new Set(
    historyTranscriptions.map((transcription) => transcription.id)
  );
  const recentLive = liveTranscriptions.filter((transcription) => {
    if (historyIds.has(transcription.id)) {
      return true;
    }
    if (!hasWindow || cutoff === null) {
      return true;
    }
    const timestamp = new Date(transcription.timestamp).getTime();
    if (!Number.isFinite(timestamp)) {
      return true;
    }
    return timestamp >= cutoff;
  });
  let combined = dedupeAndSortTranscriptions([
    ...historyTranscriptions,
    ...recentLive
  ]);
  if (combined.length === 0 && liveTranscriptions.length > 0) {
    const fallbackLimit = Math.max(
      1,
      options.fallbackLimit ?? DEFAULT_FALLBACK_LIMIT
    );
    const fallback = [...liveTranscriptions].sort(sortByTimestampDescending).slice(0, fallbackLimit);
    combined = dedupeAndSortTranscriptions([
      ...historyTranscriptions,
      ...fallback
    ]);
  }
  return combined;
};
const buildPlaybackQueue = (streamId, orderedTranscriptions, startId) => {
  const playable = orderedTranscriptions.filter(
    (transcription) => typeof transcription.recordingUrl === "string" && transcription.recordingUrl.length > 0
  );
  const startIndex = playable.findIndex(
    (transcription) => transcription.id === startId
  );
  if (startIndex === -1) {
    return null;
  }
  return {
    streamId,
    items: playable,
    currentIndex: startIndex
  };
};
const advancePlaybackQueue = (queue, currentTranscription) => {
  if (!queue || queue.streamId !== currentTranscription.streamId) {
    return null;
  }
  const activeIndex = queue.items.findIndex(
    (item) => item.id === currentTranscription.id
  );
  const startIndex = activeIndex >= 0 ? activeIndex : queue.currentIndex;
  for (let index2 = startIndex + 1; index2 < queue.items.length; index2 += 1) {
    const candidate = queue.items[index2];
    if (candidate == null ? void 0 : candidate.recordingUrl) {
      return {
        nextQueue: {
          ...queue,
          currentIndex: index2
        },
        nextTranscription: candidate
      };
    }
  }
  return null;
};
const setAudioElementSource = (audio, recordingUrl) => {
  const normalizedUrl = recordingUrl.trim();
  if (!normalizedUrl) {
    return false;
  }
  const currentUrl = audio.dataset.loadedRecordingUrl;
  if (currentUrl === normalizedUrl) {
    return false;
  }
  audio.dataset.recordingUrl = normalizedUrl;
  audio.dataset.loadedRecordingUrl = normalizedUrl;
  audio.src = normalizedUrl;
  return true;
};
const MIN_SEGMENT_WINDOW = 0.25;
const finiteOrNull = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const computePlaybackRange = (startTime, endTime, recordingStartOffset) => {
  const safeStart = finiteOrNull(startTime);
  const safeEnd = finiteOrNull(endTime);
  const offset = finiteOrNull(recordingStartOffset);
  const rawStart = safeStart !== null && safeStart > 0 ? safeStart : offset ?? (safeStart !== null ? Math.max(0, safeStart) : 0);
  const playbackStart = Math.max(0, rawStart);
  const segmentDuration = safeEnd !== null && safeStart !== null ? Math.max(0, safeEnd - safeStart) : null;
  let playbackEnd = segmentDuration !== null ? playbackStart + segmentDuration : safeEnd !== null && safeEnd > playbackStart ? safeEnd : playbackStart;
  if (!Number.isFinite(playbackEnd)) {
    playbackEnd = playbackStart;
  }
  if (playbackEnd <= playbackStart) {
    playbackEnd = playbackStart + MIN_SEGMENT_WINDOW;
  }
  playbackEnd = Math.max(playbackEnd, playbackStart + MIN_SEGMENT_WINDOW);
  return { start: playbackStart, end: playbackEnd };
};
const VOLUME_STORAGE_KEY = "wavecap-playback-volume";
const DEFAULT_VOLUME = 1;
function getStoredVolume() {
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch {
  }
  return DEFAULT_VOLUME;
}
function storeVolume(volume) {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
  } catch {
  }
}
const useTranscriptionAudioPlayback = () => {
  const recordingAudioRefs = reactExports.useRef({});
  const [playingRecording, _setPlayingRecording] = reactExports.useState(null);
  const [playingTranscriptionId, _setPlayingTranscriptionId] = reactExports.useState(null);
  const [playingSegment, _setPlayingSegment] = reactExports.useState(null);
  const [currentPlayTime, setCurrentPlayTime] = reactExports.useState(0);
  const [playbackQueue, _setPlaybackQueue] = reactExports.useState(null);
  const [volume, _setVolume] = reactExports.useState(getStoredVolume);
  const volumeRef = reactExports.useRef(volume);
  const playbackQueueRef = reactExports.useRef(null);
  const playingRecordingRef = reactExports.useRef(null);
  const playingTranscriptionIdRef = reactExports.useRef(null);
  const playingSegmentRef = reactExports.useRef(null);
  const playRecordingRef = reactExports.useRef(null);
  const setPlayingRecording = reactExports.useCallback((value) => {
    playingRecordingRef.current = value;
    _setPlayingRecording(value);
  }, []);
  const setPlayingTranscriptionId = reactExports.useCallback((value) => {
    playingTranscriptionIdRef.current = value;
    _setPlayingTranscriptionId(value);
  }, []);
  const setPlayingSegment = reactExports.useCallback((value) => {
    playingSegmentRef.current = value;
    _setPlayingSegment(value);
  }, []);
  const setPlaybackQueue = reactExports.useCallback((queue) => {
    playbackQueueRef.current = queue;
    _setPlaybackQueue(queue);
  }, []);
  const setVolume = reactExports.useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    volumeRef.current = clampedVolume;
    _setVolume(clampedVolume);
    storeVolume(clampedVolume);
    Object.values(recordingAudioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = clampedVolume;
      }
    });
  }, []);
  reactExports.useEffect(() => {
    playbackQueueRef.current = playbackQueue;
  }, [playbackQueue]);
  const resetAudioPlaybackState = reactExports.useCallback(
    (audio, options) => {
      if (audio) {
        audio.loop = false;
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
      }
      setPlayingRecording(null);
      setPlayingTranscriptionId(null);
      setPlayingSegment(null);
      if (!(options == null ? void 0 : options.keepPlayTime)) {
        setCurrentPlayTime(0);
      }
      if ((options == null ? void 0 : options.clearQueue) ?? true) {
        setPlaybackQueue(null);
      }
    },
    [setPlaybackQueue, setPlayingRecording, setPlayingTranscriptionId, setPlayingSegment]
  );
  const stopCurrentRecording = reactExports.useCallback(() => {
    const currentRecordingId = playingRecordingRef.current;
    if (!currentRecordingId)
      return;
    const currentAudio = recordingAudioRefs.current[currentRecordingId] ?? null;
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch {
      }
    }
    resetAudioPlaybackState(currentAudio, { clearQueue: true });
  }, [resetAudioPlaybackState]);
  reactExports.useEffect(() => () => stopCurrentRecording(), [stopCurrentRecording]);
  const isSegmentCurrentlyPlaying = reactExports.useCallback(
    (recordingUrl, startTime, endTime) => {
      if (!recordingUrl || !playingRecordingRef.current)
        return false;
      const recordingId = getRecordingElementId(recordingUrl);
      if (playingRecordingRef.current !== recordingId)
        return false;
      const time = typeof currentPlayTime === "number" ? currentPlayTime : 0;
      return time >= startTime && time <= endTime;
    },
    [currentPlayTime]
  );
  const playRecording = reactExports.useCallback(
    (transcription, options) => {
      if (!transcription.recordingUrl) {
        console.warn("⚠️ No recording available for this transcription");
        return;
      }
      const recordingId = getRecordingElementId(transcription.recordingUrl);
      const audio = recordingAudioRefs.current[recordingId] ?? null;
      if (!audio) {
        console.error(`❌ Audio element not found: ${recordingId}`);
        return;
      }
      setAudioElementSource(audio, transcription.recordingUrl);
      const startOffset = Math.max(
        0,
        transcription.speechStartOffset ?? transcription.recordingStartOffset ?? 0
      );
      const currentRecordingId = playingRecordingRef.current;
      const currentTranscriptionId = playingTranscriptionIdRef.current;
      if (currentRecordingId === recordingId && currentTranscriptionId === transcription.id) {
        stopCurrentRecording();
        audio.currentTime = startOffset;
        return;
      }
      if (currentRecordingId && currentRecordingId !== recordingId) {
        if (options == null ? void 0 : options.isQueueTransition) {
          const oldAudio = recordingAudioRefs.current[currentRecordingId];
          if (oldAudio) {
            try {
              oldAudio.pause();
            } catch {
            }
          }
        } else {
          stopCurrentRecording();
        }
      }
      if (options == null ? void 0 : options.queue) {
        setPlaybackQueue(options.queue);
      } else if (!(options == null ? void 0 : options.isQueueTransition)) {
        setPlaybackQueue(null);
      }
      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcription.id);
      setPlayingSegment(null);
      const handleEnded = () => {
        const queue = playbackQueueRef.current;
        const advance = advancePlaybackQueue(queue, transcription);
        if (advance) {
          if (audio) {
            audio.ontimeupdate = null;
            audio.onended = null;
            audio.onerror = null;
          }
          if (playRecordingRef.current) {
            playRecordingRef.current(advance.nextTranscription, { queue: advance.nextQueue, isQueueTransition: true });
          } else {
            console.error("❌ playRecordingRef.current is null, cannot advance queue");
            resetAudioPlaybackState(audio);
          }
          return;
        }
        resetAudioPlaybackState(audio);
      };
      const handleError = (error) => {
        var _a2;
        console.error("❌ Error playing audio:", error);
        try {
          const globalAny = window;
          (_a2 = globalAny.__smartSpeakerShowToast) == null ? void 0 : _a2.call(globalAny, {
            title: "Playback error",
            message: "Audio clip not available (file missing).",
            variant: "error"
          });
        } catch {
        }
        resetAudioPlaybackState(audio);
      };
      const updateTime = () => setCurrentPlayTime(audio.currentTime);
      const startPlayback = () => {
        audio.loop = false;
        audio.volume = volumeRef.current;
        audio.currentTime = startOffset;
        setCurrentPlayTime(startOffset);
        audio.ontimeupdate = updateTime;
        audio.onended = handleEnded;
        audio.onerror = handleError;
        audio.play().catch((error) => {
          console.error("❌ Error starting audio playback:", error);
          resetAudioPlaybackState(audio);
        });
      };
      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          startPlayback();
        };
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0) {
          audio.load();
        }
      }
    },
    [resetAudioPlaybackState, setPlaybackQueue, setPlayingRecording, setPlayingSegment, setPlayingTranscriptionId, stopCurrentRecording]
  );
  playRecordingRef.current = playRecording;
  const playSegment = reactExports.useCallback(
    (recordingUrl, startTime, endTime, transcriptionId, options) => {
      if (!recordingUrl)
        return;
      const recordingId = getRecordingElementId(recordingUrl);
      const audio = recordingAudioRefs.current[recordingId] ?? null;
      if (!audio) {
        console.error(`❌ Audio element not found: ${recordingId}`);
        return;
      }
      const currentRecordingId = playingRecordingRef.current;
      if (currentRecordingId && currentRecordingId !== recordingId) {
        stopCurrentRecording();
      }
      const { start: playbackStart, end: playbackEnd } = computePlaybackRange(
        startTime ?? null,
        endTime ?? null,
        (options == null ? void 0 : options.recordingStartOffset) ?? null
      );
      const normalizedStart = startTime ?? playbackStart;
      const normalizedEnd = endTime ?? playbackEnd;
      const segmentKey = `${recordingId}-${normalizedStart}-${normalizedEnd}`;
      if (playingRecordingRef.current === recordingId && playingSegmentRef.current === segmentKey) {
        stopCurrentRecording();
        return;
      }
      setAudioElementSource(audio, recordingUrl);
      setPlaybackQueue(null);
      setPlayingRecording(recordingId);
      setPlayingTranscriptionId(transcriptionId);
      setPlayingSegment(segmentKey);
      const handleError = (error) => {
        var _a2;
        console.error("❌ Error playing audio:", error);
        try {
          const globalAny = window;
          (_a2 = globalAny.__smartSpeakerShowToast) == null ? void 0 : _a2.call(globalAny, {
            title: "Playback error",
            message: "Audio clip not available (file missing).",
            variant: "error"
          });
        } catch {
        }
        resetAudioPlaybackState(audio);
      };
      const handleSegmentTimeUpdate = () => {
        const nextTime = audio.currentTime;
        setCurrentPlayTime(nextTime);
        const completionThreshold = Math.max(playbackStart, playbackEnd - 0.05);
        if (nextTime >= completionThreshold && playingSegmentRef.current === segmentKey) {
          setPlayingSegment(null);
        }
      };
      const handleEnded = () => resetAudioPlaybackState(audio);
      const startPlayback = () => {
        audio.loop = false;
        audio.volume = volumeRef.current;
        audio.currentTime = Math.max(0, playbackStart);
        setCurrentPlayTime(Math.max(0, playbackStart));
        audio.ontimeupdate = handleSegmentTimeUpdate;
        audio.onended = handleEnded;
        audio.onerror = handleError;
        audio.play().catch((error) => {
          console.error("❌ Error starting audio playback:", error);
          resetAudioPlaybackState(audio);
        });
      };
      if (audio.readyState >= 2) {
        startPlayback();
      } else {
        const onReady = () => {
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("canplay", onReady);
          startPlayback();
        };
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("canplay", onReady, { once: true });
        if (audio.readyState === 0)
          audio.load();
      }
    },
    [resetAudioPlaybackState, setPlaybackQueue, setPlayingRecording, setPlayingSegment, setPlayingTranscriptionId, stopCurrentRecording]
  );
  return {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    playbackQueue,
    volume,
    setVolume,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying
  };
};
const HoveredSegmentContext = reactExports.createContext(void 0);
const HoveredSegmentProvider = ({
  children
}) => {
  const [hoveredSegmentId, setHoveredSegmentIdState] = reactExports.useState(
    null
  );
  const setHoveredSegmentId = reactExports.useCallback((id2) => {
    setHoveredSegmentIdState(id2);
  }, []);
  const contextValue = reactExports.useMemo(
    () => ({
      hoveredSegmentId,
      setHoveredSegmentId
    }),
    [hoveredSegmentId, setHoveredSegmentId]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HoveredSegmentContext.Provider, { value: contextValue, children });
};
const useHoveredSegmentOptional = () => {
  return reactExports.useContext(HoveredSegmentContext) ?? null;
};
const buildHoveredSegmentId = (transcriptionId, segmentId) => `${transcriptionId}-${segmentId}`;
const THEME_STORAGE_KEY = "wavecap-theme-mode";
const COLOR_CODING_STORAGE_KEY = "wavecap-color-coding-enabled";
const TRANSCRIPT_CORRECTION_STORAGE_KEY = "wavecap-transcript-correction-enabled";
const REVIEW_STATUS_VALUES = [
  "pending",
  "corrected",
  "verified"
];
const FALLBACK_REVIEW_EXPORT_STATUSES = [
  "corrected",
  "verified"
];
const UISettingsContext = reactExports.createContext(
  void 0
);
const parseThemeMode = (value) => {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
};
const isThemeMode = (value) => {
  return value === "light" || value === "dark" || value === "system";
};
const isTranscriptionReviewStatus = (value) => {
  return typeof value === "string" && REVIEW_STATUS_VALUES.includes(value);
};
const getStoredThemeMode = () => {
  if (typeof window === "undefined") {
    return "system";
  }
  return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY)) ?? "system";
};
const getStoredColorCoding = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const stored = window.localStorage.getItem(COLOR_CODING_STORAGE_KEY);
  if (stored === null) {
    return false;
  }
  return stored === "true";
};
const UISettingsProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = reactExports.useState(
    () => getStoredThemeMode()
  );
  const [colorCodingEnabled, setColorCodingEnabledState] = reactExports.useState(
    () => getStoredColorCoding()
  );
  const [transcriptCorrectionEnabled, setTranscriptCorrectionEnabledState] = reactExports.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const stored = window.localStorage.getItem(
      TRANSCRIPT_CORRECTION_STORAGE_KEY
    );
    if (stored === null) {
      return false;
    }
    return stored === "true";
  });
  const [systemPrefersDark, setSystemPrefersDark] = reactExports.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [defaultReviewExportStatuses, setDefaultReviewExportStatuses] = reactExports.useState(() => [
    ...FALLBACK_REVIEW_EXPORT_STATUSES
  ]);
  const [baseLocation, setBaseLocation] = reactExports.useState(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = reactExports.useState(null);
  const [uiDefaultsApplied, setUiDefaultsApplied] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemPrefersDark(event.matches);
    };
    const legacyMediaQuery = mediaQuery;
    const supportsAddEventListener = typeof mediaQuery.addEventListener === "function";
    if (supportsAddEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (typeof legacyMediaQuery.addListener === "function") {
      legacyMediaQuery.addListener(handleChange);
    }
    return () => {
      if (supportsAddEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (typeof legacyMediaQuery.removeListener === "function") {
        legacyMediaQuery.removeListener(handleChange);
      }
    };
  }, []);
  const resolvedTheme = themeMode === "system" ? systemPrefersDark ? "dark" : "light" : themeMode;
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const { document: document2 } = window;
    const root = document2.documentElement;
    const body = document2.body;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.dataset.theme = resolvedTheme;
    root.dataset.bsTheme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    if (body) {
      body.style.colorScheme = resolvedTheme;
    }
  }, [resolvedTheme]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY) {
        const nextThemeMode = parseThemeMode(event.newValue) ?? "system";
        setThemeModeState(
          (prev) => prev === nextThemeMode ? prev : nextThemeMode
        );
        return;
      }
      if (event.key === COLOR_CODING_STORAGE_KEY) {
        const nextEnabled = event.newValue === "true";
        setColorCodingEnabledState(
          (prev) => prev === nextEnabled ? prev : nextEnabled
        );
        return;
      }
      if (event.key === TRANSCRIPT_CORRECTION_STORAGE_KEY) {
        const nextEnabled = event.newValue === "true";
        setTranscriptCorrectionEnabledState(
          (prev) => prev === nextEnabled ? prev : nextEnabled
        );
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      COLOR_CODING_STORAGE_KEY,
      colorCodingEnabled ? "true" : "false"
    );
  }, [colorCodingEnabled]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      TRANSCRIPT_CORRECTION_STORAGE_KEY,
      transcriptCorrectionEnabled ? "true" : "false"
    );
  }, [transcriptCorrectionEnabled]);
  reactExports.useEffect(() => {
    if (uiDefaultsApplied) {
      return;
    }
    let cancelled = false;
    const loadUiConfig = async () => {
      try {
        const response = await fetch("/api/ui-config");
        if (!response.ok) {
          throw new Error(
            `Failed to load UI configuration (status ${response.status})`
          );
        }
        const data = await response.json();
        if (cancelled || !data) {
          return;
        }
        const hasStoredTheme = typeof window !== "undefined" ? window.localStorage.getItem(THEME_STORAGE_KEY) !== null : false;
        if (!hasStoredTheme && isThemeMode(data.themeMode)) {
          setThemeModeState(data.themeMode);
        }
        const hasStoredColorCoding = typeof window !== "undefined" ? window.localStorage.getItem(COLOR_CODING_STORAGE_KEY) !== null : false;
        if (!hasStoredColorCoding && typeof data.colorCodingEnabled === "boolean") {
          setColorCodingEnabledState(data.colorCodingEnabled);
        }
        const hasStoredTranscriptCorrection = typeof window !== "undefined" ? window.localStorage.getItem(TRANSCRIPT_CORRECTION_STORAGE_KEY) !== null : false;
        if (!hasStoredTranscriptCorrection && typeof data.transcriptCorrectionEnabled === "boolean") {
          setTranscriptCorrectionEnabledState(data.transcriptCorrectionEnabled);
        }
        if (Array.isArray(data.reviewExportStatuses)) {
          const seen2 = /* @__PURE__ */ new Set();
          const validStatuses = [];
          data.reviewExportStatuses.forEach((status) => {
            if (isTranscriptionReviewStatus(status) && !seen2.has(status)) {
              seen2.add(status);
              validStatuses.push(status);
            }
          });
          if (validStatuses.length > 0) {
            setDefaultReviewExportStatuses(validStatuses);
          }
        }
        const cfgBase = data.baseLocation;
        if (cfgBase && typeof cfgBase === "object") {
          const state = typeof cfgBase.state === "string" ? cfgBase.state.trim() : null;
          const country = typeof cfgBase.country === "string" ? cfgBase.country.trim() : null;
          if (state && state.length > 0 || country && country.length > 0) {
            setBaseLocation({ state: state || void 0, country: country || void 0 });
          }
        }
        const key = data.googleMapsApiKey;
        if (typeof key === "string" && key.trim().length > 0) {
          setGoogleMapsApiKey(key.trim());
        }
      } catch (error) {
        console.warn("Unable to load UI configuration", error);
      } finally {
        if (!cancelled) {
          setUiDefaultsApplied(true);
        }
      }
    };
    void loadUiConfig();
    return () => {
      cancelled = true;
    };
  }, [
    uiDefaultsApplied,
    setThemeModeState,
    setColorCodingEnabledState,
    setTranscriptCorrectionEnabledState,
    setDefaultReviewExportStatuses,
    setUiDefaultsApplied
  ]);
  const setThemeMode = reactExports.useCallback((mode) => {
    setThemeModeState(mode);
  }, []);
  const setColorCodingEnabled = reactExports.useCallback((enabled) => {
    setColorCodingEnabledState(enabled);
  }, []);
  const setTranscriptCorrectionEnabled = reactExports.useCallback((enabled) => {
    setTranscriptCorrectionEnabledState(enabled);
  }, []);
  const contextValue = reactExports.useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode,
      colorCodingEnabled,
      setColorCodingEnabled,
      transcriptCorrectionEnabled,
      setTranscriptCorrectionEnabled,
      defaultReviewExportStatuses,
      baseLocation,
      googleMapsApiKey
    }),
    [
      themeMode,
      resolvedTheme,
      setThemeMode,
      colorCodingEnabled,
      setColorCodingEnabled,
      transcriptCorrectionEnabled,
      setTranscriptCorrectionEnabled,
      defaultReviewExportStatuses,
      baseLocation,
      googleMapsApiKey
    ]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(UISettingsContext.Provider, { value: contextValue, children });
};
const useUISettings = () => {
  const context = reactExports.useContext(UISettingsContext);
  if (!context) {
    throw new Error("useUISettings must be used within a UISettingsProvider");
  }
  return context;
};
const useStreamTranscriptions = (streamId, authFetch, historyFetchLimit) => {
  const [state, setState] = reactExports.useState({
    transcriptions: [],
    hasMoreBefore: true,
    loading: false,
    error: null
  });
  const fetchTranscriptions = reactExports.useCallback(
    async (query) => {
      const params = new URLSearchParams(query);
      const response = await authFetch(
        `/api/streams/${streamId}/transcriptions?${params.toString()}`
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to fetch transcriptions (${response.status})`);
      }
      return await response.json();
    },
    [authFetch, streamId]
  );
  const loadEarlier = reactExports.useCallback(
    async (before) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const query = { limit: String(historyFetchLimit) };
        if (before)
          query.before = before;
        const data = await fetchTranscriptions(query);
        setState((prev) => {
          const combined = dedupeAndSortTranscriptions([
            ...data.transcriptions,
            ...prev.transcriptions
          ]);
          const hasMore = data.hasMoreBefore ?? data.transcriptions.length >= historyFetchLimit;
          return {
            transcriptions: combined,
            hasMoreBefore: hasMore,
            loading: false,
            error: null
          };
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load history"
        }));
      }
    },
    [fetchTranscriptions, historyFetchLimit]
  );
  const clear = reactExports.useCallback(() => {
    setState({ transcriptions: [], hasMoreBefore: true, loading: false, error: null });
  }, []);
  return { state, loadEarlier, clear };
};
const useStreamSearch = (streamId, authFetch, maxResults) => {
  const [input, setInput] = reactExports.useState("");
  const [state, setState] = reactExports.useState(null);
  const fetchTranscriptions = reactExports.useCallback(
    async (query) => {
      const params = new URLSearchParams(query);
      const response = await authFetch(
        `/api/streams/${streamId}/transcriptions?${params.toString()}`
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to fetch transcriptions (${response.status})`);
      }
      return await response.json();
    },
    [authFetch, streamId]
  );
  const search = reactExports.useCallback(
    async (query) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setState(null);
        setInput("");
        return;
      }
      setState({ query: trimmed, results: [], loading: true, error: null });
      try {
        const data = await fetchTranscriptions({
          search: trimmed,
          limit: String(maxResults),
          order: "desc"
        });
        setState({
          query: trimmed,
          results: data.transcriptions,
          loading: false,
          error: null
        });
      } catch (error) {
        setState({
          query: trimmed,
          results: [],
          loading: false,
          error: error instanceof Error ? error.message : "Search failed"
        });
      }
    },
    [fetchTranscriptions, maxResults]
  );
  const clear = reactExports.useCallback(() => {
    setState(null);
    setInput("");
  }, []);
  return { input, setInput, state, search, clear };
};
const useStreamFocusWindow = (streamId, authFetch, historyFetchLimit) => {
  const [state, setState] = reactExports.useState(null);
  const fetchTranscriptions = reactExports.useCallback(
    async (query) => {
      const params = new URLSearchParams(query);
      const response = await authFetch(
        `/api/streams/${streamId}/transcriptions?${params.toString()}`
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to fetch transcriptions (${response.status})`);
      }
      return await response.json();
    },
    [authFetch, streamId]
  );
  const goToTimestamp = reactExports.useCallback(
    async (timestamp, windowMinutes) => {
      setState({
        anchor: timestamp,
        windowMinutes,
        transcriptions: [],
        loading: true,
        error: null
      });
      try {
        const data = await fetchTranscriptions({
          around: timestamp,
          windowMinutes: String(windowMinutes),
          limit: String(Math.max(historyFetchLimit, windowMinutes * 6)),
          order: "asc"
        });
        setState({
          anchor: timestamp,
          windowMinutes,
          transcriptions: data.transcriptions,
          loading: false,
          error: null
        });
      } catch (error) {
        setState({
          anchor: timestamp,
          windowMinutes,
          transcriptions: [],
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load context"
        });
      }
    },
    [fetchTranscriptions, historyFetchLimit]
  );
  const clear = reactExports.useCallback(() => setState(null), []);
  return { state, goToTimestamp, clear };
};
const describeMediaError = (error) => {
  if (!error)
    return "Unable to play live audio.";
  switch (error.code) {
    case 1:
      return "Live audio playback was aborted.";
    case 2:
      return "Network error interrupted the live audio stream.";
    case 3:
      return "The browser could not decode the live audio stream.";
    case 4:
      return "Live audio stream format is not supported by this browser.";
    default:
      return "Unable to play live audio.";
  }
};
const useLiveAudio = (canListen, baseUrl) => {
  const [isListening, setIsListening] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const elementRef = reactExports.useRef(null);
  const [attachVersion, setAttachVersion] = reactExports.useState(0);
  const [streamNonce, setStreamNonce] = reactExports.useState(null);
  const source = reactExports.useMemo(() => {
    if (!baseUrl)
      return "";
    const url = new URL(baseUrl, window.location.origin);
    if (streamNonce) {
      url.searchParams.set("session", streamNonce);
    }
    return url.toString();
  }, [baseUrl, streamNonce]);
  const setAudio = reactExports.useCallback((node) => {
    elementRef.current = node;
    if (node) {
      console.info("[live-audio] element attached", {
        canPlayType: node.canPlayType("audio/wav")
      });
      setAttachVersion((prev) => prev + 1);
    } else {
      console.info("[live-audio] element detached");
      setAttachVersion((prev) => prev + 1);
    }
  }, []);
  const cleanup = reactExports.useCallback(() => {
    const audio = elementRef.current;
    if (!audio)
      return;
    console.info("[live-audio] cleanup invoked");
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
    }
  }, []);
  const start = reactExports.useCallback(() => {
    if (!canListen) {
      console.info("[live-audio] start skipped", { canListen });
      return;
    }
    setIsListening(true);
    setStreamNonce(`${Date.now()}`);
    setError(null);
    console.info("[live-audio] start requested", { canListen });
  }, [canListen]);
  const stop = reactExports.useCallback(() => {
    if (!isListening) {
      setStreamNonce(null);
      setError(null);
      return;
    }
    console.info("[live-audio] stop requested");
    setIsListening(false);
    setStreamNonce(null);
    setError(null);
    cleanup();
  }, [cleanup, isListening]);
  const toggle = reactExports.useCallback(() => {
    if (isListening) {
      stop();
      return;
    }
    start();
  }, [isListening, start, stop]);
  const syncToLiveEdge = reactExports.useCallback(() => {
    const audio = elementRef.current;
    if (!audio)
      return;
    try {
      const { seekable } = audio;
      if (!seekable || seekable.length === 0)
        return;
      const lastIndex = seekable.length - 1;
      const liveEdge = seekable.end(lastIndex);
      if (!Number.isFinite(liveEdge))
        return;
      const diff = Math.abs(audio.currentTime - liveEdge);
      if (diff < 1)
        return;
      audio.currentTime = liveEdge;
    } catch (err) {
      console.warn("⚠️ Unable to synchronize live audio position:", err);
    }
  }, []);
  const onReady = reactExports.useCallback(() => {
    console.debug("[live-audio] ready event fired");
    syncToLiveEdge();
  }, [syncToLiveEdge]);
  const onPlay = reactExports.useCallback(() => {
    setError(null);
    console.info("[live-audio] playback started");
    syncToLiveEdge();
  }, [syncToLiveEdge]);
  const onError = reactExports.useCallback(() => {
    const audio = elementRef.current;
    const mediaError = (audio == null ? void 0 : audio.error) ?? null;
    const message = describeMediaError(mediaError);
    if (mediaError) {
      console.error("❌ Live audio playback error:", {
        code: mediaError.code,
        message: mediaError.message || message,
        MEDIA_ERR_ABORTED: mediaError.code === 1,
        MEDIA_ERR_NETWORK: mediaError.code === 2,
        MEDIA_ERR_DECODE: mediaError.code === 3,
        MEDIA_ERR_SRC_NOT_SUPPORTED: mediaError.code === 4
      });
    } else {
      console.error("❌ Live audio playback error: unknown error (no MediaError)");
    }
    setError(message);
  }, []);
  reactExports.useEffect(() => {
    if (!isListening)
      return;
    const audio = elementRef.current;
    if (!audio) {
      console.debug("[live-audio] awaiting audio element attachment");
      return;
    }
    if (source) {
      const absoluteSrc = new URL(source, window.location.origin).toString();
      const needsUpdate = audio.src !== absoluteSrc;
      if (needsUpdate) {
        console.info("[live-audio] updating audio src", { source });
        audio.src = source;
      }
      console.info("[live-audio] loading audio", { needsUpdate, absoluteSrc });
      audio.load();
    }
    if (streamNonce) {
      console.info("[live-audio] initiating playback", { streamNonce });
    }
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(
        (err) => console.warn("⚠️ Live audio playback was blocked by the browser:", err)
      );
    }
  }, [isListening, source, streamNonce, attachVersion]);
  reactExports.useEffect(() => {
    if (isListening && !canListen) {
      setIsListening(false);
    }
  }, [canListen, isListening]);
  reactExports.useEffect(() => cleanup, [cleanup]);
  return {
    isListening,
    error,
    audioRef: setAudio,
    toggle,
    start,
    stop,
    onReady,
    onPlay,
    onError,
    cleanup,
    streamNonce,
    source
  };
};
const DEFAULT_FAVICON_HREF = "/favicon.svg";
const queryFaviconLink = () => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.querySelector("link[rel~='icon']");
};
const createFaviconState = () => {
  let defaultHref = null;
  const set = (href) => {
    const link = queryFaviconLink();
    if (!link) {
      return;
    }
    if (defaultHref === null) {
      defaultHref = link.getAttribute("href");
    }
    if (link.getAttribute("href") !== href) {
      link.setAttribute("href", href);
    }
  };
  const reset = () => {
    const link = queryFaviconLink();
    if (!link) {
      return;
    }
    const fallbackHref = defaultHref ?? DEFAULT_FAVICON_HREF;
    if (link.getAttribute("href") !== fallbackHref) {
      link.setAttribute("href", fallbackHref);
    }
  };
  return { set, reset };
};
const LiveAudioContext = reactExports.createContext(
  void 0
);
const LiveAudioProvider = ({ children }) => {
  const [activeStream, setActiveStream] = reactExports.useState(null);
  const [pendingAction, setPendingAction] = reactExports.useState(null);
  const liveAudio = useLiveAudio(Boolean(activeStream == null ? void 0 : activeStream.canListen), (activeStream == null ? void 0 : activeStream.baseUrl) ?? "");
  const faviconStateRef = reactExports.useRef(createFaviconState());
  reactExports.useEffect(() => {
    const faviconState = faviconStateRef.current;
    if (liveAudio.isListening) {
      faviconState.set("/favicon-live.svg");
    } else {
      faviconState.reset();
    }
    return () => {
      faviconState.reset();
    };
  }, [liveAudio.isListening]);
  reactExports.useEffect(() => {
    if (!pendingAction) {
      return;
    }
    if (pendingAction === "stop") {
      liveAudio.stop();
      setActiveStream(null);
      setPendingAction(null);
      return;
    }
    if (pendingAction === "start") {
      if (!activeStream) {
        setPendingAction(null);
        return;
      }
      liveAudio.start();
      setPendingAction(null);
    }
  }, [pendingAction, liveAudio, activeStream]);
  const listen = reactExports.useCallback(
    (descriptor) => {
      if (!descriptor.canListen) {
        console.info("[live-audio] listen skipped; stream unavailable", {
          streamId: descriptor.id
        });
        return;
      }
      setActiveStream((current) => {
        if (current && current.id === descriptor.id) {
          return descriptor;
        }
        return descriptor;
      });
      setPendingAction("start");
    },
    []
  );
  const stop = reactExports.useCallback(() => {
    if (!liveAudio.isListening) {
      setActiveStream(null);
      setPendingAction(null);
      return;
    }
    setPendingAction("stop");
  }, [liveAudio.isListening]);
  const isActiveStream = reactExports.useCallback(
    (streamId) => (activeStream == null ? void 0 : activeStream.id) === streamId,
    [activeStream]
  );
  const contextValue = reactExports.useMemo(
    () => ({
      activeStream,
      isListening: liveAudio.isListening,
      error: liveAudio.error,
      listen,
      stop,
      isActiveStream,
      streamNonce: liveAudio.streamNonce,
      source: liveAudio.source,
      audioRef: liveAudio.audioRef,
      onReady: liveAudio.onReady,
      onPlay: liveAudio.onPlay,
      onError: liveAudio.onError
    }),
    [activeStream, isActiveStream, listen, liveAudio, stop]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(LiveAudioContext.Provider, { value: contextValue, children: [
    children,
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "audio",
      {
        ref: liveAudio.audioRef,
        className: "visually-hidden",
        autoPlay: true,
        playsInline: true,
        preload: "none",
        src: liveAudio.source,
        "data-live-session": liveAudio.streamNonce ?? void 0,
        "data-live-stream-id": (activeStream == null ? void 0 : activeStream.id) ?? void 0,
        onLoadedMetadata: liveAudio.onReady,
        onCanPlay: liveAudio.onReady,
        onPlay: liveAudio.onPlay,
        onPlaying: liveAudio.onPlay,
        onError: liveAudio.onError
      }
    )
  ] });
};
const useLiveAudioSession = () => {
  const context = reactExports.useContext(LiveAudioContext);
  if (!context) {
    throw new Error("useLiveAudioSession must be used within a LiveAudioProvider");
  }
  return context;
};
function r(e) {
  var t2, f2, n2 = "";
  if ("string" == typeof e || "number" == typeof e)
    n2 += e;
  else if ("object" == typeof e)
    if (Array.isArray(e)) {
      var o = e.length;
      for (t2 = 0; t2 < o; t2++)
        e[t2] && (f2 = r(e[t2])) && (n2 && (n2 += " "), n2 += f2);
    } else
      for (f2 in e)
        e[f2] && (n2 && (n2 += " "), n2 += f2);
  return n2;
}
function clsx() {
  for (var e, t2, f2 = 0, n2 = "", o = arguments.length; f2 < o; f2++)
    (e = arguments[f2]) && (t2 = r(e)) && (n2 && (n2 += " "), n2 += t2);
  return n2;
}
const BUTTON_STYLES = {
  default: { filled: "btn-secondary", outline: "btn-outline-secondary" },
  primary: { filled: "btn-primary", outline: "btn-outline-primary" },
  secondary: { filled: "btn-secondary", outline: "btn-outline-secondary" },
  success: { filled: "btn-success", outline: "btn-outline-success" },
  create: { filled: "btn-success", outline: "btn-outline-success" },
  danger: { filled: "btn-danger", outline: "btn-outline-danger" },
  destroy: { filled: "btn-danger", outline: "btn-outline-danger" },
  warning: { filled: "btn-warning", outline: "btn-outline-warning" },
  light: { filled: "btn-light", outline: "btn-outline-light" },
  link: { filled: "btn-link" },
  close: { filled: "btn-close", includeBaseClass: false },
  unstyled: { filled: "", includeBaseClass: false }
};
const Button = reactExports.forwardRef(
  ({
    use = "default",
    appearance = "filled",
    size = "md",
    startContent,
    endContent,
    tooltip,
    className,
    children,
    type = "button",
    isContentInline,
    isCondensed = false,
    title: htmlTitle,
    ...rest
  }, ref) => {
    const { ["aria-label"]: ariaLabelProp, ...buttonRest } = rest;
    const style = BUTTON_STYLES[use] ?? BUTTON_STYLES.default;
    const includeBaseClass = style.includeBaseClass ?? true;
    const variantClass = appearance === "outline" ? style.outline ?? style.filled ?? "" : style.filled ?? style.outline ?? "";
    const shouldApplyContentLayout = isContentInline ?? Boolean(startContent || endContent);
    const sizeClass = includeBaseClass && size !== "md" ? `btn-${size}` : void 0;
    const labelText = typeof children === "string" ? children : typeof tooltip === "string" ? tooltip : typeof htmlTitle === "string" ? htmlTitle : void 0;
    const resolvedTitle = tooltip ?? htmlTitle ?? (isCondensed ? labelText : void 0);
    const resolvedAriaLabel = ariaLabelProp ?? (isCondensed ? labelText : void 0);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        ...buttonRest,
        ref,
        type,
        title: resolvedTitle,
        "aria-label": resolvedAriaLabel,
        className: clsx(
          includeBaseClass && "btn",
          includeBaseClass && sizeClass,
          variantClass,
          includeBaseClass && shouldApplyContentLayout && "d-inline-flex align-items-center gap-2",
          isCondensed && "btn-condensed",
          className
        ),
        children: [
          startContent,
          isCondensed ? children != null && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "visually-hidden", children }) : children,
          endContent
        ]
      }
    );
  }
);
Button.displayName = "Button";
const ButtonGroup = reactExports.forwardRef(
  ({
    size = "md",
    isVertical = false,
    className,
    role = "group",
    overflowButtons,
    overflowPlacement = "end",
    overflowLabel = "More actions",
    children,
    ...rest
  }, ref) => {
    const [isOverflowOpen, setIsOverflowOpen] = reactExports.useState(false);
    const groupRef = reactExports.useRef(null);
    const overflowRef = reactExports.useRef(null);
    const assignRefs = reactExports.useCallback(
      (node) => {
        groupRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );
    const overflowItems = reactExports.useMemo(() => {
      if (Array.isArray(overflowButtons)) {
        return overflowButtons.flatMap(
          (item) => item === null || item === void 0 ? [] : [item]
        );
      }
      return overflowButtons == null ? [] : [overflowButtons];
    }, [overflowButtons]);
    const hasOverflow = overflowItems.length > 0;
    reactExports.useEffect(() => {
      if (!isOverflowOpen) {
        return;
      }
      const handlePointerDown = (event) => {
        var _a2;
        const target = event.target;
        if (!target) {
          return;
        }
        if ((_a2 = overflowRef.current) == null ? void 0 : _a2.contains(target)) {
          return;
        }
        setIsOverflowOpen(false);
      };
      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          setIsOverflowOpen(false);
        }
      };
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOverflowOpen]);
    reactExports.useEffect(() => {
      if (!hasOverflow) {
        setIsOverflowOpen(false);
      }
    }, [hasOverflow]);
    const enhancedOverflowItems = reactExports.useMemo(
      () => overflowItems.map((item, index2) => {
        var _a2;
        if (!reactExports.isValidElement(item)) {
          return item;
        }
        const existingOnClick = (_a2 = item.props) == null ? void 0 : _a2.onClick;
        const handleClick = (event) => {
          if (typeof existingOnClick === "function") {
            existingOnClick(event);
          }
          if (!(event instanceof Event && event.defaultPrevented) && !(event && typeof event === "object" && "defaultPrevented" in event && event.defaultPrevented)) {
            setIsOverflowOpen(false);
          }
        };
        return reactExports.cloneElement(item, {
          key: item.key ?? `overflow-${index2}`,
          onClick: handleClick
        });
      }),
      [overflowItems]
    );
    const overflowMenu = hasOverflow ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-group__overflow", ref: overflowRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size,
          use: "secondary",
          appearance: "outline",
          isCondensed: true,
          tooltip: overflowLabel,
          "aria-haspopup": "menu",
          "aria-expanded": isOverflowOpen,
          onClick: () => setIsOverflowOpen((open) => !open),
          startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(MoreHorizontal, { size: 16 }),
          children: overflowLabel
        }
      ),
      isOverflowOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          role: "menu",
          className: clsx(
            "btn-group__overflow-menu",
            overflowPlacement === "start" ? "btn-group__overflow-menu--align-start" : "btn-group__overflow-menu--align-end"
          ),
          children: enhancedOverflowItems
        }
      ) : null
    ] }) : null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        ...rest,
        ref: assignRefs,
        role,
        className: clsx(
          isVertical ? "btn-group-vertical" : "btn-group",
          size !== "md" ? `btn-group-${size}` : void 0,
          className
        ),
        children: [
          hasOverflow && overflowPlacement === "start" ? overflowMenu : null,
          children,
          hasOverflow && overflowPlacement === "end" ? overflowMenu : null
        ]
      }
    );
  }
);
ButtonGroup.displayName = "ButtonGroup";
const Dialog = ({
  open,
  onClose,
  title,
  id: id2,
  titleId,
  fullscreen,
  overlayClassName,
  dialogClassName,
  headerClassName,
  bodyClassName,
  closeAriaLabel,
  children
}) => {
  const autoId = reactExports.useId();
  const resolvedTitleId = titleId ?? `${id2 ?? autoId}-title`;
  if (!open)
    return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: ["app-modal", fullscreen ? "app-modal--fullscreen" : "", overlayClassName ?? ""].filter(Boolean).join(" "),
      role: "presentation",
      onClick: onClose,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: [
            "app-modal__dialog",
            fullscreen ? "app-modal__dialog--fullscreen" : "",
            dialogClassName ?? ""
          ].filter(Boolean).join(" "),
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": resolvedTitleId,
          id: id2,
          onClick: (event) => event.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: [
                  "app-modal__header d-flex align-items-start justify-content-between gap-3",
                  headerClassName ?? ""
                ].filter(Boolean).join(" "),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "h5 mb-0", id: resolvedTitleId, children: title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      use: "secondary",
                      onClick: onClose,
                      "aria-label": closeAriaLabel ?? "Close dialog",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: ["app-modal__body", bodyClassName ?? ""].filter(Boolean).join(" "), children })
          ]
        }
      )
    }
  );
};
const StandaloneSearchDialog = ({
  open,
  onClose,
  sanitizedStreamId,
  children
}) => {
  const titleId = `standalone-search-${sanitizedStreamId}-title`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open,
      onClose,
      title: "Search transcripts",
      id: `standalone-search-${sanitizedStreamId}`,
      titleId,
      dialogClassName: "standalone-tool-dialog",
      bodyClassName: "standalone-tool-dialog__body",
      closeAriaLabel: "Close search dialog",
      children
    }
  );
};
const JumpForm = ({
  timestampValue,
  windowMinutes,
  isLoading,
  onTimestampChange,
  onWindowMinutesChange,
  onSubmit,
  formClassName
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "form",
    {
      className: formClassName ?? "transcript-stream__jump-form",
      onSubmit: (event) => {
        event.preventDefault();
        onSubmit(timestampValue, windowMinutes);
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__jump-inputs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__jump-input", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "datetime-local",
              value: timestampValue,
              onChange: (event) => onTimestampChange(event.target.value),
              className: "form-control form-control-sm"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: String(windowMinutes),
            onChange: (event) => onWindowMinutesChange(Number(event.target.value)),
            className: "form-select form-select-sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "5", children: "±5 min" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "10", children: "±10 min" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "30", children: "±30 min" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "submit",
            size: "sm",
            use: "success",
            disabled: isLoading,
            isContentInline: isLoading ? false : void 0,
            children: isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin" }) : "Go"
          }
        )
      ] })
    }
  );
};
const StandaloneJumpDialog = ({
  open,
  onClose,
  sanitizedStreamId,
  timestampValue,
  windowMinutes,
  isLoading,
  error,
  onTimestampChange,
  onWindowMinutesChange,
  onSubmit
}) => {
  const titleId = `standalone-jump-${sanitizedStreamId}-title`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Dialog,
    {
      open,
      onClose,
      title: "Go to timestamp",
      id: `standalone-jump-${sanitizedStreamId}`,
      titleId,
      dialogClassName: "standalone-tool-dialog",
      bodyClassName: "standalone-tool-dialog__body",
      closeAriaLabel: "Close go to timestamp dialog",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          JumpForm,
          {
            formClassName: "transcript-stream__jump-form standalone-tool-dialog__form",
            timestampValue,
            windowMinutes,
            isLoading,
            onTimestampChange,
            onWindowMinutesChange,
            onSubmit
          }
        ),
        error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-danger small", role: "alert", children: error }) : null
      ]
    }
  );
};
const defaultTimeOptions = { hour12: false };
const defaultDateTimeOptions = { hour12: false };
const defaultTitleOptions = {
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short"
};
const parseTimestampValue = (value) => {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatLabel$1 = (date, mode, {
  timeOptions,
  dateOptions,
  dateTimeOptions
}) => {
  switch (mode) {
    case "date":
      return date.toLocaleDateString([], dateOptions);
    case "datetime":
      return date.toLocaleString([], dateTimeOptions ?? defaultDateTimeOptions);
    case "time":
    default:
      return date.toLocaleTimeString([], timeOptions ?? defaultTimeOptions);
  }
};
const Timestamp = ({
  value,
  mode = "time",
  prefix = null,
  suffix = null,
  showDate = false,
  dateClassName,
  timeOptions,
  dateOptions,
  dateTimeOptions,
  titleOptions,
  titleFormatter,
  renderLabel,
  className,
  ...rest
}) => {
  const { title: explicitTitle, ...restProps } = rest;
  const parsedDate = parseTimestampValue(value);
  if (!parsedDate) {
    return null;
  }
  const label = formatLabel$1(parsedDate, mode, {
    timeOptions,
    dateOptions,
    dateTimeOptions
  });
  const dateLabel = parsedDate.toLocaleDateString([], dateOptions);
  const iso = parsedDate.toISOString();
  const baseTitle = parsedDate.toLocaleString([], titleOptions ?? defaultTitleOptions);
  const details = {
    date: parsedDate,
    label,
    dateLabel,
    iso,
    title: baseTitle,
    mode
  };
  const formattedTitle = titleFormatter ? titleFormatter(details) : void 0;
  const computedTitle = explicitTitle ?? formattedTitle ?? details.title;
  const content = renderLabel ? renderLabel(details) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    prefix,
    details.label,
    suffix,
    showDate && details.dateLabel ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: dateClassName, children: [
      "(",
      details.dateLabel,
      ")"
    ] }) : null
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "time",
    {
      ...restProps,
      className,
      dateTime: details.iso,
      title: computedTitle,
      children: content
    }
  );
};
const clampAccuracyPercentage$1 = (value) => {
  if (!Number.isFinite(value))
    return 0;
  return Math.min(100, Math.max(0, value));
};
const formatDurationSeconds$1 = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0)
    return "0s";
  if (seconds < 60) {
    const rounded = seconds.toFixed(seconds >= 10 ? 0 : 1);
    return `${rounded.replace(/\.0$/, "")}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const roundedSeconds = remainingSeconds.toFixed(remainingSeconds >= 10 ? 0 : 1);
  if (Number(roundedSeconds) === 0)
    return `${minutes}m`;
  return `${minutes}m ${roundedSeconds.replace(/\.0$/, "")}s`;
};
const StandaloneStatsDialog = ({
  open,
  onClose,
  sanitizedStreamId,
  metrics
}) => {
  const titleId = `standalone-stats-${sanitizedStreamId}-title`;
  const hasMetricsData = metrics.transcriptionCount > 0;
  const lastMetricsTimestamp = typeof metrics.lastTranscriptionTime === "number" && Number.isFinite(metrics.lastTranscriptionTime) ? metrics.lastTranscriptionTime : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open,
      onClose,
      title: "Stream statistics",
      id: `standalone-stats-${sanitizedStreamId}`,
      titleId,
      dialogClassName: "standalone-tool-dialog",
      bodyClassName: "standalone-tool-dialog__body",
      closeAriaLabel: "Close stats dialog",
      children: hasMetricsData ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__stats-title", children: "Performance summary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "conversation-panel__stats-list", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__stats-item", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Transcriptions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: metrics.transcriptionCount })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__stats-item", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Avg confidence" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { children: [
              clampAccuracyPercentage$1(metrics.averageAccuracy).toFixed(1),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__stats-item", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Avg duration" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: formatDurationSeconds$1(metrics.averageDuration) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__stats-item", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { children: "Total duration" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { children: formatDurationSeconds$1(metrics.totalDuration) })
          ] })
        ] }),
        lastMetricsTimestamp ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__stats-footer", children: [
          "Last transcription: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: lastMetricsTimestamp, mode: "datetime" })
        ] }) : null
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__stats-empty", children: "No transcription metrics available yet." })
    }
  );
};
const parseDate = (value) => {
  if (value instanceof Date) {
    const t22 = value.getTime();
    return Number.isFinite(t22) ? t22 : null;
  }
  const t2 = new Date(value).getTime();
  return Number.isFinite(t2) ? t2 : null;
};
const pluralize = (value, unit) => {
  const v2 = Math.round(value);
  return `${v2} ${unit}${v2 === 1 ? "" : "s"}`;
};
const toShortUnit = (unit) => {
  switch (unit) {
    case "second":
      return "s";
    case "minute":
      return "m";
    case "hour":
      return "h";
    case "day":
      return "d";
    case "week":
      return "w";
    case "month":
      return "mo";
    case "year":
      return "y";
  }
};
const formatInterval = (targetMs, nowMs, condensed) => {
  const diffMs = targetMs - nowMs;
  const past = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const sec = 1e3;
  const min = 60 * sec;
  const hr = 60 * min;
  const day = 24 * hr;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  let unit;
  let value;
  if (absMs < 45 * sec) {
    const longLabel2 = past ? "just now" : "in a few seconds";
    const label2 = condensed ? past ? "now" : "<1m" : longLabel2;
    return { label: label2, longLabel: longLabel2 };
  }
  if (absMs < 90 * sec) {
    unit = "minute";
    value = 1;
  } else if (absMs < 45 * min) {
    unit = "minute";
    value = Math.round(absMs / min);
  } else if (absMs < 90 * min) {
    unit = "hour";
    value = 1;
  } else if (absMs < 22 * hr) {
    unit = "hour";
    value = Math.round(absMs / hr);
  } else if (absMs < 36 * hr) {
    const longLabel2 = past ? "yesterday" : "tomorrow";
    const label2 = condensed ? past ? "1d ago" : "in 1d" : longLabel2;
    return { label: label2, longLabel: longLabel2 };
  } else if (absMs < 7 * day) {
    unit = "day";
    value = Math.round(absMs / day);
  } else if (absMs < 4 * week) {
    unit = "week";
    value = Math.round(absMs / week);
  } else if (absMs < 12 * month) {
    unit = "month";
    value = Math.round(absMs / month);
  } else {
    unit = "year";
    value = Math.round(absMs / year);
  }
  const longCore = condensed ? `${Math.round(value)}${toShortUnit(unit)}` : pluralize(value, unit);
  const longLabel = past ? `${longCore} ago` : `in ${longCore}`;
  const label = condensed ? past ? `${longCore} ago` : `in ${longCore}` : longLabel;
  return { label, longLabel };
};
const computeAdaptiveRefreshMs = (absDiffMs) => {
  if (absDiffMs < 30 * 1e3)
    return 1e3;
  if (absDiffMs < 60 * 1e3)
    return 5e3;
  if (absDiffMs < 60 * 60 * 1e3)
    return 30 * 1e3;
  if (absDiffMs < 24 * 60 * 60 * 1e3)
    return 60 * 1e3;
  return 60 * 60 * 1e3;
};
const TimeInterval = ({
  value,
  condensed = false,
  refreshMs,
  now,
  className,
  title,
  ...rest
}) => {
  const targetMs = reactExports.useMemo(() => parseDate(value), [value]);
  const initialNow = reactExports.useMemo(() => {
    if (now instanceof Date)
      return now.getTime();
    if (typeof now === "number")
      return now;
    return Date.now();
  }, [now]);
  const [nowMs, setNowMs] = reactExports.useState(initialNow);
  reactExports.useEffect(() => {
    if (typeof targetMs !== "number")
      return;
    if (refreshMs === false || refreshMs === 0)
      return;
    const currentDiff = Math.abs(targetMs - Date.now());
    const interval = typeof refreshMs === "number" && refreshMs > 0 ? refreshMs : computeAdaptiveRefreshMs(currentDiff);
    const id2 = window.setInterval(() => setNowMs(Date.now()), interval);
    return () => window.clearInterval(id2);
  }, [targetMs, refreshMs]);
  if (typeof targetMs !== "number") {
    return null;
  }
  const { label, longLabel } = formatInterval(targetMs, nowMs, condensed);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      ...rest,
      className,
      title: title ?? longLabel,
      "aria-label": longLabel,
      children: label
    }
  );
};
const AlertChips = ({
  triggers,
  mode = "collapsed",
  className,
  idPrefix = "alert",
  iconSize = 14
}) => {
  const chips = reactExports.useMemo(() => {
    const safeTriggers = Array.isArray(triggers) ? triggers : [];
    if (safeTriggers.length === 0)
      return [];
    const baseClass = "chip-button chip-button--danger";
    const classes = className ? `${baseClass} ${className}` : baseClass;
    if (mode === "collapsed") {
      const text = safeTriggers.map((t2) => t2.label || t2.ruleId).filter(Boolean).join(", ");
      return [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: classes, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: iconSize }),
          text
        ] }, `${idPrefix}`)
      ];
    }
    const byRule = /* @__PURE__ */ new Map();
    safeTriggers.forEach((t2) => {
      if (!byRule.has(t2.ruleId))
        byRule.set(t2.ruleId, t2);
    });
    return Array.from(byRule.values()).map((t2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: classes, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: iconSize }),
      t2.label ?? t2.ruleId
    ] }, `${idPrefix}-${t2.ruleId}`));
  }, [className, iconSize, idPrefix, mode, triggers]);
  if (chips.length === 0)
    return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: chips });
};
const TranscriptSegmentButton = "";
const clampConfidence = (value) => Math.max(0, Math.min(1, value));
const calculateSegmentConfidence = (segment) => {
  if (typeof segment.avg_logprob !== "number" || Number.isNaN(segment.avg_logprob)) {
    return null;
  }
  const confidence = Math.exp(segment.avg_logprob);
  if (!Number.isFinite(confidence)) {
    return null;
  }
  return clampConfidence(confidence);
};
const getConfidenceStyles = (confidence, colorCodingEnabled) => {
  if (!colorCodingEnabled || confidence === null) {
    return "transcript-segment--unknown";
  }
  if (confidence >= 0.8) {
    return "transcript-segment--high";
  }
  if (confidence >= 0.6) {
    return "transcript-segment--medium";
  }
  return "transcript-segment--low";
};
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor(safeSeconds % 3600 / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
const formatDuration = (seconds) => {
  const rounded = Math.max(0, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};
const TranscriptSegmentPlaybackButton = ({
  onClick,
  isPlaying,
  disabled,
  tooltip,
  confidenceClass,
  isWaveformHovered,
  children
}) => {
  const segmentClassName = clsx(
    "transcript-segment",
    confidenceClass,
    isPlaying && "transcript-segment--playing",
    disabled && "transcript-segment--static",
    isWaveformHovered && "transcript-segment--waveform-hovered"
  );
  const core = disabled ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: segmentClassName, "aria-disabled": "true", title: tooltip, children }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button,
    {
      use: "unstyled",
      onClick,
      tooltip,
      className: segmentClassName,
      children
    }
  );
  return core;
};
const TranscriptSegmentTimeRange = ({
  startTime,
  endTime,
  duration
}) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-segment__time", children: duration > 0 ? `${formatTime(startTime)} → ${formatTime(endTime)}` : formatTime(startTime) });
const TranscriptSegmentText = ({
  children
}) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-segment__text", children });
const TranscriptSegmentContent = ({
  startTime,
  endTime,
  duration,
  text,
  showTime,
  trailingAction
}) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TranscriptSegmentText, { children: [
  showTime ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TranscriptSegmentTimeRange,
      {
        startTime,
        endTime,
        duration
      }
    ),
    " "
  ] }) : null,
  text,
  trailingAction ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-segment__inline-action", children: trailingAction }) : null
] });
const TranscriptSegmentListItem = ({
  segment,
  recordingUrl,
  transcriptionId,
  isPlaying,
  onPlay,
  displayOffsetSeconds,
  recordingStartOffset,
  trailingAction,
  originalText
}) => {
  const { colorCodingEnabled } = useUISettings();
  const hoveredContext = useHoveredSegmentOptional();
  const segmentConfidence = reactExports.useMemo(
    () => calculateSegmentConfidence(segment),
    [segment]
  );
  const confidenceClass = reactExports.useMemo(
    () => getConfidenceStyles(segmentConfidence, colorCodingEnabled),
    [segmentConfidence, colorCodingEnabled]
  );
  const isWaveformHovered = reactExports.useMemo(() => {
    if (!(hoveredContext == null ? void 0 : hoveredContext.hoveredSegmentId) || segment.id < 0)
      return false;
    const thisSegmentId = buildHoveredSegmentId(transcriptionId, segment.id);
    return hoveredContext.hoveredSegmentId === thisSegmentId;
  }, [hoveredContext == null ? void 0 : hoveredContext.hoveredSegmentId, transcriptionId, segment.id]);
  const segmentStart = Math.max(
    0,
    typeof displayOffsetSeconds === "number" && Number.isFinite(displayOffsetSeconds) ? displayOffsetSeconds : segment.start
  );
  const segmentEnd = Math.max(segmentStart, segment.end ?? segment.start);
  const segmentDuration = Math.max(0, segmentEnd - segmentStart);
  const hasRecording = Boolean(recordingUrl);
  const isNoTranscription = segment.id === -1 && typeof segment.text === "string" && segment.text.trim().toLowerCase() === "no transcription";
  const renderedText = isNoTranscription ? /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "No transcription" }) : segment.text;
  const handleClick = () => {
    if (hasRecording && recordingUrl) {
      onPlay(recordingUrl, segment.start, segment.end, transcriptionId, {
        recordingStartOffset
      });
    }
  };
  const tooltipParts = [];
  if (originalText) {
    tooltipParts.push(`Original: ${originalText}`);
  }
  if (segmentConfidence !== null) {
    tooltipParts.push(`${Math.round(segmentConfidence * 100)}% confidence`);
  }
  if (hasRecording) {
    tooltipParts.push(`Starts at ${formatTime(segmentStart)}`);
    if (segmentDuration > 0) {
      tooltipParts.push(`Duration ${formatDuration(segmentDuration)}`);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    TranscriptSegmentPlaybackButton,
    {
      onClick: handleClick,
      disabled: !hasRecording,
      tooltip: tooltipParts.join(" • ") || void 0,
      confidenceClass,
      isPlaying,
      isWaveformHovered,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TranscriptSegmentContent,
        {
          startTime: segmentStart,
          endTime: segmentEnd,
          duration: segmentDuration,
          text: renderedText,
          showTime: hasRecording,
          trailingAction
        }
      )
    }
  );
};
const TranscriptBoundaryMarker = ({
  label,
  timeSeconds
}) => {
  const safeTime = Math.max(0, timeSeconds);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "transcript-boundary", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-boundary__time", children: formatTime(safeTime) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tracking-wide", children: label ?? "END" })
  ] });
};
const TranscriptionSegmentChips$1 = "";
const buildSegmentIdentifier = (recordingId, transcriptionId, segment) => recordingId ? `${recordingId}-${segment.start}-${segment.end}` : `${transcriptionId}-${segment.start}-${segment.end}`;
const DEFAULT_DOWNLOAD_EXTENSION = "wav";
const sanitizeFilenameFragment = (value) => value.trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "").toLowerCase();
const extractFilenameFromUrl = (recordingUrl) => {
  var _a2;
  if (!recordingUrl) {
    return null;
  }
  try {
    const parsedUrl = new URL(recordingUrl);
    const pathname = parsedUrl.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const candidate = segments.pop();
    if (candidate) {
      return candidate;
    }
  } catch {
    const withoutQuery = ((_a2 = recordingUrl.split("?")[0]) == null ? void 0 : _a2.split("#")[0]) ?? recordingUrl;
    const segments = withoutQuery.split("/").filter(Boolean);
    const candidate = segments.pop();
    if (candidate) {
      return candidate;
    }
  }
  return null;
};
const deriveDownloadFilename = (recordingUrl, transcriptionId) => {
  var _a2;
  const candidate = (_a2 = extractFilenameFromUrl(recordingUrl)) == null ? void 0 : _a2.trim();
  if (candidate) {
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(candidate);
    return hasExtension ? candidate : `${candidate}.${DEFAULT_DOWNLOAD_EXTENSION}`;
  }
  const sanitizedId = sanitizeFilenameFragment(transcriptionId) || "transcription";
  return `${sanitizedId}.${DEFAULT_DOWNLOAD_EXTENSION}`;
};
const formatTimeLabel = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor(safeSeconds % 3600 / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
const RecordingDownloadButton = ({
  recordingUrl,
  transcriptionId,
  label
}) => {
  const handleDownload = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!recordingUrl) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const link = document.createElement("a");
    link.href = recordingUrl;
    link.rel = "noopener";
    link.download = deriveDownloadFilename(recordingUrl, transcriptionId);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button,
    {
      use: "unstyled",
      className: "transcript-segment__download-button",
      onClick: handleDownload,
      startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 20, "aria-hidden": "true" }),
      isCondensed: true,
      children: label
    }
  );
};
const SegmentPlaybackChip = ({
  transcription,
  segment,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlay,
  isSegmentCurrentlyPlaying,
  displayOffsetSeconds,
  originalText
}) => {
  const segmentIdentifier = buildSegmentIdentifier(
    recordingId,
    transcription.id,
    segment
  );
  const normalizedRecordingUrl = (recordingUrl == null ? void 0 : recordingUrl.trim()) ?? null;
  const hasRecording = Boolean(normalizedRecordingUrl);
  const isPlaying = Boolean(
    recordingId && playingSegmentId === segmentIdentifier || hasRecording && normalizedRecordingUrl && isSegmentCurrentlyPlaying(
      normalizedRecordingUrl,
      segment.start,
      segment.end
    )
  );
  const segmentStart = Math.max(
    0,
    typeof displayOffsetSeconds === "number" && Number.isFinite(displayOffsetSeconds) ? displayOffsetSeconds : segment.start
  );
  const segmentEnd = Math.max(segmentStart, segment.end ?? segment.start);
  const segmentDuration = Math.max(0, segmentEnd - segmentStart);
  const trailingAction = hasRecording && normalizedRecordingUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    RecordingDownloadButton,
    {
      recordingUrl: normalizedRecordingUrl,
      transcriptionId: transcription.id,
      label: segmentDuration ? `Download audio from ${formatTimeLabel(segmentStart)} to ${formatTimeLabel(segmentEnd)}` : `Download audio at ${formatTimeLabel(segmentStart)}`
    }
  ) : null;
  const effectiveOriginalText = originalText ?? (transcription.correctedText ? transcription.text : void 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    TranscriptSegmentListItem,
    {
      segment,
      recordingUrl: normalizedRecordingUrl ?? void 0,
      transcriptionId: transcription.id,
      isPlaying,
      onPlay,
      displayOffsetSeconds,
      recordingStartOffset: transcription.recordingStartOffset,
      trailingAction: trailingAction ?? void 0,
      originalText: effectiveOriginalText
    }
  );
};
const SilenceSegmentChip = ({
  transcription,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlay,
  isSegmentCurrentlyPlaying
}) => {
  const { start, end } = getBlankAudioSegmentBounds(transcription);
  const segment = {
    id: -1,
    text: "No transcription",
    start,
    end,
    avg_logprob: Number.NaN,
    no_speech_prob: Number.NaN,
    temperature: Number.NaN,
    compression_ratio: Number.NaN,
    seek: -1
  };
  if (recordingUrl && recordingId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SegmentPlaybackChip,
      {
        transcription,
        segment,
        recordingUrl,
        recordingId,
        playingSegmentId,
        onPlay,
        isSegmentCurrentlyPlaying,
        displayOffsetSeconds: start
      }
    );
  }
  const label = "No transcription";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "transcript-boundary transcript-silence-chip", title: "No transcription", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeX, { size: 14, className: "transcript-silence-chip__icon text-neutral" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: label })
  ] });
};
const SyntheticSegmentChip = ({
  transcription,
  displayText,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlay,
  isSegmentCurrentlyPlaying,
  originalText
}) => {
  const fallbackStart = typeof transcription.recordingStartOffset === "number" && Number.isFinite(transcription.recordingStartOffset) ? Math.max(0, transcription.recordingStartOffset) : 0;
  const rawDurationSeconds = getTranscriptionDurationMs(transcription) / 1e3;
  const safeDurationSeconds = Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0 ? rawDurationSeconds : 0;
  const fallbackEnd = fallbackStart + safeDurationSeconds;
  const segment = {
    id: -1,
    text: displayText,
    start: fallbackStart,
    end: fallbackEnd,
    avg_logprob: Number.NaN,
    no_speech_prob: Number.NaN,
    temperature: Number.NaN,
    compression_ratio: Number.NaN,
    seek: -1
  };
  if (recordingUrl && recordingId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SegmentPlaybackChip,
      {
        transcription,
        segment,
        recordingUrl,
        recordingId,
        playingSegmentId,
        onPlay,
        isSegmentCurrentlyPlaying,
        displayOffsetSeconds: fallbackStart,
        originalText
      }
    );
  }
  const tooltip = originalText ? `Original: ${originalText}` : "Transcription summary";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-synthetic-chip", title: tooltip, children: displayText });
};
const TranscriptionSegmentChips = ({
  transcription,
  displayText,
  blankAudio,
  transcriptCorrectionEnabled,
  recordingUrl,
  recordingId,
  playingSegmentId,
  onPlaySegment,
  isSegmentCurrentlyPlaying,
  boundaryKey = "boundary"
}) => {
  const chips = reactExports.useMemo(() => {
    const chipElements = [];
    const normalizedRecordingUrl = recordingUrl ?? null;
    const normalizedRecordingId = recordingId ?? null;
    const segments = Array.isArray(transcription.segments) ? transcription.segments : [];
    const durationSeconds = getTranscriptionDurationMs(transcription) / 1e3;
    if (blankAudio) {
      chipElements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SilenceSegmentChip,
          {
            transcription,
            recordingUrl: normalizedRecordingUrl,
            recordingId: normalizedRecordingId,
            playingSegmentId,
            onPlay: onPlaySegment,
            isSegmentCurrentlyPlaying
          },
          `${transcription.id}-silence`
        )
      );
      if (transcriptCorrectionEnabled && durationSeconds > 0 && normalizedRecordingUrl && normalizedRecordingId) {
        chipElements.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TranscriptBoundaryMarker,
            {
              timeSeconds: durationSeconds
            },
            `${transcription.id}-${boundaryKey}`
          )
        );
      }
      return chipElements;
    }
    if (segments.length > 0) {
      segments.forEach((segment, index2) => {
        const segmentKey = `${transcription.id}-${segment.start}-${segment.end}-${index2}`;
        chipElements.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SegmentPlaybackChip,
            {
              transcription,
              segment,
              recordingUrl: normalizedRecordingUrl,
              recordingId: normalizedRecordingId,
              playingSegmentId,
              onPlay: onPlaySegment,
              isSegmentCurrentlyPlaying,
              displayOffsetSeconds: getSegmentDisplayStart(segment, transcription)
            },
            segmentKey
          )
        );
      });
      if (transcriptCorrectionEnabled && durationSeconds > 0) {
        chipElements.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TranscriptBoundaryMarker,
            {
              timeSeconds: durationSeconds
            },
            `${transcription.id}-${boundaryKey}`
          )
        );
      }
      return chipElements;
    }
    const normalizedDisplayText = displayText == null ? void 0 : displayText.trim();
    if (normalizedDisplayText) {
      const originalText = transcription.correctedText ? transcription.text : void 0;
      chipElements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SyntheticSegmentChip,
          {
            transcription,
            displayText: normalizedDisplayText,
            recordingUrl: normalizedRecordingUrl,
            recordingId: normalizedRecordingId,
            playingSegmentId,
            onPlay: onPlaySegment,
            isSegmentCurrentlyPlaying,
            originalText
          },
          `${transcription.id}-synthetic`
        )
      );
      if (transcriptCorrectionEnabled && durationSeconds > 0) {
        chipElements.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TranscriptBoundaryMarker,
            {
              timeSeconds: durationSeconds
            },
            `${transcription.id}-${boundaryKey}`
          )
        );
      }
    }
    return chipElements;
  }, [
    blankAudio,
    boundaryKey,
    displayText,
    isSegmentCurrentlyPlaying,
    onPlaySegment,
    playingSegmentId,
    recordingId,
    recordingUrl,
    transcriptCorrectionEnabled,
    transcription
  ]);
  if (chips.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: chips });
};
const InlineText = reactExports.forwardRef(
  ({ as, gap, wrap = false, marginStart, ms, className, ...rest }, forwardedRef) => {
    const ref = forwardedRef;
    const Component = as ?? "span";
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Component,
      {
        ...rest,
        ref,
        className: clsx(
          "d-inline-flex align-items-baseline",
          wrap && "flex-wrap",
          typeof gap === "number" ? `gap-${gap}` : null,
          // Prefer explicit marginStart; fall back to legacy `ms` prop
          marginStart === "auto" ? "ms-auto" : typeof marginStart === "number" ? `ms-${marginStart}` : ms === "auto" ? "ms-auto" : typeof ms === "number" ? `ms-${ms}` : null,
          className
        )
      }
    );
  }
);
InlineText.displayName = "InlineText";
const formatLabel = (label) => {
  return label.replace(/[_\s]+/g, " ").trim();
};
const toTitleCase = (label) => {
  return label.split(" ").filter(Boolean).map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
};
const resolveUpstreamConnectivity = (stream) => {
  const candidate = stream.upstreamConnected;
  if (typeof candidate === "boolean") {
    return candidate;
  }
  const transcriptions = Array.isArray(
    stream.transcriptions
  ) ? stream.transcriptions : [];
  let lastDisconnectTs = -Infinity;
  let lastReconnectTs = -Infinity;
  let lastNormalTranscriptionTs = -Infinity;
  for (const t2 of transcriptions) {
    const ts = new Date((t2 == null ? void 0 : t2.timestamp) ?? 0).getTime();
    if (!Number.isFinite(ts))
      continue;
    const type = (t2 == null ? void 0 : t2.eventType) ?? "transcription";
    if (type === "upstream_disconnected") {
      if (ts > lastDisconnectTs)
        lastDisconnectTs = ts;
      continue;
    }
    if (type === "upstream_reconnected") {
      if (ts > lastReconnectTs)
        lastReconnectTs = ts;
      continue;
    }
    if (type === "transcription") {
      if (ts > lastNormalTranscriptionTs)
        lastNormalTranscriptionTs = ts;
    }
  }
  if (lastReconnectTs > lastDisconnectTs && lastReconnectTs > -Infinity) {
    return true;
  }
  if (lastDisconnectTs > -Infinity && lastNormalTranscriptionTs > lastDisconnectTs) {
    return true;
  }
  if (lastDisconnectTs > -Infinity && lastReconnectTs <= lastDisconnectTs) {
    return false;
  }
  return null;
};
const resolveStreamStatus = (stream) => {
  const kind = resolveStreamKind(stream);
  if (kind === "pager") {
    const hasMessages = Array.isArray(stream.transcriptions) && stream.transcriptions.some((t2) => ((t2 == null ? void 0 : t2.eventType) ?? "transcription") === "transcription");
    if (!stream.enabled) {
      return { variant: "idle", label: "Pager updates stopped" };
    }
    if (stream.status === "error") {
      return { variant: "error", label: "Pager feed error" };
    }
    if (hasMessages || stream.status === "transcribing") {
      return { variant: "active", label: "Receiving pager updates" };
    }
    return { variant: "idle", label: "Waiting for pager updates" };
  }
  if (kind === "combined") {
    if (stream.status === "error") {
      return { variant: "error", label: "Combined view issues" };
    }
    if (stream.status === "queued") {
      return { variant: "queued", label: "Aggregating activity" };
    }
    if (stream.status === "transcribing") {
      return { variant: "active", label: "Aggregating activity" };
    }
    return { variant: "idle", label: "No recent activity" };
  }
  if (!stream.enabled) {
    return { variant: "idle", label: "Transcription stopped" };
  }
  if (stream.status === "error") {
    return { variant: "error", label: "Stream error" };
  }
  if (stream.status === "queued") {
    return { variant: "queued", label: "Queued for transcription" };
  }
  const connectivity = resolveUpstreamConnectivity(stream);
  if (connectivity === false) {
    const transcriptions = Array.isArray(stream.transcriptions) ? stream.transcriptions : [];
    let sawReconnect = false;
    let sawNormal = false;
    for (const t2 of transcriptions) {
      const type = (t2 == null ? void 0 : t2.eventType) ?? "transcription";
      if (type === "upstream_reconnected")
        sawReconnect = true;
      if (type === "transcription")
        sawNormal = true;
      if (sawReconnect || sawNormal)
        break;
    }
    if (!sawReconnect && !sawNormal) {
      return { variant: "queued", label: "Connecting to stream" };
    }
    return { variant: "error", label: "Upstream disconnected" };
  }
  if (connectivity === true || stream.status === "transcribing") {
    return { variant: "active", label: "Live transcription" };
  }
  return { variant: "idle", label: "Awaiting audio" };
};
const getIconStatusClass = (variant) => {
  switch (variant) {
    case "active":
      return "stream-status-icon--active";
    case "queued":
      return "stream-status-icon--queued";
    case "error":
      return "stream-status-icon--error";
    default:
      return "stream-status-icon--idle";
  }
};
const resolveStreamKind = (stream) => {
  const source = stream.source ?? "audio";
  if (source === "pager")
    return "pager";
  if (source === "combined")
    return "combined";
  if (source === "remote")
    return "remote";
  const url = String(stream.url || "");
  if (/^https?:\/\//i.test(url))
    return "web";
  return "audio";
};
const StreamStatusIndicator = ({
  stream,
  showText = false,
  label,
  className,
  dotClassName,
  textClassName
}) => {
  const { variant, label: defaultLabel } = resolveStreamStatus(stream);
  const iconStatusClass = getIconStatusClass(variant);
  const resolvedLabel = label ? formatLabel(label) : formatLabel(defaultLabel);
  const tooltip = resolvedLabel ? toTitleCase(resolvedLabel) : void 0;
  const ariaLabel = showText ? void 0 : tooltip;
  const kind = resolveStreamKind(stream);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    InlineText,
    {
      className: clsx("stream-status-indicator", className),
      title: tooltip,
      "aria-label": ariaLabel,
      gap: 2,
      children: [
        kind === "pager" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Bell,
          {
            size: 16,
            className: clsx("stream-status-icon", iconStatusClass, dotClassName),
            "aria-hidden": "true"
          }
        ) : kind === "combined" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Layers,
          {
            size: 16,
            className: clsx("stream-status-icon", iconStatusClass, dotClassName),
            "aria-hidden": "true"
          }
        ) : kind === "web" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Globe,
          {
            size: 16,
            className: clsx("stream-status-icon", iconStatusClass, dotClassName),
            "aria-hidden": "true"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Radio,
          {
            size: 16,
            className: clsx("stream-status-icon", iconStatusClass, dotClassName),
            "aria-hidden": "true"
          }
        ),
        showText && resolvedLabel ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: clsx("stream-status-indicator__label", textClassName), children: resolvedLabel }) : null
      ]
    }
  );
};
const AudioElement = ({
  recordingId,
  recordingUrl,
  refsMap,
  className = "visually-hidden",
  preload: preload2 = "none"
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "audio",
    {
      id: recordingId,
      "data-recording-url": recordingUrl,
      preload: preload2,
      className,
      ref: (element) => {
        if (element) {
          refsMap.current[recordingId] = element;
        } else {
          delete refsMap.current[recordingId];
        }
      }
    }
  );
};
const BLANK_AUDIO_TOKEN = "[BLANK_AUDIO]";
const isBlankAudioText = (text) => typeof text === "string" && text.trim().toUpperCase() === BLANK_AUDIO_TOKEN;
const isSystemEventType = (eventType) => Boolean(eventType && eventType !== "transcription");
const getTranscriptionDisplayText = (transcription) => {
  if (isBlankAudioText(transcription.text)) {
    return null;
  }
  const corrected = typeof transcription.correctedText === "string" ? transcription.correctedText.trim() : "";
  if (corrected.length > 0) {
    return corrected;
  }
  const original = typeof transcription.text === "string" ? transcription.text.trim() : "";
  return original.length > 0 ? original : null;
};
const getNotifiableAlerts = (alerts) => {
  if (!Array.isArray(alerts)) {
    return [];
  }
  return alerts.filter(
    (trigger) => Boolean(trigger && trigger.notify !== false)
  );
};
const getReviewStatus = (transcription) => transcription.reviewStatus ?? "pending";
const isSystemTranscription = (transcription) => isSystemEventType(transcription.eventType);
const SearchPanel = ({
  variant = "popover",
  id: id2,
  headingId,
  searchValue,
  activeQuery,
  loading,
  error,
  results,
  onChange,
  onSearch,
  onClear,
  onClose,
  onViewContext,
  transcriptContext
}) => {
  const isPopover = variant === "popover";
  const titleId = headingId ?? (id2 ? `${id2}-heading` : void 0);
  const hasExecutedSearch = Boolean(activeQuery);
  const resultCount = hasExecutedSearch ? results.length : null;
  const containerClassName = [
    "transcript-stream__search-popover",
    isPopover ? "transcript-stream__search-popover--inline" : "transcript-stream__search-popover--dialog"
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: containerClassName,
      id: id2,
      role: isPopover ? "dialog" : void 0,
      "aria-modal": isPopover ? "false" : void 0,
      "aria-labelledby": isPopover ? titleId : void 0,
      children: [
        isPopover ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__search-header", id: titleId, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold text-body", children: "Search history" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              use: "link",
              className: "p-0 text-body-secondary",
              onClick: onClose,
              "aria-label": "Close search panel",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-body-secondary small", children: "Search saved transcripts by keyword." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "form",
          {
            className: "transcript-stream__search-form",
            onSubmit: (event) => {
              event.preventDefault();
              onSearch(searchValue);
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__search-input-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 16, "aria-hidden": "true" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: searchValue,
                  onChange: (event) => onChange(event.target.value),
                  placeholder: "Keywords or phrases",
                  className: "form-control form-control-sm"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  type: "submit",
                  size: "sm",
                  use: "primary",
                  disabled: loading,
                  startContent: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14 }),
                  children: "Search"
                }
              )
            ] })
          }
        ),
        hasExecutedSearch || loading || error ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__search-results", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__search-summary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold text-body", children: hasExecutedSearch ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              "Results for “",
              activeQuery,
              "”",
              typeof resultCount === "number" ? ` (${resultCount})` : ""
            ] }) : "Search" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", use: "link", onClick: onClear, className: "text-accent p-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 }),
              "Clear"
            ] })
          ] }),
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-ink-subtle d-flex align-items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin" }),
            "Searching…"
          ] }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-danger", children: error }) : results.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-accent-strong", children: "No matches found." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "transcript-stream__search-results-list transcript-message-list", children: results.map((result) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            SearchResultCard,
            {
              result,
              onViewContext,
              transcriptContext
            }
          ) }, `${result.id}-${result.timestamp}`)) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-ink-subtle", children: "Search saved transcripts by keyword." })
      ]
    }
  );
};
const formatDurationLabel = (seconds) => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds === 0) {
    return "<1s";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const remainingSeconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }
  return parts.join(" ");
};
const SearchResultMeta = ({ result }) => {
  const { timestamp, duration } = result;
  if (!timestamp) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-message__timestamp", children: "Unknown timestamp" });
  }
  const startDate = new Date(timestamp);
  if (Number.isNaN(startDate.getTime())) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-message__timestamp", children: "Unknown timestamp" });
  }
  const hasDuration = typeof duration === "number" && duration > 0;
  const durationLabel = hasDuration ? formatDurationLabel(duration) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__search-result-time", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3 h-3 text-neutral" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: startDate, mode: "datetime", className: "transcript-message__timestamp" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-stream__search-result-separator", "aria-hidden": "true", children: "•" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TimeInterval,
      {
        value: startDate,
        condensed: true,
        className: "transcript-stream__search-result-interval"
      }
    ),
    durationLabel ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-stream__search-result-duration", children: durationLabel }) : null
  ] });
};
const SearchResultCard = ({
  result,
  onViewContext,
  transcriptContext
}) => {
  var _a2;
  const streamLabel = (transcriptContext == null ? void 0 : transcriptContext.streamName) ?? result.streamId;
  const stream = (transcriptContext == null ? void 0 : transcriptContext.stream) ?? null;
  const displayText = ((_a2 = getTranscriptionDisplayText(result)) == null ? void 0 : _a2.trim()) ?? result.text ?? "";
  const blankAudio = isBlankAudioText(result.text ?? "");
  const originalTextTooltip = result.correctedText ? `Original: ${result.text}` : void 0;
  const alertTriggers = getNotifiableAlerts(result.alerts);
  const hasAlerts = alertTriggers.length > 0;
  const transcriptCorrectionEnabled = (transcriptContext == null ? void 0 : transcriptContext.transcriptCorrectionEnabled) ?? false;
  const playingSegmentId = (transcriptContext == null ? void 0 : transcriptContext.playingSegmentId) ?? null;
  const onPlaySegment = transcriptContext == null ? void 0 : transcriptContext.onPlaySegment;
  const isSegmentCurrentlyPlaying = transcriptContext == null ? void 0 : transcriptContext.isSegmentCurrentlyPlaying;
  const recordingAudioRefs = transcriptContext == null ? void 0 : transcriptContext.recordingAudioRefs;
  const recordingUrl = result.recordingUrl ?? null;
  const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
  const metaElements = [];
  if (alertTriggers.length > 0) {
    metaElements.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(AlertChips, { triggers: alertTriggers, mode: "collapsed" }, "alerts")
    );
  }
  const segmentChips = onPlaySegment && isSegmentCurrentlyPlaying ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    TranscriptionSegmentChips,
    {
      transcription: result,
      displayText,
      blankAudio,
      transcriptCorrectionEnabled,
      recordingUrl,
      recordingId,
      playingSegmentId,
      onPlaySegment,
      isSegmentCurrentlyPlaying
    }
  ) : null;
  const canViewContext = Boolean(result.timestamp);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      className: `transcript-message${hasAlerts ? " transcript-message--alert" : ""}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__avatar", "aria-hidden": "true", children: stream ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          StreamStatusIndicator,
          {
            stream,
            className: "d-inline-flex align-items-baseline"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { size: 18 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-message__content", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "transcript-message__header", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-message__channel", children: streamLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SearchResultMeta, { result })
          ] }),
          metaElements.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__meta", children: metaElements }) : null,
          segmentChips ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__chips", children: segmentChips }) : null,
          displayText ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "transcript-message__text", title: originalTextTooltip, children: displayText }) : null,
          recordingUrl && recordingId && recordingAudioRefs ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            AudioElement,
            {
              recordingId,
              recordingUrl,
              refsMap: recordingAudioRefs
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "d-flex justify-content-end gap-2 flex-wrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              use: "primary",
              appearance: "outline",
              onClick: () => {
                if (result.timestamp) {
                  onViewContext(result.timestamp);
                }
              },
              disabled: !canViewContext,
              children: "View context"
            }
          ) })
        ] })
      ]
    }
  );
};
const toDatetimeLocalValue = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value) => value.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
const formatDurationSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }
  if (seconds < 60) {
    const rounded = seconds.toFixed(seconds >= 10 ? 0 : 1);
    return `${rounded.replace(/\.0$/, "")}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const roundedSeconds = remainingSeconds.toFixed(
    remainingSeconds >= 10 ? 0 : 1
  );
  if (Number(roundedSeconds) === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${roundedSeconds.replace(/\.0$/, "")}s`;
};
const clampAccuracyPercentage = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
};
const EMPTY_PERFORMANCE_METRICS = {
  transcriptionCount: 0,
  averageAccuracy: 0,
  averageDuration: 0,
  totalDuration: 0,
  lastTranscriptionTime: null
};
const calculatePerformanceMetrics = (transcriptions) => {
  if (!transcriptions || transcriptions.length === 0) {
    return { ...EMPTY_PERFORMANCE_METRICS };
  }
  let totalAccuracy = 0;
  let totalDuration = 0;
  let latestTimestamp = null;
  const validTranscriptions = transcriptions.filter(
    (item) => Boolean(item && !isSystemTranscription(item))
  );
  validTranscriptions.forEach((transcription) => {
    const confidence = typeof transcription.confidence === "number" && Number.isFinite(transcription.confidence) ? transcription.confidence : 0.5;
    totalAccuracy += confidence * 100;
    const duration = typeof transcription.duration === "number" && Number.isFinite(transcription.duration) ? transcription.duration : 0;
    totalDuration += duration;
    const timestamp = new Date(transcription.timestamp).getTime();
    if (!Number.isNaN(timestamp)) {
      latestTimestamp = latestTimestamp === null ? timestamp : Math.max(latestTimestamp, timestamp);
    }
  });
  if (validTranscriptions.length === 0) {
    return { ...EMPTY_PERFORMANCE_METRICS };
  }
  return {
    transcriptionCount: validTranscriptions.length,
    averageAccuracy: totalAccuracy / validTranscriptions.length,
    averageDuration: totalDuration / validTranscriptions.length,
    totalDuration,
    lastTranscriptionTime: latestTimestamp
  };
};
const sanitizeStreamId = (streamId) => streamId.replace(/[^a-zA-Z0-9_-]/g, "-");
const useStandaloneControls = (options) => {
  const {
    streamId,
    streamName,
    stream,
    isReadOnly,
    isPagerStream: isPagerStream2,
    isTranscribing,
    canListenLive: canListenLiveOverride,
    visibleTranscriptions,
    liveAudio,
    recordingAudioRefs,
    search,
    focus,
    transcriptCorrectionEnabled,
    playingSegmentId,
    onPlaySegment,
    isSegmentCurrentlyPlaying,
    onResetStream,
    onExportPagerFeed,
    onSelectPagerExportStream,
    pagerExporting = false,
    openTool,
    setOpenTool
  } = options;
  const sanitizedStreamId = sanitizeStreamId(streamId);
  const metrics = calculatePerformanceMetrics(visibleTranscriptions);
  const canReset = !isReadOnly && visibleTranscriptions.length > 0;
  const canListenLive = canListenLiveOverride ?? (!isPagerStream2 && isTranscribing);
  const statusLabel = isTranscribing ? "Live transcription" : "Transcription stopped";
  const statusModifier = isTranscribing ? "transcribing" : "stopped";
  const closeDialog = reactExports.useCallback(() => setOpenTool(null), [setOpenTool]);
  const toolButtonItems = reactExports.useMemo(
    () => [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: "primary",
          appearance: "outline",
          onClick: () => setOpenTool("search"),
          startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14 }),
          isCondensed: true,
          tooltip: "Search history",
          children: "Search history"
        },
        "search"
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: "secondary",
          appearance: "outline",
          onClick: () => setOpenTool("jump"),
          startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarClock, { size: 14 }),
          isCondensed: true,
          tooltip: "Go to time",
          children: "Go to time"
        },
        "jump"
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: "secondary",
          appearance: "outline",
          onClick: () => setOpenTool("stats"),
          startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { size: 14 }),
          isCondensed: true,
          tooltip: "Stream stats",
          children: "Stream stats"
        },
        "stats"
      ),
      ...isPagerStream2 && onExportPagerFeed ? [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            use: "secondary",
            appearance: "outline",
            onClick: () => {
              onSelectPagerExportStream == null ? void 0 : onSelectPagerExportStream(streamId);
              void onExportPagerFeed();
            },
            startContent: pagerExporting ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14 }),
            isCondensed: true,
            tooltip: "Export pager feed",
            disabled: pagerExporting,
            children: pagerExporting ? "Exporting…" : "Export feed"
          },
          "export-pager"
        )
      ] : []
    ],
    [
      isPagerStream2,
      onExportPagerFeed,
      onSelectPagerExportStream,
      pagerExporting,
      setOpenTool,
      streamId
    ]
  );
  if (isPagerStream2 && onExportPagerFeed) {
    toolButtonItems.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: "secondary",
          appearance: "outline",
          onClick: () => {
            onSelectPagerExportStream == null ? void 0 : onSelectPagerExportStream(streamId);
            void onExportPagerFeed();
          },
          startContent: pagerExporting ? /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin", "aria-hidden": "true" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 14 }),
          isCondensed: true,
          tooltip: "Export pager feed",
          disabled: pagerExporting,
          children: pagerExporting ? "Exporting…" : "Export feed"
        },
        "export-pager"
      )
    );
  }
  return reactExports.useMemo(
    () => ({
      streamId,
      statusLabel,
      statusModifier,
      isLiveListening: liveAudio.isListening,
      canListenLive,
      canReset,
      liveAudioError: liveAudio.error,
      onToggleLiveListening: () => {
        if (!canListenLive)
          return;
        liveAudio.toggle();
      },
      onReset: () => {
        if (isReadOnly)
          return;
        onResetStream(streamId);
      },
      openSearchDialog: () => setOpenTool("search"),
      toolButtons: toolButtonItems.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(ButtonGroup, { size: "sm", children: toolButtonItems }) : null,
      dialogs: (() => {
        var _a2, _b2, _c2, _d2, _e2, _f2;
        const arr = [];
        if (openTool === "search") {
          arr.push(
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              StandaloneSearchDialog,
              {
                open: true,
                onClose: closeDialog,
                streamId,
                sanitizedStreamId,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SearchPanel,
                  {
                    variant: "dialog",
                    searchValue: search.input,
                    activeQuery: ((_a2 = search.state) == null ? void 0 : _a2.query) ?? null,
                    loading: Boolean((_b2 = search.state) == null ? void 0 : _b2.loading),
                    error: ((_c2 = search.state) == null ? void 0 : _c2.error) ?? null,
                    results: ((_d2 = search.state) == null ? void 0 : _d2.results) ?? [],
                    onChange: (value) => search.setInput(value),
                    onSearch: (value) => void search.search(value),
                    onClear: () => search.clear(),
                    onClose: closeDialog,
                    transcriptContext: {
                      streamName,
                      stream,
                      transcriptCorrectionEnabled,
                      playingSegmentId,
                      onPlaySegment,
                      isSegmentCurrentlyPlaying,
                      recordingAudioRefs
                    },
                    onViewContext: (timestamp) => {
                      focus.setJumpTimestampValue(toDatetimeLocalValue(timestamp));
                      void focus.goToTimestamp(timestamp, focus.jumpWindowValue);
                      closeDialog();
                    }
                  }
                )
              },
              "search"
            )
          );
        }
        if (openTool === "jump") {
          arr.push(
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              StandaloneJumpDialog,
              {
                open: true,
                onClose: closeDialog,
                sanitizedStreamId,
                timestampValue: focus.jumpTimestampValue,
                windowMinutes: focus.jumpWindowValue,
                isLoading: ((_e2 = focus.state) == null ? void 0 : _e2.loading) ?? false,
                error: ((_f2 = focus.state) == null ? void 0 : _f2.error) ?? null,
                onTimestampChange: (value) => focus.setJumpTimestampValue(value),
                onWindowMinutesChange: (value) => focus.setJumpWindowValue(value),
                onSubmit: (value, windowMinutes) => {
                  if (!value)
                    return;
                  const parsed = new Date(value);
                  if (Number.isNaN(parsed.getTime()))
                    return;
                  focus.setJumpTimestampValue(value);
                  void focus.goToTimestamp(parsed.toISOString(), windowMinutes);
                  closeDialog();
                }
              },
              "jump"
            )
          );
        }
        if (openTool === "stats") {
          arr.push(
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              StandaloneStatsDialog,
              {
                open: true,
                onClose: closeDialog,
                sanitizedStreamId,
                metrics
              },
              "stats"
            )
          );
        }
        return arr;
      })()
    }),
    [
      canListenLive,
      canReset,
      isReadOnly,
      liveAudio,
      streamName,
      stream,
      transcriptCorrectionEnabled,
      playingSegmentId,
      onPlaySegment,
      isSegmentCurrentlyPlaying,
      onResetStream,
      statusLabel,
      statusModifier,
      streamId,
      toolButtonItems,
      openTool,
      metrics,
      search,
      focus,
      closeDialog,
      sanitizedStreamId,
      setOpenTool
    ]
  );
};
const SCROLL_THRESHOLD_PX = 32;
const useAutoScroll = () => {
  const containerRef = reactExports.useRef(null);
  const [observedNode, setObservedNode] = reactExports.useState(null);
  const isAtBottomRef = reactExports.useRef(true);
  const [hasNewItems, setHasNewItems] = reactExports.useState(false);
  const [isAtBottom, setIsAtBottom] = reactExports.useState(true);
  const [isScrolledAway, setIsScrolledAway] = reactExports.useState(false);
  const updateIsAtBottom = reactExports.useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setIsAtBottom(true);
      isAtBottomRef.current = true;
      return;
    }
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= SCROLL_THRESHOLD_PX;
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
    setIsScrolledAway(!atBottom);
    setHasNewItems((previous) => atBottom ? false : previous);
  }, []);
  const attachRef = reactExports.useCallback(
    (node) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("scroll", updateIsAtBottom);
      }
      containerRef.current = node;
      setObservedNode(node);
      if (node) {
        node.addEventListener("scroll", updateIsAtBottom, { passive: true });
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(updateIsAtBottom);
        } else {
          updateIsAtBottom();
        }
      }
    },
    [updateIsAtBottom]
  );
  const scrollToBottom = reactExports.useCallback((behavior = "smooth") => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewItems(false);
    setIsScrolledAway(false);
  }, []);
  const notifyContentChanged = reactExports.useCallback(
    ({ behavior = "auto" } = {}) => {
      if (isAtBottomRef.current) {
        scrollToBottom(behavior);
        return;
      }
      setHasNewItems(true);
    },
    [scrollToBottom]
  );
  reactExports.useEffect(() => {
    const container = observedNode;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (isAtBottomRef.current) {
        scrollToBottom("auto");
      }
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [observedNode, scrollToBottom]);
  reactExports.useEffect(() => {
    const container = observedNode;
    if (!container || typeof MutationObserver === "undefined") {
      return;
    }
    let frameId = null;
    let lastKnownScrollHeight = container.scrollHeight;
    const scheduleScroll = () => {
      const nextScrollHeight = container.scrollHeight;
      if (!isAtBottomRef.current) {
        lastKnownScrollHeight = nextScrollHeight;
        return;
      }
      if (nextScrollHeight === lastKnownScrollHeight) {
        return;
      }
      lastKnownScrollHeight = nextScrollHeight;
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        scrollToBottom("auto");
        return;
      }
      if (frameId !== null) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        scrollToBottom("auto");
      });
    };
    const observer = new MutationObserver(() => {
      scheduleScroll();
    });
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    return () => {
      observer.disconnect();
      if (frameId !== null && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [observedNode, scrollToBottom]);
  return {
    attachRef,
    hasNewItems,
    isAtBottom,
    isScrolledAway,
    notifyContentChanged,
    scrollToBottom
  };
};
const StreamTranscriptList = ({
  orderedTranscriptions,
  isTranscribing,
  children,
  onLoadEarlier,
  hasMoreHistory = false,
  isLoadingHistory = false,
  historyError = null
}) => {
  const {
    attachRef,
    hasNewItems,
    isScrolledAway,
    notifyContentChanged,
    scrollToBottom
  } = useAutoScroll();
  const latestEntryKeyRef = reactExports.useRef(null);
  const previousCountRef = reactExports.useRef(0);
  const scrollerRef = reactExports.useRef(null);
  const [scrollContainer, setScrollContainer] = reactExports.useState(
    null
  );
  const topSentinelRef = reactExports.useRef(null);
  const [sentinelElement, setSentinelElement] = reactExports.useState(
    null
  );
  const loadMoreRef = reactExports.useRef(null);
  const loadStateRef = reactExports.useRef({
    hasMoreHistory,
    isLoadingHistory,
    pending: false
  });
  const previousFirstEntryRef = reactExports.useRef(null);
  const previousScrollHeightRef = reactExports.useRef(0);
  const initialScrollCompletedRef = reactExports.useRef(false);
  const triggerLoadMore = reactExports.useCallback(() => {
    const callback = loadMoreRef.current;
    const state = loadStateRef.current;
    if (!callback || state.pending || state.isLoadingHistory || !state.hasMoreHistory) {
      return;
    }
    state.pending = true;
    callback();
  }, []);
  reactExports.useEffect(() => {
    loadMoreRef.current = onLoadEarlier ?? null;
  }, [onLoadEarlier]);
  reactExports.useEffect(() => {
    loadStateRef.current.hasMoreHistory = hasMoreHistory;
  }, [hasMoreHistory]);
  reactExports.useEffect(() => {
    loadStateRef.current.isLoadingHistory = isLoadingHistory;
    loadStateRef.current.pending = isLoadingHistory;
  }, [isLoadingHistory]);
  const handleAttachRef = reactExports.useCallback(
    (node) => {
      scrollerRef.current = node;
      attachRef(node);
      setScrollContainer(node);
      if (!node) {
        initialScrollCompletedRef.current = false;
      }
    },
    [attachRef]
  );
  const handleSentinelRef = reactExports.useCallback((node) => {
    topSentinelRef.current = node;
    setSentinelElement(node);
  }, []);
  reactExports.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      previousScrollHeightRef.current = 0;
      previousFirstEntryRef.current = null;
      initialScrollCompletedRef.current = false;
      return;
    }
    if (orderedTranscriptions.length === 0) {
      initialScrollCompletedRef.current = false;
    } else if (!initialScrollCompletedRef.current) {
      scroller.scrollTop = scroller.scrollHeight;
      initialScrollCompletedRef.current = true;
    }
    const prevFirstKey = previousFirstEntryRef.current;
    const prevScrollHeight = previousScrollHeightRef.current;
    const nextFirst = orderedTranscriptions[0];
    const nextFirstKey = nextFirst ? `${nextFirst.id}-${nextFirst.timestamp}` : null;
    const currentScrollHeight = scroller.scrollHeight;
    if (prevFirstKey && nextFirstKey && prevFirstKey !== nextFirstKey && prevScrollHeight > 0) {
      const scrollDelta = currentScrollHeight - prevScrollHeight;
      if (scrollDelta > 0) {
        scroller.scrollTop += scrollDelta;
      }
    }
    previousFirstEntryRef.current = nextFirstKey;
    previousScrollHeightRef.current = currentScrollHeight;
  }, [orderedTranscriptions]);
  reactExports.useEffect(() => {
    const root = scrollContainer;
    const target = sentinelElement;
    if (!root || !target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const {
            hasMoreHistory: hasMore,
            isLoadingHistory: loading,
            pending
          } = loadStateRef.current;
          if (!hasMore || loading || pending) {
            continue;
          }
          triggerLoadMore();
        }
      },
      {
        root,
        rootMargin: "200px 0px 0px 0px",
        threshold: 0
      }
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [scrollContainer, sentinelElement, triggerLoadMore]);
  reactExports.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    if (!loadMoreRef.current || !hasMoreHistory || isLoadingHistory || !onLoadEarlier) {
      return;
    }
    const isScrollable = scroller.scrollHeight > scroller.clientHeight + 4;
    if (isScrollable) {
      return;
    }
    triggerLoadMore();
  }, [
    orderedTranscriptions,
    hasMoreHistory,
    isLoadingHistory,
    onLoadEarlier,
    triggerLoadMore
  ]);
  reactExports.useEffect(() => {
    const nextCount = orderedTranscriptions.length;
    const latestEntry = orderedTranscriptions[nextCount - 1];
    const latestKey = latestEntry ? `${latestEntry.id}-${latestEntry.timestamp}` : null;
    const prevKey = latestEntryKeyRef.current;
    const prevCount = previousCountRef.current;
    if (nextCount === 0) {
      previousCountRef.current = 0;
      latestEntryKeyRef.current = null;
      return;
    }
    if (nextCount > prevCount || latestKey && latestKey !== prevKey) {
      if (prevCount === 0) {
        scrollToBottom("auto");
      } else {
        notifyContentChanged({ behavior: "smooth" });
      }
    }
    previousCountRef.current = nextCount;
    latestEntryKeyRef.current = latestKey;
  }, [orderedTranscriptions, notifyContentChanged, scrollToBottom]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-scroll-area", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-scroll-area__scroller", ref: handleAttachRef, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: handleSentinelRef,
          className: "transcript-scroll-area__sentinel",
          "aria-hidden": "true"
        }
      ),
      isLoadingHistory ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-scroll-area__status transcript-scroll-area__status--history", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "transcript-scroll-area__status-icon" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Loading earlier history…" })
      ] }) : null,
      !isLoadingHistory && historyError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-scroll-area__status transcript-scroll-area__status--error", children: historyError }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-scroll-area__content", children }),
      isTranscribing ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-scroll-area__status", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "transcript-scroll-area__status-icon" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Listening for more audio…" })
      ] }) : null
    ] }),
    isScrolledAway ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        use: "unstyled",
        className: `transcript-view__pill${hasNewItems ? " transcript-view__pill--highlight" : ""}`,
        onClick: () => scrollToBottom("smooth"),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownCircle, { size: 16, "aria-hidden": "true" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: hasNewItems ? "New messages · Go to latest" : "Go to latest" })
        ]
      }
    ) : null
  ] });
};
const iconForEvent = (eventType) => {
  switch (eventType) {
    case "recording_started":
      return Radio;
    case "recording_stopped":
      return MicOff;
    case "transcription_started":
      return Play;
    case "transcription_stopped":
      return Pause;
    case "upstream_disconnected":
      return WifiOff;
    case "upstream_reconnected":
      return Wifi;
    default:
      return Activity;
  }
};
const SystemEventChip = ({
  label,
  eventType,
  className,
  iconSize = 14
}) => {
  const Icon = iconForEvent(eventType);
  const classes = className ?? "chip-button chip-button--surface transcript-system-event";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: classes, title: eventType || void 0, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { size: iconSize }),
    label
  ] });
};
const PAGER_SIMULTANEOUS_WINDOW_MS = 5e3;
const normalisePagerFieldKey = (label) => {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  switch (base) {
    case "raw":
    case "raw_message":
    case "rawmessage":
      return "raw_message";
    case "talk_group":
    case "talkgroup":
    case "tg":
      return "talkgroup";
    case "alarm":
    case "alarm_level":
      return "alarm_level";
    default:
      return base;
  }
};
const normalisePagerFieldLabel = (key, fallback) => {
  switch (key) {
    case "map":
      return "Map";
    case "talkgroup":
      return "Talkgroup";
    case "priority":
      return "Priority";
    case "narrative":
      return "Narrative";
    case "units":
      return "Units";
    case "raw_message":
      return "Raw message";
    case "address":
      return "Address";
    case "alarm_level":
      return "Alarm level";
    default:
      return fallback;
  }
};
const PAGER_FIELD_ORDER = {
  map: 10,
  talkgroup: 20,
  address: 30,
  alarm_level: 40,
  priority: 50,
  narrative: 60,
  units: 70,
  raw_message: 80
};
const PART_SUFFIX_PATTERN = /\s*\(Part\s+\d+\s+of\s+\d+\)\s*$/i;
const sanitizePagerValue = (value) => value.replace(PART_SUFFIX_PATTERN, "").trim();
const parsePagerFragment = (text) => {
  const lines = text.split(/\r?\n/);
  let summary = null;
  const fields = [];
  const notes = [];
  lines.forEach((rawLine, index2) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return;
    }
    const bulletMatch = /^•\s*(.*)$/u.exec(trimmed);
    const content = bulletMatch ? bulletMatch[1].trim() : trimmed;
    if (!summary && !bulletMatch && !/^priority\b/i.test(content)) {
      summary = content;
      return;
    }
    const colonIndex = content.indexOf(":");
    if (colonIndex > 0 && colonIndex < content.length - 1) {
      const label = content.slice(0, colonIndex).trim();
      const value = content.slice(colonIndex + 1).trim();
      if (value) {
        const format = /raw\s*message/i.test(label) ? "code" : "text";
        fields.push({ label, value, format });
      }
      return;
    }
    const priorityMatch = /^priority\s*(.*)$/i.exec(content);
    if (priorityMatch) {
      const value = priorityMatch[1].replace(/^[:\s]+/, "").trim();
      if (value) {
        fields.push({ label: "Priority", value });
      }
      return;
    }
    const talkgroupMatch = /^talkgroup\s+(.+)$/i.exec(content);
    if (talkgroupMatch) {
      fields.push({ label: "Talkgroup", value: talkgroupMatch[1].trim() });
      return;
    }
    const narrativeMatch = /^==\s*(.+)$/i.exec(content);
    if (narrativeMatch) {
      fields.push({ label: "Narrative", value: narrativeMatch[1].trim() });
      return;
    }
    if (!summary && index2 === 0) {
      summary = content;
      return;
    }
    notes.push(content);
  });
  return { summary, fields, notes };
};
const appendPagerField = (fieldMap, label, value, format = "text") => {
  const cleanedValue = sanitizePagerValue(value);
  if (!cleanedValue) {
    return;
  }
  const normalisedKey = normalisePagerFieldKey(label);
  const key = normalisedKey || label.toLowerCase();
  const displayLabel = normalisePagerFieldLabel(key, label.trim());
  const existing = fieldMap.get(key);
  if (existing) {
    if (!existing.values.some((item) => item.toLowerCase() === cleanedValue.toLowerCase())) {
      existing.values.push(cleanedValue);
    }
    if (format === "code") {
      existing.format = "code";
    }
    return;
  }
  fieldMap.set(key, {
    key,
    label: displayLabel,
    values: [cleanedValue],
    format
  });
};
const condensePagerTranscriptions = (transcriptions) => {
  if (transcriptions.length === 0) {
    return [];
  }
  const sorted = [...transcriptions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const clusters = [];
  sorted.forEach((transcription) => {
    const timestampMs = new Date(transcription.timestamp).getTime();
    if (Number.isNaN(timestampMs)) {
      return;
    }
    const lastCluster = clusters[clusters.length - 1];
    if (!lastCluster || timestampMs - lastCluster.lastTimestampMs > PAGER_SIMULTANEOUS_WINDOW_MS) {
      clusters.push({
        transcriptions: [transcription],
        lastTimestampMs: timestampMs
      });
      return;
    }
    lastCluster.transcriptions.push(transcription);
    lastCluster.lastTimestampMs = timestampMs;
  });
  return clusters.map((cluster) => {
    var _a2;
    const fieldMap = /* @__PURE__ */ new Map();
    const noteSet = /* @__PURE__ */ new Set();
    let summary = null;
    cluster.transcriptions.forEach((transcription) => {
      const parsed = parsePagerFragment(transcription.text ?? "");
      if (!summary && parsed.summary) {
        summary = parsed.summary;
      } else if (parsed.summary && parsed.summary !== summary) {
        noteSet.add(parsed.summary);
      }
      parsed.fields.forEach(({ label, value, format }) => {
        appendPagerField(fieldMap, label, value, format);
      });
      parsed.notes.forEach((note) => {
        const cleaned = sanitizePagerValue(note);
        if (cleaned) {
          noteSet.add(cleaned);
        }
      });
    });
    const incident = (_a2 = cluster.transcriptions.find((item) => item.pagerIncident)) == null ? void 0 : _a2.pagerIncident;
    if (incident) {
      if (!summary) {
        const summaryParts = [incident.incidentId, incident.callType, incident.address].map((value) => value ? value.trim() : "").filter((value) => value);
        if (incident.alarmLevel) {
          summaryParts.push(`Alarm level ${incident.alarmLevel}`);
        }
        if (summaryParts.length > 0) {
          summary = summaryParts.join(" – ");
        }
      }
      if (incident.map) {
        appendPagerField(fieldMap, "Map", incident.map);
      }
      if (incident.talkgroup) {
        appendPagerField(fieldMap, "Talkgroup", incident.talkgroup);
      }
      if (incident.address) {
        appendPagerField(fieldMap, "Address", incident.address);
      }
      if (incident.alarmLevel) {
        appendPagerField(fieldMap, "Alarm level", incident.alarmLevel);
      }
      if (incident.narrative) {
        appendPagerField(fieldMap, "Narrative", incident.narrative);
      }
      if (incident.units) {
        appendPagerField(fieldMap, "Units", incident.units);
      }
      if (incident.rawMessage) {
        appendPagerField(fieldMap, "Raw message", incident.rawMessage, "code");
      }
    }
    const fields = Array.from(fieldMap.values()).sort((a, b) => {
      const rankA = PAGER_FIELD_ORDER[a.key] ?? 100;
      const rankB = PAGER_FIELD_ORDER[b.key] ?? 100;
      if (rankA === rankB) {
        return a.label.localeCompare(b.label);
      }
      return rankA - rankB;
    });
    return {
      id: cluster.transcriptions[0].id,
      timestamp: cluster.transcriptions[0].timestamp,
      summary,
      fields,
      notes: Array.from(noteSet),
      fragments: cluster.transcriptions
    };
  });
};
const getCondensedFieldValue = (message, key) => {
  const f2 = message.fields.find((x2) => x2.key === key);
  if (!f2 || f2.values.length === 0)
    return null;
  return f2.values[0];
};
const PagerTranscriptTable = ({
  groupId,
  messages,
  elementMap,
  openMessageIds,
  onToggleMessage,
  incidentLocationUrls,
  incidentLocationQuery,
  hideTimeColumn = false
}) => {
  if (!messages || messages.length === 0)
    return null;
  const { googleMapsApiKey } = useUISettings();
  const [mapOpen, setMapOpen] = reactExports.useState(false);
  const searchQuery = incidentLocationQuery ?? null;
  const mapEmbedUrl = reactExports.useMemo(() => {
    if (!searchQuery)
      return null;
    const encoded = encodeURIComponent(searchQuery);
    if (googleMapsApiKey) {
      return `https://www.google.com/maps/embed/v1/search?key=${googleMapsApiKey}&q=${encoded}&zoom=15`;
    }
    return `https://maps.google.com/maps?hl=en&q=${encoded}&ie=UTF8&output=embed`;
  }, [searchQuery, googleMapsApiKey]);
  const mapLinkUrl = reactExports.useMemo(() => {
    if (incidentLocationUrls == null ? void 0 : incidentLocationUrls.link)
      return incidentLocationUrls.link;
    if (!searchQuery)
      return null;
    const encoded = encodeURIComponent(searchQuery);
    return `https://maps.google.com/maps?hl=en&q=${encoded}&ie=UTF8&z=15`;
  }, [incidentLocationUrls, searchQuery]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-thread__pager-group", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "pager-table", "aria-label": "Pager messages", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pager-table__col--toggle", "aria-hidden": true }),
        hideTimeColumn ? null : /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pager-table__col--time", children: "Time" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pager-table__col--summary", children: "Summary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pager-table__col--address", children: "Address" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pager-table__col--tg", children: "TG" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "pager-table__col--units", children: "Units" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: messages.map((message, index2) => {
        const isOpen = Boolean(openMessageIds[message.id]);
        const firstFragment = message.fragments[0];
        const fragmentDisplayText = firstFragment ? getTranscriptionDisplayText(firstFragment) : null;
        const summaryText = message.summary || (fragmentDisplayText ? fragmentDisplayText.split(/\r?\n/, 1)[0] : "Pager update");
        const address = getCondensedFieldValue(message, "address");
        const alarm = getCondensedFieldValue(message, "alarm_level");
        const tg2 = getCondensedFieldValue(message, "talkgroup");
        const units = getCondensedFieldValue(message, "units");
        const narrative = getCondensedFieldValue(message, "narrative");
        const priority = getCondensedFieldValue(message, "priority");
        const summaryParts = summaryText.split(/\s+–\s+/).map((s) => s.trim());
        const filtered = summaryParts.filter((part) => {
          if (!part)
            return false;
          if (/^INC\d+/i.test(part))
            return false;
          if (address && part.toLowerCase() === address.toLowerCase())
            return false;
          if (/^alarm\s*level\b/i.test(part))
            return false;
          return true;
        });
        const category = filtered.length > 0 ? filtered[0] : summaryText;
        const summaryDisplay = [category, narrative].filter(Boolean).join(" – ");
        const messageTriggers = message.fragments.flatMap(
          (fragment) => getNotifiableAlerts(fragment.alerts)
        );
        const fragmentElements = message.fragments.flatMap(
          (fragment) => elementMap.get(fragment.id) ?? []
        );
        const canOpenMap = Boolean(searchQuery);
        const showMapIcon = index2 === 0 && canOpenMap;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              className: `pager-table__row${isOpen ? " pager-table__row--open" : ""}`,
              onClick: () => onToggleMessage(message.id),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pager-table__cell pager-table__cell--toggle", title: isOpen ? "Hide details" : "Show details", children: isOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14, "aria-hidden": true }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14, "aria-hidden": true }) }),
                hideTimeColumn ? null : /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "pager-table__cell pager-table__cell--time", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: message.timestamp }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TimeInterval, { value: message.timestamp, condensed: true, className: "ms-1" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pager-table__cell pager-table__cell--summary", title: summaryDisplay, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2 flex-wrap", children: [
                  alarm && alarm.trim() !== "" && alarm.trim() === "1" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      title: "This pager event was sent with Alarm=1",
                      "aria-label": "Alarm 1",
                      className: "text-warning d-inline-flex align-items-center",
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: 14 })
                    }
                  ) : null,
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: summaryDisplay }),
                  priority ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip-button chip-button--surface", children: [
                    "Priority ",
                    priority
                  ] }) : null,
                  messageTriggers.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    AlertChips,
                    {
                      triggers: messageTriggers,
                      mode: "collapsed",
                      idPrefix: `${message.id}-alert`,
                      iconSize: 12
                    }
                  ) : null
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "td",
                  {
                    className: "pager-table__cell pager-table__cell--address",
                    title: address ?? void 0,
                    onClick: (e) => {
                      if (!canOpenMap)
                        return;
                      e.stopPropagation();
                      setMapOpen(true);
                    },
                    onKeyDown: (e) => {
                      if (!canOpenMap)
                        return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setMapOpen(true);
                      }
                    },
                    role: canOpenMap ? "button" : void 0,
                    tabIndex: canOpenMap ? 0 : -1,
                    "aria-haspopup": canOpenMap ? "dialog" : void 0,
                    "aria-expanded": canOpenMap ? mapOpen ? true : false : void 0,
                    children: [
                      showMapIcon ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "a",
                        {
                          href: mapLinkUrl ?? "#",
                          className: "pager-table__map-link pager-table__map-link--leading",
                          onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMapOpen(true);
                          },
                          title: mapLinkUrl ? "View location map" : void 0,
                          "aria-hidden": true,
                          tabIndex: -1,
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(MapPin, { size: 12 })
                        }
                      ) : null,
                      address ? canOpenMap ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "a",
                        {
                          href: mapLinkUrl ?? "#",
                          className: "pager-table__map-link",
                          onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMapOpen(true);
                          },
                          title: mapLinkUrl ? "View location map" : void 0,
                          children: address
                        }
                      ) : address : "—"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pager-table__cell pager-table__cell--tg", children: tg2 ?? "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "pager-table__cell pager-table__cell--units", title: units ?? void 0, children: units ?? "—" })
              ]
            }
          ),
          isOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { className: "pager-table__row--details", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "pager-table__details", colSpan: hideTimeColumn ? 4 : 5, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pager-table__details-grid", children: message.fields.filter((f2) => f2.key !== "raw_message").map((field) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "pager-table__detail",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pager-table__detail-label", children: field.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pager-table__detail-value", children: field.values.join(", ") })
                ]
              },
              `${message.id}-${field.key}`
            )) }),
            message.notes.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pager-table__notes", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pager-table__notes-title", children: "Notes" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { children: message.notes.map((note, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: note }, `${message.id}-note-${i}`)) })
            ] }) : null,
            fragmentElements.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pager-table__raw", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pager-table__raw-title", children: "Raw message" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pager-table__fragment-list", children: fragmentElements })
            ] }) : null
          ] }) }) : null
        ] }, message.id);
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Dialog,
      {
        open: mapOpen,
        onClose: () => setMapOpen(false),
        title: "",
        id: `${groupId}-map-dialog`,
        fullscreen: true,
        overlayClassName: "app-modal--map-fullscreen",
        headerClassName: "app-modal__header--hidden",
        bodyClassName: "map-dialog__body",
        children: mapEmbedUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-thread__incident-map", style: { width: "100%" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "iframe",
          {
            className: "transcript-thread__incident-map-frame",
            src: mapEmbedUrl,
            title: "Incident location",
            "aria-label": "Incident map"
          }
        ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-body-secondary", children: "Location not available." })
      }
    )
  ] }, `${groupId}-pager`);
};
const TranscriptionReviewControls$1 = "";
const statusLabels = {
  pending: "Pending review",
  corrected: "Correction saved",
  verified: "Verified for training"
};
const statusIcon = (status) => {
  switch (status) {
    case "corrected":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 14 });
    case "verified":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle2, { size: 14 });
    default:
      return /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 14 });
  }
};
const TranscriptionReviewControls = ({
  transcription,
  onReview,
  readOnly = false
}) => {
  var _a2;
  const [editingText, setEditingText] = reactExports.useState(
    () => transcription.correctedText ?? transcription.text
  );
  const [reviewer, setReviewer] = reactExports.useState(
    () => transcription.reviewedBy ?? ""
  );
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const isReadOnly = Boolean(readOnly);
  reactExports.useEffect(() => {
    setEditingText(transcription.correctedText ?? transcription.text);
    setReviewer(transcription.reviewedBy ?? "");
    setError(null);
  }, [
    transcription.correctedText,
    transcription.id,
    transcription.reviewedBy,
    transcription.text
  ]);
  const reviewStatus = transcription.reviewStatus ?? "pending";
  const originalText = reactExports.useMemo(
    () => transcription.text ?? "",
    [transcription.text]
  );
  const trimmedOriginal = originalText.trim();
  const trimmedDraft = editingText.trim();
  const finalReviewedText = reactExports.useMemo(() => {
    if (typeof transcription.correctedText === "string" && transcription.correctedText.trim().length > 0) {
      return transcription.correctedText.trim();
    }
    return transcription.text;
  }, [transcription.correctedText, transcription.text]);
  const hasDraftChange = trimmedDraft !== trimmedOriginal;
  const reviewerValue = reviewer.trim();
  const lastReviewedAtNode = transcription.reviewedAt ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    Timestamp,
    {
      value: transcription.reviewedAt,
      mode: "datetime"
    }
  ) : null;
  const handleSubmit = async (status) => {
    if (isReadOnly) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onReview(transcription.id, {
        reviewStatus: status,
        correctedText: status === "pending" ? null : editingText,
        reviewer: status === "pending" ? null : reviewerValue || null
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update transcription"
      );
    } finally {
      setSaving(false);
    }
  };
  const disableCorrectionSave = trimmedDraft.length === 0 || saving || isReadOnly;
  const disableVerify = saving || isReadOnly;
  const disableReset = saving || reviewStatus === "pending" || isReadOnly;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `review-badge review-badge--${reviewStatus}`, children: [
        statusIcon(reviewStatus),
        statusLabels[reviewStatus]
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "review-editor__meta", children: lastReviewedAtNode ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Last updated ",
        lastReviewedAtNode,
        transcription.reviewedBy ? ` by ${transcription.reviewedBy}` : ""
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "No review recorded yet" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__body", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__original", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "review-editor__label", children: "Original transcript" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "review-editor__text",
            "data-variant": hasDraftChange ? "muted" : "default",
            children: originalText || "—"
          }
        )
      ] }),
      isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__note", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "review-editor__label", children: "Reviewer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "review-editor__text", children: ((_a2 = transcription.reviewedBy) == null ? void 0 : _a2.trim()) || "—" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              className: "review-editor__label",
              htmlFor: `review-draft-${transcription.id}`,
              children: "Correction draft"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "textarea",
            {
              id: `review-draft-${transcription.id}`,
              className: "form-control review-editor__textarea",
              value: editingText,
              onChange: (event) => setEditingText(event.target.value),
              rows: Math.max(
                2,
                Math.min(6, Math.ceil(editingText.length / 80))
              ),
              disabled: saving
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__note", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              className: "review-editor__label",
              htmlFor: `reviewer-${transcription.id}`,
              children: "Reviewer (optional)"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: `reviewer-${transcription.id}`,
              type: "text",
              className: "form-control form-control-sm",
              value: reviewer,
              onChange: (event) => setReviewer(event.target.value),
              placeholder: "Your name or callsign",
              disabled: saving
            }
          )
        ] })
      ] })
    ] }),
    isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "review-editor__notice text-body-secondary small", children: "Sign in to update review status or corrections." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__actions-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              size: "sm",
              use: "primary",
              onClick: () => void handleSubmit("corrected"),
              disabled: disableCorrectionSave,
              startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { size: 14 }),
              children: "Save correction"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              type: "button",
              size: "sm",
              use: "success",
              onClick: () => void handleSubmit("verified"),
              disabled: disableVerify,
              startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle2, { size: 14 }),
              children: "Mark verified"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            size: "sm",
            use: "secondary",
            onClick: () => void handleSubmit("pending"),
            disabled: disableReset,
            startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 14 }),
            children: "Clear review"
          }
        )
      ] }),
      error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "review-editor__error", children: error }) : null
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "review-editor__footer", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "review-editor__footer-label", children: "Reviewed transcript" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "review-editor__footer-text", children: finalReviewedText || "—" })
    ] })
  ] });
};
const StreamTranscriptThread = ({
  streamId,
  group,
  orderedTranscriptions,
  streamIsPager,
  transcriptCorrectionEnabled,
  isReadOnly,
  playingRecording,
  playingTranscriptionId,
  playingSegmentId,
  recordingAudioRefs,
  onPlayAll,
  onPlaySegment,
  onStopPlayback,
  isSegmentCurrentlyPlaying,
  openPagerMessageIds,
  onTogglePagerMessage,
  onReviewTranscription,
  baseLocation: streamBaseLocation
}) => {
  const renderedRecordings = /* @__PURE__ */ new Set();
  const audioElements = [];
  const incidentSource = group.transcriptions.find(
    (item) => {
      var _a2;
      return (_a2 = item.pagerIncident) == null ? void 0 : _a2.incidentId;
    }
  );
  const incidentDetails = (incidentSource == null ? void 0 : incidentSource.pagerIncident) ?? null;
  const { baseLocation, googleMapsApiKey } = useUISettings();
  const effectiveBaseLocation = streamBaseLocation ?? baseLocation;
  const baseLocationSuffix = reactExports.useMemo(() => {
    if (!effectiveBaseLocation)
      return null;
    const parts = [];
    if (effectiveBaseLocation.state)
      parts.push(effectiveBaseLocation.state);
    if (effectiveBaseLocation.country)
      parts.push(effectiveBaseLocation.country);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [effectiveBaseLocation]);
  const incidentIdLabel = (() => {
    const value = (incidentDetails == null ? void 0 : incidentDetails.incidentId) ?? group.pagerIncidentId ?? null;
    if (typeof value !== "string")
      return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const incidentCallType = (incidentDetails == null ? void 0 : incidentDetails.callType) ?? null;
  const incidentMetaParts = [];
  if (incidentDetails == null ? void 0 : incidentDetails.address)
    incidentMetaParts.push(incidentDetails.address);
  if (incidentDetails == null ? void 0 : incidentDetails.alarmLevel)
    incidentMetaParts.push(`Alarm level ${incidentDetails.alarmLevel}`);
  if (incidentDetails == null ? void 0 : incidentDetails.talkgroup)
    incidentMetaParts.push(`Talkgroup ${incidentDetails.talkgroup}`);
  if (incidentDetails == null ? void 0 : incidentDetails.map)
    incidentMetaParts.push(`Map ${incidentDetails.map}`);
  const incidentNarrative = (incidentDetails == null ? void 0 : incidentDetails.narrative) ?? null;
  const incidentLocationQuery = (() => {
    if (!incidentDetails)
      return null;
    const parts = [];
    if (incidentDetails.address)
      parts.push(incidentDetails.address);
    if (incidentDetails.map && !parts.includes(incidentDetails.map)) {
      parts.push(`Map ${incidentDetails.map}`);
    }
    if (baseLocationSuffix) {
      parts.push(baseLocationSuffix);
    }
    return parts.length > 0 ? parts.join(", ") : null;
  })();
  const incidentLocationUrls = incidentLocationQuery ? (() => {
    const encodedQuery = encodeURIComponent(incidentLocationQuery);
    const embed = googleMapsApiKey ? `https://www.google.com/maps/embed/v1/search?key=${googleMapsApiKey}&q=${encodedQuery}&zoom=15` : `https://maps.google.com/maps?hl=en&q=${encodedQuery}&ie=UTF8&output=embed`;
    return {
      embed,
      link: `https://maps.google.com/maps?hl=en&q=${encodedQuery}&ie=UTF8&z=15`
    };
  })() : null;
  const transcriptionElements = group.transcriptions.map((transcription) => {
    const items = [];
    const recordingUrl = transcription.recordingUrl;
    const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
    const isSystemEvent = isSystemTranscription(transcription);
    if (recordingUrl && recordingId && !renderedRecordings.has(recordingId)) {
      renderedRecordings.add(recordingId);
      audioElements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AudioElement,
          {
            recordingId,
            recordingUrl,
            refsMap: recordingAudioRefs
          },
          recordingId
        )
      );
    }
    if (isSystemEvent) {
      const label = typeof transcription.text === "string" ? transcription.text.trim() : "";
      if (label) {
        items.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            SystemEventChip,
            {
              label,
              eventType: transcription.eventType
            },
            `${transcription.id}-system`
          )
        );
      }
      return { id: transcription.id, items };
    }
    const blankAudio = isBlankAudioText(transcription.text);
    const reviewStatus = transcription.reviewStatus ?? "pending";
    const correctedText = typeof transcription.correctedText === "string" && transcription.correctedText.trim().length > 0 ? transcription.correctedText : null;
    const displayText = correctedText ?? transcription.text;
    const alertTriggers = getNotifiableAlerts(transcription.alerts);
    if (alertTriggers.length > 0) {
      items.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertChips, { triggers: alertTriggers, mode: "collapsed" }, `${transcription.id}-alert`)
      );
    }
    items.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TranscriptionSegmentChips,
        {
          transcription,
          displayText,
          blankAudio,
          transcriptCorrectionEnabled,
          recordingUrl,
          recordingId,
          playingSegmentId,
          onPlaySegment,
          isSegmentCurrentlyPlaying,
          boundaryKey: "end-marker"
        },
        `${transcription.id}-segments`
      )
    );
    if (transcriptCorrectionEnabled && reviewStatus !== "pending") {
      items.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: `review-badge review-badge--${reviewStatus}`,
            children: reviewStatus === "verified" ? "Verified" : "Correction saved"
          },
          `${transcription.id}-status`
        )
      );
    }
    if (transcriptCorrectionEnabled) {
      items.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TranscriptionReviewControls,
          {
            transcription,
            onReview: onReviewTranscription,
            readOnly: isReadOnly
          }
        ) }, `${transcription.id}-review`)
      );
    }
    return { id: transcription.id, items };
  });
  const transcriptionItems = transcriptionElements.flatMap((entry) => entry.items);
  const groupHasAlerts = group.transcriptions.some(
    (item) => getNotifiableAlerts(item.alerts).length > 0
  );
  const hasStandardTranscriptions = group.transcriptions.some(
    (item) => !isSystemTranscription(item)
  );
  const firstPlayableTranscription = group.transcriptions.find((t2) => Boolean(t2.recordingUrl));
  const isGroupPlaying = group.transcriptions.some((t2) => {
    if (!t2.recordingUrl)
      return false;
    const rid = getRecordingElementId(t2.recordingUrl);
    return playingRecording === rid && playingTranscriptionId === t2.id;
  });
  const playButton = firstPlayableTranscription ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      use: "unstyled",
      onClick: () => {
        if (isGroupPlaying) {
          onStopPlayback();
        } else {
          onPlayAll(streamId, firstPlayableTranscription, orderedTranscriptions);
        }
      },
      className: "chip-button chip-button--accent",
      children: [
        isGroupPlaying ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 14 }),
        isGroupPlaying ? "Stop" : "Play"
      ]
    },
    `${group.id}-play`
  ) : null;
  const pagerMessages = streamIsPager ? condensePagerTranscriptions(
    group.transcriptions.filter((item) => !isSystemTranscription(item))
  ) : [];
  const elementMap = new Map(
    transcriptionElements.map((entry) => [entry.id, entry.items])
  );
  const aggregatedIds = pagerMessages.length > 0 ? new Set(
    pagerMessages.flatMap(
      (message) => message.fragments.map((fragment) => fragment.id)
    )
  ) : null;
  const baseItems = aggregatedIds !== null ? transcriptionElements.filter((entry) => !aggregatedIds.has(entry.id)).flatMap((entry) => entry.items) : transcriptionItems;
  const pagerContent = pagerMessages.length > 0 ? [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PagerTranscriptTable,
      {
        groupId: group.id,
        messages: pagerMessages,
        elementMap,
        openMessageIds: openPagerMessageIds,
        onToggleMessage: onTogglePagerMessage,
        incidentLocationUrls,
        incidentLocationQuery: incidentLocationQuery ?? void 0
      },
      `${group.id}-pager`
    )
  ] : [];
  const groupContent = [
    ...playButton ? [playButton] : [],
    ...pagerContent,
    ...baseItems
  ];
  const transcriptContentClassName = streamIsPager ? "transcript-thread__content transcript-thread__content--pager" : "transcript-thread__content";
  const headerLocationUrls = incidentLocationUrls && !(streamIsPager && pagerMessages.length > 0) ? incidentLocationUrls : null;
  const useCompactPagerHeader = streamIsPager && pagerMessages.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "article",
    {
      className: `transcript-thread${groupHasAlerts ? " transcript-thread--alert" : ""}${isGroupPlaying ? " transcript-thread--playing" : ""}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-thread__body", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "transcript-thread__header", children: [
          group.startTimestamp ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: group.startTimestamp, className: "transcript-thread__time" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TimeInterval,
              {
                value: group.startTimestamp,
                className: "ms-1 transcript-thread__time",
                condensed: true
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-thread__time", children: "Unknown" }),
          group.transcriptions.length > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "transcript-thread__updates", children: [
            "+",
            group.transcriptions.length - 1,
            " updates"
          ] }) : null,
          !hasStandardTranscriptions ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-meta__confidence transcript-meta__confidence--system", children: "System event" }) : null
        ] }),
        incidentIdLabel || incidentCallType || !useCompactPagerHeader && (incidentMetaParts.length > 0 || incidentNarrative) ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-thread__incident-summary", children: [
          incidentIdLabel || incidentCallType ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-thread__incident", children: [
            incidentIdLabel ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-thread__incident-id", children: incidentIdLabel }) : null,
            incidentCallType ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-thread__incident-type", children: incidentCallType }) : null
          ] }) : null,
          !useCompactPagerHeader && incidentMetaParts.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-thread__incident-meta", children: incidentMetaParts.map((part, index2) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: part }, `${group.id}-incident-meta-${index2}`)) }) : null,
          !useCompactPagerHeader && incidentNarrative ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-thread__incident-narrative", children: incidentNarrative }) : null,
          headerLocationUrls ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-thread__incident-map", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "iframe",
              {
                className: "transcript-thread__incident-map-frame",
                src: headerLocationUrls.embed,
                title: "Incident location",
                "aria-label": "Incident map"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "a",
              {
                className: "transcript-thread__incident-map-link",
                href: headerLocationUrls.link,
                target: "_blank",
                rel: "noopener noreferrer",
                children: "View in Google Maps"
              }
            )
          ] }) : null
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: transcriptContentClassName, children: groupContent }),
        audioElements.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden", "aria-hidden": true, children: audioElements }) : null
      ] })
    }
  );
};
const FocusContextPanel = ({
  anchor,
  windowMinutes,
  transcriptionsCount,
  loading,
  error,
  onClear,
  children
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border border-border rounded-md p-3 text-sm bg-surface-subtle transition-colors", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "font-medium text-ink-muted", children: [
          "Context around ",
          anchor ? /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: anchor, mode: "datetime" }) : "selected time",
          " (±",
          windowMinutes,
          " min)"
        ] }),
        anchor ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-ink-subtle", children: [
          transcriptionsCount,
          " transcripts in window"
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          use: "unstyled",
          onClick: onClear,
          className: "flex items-center gap-1 text-xs text-ink-muted hover:text-ink",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3 h-3" }),
            "Clear"
          ]
        }
      ) })
    ] }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-ink-subtle flex items-center gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-3 h-3 animate-spin" }),
      "Loading context..."
    ] }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-danger", children: error }) : transcriptionsCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-ink-subtle", children: "No transcripts found in this window." })
  ] });
};
const StreamMetricsSummary = ({ transcriptions }) => {
  const metrics = calculatePerformanceMetrics(transcriptions);
  const hasMetricsData = metrics.transcriptionCount > 0;
  const lastMetricsTimestamp = typeof metrics.lastTranscriptionTime === "number" && Number.isFinite(metrics.lastTranscriptionTime) ? metrics.lastTranscriptionTime : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-stream__summary-block", children: hasMetricsData ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { size: 14, className: "text-primary" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Transcriptions" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold text-body", children: metrics.transcriptionCount })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-success", children: "Accuracy" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fw-semibold text-success", children: [
          clampAccuracyPercentage(metrics.averageAccuracy).toFixed(1),
          "%"
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 14, className: "text-info" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Avg duration" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold text-info", children: formatDurationSeconds(metrics.averageDuration) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center justify-content-between gap-3 rounded border bg-body p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2 text-uppercase text-body-secondary small fw-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { size: 14, className: "text-warning" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Total duration" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold text-warning", children: formatDurationSeconds(metrics.totalDuration) })
      ] }) })
    ] }),
    lastMetricsTimestamp ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 small text-body-secondary", children: [
      "Last transcription: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: lastMetricsTimestamp, mode: "datetime" })
    ] }) : null
  ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "small text-body-secondary", children: "No transcription metrics available yet." }) });
};
const INITIAL_HISTORY_WINDOW_MINUTES = 180;
const INITIAL_HISTORY_WINDOW_MS = INITIAL_HISTORY_WINDOW_MINUTES * 60 * 1e3;
const HISTORY_FETCH_LIMIT = 50;
const MAX_SEARCH_RESULTS = 100;
const DEFAULT_FOCUS_WINDOW_MINUTES = 10;
const isPagerStream$1 = (stream) => (stream.source ?? "audio") === "pager";
const buildPagerWebhookPath$1 = (stream) => {
  if (!isPagerStream$1(stream))
    return null;
  const base = stream.url ?? "";
  const token = stream.webhookToken;
  if (!base && !token)
    return null;
  const suffix = token ? `${base.includes("?") ? "&" : "?"}token=${token}` : "";
  return `${base}${suffix}`;
};
const getStatusIcon = (status) => {
  switch (status) {
    case "transcribing":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4", "aria-hidden": "true" });
    case "queued":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4", "aria-hidden": "true" });
    case "error":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-4 h-4", "aria-hidden": "true" });
    case "stopped":
    default:
      return /* @__PURE__ */ jsxRuntimeExports.jsx(MicOff, { className: "w-4 h-4", "aria-hidden": "true" });
  }
};
const getStatusLabel = (status) => {
  switch (status) {
    case "transcribing":
      return "Live transcription";
    case "queued":
      return "Queued for transcription";
    case "error":
      return "Stream error";
    case "stopped":
    default:
      return "Transcription stopped";
  }
};
const getStatusModifier = (status) => {
  switch (status) {
    case "transcribing":
      return "transcribing";
    case "queued":
      return "queued";
    case "error":
      return "error";
    case "stopped":
    default:
      return "stopped";
  }
};
const StreamSection = ({
  stream,
  isStandalone,
  recordingAudioRefs,
  playingRecording,
  playingTranscriptionId,
  playingSegmentId,
  onPlayAll,
  onPlaySegment,
  onStopPlayback,
  isSegmentCurrentlyPlaying,
  onReviewTranscription,
  onResetStream,
  onStandaloneControlsChange,
  onExportPagerFeed,
  onSelectPagerExportStream,
  pagerExporting = false
}) => {
  var _a2, _b2, _c2, _d2, _e2, _f2;
  const { authFetch, role, authenticated, requiresPassword } = useAuth();
  const isReadOnly = role !== "editor";
  const canViewWebhookDetails = !isReadOnly && (authenticated || !requiresPassword);
  const { transcriptCorrectionEnabled } = useUISettings();
  const [expanded, setExpanded] = reactExports.useState(isStandalone);
  const [openSearch, setOpenSearch] = reactExports.useState(false);
  const [jumpTimestampValue, setJumpTimestampValue] = reactExports.useState("");
  const [jumpWindowValue, setJumpWindowValue] = reactExports.useState(
    DEFAULT_FOCUS_WINDOW_MINUTES
  );
  const [openPagerMessageIds, setOpenPagerMessageIds] = reactExports.useState({});
  const [openStandaloneTool, setOpenStandaloneTool] = reactExports.useState(null);
  const history = useStreamTranscriptions(stream.id, authFetch, HISTORY_FETCH_LIMIT);
  const search = useStreamSearch(stream.id, authFetch, MAX_SEARCH_RESULTS);
  const focus = useStreamFocusWindow(stream.id, authFetch, HISTORY_FETCH_LIMIT);
  const statusModifier = getStatusModifier(stream.status);
  const statusLabel = getStatusLabel(stream.status);
  const streamIsPager = isPagerStream$1(stream);
  const isTranscribing = stream.status === "transcribing";
  const visibleTranscriptions = reactExports.useMemo(
    () => selectVisibleTranscriptions(stream.transcriptions ?? [], {
      historyTranscriptions: history.state.transcriptions ?? [],
      windowMs: INITIAL_HISTORY_WINDOW_MS,
      fallbackLimit: 10
    }),
    [stream.transcriptions, history.state.transcriptions]
  );
  const shouldPrepareDetails = isStandalone || expanded;
  const prepared = reactExports.useMemo(() => {
    if (!shouldPrepareDetails || visibleTranscriptions.length === 0) {
      return { groupedTranscriptions: [], orderedTranscriptions: visibleTranscriptions };
    }
    const p2 = prepareTranscriptions(visibleTranscriptions);
    return { groupedTranscriptions: p2.groupedTranscriptions, orderedTranscriptions: p2.sortedTranscriptions };
  }, [shouldPrepareDetails, visibleTranscriptions]);
  const focusPrepared = reactExports.useMemo(
    () => focus.state ? prepareTranscriptions(focus.state.transcriptions) : null,
    [focus.state]
  );
  const hasTranscriptions = visibleTranscriptions.length > 0;
  const latestTranscription = hasTranscriptions ? visibleTranscriptions[visibleTranscriptions.length - 1] : null;
  const earliestTimestamp = hasTranscriptions ? visibleTranscriptions[0].timestamp : null;
  const canListenLive = !streamIsPager && stream.enabled;
  const liveAudioPath = `/api/streams/${encodeURIComponent(stream.id)}/live`;
  const {
    isActiveStream,
    isListening: isLiveSessionListening,
    listen: listenToStream,
    stop: stopLiveStream,
    error: liveSessionError
  } = useLiveAudioSession();
  const isLiveStreamActive = isActiveStream(stream.id);
  const liveListening = isLiveStreamActive && isLiveSessionListening;
  const liveAudioError = liveListening ? liveSessionError : null;
  const liveStreamLabel = getStreamTitle(stream);
  reactExports.useEffect(() => {
    if (!canListenLive && liveListening) {
      stopLiveStream();
    }
  }, [canListenLive, liveListening, stopLiveStream]);
  const canLoadMoreHistory = history.state.hasMoreBefore !== false;
  const pagerWebhookPath = canViewWebhookDetails ? buildPagerWebhookPath$1(stream) : null;
  const togglePagerMessageFragments = (messageId) => {
    setOpenPagerMessageIds((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };
  const standaloneControls = useStandaloneControls({
    streamId: stream.id,
    streamName: stream.name,
    stream,
    isReadOnly,
    isPagerStream: streamIsPager,
    isTranscribing,
    visibleTranscriptions,
    liveAudio: {
      isListening: liveListening,
      error: liveAudioError,
      toggle: () => {
        if (!canListenLive)
          return;
        if (liveListening) {
          stopLiveStream();
          return;
        }
        listenToStream({
          id: stream.id,
          name: liveStreamLabel,
          baseUrl: liveAudioPath,
          canListen: canListenLive,
          url: stream.url ?? null
        });
      }
    },
    recordingAudioRefs,
    canListenLive,
    search: {
      input: search.input,
      setInput: search.setInput,
      state: search.state && {
        query: search.state.query,
        loading: search.state.loading,
        error: search.state.error,
        results: search.state.results
      },
      search: (q2) => void search.search(q2),
      clear: () => search.clear()
    },
    focus: {
      state: focus.state && {
        loading: focus.state.loading,
        error: focus.state.error
      },
      jumpTimestampValue,
      jumpWindowValue,
      setJumpTimestampValue,
      setJumpWindowValue,
      goToTimestamp: (ts, win) => void focus.goToTimestamp(ts, win)
    },
    transcriptCorrectionEnabled,
    playingSegmentId,
    onPlaySegment,
    isSegmentCurrentlyPlaying,
    onResetStream,
    onExportPagerFeed,
    onSelectPagerExportStream,
    pagerExporting,
    openTool: openStandaloneTool,
    setOpenTool: setOpenStandaloneTool
  });
  reactExports.useEffect(() => {
    if (!isStandalone || !onStandaloneControlsChange)
      return;
    onStandaloneControlsChange(standaloneControls);
    return () => onStandaloneControlsChange(null);
  }, [isStandalone, onStandaloneControlsChange, standaloneControls]);
  const handleReset = () => {
    if (isReadOnly)
      return;
    onResetStream(stream.id);
    history.clear();
    search.clear();
    focus.clear();
  };
  const renderGroupedTranscriptions = (groups, orderedTranscriptions) => groups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    StreamTranscriptThread,
    {
      streamId: stream.id,
      group,
      orderedTranscriptions,
      streamIsPager,
      transcriptCorrectionEnabled,
      isReadOnly,
      playingRecording,
      playingTranscriptionId,
      playingSegmentId,
      recordingAudioRefs,
      onPlayAll: (_sid, t2) => onPlayAll(stream.id, t2, orderedTranscriptions),
      onPlaySegment,
      onStopPlayback,
      isSegmentCurrentlyPlaying,
      openPagerMessageIds,
      onTogglePagerMessage: togglePagerMessageFragments,
      onReviewTranscription,
      baseLocation: stream.baseLocation ?? null
    },
    group.id
  ));
  const sanitizedStreamId = stream.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const searchPopoverId = `stream-search-${sanitizedStreamId}`;
  const searchHeadingId = `${searchPopoverId}-title`;
  const listenButtonUse = liveListening ? "success" : "primary";
  const streamTitle = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-3", children: [
    !isStandalone ? expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "text-secondary", size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "text-secondary", size: 16 }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { className: "text-secondary", size: 20, "aria-hidden": "true" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__title-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "h6 mb-0 text-body", children: stream.name }),
        stream.status === "stopped" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-stream__stopped-pill", children: "[STOPPED]" }) : stream.status === "queued" ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-stream__queued-pill", children: "[QUEUED]" }) : null
      ] }),
      streamIsPager ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "small text-body-secondary d-flex flex-wrap align-items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge text-bg-info-subtle text-info-emphasis text-uppercase", children: "Pager feed" }),
        pagerWebhookPath && /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: pagerWebhookPath })
      ] }) : stream.url ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: stream.url,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "small text-decoration-none link-primary",
          children: stream.url
        }
      ) : null
    ] })
  ] });
  const streamMeta = /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex flex-wrap align-items-center gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `transcript-stream__status transcript-stream__status--${statusModifier}`.trim(),
        role: "status",
        "aria-live": "polite",
        "aria-label": statusLabel,
        title: statusLabel,
        children: getStatusIcon(stream.status)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "small text-body-secondary", children: [
      visibleTranscriptions.length,
      " visible"
    ] }),
    latestTranscription && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "small text-body-secondary", children: [
      "Last: ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(Timestamp, { value: latestTranscription.timestamp })
    ] }),
    !isReadOnly && hasTranscriptions && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        size: "sm",
        use: "danger",
        onClick: (e) => {
          e.stopPropagation();
          if (window.confirm(
            `Are you sure you want to clear all transcriptions and recordings for "${stream.name}"? This action cannot be undone.`
          )) {
            handleReset();
          }
        },
        title: "Clear all transcriptions and recordings for this stream",
        startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 14 }),
        children: "Reset"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        size: "sm",
        use: listenButtonUse,
        onClick: (e) => {
          e.stopPropagation();
          console.info("[live-audio] listen button clicked", {
            streamId: stream.id,
            canListenLive,
            status: stream.status
          });
          if (liveListening) {
            stopLiveStream();
          } else {
            listenToStream({
              id: stream.id,
              name: liveStreamLabel,
              baseUrl: liveAudioPath,
              canListen: canListenLive,
              url: stream.url ?? null
            });
          }
        },
        title: "Toggle live audio monitoring",
        startContent: liveListening ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "live-listening-icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { size: 14 }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 14 }),
        children: liveListening ? "Stop listening" : "Listen live"
      }
    )
  ] });
  const detailsId = `stream-${stream.id}-details`;
  const headerElement = isStandalone ? null : /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Button,
    {
      use: "unstyled",
      className: `transcript-stream__header${statusModifier ? ` transcript-stream__header--${statusModifier}` : ""}`,
      onClick: () => setExpanded((v2) => !v2),
      "aria-expanded": expanded,
      "aria-controls": detailsId,
      children: [
        streamTitle,
        streamMeta
      ]
    }
  );
  const summarySections = [];
  if (liveListening && liveAudioError) {
    summarySections.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-stream__summary-block", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "small text-danger", role: "alert", children: liveAudioError }) }, "live-audio-error")
    );
  }
  if (!isStandalone) {
    summarySections.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(StreamMetricsSummary, { transcriptions: visibleTranscriptions }, "metrics")
    );
  }
  const renderedSummarySections = summarySections.map((section, index2) => {
    const className = (section.props.className ?? "").split(" ").filter(Boolean);
    if (headerElement && index2 === 0) {
      className.push("transcript-stream__summary-block--with-header");
    }
    return reactExports.cloneElement(section, { className: className.join(" ") });
  });
  const streamControls = /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-stream__controls", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__toolbar", children: [
    !isStandalone ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__search", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: "primary",
          appearance: "outline",
          onClick: () => setOpenSearch((v2) => !v2),
          "aria-expanded": openSearch,
          "aria-controls": openSearch ? searchPopoverId : void 0,
          startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { size: 14 }),
          isCondensed: true,
          tooltip: openSearch ? "Hide search" : "Search history",
          children: openSearch ? "Hide search" : "Search history"
        }
      ),
      openSearch ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        SearchPanel,
        {
          variant: "popover",
          id: searchPopoverId,
          headingId: searchHeadingId,
          searchValue: search.input,
          activeQuery: ((_a2 = search.state) == null ? void 0 : _a2.query) ?? null,
          loading: Boolean((_b2 = search.state) == null ? void 0 : _b2.loading),
          error: ((_c2 = search.state) == null ? void 0 : _c2.error) ?? null,
          results: ((_d2 = search.state) == null ? void 0 : _d2.results) ?? [],
          onChange: (value) => search.setInput(value),
          onSearch: (value) => void search.search(value),
          onClear: () => search.clear(),
          onClose: () => setOpenSearch(false),
          onViewContext: (timestamp) => {
            setJumpTimestampValue(timestamp);
            void focus.goToTimestamp(timestamp, jumpWindowValue);
            setOpenSearch(false);
          },
          transcriptContext: {
            streamName: stream.name,
            stream,
            transcriptCorrectionEnabled,
            playingSegmentId,
            onPlaySegment,
            isSegmentCurrentlyPlaying,
            recordingAudioRefs
          }
        }
      ) : null
    ] }) : null,
    !isStandalone ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__jump-form", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-stream__toolbar-label", children: "Go to timestamp" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        JumpForm,
        {
          timestampValue: jumpTimestampValue,
          windowMinutes: jumpWindowValue,
          isLoading: ((_e2 = focus.state) == null ? void 0 : _e2.loading) ?? false,
          onTimestampChange: (value) => setJumpTimestampValue(value),
          onWindowMinutesChange: (value) => setJumpWindowValue(value),
          onSubmit: (value, windowMinutes) => {
            if (!value) {
              return;
            }
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
              return;
            }
            setJumpTimestampValue(value);
            void focus.goToTimestamp(parsed.toISOString(), windowMinutes);
          }
        }
      )
    ] }) : null
  ] }) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `transcript-stream${expanded ? " transcript-stream--expanded" : ""}${statusModifier ? ` transcript-stream--${statusModifier}` : ""}`,
      children: [
        headerElement,
        renderedSummarySections,
        (expanded || isStandalone) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-stream__details", id: detailsId, children: [
          focus.state && /* @__PURE__ */ jsxRuntimeExports.jsx(
            FocusContextPanel,
            {
              anchor: focus.state.anchor,
              windowMinutes: focus.state.windowMinutes,
              transcriptionsCount: focus.state.transcriptions.length,
              loading: focus.state.loading,
              error: focus.state.error,
              onClear: () => focus.clear(),
              children: focusPrepared && renderGroupedTranscriptions(
                focusPrepared.groupedTranscriptions,
                focusPrepared.sortedTranscriptions
              )
            }
          ),
          streamControls,
          hasTranscriptions ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            StreamTranscriptList,
            {
              orderedTranscriptions: prepared.orderedTranscriptions,
              isTranscribing: stream.enabled,
              onLoadEarlier: canLoadMoreHistory ? () => history.loadEarlier(
                earliestTimestamp ?? (/* @__PURE__ */ new Date()).toISOString()
              ) : null,
              hasMoreHistory: canLoadMoreHistory,
              isLoadingHistory: history.state.loading,
              historyError: history.state.error,
              children: renderGroupedTranscriptions(
                prepared.groupedTranscriptions,
                prepared.orderedTranscriptions
              )
            }
          ) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center py-8 text-sm text-neutral", children: visibleTranscriptions.length === 0 && ((_f2 = history.state.transcriptions) == null ? void 0 : _f2.length) ? "No transcriptions in recent history." : stream.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center justify-content-center gap-2 text-accent", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { className: "w-4 h-4 animate-spin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Waiting for new updates…" })
          ] }) : "No transcriptions yet for this stream." }) })
        ] })
      ]
    }
  );
};
const WaveformSegmentOverlay$1 = "";
const MIN_LABEL_WIDTH_PX = 60;
const REFERENCE_WIDTH_PX = 400;
const WaveformSegmentOverlay = ({
  segments,
  transcriptionId,
  duration,
  onSegmentClick,
  height = 40
}) => {
  const hoveredContext = useHoveredSegmentOptional();
  const segmentPositions = reactExports.useMemo(() => {
    if (duration <= 0 || segments.length === 0) {
      return [];
    }
    return segments.map((segment, index2) => {
      const leftPercent = Math.max(0, segment.start / duration * 100);
      const rightPercent = Math.min(100, segment.end / duration * 100);
      const widthPercent = Math.max(0.5, rightPercent - leftPercent);
      const estimatedWidthPx = widthPercent / 100 * REFERENCE_WIDTH_PX;
      const showLabel = estimatedWidthPx >= MIN_LABEL_WIDTH_PX;
      return {
        segment,
        index: index2,
        leftPercent,
        widthPercent,
        showLabel,
        segmentId: buildHoveredSegmentId(transcriptionId, segment.id)
      };
    });
  }, [segments, duration, transcriptionId]);
  if (segmentPositions.length === 0) {
    return null;
  }
  const handleMouseEnter = (segmentId) => {
    hoveredContext == null ? void 0 : hoveredContext.setHoveredSegmentId(segmentId);
  };
  const handleMouseLeave = () => {
    hoveredContext == null ? void 0 : hoveredContext.setHoveredSegmentId(null);
  };
  const handleClick = (segment, e) => {
    if (onSegmentClick) {
      e.stopPropagation();
      onSegmentClick(segment);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "waveform-segment-overlay",
      style: { height },
      children: segmentPositions.map(
        ({ segment, index: index2, leftPercent, widthPercent, showLabel, segmentId }) => {
          const isHovered = (hoveredContext == null ? void 0 : hoveredContext.hoveredSegmentId) === segmentId;
          const colorClass = index2 % 2 === 0 ? "even" : "odd";
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `waveform-segment waveform-segment--${colorClass}${isHovered ? " waveform-segment--hovered" : ""}`,
              style: {
                left: `${leftPercent}%`,
                width: `${widthPercent}%`
              },
              onMouseEnter: () => handleMouseEnter(segmentId),
              onMouseLeave: handleMouseLeave,
              onClick: (e) => handleClick(segment, e),
              role: "button",
              tabIndex: 0,
              onKeyDown: (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSegmentClick == null ? void 0 : onSegmentClick(segment);
                }
              },
              "aria-label": `Segment ${index2 + 1}: ${segment.text.slice(0, 50)}${segment.text.length > 50 ? "..." : ""}`,
              children: showLabel && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "waveform-segment__label", children: segment.text })
            },
            segmentId
          );
        }
      )
    }
  );
};
const WaveformDisplay$1 = "";
const WaveformDisplay = ({
  waveform,
  duration,
  currentTime = 0,
  speechStart,
  speechEnd,
  isPlaying = false,
  onSeek,
  height = 32,
  className,
  overlay = false,
  segments,
  transcriptionId,
  onSegmentClick
}) => {
  const numBars = waveform.length;
  const { progressBar, speechStartBar, speechEndBar } = reactExports.useMemo(() => {
    if (duration <= 0) {
      return { progressBar: 0, speechStartBar: null, speechEndBar: null };
    }
    const progress = Math.floor(currentTime / duration * numBars);
    const start = speechStart != null ? Math.floor(speechStart / duration * numBars) : null;
    const end = speechEnd != null ? Math.min(Math.floor(speechEnd / duration * numBars), numBars - 1) : null;
    return { progressBar: progress, speechStartBar: start, speechEndBar: end };
  }, [duration, currentTime, speechStart, speechEnd, numBars]);
  const handleClick = (e) => {
    if (!onSeek || duration <= 0)
      return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const ratio = x2 / rect.width;
    const seekTime = ratio * duration;
    onSeek(Math.max(0, Math.min(duration, seekTime)));
  };
  const overlayClass = overlay ? " waveform-display--overlay" : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `waveform-display${isPlaying ? " waveform-display--playing" : ""}${overlayClass}${className ? ` ${className}` : ""}`,
      style: { height, cursor: onSeek ? "pointer" : "default" },
      onClick: handleClick,
      role: onSeek ? "slider" : "img",
      "aria-label": "Audio waveform",
      "aria-valuenow": onSeek ? currentTime : void 0,
      "aria-valuemin": onSeek ? 0 : void 0,
      "aria-valuemax": onSeek ? duration : void 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "waveform-display__bars", children: waveform.map((amp, i) => {
          const inSpeechRegion = speechStartBar != null && speechEndBar != null && i >= speechStartBar && i <= speechEndBar;
          const barHeight = Math.max(2, amp * (height - 4));
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: `waveform-display__bar${inSpeechRegion ? " waveform-display__bar--speech" : ""}`,
              style: {
                height: barHeight
              }
            },
            i
          );
        }) }),
        segments && segments.length > 0 && transcriptionId && /* @__PURE__ */ jsxRuntimeExports.jsx(
          WaveformSegmentOverlay,
          {
            segments,
            transcriptionId,
            duration,
            onSegmentClick,
            height
          }
        ),
        progressBar > 0 && progressBar < numBars && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `waveform-display__playhead${isPlaying ? "" : " waveform-display__playhead--paused"}`,
            style: { left: `${progressBar / numBars * 100}%` }
          }
        )
      ]
    }
  );
};
const PlaybackBar$1 = "";
const PlaybackBar = ({
  transcription,
  streamName,
  currentPlayTime,
  recordingAudioRefs,
  playingRecordingId,
  volume,
  onTogglePlayback,
  onStop,
  onVolumeChange
}) => {
  const isPlaying = transcription !== null;
  const isMuted = volume === 0;
  const handleSeek = reactExports.useMemo(() => {
    if (!playingRecordingId)
      return void 0;
    return (time) => {
      const audio = recordingAudioRefs.current[playingRecordingId];
      if (audio) {
        audio.currentTime = time;
      }
    };
  }, [playingRecordingId, recordingAudioRefs]);
  const handleVolumeChange = reactExports.useCallback(
    (e) => {
      onVolumeChange(parseFloat(e.target.value));
    },
    [onVolumeChange]
  );
  const handleToggleMute = reactExports.useCallback(() => {
    onVolumeChange(isMuted ? 1 : 0);
  }, [isMuted, onVolumeChange]);
  const waveform = transcription == null ? void 0 : transcription.waveform;
  const duration = transcription == null ? void 0 : transcription.duration;
  const speechStartOffset = transcription == null ? void 0 : transcription.speechStartOffset;
  const speechEndOffset = transcription == null ? void 0 : transcription.speechEndOffset;
  const timestamp = transcription == null ? void 0 : transcription.timestamp;
  const segments = transcription == null ? void 0 : transcription.segments;
  const transcriptionId = transcription == null ? void 0 : transcription.id;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `playback-bar${isPlaying ? " playback-bar--active" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "playback-bar__controls", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          use: "unstyled",
          onClick: onTogglePlayback,
          className: "playback-bar__button playback-bar__button--play",
          "aria-label": isPlaying ? "Pause" : "Play",
          disabled: !isPlaying,
          children: isPlaying ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 18 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 18 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          use: "unstyled",
          onClick: onStop,
          className: "playback-bar__button playback-bar__button--stop",
          "aria-label": "Stop",
          disabled: !isPlaying,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Square, { size: 16 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "playback-bar__info", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { size: 16, className: "playback-bar__icon" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "playback-bar__meta", children: [
        isPlaying && streamName ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "playback-bar__stream", children: streamName }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "playback-bar__stream playback-bar__stream--idle", children: "No audio playing" }),
        isPlaying && timestamp ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Timestamp,
          {
            value: timestamp,
            className: "playback-bar__timestamp",
            showDate: true,
            dateClassName: "ms-1"
          }
        ) : null
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "playback-bar__waveform", children: isPlaying && waveform && duration ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      WaveformDisplay,
      {
        waveform,
        duration,
        currentTime: currentPlayTime,
        speechStart: speechStartOffset,
        speechEnd: speechEndOffset,
        isPlaying,
        onSeek: handleSeek,
        height: 40,
        segments,
        transcriptionId
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "playback-bar__empty", children: "Click play on any transcription to listen" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "playback-bar__volume", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          use: "unstyled",
          onClick: handleToggleMute,
          className: "playback-bar__volume-button",
          "aria-label": isMuted ? "Unmute" : "Mute",
          children: isMuted ? /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeX, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { size: 16 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "range",
          min: "0",
          max: "1",
          step: "0.01",
          value: volume,
          onChange: handleVolumeChange,
          className: "playback-bar__volume-slider",
          "aria-label": "Volume"
        }
      )
    ] })
  ] });
};
const StreamTranscriptionPanel$1 = "";
const StreamTranscriptionPanel = ({
  streams,
  onResetStream,
  onReviewTranscription,
  focusStreamId,
  onStandaloneControlsChange,
  onExportPagerFeed,
  onSelectPagerExportStream,
  pagerExporting = false
}) => {
  const {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    volume,
    setVolume,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying
  } = useTranscriptionAudioPlayback();
  const baseVisibleStreams = reactExports.useMemo(() => {
    if (!Array.isArray(streams) || streams.length === 0)
      return [];
    if (!focusStreamId)
      return streams;
    return streams.filter((stream) => stream.id === focusStreamId);
  }, [streams, focusStreamId]);
  const visibleStreams = reactExports.useMemo(() => {
    if (focusStreamId)
      return baseVisibleStreams;
    return [...baseVisibleStreams].sort((a, b) => compareStreamsByName(b, a));
  }, [baseVisibleStreams, focusStreamId]);
  const focusedVisibleStream = visibleStreams.length === 1 ? visibleStreams[0] : null;
  const focusedVisibleStreamId = (focusedVisibleStream == null ? void 0 : focusedVisibleStream.id) ?? null;
  const isStandaloneView = Boolean(focusedVisibleStreamId);
  const playingInfo = reactExports.useMemo(() => {
    var _a2;
    if (!playingTranscriptionId)
      return null;
    for (const stream of streams) {
      const transcription = (_a2 = stream.transcriptions) == null ? void 0 : _a2.find(
        (t2) => t2.id === playingTranscriptionId
      );
      if (transcription) {
        return { transcription, streamName: stream.name };
      }
    }
    return null;
  }, [streams, playingTranscriptionId]);
  const handlePlayAll = (streamId, transcription, orderedTranscriptions) => {
    const queue = buildPlaybackQueue(streamId, orderedTranscriptions, transcription.id);
    if (queue) {
      playRecording(transcription, { queue });
      return;
    }
    playRecording(transcription);
  };
  if (visibleStreams.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "transcript-view", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-view__header", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-view__title", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { size: 18, className: "text-primary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "h5 mb-0", children: "Live transcriptions" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-view__summary text-body-secondary small", children: "Waiting for streams to come online" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-view__scroller", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-view__empty", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { className: "mb-3", size: 36 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "fw-semibold mb-1", children: "No streams available" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-0", children: "Add a stream to see transcriptions here." })
      ] }) })
    ] });
  }
  const handleTogglePlayback = () => {
    if (playingInfo == null ? void 0 : playingInfo.transcription) {
      stopCurrentRecording();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(HoveredSegmentProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "transcript-view transcript-view--stacked transcript-view--frameless", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-view__scroller transcript-view__scroller--stacked", children: visibleStreams.map((stream) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      StreamSection,
      {
        stream,
        isStandalone: isStandaloneView && stream.id === focusedVisibleStreamId,
        recordingAudioRefs,
        playingRecording,
        playingTranscriptionId,
        playingSegmentId: playingSegment,
        onPlayAll: handlePlayAll,
        onPlaySegment: playSegment,
        isSegmentCurrentlyPlaying,
        onStopPlayback: stopCurrentRecording,
        onReviewTranscription,
        onResetStream,
        onStandaloneControlsChange,
        onExportPagerFeed,
        onSelectPagerExportStream,
        pagerExporting
      },
      stream.id
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PlaybackBar,
      {
        transcription: (playingInfo == null ? void 0 : playingInfo.transcription) ?? null,
        streamName: (playingInfo == null ? void 0 : playingInfo.streamName) ?? null,
        currentPlayTime,
        recordingAudioRefs,
        playingRecordingId: playingRecording,
        volume,
        onTogglePlayback: handleTogglePlayback,
        onStop: stopCurrentRecording,
        onVolumeChange: setVolume
      }
    )
  ] }) });
};
const TranscriptMessageRow = ({
  streamId,
  streamName,
  stream,
  transcription,
  orderedTranscriptions,
  transcriptCorrectionEnabled,
  playingRecording,
  playingTranscriptionId,
  playingSegmentId,
  recordingAudioRefs,
  onPlayAll,
  onPlaySegment,
  isSegmentCurrentlyPlaying,
  compact = false,
  channelColor
}) => {
  const isSystemEvent = isSystemTranscription(transcription);
  const blankAudio = isBlankAudioText(transcription.text);
  const displayText = getTranscriptionDisplayText(transcription);
  const alertTriggers = getNotifiableAlerts(transcription.alerts);
  const hasAlerts = alertTriggers.length > 0;
  const recordingUrl = transcription.recordingUrl;
  const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
  const isRecordingActive = Boolean(
    recordingId && playingRecording === recordingId && playingTranscriptionId === transcription.id
  );
  const renderMetadata = () => {
    const parts = [];
    if (alertTriggers.length > 0) {
      parts.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertChips, { triggers: alertTriggers, mode: "collapsed" }, "alerts")
      );
    }
    const durationSeconds = transcription.duration;
    if (typeof durationSeconds === "number" && durationSeconds > 0) {
      parts.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip-button chip-button--surface", children: [
          durationSeconds.toFixed(1),
          "s duration"
        ] }, "duration")
      );
    }
    if (transcriptCorrectionEnabled) {
      const reviewStatus = getReviewStatus(transcription);
      if (reviewStatus !== "pending") {
        parts.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: `review-badge review-badge--${reviewStatus}`,
              children: reviewStatus === "verified" ? "Verified" : "Corrected"
            },
            "review"
          )
        );
      }
      if (transcription.reviewedBy) {
        parts.push(
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip-button chip-button--surface", children: [
            "by ",
            transcription.reviewedBy
          ] }, "reviewedBy")
        );
      }
      if (transcription.reviewedAt) {
        parts.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Timestamp,
            {
              value: transcription.reviewedAt,
              className: "chip-button chip-button--surface",
              prefix: "Reviewed ",
              showDate: true,
              dateClassName: "ms-1"
            },
            "reviewedAt"
          )
        );
      }
    }
    if (parts.length === 0) {
      return null;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__meta", children: parts });
  };
  const chipElements = [];
  if (isSystemEvent) {
    const label = displayText ?? transcription.text ?? "System event";
    if (label) {
      chipElements.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SystemEventChip,
          {
            label,
            eventType: transcription.eventType
          },
          `${transcription.id}-system`
        )
      );
    }
  } else if (recordingUrl && recordingId) {
    chipElements.push(
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          use: "unstyled",
          onClick: () => onPlayAll(streamId, transcription, orderedTranscriptions),
          className: "chip-button chip-button--accent",
          children: [
            isRecordingActive ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 14 }),
            isRecordingActive ? "Stop" : "Play"
          ]
        },
        `${transcription.id}-play`
      )
    );
  }
  chipElements.push(
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TranscriptionSegmentChips,
      {
        transcription,
        displayText,
        blankAudio,
        transcriptCorrectionEnabled,
        recordingUrl,
        recordingId,
        playingSegmentId,
        onPlaySegment,
        isSegmentCurrentlyPlaying
      },
      `${transcription.id}-segments`
    )
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "article",
    {
      className: `transcript-message${hasAlerts ? " transcript-message--alert" : ""}${compact ? " transcript-message--compact" : ""}${isRecordingActive ? " transcript-message--playing" : ""}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__avatar", "aria-hidden": "true", children: stream ? /* @__PURE__ */ jsxRuntimeExports.jsx(StreamStatusIndicator, { stream, className: "d-inline-flex align-items-baseline" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { size: 18 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-message__content", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "transcript-message__header", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "transcript-message__channel",
                style: channelColor ? {
                  "--transcript-channel-color": channelColor
                } : void 0,
                children: streamName
              }
            ),
            transcription.timestamp ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Timestamp,
                {
                  value: transcription.timestamp,
                  className: "transcript-message__timestamp",
                  showDate: true,
                  dateClassName: "ms-1"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TimeInterval,
                {
                  value: transcription.timestamp,
                  className: "ms-1 transcript-message__timestamp",
                  condensed: true
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "transcript-message__timestamp", children: "Unknown timestamp" })
          ] }),
          renderMetadata(),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__chips", children: chipElements }),
          recordingUrl && recordingId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            AudioElement,
            {
              recordingId,
              recordingUrl,
              refsMap: recordingAudioRefs
            }
          ) : null
        ] })
      ]
    }
  );
};
const STREAM_CHANNEL_COLORS = [
  "#2563EB",
  // blue-600
  "#7C3AED",
  // violet-600
  "#047857",
  // emerald-700
  "#DB2777",
  // pink-600
  "#B45309",
  // amber-700
  "#0EA5E9",
  // sky-500
  "#F97316",
  // orange-500
  "#059669",
  // emerald-600
  "#D946EF",
  // fuchsia-500
  "#1D4ED8",
  // blue-700
  "#DC2626",
  // red-600
  "#F59E0B"
  // amber-500
];
const hashString = (value) => {
  let hash = 0;
  for (let index2 = 0; index2 < value.length; index2 += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index2);
    hash |= 0;
  }
  return hash;
};
const getStreamAccentColor = (streamId) => {
  if (!streamId) {
    return STREAM_CHANNEL_COLORS[0];
  }
  const hash = Math.abs(hashString(streamId));
  const paletteIndex = hash % STREAM_CHANNEL_COLORS.length;
  return STREAM_CHANNEL_COLORS[paletteIndex];
};
const safeTimestamp$1 = (timestamp) => {
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};
const CombinedTranscriptionLog = ({
  streams,
  loading = false,
  limit = 400
}) => {
  const { transcriptCorrectionEnabled, baseLocation, colorCodingEnabled } = useUISettings();
  const {
    recordingAudioRefs,
    playingRecording,
    playingTranscriptionId,
    playingSegment,
    currentPlayTime,
    volume,
    setVolume,
    playRecording,
    playSegment,
    stopCurrentRecording,
    isSegmentCurrentlyPlaying
  } = useTranscriptionAudioPlayback();
  const { authFetch } = useAuth();
  const HISTORY_FETCH_LIMIT2 = 50;
  const [extraByStream, setExtraByStream] = reactExports.useState({});
  const [hasMoreByStream, setHasMoreByStream] = reactExports.useState({});
  const [isLoadingHistory, setIsLoadingHistory] = reactExports.useState(false);
  const [historyError, setHistoryError] = reactExports.useState(null);
  const transcriptionsByStream = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    streams.forEach((stream) => {
      const base = Array.isArray(stream.transcriptions) ? stream.transcriptions : [];
      const extra = extraByStream[stream.id] ?? [];
      map.set(stream.id, dedupeAndSortTranscriptions([...base, ...extra]));
    });
    return map;
  }, [streams, extraByStream]);
  const combinedItems = reactExports.useMemo(() => {
    if (!streams || streams.length === 0)
      return [];
    const items = [];
    streams.forEach((stream) => {
      const list = transcriptionsByStream.get(stream.id) ?? [];
      const source = stream.source ?? "audio";
      if (source === "pager") {
        const normal = list.filter((t2) => !isSystemTranscription(t2));
        const condensed = condensePagerTranscriptions(normal);
        condensed.forEach((msg) => {
          items.push({
            kind: "pager",
            id: msg.id,
            timestamp: msg.timestamp,
            streamId: stream.id,
            streamName: stream.name || stream.url,
            message: msg
          });
        });
      } else {
        list.forEach((t2) => {
          items.push({
            kind: "audio",
            id: t2.id,
            timestamp: t2.timestamp,
            streamId: stream.id,
            streamName: stream.name || stream.url,
            transcription: t2
          });
        });
      }
    });
    const sorted = items.sort((a, b) => safeTimestamp$1(a.timestamp) - safeTimestamp$1(b.timestamp));
    if (limit > 0 && sorted.length > limit)
      return sorted.slice(-limit);
    return sorted;
  }, [streams, transcriptionsByStream, limit]);
  const [openPagerMessageIds, setOpenPagerMessageIds] = reactExports.useState({});
  const togglePagerMessage = reactExports.useCallback((id2) => {
    setOpenPagerMessageIds((prev) => ({ ...prev, [id2]: !prev[id2] }));
  }, []);
  const streamMap = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    streams.forEach((s) => map.set(s.id, s));
    return map;
  }, [streams]);
  const streamColorMap = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    streams.forEach((s) => {
      map.set(s.id, getStreamAccentColor(s.id));
    });
    return map;
  }, [streams]);
  const playingInfo = reactExports.useMemo(() => {
    var _a2;
    if (!playingTranscriptionId)
      return null;
    for (const stream of streams) {
      const transcription = (_a2 = stream.transcriptions) == null ? void 0 : _a2.find(
        (t2) => t2.id === playingTranscriptionId
      );
      if (transcription) {
        return { transcription, streamName: stream.name };
      }
    }
    for (const [streamId, transcriptions] of Object.entries(extraByStream)) {
      const transcription = transcriptions.find((t2) => t2.id === playingTranscriptionId);
      if (transcription) {
        const stream = streams.find((s) => s.id === streamId);
        return { transcription, streamName: (stream == null ? void 0 : stream.name) ?? "Unknown" };
      }
    }
    return null;
  }, [streams, extraByStream, playingTranscriptionId]);
  const hasMoreHistory = reactExports.useMemo(() => {
    if (Object.keys(hasMoreByStream).length === 0)
      return true;
    return Object.values(hasMoreByStream).some((v2) => v2 !== false);
  }, [hasMoreByStream]);
  const handlePlayAll = reactExports.useCallback(
    (streamId, transcription, orderedTranscriptions) => {
      const queue = buildPlaybackQueue(streamId, orderedTranscriptions, transcription.id);
      if (queue) {
        playRecording(transcription, { queue });
        return;
      }
      playRecording(transcription);
    },
    [playRecording]
  );
  const earliestTimestampIso = reactExports.useMemo(() => {
    if (combinedItems.length === 0)
      return null;
    const first = combinedItems[0];
    return first.timestamp ?? null;
  }, [combinedItems]);
  const handleLoadEarlier = reactExports.useCallback(async () => {
    if (!earliestTimestampIso || isLoadingHistory)
      return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const before = new Date(earliestTimestampIso).toISOString();
      const results = await Promise.all(
        streams.map(async (s) => {
          const params = new URLSearchParams({ limit: String(HISTORY_FETCH_LIMIT2), before });
          const res = await authFetch(`/api/streams/${s.id}/transcriptions?${params.toString()}`);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Failed to fetch history for ${s.id}`);
          }
          const data = await res.json();
          return { id: s.id, transcriptions: data.transcriptions, hasMore: data.hasMoreBefore ?? data.transcriptions.length >= HISTORY_FETCH_LIMIT2 };
        })
      );
      setExtraByStream((prev) => {
        const next = { ...prev };
        results.forEach(({ id: id2, transcriptions }) => {
          const existing = next[id2] ?? [];
          next[id2] = dedupeAndSortTranscriptions([...transcriptions, ...existing]);
        });
        return next;
      });
      setHasMoreByStream((prev) => {
        const next = { ...prev };
        results.forEach(({ id: id2, hasMore }) => {
          next[id2] = hasMore;
        });
        return next;
      });
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authFetch, earliestTimestampIso, streams, isLoadingHistory]);
  const orderedForScroll = reactExports.useMemo(() => {
    return combinedItems.map((item) => item.kind === "audio" ? item.transcription : item.message.fragments[0]);
  }, [combinedItems]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "transcript-view transcript-view--frameless", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      StreamTranscriptList,
      {
        orderedTranscriptions: orderedForScroll,
        isTranscribing: true,
        onLoadEarlier: hasMoreHistory ? handleLoadEarlier : null,
        hasMoreHistory,
        isLoadingHistory,
        historyError,
        children: streams.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-view__empty", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "fw-semibold mb-1", children: "No streams available" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-0", children: "Add a stream to start collecting transcripts." })
        ] }) : combinedItems.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-view__empty", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-0", children: "Listening for activity…" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "fw-semibold mb-1", children: "No transcriptions captured yet." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-0", children: "When streams receive audio, transcripts will appear here." })
        ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message-list", children: combinedItems.map((item) => {
          const stream = streamMap.get(item.streamId) ?? void 0;
          const channelColor = colorCodingEnabled ? streamColorMap.get(item.streamId) ?? getStreamAccentColor(item.streamId) : void 0;
          if (item.kind === "audio") {
            const ordered = transcriptionsByStream.get(item.streamId) ?? [];
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              TranscriptMessageRow,
              {
                streamId: item.streamId,
                streamName: item.streamName,
                stream,
                transcription: item.transcription,
                orderedTranscriptions: ordered,
                transcriptCorrectionEnabled,
                playingRecording,
                playingTranscriptionId,
                playingSegmentId: playingSegment,
                recordingAudioRefs,
                onPlayAll: handlePlayAll,
                onPlaySegment: playSegment,
                isSegmentCurrentlyPlaying,
                compact: true,
                channelColor
              },
              `audio:${item.id}`
            );
          }
          const channelStyle = channelColor ? {
            "--transcript-channel-color": channelColor
          } : void 0;
          const elementMap = /* @__PURE__ */ new Map();
          item.message.fragments.forEach((t2) => {
            const displayText = getTranscriptionDisplayText(t2);
            const blankAudio = isBlankAudioText(t2.text);
            const alertTriggers = getNotifiableAlerts(t2.alerts);
            const recordingUrl = t2.recordingUrl;
            const recordingId = recordingUrl ? getRecordingElementId(recordingUrl) : null;
            const elems = [];
            if (alertTriggers.length > 0) {
              elems.push(/* @__PURE__ */ jsxRuntimeExports.jsx(AlertChips, { triggers: alertTriggers, mode: "collapsed" }, `${t2.id}-alert`));
            }
            elems.push(
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TranscriptionSegmentChips,
                {
                  transcription: t2,
                  displayText,
                  blankAudio,
                  transcriptCorrectionEnabled,
                  recordingUrl,
                  recordingId,
                  playingSegmentId: playingSegment,
                  onPlaySegment: playSegment,
                  isSegmentCurrentlyPlaying
                },
                `${t2.id}-segments`
              )
            );
            elementMap.set(t2.id, elems);
          });
          const renderedRecordingIds = /* @__PURE__ */ new Set();
          const pagerAudioElements = [];
          item.message.fragments.forEach((t2) => {
            const url = t2.recordingUrl;
            if (!url)
              return;
            const id2 = getRecordingElementId(url);
            if (renderedRecordingIds.has(id2))
              return;
            renderedRecordingIds.add(id2);
            pagerAudioElements.push(
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                AudioElement,
                {
                  recordingId: id2,
                  recordingUrl: url,
                  refsMap: recordingAudioRefs
                },
                id2
              )
            );
          });
          const address = getCondensedFieldValue(item.message, "address");
          const mapGrid = getCondensedFieldValue(item.message, "map");
          const baseLocationSuffix = (() => {
            const parts = [];
            if (baseLocation == null ? void 0 : baseLocation.state)
              parts.push(baseLocation.state);
            if (baseLocation == null ? void 0 : baseLocation.country)
              parts.push(baseLocation.country);
            return parts.length > 0 ? parts.join(", ") : null;
          })();
          const incidentLocationQuery = (() => {
            const parts = [];
            if (address)
              parts.push(address);
            if (mapGrid && !parts.includes(mapGrid))
              parts.push(`Map ${mapGrid}`);
            if (baseLocationSuffix)
              parts.push(baseLocationSuffix);
            return parts.length > 0 ? parts.join(", ") : null;
          })();
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "transcript-message transcript-message--compact", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "transcript-message__avatar", "aria-hidden": "true", children: stream ? /* @__PURE__ */ jsxRuntimeExports.jsx(StreamStatusIndicator, { stream, className: "d-inline-flex align-items-baseline" }) : null }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transcript-message__content", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "transcript-message__header", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "transcript-message__channel",
                    style: channelStyle,
                    children: item.streamName
                  }
                ),
                item.message.timestamp ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Timestamp,
                    {
                      value: item.message.timestamp,
                      className: "transcript-message__timestamp",
                      showDate: true,
                      dateClassName: "ms-1"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TimeInterval,
                    {
                      value: item.message.timestamp,
                      className: "ms-1 transcript-message__timestamp",
                      condensed: true
                    }
                  )
                ] }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                PagerTranscriptTable,
                {
                  groupId: `combined-${item.streamId}-${item.id}`,
                  messages: [item.message],
                  elementMap,
                  openMessageIds: openPagerMessageIds,
                  onToggleMessage: togglePagerMessage,
                  incidentLocationUrls: null,
                  incidentLocationQuery: incidentLocationQuery ?? void 0,
                  hideTimeColumn: true
                }
              ) }),
              pagerAudioElements.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden", "aria-hidden": true, children: pagerAudioElements }) : null
            ] })
          ] }, `pager:${item.id}`);
        }) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      PlaybackBar,
      {
        transcription: (playingInfo == null ? void 0 : playingInfo.transcription) ?? null,
        streamName: (playingInfo == null ? void 0 : playingInfo.streamName) ?? null,
        currentPlayTime,
        recordingAudioRefs,
        playingRecordingId: playingRecording,
        volume,
        onTogglePlayback: stopCurrentRecording,
        onStop: stopCurrentRecording,
        onVolumeChange: setVolume
      }
    )
  ] });
};
const ToastContext = reactExports.createContext(
  void 0
);
const useToast = () => {
  const context = reactExports.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
const STORAGE_KEY = "wavecap:alert-subscriptions";
const DEFAULT_PREFERENCES = {
  enabled: true,
  subscriptions: {}
};
function loadPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      subscriptions: parsed.subscriptions ?? {}
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save alert preferences:", error);
  }
}
function subscriptionFromRule(rule) {
  return {
    ruleId: rule.id,
    playSound: rule.playSound !== false,
    showBanner: rule.notify !== false
  };
}
function useAlertSubscriptions(serverConfig) {
  const [preferences, setPreferences] = reactExports.useState(
    loadPreferences
  );
  reactExports.useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);
  const serverRulesMap = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    if (serverConfig == null ? void 0 : serverConfig.rules) {
      for (const rule of serverConfig.rules) {
        if (rule.enabled !== false) {
          map.set(rule.id, rule);
        }
      }
    }
    return map;
  }, [serverConfig]);
  const getSubscription = reactExports.useCallback(
    (ruleId) => {
      const serverRule = serverRulesMap.get(ruleId);
      if (!serverRule) {
        return null;
      }
      const localOverride = preferences.subscriptions[ruleId];
      if (localOverride) {
        return localOverride;
      }
      return subscriptionFromRule(serverRule);
    },
    [serverRulesMap, preferences.subscriptions]
  );
  const subscriptions = reactExports.useMemo(() => {
    const result = [];
    for (const rule of serverRulesMap.values()) {
      const sub = getSubscription(rule.id);
      if (sub) {
        result.push(sub);
      }
    }
    return result;
  }, [serverRulesMap, getSubscription]);
  const setEnabled = reactExports.useCallback((enabled) => {
    setPreferences((prev) => ({ ...prev, enabled }));
  }, []);
  const updateSubscription = reactExports.useCallback(
    (ruleId, updates) => {
      const serverRule = serverRulesMap.get(ruleId);
      if (!serverRule) {
        return;
      }
      setPreferences((prev) => {
        const existing = prev.subscriptions[ruleId] ?? subscriptionFromRule(serverRule);
        return {
          ...prev,
          subscriptions: {
            ...prev.subscriptions,
            [ruleId]: {
              ...existing,
              ...updates,
              ruleId
            }
          }
        };
      });
    },
    [serverRulesMap]
  );
  const resetSubscription = reactExports.useCallback((ruleId) => {
    setPreferences((prev) => {
      const { [ruleId]: _, ...rest } = prev.subscriptions;
      return {
        ...prev,
        subscriptions: rest
      };
    });
  }, []);
  const resetAll = reactExports.useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);
  const hasLocalOverrides = reactExports.useMemo(() => {
    return !preferences.enabled || Object.keys(preferences.subscriptions).length > 0;
  }, [preferences]);
  return {
    enabled: preferences.enabled,
    setEnabled,
    getSubscription,
    subscriptions,
    updateSubscription,
    resetSubscription,
    resetAll,
    hasLocalOverrides
  };
}
const SettingsModal$1 = "";
const RULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const generateUid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rule-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};
const toEditableRule = (rule, index2) => {
  const fallbackId = `keyword-rule-${index2 + 1}`;
  const normalizedId = typeof rule.id === "string" && rule.id.trim().length > 0 ? rule.id.trim() : fallbackId;
  return {
    uid: generateUid(),
    id: normalizedId,
    label: typeof rule.label === "string" ? rule.label : "",
    phrasesText: Array.isArray(rule.phrases) ? rule.phrases.join("\n") : "",
    enabled: rule.enabled === false ? false : true,
    playSound: rule.playSound === false ? false : true,
    notify: rule.notify === false ? false : true,
    caseSensitive: rule.caseSensitive === true
  };
};
const buildEditableRules = (config) => {
  if (!config || !Array.isArray(config.rules)) {
    return [];
  }
  return config.rules.map((rule, index2) => toEditableRule(rule, index2));
};
const sanitizeRuleId = (value) => value.trim();
const parsePhrases = (value) => {
  const segments = value.split(/[\n,]/).map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  const seen2 = /* @__PURE__ */ new Set();
  const deduped = [];
  segments.forEach((segment) => {
    if (!seen2.has(segment)) {
      seen2.add(segment);
      deduped.push(segment);
    }
  });
  return deduped;
};
const KeywordAlertsSettingsSection = (_props) => {
  const [loading, setLoading] = reactExports.useState(true);
  const [loadError, setLoadError] = reactExports.useState(null);
  const [serverConfig, setServerConfig] = reactExports.useState(null);
  const [enabled, setEnabled] = reactExports.useState(true);
  const [rules, setRules] = reactExports.useState([]);
  const [initialEnabled, setInitialEnabled] = reactExports.useState(true);
  const [initialRules, setInitialRules] = reactExports.useState([]);
  const [ruleErrors, setRuleErrors] = reactExports.useState({});
  const [dirty, setDirty] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const [saveError, setSaveError] = reactExports.useState(null);
  const { showToast } = useToast();
  const { authFetch, role, requestLogin } = useAuth();
  const subscriptions = useAlertSubscriptions(serverConfig);
  const isEditor = role === "editor";
  const canEdit = isEditor && !saving;
  const applyConfig = reactExports.useCallback((config) => {
    setServerConfig(config ?? null);
    const sanitizedEnabled = (config == null ? void 0 : config.enabled) === false ? false : true;
    const editableRules = buildEditableRules(config);
    setEnabled(sanitizedEnabled);
    setRules(editableRules);
    setInitialEnabled(sanitizedEnabled);
    setInitialRules(editableRules.map((rule) => ({ ...rule })));
    setDirty(false);
    setRuleErrors({});
  }, []);
  reactExports.useEffect(() => {
    let cancelled = false;
    const loadAlerts = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await authFetch("/api/alerts");
        if (!response.ok) {
          throw new Error("Failed to load alerts configuration");
        }
        const data = await response.json();
        if (!cancelled) {
          applyConfig(data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load alerts configuration", error);
          setLoadError("Unable to load keyword alerts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, [applyConfig, authFetch]);
  const markDirty = reactExports.useCallback(() => {
    setDirty(true);
    setSaveError(null);
  }, []);
  const handleUpdateRule = reactExports.useCallback(
    (uid, updater) => {
      setRules(
        (prevRules) => prevRules.map((rule) => rule.uid === uid ? updater(rule) : rule)
      );
      setRuleErrors((prev) => {
        if (!prev[uid]) {
          return prev;
        }
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      markDirty();
    },
    [markDirty]
  );
  const handleToggleEnabled = reactExports.useCallback(() => {
    if (!isEditor) {
      requestLogin();
      return;
    }
    setEnabled((value) => !value);
    markDirty();
  }, [isEditor, markDirty, requestLogin]);
  const handleRuleFieldChange = reactExports.useCallback(
    (uid, field, value) => {
      handleUpdateRule(uid, (rule) => ({
        ...rule,
        [field]: value
      }));
    },
    [handleUpdateRule]
  );
  const handleAddRule = reactExports.useCallback(() => {
    if (!isEditor) {
      requestLogin();
      return;
    }
    const existingIds = new Set(rules.map((rule) => rule.id));
    let suffix = rules.length + 1;
    let newId = `keyword-rule-${suffix}`;
    while (existingIds.has(newId)) {
      suffix += 1;
      newId = `keyword-rule-${suffix}`;
    }
    const newRule = {
      uid: generateUid(),
      id: newId,
      label: "",
      phrasesText: "",
      enabled: true,
      playSound: true,
      notify: true,
      caseSensitive: false
    };
    setRules((prev) => [newRule, ...prev]);
    setRuleErrors((prev) => ({ ...prev, [newRule.uid]: {} }));
    markDirty();
  }, [isEditor, markDirty, requestLogin, rules]);
  const handleRemoveRule = reactExports.useCallback(
    (uid) => {
      if (!isEditor) {
        requestLogin();
        return;
      }
      setRules((prev) => prev.filter((rule) => rule.uid !== uid));
      setRuleErrors((prev) => {
        if (!prev[uid]) {
          return prev;
        }
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      markDirty();
    },
    [isEditor, markDirty, requestLogin]
  );
  const resetChanges = reactExports.useCallback(() => {
    setEnabled(initialEnabled);
    setRules(initialRules.map((rule) => ({ ...rule })));
    setRuleErrors({});
    setDirty(false);
    setSaveError(null);
  }, [initialEnabled, initialRules]);
  const validateRules = reactExports.useCallback(() => {
    const errors = {};
    const sanitizedRules = [];
    const seenIds = /* @__PURE__ */ new Set();
    rules.forEach((rule) => {
      const ruleErrors2 = {};
      const normalizedId = sanitizeRuleId(rule.id);
      if (normalizedId.length === 0) {
        ruleErrors2.id = "ID is required.";
      } else if (!RULE_ID_PATTERN.test(normalizedId)) {
        ruleErrors2.id = "Use letters, numbers, hyphens, or underscores.";
      } else if (seenIds.has(normalizedId)) {
        ruleErrors2.id = "ID must be unique.";
      }
      const phrases = parsePhrases(rule.phrasesText);
      if (phrases.length === 0) {
        ruleErrors2.phrases = "Add at least one phrase.";
      }
      if (Object.keys(ruleErrors2).length > 0) {
        errors[rule.uid] = ruleErrors2;
        return;
      }
      seenIds.add(normalizedId);
      sanitizedRules.push({
        id: normalizedId,
        label: rule.label.trim().length > 0 ? rule.label.trim() : void 0,
        phrases,
        enabled: rule.enabled,
        playSound: rule.playSound,
        notify: rule.notify,
        caseSensitive: rule.caseSensitive
      });
    });
    return { errors, sanitizedRules };
  }, [rules]);
  const hasRules = rules.length > 0;
  const disableSave = reactExports.useMemo(() => {
    if (!canEdit) {
      return true;
    }
    if (!dirty) {
      return true;
    }
    if (saving) {
      return true;
    }
    return false;
  }, [canEdit, dirty, saving]);
  const handleSave = reactExports.useCallback(async () => {
    setSaveError(null);
    if (!canEdit) {
      requestLogin();
      setSaveError("Sign in to modify keyword alerts.");
      return;
    }
    const { errors, sanitizedRules } = validateRules();
    if (Object.keys(errors).length > 0) {
      setRuleErrors(errors);
      setSaveError("Fix the highlighted fields before saving.");
      return;
    }
    setRuleErrors({});
    if (enabled && sanitizedRules.length === 0) {
      setSaveError("Add at least one rule or disable keyword alerts.");
      return;
    }
    setSaving(true);
    try {
      const response = await authFetch("/api/alerts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ enabled, rules: sanitizedRules })
      });
      if (!response.ok) {
        let message = "Unable to save keyword alerts.";
        try {
          const payload = await response.json();
          if (payload == null ? void 0 : payload.error) {
            message = payload.error;
          }
        } catch {
        }
        setSaveError(message);
        return;
      }
      const savedConfig = await response.json();
      applyConfig(savedConfig);
      showToast({ variant: "success", message: "Keyword alerts updated." });
    } catch (error) {
      console.error("Failed to save keyword alerts", error);
      setSaveError("Unable to save keyword alerts.");
    } finally {
      setSaving(false);
    }
  }, [
    applyConfig,
    authFetch,
    canEdit,
    enabled,
    requestLogin,
    showToast,
    validateRules
  ]);
  const enabledRules = reactExports.useMemo(() => {
    return rules.filter((rule) => rule.enabled);
  }, [rules]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-section keyword-alerts-settings", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "settings-section__title", children: "Keyword Alerts" }) }),
    loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-body-secondary small", children: "Loading keyword alerts…" }) : loadError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-warning mb-0", role: "alert", children: loadError }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__content", children: [
      saveError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger mb-0", role: "alert", children: saveError }),
      enabledRules.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__subscriptions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__subscriptions-header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "keyword-alerts-settings__subscriptions-title", children: "Your notification preferences" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "keyword-alerts-settings__subscriptions-description", children: "Customize how you receive alerts. These settings are stored locally in your browser." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch m-0 d-flex align-items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "keyword-alerts-local-enabled",
                type: "checkbox",
                className: "form-check-input",
                role: "switch",
                checked: subscriptions.enabled,
                onChange: (e) => subscriptions.setEnabled(e.target.checked)
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "label",
              {
                htmlFor: "keyword-alerts-local-enabled",
                className: "form-check-label fw-semibold",
                children: "Enable alerts on this device"
              }
            )
          ] }),
          subscriptions.hasLocalOverrides && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              use: "secondary",
              appearance: "outline",
              onClick: subscriptions.resetAll,
              startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 14 }),
              children: "Reset to defaults"
            }
          )
        ] }),
        subscriptions.enabled && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyword-alerts-settings__subscription-list", children: enabledRules.map((rule) => {
          const sub = subscriptions.getSubscription(rule.id);
          if (!sub)
            return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "keyword-alerts-settings__subscription-item",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__subscription-label", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "keyword-alerts-settings__subscription-name", children: rule.label || rule.id }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "keyword-alerts-settings__subscription-phrases", children: [
                    parsePhrases(rule.phrasesText).slice(0, 3).join(", "),
                    parsePhrases(rule.phrasesText).length > 3 && "…"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__subscription-toggles", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      className: `keyword-alerts-settings__toggle-btn ${sub.playSound ? "keyword-alerts-settings__toggle-btn--active" : ""}`,
                      onClick: () => subscriptions.updateSubscription(rule.id, {
                        playSound: !sub.playSound
                      }),
                      title: sub.playSound ? "Sound enabled" : "Sound disabled",
                      children: sub.playSound ? /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(VolumeX, { size: 16 })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      className: `keyword-alerts-settings__toggle-btn ${sub.showBanner ? "keyword-alerts-settings__toggle-btn--active" : ""}`,
                      onClick: () => subscriptions.updateSubscription(rule.id, {
                        showBanner: !sub.showBanner
                      }),
                      title: sub.showBanner ? "Banner enabled" : "Banner disabled",
                      children: sub.showBanner ? /* @__PURE__ */ jsxRuntimeExports.jsx(Bell, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(BellOff, { size: 16 })
                    }
                  )
                ] })
              ]
            },
            rule.uid
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__server-rules", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "keyword-alerts-settings__subscriptions-title", children: [
            "Alert rules ",
            !isEditor && "(view only)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-body-secondary small mb-0", children: isEditor ? "Configure watch phrases that trigger alerts for all users." : "These rules are configured by administrators. Contact an editor to add or modify rules." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyword-alerts-settings__switch", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch m-0 d-flex align-items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "keyword-alerts-enabled",
              type: "checkbox",
              className: "form-check-input",
              role: "switch",
              checked: enabled,
              onChange: handleToggleEnabled,
              disabled: !canEdit
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "keyword-alerts-enabled",
              className: "form-check-label fw-semibold",
              children: "Enable keyword alerts globally"
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyword-alerts-settings__rules", children: hasRules ? rules.map((rule) => {
          const errorsForRule = ruleErrors[rule.uid] ?? {};
          const idInputId = `keyword-alert-id-${rule.uid}`;
          const labelInputId = `keyword-alert-label-${rule.uid}`;
          const phrasesInputId = `keyword-alert-phrases-${rule.uid}`;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "article",
            {
              className: "keyword-alerts-settings__rule",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__rule-header", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__field keyword-alerts-settings__field--grow", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "label",
                      {
                        htmlFor: labelInputId,
                        className: "keyword-alerts-settings__label",
                        children: "Display label"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        id: labelInputId,
                        type: "text",
                        className: "form-control form-control-sm",
                        value: rule.label,
                        onChange: (event) => handleRuleFieldChange(
                          rule.uid,
                          "label",
                          event.target.value
                        ),
                        disabled: !canEdit,
                        placeholder: "e.g. Distress: MAYDAY"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyword-alerts-settings__rule-toggle", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        id: `keyword-alert-enabled-${rule.uid}`,
                        type: "checkbox",
                        className: "form-check-input",
                        role: "switch",
                        checked: rule.enabled,
                        onChange: (event) => handleRuleFieldChange(
                          rule.uid,
                          "enabled",
                          event.target.checked
                        ),
                        disabled: !canEdit
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "label",
                      {
                        htmlFor: `keyword-alert-enabled-${rule.uid}`,
                        className: "form-check-label small fw-semibold",
                        children: "Enabled"
                      }
                    )
                  ] }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__grid", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__field", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "label",
                      {
                        htmlFor: idInputId,
                        className: "keyword-alerts-settings__label",
                        children: "Rule ID"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        id: idInputId,
                        type: "text",
                        className: `form-control form-control-sm${errorsForRule.id ? " is-invalid" : ""}`,
                        value: rule.id,
                        onChange: (event) => handleRuleFieldChange(
                          rule.uid,
                          "id",
                          event.target.value
                        ),
                        disabled: !canEdit,
                        placeholder: "e.g. distress-mayday"
                      }
                    ),
                    errorsForRule.id && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "invalid-feedback", children: errorsForRule.id })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__field keyword-alerts-settings__field--wide", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "label",
                      {
                        htmlFor: phrasesInputId,
                        className: "keyword-alerts-settings__label",
                        children: "Watch phrases"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "textarea",
                      {
                        id: phrasesInputId,
                        className: `form-control form-control-sm${errorsForRule.phrases ? " is-invalid" : ""}`,
                        rows: 2,
                        value: rule.phrasesText,
                        onChange: (event) => handleRuleFieldChange(
                          rule.uid,
                          "phrasesText",
                          event.target.value
                        ),
                        disabled: !canEdit,
                        placeholder: "Enter one phrase per line"
                      }
                    ),
                    errorsForRule.phrases && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "invalid-feedback", children: errorsForRule.phrases })
                  ] })
                ] }),
                isEditor && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__rule-actions", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__switches", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: `keyword-alert-sound-${rule.uid}`,
                          type: "checkbox",
                          className: "form-check-input",
                          role: "switch",
                          checked: rule.playSound,
                          onChange: (event) => handleRuleFieldChange(
                            rule.uid,
                            "playSound",
                            event.target.checked
                          ),
                          disabled: !canEdit
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "label",
                        {
                          htmlFor: `keyword-alert-sound-${rule.uid}`,
                          className: "form-check-label small",
                          children: "Play chime (default)"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: `keyword-alert-notify-${rule.uid}`,
                          type: "checkbox",
                          className: "form-check-input",
                          role: "switch",
                          checked: rule.notify,
                          onChange: (event) => handleRuleFieldChange(
                            rule.uid,
                            "notify",
                            event.target.checked
                          ),
                          disabled: !canEdit
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "label",
                        {
                          htmlFor: `keyword-alert-notify-${rule.uid}`,
                          className: "form-check-label small",
                          children: "Show banner (default)"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: `keyword-alert-case-${rule.uid}`,
                          type: "checkbox",
                          className: "form-check-input",
                          role: "switch",
                          checked: rule.caseSensitive,
                          onChange: (event) => handleRuleFieldChange(
                            rule.uid,
                            "caseSensitive",
                            event.target.checked
                          ),
                          disabled: !canEdit
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "label",
                        {
                          htmlFor: `keyword-alert-case-${rule.uid}`,
                          className: "form-check-label small",
                          children: "Match case"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      use: "destroy",
                      onClick: () => handleRemoveRule(rule.uid),
                      disabled: !canEdit,
                      children: "Remove"
                    }
                  )
                ] })
              ]
            },
            rule.uid
          );
        }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-body-secondary small", children: isEditor ? "No keyword alerts configured. Add a rule to monitor specific phrases." : "No keyword alerts configured." }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyword-alerts-settings__footer", children: isEditor ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              use: "primary",
              onClick: handleAddRule,
              disabled: saving,
              children: "Add rule"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alerts-settings__footer-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "secondary",
                onClick: resetChanges,
                disabled: !dirty || saving,
                children: "Reset changes"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "primary",
                onClick: handleSave,
                disabled: disableSave,
                children: saving ? "Saving…" : "Save rules"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-body-secondary small d-flex flex-column gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Sign in with editor access to manage alert rules." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              use: "primary",
              className: "align-self-start",
              onClick: requestLogin,
              startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 16 }),
              children: "Sign in"
            }
          )
        ] }) })
      ] })
    ] })
  ] });
};
const Modal$1 = "";
const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  id: id2,
  titleId,
  size = "md",
  backdropOpacity = 0.6,
  overlayClassName,
  dialogClassName,
  headerClassName,
  bodyClassName,
  closeAriaLabel = "Close",
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  closeButtonRef,
  children
}) => {
  const autoId = reactExports.useId();
  const resolvedTitleId = titleId ?? `${id2 ?? autoId}-title`;
  const handleKeyDown = reactExports.useCallback(
    (event) => {
      if (closeOnEscape && event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );
  reactExports.useEffect(() => {
    if (!open)
      return;
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, handleKeyDown]);
  if (!open)
    return null;
  const handleBackdropClick = (event) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };
  const backdropStyle = {
    "--modal-backdrop-opacity": backdropOpacity
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: [
        "app-modal-overlay",
        `app-modal-overlay--${size}`,
        overlayClassName ?? ""
      ].filter(Boolean).join(" "),
      role: "presentation",
      onClick: handleBackdropClick,
      style: backdropStyle,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: [
            "app-modal-dialog",
            `app-modal-dialog--${size}`,
            dialogClassName ?? ""
          ].filter(Boolean).join(" "),
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": title ? resolvedTitleId : void 0,
          id: id2,
          onClick: (event) => event.stopPropagation(),
          children: [
            (title || showCloseButton) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "header",
              {
                className: ["app-modal-header", headerClassName ?? ""].filter(Boolean).join(" "),
                children: [
                  title && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-modal-header__text", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "app-modal-title", id: resolvedTitleId, children: title }),
                    subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "app-modal-subtitle", children: subtitle })
                  ] }),
                  showCloseButton && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      use: "secondary",
                      appearance: "outline",
                      className: "app-modal-close",
                      onClick: onClose,
                      ref: closeButtonRef,
                      "aria-label": closeAriaLabel,
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18 })
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: ["app-modal-body", bodyClassName ?? ""].filter(Boolean).join(" "),
                children
              }
            )
          ]
        }
      )
    }
  );
};
const BREAKPOINTS = ["sm", "md", "lg", "xl", "xxl"];
const toArray = (value) => {
  if (typeof value === "string") {
    return [value];
  }
  return Array.isArray(value) ? value : [];
};
const isResponsiveMap = (value) => {
  return typeof value === "object" && value !== null;
};
const resolveResponsiveProp = (propValue, generator) => {
  if (propValue == null) {
    return [];
  }
  if (!isResponsiveMap(propValue)) {
    return toArray(generator(propValue));
  }
  const classNames = [];
  if (propValue.base != null) {
    classNames.push(...toArray(generator(propValue.base)));
  }
  for (const breakpoint of BREAKPOINTS) {
    const value = propValue[breakpoint];
    if (value != null) {
      classNames.push(...toArray(generator(value, breakpoint)));
    }
  }
  return classNames;
};
const resolveDirectionClass = (direction, breakpoint) => {
  const prefix = breakpoint ? `flex-${breakpoint}` : "flex";
  switch (direction) {
    case "row":
      return `${prefix}-row`;
    case "row-reverse":
      return `${prefix}-row-reverse`;
    case "column":
      return `${prefix}-column`;
    case "column-reverse":
      return `${prefix}-column-reverse`;
    default:
      return void 0;
  }
};
const resolveWrapClass = (wrap, breakpoint) => {
  const prefix = breakpoint ? `flex-${breakpoint}` : "flex";
  switch (wrap) {
    case "wrap":
      return `${prefix}-wrap`;
    case "wrap-reverse":
      return `${prefix}-wrap-reverse`;
    case "nowrap":
      return `${prefix}-nowrap`;
    default:
      return void 0;
  }
};
const resolveJustifyClass = (justify, breakpoint) => {
  const prefix = breakpoint ? `justify-content-${breakpoint}` : "justify-content";
  return `${prefix}-${justify}`;
};
const resolveAlignItemsClass = (align, breakpoint) => {
  const prefix = breakpoint ? `align-items-${breakpoint}` : "align-items";
  return `${prefix}-${align}`;
};
const resolveAlignContentClass = (align, breakpoint) => {
  const prefix = breakpoint ? `align-content-${breakpoint}` : "align-content";
  return `${prefix}-${align}`;
};
const resolveGapClass = (gap, breakpoint) => {
  const prefix = breakpoint ? `gap-${breakpoint}` : "gap";
  return `${prefix}-${gap}`;
};
const Flex = reactExports.forwardRef(
  ({
    as,
    inline = false,
    direction,
    wrap,
    justify,
    align,
    alignContent,
    gap,
    className,
    ...rest
  }, forwardedRef) => {
    const ref = forwardedRef;
    const Component = as ?? "div";
    const directionClasses = resolveResponsiveProp(direction, resolveDirectionClass);
    const wrapClasses = resolveResponsiveProp(wrap, resolveWrapClass);
    const justifyClasses = resolveResponsiveProp(justify, resolveJustifyClass);
    const alignClasses = resolveResponsiveProp(align, resolveAlignItemsClass);
    const alignContentClasses = resolveResponsiveProp(alignContent, resolveAlignContentClass);
    const gapClasses = resolveResponsiveProp(gap, resolveGapClass);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Component,
      {
        ...rest,
        ref,
        className: clsx(
          inline ? "d-inline-flex" : "d-flex",
          directionClasses,
          wrapClasses,
          justifyClasses,
          alignClasses,
          alignContentClasses,
          gapClasses,
          className
        )
      }
    );
  }
);
Flex.displayName = "Flex";
const SettingsModal = ({
  open,
  onClose,
  closeButtonRef,
  streams,
  activeStreams,
  totalTranscriptions,
  wsConnected,
  themeMode,
  onThemeModeChange,
  colorCodingEnabled,
  onColorCodingToggle,
  transcriptCorrectionEnabled,
  reviewStatusOptions,
  exportStatuses,
  onExportStatusToggle,
  exporting,
  onExportTranscriptions,
  pagerStreams,
  selectedPagerStreamId,
  onSelectPagerStream,
  pagerExporting,
  pagerExportError,
  onExportPagerFeed,
  isReadOnly,
  onRequestLogin,
  onOpenBackendLogs
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Modal,
    {
      open,
      onClose,
      title: "Settings",
      subtitle: "Manage workspace status, appearance, and keyword alerts.",
      size: "xl",
      backdropOpacity: 0.65,
      closeButtonRef,
      closeAriaLabel: "Close settings",
      id: "app-settings-dialog",
      dialogClassName: "settings-modal",
      bodyClassName: "settings-modal__body",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "settings-section__title", children: "Status" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__content", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-stats", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-stat", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__value", children: (streams == null ? void 0 : streams.length) || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__label", children: "Streams" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-stat", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__value", children: activeStreams }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__label", children: "Active" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-stat", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__value", children: totalTranscriptions }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__label", children: "Transcriptions" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `settings-stat settings-stat--connection ${wsConnected ? "settings-stat--connected" : "settings-stat--disconnected"}`, children: wsConnected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { size: 20 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__label", children: "Connected" })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(WifiOff, { size: 20 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "settings-stat__label", children: "Disconnected" })
            ] }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "settings-section__title", children: "Appearance" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__content", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Flex,
            {
              direction: { base: "column", sm: "row" },
              gap: 3,
              align: { base: "stretch", sm: "center" },
              className: "settings-controls",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-control", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "theme-mode", className: "settings-control__label", children: "Theme" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      id: "theme-mode",
                      value: themeMode,
                      onChange: onThemeModeChange,
                      className: "form-select form-select-sm settings-select",
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "light", children: "Light" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "dark", children: "Dark" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "system", children: "System" })
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-control settings-control--switch", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-check form-switch m-0", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "color-coding",
                      type: "checkbox",
                      className: "form-check-input",
                      role: "switch",
                      checked: colorCodingEnabled,
                      onChange: onColorCodingToggle
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "label",
                    {
                      htmlFor: "color-coding",
                      className: "form-check-label settings-control__label",
                      children: "Color-code transcripts"
                    }
                  )
                ] }) })
              ]
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(KeywordAlertsSettingsSection, {}),
        transcriptCorrectionEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "settings-section__title", children: "Reviewed Transcript Export" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__content", children: isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-auth-prompt", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Sign in with editor access to export reviewed transcripts." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "primary",
                onClick: onRequestLogin,
                startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 16 }),
                children: "Sign in"
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-export", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-export__options", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Flex, { wrap: "wrap", gap: 2, children: reviewStatusOptions.map((option) => {
                const isChecked = exportStatuses.includes(option.value);
                const disableUncheck = isChecked && exportStatuses.length === 1;
                const inputId = `export-status-${option.value}`;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "form-check form-check-inline m-0",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          className: "form-check-input",
                          type: "checkbox",
                          id: inputId,
                          checked: isChecked,
                          onChange: () => onExportStatusToggle(option.value),
                          disabled: disableUncheck || exporting
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "label",
                        {
                          className: "form-check-label",
                          htmlFor: inputId,
                          children: option.label
                        }
                      )
                    ]
                  },
                  option.value
                );
              }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "settings-export__description", children: "Downloads a ZIP archive with JSONL transcripts and audio clips." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                onClick: onExportTranscriptions,
                disabled: exporting,
                size: "sm",
                use: "primary",
                startContent: !exporting ? /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16 }) : void 0,
                children: exporting ? "Exporting…" : "Export"
              }
            )
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "settings-section__title", children: "Pager Feed Export" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__content", children: isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-auth-prompt", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Sign in with editor access to export pager feeds." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "primary",
                onClick: onRequestLogin,
                startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 16 }),
                children: "Sign in"
              }
            )
          ] }) : pagerStreams.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-body-secondary small m-0", children: "No pager feeds available to export." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-export", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-export__options", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-control", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "pager-export-stream",
                    className: "settings-control__label",
                    children: "Pager feed"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "select",
                  {
                    id: "pager-export-stream",
                    className: "form-select form-select-sm settings-select",
                    value: selectedPagerStreamId ?? "",
                    onChange: (event) => onSelectPagerStream(event.target.value),
                    disabled: pagerExporting,
                    children: pagerStreams.map((stream) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: stream.id, children: stream.name }, stream.id))
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "settings-export__description", children: "Downloads a ZIP archive with JSONL pager messages and incident details." })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-export__action", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  onClick: onExportPagerFeed,
                  disabled: pagerExporting || !selectedPagerStreamId,
                  size: "sm",
                  use: "primary",
                  startContent: !pagerExporting ? /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { size: 16 }) : void 0,
                  children: pagerExporting ? "Exporting…" : "Export"
                }
              ),
              pagerExportError && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-danger small", children: pagerExportError })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-section", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "settings-section__title", children: "System" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-section__content", children: isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-auth-prompt", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Sign in with editor access to view backend logs." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "primary",
                onClick: onRequestLogin,
                startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 16 }),
                children: "Sign in"
              }
            )
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-system", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "settings-system__description", children: "View server errors and application logs for troubleshooting." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                onClick: onOpenBackendLogs,
                size: "sm",
                use: "secondary",
                appearance: "outline",
                startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { size: 16 }),
                children: "View backend logs"
              }
            )
          ] }) })
        ] })
      ]
    }
  );
};
const BackendLogsPanel$1 = "";
const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "stderr", label: "Service Errors (stderr)" },
  { value: "app", label: "Application Log" }
];
const LINE_OPTIONS = [
  { value: 100, label: "100 lines" },
  { value: 250, label: "250 lines" },
  { value: 500, label: "500 lines" },
  { value: 1e3, label: "1000 lines" }
];
const BackendLogsPanel = ({
  open,
  onClose,
  authFetch
}) => {
  const [entries, setEntries] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [source, setSource] = reactExports.useState("stderr");
  const [maxLines, setMaxLines] = reactExports.useState(250);
  const [autoRefresh, setAutoRefresh] = reactExports.useState(false);
  const [filterText, setFilterText] = reactExports.useState("");
  const fetchLogs = reactExports.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        source,
        lines: String(maxLines)
      });
      const response = await authFetch(`/api/logs/backend?${params}`);
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Editor access required to view logs");
        }
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      const data = await response.json();
      setEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [authFetch, source, maxLines]);
  reactExports.useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open, fetchLogs]);
  reactExports.useEffect(() => {
    if (!open || !autoRefresh)
      return;
    const interval = setInterval(fetchLogs, 5e3);
    return () => clearInterval(interval);
  }, [open, autoRefresh, fetchLogs]);
  const filteredEntries = filterText ? entries.filter(
    (e) => e.line.toLowerCase().includes(filterText.toLowerCase())
  ) : entries;
  const isErrorLine = (line) => {
    const lower = line.toLowerCase();
    return lower.includes("error") || lower.includes("exception") || lower.includes("failed") || lower.includes("traceback") || lower.includes("assertion");
  };
  const isWarningLine = (line) => {
    const lower = line.toLowerCase();
    return lower.includes("warning") || lower.includes("warn");
  };
  if (!open) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-modal", role: "presentation", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "app-modal__dialog backend-logs-panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "backend-logs-title",
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "backend-logs-panel__header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "backend-logs-panel__header-text", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "backend-logs-panel__title", id: "backend-logs-title", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Terminal, { size: 20 }),
              "Backend Logs"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "backend-logs-panel__subtitle text-body-secondary small mb-0", children: "View server errors and application logs" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "sm",
              use: "secondary",
              appearance: "outline",
              onClick: onClose,
              "aria-label": "Close logs",
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "backend-logs-panel__controls", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "backend-logs-panel__filters", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: source,
                onChange: (e) => setSource(e.target.value),
                className: "backend-logs-panel__select",
                children: SOURCE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.value, children: opt.label }, opt.value))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: maxLines,
                onChange: (e) => setMaxLines(Number(e.target.value)),
                className: "backend-logs-panel__select",
                children: LINE_OPTIONS.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.value, children: opt.label }, opt.value))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                placeholder: "Filter logs...",
                value: filterText,
                onChange: (e) => setFilterText(e.target.value),
                className: "backend-logs-panel__filter-input"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "backend-logs-panel__actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "backend-logs-panel__auto-refresh", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: autoRefresh,
                  onChange: (e) => setAutoRefresh(e.target.checked)
                }
              ),
              "Auto-refresh"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Button,
              {
                size: "sm",
                use: "secondary",
                appearance: "outline",
                onClick: fetchLogs,
                disabled: loading,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 14, className: loading ? "spinning" : "" }),
                  "Refresh"
                ]
              }
            )
          ] })
        ] }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "backend-logs-panel__error", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: 16 }),
          error
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "backend-logs-panel__content", children: filteredEntries.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "backend-logs-panel__empty", children: loading ? "Loading..." : "No log entries found" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "backend-logs-panel__log", children: filteredEntries.map((entry, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: `backend-logs-panel__line ${isErrorLine(entry.line) ? "backend-logs-panel__line--error" : isWarningLine(entry.line) ? "backend-logs-panel__line--warning" : ""}`,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "backend-logs-panel__source", children: [
                "[",
                entry.source,
                "]"
              ] }),
              entry.line
            ]
          },
          idx
        )) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "backend-logs-panel__footer", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-body-secondary small", children: [
          "Showing ",
          filteredEntries.length,
          " of ",
          entries.length,
          " entries",
          filterText && " (filtered)"
        ] }) })
      ]
    }
  ) });
};
const Spinner = ({
  size = "md",
  variant = "primary",
  label = "Loading…",
  className
}) => {
  const sizeClass = size === "sm" ? "spinner-border-sm" : null;
  const variantClass = variant === "inherit" ? null : `text-${variant}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      role: "status",
      "aria-live": "polite",
      "aria-busy": "true",
      className: clsx("spinner-border", sizeClass, variantClass, className),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "visually-hidden", children: label })
    }
  );
};
const AppHeader$1 = "";
const AppHeader = ({
  isMobileViewport,
  isMobileSidebarOpen,
  onOpenMobileSidebar,
  transcriptCorrectionEnabled,
  onTranscriptCorrectionToggle,
  onOpenSettings,
  settingsTriggerRef,
  showSettings,
  isReadOnly,
  streamsLoading,
  onRequestLogin,
  onLogout
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-header app-header--floating", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Flex,
    {
      className: "app-header__controls",
      align: "center",
      justify: "end",
      wrap: "nowrap",
      gap: 2,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-header__branding", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "text-warning", size: 16 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "app-header__title", children: "WaveCap" })
        ] }),
        !isReadOnly && !isMobileViewport ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Flex,
          {
            className: "form-check form-check-inline m-0 ps-0",
            align: "center",
            gap: 2,
            wrap: "nowrap",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "transcript-correction-mode",
                  type: "checkbox",
                  className: "form-check-input m-0",
                  checked: transcriptCorrectionEnabled,
                  onChange: onTranscriptCorrectionToggle
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Flex,
                {
                  as: "label",
                  htmlFor: "transcript-correction-mode",
                  className: "form-check-label fw-semibold small mb-0",
                  align: "center",
                  gap: 2,
                  children: "Correction"
                }
              )
            ]
          }
        ) : null,
        isMobileViewport ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            use: "secondary",
            appearance: "outline",
            onClick: onOpenMobileSidebar,
            "aria-controls": "app-stream-sidebar",
            "aria-expanded": isMobileSidebarOpen,
            "aria-label": "Open stream menu",
            startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { size: 16 })
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            ref: settingsTriggerRef,
            onClick: onOpenSettings,
            size: "sm",
            use: "secondary",
            appearance: "outline",
            "aria-haspopup": "dialog",
            "aria-expanded": showSettings,
            "aria-controls": "app-settings-dialog",
            startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { size: 16 })
          }
        ),
        streamsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Spinner,
          {
            size: "sm",
            variant: "secondary",
            label: "Loading streams"
          }
        ) : isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            size: "sm",
            use: "secondary",
            appearance: "outline",
            onClick: onRequestLogin,
            startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 16 })
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            size: "sm",
            use: "secondary",
            appearance: "outline",
            onClick: () => {
              void onLogout();
            },
            startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { size: 16 })
          }
        )
      ]
    }
  ) });
};
const STREAM_QUERY_PARAM = "stream";
const useStreamSelection = (streams, { streamsInitialized }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [selectedStreamId, setSelectedStreamId] = reactExports.useState(() => {
    return searchParams.get(STREAM_QUERY_PARAM);
  });
  reactExports.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextSelectedStreamId = params.get(STREAM_QUERY_PARAM);
    setSelectedStreamId((current) => {
      if (current === nextSelectedStreamId) {
        return current;
      }
      return nextSelectedStreamId;
    });
  }, [location.search]);
  const selectStream = reactExports.useCallback(
    (streamId, options) => {
      setSelectedStreamId(streamId);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (streamId) {
            next.set(STREAM_QUERY_PARAM, streamId);
          } else {
            next.delete(STREAM_QUERY_PARAM);
          }
          return next;
        },
        { replace: (options == null ? void 0 : options.replace) ?? false }
      );
    },
    [setSearchParams]
  );
  reactExports.useEffect(() => {
    if (!streamsInitialized) {
      return;
    }
    if (streams.length === 0) {
      if (selectedStreamId !== null) {
        selectStream(null, { replace: true });
      }
      return;
    }
    if (selectedStreamId && streams.some((stream) => stream.id === selectedStreamId)) {
      return;
    }
    selectStream(streams[0].id, { replace: true });
  }, [streams, selectStream, selectedStreamId, streamsInitialized]);
  return { selectedStreamId, selectStream };
};
if (typeof window !== "undefined") {
  void __vitePreload(() => Promise.resolve({}), true ? ["assets/LiveAudioBanner-96f8f2b0.css"] : void 0);
}
const LiveAudioBanner = () => {
  var _a2;
  const liveAudio = useLiveAudioSession();
  const stream = liveAudio.isListening ? liveAudio.activeStream : null;
  const [, setSearchParams] = useSearchParams();
  const streamId = (stream == null ? void 0 : stream.id) ?? null;
  const label = ((_a2 = stream == null ? void 0 : stream.name) == null ? void 0 : _a2.trim()) || streamId || "";
  const handleFocusStream = reactExports.useCallback(() => {
    if (!streamId)
      return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set(STREAM_QUERY_PARAM, streamId);
      return next;
    });
  }, [setSearchParams, streamId]);
  if (!stream) {
    return null;
  }
  const showError = Boolean(liveAudio.error);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "live-audio-banner", role: "status", "aria-live": "polite", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "live-audio-banner__container app-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "live-audio-banner__content", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "live-audio-banner__info", children: [
      showError ? /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "live-audio-banner__icon live-audio-banner__icon--error", size: 18 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Volume2, { className: "live-audio-banner__icon", size: 18 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "live-audio-banner__label", children: "Listening to" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "live-audio-banner__stream",
          onClick: handleFocusStream,
          title: `View ${label}`,
          children: label
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "live-audio-banner__actions", children: [
      showError ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "live-audio-banner__error", role: "alert", children: liveAudio.error }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: "danger",
          onClick: () => {
            liveAudio.stop();
          },
          startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 14 }),
          children: "Stop"
        }
      )
    ] })
  ] }) }) });
};
const KeyboardShortcutsDialog$1 = "";
const SECTIONS = [
  {
    title: "Navigation",
    shortcuts: [
      {
        keys: ["Ctrl / ⌘", "↑ / ↓"],
        description: "Select the previous or next stream in the sidebar."
      },
      {
        keys: ["Alt", "↑ / ↓"],
        description: "Alternate shortcut to move through the stream list."
      }
    ]
  },
  {
    title: "Stream actions",
    shortcuts: [
      {
        keys: ["Shift", "Esc"],
        description: "Mark the active stream as read."
      },
      {
        keys: ["Ctrl / ⌘", "Shift", "A"],
        description: "Mark all sidebar streams as read."
      },
      {
        keys: ["Ctrl / ⌘", "Shift", "M"],
        description: "Toggle live listening for the selected stream (when available)."
      }
    ]
  },
  {
    title: "Tools & settings",
    shortcuts: [
      {
        keys: ["Ctrl / ⌘", "F"],
        description: "Open the transcript search dialog for the current stream."
      },
      {
        keys: ["Ctrl / ⌘", "K"],
        description: "Open the transcript search dialog (Discord-style quick switcher)."
      },
      {
        keys: ["Ctrl / ⌘", ","],
        description: "Open application settings."
      }
    ]
  },
  {
    title: "Help",
    shortcuts: [
      {
        keys: ["Ctrl / ⌘", "/"],
        description: "Show or hide this keyboard shortcut guide."
      }
    ]
  }
];
const renderKeys = (keys) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "keyboard-shortcuts-dialog__keys", children: keys.map((key, index2) => /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: key }, `${key}-${index2}`)) });
const KeyboardShortcutsDialog = ({ open, onClose }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Modal,
    {
      open,
      onClose,
      title: "Keyboard shortcuts",
      subtitle: "Navigate WaveCap with familiar Discord-inspired shortcuts.",
      size: "lg",
      backdropOpacity: 0.6,
      dialogClassName: "keyboard-shortcuts-dialog",
      bodyClassName: "keyboard-shortcuts-dialog__body",
      closeAriaLabel: "Close keyboard shortcut guide",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyboard-shortcuts-dialog__sections", children: SECTIONS.map((section) => /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "keyboard-shortcuts-dialog__section", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "keyboard-shortcuts-dialog__section-title", children: section.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "keyboard-shortcuts-dialog__list", children: section.shortcuts.map((shortcut) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "keyboard-shortcuts-dialog__item", children: [
          renderKeys(shortcut.keys),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "keyboard-shortcuts-dialog__description", children: shortcut.description })
        ] }, `${section.title}-${shortcut.description}`)) })
      ] }, section.title)) })
    }
  );
};
const Badge = reactExports.forwardRef(
  ({ value, max = Number.POSITIVE_INFINITY, tone = "accent", className, children, ...rest }, ref) => {
    let content = children;
    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        const normalizedValue = Math.max(0, Math.trunc(value));
        if (Number.isFinite(max)) {
          const normalizedMax = Math.max(0, Math.trunc(max));
          content = normalizedValue > normalizedMax ? `${normalizedMax}+` : normalizedValue.toString();
        } else {
          content = normalizedValue.toString();
        }
      } else {
        content = children ?? value.toString();
      }
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        ...rest,
        ref,
        className: clsx("app-badge", `app-badge--${tone}`, className),
        children: content
      }
    );
  }
);
Badge.displayName = "Badge";
const StreamSidebar$1 = "";
const SidebarItemRow = reactExports.memo(function SidebarItemRow2({
  item,
  onSelectStream
}) {
  const handleClick = reactExports.useCallback(() => {
    onSelectStream(item.id);
  }, [onSelectStream, item.id]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Button,
    {
      use: "unstyled",
      onClick: handleClick,
      className: `stream-sidebar__item ${item.isActive ? "stream-sidebar__item--active" : ""}`,
      "aria-current": item.isActive ? "page" : void 0,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { align: "start", gap: 3, className: "stream-sidebar__item-layout", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(StreamStatusIndicator, { stream: item.stream }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Flex,
          {
            className: "stream-sidebar__item-main",
            justify: "between",
            align: "start",
            gap: 3,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Flex,
                {
                  direction: "column",
                  gap: 2,
                  className: "stream-sidebar__item-content",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { align: "baseline", gap: 2, className: "stream-sidebar__item-heading", children: [
                      item.isPinned ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: "stream-sidebar__pin",
                          "aria-label": "Pinned stream",
                          role: "img",
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { size: 14, fill: "currentColor", "aria-hidden": "true" })
                        }
                      ) : null,
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stream-sidebar__item-title", children: item.title }),
                      (() => {
                        var _a2, _b2;
                        if (item.type === "combined") {
                          return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge rounded-pill text-bg-primary-subtle text-primary-emphasis", children: "Combined" });
                        }
                        if (item.isPager) {
                          return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge rounded-pill text-bg-info-subtle text-info-emphasis", children: "Pager" });
                        }
                        const source = ((_a2 = item.stream) == null ? void 0 : _a2.source) ?? "audio";
                        if (source === "remote") {
                          return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge rounded-pill text-bg-warning-subtle text-warning-emphasis", children: "Remote" });
                        }
                        const url = String(((_b2 = item.stream) == null ? void 0 : _b2.url) || "");
                        const isWeb = /^https?:\/\//i.test(url);
                        return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge rounded-pill text-bg-secondary-subtle text-secondary-emphasis", children: isWeb ? "Transcript" : "Audio" });
                      })()
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stream-sidebar__item-preview text-body-secondary", children: item.previewText.trim().toLowerCase() === "no transcription" ? /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "No transcription" }) : item.previewText })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                Flex,
                {
                  direction: "column",
                  align: "end",
                  gap: 1,
                  className: "stream-sidebar__item-meta",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stream-sidebar__item-time", children: item.previewTime }),
                    item.unreadCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Badge,
                      {
                        "aria-label": `${item.unreadCount} new messages`,
                        value: item.unreadCount,
                        max: 99
                      }
                    ) : null
                  ]
                }
              )
            ]
          }
        )
      ] })
    }
  );
});
const StreamSidebar = ({
  isReadOnly,
  onRequestLogin,
  onLogout,
  items,
  loading,
  onSelectStream,
  isMobileViewport,
  isMobileSidebarOpen,
  onCloseMobileSidebar,
  sortMode,
  onSortModeChange,
  onOpenSettings,
  settingsTriggerRef,
  showSettings
}) => {
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }
    if (items.length === 0) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stream-sidebar__empty text-center text-body-secondary", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { className: "mb-3", size: 32 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "fw-semibold mb-1", children: "No streams yet" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-2 small", children: isReadOnly ? "Sign in to control live transcription for configured streams." : "Update your configuration files to add new streams." }),
        isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            use: "primary",
            onClick: onRequestLogin,
            startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 14 }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Sign in" })
          }
        ) : null
      ] });
    }
    return null;
  };
  const handleSortChange = (event) => {
    const nextValue = event.target.value;
    onSortModeChange(nextValue);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `stream-sidebar-drawer ${isMobileSidebarOpen ? "stream-sidebar-drawer--open" : ""}`,
      "aria-hidden": isMobileViewport && !isMobileSidebarOpen,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { id: "app-stream-sidebar", className: "stream-sidebar", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Flex,
          {
            className: "stream-sidebar__header",
            align: "start",
            justify: "between",
            gap: 3,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-uppercase small fw-semibold text-body-secondary mb-1", children: "Streams" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { align: "center", gap: 2, wrap: "wrap", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stream-sidebar__sort-control", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    id: "stream-sidebar-sort",
                    className: "form-select form-select-sm stream-sidebar__sort-select",
                    value: sortMode,
                    onChange: handleSortChange,
                    "aria-label": "Sort streams",
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "activity", children: "Latest activity" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "name", children: "Name (A–Z)" })
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    size: "sm",
                    use: "secondary",
                    appearance: "outline",
                    className: "stream-sidebar__close",
                    onClick: onCloseMobileSidebar,
                    "aria-label": "Close stream menu",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stream-sidebar__list", children: [
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Flex,
            {
              className: "stream-sidebar__status text-body-secondary small",
              align: "center",
              gap: 2,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { size: "sm", label: "Updating streams" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Updating streams…" })
              ]
            }
          ) : null,
          renderEmptyState(),
          items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            SidebarItemRow,
            {
              item,
              onSelectStream
            },
            item.id
          ))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "stream-sidebar__footer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { align: "center", gap: 2, className: "stream-sidebar__branding", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "text-warning", size: 18 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stream-sidebar__title", children: "WaveCap" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Flex, { align: "center", gap: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                ref: settingsTriggerRef,
                onClick: onOpenSettings,
                size: "sm",
                use: "secondary",
                appearance: "outline",
                "aria-haspopup": "dialog",
                "aria-expanded": showSettings,
                "aria-controls": "app-settings-dialog",
                "aria-label": "Settings",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { size: 16 })
              }
            ),
            isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                size: "sm",
                use: "secondary",
                appearance: "outline",
                onClick: onRequestLogin,
                "aria-label": "Sign in",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 16 })
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                size: "sm",
                use: "secondary",
                appearance: "outline",
                onClick: () => {
                  void onLogout();
                },
                "aria-label": "Sign out",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(LogOut, { size: 16 })
              }
            )
          ] })
        ] })
      ] })
    }
  );
};
const titleCollator = new Intl.Collator(void 0, {
  numeric: true,
  sensitivity: "base"
});
const tokenize = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
};
const basePrefix = (title, tokenCount = 2) => {
  const tokens = tokenize(title);
  return tokens.slice(0, tokenCount).join(" ");
};
const typeWeight = (item) => {
  if (item.type === "combined")
    return 0;
  const source = item.stream.source ?? "audio";
  if (source === "audio")
    return 1;
  if (source === "pager")
    return 2;
  if (source === "remote")
    return 3;
  return 9;
};
const latestActivityTs = (stream) => {
  const ts = stream.lastActivityAt ? new Date(stream.lastActivityAt).getTime() : 0;
  const created = stream.createdAt ? new Date(stream.createdAt).getTime() : 0;
  return Math.max(isFinite(ts) ? ts : 0, isFinite(created) ? created : 0);
};
const buildSidebarComparator = (mode) => {
  return (a, b) => {
    const aPinned = a.isPinned;
    const bPinned = b.isPinned;
    if (aPinned !== bPinned)
      return aPinned ? -1 : 1;
    if (mode === "name") {
      const aBase = basePrefix(a.title);
      const bBase = basePrefix(b.title);
      const byBase = titleCollator.compare(aBase, bBase);
      if (byBase !== 0)
        return byBase;
      const byType = typeWeight(a) - typeWeight(b);
      if (byType !== 0)
        return byType;
      const byTitle2 = titleCollator.compare(a.title, b.title);
      if (byTitle2 !== 0)
        return byTitle2;
      return a.id.localeCompare(b.id);
    }
    const aAct = latestActivityTs(a.stream);
    const bAct = latestActivityTs(b.stream);
    if (aAct !== bAct)
      return bAct - aAct;
    const byTitle = titleCollator.compare(a.title, b.title);
    if (byTitle !== 0)
      return byTitle;
    return a.id.localeCompare(b.id);
  };
};
const MOBILE_MEDIA_QUERY = "(max-width: 767.98px)";
const useResponsiveLayout = () => {
  const [isMobileViewport, setIsMobileViewport] = reactExports.useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = reactExports.useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        setIsMobileSidebarOpen(false);
        setIsMobileActionsOpen(false);
      }
    };
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);
  reactExports.useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);
  reactExports.useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSidebarOpen]);
  const openMobileSidebar = reactExports.useCallback(() => {
    if (!isMobileViewport) {
      return;
    }
    setIsMobileSidebarOpen(true);
  }, [isMobileViewport]);
  const closeMobileSidebar = reactExports.useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);
  reactExports.useEffect(() => {
    if (isMobileViewport) {
      return;
    }
    setIsMobileSidebarOpen(false);
    setIsMobileActionsOpen(false);
  }, [isMobileViewport]);
  return {
    isMobileViewport,
    isMobileSidebarOpen,
    isMobileActionsOpen,
    setIsMobileActionsOpen,
    openMobileSidebar,
    closeMobileSidebar
  };
};
const ALERT_EXPIRY_MS = 15e3;
const MAX_ALERTS = 5;
const useKeywordAlerts = (streams) => {
  const [keywordAlerts, setKeywordAlerts] = reactExports.useState(
    []
  );
  const keywordAlertsRef = reactExports.useRef([]);
  const removalTimeoutsRef = reactExports.useRef([]);
  const audioContextRef = reactExports.useRef(null);
  const streamLookup = reactExports.useMemo(() => {
    if (!streams) {
      return /* @__PURE__ */ new Map();
    }
    return new Map(streams.map((stream) => [stream.id, stream]));
  }, [streams]);
  const playAlertSound = reactExports.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const context = audioContextRef.current;
      if (!context) {
        return;
      }
      if (context.state === "suspended") {
        void context.resume().catch(() => {
        });
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(1e-4, context.currentTime);
      oscillator.connect(gain);
      gain.connect(context.destination);
      gain.gain.exponentialRampToValueAtTime(0.3, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(1e-4, context.currentTime + 0.6);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.6);
      oscillator.addEventListener("ended", () => {
        try {
          oscillator.disconnect();
        } catch {
        }
        try {
          gain.disconnect();
        } catch {
        }
      });
    } catch (error) {
      console.warn("Unable to play alert sound:", error);
    }
  }, []);
  reactExports.useEffect(() => {
    keywordAlertsRef.current = keywordAlerts;
  }, [keywordAlerts]);
  reactExports.useEffect(
    () => () => {
      removalTimeoutsRef.current.forEach(
        (timeoutId) => window.clearTimeout(timeoutId)
      );
      removalTimeoutsRef.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
        });
        audioContextRef.current = null;
      }
    },
    []
  );
  const handleAlertMatches = reactExports.useCallback(
    (transcription) => {
      if (!Array.isArray(transcription.alerts) || transcription.alerts.length === 0) {
        return;
      }
      const stream = streamLookup.get(transcription.streamId);
      const streamName = (stream == null ? void 0 : stream.name) || (stream == null ? void 0 : stream.url) || transcription.streamId;
      const baseText = typeof transcription.correctedText === "string" && transcription.correctedText.trim().length > 0 ? transcription.correctedText.trim() : transcription.text;
      const excerpt = typeof baseText === "string" ? baseText.trim() : "";
      const finalExcerpt = excerpt.length > 0 ? excerpt : "[Blank audio]";
      const pendingAlerts = transcription.alerts.filter((match) => match && match.notify !== false).map((match) => ({
        id: `${transcription.id}:${match.ruleId}`,
        ruleId: match.ruleId,
        label: match.label && match.label.trim().length > 0 ? match.label : match.ruleId,
        streamId: transcription.streamId,
        streamName,
        transcriptionId: transcription.id,
        text: finalExcerpt,
        matchedPhrases: Array.isArray(match.matchedPhrases) ? match.matchedPhrases : [],
        timestamp: transcription.timestamp,
        playSound: match.playSound !== false
      }));
      if (pendingAlerts.length === 0) {
        return;
      }
      const existingIds = new Set(keywordAlertsRef.current.map((alert) => alert.id));
      const deduped = pendingAlerts.filter(
        (alert) => !existingIds.has(alert.id)
      );
      if (deduped.length === 0) {
        return;
      }
      setKeywordAlerts((prev) => {
        const merged = [...deduped, ...prev];
        return merged.slice(0, MAX_ALERTS);
      });
      deduped.forEach((alert) => {
        if (alert.playSound) {
          playAlertSound();
        }
        const timeoutId = window.setTimeout(() => {
          setKeywordAlerts(
            (current) => current.filter((item) => item.id !== alert.id)
          );
          removalTimeoutsRef.current = removalTimeoutsRef.current.filter(
            (id2) => id2 !== timeoutId
          );
        }, ALERT_EXPIRY_MS);
        removalTimeoutsRef.current.push(timeoutId);
      });
    },
    [playAlertSound, streamLookup]
  );
  const handleDismissAlert = reactExports.useCallback((id2) => {
    setKeywordAlerts((prev) => prev.filter((alert) => alert.id !== id2));
  }, []);
  return { keywordAlerts, handleAlertMatches, handleDismissAlert };
};
const parseFilenameFromContentDisposition = (header) => {
  if (!header) {
    return null;
  }
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (error) {
      console.warn(
        "Failed to decode UTF-8 filename from Content-Disposition header:",
        error
      );
    }
  }
  const fallbackMatch = header.match(/filename="?([^";]+)"?/i);
  return fallbackMatch && fallbackMatch[1] ? fallbackMatch[1] : null;
};
const useExportSettings = ({
  defaultStatuses,
  statusOrder,
  requireEditor,
  authFetch
}) => {
  const [exportStatuses, setExportStatuses] = reactExports.useState(
    () => [...defaultStatuses]
  );
  const [exportError, setExportError] = reactExports.useState(null);
  const [exporting, setExporting] = reactExports.useState(false);
  const hasUserAdjusted = reactExports.useRef(false);
  reactExports.useEffect(() => {
    setExportStatuses((current) => {
      if (hasUserAdjusted.current) {
        return current;
      }
      const isEqual = current.length === defaultStatuses.length && current.every((status, index2) => status === defaultStatuses[index2]);
      if (isEqual) {
        return current;
      }
      return [...defaultStatuses];
    });
  }, [defaultStatuses]);
  const handleExportStatusToggle = reactExports.useCallback(
    (status) => {
      setExportError(null);
      hasUserAdjusted.current = true;
      setExportStatuses((current) => {
        const hasStatus = current.includes(status);
        if (hasStatus) {
          if (current.length === 1) {
            return current;
          }
          const next2 = current.filter((item) => item !== status);
          return statusOrder.filter((value) => next2.includes(value));
        }
        const next = [...current, status];
        return statusOrder.filter((value) => next.includes(value));
      });
    },
    [statusOrder]
  );
  const handleExportTranscriptions = reactExports.useCallback(async () => {
    if (exportStatuses.length === 0) {
      setExportError("Select at least one review status to export.");
      return;
    }
    if (!requireEditor("export transcriptions")) {
      setExportError("Sign in to export transcriptions.");
      return;
    }
    try {
      setExportError(null);
      setExporting(true);
      const params = new URLSearchParams();
      for (const status of exportStatuses) {
        params.append("status", status);
      }
      const query = params.toString();
      const response = await authFetch(
        `/api/transcriptions/export-reviewed${query ? `?${query}` : ""}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suggestedFilename = parseFilenameFromContentDisposition(
        response.headers.get("Content-Disposition")
      );
      link.download = suggestedFilename ?? `reviewed-transcriptions-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export transcriptions:", error);
      setExportError(
        error instanceof Error ? error.message : "Failed to export transcriptions"
      );
    } finally {
      setExporting(false);
    }
  }, [authFetch, exportStatuses, requireEditor]);
  return {
    exportStatuses,
    exporting,
    exportError,
    setExportError,
    handleExportStatusToggle,
    handleExportTranscriptions
  };
};
const usePagerExport = ({
  streams,
  requireEditor,
  authFetch
}) => {
  const pagerStreams = reactExports.useMemo(
    () => streams.filter((stream) => stream.source === "pager"),
    [streams]
  );
  const [selectedStreamId, setSelectedStreamId] = reactExports.useState(null);
  const [exporting, setExporting] = reactExports.useState(false);
  const [exportError, setExportError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (pagerStreams.length === 0) {
      setSelectedStreamId(null);
      return;
    }
    setSelectedStreamId((current) => {
      if (current && pagerStreams.some((stream) => stream.id === current)) {
        return current;
      }
      return pagerStreams[0].id;
    });
  }, [pagerStreams]);
  const selectStream = reactExports.useCallback((streamId) => {
    setExportError(null);
    setSelectedStreamId(streamId);
  }, []);
  const exportPagerFeed = reactExports.useCallback(async () => {
    if (!selectedStreamId) {
      setExportError("Select a pager feed to export.");
      return;
    }
    if (!requireEditor("export pager feeds")) {
      setExportError("Sign in to export pager feeds.");
      return;
    }
    try {
      setExportError(null);
      setExporting(true);
      const response = await authFetch(
        `/api/pager-feeds/${encodeURIComponent(selectedStreamId)}/export`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suggestedFilename = parseFilenameFromContentDisposition(
        response.headers.get("Content-Disposition")
      );
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      link.download = suggestedFilename ?? `pager-feed-${selectedStreamId}-${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export pager feed:", error);
      setExportError(
        error instanceof Error ? error.message : "Failed to export pager feed"
      );
    } finally {
      setExporting(false);
    }
  }, [authFetch, requireEditor, selectedStreamId]);
  return {
    pagerStreams,
    selectedStreamId,
    exporting,
    exportError,
    selectStream,
    exportPagerFeed
  };
};
const API_BASE$1 = "/api";
const COMBINED_STREAM_VIEWS_QUERY_KEY = [
  "combined-stream-views"
];
const fetchCombinedStreamViews = async () => {
  const response = await fetch(`${API_BASE$1}/combined-stream-views`);
  if (!response.ok) {
    throw new Error(`Failed to load combined stream views (status ${response.status})`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.filter((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const candidate = entry;
    return typeof candidate.id === "string" && typeof candidate.name === "string" && Array.isArray(candidate.streamIds);
  });
};
const useCombinedStreamViews = () => {
  return useQuery({
    queryKey: COMBINED_STREAM_VIEWS_QUERY_KEY,
    queryFn: fetchCombinedStreamViews
  });
};
const LAST_VIEWED_STORAGE_KEY = "wavecap-last-viewed-at";
const isNonNullObject = (value) => {
  return typeof value === "object" && value !== null;
};
const sanitizeLastViewedMap = (value) => {
  if (!isNonNullObject(value)) {
    return {};
  }
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== "string") {
      continue;
    }
    const num = typeof raw === "number" ? raw : Number.NaN;
    if (!Number.isFinite(num) || num < 0) {
      continue;
    }
    const ts = Math.floor(num);
    result[key] = ts;
  }
  return result;
};
const parseLastViewedMapString = (raw) => {
  if (raw === null) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return sanitizeLastViewedMap(parsed);
  } catch {
    return {};
  }
};
const getStoredLastViewedMap = () => {
  if (typeof window === "undefined") {
    return {};
  }
  const stored = window.localStorage.getItem(LAST_VIEWED_STORAGE_KEY);
  return parseLastViewedMapString(stored);
};
const storeLastViewedMap = (map) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload = JSON.stringify(map);
    window.localStorage.setItem(LAST_VIEWED_STORAGE_KEY, payload);
  } catch {
  }
};
const App$1 = "";
const REVIEW_STATUS_OPTIONS = [
  { value: "verified", label: "Verified" },
  { value: "corrected", label: "Corrected" },
  { value: "pending", label: "Pending" }
];
const REVIEW_STATUS_ORDER = REVIEW_STATUS_OPTIONS.map((option) => option.value);
const GENERIC_SERVER_ERROR_MESSAGE = "An unexpected server error occurred.";
const DEFAULT_ACK_MESSAGES = {
  start_transcription: "Transcription started.",
  stop_transcription: "Transcription stopped.",
  reset_stream: "Stream reset.",
  update_stream: "Stream updated."
};
const DEFAULT_ERROR_MESSAGES = {
  start_transcription: "Unable to start transcription. Please try again.",
  stop_transcription: "Unable to stop transcription. Please try again.",
  reset_stream: "Unable to reset stream. Please try again.",
  update_stream: "Unable to update stream. Please try again."
};
const DEFAULT_DOCUMENT_TITLE = "WaveCap";
const STREAM_SORT_STORAGE_KEY = "wavecap-stream-sort-mode";
const STREAM_SORT_DEFAULT = "activity";
const resolveCommandMessage = (action, message, fallbacks) => {
  const trimmed = message == null ? void 0 : message.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return fallbacks[action];
};
const parseStreamSortMode = (value) => {
  if (value === "activity" || value === "name") {
    return value;
  }
  return null;
};
const getStoredStreamSortMode = () => {
  if (typeof window === "undefined") {
    return STREAM_SORT_DEFAULT;
  }
  const stored = window.localStorage.getItem(STREAM_SORT_STORAGE_KEY);
  return parseStreamSortMode(stored) ?? STREAM_SORT_DEFAULT;
};
const safeTimestamp = (timestamp) => {
  if (!timestamp) {
    return 0;
  }
  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? 0 : value;
};
const getLatestTranscription = (stream) => {
  if (!stream || !Array.isArray(stream.transcriptions) || stream.transcriptions.length === 0) {
    return null;
  }
  return stream.transcriptions.reduce(
    (latest, current) => {
      if (!current) {
        return latest;
      }
      if (!latest) {
        return current;
      }
      return safeTimestamp(current.timestamp) > safeTimestamp(latest.timestamp) ? current : latest;
    },
    null
  );
};
const getLatestActivityTimestamp = (stream) => {
  if (!stream) {
    return 0;
  }
  const latestTranscription = getLatestTranscription(stream);
  const transcriptionTimestamp = latestTranscription ? safeTimestamp(latestTranscription.timestamp) : 0;
  const lastActivityTimestamp = safeTimestamp(stream.lastActivityAt);
  const createdTimestamp = safeTimestamp(stream.createdAt);
  return Math.max(transcriptionTimestamp, lastActivityTimestamp, createdTimestamp);
};
const countUnreadTranscriptions = (stream, lastViewedAt) => {
  if (!(stream == null ? void 0 : stream.transcriptions) || stream.transcriptions.length === 0) {
    return 0;
  }
  return stream.transcriptions.reduce((count, transcription) => {
    return safeTimestamp(transcription.timestamp) > lastViewedAt ? count + 1 : count;
  }, 0);
};
const isPagerStream = (stream) => {
  return ((stream == null ? void 0 : stream.source) ?? "audio") === "pager";
};
const buildPagerWebhookUrl = (stream) => {
  if (!isPagerStream(stream)) {
    return null;
  }
  const base = stream.url ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  try {
    const url = origin ? new URL(base, origin) : new URL(base);
    if (stream.webhookToken) {
      url.searchParams.set("token", stream.webhookToken);
    }
    return url.toString();
  } catch (error) {
    console.warn("Failed to construct pager webhook URL:", error);
    if (stream.webhookToken) {
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}token=${stream.webhookToken}`;
    }
    return base || null;
  }
};
const buildPagerWebhookPath = (stream) => {
  if (!isPagerStream(stream)) {
    return null;
  }
  const token = stream.webhookToken;
  const base = stream.url ?? "";
  if (!base && !token) {
    return null;
  }
  const suffix = token ? `${base.includes("?") ? "&" : "?"}token=${token}` : "";
  return `${base}${suffix}`;
};
const buildPreviewText = (transcription) => {
  if (!transcription) {
    return "No activity yet";
  }
  const baseText = (transcription.correctedText ?? transcription.text ?? "").trim();
  if (!baseText || isBlankAudioText(baseText)) {
    return "No transcription";
  }
  if (baseText.length > 200) {
    return `${baseText.slice(0, 197)}…`;
  }
  return baseText;
};
const renderStandaloneStatusIcon = (modifier) => {
  switch (modifier) {
    case "transcribing":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4", "aria-hidden": "true" });
    case "queued":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4", "aria-hidden": "true" });
    case "error":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-4 h-4", "aria-hidden": "true" });
    default:
      return /* @__PURE__ */ jsxRuntimeExports.jsx(MicOff, { className: "w-4 h-4", "aria-hidden": "true" });
  }
};
function App() {
  var _a2;
  const {
    themeMode,
    setThemeMode,
    colorCodingEnabled,
    setColorCodingEnabled,
    transcriptCorrectionEnabled,
    setTranscriptCorrectionEnabled,
    defaultReviewExportStatuses
  } = useUISettings();
  const [showSettings, setShowSettings] = reactExports.useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = reactExports.useState(false);
  const [showBackendLogs, setShowBackendLogs] = reactExports.useState(false);
  const settingsTriggerRef = reactExports.useRef(null);
  const settingsCloseButtonRef = reactExports.useRef(null);
  const {
    streams,
    loading,
    initialized: streamsInitialized,
    error,
    addTranscription,
    updateStreams,
    reviewTranscription,
    patchStream,
    fetchStreams
  } = useStreams();
  const {
    data: combinedStreamViews = [],
    isFetching: combinedViewsLoading,
    isFetched: combinedViewsFetched,
    error: combinedViewsError
  } = useCombinedStreamViews();
  const {
    role,
    authenticated,
    token,
    login,
    logout,
    loginVisible,
    setLoginVisible,
    requestLogin,
    requiresPassword,
    authFetch
  } = useAuth();
  const isReadOnly = role !== "editor";
  const canViewWebhookDetails = !isReadOnly && (authenticated || !requiresPassword);
  const [loginPassword, setLoginPassword] = reactExports.useState("");
  const [loggingIn, setLoggingIn] = reactExports.useState(false);
  const [loginError, setLoginError] = reactExports.useState(null);
  const {
    isConnected: wsConnected,
    lastMessage,
    error: wsError,
    resetStream: wsResetStream,
    updateStream: wsUpdateStream,
    reconnect: wsReconnect
  } = useWebSocket("/ws", { token, onUnauthorized: requestLogin });
  const { showToast } = useToast();
  const { keywordAlerts, handleAlertMatches, handleDismissAlert } = useKeywordAlerts(streams);
  const [pendingStreamCommands, setPendingStreamCommands] = reactExports.useState({});
  const hadWsConnectionRef = reactExports.useRef(false);
  const shouldRefetchStreamsRef = reactExports.useRef(false);
  const setStreamCommandState = reactExports.useCallback(
    (streamId, action) => {
      setPendingStreamCommands((previous) => {
        if (action === null) {
          if (!(streamId in previous)) {
            return previous;
          }
          const next = { ...previous };
          delete next[streamId];
          return next;
        }
        if (previous[streamId] === action) {
          return previous;
        }
        return { ...previous, [streamId]: action };
      });
    },
    []
  );
  const requireEditor = reactExports.useCallback(
    (actionDescription) => {
      if (!isReadOnly) {
        return true;
      }
      requestLogin();
      showToast({
        variant: "info",
        title: "Read-only mode",
        message: `Sign in to ${actionDescription}.`
      });
      return false;
    },
    [isReadOnly, requestLogin, showToast]
  );
  const {
    exportStatuses,
    exporting,
    exportError,
    handleExportStatusToggle,
    handleExportTranscriptions
  } = useExportSettings({
    defaultStatuses: defaultReviewExportStatuses,
    statusOrder: REVIEW_STATUS_ORDER,
    requireEditor,
    authFetch
  });
  const {
    pagerStreams,
    selectedStreamId: selectedPagerStreamId,
    exporting: exportingPagerFeed,
    exportError: pagerExportError,
    selectStream: selectPagerExportStream,
    exportPagerFeed
  } = usePagerExport({
    streams,
    requireEditor,
    authFetch
  });
  reactExports.useEffect(() => {
    if (!loginVisible) {
      setLoginPassword("");
      setLoginError(null);
      setLoggingIn(false);
    }
  }, [loginVisible]);
  const {
    isMobileViewport,
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar
  } = useResponsiveLayout();
  const closeSettings = reactExports.useCallback(() => {
    setShowSettings(false);
    const trigger = settingsTriggerRef.current;
    if (trigger) {
      trigger.focus();
    }
  }, []);
  reactExports.useEffect(() => {
    if (!showSettings) {
      return;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const closeButton = settingsCloseButtonRef.current;
    if (closeButton) {
      closeButton.focus();
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSettings, showSettings]);
  reactExports.useEffect(() => {
    if (!wsConnected) {
      if (hadWsConnectionRef.current) {
        console.log("🔌 WebSocket disconnected, will refetch streams on reconnect");
        shouldRefetchStreamsRef.current = true;
      }
      return;
    }
    if (shouldRefetchStreamsRef.current) {
      console.log("🔌 WebSocket reconnected, refetching streams to catch up on missed messages...");
      shouldRefetchStreamsRef.current = false;
      void fetchStreams();
    }
    hadWsConnectionRef.current = true;
  }, [fetchStreams, wsConnected]);
  reactExports.useEffect(() => {
    if (!lastMessage) {
      return;
    }
    if (lastMessage.type === "transcription" && lastMessage.data) {
      const transcription = lastMessage.data;
      addTranscription(transcription);
      handleAlertMatches(transcription);
      return;
    }
    switch (lastMessage.type) {
      case "streams_update":
        if (lastMessage.data) {
          console.log("📡 Received streams_update:", lastMessage.data);
          updateStreams(lastMessage.data);
        }
        break;
      case "error":
        console.error("WebSocket error:", lastMessage.message);
        break;
    }
  }, [lastMessage, addTranscription, updateStreams, handleAlertMatches]);
  reactExports.useEffect(() => {
    var _a3;
    if (!lastMessage) {
      return;
    }
    if (lastMessage.type === "ack") {
      const resolvedMessage = resolveCommandMessage(
        lastMessage.action,
        lastMessage.message,
        DEFAULT_ACK_MESSAGES
      );
      showToast({ variant: "success", message: resolvedMessage });
    } else if (lastMessage.type === "error" && !lastMessage.requestId) {
      const message = ((_a3 = lastMessage.message) == null ? void 0 : _a3.trim()) || GENERIC_SERVER_ERROR_MESSAGE;
      const normalized = message.toLowerCase();
      if (normalized.includes("editor access required") || normalized.includes("invalid or expired token")) {
        requestLogin();
      }
      showToast({ variant: "error", title: "Action failed", message });
    }
  }, [lastMessage, requestLogin, showToast]);
  const reportCommandFailure = reactExports.useCallback(
    (action, message) => {
      const normalizedMessage = (message == null ? void 0 : message.toLowerCase()) ?? "";
      if (normalizedMessage.includes("editor access required") || normalizedMessage.includes("invalid or expired token")) {
        requestLogin();
      }
      const resolvedMessage = resolveCommandMessage(
        action,
        message,
        DEFAULT_ERROR_MESSAGES
      );
      showToast({
        variant: "error",
        title: "Action failed",
        message: resolvedMessage
      });
      return resolvedMessage;
    },
    [requestLogin, showToast]
  );
  const optimisticallyUpdateStream = reactExports.useCallback(
    (streamId, updates) => {
      patchStream(streamId, (stream) => {
        const next = { ...updates };
        if (next.status === "transcribing" && stream.error) {
          next.error = null;
        }
        const changed = Object.entries(next).some(([key, value]) => {
          if (value === void 0) {
            return false;
          }
          const currentValue = stream[key];
          return currentValue !== value;
        });
        return changed ? next : null;
      });
    },
    [patchStream]
  );
  const handleUpdateStream = reactExports.useCallback(
    async (streamId, updates) => {
      if (!requireEditor("edit streams")) {
        return {
          success: false,
          action: "update_stream",
          message: "Sign in to edit streams."
        };
      }
      setStreamCommandState(streamId, "updating");
      try {
        const result = await wsUpdateStream(streamId, updates);
        if (!result.success) {
          reportCommandFailure(result.action, result.message);
          return result;
        }
        optimisticallyUpdateStream(streamId, updates);
        return result;
      } catch (error2) {
        console.error("Failed to update stream:", error2);
        reportCommandFailure("update_stream");
        return { success: false, action: "update_stream" };
      } finally {
        setStreamCommandState(streamId, null);
      }
    },
    [
      optimisticallyUpdateStream,
      reportCommandFailure,
      requireEditor,
      setStreamCommandState,
      wsUpdateStream
    ]
  );
  const handleResetStream = reactExports.useCallback(
    async (streamId) => {
      if (!requireEditor("reset streams")) {
        return;
      }
      setStreamCommandState(streamId, "resetting");
      try {
        const result = await wsResetStream(streamId);
        if (!result.success) {
          reportCommandFailure(result.action, result.message);
        }
      } catch (error2) {
        console.error("Failed to reset stream:", error2);
        reportCommandFailure("reset_stream");
      } finally {
        setStreamCommandState(streamId, null);
      }
    },
    [
      reportCommandFailure,
      requireEditor,
      setStreamCommandState,
      wsResetStream
    ]
  );
  const handleThemeModeChange = reactExports.useCallback(
    (event) => {
      setThemeMode(event.target.value);
    },
    [setThemeMode]
  );
  const handleColorCodingToggle = reactExports.useCallback(
    (event) => {
      setColorCodingEnabled(event.target.checked);
    },
    [setColorCodingEnabled]
  );
  const handleTranscriptCorrectionToggle = reactExports.useCallback(
    (event) => {
      setTranscriptCorrectionEnabled(event.target.checked);
    },
    [setTranscriptCorrectionEnabled]
  );
  const handleLoginPasswordChange = reactExports.useCallback(
    (event) => {
      setLoginPassword(event.target.value);
    },
    []
  );
  const handleLoginSubmit = reactExports.useCallback(
    async (event) => {
      event.preventDefault();
      setLoggingIn(true);
      setLoginError(null);
      try {
        await login({ password: loginPassword.trim() });
        setLoginVisible(false);
        setLoginPassword("");
      } catch (error2) {
        setLoginError(
          error2 instanceof Error ? error2.message : "Unable to sign in."
        );
      } finally {
        setLoggingIn(false);
      }
    },
    [login, loginPassword, setLoginVisible]
  );
  const handleCancelLogin = reactExports.useCallback(() => {
    setLoginVisible(false);
  }, [setLoginVisible]);
  const normalizedStreams = reactExports.useMemo(
    () => Array.isArray(streams) ? streams : [],
    [streams]
  );
  const { map: combinedViewMap, virtualStreams } = useCombinedViewData({
    streams: normalizedStreams,
    combinedStreamViews,
    streamsInitialized,
    loading
  });
  const displayStreams = reactExports.useMemo(
    () => [...normalizedStreams, ...virtualStreams],
    [normalizedStreams, virtualStreams]
  );
  const totalTranscriptions = normalizedStreams.reduce(
    (total, stream) => {
      var _a3;
      return total + (((_a3 = stream.transcriptions) == null ? void 0 : _a3.length) || 0);
    },
    0
  );
  const activeStreams = normalizedStreams.filter(
    (stream) => stream.status === "transcribing"
  ).length;
  const [standaloneControls, setStandaloneControls] = reactExports.useState(null);
  const [lastViewedAtByConversation, setLastViewedAtByConversation] = reactExports.useState(() => getStoredLastViewedMap());
  const [streamSortMode, setStreamSortMode] = reactExports.useState(
    () => getStoredStreamSortMode()
  );
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STREAM_SORT_STORAGE_KEY, streamSortMode);
  }, [streamSortMode]);
  reactExports.useEffect(() => {
    storeLastViewedMap(lastViewedAtByConversation);
  }, [lastViewedAtByConversation]);
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleStorage = (event) => {
      if (event.key !== LAST_VIEWED_STORAGE_KEY) {
        return;
      }
      const next = parseLastViewedMapString(event.newValue);
      setLastViewedAtByConversation((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) {
          return next;
        }
        for (const key of prevKeys) {
          if (prev[key] !== next[key]) {
            return next;
          }
        }
        return prev;
      });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
  const sortedConversations = reactExports.useMemo(() => {
    if (displayStreams.length === 0) {
      return [];
    }
    return [...displayStreams].sort((a, b) => {
      const aPinned = Boolean(a.pinned);
      const bPinned = Boolean(b.pinned);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      if (streamSortMode === "name") {
        const nameComparison = (() => {
          const collator = new Intl.Collator(void 0, {
            numeric: true,
            sensitivity: "base"
          });
          const aTitle = getStreamTitle(a);
          const bTitle = getStreamTitle(b);
          return collator.compare(aTitle, bTitle);
        })();
        if (nameComparison !== 0)
          return nameComparison;
        const activityDifference2 = getLatestActivityTimestamp(b) - getLatestActivityTimestamp(a);
        if (activityDifference2 !== 0) {
          return activityDifference2;
        }
        return a.id.localeCompare(b.id);
      }
      const activityDifference = getLatestActivityTimestamp(b) - getLatestActivityTimestamp(a);
      if (activityDifference !== 0) {
        return activityDifference;
      }
      return compareStreamsByName(a, b);
    });
  }, [displayStreams, streamSortMode]);
  const markStreamAsRead = reactExports.useCallback(
    (streamId) => {
      if (!streamId) {
        return;
      }
      const stream = sortedConversations.find(
        (candidate) => candidate.id === streamId
      );
      if (!stream) {
        return;
      }
      const latestTimestamp = getLatestActivityTimestamp(stream);
      if (!latestTimestamp) {
        return;
      }
      setLastViewedAtByConversation((current) => {
        const previous = current[streamId] ?? 0;
        if (previous >= latestTimestamp) {
          return current;
        }
        return {
          ...current,
          [streamId]: latestTimestamp
        };
      });
    },
    [setLastViewedAtByConversation, sortedConversations]
  );
  const markAllStreamsAsRead = reactExports.useCallback(() => {
    setLastViewedAtByConversation((current) => {
      let changed = false;
      const next = { ...current };
      sortedConversations.forEach((stream) => {
        const latestTimestamp = getLatestActivityTimestamp(stream);
        if (!latestTimestamp) {
          return;
        }
        if ((next[stream.id] ?? 0) < latestTimestamp) {
          next[stream.id] = latestTimestamp;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [setLastViewedAtByConversation, sortedConversations]);
  const handleStreamSortModeChange = reactExports.useCallback(
    (mode) => {
      setStreamSortMode((previous) => previous === mode ? previous : mode);
    },
    []
  );
  const selectionInitialized = streamsInitialized && combinedViewsFetched;
  const { selectedStreamId, selectStream } = useStreamSelection(
    sortedConversations,
    {
      streamsInitialized: selectionInitialized
    }
  );
  const sidebarLoading = loading || combinedViewsLoading;
  const showAuthLoading = sidebarLoading && !selectionInitialized;
  const combinedViewsErrorMessage = (combinedViewsError == null ? void 0 : combinedViewsError.message) ?? null;
  const streamSidebarItems = reactExports.useMemo(() => {
    const raw = displayStreams.map((stream) => {
      const latestTranscription = getLatestTranscription(stream);
      const title = getStreamTitle(stream);
      const latestTimestamp = getLatestActivityTimestamp(stream);
      return {
        id: stream.id,
        type: stream.source === "combined" ? "combined" : "stream",
        title,
        previewText: buildPreviewText(latestTranscription),
        previewTime: latestTimestamp > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Timestamp,
          {
            value: latestTimestamp,
            timeOptions: { hour: "2-digit", minute: "2-digit", hour12: false }
          }
        ) : null,
        unreadCount: countUnreadTranscriptions(
          stream,
          lastViewedAtByConversation[stream.id] ?? 0
        ),
        stream,
        isPager: isPagerStream(stream),
        isActive: selectedStreamId === stream.id,
        isPinned: Boolean(stream.pinned)
      };
    });
    const comparator = buildSidebarComparator(streamSortMode);
    const items = [...raw].sort(comparator);
    return items;
  }, [
    displayStreams,
    lastViewedAtByConversation,
    selectedStreamId,
    streamSortMode
  ]);
  const orderedStreamIds = reactExports.useMemo(
    () => streamSidebarItems.map((item) => item.id),
    [streamSidebarItems]
  );
  const selectedStream = reactExports.useMemo(() => {
    if (!selectedStreamId) {
      return null;
    }
    return sortedConversations.find((stream) => stream.id === selectedStreamId) ?? null;
  }, [sortedConversations, selectedStreamId]);
  reactExports.useEffect(() => {
    if (!selectedStream || selectedStream.source === "combined") {
      setStandaloneControls(null);
    }
  }, [selectedStream]);
  const selectedStreamLatestTimestamp = reactExports.useMemo(
    () => selectedStream ? getLatestActivityTimestamp(selectedStream) : 0,
    [selectedStream]
  );
  const selectedStreamTitle = selectedStream ? getStreamTitle(selectedStream) : "";
  const selectedStreamIsPager = reactExports.useMemo(
    () => ((selectedStream == null ? void 0 : selectedStream.source) ?? "audio") === "pager",
    [selectedStream]
  );
  const selectedStreamIsCombined = reactExports.useMemo(
    () => ((selectedStream == null ? void 0 : selectedStream.source) ?? "audio") === "combined",
    [selectedStream]
  );
  const selectedCombinedMetadata = selectedStream ? combinedViewMap.get(selectedStream.id) ?? null : null;
  const selectedCombinedMembers = reactExports.useMemo(
    () => (selectedCombinedMetadata == null ? void 0 : selectedCombinedMetadata.members) ?? [],
    [selectedCombinedMetadata]
  );
  const selectedCombinedMissing = (selectedCombinedMetadata == null ? void 0 : selectedCombinedMetadata.missingStreamIds) ?? [];
  const selectedCombinedView = (selectedCombinedMetadata == null ? void 0 : selectedCombinedMetadata.view) ?? null;
  const combinedMemberNames = reactExports.useMemo(
    () => selectedCombinedMembers.map(
      (stream) => {
        var _a3, _b2;
        return ((_a3 = stream.name) == null ? void 0 : _a3.trim()) || ((_b2 = stream.url) == null ? void 0 : _b2.trim()) || stream.id;
      }
    ),
    [selectedCombinedMembers]
  );
  const combinedMemberList = combinedMemberNames.join(", ");
  reactExports.useEffect(() => {
    if (selectedStream && (selectedStream.source ?? "audio") === "pager") {
      selectPagerExportStream(selectedStream.id);
    }
  }, [selectedStream, selectPagerExportStream]);
  const selectedStreamWebhookUrl = reactExports.useMemo(() => {
    if (!selectedStream || !canViewWebhookDetails) {
      return null;
    }
    if ((selectedStream.source ?? "audio") !== "pager") {
      return null;
    }
    return buildPagerWebhookUrl(selectedStream);
  }, [canViewWebhookDetails, selectedStream]);
  const selectedStreamWebhookPath = reactExports.useMemo(() => {
    if (!selectedStream || !canViewWebhookDetails) {
      return null;
    }
    if ((selectedStream.source ?? "audio") !== "pager") {
      return null;
    }
    return buildPagerWebhookPath(selectedStream);
  }, [canViewWebhookDetails, selectedStream]);
  reactExports.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (!selectedStreamId || !selectedStreamTitle) {
      document.title = DEFAULT_DOCUMENT_TITLE;
      return;
    }
    document.title = `${selectedStreamTitle} – ${DEFAULT_DOCUMENT_TITLE}`;
  }, [selectedStreamId, selectedStreamTitle]);
  reactExports.useEffect(() => {
    setLastViewedAtByConversation((current) => {
      let changed = false;
      const next = { ...current };
      sortedConversations.forEach((stream) => {
        if (!(stream.id in next)) {
          next[stream.id] = getLatestActivityTimestamp(stream);
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [sortedConversations]);
  reactExports.useEffect(() => {
    if (!selectedStreamId || !selectedStream) {
      return;
    }
    const latestTimestamp = getLatestActivityTimestamp(selectedStream);
    if (!latestTimestamp) {
      return;
    }
    setLastViewedAtByConversation((current) => {
      const previous = current[selectedStreamId] ?? 0;
      if (previous >= latestTimestamp) {
        return current;
      }
      return {
        ...current,
        [selectedStreamId]: latestTimestamp
      };
    });
  }, [selectedStream, selectedStreamId]);
  const handleSelectStream = reactExports.useCallback(
    (streamId) => {
      selectStream(streamId);
      if (isMobileViewport) {
        closeMobileSidebar();
      }
    },
    [closeMobileSidebar, isMobileViewport, selectStream]
  );
  const selectRelativeStream = reactExports.useCallback(
    (offset) => {
      if (orderedStreamIds.length === 0) {
        return;
      }
      if (!selectedStreamId) {
        const fallback = offset > 0 ? orderedStreamIds[0] : orderedStreamIds[orderedStreamIds.length - 1];
        handleSelectStream(fallback);
        return;
      }
      const currentIndex = orderedStreamIds.indexOf(selectedStreamId);
      const total = orderedStreamIds.length;
      if (currentIndex === -1) {
        const fallback = offset > 0 ? orderedStreamIds[0] : orderedStreamIds[orderedStreamIds.length - 1];
        handleSelectStream(fallback);
        return;
      }
      const nextIndex = (currentIndex + offset + total) % total;
      const nextId = orderedStreamIds[nextIndex];
      if (nextId && nextId !== selectedStreamId) {
        handleSelectStream(nextId);
      }
    },
    [handleSelectStream, orderedStreamIds, selectedStreamId]
  );
  reactExports.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleKeyDown = (event) => {
      var _a3;
      if (event.defaultPrevented) {
        return;
      }
      const activeElement = document.activeElement;
      const activeTag = ((_a3 = activeElement == null ? void 0 : activeElement.tagName) == null ? void 0 : _a3.toLowerCase()) ?? "";
      const isEditable = (activeElement == null ? void 0 : activeElement.isContentEditable) || activeTag === "input" || activeTag === "textarea" || activeTag === "select";
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;
      if (isEditable && !isCtrlOrMeta) {
        return;
      }
      const attemptSelectRelativeStream = (offset) => {
        if (orderedStreamIds.length === 0) {
          return false;
        }
        selectRelativeStream(offset);
        return true;
      };
      const key = event.key;
      if (isCtrlOrMeta && !event.altKey && !event.shiftKey) {
        if (key === "ArrowUp") {
          if (attemptSelectRelativeStream(-1)) {
            event.preventDefault();
          }
          return;
        }
        if (key === "ArrowDown") {
          if (attemptSelectRelativeStream(1)) {
            event.preventDefault();
          }
          return;
        }
        const normalizedKey = key.toLowerCase();
        if (normalizedKey === ",") {
          event.preventDefault();
          setShowSettings(true);
          return;
        }
        if (normalizedKey === "f" || normalizedKey === "k") {
          if (standaloneControls == null ? void 0 : standaloneControls.openSearchDialog) {
            event.preventDefault();
            standaloneControls.openSearchDialog();
            return;
          }
        }
        if (normalizedKey === "/") {
          event.preventDefault();
          setShowKeyboardShortcuts((current) => !current);
          return;
        }
      }
      if (isCtrlOrMeta && event.altKey && !event.shiftKey) {
        if (key === "ArrowUp") {
          if (attemptSelectRelativeStream(-1)) {
            event.preventDefault();
            return;
          }
        }
        if (key === "ArrowDown") {
          if (attemptSelectRelativeStream(1)) {
            event.preventDefault();
            return;
          }
        }
      }
      if (!isCtrlOrMeta && event.altKey && !event.shiftKey) {
        if (key === "ArrowUp") {
          if (attemptSelectRelativeStream(-1)) {
            event.preventDefault();
            return;
          }
        }
        if (key === "ArrowDown") {
          if (attemptSelectRelativeStream(1)) {
            event.preventDefault();
            return;
          }
        }
      }
      if (isCtrlOrMeta && event.shiftKey && !event.altKey) {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey === "m") {
          if (standaloneControls == null ? void 0 : standaloneControls.canListenLive) {
            event.preventDefault();
            standaloneControls.onToggleLiveListening();
            return;
          }
        }
        if (normalizedKey === "a") {
          if (orderedStreamIds.length > 0) {
            event.preventDefault();
            markAllStreamsAsRead();
            return;
          }
        }
      }
      if (!isCtrlOrMeta && event.shiftKey && !event.altKey && key === "Escape") {
        if (selectedStreamId) {
          event.preventDefault();
          markStreamAsRead(selectedStreamId);
          return;
        }
      }
      if (!isCtrlOrMeta && !event.altKey && !event.shiftKey && key === "Escape" && showKeyboardShortcuts) {
        event.preventDefault();
        setShowKeyboardShortcuts(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    markAllStreamsAsRead,
    markStreamAsRead,
    orderedStreamIds,
    selectRelativeStream,
    selectedStreamId,
    setShowKeyboardShortcuts,
    setShowSettings,
    showKeyboardShortcuts,
    standaloneControls
  ]);
  const renderConversationStatusBadge = () => {
    if (!standaloneControls) {
      return null;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `transcript-stream__status transcript-stream__status--${standaloneControls.statusModifier}`.trim(),
        role: "status",
        "aria-live": "polite",
        "aria-label": standaloneControls.statusLabel,
        title: standaloneControls.statusLabel,
        children: renderStandaloneStatusIcon(standaloneControls.statusModifier)
      }
    );
  };
  const conversationActionButtons = [];
  const conversationOverflowButtons = [];
  if (standaloneControls == null ? void 0 : standaloneControls.canListenLive) {
    conversationActionButtons.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "sm",
          use: standaloneControls.isLiveListening ? "success" : "primary",
          startContent: standaloneControls.isLiveListening ? /* @__PURE__ */ jsxRuntimeExports.jsx(Pause, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Play, { size: 14 }),
          onClick: () => {
            standaloneControls.onToggleLiveListening();
          },
          tooltip: "Toggle live audio monitoring",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-panel__action-label", children: standaloneControls.isLiveListening ? "Stop listening" : "Listen live" })
        },
        "listen-live"
      )
    );
  }
  if (!isReadOnly && selectedStream && !selectedStreamIsCombined) {
    const pendingCommand = pendingStreamCommands[selectedStream.id];
    const commandPending = Boolean(pendingCommand);
    const isResetting = pendingCommand === "resetting";
    const isUpdating = pendingCommand === "updating";
    const renameButton = /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        size: "sm",
        use: "secondary",
        onClick: () => {
          var _a3, _b2, _c2;
          if (!requireEditor("edit streams")) {
            return;
          }
          const defaultName = ((_a3 = selectedStream.name) == null ? void 0 : _a3.trim()) || ((_b2 = selectedStream.url) == null ? void 0 : _b2.trim()) || selectedStream.id;
          const nextName = window.prompt(
            "Update stream name",
            defaultName
          );
          if (nextName === null) {
            return;
          }
          const trimmed = nextName.trim();
          if (trimmed.length === 0) {
            showToast({
              variant: "info",
              message: "Stream name cannot be empty."
            });
            return;
          }
          const currentName = ((_c2 = selectedStream.name) == null ? void 0 : _c2.trim()) ?? "";
          if (trimmed === currentName) {
            return;
          }
          void handleUpdateStream(selectedStream.id, { name: trimmed });
        },
        disabled: commandPending,
        startContent: isUpdating ? /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { size: "sm", variant: "light", label: "Saving stream" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { size: 14 }),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-panel__action-label", children: isUpdating ? "Saving…" : "Rename" })
      },
      "rename"
    );
    conversationOverflowButtons.push(renameButton);
    const resetDisabled = standaloneControls ? !standaloneControls.canReset : false;
    const resetButton = /* @__PURE__ */ jsxRuntimeExports.jsx(
      Button,
      {
        size: "sm",
        use: "warning",
        onClick: () => {
          if (!requireEditor("reset streams")) {
            return;
          }
          if (window.confirm(
            `Reset "${selectedStreamTitle}"? This clears transcripts and recordings.`
          )) {
            if (standaloneControls) {
              standaloneControls.onReset();
            } else {
              void handleResetStream(selectedStream.id);
            }
          }
        },
        "aria-disabled": resetDisabled || commandPending,
        disabled: resetDisabled || commandPending,
        tooltip: standaloneControls && !standaloneControls.canReset ? "No transcripts available to reset" : void 0,
        startContent: isResetting ? /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { size: "sm", variant: "light", label: "Resetting stream" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 14 }),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-panel__action-label", children: isResetting ? "Resetting…" : "Reset" })
      },
      "reset"
    );
    conversationOverflowButtons.push(resetButton);
  }
  const conversationActionButtonGroup = conversationActionButtons.length > 0 || conversationOverflowButtons.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    ButtonGroup,
    {
      size: "sm",
      "aria-label": "Stream controls",
      overflowButtons: conversationOverflowButtons,
      children: conversationActionButtons
    }
  ) : null;
  const conversationToolButtons = (standaloneControls == null ? void 0 : standaloneControls.toolButtons) ?? null;
  const hasConversationControls = Boolean(standaloneControls) || conversationActionButtons.length > 0 || conversationOverflowButtons.length > 0 || Boolean(conversationToolButtons);
  const loginOverlay = loginVisible ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75",
      style: { zIndex: 1080 },
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Sign in to unlock editing features",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card shadow-lg w-100", style: { maxWidth: "400px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-body d-flex flex-column gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "h5 mb-2", children: "Unlock editing" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-body-secondary small mb-0", children: requiresPassword ? "Enter the shared password to add streams or control transcriptions." : "Authenticate to add streams or control transcriptions." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "form",
          {
            onSubmit: handleLoginSubmit,
            className: "d-flex flex-column gap-3",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "auth-password",
                    className: "form-label text-uppercase small fw-semibold text-body-secondary",
                    children: "Password"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "auth-password",
                    type: "password",
                    className: "form-control",
                    value: loginPassword,
                    onChange: handleLoginPasswordChange,
                    disabled: loggingIn,
                    required: true,
                    autoFocus: true
                  }
                )
              ] }),
              loginError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "alert alert-danger py-2 px-3 small mb-0",
                  role: "alert",
                  children: loginError
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex justify-content-end gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "button",
                    use: "secondary",
                    appearance: "outline",
                    size: "sm",
                    onClick: handleCancelLogin,
                    disabled: loggingIn,
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    type: "submit",
                    use: "primary",
                    size: "sm",
                    disabled: loggingIn || loginPassword.trim().length === 0,
                    startContent: loggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { size: "sm", variant: "light", label: "Signing in" }) : void 0,
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: loggingIn ? "Signing in…" : "Sign in" })
                  }
                )
              ] })
            ]
          }
        )
      ] }) })
    }
  ) : null;
  const isInitializing = !streamsInitialized || !combinedViewsFetched;
  if (isInitializing) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-shell bg-body-secondary d-flex align-items-center justify-content-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center text-body-secondary", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { size: 32, className: "animate-spin mb-3" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading…" })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    loginOverlay,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-shell bg-body-secondary", children: [
      isMobileViewport ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        AppHeader,
        {
          isMobileViewport,
          isMobileSidebarOpen,
          onOpenMobileSidebar: openMobileSidebar,
          transcriptCorrectionEnabled,
          onTranscriptCorrectionToggle: handleTranscriptCorrectionToggle,
          onOpenSettings: () => setShowSettings(true),
          settingsTriggerRef,
          showSettings,
          isReadOnly,
          streamsLoading: showAuthLoading,
          onRequestLogin: requestLogin,
          onLogout: logout
        }
      ) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsx(LiveAudioBanner, {}),
      wsError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "connection-status-banner", role: "alert", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "connection-status-banner__content", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: 16, className: "connection-status-banner__icon" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "connection-status-banner__message", children: wsError }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "sm",
            use: "primary",
            onClick: wsReconnect,
            className: "connection-status-banner__action",
            children: "Reconnect now"
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        SettingsModal,
        {
          open: showSettings,
          onClose: closeSettings,
          closeButtonRef: settingsCloseButtonRef,
          streams,
          activeStreams,
          totalTranscriptions,
          wsConnected,
          themeMode,
          onThemeModeChange: handleThemeModeChange,
          colorCodingEnabled,
          onColorCodingToggle: handleColorCodingToggle,
          transcriptCorrectionEnabled,
          reviewStatusOptions: REVIEW_STATUS_OPTIONS,
          exportStatuses,
          onExportStatusToggle: handleExportStatusToggle,
          exporting,
          onExportTranscriptions: handleExportTranscriptions,
          pagerStreams,
          selectedPagerStreamId,
          onSelectPagerStream: selectPagerExportStream,
          pagerExporting: exportingPagerFeed,
          pagerExportError,
          onExportPagerFeed: exportPagerFeed,
          isReadOnly,
          onRequestLogin: requestLogin,
          onOpenBackendLogs: () => setShowBackendLogs(true)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        KeyboardShortcutsDialog,
        {
          open: showKeyboardShortcuts,
          onClose: () => setShowKeyboardShortcuts(false)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        BackendLogsPanel,
        {
          open: showBackendLogs,
          onClose: () => setShowBackendLogs(false),
          authFetch
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: "app-main", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-layout app-container", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          StreamSidebar,
          {
            isReadOnly,
            onRequestLogin: requestLogin,
            onLogout: logout,
            items: streamSidebarItems,
            loading: sidebarLoading,
            onSelectStream: handleSelectStream,
            isMobileViewport,
            isMobileSidebarOpen,
            onCloseMobileSidebar: closeMobileSidebar,
            sortMode: streamSortMode,
            onSortModeChange: handleStreamSortModeChange,
            onOpenSettings: () => setShowSettings(true),
            settingsTriggerRef,
            showSettings
          }
        ),
        isMobileViewport && isMobileSidebarOpen ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            use: "unstyled",
            className: "stream-sidebar-backdrop d-lg-none",
            onClick: closeMobileSidebar,
            "aria-label": "Close stream menu"
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "conversation-panel", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__content", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__header", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__header-main", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__title", children: selectedStream ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "h5 mb-1", children: selectedStreamTitle }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__meta small text-body-secondary", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  StreamStatusIndicator,
                  {
                    stream: selectedStream,
                    showText: true,
                    textClassName: "text-capitalize"
                  }
                ),
                selectedStreamIsCombined ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1", children: "·" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Combined view" })
                ] }) : selectedStreamIsPager ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1", children: "·" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Pager feed" }),
                  selectedStreamWebhookPath && /* @__PURE__ */ jsxRuntimeExports.jsxs(InlineText, { marginStart: 2, gap: 1, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Webhook" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "code",
                      {
                        className: "conversation-panel__meta-code",
                        title: selectedStreamWebhookUrl ?? void 0,
                        children: selectedStreamWebhookPath
                      }
                    )
                  ] })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1", children: "·" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: selectedStream.url,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "link-underline-opacity-0",
                      children: "Open stream"
                    }
                  )
                ] }),
                selectedStreamIsCombined && combinedMemberList ? /* @__PURE__ */ jsxRuntimeExports.jsxs(InlineText, { marginStart: 2, gap: 1, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Includes" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: combinedMemberList })
                ] }) : null,
                selectedStreamIsCombined && selectedCombinedMissing.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(InlineText, { marginStart: 2, className: "text-danger", gap: 1, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { size: 14 }),
                  "Missing ",
                  selectedCombinedMissing.join(", ")
                ] }) : null,
                selectedStreamLatestTimestamp ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "ms-1", children: [
                  "· Last activity ",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Timestamp,
                    {
                      value: selectedStreamLatestTimestamp,
                      mode: "datetime"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TimeInterval,
                    {
                      value: selectedStreamLatestTimestamp,
                      condensed: true,
                      className: "ms-1"
                    }
                  )
                ] }) : null
              ] }),
              selectedStreamIsCombined && (selectedCombinedView == null ? void 0 : selectedCombinedView.description) ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "small text-body-secondary mb-0 mt-1", children: selectedCombinedView.description }) : null
            ] }) : loading || !streamsInitialized ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center gap-2 text-body-secondary", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { size: 18, className: "animate-spin" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Loading streams…" })
            ] }) : sortedConversations.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "h5 mb-1", children: "No streams available" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "small text-body-secondary", children: isReadOnly ? "Sign in to add streams and start monitoring conversations." : "Add a stream from the sidebar to start monitoring conversations." }),
              isReadOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  use: "primary",
                  className: "mt-2",
                  startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(LogIn, { size: 14 }),
                  onClick: requestLogin,
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Sign in" })
                }
              ) : null,
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  use: "primary",
                  appearance: "outline",
                  className: "d-lg-none mt-2",
                  "aria-controls": "app-stream-sidebar",
                  "aria-expanded": isMobileSidebarOpen,
                  onClick: openMobileSidebar,
                  startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { size: 14 }),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open stream menu" })
                }
              )
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "h5 mb-1", children: "Select a stream" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "small text-body-secondary", children: "Choose a stream from the left to open its conversation." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "sm",
                  use: "primary",
                  appearance: "outline",
                  className: "d-lg-none mt-2",
                  "aria-controls": "app-stream-sidebar",
                  "aria-expanded": isMobileSidebarOpen,
                  onClick: openMobileSidebar,
                  startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { size: 14 }),
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open stream menu" })
                }
              )
            ] }) }),
            selectedStream && hasConversationControls ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: `conversation-panel__actions${isMobileViewport ? " conversation-panel__actions--mobile" : ""}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__primary-actions", children: [
                    renderConversationStatusBadge(),
                    conversationActionButtonGroup
                  ] }),
                  conversationToolButtons ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__tool-buttons", children: conversationToolButtons }) : null
                ]
              }
            ) : null
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-panel__alerts", children: [
            selectedStream && selectedStreamIsPager && selectedStreamWebhookPath && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "alert alert-info", role: "status", children: [
              "Send pager updates by POSTing JSON with a",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "message" }),
              " field to",
              /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "ms-1", children: selectedStreamWebhookPath }),
              "."
            ] }),
            keywordAlerts.map((alert) => {
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  className: "alert alert-danger keyword-alert",
                  role: "alert",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alert__content", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alert__header", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          AlertTriangle,
                          {
                            size: 18,
                            className: "keyword-alert__icon"
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alert__title", children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "keyword-alert__label", children: alert.label }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alert__meta", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "keyword-alert__stream", children: alert.streamName }),
                            alert.timestamp ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Timestamp,
                              {
                                value: alert.timestamp,
                                className: "keyword-alert__time"
                              }
                            ) : null
                          ] })
                        ] })
                      ] }),
                      alert.matchedPhrases.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "keyword-alert__phrases", children: [
                        "Matched: ",
                        alert.matchedPhrases.join(", ")
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "keyword-alert__excerpt", children: alert.text })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        use: "close",
                        className: "keyword-alert__dismiss",
                        "aria-label": "Dismiss keyword alert",
                        onClick: () => handleDismissAlert(alert.id)
                      }
                    )
                  ]
                },
                alert.id
              );
            }),
            error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "alert alert-danger", role: "alert", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold mb-1", children: "Error" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: error })
            ] }),
            combinedViewsErrorMessage && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "alert alert-warning", role: "alert", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold mb-1", children: "Unable to load combined views" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: combinedViewsErrorMessage })
            ] }),
            transcriptCorrectionEnabled && exportError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "alert alert-warning", role: "alert", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold mb-1", children: "Export error" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: exportError })
            ] }),
            pagerExportError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "alert alert-warning", role: "alert", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fw-semibold mb-1", children: "Pager export error" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: pagerExportError })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__body", children: selectedStream ? selectedStreamIsCombined ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            CombinedTranscriptionLog,
            {
              streams: selectedCombinedMembers,
              loading: sidebarLoading,
              limit: STREAM_TRANSCRIPTION_PREVIEW_LIMIT
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            StreamTranscriptionPanel,
            {
              streams: streams ?? [],
              onResetStream: handleResetStream,
              onReviewTranscription: reviewTranscription,
              focusStreamId: selectedStream.id,
              onStandaloneControlsChange: setStandaloneControls,
              pagerExporting: exportingPagerFeed,
              onExportPagerFeed: exportPagerFeed,
              onSelectPagerExportStream: selectPagerExportStream
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-panel__placeholder text-body-secondary text-center", children: loading || !streamsInitialized ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "d-flex align-items-center justify-content-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Loader2, { size: 18, className: "animate-spin" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Loading streams…" })
          ] }) : sortedConversations.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "fw-semibold mb-1", children: "No streams available" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-0", children: "Add a stream to begin monitoring conversations." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 d-lg-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "primary",
                appearance: "outline",
                "aria-controls": "app-stream-sidebar",
                "aria-expanded": isMobileSidebarOpen,
                onClick: openMobileSidebar,
                startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { size: 14 }),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open stream menu" })
              }
            ) })
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "fw-semibold mb-1", children: "No stream selected" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-0", children: "Choose a stream from the left to begin reviewing transcripts." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-3 d-lg-none", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                use: "primary",
                appearance: "outline",
                "aria-controls": "app-stream-sidebar",
                "aria-expanded": isMobileSidebarOpen,
                onClick: openMobileSidebar,
                startContent: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { size: 14 }),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open stream menu" })
              }
            ) })
          ] }) }) })
        ] }) })
      ] }) }),
      (_a2 = standaloneControls == null ? void 0 : standaloneControls.dialogs) == null ? void 0 : _a2.map((dialog) => dialog)
    ] })
  ] });
}
const index = "";
const API_BASE = "/api";
const LOG_ENDPOINT = `${API_BASE}/logs/frontend`;
const CONFIG_ENDPOINT = `${API_BASE}/logging-config`;
const METHODS = ["log", "info", "warn", "error", "debug"];
const formatArg = (value) => {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value === null || value === void 0) {
    return String(value);
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
    }
  }
  return String(value);
};
const sendEntry = (entry) => {
  const body = JSON.stringify(entry);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(LOG_ENDPOINT, blob)) {
        return;
      }
    } catch {
    }
  }
  if (typeof fetch === "function") {
    void fetch(LOG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body,
      keepalive: true
    }).catch(() => {
    });
  }
};
const setupConsoleLogging = () => {
  if (typeof window === "undefined") {
    return;
  }
  const globalScope = window;
  if (globalScope.__WAVECAP_CONSOLE_LOGGING__) {
    return;
  }
  globalScope.__WAVECAP_CONSOLE_LOGGING__ = true;
  const originals = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  };
  let loggingEnabled = null;
  const pending = [];
  const flushQueue = () => {
    if (loggingEnabled) {
      while (pending.length > 0) {
        const entry = pending.shift();
        if (entry) {
          sendEntry(entry);
        }
      }
    } else {
      pending.length = 0;
    }
  };
  const enqueueEntry = (method, args) => {
    const entry = {
      level: method,
      messages: args.map(formatArg),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (loggingEnabled === null) {
      pending.push(entry);
    } else if (loggingEnabled) {
      sendEntry(entry);
    }
  };
  METHODS.forEach((method) => {
    console[method] = (...args) => {
      originals[method](...args);
      enqueueEntry(method, args);
    };
  });
  const finalizeConfig = (enabled) => {
    loggingEnabled = enabled;
    flushQueue();
  };
  if (typeof fetch !== "function") {
    finalizeConfig(true);
    return;
  }
  fetch(CONFIG_ENDPOINT).then((response) => response.ok ? response.json() : null).then((data) => {
    var _a2;
    if ((data == null ? void 0 : data.enabled) === false) {
      finalizeConfig(false);
      return;
    }
    if (((_a2 = data == null ? void 0 : data.frontend) == null ? void 0 : _a2.enabled) === false) {
      finalizeConfig(false);
      return;
    }
    finalizeConfig(true);
  }).catch(() => {
    finalizeConfig(true);
  });
};
const ToastViewport$1 = "";
const VARIANT_CONFIG = {
  success: {
    title: "Success",
    role: "status",
    ariaLive: "polite",
    Icon: CheckCircle2
  },
  error: {
    title: "Action needed",
    role: "alert",
    ariaLive: "assertive",
    Icon: XCircle
  },
  info: { title: "Notice", role: "status", ariaLive: "polite", Icon: Info }
};
const ToastViewport = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "toast-viewport", role: "presentation", children: toasts.map((toast) => {
    const config = VARIANT_CONFIG[toast.variant];
    const TitleIcon = config.Icon;
    const title = toast.title ?? config.title;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: `app-toast app-toast--${toast.variant}`,
        role: config.role,
        "aria-live": config.ariaLive,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-toast__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TitleIcon, { size: 18 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-toast__content", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-toast__header", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "app-toast__title", children: title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  use: "unstyled",
                  className: "app-toast__close",
                  onClick: () => onDismiss(toast.id),
                  "aria-label": "Dismiss notification",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 16 })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "app-toast__message", children: toast.message })
          ] })
        ]
      },
      toast.id
    );
  }) });
};
const DEFAULT_TOAST_DURATION = 5e3;
const createToastId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = reactExports.useState([]);
  const removalTimersRef = reactExports.useRef({});
  const clearRemovalTimer = reactExports.useCallback((id2) => {
    const timeoutId = removalTimersRef.current[id2];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete removalTimersRef.current[id2];
    }
  }, []);
  const dismissToast = reactExports.useCallback(
    (id2) => {
      clearRemovalTimer(id2);
      setToasts((current) => current.filter((toast) => toast.id !== id2));
    },
    [clearRemovalTimer]
  );
  const showToast = reactExports.useCallback(
    ({
      message,
      title,
      variant = "info",
      duration = DEFAULT_TOAST_DURATION,
      id: id2
    }) => {
      const toastId = id2 ?? createToastId();
      setToasts((current) => {
        const withoutExisting = current.filter((toast) => toast.id !== toastId);
        return [...withoutExisting, { id: toastId, message, title, variant }];
      });
      if (duration > 0) {
        const timeoutId = window.setTimeout(() => {
          clearRemovalTimer(toastId);
          setToasts(
            (current) => current.filter((toast) => toast.id !== toastId)
          );
        }, duration);
        removalTimersRef.current[toastId] = timeoutId;
      }
      return toastId;
    },
    [clearRemovalTimer]
  );
  const contextValue = reactExports.useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast]
  );
  reactExports.useEffect(() => {
    var _a2;
    if (typeof window === "undefined") {
      return void 0;
    }
    const isDevelopment = typeof process !== "undefined" && ((_a2 = process.env) == null ? void 0 : _a2.NODE_ENV) !== "production";
    if (!isDevelopment) {
      return void 0;
    }
    const globalWithToast = window;
    globalWithToast.__smartSpeakerShowToast = showToast;
    return () => {
      if (globalWithToast.__smartSpeakerShowToast === showToast) {
        delete globalWithToast.__smartSpeakerShowToast;
      }
    };
  }, [showToast]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(ToastContext.Provider, { value: contextValue, children: [
    children,
    /* @__PURE__ */ jsxRuntimeExports.jsx(ToastViewport, { toasts, onDismiss: dismissToast })
  ] });
};
setupConsoleLogging();
const queryClient = new QueryClient();
client.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(React.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxRuntimeExports.jsx(AuthProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(UISettingsProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ToastProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(LiveAudioProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) }) }) }) }) }) }) })
);
//# sourceMappingURL=index-24b6d245.js.map
