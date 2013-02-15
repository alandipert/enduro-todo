(function( window ) {
  'use strict';

  // Functional utilities

  function id(_) { return _; }

  function partial() {
    var f = arguments[0];
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
      return f.apply(f, args.concat(Array.prototype.slice.call(arguments, 0)));
    };
  }

  function every(pred, xs) {
    return filter(pred, xs).length == xs.length;
  }

  // Misc. utilites

  function mk(name, attrs) {
    var elem = document.createElement(name);
    for(var k in attrs) { if(attrs[k]) elem[k] = attrs[k]; }
    return elem;
  }

  function appendChildren(parent, children) {
    forEach(function(child) { parent.appendChild(child); }, children);
  }

  function endsWith(s, ending) {
    return s.split('').slice(-ending.length).join('') == ending;
  };

  // General EventStreams

  function returnPressE(element) {
    var isReturn = function(k) { return k.which == 13; };
    return filterE($E(element, 'keydown'), isReturn);
  }

  function blurE(formElement) {
    return $E(formElement, 'blur');
  }

  function keepE(f, E) { return filterE(mapE(f, E), id); }

  var sentinel = new Object();

  function nextToLastE(E, endSentinel) {
    var r = receiverE();
    var nextToLast;
    E.mapE(function (evt) {
      if(evt == endSentinel) {
        r.sendEvent(nextToLast);
      } else {
        nextToLast = evt;
      }
    });
    return r;
  }

  // Remote Storage

  function ajax(url, method, todo, resultE) {
    $.ajax({
      url: url,
      type: method,
      data: {todo: JSON.stringify(todo)},
      success: function(data) {
        resultE.sendEvent(data);
      }
    });
  }

  // HACK
  var keepPolling = true;

  function ajaxPollE(url) {
    var pollResultsE = receiverE();
    var pollE = timerE(500).mapE(function() {
      if(keepPolling) {         // HACK
        ajax(url, 'GET', {}, pollResultsE);
      }
    });
    return filterRepeatsE(pollResultsE);
  }

  function RemoteStore(url, init) {
    this.url = url;
    this.E = receiverE();
    this.B = startsWith(mergeE(this.E, ajaxPollE(url)), init);
  }

  RemoteStore.prototype.update = function(todo) {
    ajax(this.url, 'PUT', todo, this.E);
  };

  RemoteStore.prototype.delete = function(todo) {
    ajax(this.url, 'DELETE', todo, this.E);
  };

  RemoteStore.prototype.create = function(todo) {
    ajax(this.url, 'POST', todo, this.E);
  };

  // Inserting, updating, and deleting todos

  function insertTodo(store, title) {
    store.create({completed: false, title: title});
  }

  function idMatches(id) {
    return function(todo) {
      return id == todo.id;
    }
  }

  function updateTodosWhere(store, pred, f) {
    forEach(function(t) {
      if(pred(t)) {
        store.update(f(t));
      }
    }, valueNow(store.B));
  }

  function rmTodosWhere(store, pred) {
    forEach(function(t) {
      if(pred(t)) {
        store.delete(t);
      }
    }, valueNow(store.B));
  }

  // Inputing todos

  function extractTitleE(inputId, doneE) {
    var trim = function(s) { return s.trim(); }
    var clear = function(_) { getObj(inputId).value = ""; return _; }
    return keepE(function(t) {
      return clear(trim(t));
    }, extractValueOnEventE(doneE, inputId));
  }

  // Rendering todos

  function renderTodo(store, todo) {
    var li      = mk('li',     { className:todo.completed?'completed':'' });
    var toggle  = mk('input',  { className:'toggle',
                                 type:'checkbox',
                                 checked:todo.completed });
    var destroy = mk('button', { className:'destroy' });
    var view    = mk('div',    { className:'view' });
    var label   = mk('label',  { innerHTML:todo.title });
    var edit    = mk('input',  { className:'edit',
                                 value: todo.title});

    appendChildren(view, [toggle, label, destroy]);
    appendChildren(li, [view, edit]);

    clicksE(destroy).mapE(function() {
      rmTodosWhere(store, idMatches(todo.id));
    });

    clicksE(toggle).mapE(function() {
      updateTodosWhere(store,
                       idMatches(todo.id),
                       function(t) { t.completed = !t.completed; return t; });
    });

    var startEditEe = extractEventE(label, 'dblclick').mapE(function() {
      keepPolling = false;      // HACK
      li.className = 'editing';
      edit.focus();
      return extractValueE(edit);
    });

    var stopEditEe = mergeE(returnPressE(edit), blurE(edit)).mapE(function() {
      keepPolling = true;       // HACK
      li.className = todo.completed ? 'completed' : '';
      return oneE(sentinel);
    });

    nextToLastE(switchE(mergeE(startEditEe, stopEditEe)), sentinel)
      .filterE(id)
      .mapE(function (newTitle) {
        updateTodosWhere(store,
                         idMatches(todo.id),
                         function(t) { t.title = newTitle; return t;});
      });

    return li;
  }

  function renderTodos(targetId, pred, store, todos) {
    var list = getObj(targetId);
    list.innerHTML = '';
    forEach(function(todo) {
      list.appendChild(renderTodo(store, todo));
    }, filter(pred, todos));
  }

  // Counting todos

  function remainingText(arr) {
    var n = filter(function(t) { return !t.completed; }, arr).length;
    return '<strong>' + n + '</strong> ' + (n == 1 ? 'item' : 'items') + ' left';
  }

  function completedText(arr) {
    var n = filter(function(t) { return t.completed; }, arr).length;
    return 'Clear completed (' + n + ')';
  }

  // Routing

  function routeB(defaultRoute) {
    var hashE  = timerE(50).mapE(function() { return window.location.hash; });
    var routeE = hashE.mapE(function(h) { return h ? h.slice(1) : defaultRoute });
    return startsWith(filterRepeatsE(routeE), defaultRoute);
  }

  function insertLinkEmphasisB(routeB) {
    var toggleLinks = function(route) {
      forEach(function(elem) {
        elem.className = endsWith(elem.href, route) ? "selected" : "";
      }, filter(function(elem) {
        return elem.href.indexOf('#') >= 0;
      }, document.getElementsByTagName('a')));
    };
    return liftB(toggleLinks, routeB);
  }

  function todoFilterB(routingTable, routeB) {
    var selectFilter = function(r) { return routingTable[r]; };
    return liftB(selectFilter, routeB);
  }

  // Setup and initialization

  var routes = {
    '/'          : id,
    '/active'    : function(t) { return !t.completed; },
    '/completed' : function(t) { return t.completed; }
  };

  var store         = new RemoteStore('/apiv1/todos', []);
  var currentRoute  = routeB('/');

  var numRemaining = liftB(function(arr) {
    return filter(function(t) { return !t.completed; }, arr).length;
  }, store.B);

  var numCompleted = liftB(function(arr, remaining) {
    return arr.length - remaining;
  }, store.B, numRemaining);

  var numTotal = liftB(function(x, y) { return x + y; }, numRemaining, numCompleted);

  var displayAttr   = liftB(function(n) { return n == 0 ? 'none' : '';}, numTotal);
  var completedAttr = liftB(function(n) { return n == 0 ? 'none' : '';}, numCompleted);

  insertValueB(displayAttr, 'main', 'style', 'display');
  insertValueB(displayAttr, 'footer', 'style', 'display');
  insertValueB(completedAttr, 'clear-completed', 'style', 'display');

  insertValueB(liftB(remainingText, store.B), 'todo-count', 'innerHTML');
  insertValueB(liftB(completedText, store.B), 'clear-completed', 'innerHTML');
  insertValueB(liftB(partial(every, function(t) { return t.completed; }), store.B), 'toggle-all', 'checked');

  snapshotE(clicksE('toggle-all'), numCompleted).mapE(function(n) {
    updateTodosWhere(store, id, function(t) {
      t.completed = (n == 0);
      return t;
    });
  });

  insertLinkEmphasisB(currentRoute);

  extractTitleE('new-todo', returnPressE('new-todo')).mapE(partial(insertTodo, store));

  clicksE('clear-completed').mapE(function () {
    rmTodosWhere(store, function(t) { return t.completed; });
  });

  liftB(renderTodos,
        constantB('todo-list'),
        todoFilterB(routes, currentRoute),
        constantB(store),
        store.B);

})( window );
