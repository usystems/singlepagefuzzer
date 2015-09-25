/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */

module SnappyFuzzer {

	/**
	 * Configuration of the
	 */
	export interface IConfig {

		/**
		 * Number of seconds to stop if the fuzzer has not been stoped. If 0, the fuzzer will run until stop is called
		 */
		stopAfter:number;

		/**
		 * Should the fuzzer activate a onbeforunload hook?
		 */
		preventUnload:boolean;

		/**
		 * Hook to filter the selected element by the fuzzer. E.g if we want the fuzzer not to select elements
		 * in the top 50 pixels of the screen pass the following function:
		 * selectFilter: function(x, y, el) { return y > 50; };
		 * @param {number} x horrizontal position of the selected element
		 * @param {number} y vertical position of the selected element
		 * @param {Element} el selected element
		 */
		selectFilter?:(x:number, y:number, el:Element)=>boolean;

		/**
		 * Hook to highlight the element an action has been performed on (e.g a click). By default a if the action
		 * triggered dom mutations, a green border is displyed. Else a red border is displayed, which gets thicker
		 * the smaller the probability is
		 * @param {CSSStyleDeclaration} style the style object of the element the action has been performed on
		 * @param {number} acceptance acceptance probability for the next click
		 */
		highlightAction?:(style:CSSStyleDeclaration, acceptance:number)=>void;

		/**
		 * Return the lambda for the poission distribution of the number of simulatanious events. Default: 1
		 * @param {number} start starttime of the runner
		 */
		lambda?:(start:number)=>number;
	}

	/**
	 * Default implementation of the config interface
	 */
	export class Config implements IConfig {

		// run until stop is called
		stopAfter:number = 0;

		preventUnload:boolean = false;

		// hook to highlight the element an action is performed on
		highlightAction(style:CSSStyleDeclaration, acceptance:number):void {

			// if mutations have been triggerd, set the border treen
			if (acceptance == 1)
				style.border = '1px solid #4CAF50';

			// determine the border size. The smaller the acceptence, the thicker it is
			else
				style.border = Math.round(Math.log(1./acceptance)/Math.log(2)) + 'px solid #F44336';
		}
	}

	/**
	 * Start the Fuzzer
	 * @param {IConfig} config options for the fuzzer
	 */
	export function start(config:IConfig = new Config()):void {

		// make sure the runner has stopped
		stop();

		// create new runner
		Context.runner = new Runner(config);
	}

	/**
	 * Stop the Fuzzer
	 */
	export function stop(): void {
		if (Context.runner instanceof Runner)
			Context.runner.stop();
	}

	/**
	 * Class containing the state informations
	 */
	class Context {
		// active runner
		public static runner:Runner = null;
		// cache for the onbeforeunload function
		public static onbeforeunload:(ev:BeforeUnloadEvent)=>string;
		// cache for the onerror function
		public static onerror:ErrorEventHandler;
	}

	/**
	 * Runner
	 */
	class Runner {

		// DOM MutationObserver to track DOMChanges
		private observer:MutationObserver;

		// DOM Elements we currently working on
		private activeElements:Array<Element>;

		// Time, when the runner has to stop in ms
		private startTime:number;

		// how to we want to handle the observed states
		private expectedStyleChange:boolean;

		// timeout for the highlight mutations
		private mutationTimeout:number = null;

		// time the event needet to dispach. This is needet to optimize the waiting time depending on the statics of
		// the passed events
		private dispatchTime:number;

		// minimal time used for actions with dom mutations
		private minWithMutationTime:number = 0;

		// maximum time used for actions without dom mutations
		private maxWithoutMutationTime:number = 0;

		// time limit for dispaching an event to determin if a function has a javascript handler or not
		private withoutActionLimit = 0;

		// tracks if the dom has changed triggerd by the event
		private hasDOMChanged:boolean;

		// create a runner and directly start picking element
		constructor(private config:IConfig) {

			// Determine when to stop. If config.stopAfter == 0, run until stop is called
			this.startTime = performance.now();

			// initalize the mutation ovserver to observe all changes on the page
			this.observer = new MutationObserver((mutations:Array<MutationRecord>):void => {
				mutations.forEach((mutation:MutationRecord):void=>this.observe(mutation));
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
				window.onbeforeunload = ():string => {
					return 'Are you sure you want to leave the page while the SnappyFuzzer is running?!';
				};
			}

			// set the onerror function
			Context.onerror = window.onerror;
			window.onerror = (message:string, url:string, line:number, col:number, error:Error):boolean => {
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
		stop():void {

			// reset the onbeforeunload function
			if (this.config.preventUnload)
				window.onbeforeunload = Context.onbeforeunload;

			// reset the onerror function
			window.onerror = Context.onerror;

			// stop the mutation observer
			this.observer.disconnect();

			// make sure the runner stops
			this.config.stopAfter = -1;

			// remove the runner from the context
			Context.runner = null;
		}

		// generate a value with poission distribution, lambda = 1. The minimal value is 1 not 0 as normally
		// https://en.wikipedia.org/wiki/Poisson_distribution
		private poission():number {

			// initalize distribution params
			let lambda = typeof this.config.lambda == 'function' ? this.config.lambda(this.startTime) : 1;
			let L = Math.exp(-lambda);
			let k = 0;
			let p = 1;

			while (p > L) {
				++k;
				p *= Math.random();
			}
			// since we want at least one click, return 1 of the value would be zero
			return Math.max(1, k - 1);
		}

		// handle single dom mutations
		private observe(mutation:MutationRecord):void {

			// if an attribute with the prefix fuzzer has changed, its an internal attribute and it should be
			// ignored
			if (mutation.type == 'attributes' && mutation.attributeName.substr(0, 7) == 'fuzzer-')
				return;

			// if a style mutation is expected and the style the active element is mutated, we can start from scratch
			else if (
				   this.expectedStyleChange
				&& mutation.type == 'attributes'
				&& mutation.attributeName == 'style'
				&& this.activeElements.some((el):boolean=>el==mutation.target)
			)
				return this.startAction();

			// only register non hidden elements as dom mutations
			if (typeof mutation.target['offsetParent'] != 'undefined' && mutation.target['offsetParent'] !== null) {
				this.hasDOMChanged = true;

				// if new elements are introduced to the dom, check if these elements have a fuzzer acceptance
				// attribute. if so, remove the attributes
				if (mutation.type == 'childList') {
					let nodes:Array<Node> = Array.prototype.concat(mutation.addedNodes, mutation.removedNodes);
					nodes.forEach((node:Node):void => {
						if (typeof node['querySelectorAll'] == 'function')
							Array.prototype.forEach.call(
								node['querySelectorAll']('*[fuzzer-acceptance]'),
								(child:Element):void => {
									child.removeAttribute('fuzzer-acceptance');
								}
							);
					});
				}
			}
		}

		private startAction():void {

			// if function is called from a mutation clear the timout
			if (this.mutationTimeout != null) {
				clearTimeout(this.mutationTimeout);
				this.mutationTimeout = null
			}

			// check if the runner is done
			if (this.config.stopAfter != 0 && this.startTime + this.config.stopAfter * 1000 < performance.now())
				return this.stop();

			// reset the active elements array and the style changes
			this.activeElements = [];
			this.expectedStyleChange = false;

			// as long as we dont have timing statistics, only select one node to get more statistics
			let len:number = 1;
			if (this.withoutActionLimit > 0)

				// else add more elements with a poisson distribution
				len = this.poission();

			// find sutable elements
			while (this.activeElements.length < len) {

				// pick an element from the viewport
				let el:Element = this.selectElement();

				// set the value for inputs
				if (el.nodeName == 'INPUT')
					// since Element has no value field, use bracket access
					el['value'] = (Math.random() + 1).toString(36).substring(2);

				{
					// create native click event
					// do randomly hold meta keys ...
					let event:MouseEvent = new MouseEvent('click', {
						view: window,
						bubbles: true,
						cancelable: true
					});

					// dispach event to picked element
					let start = performance.now();
					el.dispatchEvent(event);
					this.dispatchTime = performance.now() - start;

				}

				// if the dispatch time is below the action limit, pick a new element
				if (this.dispatchTime < this.withoutActionLimit)
					continue;

				// we found a valid element
				this.activeElements.push(el);

			}

			// tell the user where the fuzzer performed an action
			console.log('perform action on ', this.activeElements);

			// reset the dom change tracker
			this.hasDOMChanged = false;

			// if there are no mutations, we go on after 1s
			setTimeout(this.analyzeChanges.bind(this), 1000);
		}

		// select an element from the visible part of the webpage
		private selectElement():Element {

			// pick points until a sutable element is found
			while (true) {

				// find a random element in viewport
				let x:number = Math.floor(Math.random() * window.innerWidth);
				let y:number = Math.floor(Math.random() * window.innerHeight);
				let el:Element = document.elementFromPoint(x, y);

				// if you hit the scrollbar there is no element ...
				if (el === null)
					continue;

				// if the fuzzer acceptance is set, only accept elements with the acceptance probability
				if (el.getAttribute('fuzzer-acceptance') !== null) {
					let acceptance:number = parseFloat(el.getAttribute('fuzzer-acceptance'));
					if (acceptance < Math.random())
						continue;
				}

				// if the selectFilter hook is valid check if the element passes the filter
				if (
					typeof this.config.selectFilter == 'function' &&
					!this.config.selectFilter(x, y, el)
				)
					continue;

				// the element is valid
				return el;
			}
		}

		private analyzeChanges():void {

			// only change acceptance and color if only one element is selected, else we cannot map the mutations
			// to the selected element
			if (this.activeElements.length == 1) {

				// acceptance rate of the selected element
				let acceptance:number;

				// do not reduce the acceptance of the input fields
				if (this.hasDOMChanged || this.activeElements[0].nodeName == 'INPUT') {

					// accept all selections
					acceptance = 1;

					// if the element has an acceptance reade remove it, since no attributes means acceptance of 1
					if (this.activeElements[0].getAttribute('fuzzer-acceptance') !== null)
						this.activeElements[0].removeAttribute('fuzzer-acceptance');

					// if the dispatch time is smaller than the minimal dispatch of mutated elements time, update it
					if (this.minWithMutationTime == 0 || this.dispatchTime < this.minWithMutationTime)
						this.minWithMutationTime = this.dispatchTime;

				} else {

					// acceptance rate is equal to 2**(-#<actions without mutations>)
					if (this.activeElements[0].getAttribute('fuzzer-acceptance') !== null)
						acceptance = parseFloat(this.activeElements[0].getAttribute('fuzzer-acceptance')) / 2.;
					else
						acceptance = 0.5;

					// save the acceptance rate as an attribute directly in the Element
					this.activeElements[0].setAttribute('fuzzer-acceptance', acceptance.toFixed(4));

					// if the dispatch time is bigger than the maximum dispatch time of non mutated elements, update it
					if (this.dispatchTime > this.maxWithoutMutationTime)
						this.maxWithoutMutationTime = this.dispatchTime;
				}

				// highlight the selected element
				if (typeof this.config.highlightAction == 'function') {

					// track the style change
					this.expectedStyleChange = true;

					// call the highlighter
					this.config.highlightAction(this.activeElements[0]['style'], acceptance);

					// if the style mutation does not trigger an mutation, go on after the timeout triggered
					this.mutationTimeout = setTimeout(this.startAction.bind(this), 100);

				} else
					this.startAction();

				// if the time limit for dispatch times without mutations has changed, update the limit
				let limit:number = Math.min(this.maxWithoutMutationTime, 0.8 * this.minWithMutationTime);
				if (limit > this.withoutActionLimit) {
					console.log('update without action limit to ' + limit.toFixed(2) + ' ms');
					this.withoutActionLimit = limit;
				}

			//
			} else {

				// start next action
				this.startAction();
			}
		}
	}
}
