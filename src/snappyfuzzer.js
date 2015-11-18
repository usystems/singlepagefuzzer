/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */
var SnappyFuzzer;
(function (SnappyFuzzer) {
    'use strict';
    /**
     * Default implementation of the config interface
     */
    var Config = (function () {
        function Config() {
            // run until stop is called
            this.stopAfter = 0;
            this.preventUnload = false;
        }
        // hook to highlight the element an action is performed on
        Config.prototype.highlightAction = function (style, acceptance) {
            // if mutations have been triggerd, set the border treen
            if (acceptance == 1) {
                style.border = '1px solid #4CAF50';
            }
            else {
                style.border = Math.round(Math.log(1. / acceptance) / Math.log(2)) + 'px solid #F44336';
            }
        };
        return Config;
    })();
    SnappyFuzzer.Config = Config;
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
    SnappyFuzzer.start = start;
    /**
     * Stop the Fuzzer
     */
    function stop() {
        if (Context.runner instanceof Runner) {
            Context.runner.stop();
        }
    }
    SnappyFuzzer.stop = stop;
    /**
     * Class containing the state informations
     */
    var Context = (function () {
        function Context() {
        }
        // active runner
        Context.runner = null;
        return Context;
    })();
    /**
     * Runner
     */
    var Runner = (function () {
        // create a runner and directly start picking element
        function Runner(config) {
            var _this = this;
            this.config = config;
            // timeout for the highlight mutations
            this.mutationTimeout = null;
            // minimal time used for actions with dom mutations
            this.minWithMutationTime = 0;
            // maximum time used for actions without dom mutations
            this.maxWithoutMutationTime = 0;
            // time limit for dispaching an event to determin if a function has a javascript handler or not
            this.withoutActionLimit = 0;
            // determine when to stop. If config.stopAfter == 0, run until stop is called
            this.startTime = performance.now();
            // initalize the mutation ovserver to observe all changes on the page
            this.observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) { return _this.observeMutation(mutation); });
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
                    return 'Are you sure you want to leave the page while the SnappyFuzzer is running?!';
                };
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
            // reset the onerror function
            window.onerror = Context.onerror;
            // stop the mutation observer
            this.observer.disconnect();
            // make sure the runner stops
            this.config.stopAfter = -1;
            // remove the runner from the context
            Context.runner = null;
        };
        // generate a value with poission distribution, lambda = 1. The minimal value is 1 not 0 as normally
        // https://en.wikipedia.org/wiki/Poisson_distribution
        Runner.prototype.poission = function () {
            // initalize distribution params
            var lambda = typeof this.config.lambda == 'function' ? this.config.lambda(this.startTime) : 1;
            var L = Math.exp(-lambda);
            var k = 0;
            var p = 1;
            while (p > L) {
                ++k;
                p *= Math.random();
            }
            // since we want at least one click, return 1 of the value would be zero
            return Math.max(1, k - 1);
        };
        // handle single dom mutations
        Runner.prototype.observeMutation = function (mutation) {
            // if an attribute with the prefix fuzzer has changed, its an internal attribute and it should be
            // ignored
            if (mutation.type == 'attributes' && mutation.attributeName.substr(0, 7) == 'fuzzer-') {
                return;
            }
            else if (this.expectedStyleChange &&
                mutation.type == 'attributes' &&
                mutation.attributeName == 'style' &&
                this.activeElements.some(function (el) { return el == mutation.target; })) {
                return this.startAction();
            }
            // only register non hidden elements as dom mutations
            /* tslint:disable:no-string-literal */
            if (typeof mutation.target['offsetParent'] != 'undefined' && mutation.target['offsetParent'] !== null) {
                this.hasDOMChanged = true;
                // if new elements are introduced to the dom, check if these elements have a fuzzer acceptance
                // attribute. if so, remove the attributes
                if (mutation.type == 'childList') {
                    var nodes = Array.prototype.concat(mutation.addedNodes, mutation.removedNodes);
                    nodes.forEach(function (node) {
                        if (typeof node['querySelectorAll'] == 'function') {
                            Array.prototype.forEach.call(node['querySelectorAll']('*[fuzzer-acceptance]'), function (child) {
                                child.removeAttribute('fuzzer-acceptance');
                            });
                        }
                    });
                }
            }
        };
        Runner.prototype.startAction = function () {
            // if function is called from a mutation clear the timout
            if (this.mutationTimeout != null) {
                clearTimeout(this.mutationTimeout);
                this.mutationTimeout = null;
            }
            // check if the runner is done
            if (this.config.stopAfter != 0 && this.startTime + this.config.stopAfter * 1000 < performance.now()) {
                return this.stop();
            }
            // reset the active elements array and the style changes
            this.activeElements = [];
            this.expectedStyleChange = false;
            // as long as we dont have timing statistics, only select one node to get more statistics
            var len = 1;
            if (this.withoutActionLimit > 0) {
                // else add more elements with a poisson distribution
                len = this.poission();
            }
            // find sutable elements
            while (this.activeElements.length < len) {
                // pick an element from the viewport
                var el = this.selectElement();
                // set the value for inputs
                if (el.nodeName == 'INPUT') {
                    // since Element has no value field, use bracket access
                    el['value'] = (Math.random() + 1).toString(36).substring(2);
                }
                {
                    // create native click event
                    // do randomly hold meta keys ...
                    var event_1 = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
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
            // tell the user where the fuzzer performed an action
            console.log('perform action on ', this.activeElements);
            // reset the dom change tracker
            this.hasDOMChanged = false;
            // wait until all mutations are done
            this.lastChange = performance.now();
            setTimeout(this.allDone.bind(this), 20);
        };
        // check if the browser has finished the action
        Runner.prototype.allDone = function () {
            if (this.hasDOMChanged || performance.now() - this.lastChange < 25) {
                this.analyzeChanges();
            }
            else {
                this.lastChange = performance.now();
                setTimeout(this.allDone.bind(this), 20);
            }
        };
        // select an element from the visible part of the webpage
        Runner.prototype.selectElement = function () {
            // pick points until a sutable element is found
            while (true) {
                // find a random element in viewport
                var x = Math.floor(Math.random() * window.innerWidth);
                var y = Math.floor(Math.random() * window.innerHeight);
                var el = document.elementFromPoint(x, y);
                // if you hit the scrollbar there is no element ...
                if (el === null) {
                    continue;
                }
                // if the fuzzer acceptance is set, only accept elements with the acceptance probability
                if (el.getAttribute('fuzzer-acceptance') !== null) {
                    var acceptance = parseFloat(el.getAttribute('fuzzer-acceptance'));
                    if (acceptance < Math.random()) {
                        continue;
                    }
                }
                // if the selectFilter hook is valid check if the element passes the filter
                if (typeof this.config.selectFilter == 'function' &&
                    !this.config.selectFilter(x, y, el)) {
                    continue;
                }
                // the element is valid
                return el;
            }
        };
        Runner.prototype.analyzeChanges = function () {
            // only change acceptance and color if only one element is selected, else we cannot map the mutations
            // to the selected element
            if (this.activeElements.length == 1) {
                // acceptance rate of the selected element
                var acceptance;
                // do not reduce the acceptance of the input fields
                if (this.hasDOMChanged || this.activeElements[0].nodeName == 'INPUT') {
                    // accept all selections
                    acceptance = 1;
                    // if the element has an acceptance reade remove it, since no attributes means acceptance of 1
                    if (this.activeElements[0].getAttribute('fuzzer-acceptance') !== null) {
                        this.activeElements[0].removeAttribute('fuzzer-acceptance');
                    }
                    // if the dispatch time is smaller than the minimal dispatch of mutated elements time, update it
                    if (this.minWithMutationTime == 0 || this.dispatchTime < this.minWithMutationTime) {
                        this.minWithMutationTime = this.dispatchTime;
                    }
                }
                else {
                    // acceptance rate is equal to 2**(-#<actions without mutations>)
                    if (this.activeElements[0].getAttribute('fuzzer-acceptance') !== null) {
                        acceptance = parseFloat(this.activeElements[0].getAttribute('fuzzer-acceptance')) / 2.;
                    }
                    else {
                        acceptance = 0.5;
                    }
                    // save the acceptance rate as an attribute directly in the Element
                    this.activeElements[0].setAttribute('fuzzer-acceptance', acceptance.toFixed(4));
                    // if the dispatch time is bigger than the maximum dispatch time of non mutated elements, update it
                    if (this.dispatchTime > this.maxWithoutMutationTime) {
                        this.maxWithoutMutationTime = this.dispatchTime;
                    }
                }
                // highlight the selected element
                if (typeof this.config.highlightAction == 'function') {
                    // track the style change
                    this.expectedStyleChange = true;
                    // call the highlighter
                    this.config.highlightAction(this.activeElements[0]['style'], acceptance);
                    // if the style mutation does not trigger an mutation, go on after the timeout triggered
                    this.mutationTimeout = setTimeout(this.startAction.bind(this), 100);
                }
                else {
                    this.startAction();
                }
                // if the time limit for dispatch times without mutations has changed, update the limit
                var limit = Math.min(this.maxWithoutMutationTime, 0.8 * this.minWithMutationTime);
                if (limit > this.withoutActionLimit) {
                    console.log('update without action limit to ' + limit.toFixed(2) + ' ms');
                    this.withoutActionLimit = limit;
                }
            }
            else {
                // start next action
                this.startAction();
            }
        };
        return Runner;
    })();
})(SnappyFuzzer || (SnappyFuzzer = {}));
//# sourceMappingURL=snappyfuzzer.js.map