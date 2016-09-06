/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */
var SinglePageFuzzer;
(function (SinglePageFuzzer) {
    'use strict';
    /**
     * Default implementation of the config interface
     */
    var Config = (function () {
        function Config() {
            // run until stop is called
            this.stopAfter = 0;
            this.preventUnload = false;
            this.patchXMLHttpRequestSend = true;
            this.allowedChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
                'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
                'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Y', 'ä', 'ö', 'ü,', 'Ä', 'Ö', 'Ü',
                'ß', 'à', 'ç', 'è', 'ê', 'ë', 'ì', 'î', 'ï', 'ò', 'ó', 'ù', 'ą', 'ć', 'ĉ', 'ę', 'ĝ', 'ĥ', 'ĵ', 'ł', 'ń',
                'œ', 'ś', 'ŝ', 'ŭ', 'ź', 'ż', '+', '%', '&', '/', '\\', '!', '^', '`', '"', '\'', '[', ']', '<', '>', ':',
                '?', ';', '{', '}', '$', ' ', '\t', '\n'];
        }
        return Config;
    }());
    SinglePageFuzzer.Config = Config;
    /**
     * Start the Fuzzer
     * @param {IConfig} config options for the fuzzer
     */
    function start(config) {
        if (config === void 0) { config = new Config(); }
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
        // active runner
        Context.runner = null;
        return Context;
    }());
    /**
     * Runner
     */
    var Runner = (function () {
        // create a runner and directly start picking element
        function Runner(config) {
            var _this = this;
            this.config = config;
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
            // determine when to stop. If config.stopAfter == 0, run until stop is called
            this.startTime = performance.now();
            // initalize the mutation ovserver to observe all changes on the page
            this.observer = new MutationObserver(function (mutations) {
                // update the last change time
                _this.lastAction = performance.now();
                if (!_this.hasDOMChanged) {
                    mutations.forEach(function (mutation) {
                        // only register non hidden elements as dom mutations
                        /* tslint:disable:no-string-literal */
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
            // set the onbeforunload function
            if (config.preventUnload) {
                Context.onbeforeunload = window.onbeforeunload;
                window.onbeforeunload = function () {
                    return 'Are you sure you want to leave the page while the SinglePageFuzzer is running?!';
                };
            }
            if (config.patchXMLHttpRequestSend) {
                this.origXMLHttpRequestSend = XMLHttpRequest.prototype.send;
                // use a wrapper function to keep the scope of the xhr object
                var sendProxy_1 = this.sendProxy.bind(this);
                XMLHttpRequest.prototype.send = function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    sendProxy_1(this, args);
                };
            }
            // if an on/offline timer is set, initalize timeout
            this.offline = false;
            if (typeof this.config.offline == 'function') {
                if (typeof this.config.online != 'function') {
                    console.warn('there is an offline handler, but no online handler, so the fuzzer goes offline but' +
                        'never online again.');
                }
                this.toggleLine();
            }
            // set the onerror function
            Context.onerror = window.onerror;
            window.onerror = function (message, url, line, col, error) {
                console.error(message, url, line, col, error);
                // call the original error handler
                Context.onerror(message, url, line, col, error);
                // do not prevent error default error handling
                return false;
            };
            // start the fuzzer
            this.startAction();
        }
        // stop and destory the runner
        Runner.prototype.stop = function () {
            // reset the onbeforeunload function
            if (this.config.preventUnload) {
                window.onbeforeunload = Context.onbeforeunload;
            }
            if (this.config.patchXMLHttpRequestSend) {
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
            this.config.stopAfter = -1;
            // remove the runner from the context
            Context.runner = null;
        };
        Runner.prototype.startAction = function () {
            // check if the runner is done
            if (this.config.stopAfter != 0 && this.startTime + this.config.stopAfter * 1000 < performance.now()) {
                return this.stop();
            }
            // reset the active elements array and the style changes
            this.activeElements = [];
            // as long as we dont have timing statistics, only select one node to get more statistics
            var len = 1;
            if (this.withoutActionLimit > 0) {
                // else add more elements with a poisson distribution
                var lambda = typeof this.config.lambda == 'function' ? this.config.lambda(this.startTime) : 1;
                len = Math.max(1, poisson(lambda));
            }
            // find sutable elements
            while (this.activeElements.length < len) {
                // pick an element from the viewport
                var el = this.selectElement();
                // set the value for inputs
                if (el.nodeName == 'INPUT') {
                    // empty the input value
                    el['value'] = '';
                    // generate a random number of chars, in average 16
                    for (var i = poisson(16); i > 0; i -= 1) {
                        el['value'] += this.config.allowedChars[Math.floor(Math.random() * this.config.allowedChars.length)];
                    }
                }
                {
                    var event_1 = void 0;
                    if (typeof this.config.createEvent == 'function') {
                        event_1 = this.config.createEvent();
                    }
                    else {
                        var rng = Math.random();
                        // creat a click event with 60% probability and a dblclick event with 20% probability
                        if (rng < 0.8) {
                            event_1 = document.createEvent('HTMLEvents');
                            event_1.initEvent(rng < 0.6 ? 'click' : 'dblclick', true, true);
                        }
                        else {
                            var keyCode = [
                                8,
                                9,
                                13,
                                16,
                                17,
                                18,
                                20,
                                27,
                                32,
                                33,
                                34,
                                35,
                                36,
                                37,
                                38,
                                39,
                                40,
                                45,
                                46,
                                46,
                                91,
                                93,
                                224 // meta
                            ][Math.floor(Math.random() * 10)];
                            var eventType = rng < 0.8666 ? 'keydown' : (rng < 0.93333 ? 'keypress' : 'keyup');
                            // no keypress / keydown for modifiers
                            if ([16, 17, 18, 91].indexOf(keyCode) > -1) {
                                eventType = 'keyup';
                            }
                            event_1 = document.createEvent('Events');
                            event_1.initEvent(eventType, true, true);
                            event_1['keyCode'] = keyCode;
                            event_1['which'] = keyCode;
                            event_1['shiftKey'] = false;
                            event_1['metaKey'] = false;
                            event_1['altKey'] = false;
                            event_1['ctrlKey'] = false;
                        }
                    }
                    // dispach event to picked element
                    var start_1 = performance.now();
                    el.dispatchEvent(event_1);
                    this.dispatchTime = performance.now() - start_1;
                }
                // if the dispatch time is below the action limit, pick a new element
                if (this.dispatchTime < this.withoutActionLimit) {
                    continue;
                }
                // we found a valid element
                this.activeElements.push(el);
            }
            // reset the dom change tracker
            this.hasDOMChanged = false;
            // wait until all mutations are done
            this.lastAction = performance.now();
            setTimeout(this.allDone.bind(this), 20);
        };
        // check if the browser has finished the action
        Runner.prototype.allDone = function () {
            var elapsed = performance.now() - this.lastAction;
            // if a dom mutation has occured, ore some backround javascript is running, wait for another 20 ms
            if (elapsed >= 20 && elapsed < 25) {
                // only change acceptance and color if only one element is selected, else we cannot map the mutations
                // to the selected element
                if (this.activeElements.length == 1) {
                    // do not reduce the acceptance of the input fields
                    if (this.hasDOMChanged || this.activeElements[0].nodeName == 'INPUT') {
                        // if the dispatch time is smaller than the minimal dispatch of mutated elements time, update it
                        if (this.minWithMutationTime == 0 || this.dispatchTime < this.minWithMutationTime) {
                            this.minWithMutationTime = this.dispatchTime;
                        }
                    }
                    else {
                        // if the dispatch time is bigger than the maximum dispatch time of non mutated elements, update it
                        if (this.dispatchTime > this.maxWithoutMutationTime) {
                            this.maxWithoutMutationTime = this.dispatchTime;
                        }
                    }
                    // if the time limit for dispatch times without mutations has changed, update it
                    var limit = Math.min(this.maxWithoutMutationTime, 0.8 * this.minWithMutationTime);
                    if (limit > this.withoutActionLimit) {
                        console.log("update without action limit to " + limit.toFixed(2) + " ms");
                        this.withoutActionLimit = limit;
                    }
                }
                // start next action
                this.startAction();
            }
            else {
                this.lastAction = performance.now();
                setTimeout(this.allDone.bind(this), 20);
            }
        };
        // select an element from the visible part of the webpage
        Runner.prototype.selectElement = function () {
            // selected element to act on
            var el = null;
            // pick points until a sutable element is found
            while (el === null) {
                // find a random element in viewport
                var x = Math.floor(Math.random() * window.innerWidth);
                var y = Math.floor(Math.random() * window.innerHeight);
                el = document.elementFromPoint(x, y);
                if (
                // if you hit the scrollbar on OSX there is no element ...
                el !== null &&
                    // if the selectFilter hook is valid check if the element passes the filter
                    typeof this.config.selectFilter === 'function' &&
                    !this.config.selectFilter(x, y, el)) {
                    el = null;
                }
            }
            // the element is valid
            return el;
        };
        // switch from online to offline state ...
        Runner.prototype.toggleLine = function () {
            var _this = this;
            var fn = this.config[this.offline ? 'online' : 'offline'];
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
                if (typeof xhr.onerror == 'function') {
                    setTimeout(xhr.onerror.bind(xhr, null));
                }
                else if (typeof xhr.onreadystatechange == 'function') {
                    setTimeout(function () {
                        xhr.status = 0;
                        for (var i = 0; i < 5; i += 1) {
                            xhr.readyState = i;
                            xhr.onreadystatechange(null);
                        }
                    });
                }
            }
            else if (typeof this.config.dropRequest == 'function' && this.config.dropRequest(xhr, args)) {
                console.log('drop request');
                // if a timeout handler exits, call the timeout handler
                if (xhr.timeout && typeof xhr.ontimeout == 'function') {
                    setTimeout(function () { return xhr.ontimeout(null); }, xhr.timeout);
                }
            }
            else {
                // do we want to drop the response?
                if (typeof this.config.dropResponse == 'function' && this.config.dropResponse(xhr, args)) {
                    console.log('drop response');
                    // if a timeout handler exits, call the timeout handler
                    if (xhr.timeout && typeof xhr.ontimeout == 'function') {
                        setTimeout(function () { return xhr.ontimeout(null); }, xhr.timeout);
                    }
                    // remove the response handlers to simulate a request loss
                    xhr.onerror = null;
                    xhr.onreadystatechange = null;
                }
                else if (typeof this.config.lag == 'function') {
                    setTimeout(function () { return _this.origXMLHttpRequestSend.apply(xhr, args); }, Math.max(0, this.config.lag(xhr, args)));
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