# SnappyFuzzer
Fuzzer for webapps. To run paste the following line to your console:

```javascript
(function(el){
	el.src='https://cdn.rawgit.com/usystems/snappyfuzzer/master/src/snappyfuzzer.js';
	el.onload=function(){SnappyFuzzer.start()};
	document.head.appendChild(el);
})(document.createElement('script'));
```