/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */
var SnappyFuzzer;
(function (SnappyFuzzer) {
    /**
     * Default implementation of the config interface
     */
    var Config = (function () {
        function Config() {
            // run until stop is called
            this.stopAfter = 0;
        }
        // hook to highlight the selected element
        Config.prototype.highlightSelected = function (style) {
            // by default a purple border is displayed
            style.border = '3px solid #9C27B0';
        };
        // hook to highlight the element an action is performed on
        Config.prototype.highlightAction = function (style, acceptance) {
            // if mutations have been triggerd, set the border treen
            if (acceptance == 1)
                style.border = '1px solid #4CAF50';
            else
                style.border = Math.round(Math.log(1. / acceptance) / Math.log(2)) + 'px solid #F44336';
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
        if (Context.runner instanceof Runner)
            Context.runner.stop();
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
     * Mutation states, what should be tracked
     */
    var MutationStates;
    (function (MutationStates) {
        MutationStates[MutationStates["HIGHLIGHT_SELECTED"] = 0] = "HIGHLIGHT_SELECTED";
        MutationStates[MutationStates["HIGHLIGHT_ACTION"] = 1] = "HIGHLIGHT_ACTION";
        MutationStates[MutationStates["OBSERVE"] = 2] = "OBSERVE";
    })(MutationStates || (MutationStates = {}));
    /**
     * Runner
     */
    var Runner = (function () {
        // create a runner and directly start picking element
        function Runner(config) {
            var _this = this;
            this.config = config;
            // how to we want to handle the observed states
            this.mutationState = MutationStates.OBSERVE;
            // timeout for the highlight mutations
            this.mutationTimeout = null;
            // minimal time used for actions with dom mutations
            this.minWithMutationTime = 0;
            // maximum time used for actions without dom mutations
            this.maxWithoutMutationTime = 0;
            // time limit for dispaching an event to determin if a function has a javascript handler or not
            this.withoutActionLimit = 0;
            // Determine when to stop. If config.stopAfter == 0, run until stop is called
            this.stopTime = config.stopAfter == 0 ? null : performance.now() + this.config.stopAfter * 1000;
            // initalize the mutation ovserver to observe all changes on the page
            this.observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) { return _this.observe(mutation); });
            });
            this.observer.observe(document.getElementsByTagName('body')[0], {
                childList: true,
                attributes: true,
                characterData: true,
                subtree: true
            });
            this.startAction();
        }
        // stop and destory the runner
        Runner.prototype.stop = function () {
            // stop the mutation observer
            this.observer.disconnect();
            // make sure the runner stops
            this.stopTime = performance.now() - 1;
            // remove the runner from the context
            Context.runner = null;
        };
        // handle single dom mutations
        Runner.prototype.observe = function (mutation) {
            // if an attribute with the prefix fuzzer has changed, its an internal attribute and it should be
            // ignored
            if (mutation.type == 'attributes' && mutation.attributeName.substr(0, 7) == 'fuzzer-')
                return;
            else if (this.mutationState !== MutationStates.OBSERVE
                && mutation.type == 'attributes'
                && mutation.attributeName == 'style'
                && mutation.target == this.activeElement)
                return this.styleMutated();
            // only register non hidden elements as dom mutations
            if (typeof mutation.target['offsetParent'] != 'undefined' && mutation.target['offsetParent'] !== null) {
                this.hasDOMChanged = true;
                // if new elements are introduced to the dom, check if these elements have a fuzzer acceptance
                // attribute. if so, remove the attributes
                if (mutation.type == 'childList') {
                    var nodes = Array.prototype.concat(mutation.addedNodes, mutation.removedNodes);
                    nodes.forEach(function (node) {
                        if (typeof node['querySelectorAll'] == 'function')
                            Array.prototype.forEach.call(node['querySelectorAll']('*[fuzzer-acceptance]'), function (child) {
                                child.removeAttribute('fuzzer-acceptance');
                            });
                    });
                }
            }
        };
        // the highlight action on the style has been performed, now we can go on
        Runner.prototype.styleMutated = function () {
            // if function is called from a mutation clear the timout
            if (this.mutationTimeout != null) {
                clearTimeout(this.mutationTimeout);
                this.mutationTimeout = null;
            }
            // set the observing mode back to observe and continue
            switch (this.mutationState) {
                case MutationStates.HIGHLIGHT_SELECTED:
                    this.mutationState = MutationStates.OBSERVE;
                    this.dispatchEvent();
                    break;
                case MutationStates.HIGHLIGHT_ACTION:
                    this.mutationState = MutationStates.OBSERVE;
                    this.startAction();
                    break;
            }
        };
        Runner.prototype.startAction = function () {
            var _this = this;
            // check if the runner is done
            if (this.stopTime !== null && this.stopTime < performance.now())
                return this.stop();
            // select an element from the viewport
            if (!this.selectElement())
                // use setTimeout to avoid huge stack traces
                setTimeout(function () { return _this.startAction(); });
            else if (typeof this.config.highlightSelected == 'function') {
                // track the style change
                this.mutationState = MutationStates.HIGHLIGHT_SELECTED;
                // call the highlighter
                this.config.highlightSelected(this.activeElement['style']);
                // if the style mutation does not trigger an mutation, go on after the timeout triggered
                this.mutationTimeout = setTimeout(this.styleMutated.bind(this), 100);
            }
            else
                this.styleMutated();
        };
        // select an element from the visible part of the webpage
        Runner.prototype.selectElement = function () {
            // find a random element in viewport
            var x = Math.floor(Math.random() * window.innerWidth);
            var y = Math.floor(Math.random() * window.innerHeight);
            this.activeElement = document.elementFromPoint(x, y);
            // if you hit the scrollbar there is no element ...
            if (this.activeElement === null)
                return false;
            // if the fuzzer acceptance is set, only accept elements with the acceptance probability
            if (this.activeElement.getAttribute('fuzzer-acceptance') !== null) {
                var acceptance = parseFloat(this.activeElement.getAttribute('fuzzer-acceptance'));
                if (acceptance < Math.random())
                    return false;
            }
            // if the selectFilter hook is valid check if the element passes the filter
            if (typeof this.config.selectFilter == 'function' &&
                !this.config.selectFilter(x, y, this.activeElement))
                return false;
            // the element is valid
            return true;
        };
        Runner.prototype.dispatchEvent = function () {
            if (this.activeElement.nodeName == 'INPUT')
                // since Element has no value field, use bracket access
                this.activeElement['value'] = (Math.random() + 1).toString(36).substring(2);
            {
                // create native click event
                var event_1 = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                // dispach event to picked element
                var start_1 = performance.now();
                this.activeElement.dispatchEvent(event_1);
                var end = performance.now();
                this.dispatchTime = end - start_1;
            }
            // if the dispatch time is below the action limit, only wait 10 ms instead of 1s
            var wait = this.dispatchTime < this.withoutActionLimit ? 10 : 1000;
            // reset the dom change tracker
            this.hasDOMChanged = false;
            // go on after mutation are over
            setTimeout(this.analyzeChanges.bind(this), wait);
        };
        Runner.prototype.analyzeChanges = function () {
            // acceptance rate of the selected element
            var acceptance;
            // do not reduce the acceptance of the input fields
            if (this.hasDOMChanged || this.activeElement.nodeName == 'INPUT') {
                // accept all selections
                acceptance = 1;
                // if the element has an acceptance reade remove it, since no attributes means acceptance of 1
                if (this.activeElement.getAttribute('fuzzer-acceptance') !== null)
                    this.activeElement.removeAttribute('fuzzer-acceptance');
                // if the dispatch time is smaller than the minimal dispatch of mutated elements time, update it
                if (this.minWithMutationTime == 0 || this.dispatchTime < this.minWithMutationTime)
                    this.minWithMutationTime = this.dispatchTime;
                // tell the user where the fuzzer clicked on and set a green border
                console.log('click on', [this.activeElement]);
            }
            else {
                // acceptance rate is equal to 2**(-#<actions without mutations>)
                if (this.activeElement.getAttribute('fuzzer-acceptance') !== null)
                    acceptance = parseFloat(this.activeElement.getAttribute('fuzzer-acceptance')) / 2.;
                else
                    acceptance = 0.5;
                // save the acceptance rate as an attribute directly in the Element
                this.activeElement.setAttribute('fuzzer-acceptance', acceptance.toFixed(4));
                // if the dispatch time is bigger than the maximum dispatch time of non mutated elements, update it
                if (this.dispatchTime > this.maxWithoutMutationTime)
                    this.maxWithoutMutationTime = this.dispatchTime;
            }
            // highlight the selected element
            if (typeof this.config.highlightAction == 'function') {
                // track the style change
                this.mutationState = MutationStates.HIGHLIGHT_ACTION;
                // call the highlighter
                this.config.highlightAction(this.activeElement['style'], acceptance);
                // if the style mutation does not trigger an mutation, go on after the timeout triggered
                this.mutationTimeout = setTimeout(this.styleMutated.bind(this), 100);
            }
            else
                this.styleMutated();
            // if the time limit for dispatch times without mutations has changed, update the limit
            var limit = Math.min(this.maxWithoutMutationTime, 0.8 * this.minWithMutationTime);
            if (limit > this.withoutActionLimit) {
                console.log('update without action limit to ' + limit.toFixed(2) + ' ms');
                this.withoutActionLimit = limit;
            }
        };
        return Runner;
    })();
})(SnappyFuzzer || (SnappyFuzzer = {}));
//# sourceMappingURL=snappyfuzzer.js.map