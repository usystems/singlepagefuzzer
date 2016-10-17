/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */

namespace SinglePageFuzzer {

	'use strict';

	/**
	 * Human readable key codes
	 */
	export const BACKSPACE: number = 8;
	export const TAB: number = 9;
	export const ENTER: number = 13;
	export const SHIFT: number = 16;
	export const CTRL: number = 17;
	export const ALT: number = 18;
	export const CAPSLOCK: number = 20;
	export const ESC: number = 27;
	export const SPACE: number = 32;
	export const PAGEUP: number = 33;
	export const PAGEDOWN: number = 34;
	export const END: number = 35;
	export const HOME: number = 36;
	export const LEFT: number = 37;
	export const UP: number = 38;
	export const RIGHT: number = 39;
	export const DOWN: number = 40;
	export const INSERT: number = 45;
	export const DELETE: number = 46;

	/**
	 * Interface for an event
	 */
	interface IEvent {

		/**
		 * name of the event, e.g. click
		 */
		name: string;

		/**
		 * Event type, e.g. HTMLEvents
		 */
		type: string;

		/**
		 * For keyboard events, a keyCode generator is attached
		 */
		keyCode?: () => number; // only used for keydown, keypress, keyup
		// TODO: add button?: number|number[]|() => number;
		// TODO: add touches?: TouchList|() => TouchList;
	}

	/**
	 * Interface for the event probabilities
	 */
	interface  IEventProbability {

		/**
		 * Probability the event list occures with
		 */
		probability: number;

		/**
		 * A list of events to dispatch
		 */
		events: IEvent[];
	}

	/**
	 * Configuration of the
	 */
	export interface IConfig {

		/**
		 * The distribution of the native even creation of the fuzzer. The probabilities must add up to 1
		 * e.g { probability: 0.5, name: 'click' } means the fuzzer creates with a probability of 0.5 a click event
		 * (which is of type HTMLEvents)
		 * If the event is a keyboard event (one of keydown, keypress, keyup) a keyCode is picked equally distributed
		 * from keyCodes
		 */
		eventDistribution?: IEventProbability[];

		/**
		 * A list of charachters the fuzzer picks uniformly to generate input values
		 */
		allowedChars?: string[];

		/**
		 * Hook to overwrite the timeout function to wait if an event happens. e.g if you are using angular, you can use
		 * $timeout to make sure the fuzzer respect the digest cicle
		 */
		timeout?: (handler: () => void, timeout: number) => void;

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
		 * In the request object, the parameters of delaying and droping the requests are specified. If the request
		 * object is passed, the send method of the XMLHttpRequest object is patched.
		 */
		request?: {

			/**
			 * Introduce a lag for every xhr request
			 * @param {XMLHttpRequest} xhr request object
			 * @param {any[]} args arguments, passed to the send function
			 * @return {number} miliseconds to wait befor the request is sent
			 */
			lag?: number|((xhr: XMLHttpRequest, args: any[]) => number);

			/**
			 * Deceides if the request should be dropped before sending
			 * @param {XMLHttpRequest} xhr request object
			 * @param {any[]} args arguments, passed to the send function
			 * @return {boolean} if the request should be droped before sending
			 */
			dropRequest?: number|((xhr: XMLHttpRequest, args: any[]) => boolean);

			/**
			 * Deceides if the response from the server should be dropped
			 * @param {XMLHttpRequest} xhr request object
			 * @param {any[]} args arguments, passed to the send function
			 * @return {boolean} if the resonse from the server should be droped
			 */
			dropResponse?: number|((xhr: XMLHttpRequest, args: any[]) => boolean);

			/**
			 * If the fuzzer goes offline, when should it go online again
			 * @return {number} miliseconds to wait until it goes online
			 */
			online?: number|(() => number);

			/**
			 * If the fuzzer goes online, when should it go offline again
			 * @return {number} miliseconds to wait until it goes offline
			 */
			offline?: number|(() => number);

		};
	}

	/**
	 * Create an event probability.
	 * @param {number} probability probability the event list occures with
	 * @param {IEvent[]} events a list of events to dispatch
	 * @return {IEventProbability} click event
	 */
	export function createEventProbability(probability: number, events: IEvent[]): IEventProbability {
		return { probability: probability, events: events };
	}

	/**
	 * Create a click event for the eventDistribution
	 * @return {IEvent} click event
	 */
	export function createClick(): IEvent {
		return { name: 'click', type: 'HTMLEvents' };
	}

	/**
	 * Create a dblclick event for the eventDistribution
	 * @return {IEvent} dblclick event
	 */
	export function createDblclick(): IEvent {
		return { name: 'dblclick', type: 'HTMLEvents' };
	}

	/**
	 * Create a submit event for the eventDistribution. A submit can only be dispatched on a from element, so if
	 * this.form is a HTMLFormElement, the submit event is dispatched on this.form else its dispatched on the
	 * element itself.
	 * @return {IEvent} submit event
	 */
	export function createSubmit(): IEvent {
		return { name: 'submit', type: 'HTMLEvents' };
	}

	/**
	 * Create a input event for the eventDistribution
	 * @return {IEvent} input event
	 */
	export function createInput(): IEvent {
		return { name: 'input', type: 'HTMLEvents' };
	}

	/**
	 * Create a keydown event for the eventDistribution
	 * @param {number|number[]|()=>number} keyCodes key code the event ist called with. The following types can be
	 * passed
	 * 	- number: the event will always have the passed number as key code
	 * 	- number[]: each time a number is coosen uniformly from the list of key codes
	 * 	- ()=>number: a function which is called for every event and return a keycode
	 * @return {IEvent} keydown event
	 */
	export function createKeydown(keyCodes?: number|number[]|(() => number)): IEvent {
		if (typeof keyCodes === 'number') {
			return { name: 'keydown', type: 'Events', keyCode: (): number => keyCodes };
		} else if (Array.isArray(keyCodes)) {
			return {
				name: 'keydown',
				type: 'Events',
				keyCode: (): number => keyCodes[Math.floor(Math.random() * keyCodes.length)]
			};
		} else if (typeof keyCodes === 'function') {
			return { name: 'keydown', type: 'Events', keyCode: keyCodes };
		} else {
			return { name: 'keydown', type: 'Events' };
		}
	}

	/**
	 * Create a keypress event for the eventDistribution
	 * @param {number|number[]|()=>number} keyCodes key code the event ist called with. The following types can be
	 * passed
	 * 	- number: the event will always have the passed number as key code
	 * 	- number[]: each time a number is coosen uniformly from the list of key codes
	 * 	- ()=>number: a function which is called for every event and return a keycode
	 * @return {IEvent} keypress event
	 */
	export function createKeypress(keyCodes?: number|number[]|(() => number)): IEvent {
		if (typeof keyCodes === 'number') {
			return { name: 'keypress', type: 'Events', keyCode: (): number => keyCodes };
		} else if (Array.isArray(keyCodes)) {
			return {
				name: 'keypress',
				type: 'Events',
				keyCode: (): number => keyCodes[Math.floor(Math.random() * keyCodes.length)]
			};
		} else if (typeof keyCodes === 'function') {
			return { name: 'keypress', type: 'Events', keyCode: keyCodes };
		} else {
			return { name: 'keypress', type: 'Events' };
		}
	}

	/**
	 * Create a keyup event for the eventDistribution
	 * @param {number|number[]|()=>number} keyCodes key code the event ist called with. The following types can be
	 * passed
	 * 	- number: the event will always have the passed number as key code
	 * 	- number[]: each time a number is coosen uniformly from the list of key codes
	 * 	- ()=>number: a function which is called for every event and return a keycode
	 * @return {IEvent} keyup event
	 */
	export function createKeyup(keyCodes?: number|number[]|(() => number)): IEvent {
		if (typeof keyCodes === 'number') {
			return { name: 'keyup', type: 'Events', keyCode: (): number => keyCodes };
		} else if (Array.isArray(keyCodes)) {
			return {
				name: 'keyup',
				type: 'Events',
				keyCode: (): number => keyCodes[Math.floor(Math.random() * keyCodes.length)]
			};
		} else if (typeof keyCodes === 'function') {
			return { name: 'keyup', type: 'Events', keyCode: keyCodes };
		} else {
			return { name: 'keyup', type: 'Events' };
		}
	}

	/**
	 * Create a touchstart event for the eventDistribution
	 * @return {IEvent} touchstart event
	 */
	export function createTouchstart(): IEvent {
		return { name: 'touchstart', type: 'TouchEvent' };
	}

	/**
	 * Create a touchend event for the eventDistribution
	 * @return {IEvent} touchend event
	 */
	export function createTouchend(): IEvent {
		return { name: 'touchend', type: 'TouchEvent' };
	}

	/**
	 * Create a touchmove event for the eventDistribution
	 * @return {IEvent} touchmove event
	 */
	export function createTouchmove(): IEvent {
		return { name: 'touchmove', type: 'TouchEvent' };
	}

	/**
	 * Create a touchcancel event for the eventDistribution
	 * @return {IEvent} touchcancel event
	 */
	export function createTouchcancel(): IEvent {
		return { name: 'touchcancel', type: 'TouchEvent' };
	}

	/**
	 * Create a mouseenter event for the eventDistribution
	 * @return {IEvent} mouseenter event
	 */
	export function createMouseenter(): IEvent {
		return { name: 'mouseenter', type: 'MouseEvents' };
	}

	/**
	 * Create a mouseover event for the eventDistribution
	 * @return {IEvent} mouseover event
	 */
	export function createMouseover(): IEvent {
		return { name: 'mouseover', type: 'MouseEvents' };
	}

	/**
	 * Create a mousemove event for the eventDistribution
	 * @return {IEvent} mousemove event
	 */
	export function createMousemove(): IEvent {
		return { name: 'mousemove', type: 'MouseEvents' };
	}

	/**
	 * Create a mousedown event for the eventDistribution
	 * @return {IEvent} mousedown event
	 */
	export function createMousedown(): IEvent {
		return { name: 'mousedown', type: 'MouseEvents' };
	}

	/**
	 * Create a mouseup event for the eventDistribution
	 * @return {IEvent} mouseup event
	 */
	export function createMouseup(): IEvent {
		return { name: 'mouseup', type: 'MouseEvents' };
	}

	/**
	 * Create a mouseleave event for the eventDistribution
	 * @return {IEvent} mouseleave event
	 */
	export function createMouseleave(): IEvent {
		return { name: 'mouseleave', type: 'MouseEvents' };
	}

	/**
	 * Create a mouseout event for the eventDistribution
	 * @return {IEvent} mouseout event
	 */
	export function createMouseout(): IEvent {
		return { name: 'mouseout', type: 'MouseEvents' };
	}

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
	export function start(config: IConfig): void {

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
		let n: number = null;
		while (n === null) {
			let u1: number = Math.random();
			let u2: number = Math.random();
			let n01: number = Math.sqrt(-2. * Math.log(u1)) * Math.cos(2. * Math.PI * u2);
			n = n01 * std + mean;
			if (positive && n <= 0) {
				n = null;
			}
		}
		return n;
	}

	/**
	 * Generate a random number from a poisson distribution https://en.wikipedia.org/wiki/Poisson_distribution
	 * @param {number} lambda lambda of the distribution
	 * @return {number} random number drawn from a poisson distribution
	 */
	export function poisson(lambda: number): number {
		let L: number = Math.exp(-lambda);
		let k: number = 0;
		let p: number = 1;
		while (p > L) {
			k += 1;
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
		// cache for the onerror function
		public static onerror: ErrorEventHandler;
	}

	/**
	 * Runner
	 */
	class Runner {

		// functino to get a timestamp in microseconds
		private now: () => number;

		// dom MutationObserver to track DOMChanges
		private observer: MutationObserver;

		// dom Elementswe currently working on
		private activeElement: Element;

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

		// a cumulative version of the event distribution
		private cumulativeEventDistribution: IEventProbability[] = [];

		// A list of charachters the fuzzer picks uniformly to generate input values
		private allowedChars: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
			'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
			'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Y', 'ä', 'ö', 'ü,', 'Ä', 'Ö', 'Ü',
			'ß', 'à', 'ç', 'è', 'ê', 'ë', 'ì', 'î', 'ï', 'ò', 'ó', 'ù', 'ą', 'ć', 'ĉ', 'ę', 'ĝ', 'ĥ', 'ĵ', 'ł', 'ń',
			'œ', 'ś', 'ŝ', 'ŭ', 'ź', 'ż', '+', '%', '&', '/', '\\', '!', '^', '`', '"', '\'', '[', ']', '<', '>', ':',
			'?', ';', '{', '}', '$', ' ', '\t', '\n'];

		// In the request object, the parameters of delaying and droping the requests are specified
		private request: {
			lag?: (xhr: XMLHttpRequest, args: any[]) => number;
			dropRequest?: (xhr: XMLHttpRequest, args: any[]) => boolean;
			dropResponse?: (xhr: XMLHttpRequest, args: any[]) => boolean;
			online?: () => number;
			offline?: () => number;
		} = null;

		// timeout funciton to use
		private timeout: (handler: () => void, timeout: number) => number =
			(handler: () => void, timeout: number): number => setTimeout(handler, timeout);

		// hook to filter the selected element
		private selectFilter: (x: number, y: number, el: Element) => boolean = null;

		// create a runner and directly start picking element
		constructor(config: IConfig = {}) {

			// initalize the now function, if performance.now exits use it, else use Date.now
			if ('performance' in window) {
				this.now = () => performance.now();
			} else {
				this.now = () => Date.now();
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
			let eventDistribution: IEventProbability[] = config.eventDistribution;
			if (!Array.isArray(eventDistribution)) {
				eventDistribution = [SinglePageFuzzer.createEventProbability(1, [SinglePageFuzzer.createClick()])];
			}
			let cumulativeProbability: number = 0;
			this.cumulativeEventDistribution = eventDistribution
				.map(({ probability, events }): { probability: number, events: IEvent[] } => {
					cumulativeProbability += probability;
					return { probability: cumulativeProbability, events: events };
				});
			if (this.cumulativeEventDistribution[this.cumulativeEventDistribution.length - 1].probability != 1) {
				console.error(
					'The event probabilities do not add up to 1, but to ' +
					this.cumulativeEventDistribution[this.cumulativeEventDistribution.length - 1].probability
				);
				return;
			}

			// if the request is passed overwrite the send funtion of the XHR object
			if (typeof config.request === 'object') {
				this.origXMLHttpRequestSend = XMLHttpRequest.prototype.send;
				// use a wrapper function to keep the scope of the xhr object
				let sendProxy: (xhr: XMLHttpRequest, args: any[]) => void = this.sendProxy.bind(this);
				XMLHttpRequest.prototype.send = function(...args: any[]): void {
					sendProxy(this, args);
				};

				// create request function
				this.request = {};

				// set the lag, online and offline function
				['lag', 'online', 'offline'].forEach(name => {
					if (typeof config.request[name] === 'number') {
						this.request[name] = (): number => config.request[name];
					} else if (typeof config.request[name] === 'function') {
						this.request[name] = config.request[name];
					}
				});

				// set the dropRequest and dropResponse function
				['dropRequest', 'dropResponse'].forEach(name => {
					if (typeof config.request[name] === 'number') {
						this.request[name] = (): boolean => Math.random() < config.request[name];
					} else if (typeof config.request[name] === 'function') {
						this.request[name] = config.request[name];
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
			window.onerror = (message: string, url: string, line: number, col: number, error: Error): boolean => {
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
		public stop(): void {

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
			this.timeout = (): number => 0;

			// remove the runner from the context
			Context.runner = null;
		}

		// initalize the mutation ovserver to observe all changes on the page
		private initalizeObserver(): void {
			this.observer = new MutationObserver((mutations: MutationRecord[]): void => {

				// update the last change time
				this.lastAction = this.now();

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
		}

		private startAction(): void {

			// select an active element
			this.selectActiveElement();

			// reset the dom change tracker
			this.hasDOMChanged = false;

			// wait until all mutations are done
			this.lastAction = this.now();

			// if no timeout is passed from the user, use the native one
			this.timeout(() => this.allDone(), 20);
		}

		private selectActiveElement(): void {

			// pick an element from the viewport
			let el: Element;
			let x: number;
			let y: number;
			[el, x, y] = this.selectElement();

			// set the value for inputs
			if (el.nodeName == 'INPUT') {

				// empty the input value
				el['value'] = '';

				// generate a random number of chars, in average 16
				for (let i: number = poisson(16); i > 0; i -= 1) {
					el['value'] += this.allowedChars[
						Math.floor(Math.random() * this.allowedChars.length)
					];
				}
			}

			{
				// pick the event
				let probability: number = 0;
				let events: IEvent[] = [];

				const rng: number = Math.random();
				for ({ probability, events } of this.cumulativeEventDistribution) {
					if (rng < probability) {
						break;
					}
				}

				// dispach events to picked element and use the longest event time as dispatch time
				this.dispatchTime = Math.max(...events
					// map to native event, dispatch and measure time
					.map(event => this.createEvent(event, el, x, y))
				);
			}

			// if the dispatch time is below the action limit, select a new element
			if (this.dispatchTime < this.withoutActionLimit) {
				this.selectActiveElement();

			// else use the current one
			} else {
				this.activeElement = el;
			}
		}

		// select an element from the visible part of the webpage
		private selectElement(): [Element, number, number] {

			// selected element to act on
			let el: Element = null;
			let x: number;
			let y: number;

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
					!this.selectFilter(x, y, el)
				) {
					el = null;
				}
			}

			// the element is valid
			return [el, x, y];
		}

		private createEvent(props: IEvent, el: Element, x: number, y: number): number {

			// since switch is scope free, declare the event variable here
			let event: Event;

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
					event['touches'] = document.createTouchList(
						document.createTouch(window, el, 0, window.scrollX + x, window.scrollY + y, x, y)
					);
					break;

				case 'MouseEvents':
					event = document.createEvent('MouseEvents');
					event['initMouseEvent'](
						props.name,
						true, // bubbles
						props.name != 'mousemove', // cancelable
						window, // view
						0, // detail
						x, //screenX
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
					break;

				case 'Events':

					let keyCode: number = null;
					let eventName: string = props.name;
					if (props.hasOwnProperty('keyCode')) {
						keyCode = props.keyCode[Math.floor(Math.random() * props.keyCode.length)];

						// no keypress / keydown for modifiers
						if ([16 , 17, 18, 91].indexOf(keyCode) > -1) {
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

			let start: number = this.now();
			el.dispatchEvent(event);
			return this.now() - start;
		}

		// check if the browser has finished the action
		private allDone(): void {
			let elapsed: number = this.now() - this.lastAction;

			// if a dom mutation has occured, or some backround javascript is running, wait for another 20 ms
			if (elapsed >= 20 && elapsed < 25) {

				// do not reduce the acceptance of the input fields
				if (this.hasDOMChanged || this.activeElement.nodeName == 'INPUT') {

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

				// start next action
				this.startAction();

			} else {
				this.lastAction = this.now();

				// if no timeout is passed from the user, use the native one
				this.timeout(() => this.allDone(), 20);
			}
		}

		// switch from online to offline state ...
		private toggleLine(): void {
			let fn: () => number = this.request[this.offline ? 'online' : 'offline'];
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
		private sendProxy(xhr: XMLHttpRequest, args: any[]): void {

			// if we are offline, every request fails ...
			if (this.offline) {

				// call the onerror handler, if the it exits, else call the onreadystatechange with xhr.status = 0
				if (typeof xhr.onerror === 'function') {
					setTimeout(xhr.onerror.bind(xhr, null));
				} else if (typeof xhr.onreadystatechange === 'function') {
					setTimeout((): void => {
						xhr.status = 0;
						for (let i: number = 0; i < 5; i += 1) {
							xhr.readyState = i;
							xhr.onreadystatechange(null);
						}
					});
				}

			// do we want to drop the request?
			} else if (typeof this.request.dropRequest === 'function' && this.request.dropRequest(xhr, args)) {

				console.log('drop request');

				// if a timeout handler exits, call the timeout handler
				if (xhr.timeout && typeof xhr.ontimeout == 'function') {
					setTimeout(
						(): void => xhr.ontimeout(null),
						xhr.timeout
					);
				}

			// introduce lag if callback is provided
			} else {

				// do we want to drop the response?
				if (typeof this.request.dropResponse == 'function' && this.request.dropResponse(xhr, args)) {

					console.log('drop response');

					// if a timeout handler exits, call the timeout handler
					if (xhr.timeout && typeof xhr.ontimeout == 'function') {
						setTimeout(
							(): void => xhr.ontimeout(null),
							xhr.timeout
						);
					}

					// remove the response handlers to simulate a request loss
					xhr.onerror = null;
					xhr.onreadystatechange = null;


				// sent the request
				} else if (typeof this.request.lag == 'function') {
					setTimeout(
						(): void => this.origXMLHttpRequestSend.apply(xhr, args),
						Math.max(0, this.request.lag(xhr, args))
					);

				// else use the original send request
				} else {
					this.origXMLHttpRequestSend.apply(xhr, args);
				}
			}
		}
	}
}
