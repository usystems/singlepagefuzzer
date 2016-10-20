# A Fast Fuzzer for Single Page Webapps

Single Page Fuzzer is a fast Fuzzer for single page webapps, including hybrind mobileapps. 

##How does it work

The fuzzer selects a random dom element on your screen and dispatches an event from the passed event distribution to the
selected dom element. To make debugging easyer, if a event invokes a javascript action, the fuzzer wait until it's
finished until it dispatches the next event.

##How to use

The easyest way to start fuzzer, just run your configuration sniplet in the developer tools of your webbrowser. To catch
potential errors you should turn on the switch catch all exceptions in the script panel.

###Example Configuration for http://todomvc.com

Here an example you can run on http://todomvc.com:

```javascript
(function(el){
    el.src='https://cdn.rawgit.com/usystems/singlepagefuzzer/' +
        'master/src/singlepagefuzzer.js';
    el.onload=function(){
        SinglePageFuzzer.start({
            selectFilter: function(x, y, el) {
                while (el !== null) {
                    if (el.nodeName == 'SECTION') return true;
                    else el = el.parentElement;
                }
                return false;
            },
            eventDistribution: [
                SinglePageFuzzer.createEventProbability(0.5, [SinglePageFuzzer.createClick()]),
                SinglePageFuzzer.createEventProbability(0.1, [SinglePageFuzzer.createDblclick()]),
                SinglePageFuzzer.createEventProbability(0.2, [
                    SinglePageFuzzer.createInput(),
                    SinglePageFuzzer.createSubmit()
                ]),
                SinglePageFuzzer.createEventProbability(0.2, [
                    SinglePageFuzzer.createKeydown(SinglePageFuzzer.ENTER),
                    SinglePageFuzzer.createKeypress(SinglePageFuzzer.ENTER),
                    SinglePageFuzzer.createKeyup(SinglePageFuzzer.ENTER)
                ])
            ],
            request: {
                lag: 1000,
                dropRequest: 0.1,
                dropResponse: 0.1,
                offline: 10000,
                online: 5000
            }
        });
        setTimeout(function() { SinglePageFuzzer.stop() }, 5000)
    };
    document.head.appendChild(el);
})(document.createElement('script'));
```

####Skeleton

We can use a trick to dynamically load the fuzzer code directly from github by creating a script element. The fuzzer 
is started when the code is ready.

```javascript
(function(el){
    el.src='https://cdn.rawgit.com/usystems/singlepagefuzzer/' +
        'master/src/singlepagefuzzer.js';
    el.onload=function(){
        SinglePageFuzzer.start({
			// configuration
        });
    };
    document.head.appendChild(el);
})(document.createElement('script'));
```

####Element filter

Normally, there exist elements the fuzzer should not dispatch events on all elements, e.g elments with links to other
pages, which would stop the fuzzer. In the example below e only allow elements which are descendants of the section tag.

```javascript
selectFilter: function(x, y, el) {
	while (el !== null) {
		if (el.nodeName == 'SECTION') 
			return true;
		else 
			el = el.parentElement;
	}
	return false;
}
```

####Events

In the event distribution we can specify which events should be run on the selected dom element. The example below
rans a click with 50% probatility, a doubleclick with 1% probability and so on. If several events are passed, several
events are dispatcht to the selected element. E.g in modenr mvc frameworks an input event is needet on <input> events
to update the model. So we can run an input event before the submit to make sure the model is updated when dispatching
the input event.

```javascript
eventDistribution: [
	SinglePageFuzzer.createEventProbability(0.5, [SinglePageFuzzer.createClick()]),
	SinglePageFuzzer.createEventProbability(0.1, [SinglePageFuzzer.createDblclick()]),
	SinglePageFuzzer.createEventProbability(0.2, [
		SinglePageFuzzer.createInput(),
		SinglePageFuzzer.createSubmit()
	]),
	SinglePageFuzzer.createEventProbability(0.2, [
		SinglePageFuzzer.createKeydown(SinglePageFuzzer.ENTER),
		SinglePageFuzzer.createKeypress(SinglePageFuzzer.ENTER),
		SinglePageFuzzer.createKeyup(SinglePageFuzzer.ENTER)
	])
]
```

At the moment the follwoing events are supported:

  * click: SinglePageFuzzer.createdlick()
  * dblclick: SinglePageFuzzer.createdblclick()
  * submit: SinglePageFuzzer.createSubmit()
  * input: SinglePageFuzzer.createInput()
  * keydown: SinglePageFuzzer.createKeydown(keycode)
  * keypress: SinglePageFuzzer.createKeypress(keycode)
  * keyup: SinglePageFuzzer.createKeyup(keycode)
  * touchstart: SinglePageFuzzer.createTouchstart()
  * touchend: SinglePageFuzzer.createTouchend()
  * touchmove: SinglePageFuzzer.createTouchmove()
  * touchcancel: SinglePageFuzzer.createTouchcancel()
  * mouseenter: SinglePageFuzzer.createMouseenter()
  * mouseover: SinglePageFuzzer.createMouseover()
  * mousemove: SinglePageFuzzer.createMousemove()
  * mousedown: SinglePageFuzzer.createMousedown()
  * mouseup: SinglePageFuzzer.createMouseup()
  * mouseleave: SinglePageFuzzer.createMouseleave()
  * mouseout: SinglePageFuzzer.createMouseout()

A key code can be passed to the keyboard events. The following keycodes exits:

  * SinglePageFuzzer.BACKSPACE = 8
  * SinglePageFuzzer.TAB = 9
  * SinglePageFuzzer.ENTER = 13
  * SinglePageFuzzer.SHIFT = 16
  * SinglePageFuzzer.CTRL = 17
  * SinglePageFuzzer.ALT = 18
  * SinglePageFuzzer.CAPSLOCK = 20
  * SinglePageFuzzer.ESC = 27
  * SinglePageFuzzer.SPACE = 32
  * SinglePageFuzzer.PAGEUP = 33
  * SinglePageFuzzer.PAGEDOWN = 34
  * SinglePageFuzzer.END = 35
  * SinglePageFuzzer.HOME = 36
  * SinglePageFuzzer.LEFT = 37
  * SinglePageFuzzer.UP = 38
  * SinglePageFuzzer.RIGHT = 39
  * SinglePageFuzzer.DOWN = 40
  * SinglePageFuzzer.INSERT = 45
  * SinglePageFuzzer.DELETE = 46

####Request

The fuzzer can modify the ajax requests sent to the server:

```javascript
request: {
    lag: 1000, // lag introduced to every request in seconds
    dropRequest: 0.1, // fraction of requests to drop
    dropResponse: 0.1, // fraction of responses to drop
    offline: 10000, // after how many seconds the client should go offline
    online: 5000 // after how many seconds the client should go online
}
```

###Example Configuration for Angular-Touch

For Angular-Touch there are two specific points to concider:

  * Angular has a digest cycle, with ```timeout: angular.$timeout``` we use the $timeout instad of ```setTimeout``` in 
    the fuzzer.
  * Normally browsers wait for 300 ms after a click to make sure the user dispatched a click and not a double click.
    Angular-Touch implement its own click handler by capturing the mouse events. We can adapt to this and also
    dispatch mosue events instead of a click event.

```javascript
(function(el){
    el.src='https://cdn.rawgit.com/usystems/singlepagefuzzer/' +
        'master/src/singlepagefuzzer.js';
    el.onload=function(){
        SinglePageFuzzer.start({
            eventDistribution: [
                SinglePageFuzzer.createEventProbability(1, [
                    SinglePageFuzzer.createMousedown(),
                    SinglePageFuzzer.createMousemove(),
                    SinglePageFuzzer.createMouseup()
                ])
            ],
            timeout: angular.$timeout
        });
    };
    document.head.appendChild(el);
})(document.createElement('script'));
```

##How to stop

To top the fuzzer, run the following code in the developer tools of your webbrowser:

```javascript
setTimeout(function() { SinglePageFuzzer.stop() }, 5000)
```

##Supported Browser
Current versions fo the following browsers are supported

  * Chrome
  * Firefox
  * Safari
  * Edge




