"use strict";

import { urlParts } from "./urlUtils";
import utilities from "./utilityFunctions";

export function HttpRequestError(message) {
  this.message = "HttpRequest Error: " + (message || "");
}
HttpRequestError.prototype = new Error();
HttpRequestError.prototype.name = "HttpRequest Error";

export function HttpRequest(createXhr) {
  if (!utilities.isFunction(createXhr)) {
    throw new HttpRequestError("Missing XMLHttpRequest factory method");
  }

  this.createXhr = createXhr;
}

HttpRequest.prototype.run = async function (method, url, options) {
  return new Promise((resolve) => {
    sanityCheck(url, options);
    var timeout, timeoutId;
    var xhr = this.createXhr();
    options = options || {};
    timeout = utilities.isNumber(options.timeout) ? options.timeout : 0;
    var result = {}
    var getResult = new Promise((resolve, reject) => {
      xhr.open(method, urlParts(url).href, true);

      if (options.headers) {
        setHeaders(xhr, options.headers);
      }

      if (options.withCredentials) {
        xhr.withCredentials = true;
      }

      xhr.onload = function () {
        var statusText, response, status;

        /**
         * The only way to do a secure request on IE8 and IE9 is with the XDomainRequest object. Unfortunately, microsoft is
         * so nice that decided that the status property and the 'getAllResponseHeaders' method where not needed so we have to
         * fake them. If the request gets done with an XDomainRequest instance, we will assume that there are no headers and
         * the status will always be 200. If you don't like it, DO NOT USE ANCIENT BROWSERS!!!
         *
         * For mor info go to: https://msdn.microsoft.com/en-us/library/cc288060(v=vs.85).aspx
         */
        if (!xhr.getAllResponseHeaders) {
          xhr.getAllResponseHeaders = function () {
            return null;
          };
        }

        if (!xhr.status) {
          xhr.status = 200;
        }

        if (utilities.isDefined(timeoutId)) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        statusText = xhr.statusText || "";

        // responseText is the old-school way of retrieving response (supported by IE8 & 9)
        // response/responseType properties were introduced in XHR Level2 spec (supported by IE10)
        response = "response" in xhr ? xhr.response : xhr.responseText;

        // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
        status = xhr.status === 1223 ? 204 : xhr.status;

        result = {
          status: status,
          response: response,
          headerString: xhr.getAllResponseHeaders(),
          statusText: statusText,
        };
        resolve(result);
      };

      xhr.onerror = requestError;
      xhr.onabort = requestError;

      xhr.send();
    });

    if (timeout > 0) {
      timeoutId = setTimeout(function () {
        xhr && xhr.abort();
      }, timeout);
    }

    function sanityCheck(url, options) {
      if (!utilities.isString(url) || utilities.isEmptyString(url)) {
        throw new HttpRequestError("Invalid url '" + url + "'");
      }

      if (utilities.isDefined(options) && !utilities.isObject(options)) {
        throw new HttpRequestError("Invalid options map '" + options + "'");
      }
    }

    function setHeaders(xhr, headers) {
      utilities.forEach(headers, function (value, key) {
        if (utilities.isDefined(value)) {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    function requestError() {
      callback(-1, null, null, "");
    }
    getResult.then((response) => {
      resolve(response);
    });
    // console.log("sao không gán được nhỉ :((((( ", getResult);
    resolve(getResult)
  });
};

HttpRequest.prototype.get = async function (url, options) {
  const result = await this.run("GET", url, options);
  function isSuccess(status) {
    return 200 <= status && status < 300;
  }
  return new Promise((resolve, reject) => {
    if (isSuccess(result.status)) {
      resolve(result);
    } else {
      reject({ status: new HttpRequestError(result.statusText), result });
    }
  });
};

export function createXhr() {
  var xhr = new XMLHttpRequest();
  if (!("withCredentials" in xhr)) {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
  }
  return xhr;
}

export const http = new HttpRequest(createXhr);
