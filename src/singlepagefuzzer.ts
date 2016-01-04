/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */

namespace SinglePageFuzzer {

	'use strict';

	/**
	 * Configuration of the
	 */
	export interface IConfig {

		/**
		 * Number of seconds to stop if the fuzzer has not been stoped. If 0, the fuzzer will run until stop is called
		 */
		stopAfter: number;

		/**
		 * Should the fuzzer activate a onbeforunload hook?
		 */
		preventUnload: boolean;

		/**
		 * Should the fuzzer patch the send method of the XMLHttpRequest object?
		 */
		patchXMLHttpRequestSend: boolean;

		/**
		 * Hook to filter the selected element by the fuzzer. E.g if we want the fuzzer not to select elements
		 * in the top 50 pixels of the screen pass the following function:
		 * selectFilter: function(x, y, el) { return y > 50; };
		 * @param {number} x horrizontal position of the selected element
		 * @param {number} y vertical position of the selected element
		 * @param {Element} el selected element
		 * @return {boolean} return if the element can be selected
		 */
		selectFilter?: (x: number, y: number, el: Element) => boolean;

		/**
		 * Return the lambda for the poission distribution of the number of simulatanious events. Default: 1
		 * @param {number} start starttime of the runner
		 * @return {number} lambda of the poisson distribution
		 */
		lambda?: (start: number) => number;

		/**
		 * Introduce a lag for every xhr request
		 * @param {XMLHttpRequest} xhr request object
		 * @param {any[]} args arguments, passed to the send function
		 * @return {number} miliseconds to wait befor the request is sent
		 */
		lag?: (xhr: XMLHttpRequest, args: Array<any>) => number;

		/**
		 * Deceides if the request should be dropped before sending
		 * @param {XMLHttpRequest} xhr request object
		 * @param {any[]} args arguments, passed to the send function
		 * @return (boolean) if the request should be droped before sending
		 */
		dropRequest?: (xhr: XMLHttpRequest, args: Array<any>) => boolean;

		/**
		 * Deceides if the response from the server should be dropped
		 * @param {XMLHttpRequest} xhr request object
		 * @param {any[]} args arguments, passed to the send function
		 * @return (boolean) if the resonse from the server should be droped
		 */
		dropResponse?: (xhr: XMLHttpRequest, args: Array<any>) => boolean;

		/**
		 * If the fuzzer goes offline, when should it go online again
		 * @return (number) miliseconds to wait until it goes online
		 */
		online?: () => number;

		/**
		 * If the fuzzer goes online, when should it go offline again
		 * @return (number) miliseconds to wait until it goes offline
		 */
		offline?: () => number;
	}

	/**
	 * Default implementation of the config interface
	 */
	export class Config implements IConfig {

		// run until stop is called
		public stopAfter: number = 0;

		public preventUnload: boolean = false;

		public patchXMLHttpRequestSend: boolean = true;
	}

	/**
	 * Start the Fuzzer
	 * @param {IConfig} config options for the fuzzer
	 */
	export function start(config: IConfig = new Config()): void {

		// make sure the runner has stopped
		stop();

		// create new runner
		Context.runner = new Runner(config);
	}

	/**
	 * Generate a random number from a normal distribution using the Box-Muller transformation
	 * https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
	 * @param {number} mean mean of the distribution
	 * @param {number} std standard deviation of the distribution
	 * @param {boolean} positive if true, the result is always bigger than 0
	 * @return {number} random number drawn from a normal distributed
	 */
	export function normal(mean: number = 0, std: number = 1, positive: boolean = false): number {
		while (true) {
			let u1: number = Math.random();
			let u2: number = Math.random();
			let n01: number = Math.sqrt(-2. * Math.log(u1)) * Math.cos(2. * Math.PI * u2);
			let n: number = n01 * std + mean;
			if (!positive || n > 0) {
				return n;
			}
		}
	}

	/**
	 * Generate a random number from a poisson distribution https://en.wikipedia.org/wiki/Poisson_distribution
	 * @param {number} lambda lambda of the distribution
	 * @return {number} random number drawn from a poisson distribution
	 */
	export function poission(lambda: number): number {
		let L: number = Math.exp(-lambda);
		let k: number = 0;
		let p: number = 1;
		while (p > L) {
			++k;
			p *= Math.random();
		}
		return k - 1;
	}

	/**
	 * Stop the Fuzzer
	 */
	export function stop(): void {
		if (Context.runner instanceof Runner) {
			Context.runner.stop();
		}
	}

	/**
	 * Class containing the state informations
	 */
	class Context {
		// active runner
		public static runner: Runner = null;
		// cache for the onbeforeunload function
		public static onbeforeunload: (ev: BeforeUnloadEvent) => string;
		// cache for the onerror function
		public static onerror: ErrorEventHandler;
	}

	/**
	 * Runner
	 */
	class Runner {

		// dom MutationObserver to track DOMChanges
		private observer: MutationObserver;

		// dom Elements we currently working on
		private activeElements: Array<Element>;

		// time, when the runner has to stop in ms
		private startTime: number;

		// time the event needet to dispach. This is needet to optimize the waiting time depending on the statics of
		// the passed events
		private dispatchTime: number;

		// minimal time used for actions with dom mutations
		private minWithMutationTime: number = 0;

		// maximum time used for actions without dom mutations
		private maxWithoutMutationTime: number = 0;

		// time limit for dispaching an event to determin if a function has a javascript handler or not
		private withoutActionLimit: number = 0;

		// tracks if the dom has changed since the event was triggerd
		private hasDOMChanged: boolean;

		// used to track if all mutations are over
		private lastAction: number;

		// the original send method from the XMLHttpRequest object. Since it has many signatures, use any
		private origXMLHttpRequestSend: any;

		// should the single page fuzzer simulate an offline situation
		private offline: boolean = false;

		// the timeout handler for the on/offline change
		private lineTimeout: number = null;

		// create a runner and directly start picking element
		constructor(private config: IConfig) {

			// determine when to stop. If config.stopAfter == 0, run until stop is called
			this.startTime = performance.now();

			// initalize the mutation ovserver to observe all changes on the page
			this.observer = new MutationObserver((mutations: Array<MutationRecord>): void => {

				// update the last change time
				this.lastAction = performance.now();

				if (!this.hasDOMChanged) {
					mutations.forEach((mutation: MutationRecord): void => {

						// only register non hidden elements as dom mutations
						/* tslint:disable:no-string-literal */
						if (typeof mutation.target['offsetParent'] != 'undefined' && mutation.target['offsetParent'] !== null) {
							this.hasDOMChanged = true;
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
				window.onbeforeunload = (): string => {
					return 'Are you sure you want to leave the page while the SinglePageFuzzer is running?!';
				};
			}

			if (config.patchXMLHttpRequestSend) {
				this.origXMLHttpRequestSend = XMLHttpRequest.prototype.send;
				// use a wrapper function to keep the scope of the xhr object
				let sendProxy: (xhr: XMLHttpRequest, args: Array<any>) => void = this.sendProxy.bind(this);
				XMLHttpRequest.prototype.send = function(...args: Array<any>): void {
					sendProxy(this, args);
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
			window.onerror = (message: string, url: string, line: number, col: number, error: Error): boolean => {
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
		public stop(): void {

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
		}

		private startAction(): void {

			// check if the runner is done
			if (this.config.stopAfter != 0 && this.startTime + this.config.stopAfter * 1000 < performance.now()) {
				return this.stop();
			}

			// reset the active elements array and the style changes
			this.activeElements = [];

			// as long as we dont have timing statistics, only select one node to get more statistics
			let len: number = 1;
			if (this.withoutActionLimit > 0) {

				// else add more elements with a poisson distribution
				let lambda: number = typeof this.config.lambda == 'function' ? this.config.lambda(this.startTime) : 1;
				len = Math.max(1, poission(lambda));
			}

			// find sutable elements
			while (this.activeElements.length < len) {

				// pick an element from the viewport
				let el: Element = this.selectElement();

				// set the value for inputs
				if (el.nodeName == 'INPUT') {
					// since Element has no value field, use bracket access
					el['value'] = (Math.random() + 1).toString(36).substring(2);
				}

				{
					// create native click event
					// do randomly hold meta keys ...
					let event: MouseEvent = new MouseEvent('click', {
						view: window,
						bubbles: true,
						cancelable: true
					});

					// dispach event to picked element
					let start: number = performance.now();
					el.dispatchEvent(event);
					this.dispatchTime = performance.now() - start;
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
		}

		// check if the browser has finished the action
		private allDone(): void {
			let elapsed: number = performance.now() - this.lastAction;

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

					} else {

						// if the dispatch time is bigger than the maximum dispatch time of non mutated elements, update it
						if (this.dispatchTime > this.maxWithoutMutationTime) {
							this.maxWithoutMutationTime = this.dispatchTime;
						}
					}

					// if the time limit for dispatch times without mutations has changed, update it
					let limit: number = Math.min(this.maxWithoutMutationTime, 0.8 * this.minWithMutationTime);
					if (limit > this.withoutActionLimit) {
						console.log(`update without action limit to ${limit.toFixed(2)} ms`);
						this.withoutActionLimit = limit;
					}
				}

				// start next action
				this.startAction();

			} else {
				this.lastAction = performance.now();
				setTimeout(this.allDone.bind(this), 20);
			}
		}

		// select an element from the visible part of the webpage
		private selectElement(): Element {

			// pick points until a sutable element is found
			while (true) {

				// find a random element in viewport
				let x: number = Math.floor(Math.random() * window.innerWidth);
				let y: number = Math.floor(Math.random() * window.innerHeight);
				let el: Element = document.elementFromPoint(x, y);

				// if you hit the scrollbar there is no element ...
				if (el === null) {
					continue;
				}

				// if the selectFilter hook is valid check if the element passes the filter
				if (
					typeof this.config.selectFilter == 'function' &&
					!this.config.selectFilter(x, y, el)
				) {
					continue;
				}

				// the element is valid
				return el;
			}
		}

		// switch from online to offline state ...
		private toggleLine(): void {
			let fn: () => number = this.config[this.offline ? 'online' : 'offline'];
			if (typeof fn == 'function') {
				let duration: number = Math.round(fn());
				this.lineTimeout = setTimeout(
					(): void => {
						this.offline = !this.offline;
						console.log(`go ${this.offline ? 'offline' : 'online'} after ${(duration / 1000.).toFixed(2)} s`);
						this.toggleLine();
					},
					duration
				);
			} else {
				this.lineTimeout = null;
			}
		}

		// proxy function for the xhr send function
		private sendProxy(xhr: XMLHttpRequest, args: Array<any>): void {

			// if we are offline, every request fails ...
			if (this.offline) {

				// call the onerror handler, if the it exits, else call the onreadystatechange with xhr.status = 0
				if (typeof xhr.onerror == 'function') {
					setTimeout(xhr.onerror.bind(xhr, null));
				} else if (typeof xhr.onreadystatechange == 'function') {
					setTimeout((): void => {
						xhr.status = 0;
						for (let i: number = 0; i < 5; ++i) {
							xhr.readyState = i;
							xhr.onreadystatechange(null);
						}
					});
				}

			// do we want to drop the request?
			} else if (typeof this.config.dropRequest == 'function' && this.config.dropRequest(xhr, args)) {

				console.log('drop request');

				// if a timeout handler exits, call the timeout handler
				if (xhr.timeout && typeof xhr.ontimeout == 'function') {
					setTimeout(xhr.ontimeout, xhr.timeout);
				}

			// introduce lag if callback is provided
			} else {

				// do we want to drop the response?
				if (typeof this.config.dropResponse == 'function' && this.config.dropResponse(xhr, args)) {

					console.log('drop response');

					// if a timeout handler exits, call the timeout handler
					if (xhr.timeout && typeof xhr.ontimeout == 'function') {
						setTimeout(xhr.ontimeout, xhr.timeout);
					}

					// remove the response handlers to simulate a request loss
					xhr.onerror = null;
					xhr.onreadystatechange = null;


				// sent the request
				} else if (typeof this.config.lag == 'function') {
					setTimeout(
						(): void => this.origXMLHttpRequestSend.apply(xhr, args),
						Math.max(0, this.config.lag(xhr, args))
					);

				// else use the original send request
				} else {
					this.origXMLHttpRequestSend.apply(xhr, args);
				}
			}
		}
	}
}
