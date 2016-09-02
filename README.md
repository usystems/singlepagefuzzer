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

The Single Page Fuzzer performs random clicks on a single page webapp. By doing so, it uncovers bugs and security issues that you would never have found otherwise. Yet, some users may encounter the bugs and have a bad experience or a clever hacker uses it to cause problems.

##Why is it better

One of the main problems for a fuzzer on a single page webapp is, that most of the clicks hit inactive elements. This wastes a lot of time. The Single Page Fuzzer uses an adaptive algorithm to weed out these wasteful clicks. And it covers the functionality of the webapp faster.

And it is super simple to use, just past the code snippet above in the browser console and start fuzziing. 
