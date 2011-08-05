/*!
 * Copyright (C) 2011, Scott Grogan
 * http://ninjascript.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
;(function($) {
	
	/** @private */
	var cache = {};

	/**
	 * xget uses the $.get() syntax, but maintains a response cache.
	 * Subsequent uses during a single page session won't generate another
	 * HTTP request. Sweet.
	 *
	 * Unlike $.get(), the callback is executed regardless of
	 * whether or not the request was successful. The callback is *always*
	 * executed within the document.window scope.
	 *
	 * Usage: $.xget(url, [data,] [callback,] [dataType])
	 * 
	 * @param {string} url
	 * 		The url to send the request to.
	 * @param {object} data
	 * 		A map of request params to send along with the request.
	 * @param {function} callback
	 *		A function to invoke after receiving a response.
	 * @param {string} dataType
	 *		The type of data the response is expected to contain.
	 */
	$.xget = function(url, data, callback, dataType)
	{
		var url = url || '';
		var key = '';
		var settings = {};
		
		// shift arguments if data argument was omitted (shameless rip from jQuery source)
		if ($.isFunction(data)) {
			dataType = dataType || callback;
			callback = data;
			data = undefined;
		}
		
		key = buildKey(url, data);
		settings = buildAjaxSettings(key, url, data, callback, dataType);

		if (!!cache[key]) {
			invokeCallback(callback, cache[key]);
		}
		else {
			$.ajax(settings);
		}
	};
	
	/**
	 * Add the responses for a number of requests to the xget cache.
	 * Requests are made in serial. If a request fails, xget will simply
	 * move on, and not add that key to the cache.
	 *
	 * The <code>urls</code> argument can contain any combination of elements
	 * in either of the following formats:
	 * <ul>
	 *	<li>['http://some.url.com']
	 *	<li>[{ url: 'http://some.url.com', data: { key: 'value' }, dataType: 'html' }]
	 * </ul>
	 *
	 * Usage $.xget.precache(urls)
	 *
	 * @param {Array} url
	 * 		A list of urls to send requests to.
	 */
	$.xget.precache = function(urls)
	{
		if (!urls instanceof Array || !urls[0]) {
			return false;
		}

		var urls = urls;
		var request = urls.shift();
		var callback = function() {
			$.xget.precache(urls);
		};

		if (request.hasOwnProperty('url')) {
			$.xget(request['url'], request['data'], callback, request['dataType']);
		}
		else {
			$.xget(request, callback);
		}
	};
	
	/**
	 * Delete one or all of the cache entries.
	 * 
	 * Usage: $.xget.invalidate([url,] [data])
	 *
	 * @param {string} url
	 *		The url of the original request.
	 * @param {object} data
	 *		A map of request params sent along with the original request.
	 */
	$.xget.invalidate = function(url, data)
	{
		if (arguments.length === 0) {
			cache = {};
		}
		else {
			var key = buildKey(url, data);
			delete cache[key];
		}
	};

	/**
	 * @private
	 * Usage: buildKey(url, [data])
	 */
	function buildKey(url, data)
	{	
		var data = data || {};
		var result = [url, data.toSource()];
		return result.join('_').replace(/\W/ig,'');
	}
	
	function removeKey(url, data) {
		
	}
	
	/**
	 * @private
	 * Usage: buildAjaxSettings(key, url, data, callback, dataType)
	 */
	function buildAjaxSettings(key, url, data, callback, dataType)
	{
		var result = {
			type: 'get',
			url: url,
			data: data,
			dataType: dataType
		};
		
		// Bust the browser cache so we always get a fresh HTTP response
		result["cache"] = false;
		
		// Handler caches the response even if no callback is provided
		result["error"] = result["success"] = function(data, textStatus, jqXHR) {
			handleResponse(key, data, textStatus, jqXHR, callback);
		};
		
		return result;
	}
	
	/**
	 * @private
	 * Usage: handleResponse(key, data, textStatus, jqXHR, callback)
	 */
	function handleResponse(key, data, textStatus, jqXHR, callback)
	{
		// Only add the response to cache on success
		if (textStatus === 'success') {
			cache[key] = {
				data: data,
				textStatus: textStatus,
				jqXHR: jqXHR
			};
		}

		// Invoke the callback regardless of success or failure
		if (typeof callback === 'function') {
			invokeCallback(callback, cache[key]);
		}
	}

	/**
	 * @private
	 * Usage: invokeCallback(callback, obj)
	 */
	function invokeCallback(callback, obj)
	{
		if (typeof callback === 'function') {
			callback.call(document.window, obj["data"], obj["textStatus"], obj["jqXHR"]);
		}
	}

}(jQuery));