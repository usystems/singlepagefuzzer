/**
 * @author Lukas Gamper, lukas.gamper@usystems.ch
 * @copyright uSystems GmbH, www.usystems.ch
 */

/**
 * fuzzer module. To run the fuzzer on a web app paste the following code into the console:
 (function(el){el.src='http://example.com/snappyfuzzer.js';el.onload=Fuzzer.start();document.head.appendChild(el);})(document.createElement('script'));
 */
module SnappyFuzzer {

	/**
	 * Configuration of the
	 */
	export interface IConfig {

		/**
		 * number of seconds to stop if the fuzzer has not been stoped. If 0, the fuzzer will run until stop is called
		 */
		stopAfter:number;

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
		 * Hook to highlight the selected element. By default a purple border is displayed
		 * @param {CSSStyleDeclaration} style the style object of the selected element
		 */
		highlightSelected?:(style:CSSStyleDeclaration)=>void;

		/**
		 * Hook to highlight the element an action has been performed on (e.g a click). By default a if the action
		 * triggered dom mutations, a green border is displyed. Else a red border is displayed, which gets thicker
		 * the smaller the probability is
		 * @param {CSSStyleDeclaration} style the style object of the element the action has been performed on
		 * @param {number} acceptance acceptance probability for the next click
		 */
		highlightAction?:(style:CSSStyleDeclaration, acceptance:number)=>void;
	}

	/**
	 * Default implementation of the config interface
	 */
	export class Config implements IConfig {

		// run until stop is called
		stopAfter:number = 0;

		// hook to highlight the selected element
		highlightSelected(style:CSSStyleDeclaration):void {
			// by default a purple border is displayed
			style.border = '3px solid #9C27B0';
		}

		// hook to highlight the element an action is performed on
		highlightAction(style:CSSStyleDeclaration, acceptance:number) {

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
	}

	/**
	 * Mutation states, what should be tracked
	 */
	enum MutationStates { HIGHLIGHT_SELECTED, HIGHLIGHT_ACTION, OBSERVE}

	/**
	 * Runner
	 */
	class Runner {

		// DOM MutationObserver to track DOMChanges
		private observer:MutationObserver;

		// DOM Element wie currently working on
		private activeElement:Element;

		// Time, when the runner has to stop in ms
		private stopTime:number;

		// how to we want to handle the observed states
		private mutationState:MutationStates = MutationStates.OBSERVE;

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
			this.stopTime = config.stopAfter == 0 ? null : performance.now() + this.config.stopAfter * 1000;

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

			this.startAction();
		}

		// stop and destory the runner
		stop():void {

			// stop the mutation observer
			this.observer.disconnect();

			// make sure the runner stops
			this.stopTime = performance.now() - 1;

			// remove the runner from the context
			Context.runner = null;
		}

		// handle single dom mutations
		private observe(mutation:MutationRecord):void {

			// if an attribute with the prefix fuzzer has changed, its an internal attribute and it should be
			// ignored
			if (mutation.type == 'attributes' && mutation.attributeName.substr(0, 7) == 'fuzzer-')
				return;

			// if a style mutation is expected and the the change is change of the style attribute of the active
			// element, call the done callback
			else if (
				   this.mutationState !== MutationStates.OBSERVE
				&& mutation.type == 'attributes'
				&& mutation.attributeName == 'style'
				&& mutation.target == this.activeElement
			)
				return this.styleMutated();

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

		// the highlight action on the style has been performed, now we can go on
		styleMutated():void {

			// if function is called from a mutation clear the timout
			if (this.mutationTimeout != null) {
				clearTimeout(this.mutationTimeout);
				this.mutationTimeout = null
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
		}

		private startAction():void {

			// check if the runner is done
			if (this.stopTime !== null && this.stopTime < performance.now())
				return this.stop();

			// select an element from the viewport
			if (!this.selectElement())

				// use setTimeout to avoid huge stack traces
				setTimeout(()=>this.startAction());

			// highlight the selected element
			else if (typeof this.config.highlightSelected == 'function') {

				// track the style change
				this.mutationState = MutationStates.HIGHLIGHT_SELECTED;

				// call the highlighter
				this.config.highlightSelected(this.activeElement['style']);

				// if the style mutation does not trigger an mutation, go on after the timeout triggered
				this.mutationTimeout = setTimeout(this.styleMutated.bind(this), 100);

			} else
				this.styleMutated();
		}

		// select an element from the visible part of the webpage
		private selectElement():boolean {

			// find a random element in viewport
			let x:number = Math.floor(Math.random() * window.innerWidth);
			let y:number = Math.floor(Math.random() * window.innerHeight);
			this.activeElement = document.elementFromPoint(x, y);

			// if you hit the scrollbar there is no element ...
			if (this.activeElement === null)
				return false;

			// if the fuzzer acceptance is set, only accept elements with the acceptance probability
			if (this.activeElement.getAttribute('fuzzer-acceptance') !== null) {
				let acceptance:number = parseFloat(this.activeElement.getAttribute('fuzzer-acceptance'));
				if (acceptance < Math.random())
					return false;
			}

			// if the selectFilter hook is valid check if the element passes the filter
			if (
				typeof this.config.selectFilter == 'function' &&
				!this.config.selectFilter(x, y, this.activeElement)
			)
				return false;

			// the element is valid
			return true;
		}

		private dispatchEvent():void {

			if (this.activeElement.nodeName == 'INPUT')
				// since Element has no value field, use bracket access
				this.activeElement['value'] = (Math.random() + 1).toString(36).substring(2);

			{
				// create native click event
				let event:MouseEvent = new MouseEvent('click', {
					view: window,
					bubbles: true,
					cancelable: true
				});

				// dispach event to picked element
				let start = performance.now();
				this.activeElement.dispatchEvent(event);
				let end = performance.now();
				this.dispatchTime = end - start;
			}

			// if the dispatch time is below the action limit, only wait 10 ms instead of 1s
			let wait:number = this.dispatchTime < this.withoutActionLimit ? 10 : 1000;

			// reset the dom change tracker
			this.hasDOMChanged = false;

			// go on after mutation are over
			setTimeout(this.analyzeChanges.bind(this), wait);
		}

		private analyzeChanges():void {

			// acceptance rate of the selected element
			let acceptance:number;

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

			} else {

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

			} else
				this.styleMutated();

			// if the time limit for dispatch times without mutations has changed, update the limit
			let limit:number = Math.min(this.maxWithoutMutationTime, 0.8 * this.minWithMutationTime);
			if (limit > this.withoutActionLimit) {
				console.log('update without action limit to ' + limit.toFixed(2) + ' ms');
				this.withoutActionLimit = limit;
			}
		}
	}
}
