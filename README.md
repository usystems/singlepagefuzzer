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

##API

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
  
###**`SinglePageFuzzer.IConfig`**

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

* **`eventDistribution`**`: { probability: number; name: string; type: string }[]`

  The distribution of the native even creation of the fuzzer. The probabilities must add up to `1`
  If the event starts with `key` a keyCode is equally distributed picked from keyCodes
  
  e.g `{ probability: 0.5, name: 'click', type: 'HTMLEvents' }` means the fuzzer creates with a probability of
  `0.5` a click event (which is of type HTMLEvents)

* **`keyCodes`**`: number[]`

  List of key codes to pick from if a key event is simulated

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

* **`lambda?`**`(start: number) => number`
    
    Optional, return the lambda for the poisson distribution of the number of simulatanious events. Default: `1`
    
    * **`start`**`: number`
      starttime of the runner
    * **`lambda`**`: number`
      lambda of the poisson distribution

* **`lag`**`(xhr: XMLHttpRequest, args: any[]) => number`

  Optional, introduce a lag for every xhr request
  * **`xhr`**`: XMLHttpRequest`
    request object
  * **`args`**`: any[]`
    arguments, passed to the send function
  * **`return`**`: number`
    miliseconds to wait befor the request is sent

* **`dropRequest?`**`(xhr: XMLHttpRequest, args: any[]) => boolean`

  Optinal, deceides if the request should be dropped before sending
  * **`xhr`**`: XMLHttpRequest`
    request object
  * **`args`**`: any[]`
    arguments, passed to the send function
  * **`return`**`: boolean`
    if the request should be droped before sending

* **`dropResponse?`**`(xhr: XMLHttpRequest, args: any[]) => boolean`

  Optional, Deceides if the response from the server should be dropped
  * **`xgr`**`: XMLHttpRequest`
    xhr request object
  * **`args`**`: any[]`
    arguments, passed to the send function
  * **`return`**`: boolean`
    if the resonse from the server should be droped

* **`online?`**`() => number`

  If the fuzzer goes offline, when should it go online again
  * **`return`**`: number`
    miliseconds to wait until the browser goes online

* **`offline?`**`() => number`

  If the fuzzer goes online, when should it go offline again
  * **`return`**`: number`
    miliseconds to wait until it goes offline

###**`SinglePageFuzzer.Config`**

Default implementation of the SinglePageFuzzer.IConfig interface

* **`stopAfter`**`: number = 0`
run until stop is called
* **`preventUnload`**`: boolean = false`
do not activate the onUnload hook
* **`patchXMLHttpRequestSend`**`: boolean = true`
path the XHR Class to allow to simulate a slow or lossy connection
* **`allowedChars`**`: string[] = `
```javascript
['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Y', 'ä', 'ö', 'ü,', 'Ä', 'Ö', 'Ü',
'ß', 'à', 'ç', 'è', 'ê', 'ë', 'ì', 'î', 'ï', 'ò', 'ó', 'ù', 'ą', 'ć', 'ĉ', 'ę', 'ĝ', 'ĥ', 'ĵ', 'ł', 'ń',
'œ', 'ś', 'ŝ', 'ŭ', 'ź', 'ż', '+', '%', '&', '/', '\\', '!', '^', '`', '"', '\'', '[', ']', '<', '>', ':',
'?', ';', '{', '}', '$', ' ', '\t', '\n']
```

* **`eventDistribution`**`: { probability: number; name: string; type: string }[] = `
```javascript
[
	{ probability: 0.5, name: 'click', type: 'HTMLEvents' },
	{ probability: 0.2, name: 'dblclick', type: 'HTMLEvents' },
	{ probability: 0.1, name: 'submit', type: 'HTMLEvents' },
	{ probability: 0.07, name: 'keydown', type: 'Events' },
	{ probability: 0.06, name: 'keypress', type: 'Events' },
	{ probability: 0.07, name: 'keyup', type: 'Events' }
]
```

* **`keyCodes`**`: number[] = ` 
```javascript
[
	8, // backspace
	9, // tab
	13, // enter
	16, // shift
	17, // ctrl
	18, // alt
	20, // capslock
	27, // esc
	32, // space
	33, // pageup
	34, // pagedown
	35, // end
	36, // home
	37, // left
	38, // up
	39, // right
	40, // down
	45, // ins
	46, // del
	46, // delete
	91, // meta
	93, // meta
	224 // meta
]
```

###Helper Functions
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