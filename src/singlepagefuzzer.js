/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */
var SinglePageFuzzer;
(function (SinglePageFuzzer) {
    'use strict';
    /**
     * Human readable key codes
     */
    SinglePageFuzzer.BACKSPACE = 8;
    SinglePageFuzzer.TAB = 9;
    SinglePageFuzzer.ENTER = 13;
    SinglePageFuzzer.SHIFT = 16;
    SinglePageFuzzer.CTRL = 17;
    SinglePageFuzzer.ALT = 18;
    SinglePageFuzzer.CAPSLOCK = 20;
    SinglePageFuzzer.ESC = 27;
    SinglePageFuzzer.SPACE = 32;
    SinglePageFuzzer.PAGEUP = 33;
    SinglePageFuzzer.PAGEDOWN = 34;
    SinglePageFuzzer.END = 35;
    SinglePageFuzzer.HOME = 36;
    SinglePageFuzzer.LEFT = 37;
    SinglePageFuzzer.UP = 38;
    SinglePageFuzzer.RIGHT = 39;
    SinglePageFuzzer.DOWN = 40;
    SinglePageFuzzer.INSERT = 45;
    SinglePageFuzzer.DELETE = 46;
    /**
     * Create an event probability.
     * @param {number} probability probability the event list occures with
     * @param {IEvent[]} events a list of events to dispatch
     * @return {IEventProbability} click event
     */
    function createEventProbability(probability, events) {
        return { probability: probability, events: events };
    }
    SinglePageFuzzer.createEventProbability = createEventProbability;
    /**
     * Create a submit event for the eventDistribution. A submit can only be dispatched on a from element, so if
     * this.form is a HTMLFormElement, the submit event is dispatched on this.form else its dispatched on the
     * element itself.
     * @return {IEvent} submit event
     */
    function createSubmit() {
        return { name: 'submit', type: 'HTMLEvents' };
    }
    SinglePageFuzzer.createSubmit = createSubmit;
    /**
     * Create a input event for the eventDistribution
     * @return {IEvent} input event
     */
    function createInput() {
        return { name: 'input', type: 'HTMLEvents' };
    }
    SinglePageFuzzer.createInput = createInput;
    /**
     * Create a focus event for the eventDistribution
     * @return {IEvent} focus event
     */
    function createFocus() {
        return { name: 'focus', type: 'HTMLEvents' };
    }
    SinglePageFuzzer.createFocus = createFocus;
    /**
     * Create a change event for the eventDistribution
     * @return {IEvent} change event
     */
    function createChange() {
        return { name: 'change', type: 'HTMLEvents' };
    }
    SinglePageFuzzer.createChange = createChange;
    /**
     * Create a Blur event for the eventDistribution
     * @return {IEvent} Blur event
     */
    function createBlur() {
        return { name: 'blur', type: 'HTMLEvents' };
    }
    SinglePageFuzzer.createBlur = createBlur;
    /**
     * Create a keydown event for the eventDistribution
     * @param {number|number[]|()=>number} keyCodes key code the event ist called with. The following types can be
     * passed
     * 	- number: the event will always have the passed number as key code
     * 	- number[]: each time a number is coosen uniformly from the list of key codes
     * 	- ()=>number: a function which is called for every event and return a keycode
     * @return {IEvent} keydown event
     */
    function createKeydown(keyCodes) {
        if (typeof keyCodes === 'number') {
            return { name: 'keydown', type: 'Events', keyCode: function () { return keyCodes; } };
        }
        else if (Array.isArray(keyCodes)) {
            return {
                name: 'keydown',
                type: 'Events',
                keyCode: function () { return keyCodes[Math.floor(Math.random() * keyCodes.length)]; }
            };
        }
        else if (typeof keyCodes === 'function') {
            return { name: 'keydown', type: 'Events', keyCode: keyCodes };
        }
        else {
            return { name: 'keydown', type: 'Events' };
        }
    }
    SinglePageFuzzer.createKeydown = createKeydown;
    /**
     * Create a keypress event for the eventDistribution
     * @param {number|number[]|()=>number} keyCodes key code the event ist called with. The following types can be
     * passed
     * 	- number: the event will always have the passed number as key code
     * 	- number[]: each time a number is coosen uniformly from the list of key codes
     * 	- ()=>number: a function which is called for every event and return a keycode
     * @return {IEvent} keypress event
     */
    function createKeypress(keyCodes) {
        if (typeof keyCodes === 'number') {
            return { name: 'keypress', type: 'Events', keyCode: function () { return keyCodes; } };
        }
        else if (Array.isArray(keyCodes)) {
            return {
                name: 'keypress',
                type: 'Events',
                keyCode: function () { return keyCodes[Math.floor(Math.random() * keyCodes.length)]; }
            };
        }
        else if (typeof keyCodes === 'function') {
            return { name: 'keypress', type: 'Events', keyCode: keyCodes };
        }
        else {
            return { name: 'keypress', type: 'Events' };
        }
    }
    SinglePageFuzzer.createKeypress = createKeypress;
    /**
     * Create a keyup event for the eventDistribution
     * @param {number|number[]|()=>number} keyCodes key code the event ist called with. The following types can be
     * passed
     * 	- number: the event will always have the passed number as key code
     * 	- number[]: each time a number is coosen uniformly from the list of key codes
     * 	- ()=>number: a function which is called for every event and return a keycode
     * @return {IEvent} keyup event
     */
    function createKeyup(keyCodes) {
        if (typeof keyCodes === 'number') {
            return { name: 'keyup', type: 'Events', keyCode: function () { return keyCodes; } };
        }
        else if (Array.isArray(keyCodes)) {
            return {
                name: 'keyup',
                type: 'Events',
                keyCode: function () { return keyCodes[Math.floor(Math.random() * keyCodes.length)]; }
            };
        }
        else if (typeof keyCodes === 'function') {
            return { name: 'keyup', type: 'Events', keyCode: keyCodes };
        }
        else {
            return { name: 'keyup', type: 'Events' };
        }
    }
    SinglePageFuzzer.createKeyup = createKeyup;
    /**
     * Create a touchstart event for the eventDistribution
     * @return {IEvent} touchstart event
     */
    function createTouchstart() {
        return { name: 'touchstart', type: 'TouchEvent' };
    }
    SinglePageFuzzer.createTouchstart = createTouchstart;
    /**
     * Create a touchend event for the eventDistribution
     * @return {IEvent} touchend event
     */
    function createTouchend() {
        return { name: 'touchend', type: 'TouchEvent' };
    }
    SinglePageFuzzer.createTouchend = createTouchend;
    /**
     * Create a touchmove event for the eventDistribution
     * @return {IEvent} touchmove event
     */
    function createTouchmove() {
        return { name: 'touchmove', type: 'TouchEvent' };
    }
    SinglePageFuzzer.createTouchmove = createTouchmove;
    /**
     * Create a touchcancel event for the eventDistribution
     * @return {IEvent} touchcancel event
     */
    function createTouchcancel() {
        return { name: 'touchcancel', type: 'TouchEvent' };
    }
    SinglePageFuzzer.createTouchcancel = createTouchcancel;
    /**
     * Create a click event for the eventDistribution
     * @return {IEvent} click event
     */
    function createClick() {
        return { name: 'click', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createClick = createClick;
    /**
     * Create a dblclick event for the eventDistribution
     * @return {IEvent} dblclick event
     */
    function createDblclick() {
        return { name: 'dblclick', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createDblclick = createDblclick;
    /**
     * Create a mouseenter event for the eventDistribution
     * @return {IEvent} mouseenter event
     */
    function createMouseenter() {
        return { name: 'mouseenter', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMouseenter = createMouseenter;
    /**
     * Create a mouseover event for the eventDistribution
     * @return {IEvent} mouseover event
     */
    function createMouseover() {
        return { name: 'mouseover', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMouseover = createMouseover;
    /**
     * Create a mousemove event for the eventDistribution
     * @return {IEvent} mousemove event
     */
    function createMousemove() {
        return { name: 'mousemove', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMousemove = createMousemove;
    /**
     * Create a mousedown event for the eventDistribution
     * @return {IEvent} mousedown event
     */
    function createMousedown() {
        return { name: 'mousedown', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMousedown = createMousedown;
    /**
     * Create a mouseup event for the eventDistribution
     * @return {IEvent} mouseup event
     */
    function createMouseup() {
        return { name: 'mouseup', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMouseup = createMouseup;
    /**
     * Create a mouseleave event for the eventDistribution
     * @return {IEvent} mouseleave event
     */
    function createMouseleave() {
        return { name: 'mouseleave', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMouseleave = createMouseleave;
    /**
     * Create a mouseout event for the eventDistribution
     * @return {IEvent} mouseout event
     */
    function createMouseout() {
        return { name: 'mouseout', type: 'MouseEvents' };
    }
    SinglePageFuzzer.createMouseout = createMouseout;
    // TODO: implement
    // dragstart: 'DragEvent',
    // drag: 'DragEvent',
    // dragend: 'DragEvent',
    // dragenter: 'DragEvent',
    // dragover: 'DragEvent',
    // dragleave: 'DragEvent',
    // drop: 'DragEvent'
    /**
     * Start the Fuzzer
     * @param {IConfig} config options for the fuzzer
     */
    function start(config) {
        // make sure the runner has stopped
        stop();
        // create new runner
        Context.runner = new Runner(config);
    }
    SinglePageFuzzer.start = start;
    /**
     * Generate a random number from a normal distribution using the Box-Muller transformation
     * https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
     * @param {number} mean mean of the distribution
     * @param {number} std standard deviation of the distribution
     * @param {boolean} positive if true, the result is always bigger than 0
     * @return {number} random number drawn from a normal distributed
     */
    function normal(mean, std, positive) {
        if (mean === void 0) { mean = 0; }
        if (std === void 0) { std = 1; }
        if (positive === void 0) { positive = false; }
        var n = null;
        while (n === null) {
            var u1 = Math.random();
            var u2 = Math.random();
            var n01 = Math.sqrt(-2. * Math.log(u1)) * Math.cos(2. * Math.PI * u2);
            n = n01 * std + mean;
            if (positive && n <= 0) {
                n = null;
            }
        }
        return n;
    }
    SinglePageFuzzer.normal = normal;
    /**
     * Generate a random number from a poisson distribution https://en.wikipedia.org/wiki/Poisson_distribution
     * @param {number} lambda lambda of the distribution
     * @return {number} random number drawn from a poisson distribution
     */
    function poisson(lambda) {
        var L = Math.exp(-lambda);
        var k = 0;
        var p = 1;
        while (p > L) {
            k += 1;
            p *= Math.random();
        }
        return k - 1;
    }
    SinglePageFuzzer.poisson = poisson;
    /**
     * Stop the Fuzzer
     */
    function stop() {
        if (Context.runner instanceof Runner) {
            Context.runner.stop();
        }
    }
    SinglePageFuzzer.stop = stop;
    /**
     * Class containing the state informations
     */
    var Context = (function () {
        function Context() {
        }
        return Context;
    }());
    // active runner
    Context.runner = null;
    /**
     * Runner
     */
    var Runner = (function () {
        // create a runner and directly start picking element
        function Runner(config) {
            if (config === void 0) { config = {}; }
            var _this = this;
            // minimal time used for actions with dom mutations
            this.minWithMutationTime = 0;
            // maximum time used for actions without dom mutations
            this.maxWithoutMutationTime = 0;
            // time limit for dispaching an event to determin if a function has a javascript handler or not
            this.withoutActionLimit = 0;
            // should the single page fuzzer simulate an offline situation
            this.offline = false;
            // the timeout handler for the on/offline change
            this.lineTimeout = null;
            // a cumulative version of the event distribution
            this.cumulativeEventDistribution = [];
            // A list of charachters the fuzzer picks uniformly to generate input values
            this.allowedChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
                'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
                'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Y', 'ä', 'ö', 'ü,', 'Ä', 'Ö', 'Ü',
                'ß', 'à', 'ç', 'è', 'ê', 'ë', 'ì', 'î', 'ï', 'ò', 'ó', 'ù', 'ą', 'ć', 'ĉ', 'ę', 'ĝ', 'ĥ', 'ĵ', 'ł', 'ń',
                'œ', 'ś', 'ŝ', 'ŭ', 'ź', 'ż', '+', '%', '&', '/', '\\', '!', '^', '`', '"', '\'', '[', ']', '<', '>', ':',
                '?', ';', '{', '}', '$', ' ', '\t', '\n'];
            // In the request object, the parameters of delaying and droping the requests are specified
            this.request = null;
            // timeout funciton to use
            this.timeout = function (handler, timeout) { return setTimeout(handler, timeout); };
            // hook to filter the selected element
            this.selectFilter = null;
            // initalize the now function, if performance.now exits use it, else use Date.now
            if ('performance' in window) {
                this.now = function () { return performance.now(); };
            }
            else {
                this.now = function () { return Date.now(); };
            }
            // remember the start time
            this.startTime = this.now();
            // initalize dom observer
            this.initalizeObserver();
            // set the select filter
            if (typeof config.selectFilter === 'function') {
                this.selectFilter = config.selectFilter;
            }
            // assemble the cumulative event probability
            var eventDistribution = config.eventDistribution;
            if (!Array.isArray(eventDistribution)) {
                eventDistribution = [SinglePageFuzzer.createEventProbability(1, [SinglePageFuzzer.createClick()])];
            }
            var cumulativeProbability = 0;
            this.cumulativeEventDistribution = eventDistribution
                .map(function (_a) {
                var probability = _a.probability, events = _a.events;
                cumulativeProbability += probability;
                return { probability: cumulativeProbability, events: events };
            });
            if (this.cumulativeEventDistribution[this.cumulativeEventDistribution.length - 1].probability != 1) {
                console.error('The event probabilities do not add up to 1, but to ' +
                    this.cumulativeEventDistribution[this.cumulativeEventDistribution.length - 1].probability);
                return;
            }
            // if the request is passed overwrite the send funtion of the XHR object
            if (typeof config.request === 'object') {
                this.origXMLHttpRequestSend = XMLHttpRequest.prototype.send;
                // use a wrapper function to keep the scope of the xhr object
                var sendProxy_1 = this.sendProxy.bind(this);
                XMLHttpRequest.prototype.send = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    sendProxy_1(this, args);
                };
                // create request function
                this.request = {};
                // set the lag, online and offline function
                ['lag', 'online', 'offline'].forEach(function (name) {
                    if (typeof config.request[name] === 'number') {
                        _this.request[name] = function () { return config.request[name]; };
                    }
                    else if (typeof config.request[name] === 'function') {
                        _this.request[name] = config.request[name];
                    }
                });
                // set the dropRequest and dropResponse function
                ['dropRequest', 'dropResponse'].forEach(function (name) {
                    if (typeof config.request[name] === 'number') {
                        _this.request[name] = function () { return Math.random() < config.request[name]; };
                    }
                    else if (typeof config.request[name] === 'function') {
                        _this.request[name] = config.request[name];
                    }
                });
                // if an on/offline timer is set, initalize timeout
                this.offline = false;
                if (typeof this.request.offline === 'function') {
                    if (typeof this.request.online !== 'function') {
                        console.warn('there is an offline handler, but no online handler, so the fuzzer goes offline ' +
                            'but never online again.');
                    }
                    this.toggleLine();
                }
            }
            // set the onerror function
            Context.onerror = window.onerror;
            window.onerror = function (message, url, line, col, error) {
                console.error(message, url, line, col, error);
                // call the original error handler
                if (typeof Context.onerror == 'function') {
                    Context.onerror(message, url, line, col, error);
                }
                // do not prevent error default error handling
                return false;
            };
            // start the fuzzer
            this.startAction();
        }
        // stop and destory the runner
        Runner.prototype.stop = function () {
            if (this.request !== null) {
                XMLHttpRequest.prototype.send = this.origXMLHttpRequestSend;
            }
            // clear the online / offline timeout
            if (this.lineTimeout !== null) {
                clearTimeout(this.lineTimeout);
            }
            // reset the onerror function
            window.onerror = Context.onerror;
            // stop the mutation observer
            this.observer.disconnect();
            // make sure the runner stops
            this.timeout = function () { return 0; };
            // remove the runner from the context
            Context.runner = null;
        };
        // initalize the mutation ovserver to observe all changes on the page
        Runner.prototype.initalizeObserver = function () {
            var _this = this;
            this.observer = new MutationObserver(function (mutations) {
                // update the last change time
                _this.lastAction = _this.now();
                if (!_this.hasDOMChanged) {
                    mutations.forEach(function (mutation) {
                        // only register non hidden elements as dom mutations
                        if (typeof mutation.target['offsetParent'] != 'undefined' && mutation.target['offsetParent'] !== null) {
                            _this.hasDOMChanged = true;
                        }
                    });
                }
            });
            this.observer.observe(document.getElementsByTagName('body')[0], {
                childList: true,
                attributes: true,
                characterData: true,
                subtree: true
            });
        };
        Runner.prototype.startAction = function () {
            var _this = this;
            // select an active element
            this.selectActiveElement();
            // reset the dom change tracker
            this.hasDOMChanged = false;
            // wait until all mutations are done
            this.lastAction = this.now();
            // if no timeout is passed from the user, use the native one
            this.timeout(function () { return _this.allDone(); }, 20);
        };
        Runner.prototype.selectActiveElement = function () {
            var _this = this;
            // pick an element from the viewport
            var el;
            var x;
            var y;
            _a = this.selectElement(), el = _a[0], x = _a[1], y = _a[2];
            // set the value for inputs
            if (el.nodeName == 'INPUT') {
                // empty the input value
                el['value'] = '';
                // generate a random number of chars, in average 16
                for (var i = poisson(16); i > 0; i -= 1) {
                    el['value'] += this.allowedChars[Math.floor(Math.random() * this.allowedChars.length)];
                }
            }
            {
                // pick the event
                var probability = 0;
                var events = [];
                var rng = Math.random();
                for (var _i = 0, _b = this.cumulativeEventDistribution; _i < _b.length; _i++) {
                    _c = _b[_i], probability = _c.probability, events = _c.events;
                    if (rng < probability) {
                        break;
                    }
                }
                // dispach events to picked element and use the longest event time as dispatch time
                this.dispatchTime = Math.max.apply(Math, events
                    .map(function (event) { return _this.createEvent(event, el, x, y); }));
            }
            // if the dispatch time is below the action limit, select a new element
            if (this.dispatchTime < this.withoutActionLimit) {
                this.selectActiveElement();
            }
            else {
                this.activeElement = el;
            }
            var _a, _c;
        };
        // select an element from the visible part of the webpage
        Runner.prototype.selectElement = function () {
            // selected element to act on
            var el = null;
            var x;
            var y;
            // pick points until a sutable element is found
            while (el === null) {
                // find a random element in viewport
                x = Math.floor(Math.random() * window.innerWidth);
                y = Math.floor(Math.random() * window.innerHeight);
                el = document.elementFromPoint(x, y);
                if (
                // if you hit the scrollbar on OSX there is no element ...
                el !== null &&
                    // if the selectFilter hook is valid check if the element passes the filter
                    typeof this.selectFilter === 'function' &&
                    !this.selectFilter(x, y, el)) {
                    el = null;
                }
            }
            // the element is valid
            return [el, x, y];
        };
        Runner.prototype.createEvent = function (props, el, x, y) {
            // since switch is scope free, declare the event variable here
            var event;
            switch (props.type) {
                case 'HTMLEvents':
                    event = document.createEvent('HTMLEvents');
                    event.initEvent(props.name, true, true);
                    // submit events only make sence on forms so trigger the event on the form event
                    if (props.name === 'submit' && el['form'] instanceof HTMLFormElement) {
                        el = el['form'];
                    }
                    break;
                case 'TouchEvent':
                    // TODO: make touches configurable
                    event = document.createEvent('TouchEvent');
                    event['initUIEvent'](props.name, true, true);
                    event['touches'] = document.createTouchList(document.createTouch(window, el, 0, window.scrollX + x, window.scrollY + y, x, y));
                    break;
                case 'MouseEvents':
                    event = document.createEvent('MouseEvents');
                    // click and dbl click use initEvents, the others use initMouseEvent
                    if (['click', 'dblclick'].indexOf(props.name) > -1) {
                        event.initEvent(props.name, true, true);
                    }
                    else {
                        event['initMouseEvent'](props.name, true, // bubbles
                        props.name != 'mousemove', // cancelable
                        window, // view
                        0, // detail
                        x, // screenX
                        y, // screenY
                        x, // clientX
                        y, // clientY
                        // TODO: make special keys configurable
                        false, // ctrlKey
                        false, // altKey
                        false, // shiftKey
                        false, // metaKey
                        // TODO: make buttons configurabel
                        1, // button first: 1, second: 4, third: 2
                        document['body'].parentNode // relatedTarget
                        );
                    }
                    break;
                case 'Events':
                    var keyCode = null;
                    var eventName = props.name;
                    if (props.hasOwnProperty('keyCode')) {
                        keyCode = props.keyCode[Math.floor(Math.random() * props.keyCode.length)];
                        // no keypress / keydown for modifiers
                        if ([16, 17, 18, 91].indexOf(keyCode) > -1) {
                            eventName = 'keyup';
                        }
                    }
                    // initalize the event
                    event = document.createEvent('Events');
                    event.initEvent(eventName, true, true);
                    // set keycode
                    if (keyCode !== null) {
                        event['keyCode'] = keyCode;
                        event['which'] = keyCode;
                    }
                    // TODO: make special keys configurable
                    event['shiftKey'] = false;
                    event['metaKey'] = false;
                    event['altKey'] = false;
                    event['ctrlKey'] = false;
                    break;
                default:
                    console.error('unknown event type: ' + props.type);
            }
            var start = this.now();
            el.dispatchEvent(event);
            return this.now() - start;
        };
        // check if the browser has finished the action
        Runner.prototype.allDone = function () {
            var _this = this;
            var elapsed = this.now() - this.lastAction;
            // if a dom mutation has occured, or some backround javascript is running, wait for another 20 ms
            if (elapsed >= 20 && elapsed < 25) {
                if (this.hasDOMChanged) {
                    // if the dispatch time is smaller than the minimal dispatch of mutated elements time, update it
                    if (this.minWithMutationTime == 0 || this.dispatchTime < this.minWithMutationTime) {
                        this.minWithMutationTime = this.dispatchTime;
                    }
                }
                else if (this.activeElement.nodeName != 'INPUT') {
                    // if the dispatch time is bigger than the maximum dispatch time of non mutated elements, update it
                    if (this.dispatchTime > this.maxWithoutMutationTime) {
                        this.maxWithoutMutationTime = this.dispatchTime;
                    }
                }
                // if the time limit for dispatch times without mutations has changed, update it
                var limit = Math.min(0.8 * this.maxWithoutMutationTime, 0.5 * this.minWithMutationTime);
                if (limit > this.withoutActionLimit) {
                    console.log("update without action limit to " + limit.toFixed(2) + " ms");
                    this.withoutActionLimit = limit;
                }
                // start next action
                this.startAction();
            }
            else {
                this.lastAction = this.now();
                // if no timeout is passed from the user, use the native one
                this.timeout(function () { return _this.allDone(); }, 20);
            }
        };
        // switch from online to offline state ...
        Runner.prototype.toggleLine = function () {
            var _this = this;
            var fn = this.request[this.offline ? 'online' : 'offline'];
            if (typeof fn == 'function') {
                var duration_1 = Math.round(fn());
                this.lineTimeout = setTimeout(function () {
                    _this.offline = !_this.offline;
                    console.log("go " + (_this.offline ? 'offline' : 'online') + " after " + (duration_1 / 1000.).toFixed(2) + " s");
                    _this.toggleLine();
                }, duration_1);
            }
            else {
                this.lineTimeout = null;
            }
        };
        // proxy function for the xhr send function
        Runner.prototype.sendProxy = function (xhr, args) {
            var _this = this;
            // if we are offline, every request fails ...
            if (this.offline) {
                // call the onerror handler, if the it exits, else call the onreadystatechange with xhr.status = 0
                if (typeof xhr.onerror === 'function') {
                    setTimeout(xhr.onerror.bind(xhr, null));
                }
                else if (typeof xhr.onreadystatechange === 'function') {
                    setTimeout(function () {
                        var cpy = {};
                        // xhr.status and xhr.readyState are readonly, so make a copy, bo be able to change them
                        Object.keys(xhr).forEach(function (key) {
                            cpy[key] = xhr[key];
                        });
                        cpy.status = 0;
                        for (var i = 0; i < 5; i += 1) {
                            cpy.readyState = i;
                            cpy.onreadystatechange(null);
                        }
                    });
                }
            }
            else if (typeof this.request.dropRequest === 'function' && this.request.dropRequest(xhr, args)) {
                console.log('drop request');
                // if a timeout handler exits, call the timeout handler
                if (xhr.timeout && typeof xhr.ontimeout == 'function') {
                    setTimeout(function () { return xhr.ontimeout(null); }, xhr.timeout);
                }
            }
            else {
                // do we want to drop the response?
                if (typeof this.request.dropResponse == 'function' && this.request.dropResponse(xhr, args)) {
                    console.log('drop response');
                    // if a timeout handler exits, call the timeout handler
                    if (xhr.timeout && typeof xhr.ontimeout == 'function') {
                        setTimeout(function () { return xhr.ontimeout(null); }, xhr.timeout);
                    }
                    // remove the response handlers to simulate a request loss
                    xhr.onerror = null;
                    xhr.onreadystatechange = null;
                }
                else if (typeof this.request.lag == 'function') {
                    setTimeout(function () { return _this.origXMLHttpRequestSend.apply(xhr, args); }, Math.max(0, this.request.lag(xhr, args)));
                }
                else {
                    this.origXMLHttpRequestSend.apply(xhr, args);
                }
            }
        };
        return Runner;
    }());
})(SinglePageFuzzer || (SinglePageFuzzer = {}));
//# sourceMappingURL=singlepagefuzzer.js.map