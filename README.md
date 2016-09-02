# A Fast Fuzzer for Single Page Webapps

Single Page Fuzzer is a fast Fuzzer for Single Page Webapps. 

##Who is it for

It's only for developers of single page webapps. 

##How to use

Open your single page webapp and paste the following code in the console of your webbrowser:

```javascript
(function(el){
	el.src='https://cdn.rawgit.com/usystems/singlepagefuzzer/master/src/singlepagefuzzer.js';
	el.onload=function(){SinglePageFuzzer.start()};
	document.head.appendChild(el);
})(document.createElement('script'));
```

##What it does

The Single Page Fuzzer performs random clicks on a single page webapp. By doing so, it uncovers bugs and security 
issues that you would never have found otherwise. Yet, some users may encounter the bugs and have a bad experience or a 
clever hacker uses it to cause problems.

##Why is it better

One of the main problems for a fuzzer on a single page webapp is, that most of the clicks hit inactive elements. This 
wastes a lot of time. The Single Page Fuzzer uses an adaptive algorithm to weed out these wasteful clicks. And it 
covers the functionality of the webapp faster.

And it is super simple to use, just past the code snippet above in the browser console and start fuzziing. 

##Documentation

###Main Functions

* **`SinglePageFuzzer.start`**`(config = new SinglePageFuzzer.Config()): void`

  This is the main function to start the fuzzer.

  * **`config`**`: IConfig`
    
    Config object for the fuzzer (see below). The config object must implement the `SinglePageFuzzer.IConfig` interface. 
    If the config is not passed, an instance of `SinglePageFuzzer.SinglePageFuzzer.Config` is created.
    
  * **`return`**: `void`

* **`SinglePageFuzzer.stop`**`(): void`

  Stop the fuzzer if it is running

  * **`return`**: `void`
  
* **`SinglePageFuzzer.IConfig`**

  The Config Interface the argument of the start function must implement. This is only an Interface, so it cannot be
  instanciated as an object.
  
  * **`stopAfter`**`: number`
  
    Number of seconds to stop if the fuzzer has not been stoped. If 0, the fuzzer will run until stop is called

  * **`preventUnload`**`: boolean`
    
    Should the fuzzer activate a onbeforunload hook?

  * **`patchXMLHttpRequestSend`**`: boolean`

    Should the fuzzer patch the send method of the XMLHttpRequest object?

  * **`allowedChars`**`: string[]`

    A list of charachters the fuzzer picks uniformly to generate input values

  * **`selectFilter?`**`(x: number, y: number, el: Element): boolean`

    Optional hook to filter the selected element by the fuzzer. E.g if we want the fuzzer not to select elements
    in the top 50 pixels of the screen pass the following function:
	`selectFilter: function(x, y, el) { return y > 50; };`
	
	 * **`x`**`: number` 
	   horrizontal position of the selected element
	 * **`y`**`: number` 
	   vertical position of the selected element
	 * **`el`**`: Element` 
	   selected element
	 * **`return`**`: boolean`
	     return if the element can be selected

	 * lambda?: (start: number) => number;
		/**
		 * Return the lambda for the poisson distribution of the number of simulatanious events. Default: 1
		 * @param {number} start starttime of the runner
		 * @return {number} lambda of the poisson distribution
		 */

	 * lag?: (xhr: XMLHttpRequest, args: any[]) => number;
		/**
		 * Introduce a lag for every xhr request
		 * @param {XMLHttpRequest} xhr request object
		 * @param {any[]} args arguments, passed to the send function
		 * @return {number} miliseconds to wait befor the request is sent
		 */

	 * dropRequest?: (xhr: XMLHttpRequest, args: any[]) => boolean;
		/**
		 * Deceides if the request should be dropped before sending
		 * @param {XMLHttpRequest} xhr request object
		 * @param {any[]} args arguments, passed to the send function
		 * @return (boolean) if the request should be droped before sending
		 */

	 * dropResponse?: (xhr: XMLHttpRequest, args: any[]) => boolean;
		/**
		 * Deceides if the response from the server should be dropped
		 * @param {XMLHttpRequest} xhr request object
		 * @param {any[]} args arguments, passed to the send function
		 * @return (boolean) if the resonse from the server should be droped
		 */

	 * online?: () => number;
		/**
		 * If the fuzzer goes offline, when should it go online again
		 * @return (number) miliseconds to wait until it goes online
		 */

	 * offline?: () => number;
		/**
		 * If the fuzzer goes online, when should it go offline again
		 * @return (number) miliseconds to wait until it goes offline
		 */

	 * createEvent?: () => Event;
		/**
		 * Hook into the native even creation of the fuzzer. If this function is not provided, the fuzzer creates click,
		 * dblckick and keyboard events with 60%, 20% and 20% probability. For keyboard events the following keys
		 * are picked equally distributed: esc, tab, enter, space, delete, delete, up, left, right, down
		 * @return (Event) event to apply to a random element
		 */

* **`SinglePageFuzzer.Config`**

  Default implementation of the SinglePageFuzzer.IConfig interface

  * **`stopAfter`**`: number = 0`
    run until stop is called
  * **`preventUnload`**`: boolean = false`
    do not activate the onUnload hook
  * **`patchXMLHttpRequestSend`**`: boolean = true`
    path the XHR Class to allow to simulate a slow or lossy connection
  * **`allowedChars`**``: string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
    'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Y', 'ä', 'ö', 'ü,', 'Ä', 'Ö', 'Ü',
    'ß', 'à', 'ç', 'è', 'ê', 'ë', 'ì', 'î', 'ï', 'ò', 'ó', 'ù', 'ą', 'ć', 'ĉ', 'ę', 'ĝ', 'ĥ', 'ĵ', 'ł', 'ń',
    'œ', 'ś', 'ŝ', 'ŭ', 'ź', 'ż', '+', '%', '&', '/', '\\', '!', '^', '`', '"', '\'', '[', ']', '<', '>', ':',
    '?', ';', '{', '}', '$', ' ', '\t', '\n']``

* **`SinglePageFuzzer.normal`**`(mean: number = 0, std: number = 1, positive: boolean = false): number`

  Generate a random number from a normal distribution using the Box-Muller transformation
  https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform

  * **`mean`**`: number` 
    mean of the distribution
  * **`std`**`: number` 
    standard deviation of the distribution
  * **`positive`**`: boolean` 
    if true, the result is always bigger than 0
  * **`return`**`: number`
    random number drawn from a normal distributed

* **`SinglePageFuzzer.poisson`**`(lambda: number): number`

  Generate a random number from a poisson distribution https://en.wikipedia.org/wiki/Poisson_distribution
  
  * **`lambda`**`: number` 
    lambda of the distribution
  * **`return`**`: number` 
    random number drawn from a poisson distribution

##Example: Run the Fuzzer on a TodoMVC Example

To run the Fuzzer on a TodoMVC Example (any on http://todomvc.com) we need to add a selectFilter function to make sure
the Fuzzer only acts on descendatns of the section and ignores the aside (the sidebar left) and the footer.

For this we first create an explicit copy of the Fuzzer configuration class and add the selectFilter function to this
class.

The select filter class checks for each selected element if it is a descendant of the section and if so, return true 
(which means we keep the element) else return false (which means discard the element).

Now we start the Fuzzer with our customied config.


```javascript
(function(el){
	el.src='https://cdn.rawgit.com/usystems/singlepagefuzzer/master/src/singlepagefuzzer.js';
	el.onload=function(){
		var config = new SinglePageFuzzer.Config();
		config.selectFilter = function(x, y, el) {
			while (el !== null) {
				if (el.nodeName == 'SECTION') return true;
				else el = el.parentElement;
			}
			return false;
		};
		SinglePageFuzzer.start(config);
	};
	document.head.appendChild(el);
})(document.createElement('script'));
```