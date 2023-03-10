"use strict";

import Ad from "./Ad";
import VASTError from "./VASTError";
import VASTResponse from "./VASTResponse";
import vastUtil from "./vastUtil";

import { http } from "../../utils/http";
import utilities from "../../utils/utilityFunctions";
import xml from "../../utils/xml";

import logger from "../../utils/consoleLogger";

function VASTClient(options) {
  if (!(this instanceof VASTClient)) {
    return new VASTClient(options);
  }
  var defaultOptions = {
    WRAPPER_LIMIT: 5,
  };

  options = options || {};
  this.settings = utilities.extend({}, options, defaultOptions);
  this.errorURLMacros = [];
}

VASTClient.prototype.getVASTResponse = function getVASTResponse(adTagUrl) {
  var that = this;

  var error = sanityCheck(adTagUrl);
  if (error) {
    throw error;
  }
  function sanityCheck(adTagUrl) {
    if (!adTagUrl) {
      return new VASTError("on VASTClient.getVASTResponse, missing ad tag URL");
    }
  }
  return new Promise((resolve, reject) => {
    // async.waterfall([
    //     _getVASTAd(adTagUrl),
    //     buildVASTResponse
    //   ]);
    function getVASTAd() {
      return new Promise(function (resolve) {
        console.log("adTagUrl", adTagUrl);
        resolve(_getVASTAd(adTagUrl));
      });
    }

    getVASTAd().then((vastAd) => {
      console.log("AdsChain: ", JSON.stringify(vastAd));
      resolve(buildVASTResponse(vastAd));
    });

    /*** Local functions ***/
    function buildVASTResponse(adsChain) {
      try {
        var response = that._buildVASTResponse(adsChain);
        return response;
      } catch (e) {
        return e;
      }
    }
  });
};

function _getVASTAd(adTagUrl) {
  var that = this;

  // getAdWaterfall(adTagUrl);
  // console.log("Ad tag XML: =====",getAdWaterfall(adTagUrl));
  /*** Local functions ***/
  return new Promise((resolve) => {
    function getAdWaterfall() {
      return new Promise((resolve) => {
        console.log(adTagUrl);
        resolve(requestVASTXml(adTagUrl));
      });
    }

    getAdWaterfall().then((xmlStr) => {
      // console.log("======== requestVASTXml =================", xmlStr.response);
      resolve(buildVastWaterfall(xmlStr.response));
    });
  });

  function validateVASTTree(vastTree) {
    var vastVersion = xml.attr(vastTree, "version");

    if (!vastTree.ad) {
      return new VASTError(
        "on VASTClient.getVASTAd.validateVASTTree, no Ad in VAST tree",
        303
      );
    }

    if (vastVersion && vastVersion != 3 && vastVersion != 2) {
      return new VASTError(
        'on VASTClient.getVASTAd.validateVASTTree, not supported VAST version "' +
          vastVersion +
          '"',
        102
      );
    }

    return null;
  }

  async function getAd(adTagUrl, adChain) {
    if (adChain.length >= 5) {
      return validateAd(
        new VASTError(
          "on VASTClient.getVASTAd.getAd, players wrapper limit reached (the limit is " +
            5 +
            ")",
          302
        )
      );
    }

    function _getAd() {
      return new Promise((resolve, reject) => {
        if (utilities.isString(adTagUrl)) {
          resolve(requestVASTAd(adTagUrl, next));
        } else {
          resolve(adTagUrl);
        }
      });
    }

    let a = await _getAd().then((adJxonTree) => {
      console.log("--------------- adJxonTree ------------------", adJxonTree);
      let b = buildAd(adJxonTree, adChain);
      return b;
    });

    return a;
  }

  function buildAd(adJxonTree, adChain) {
    try {
      var ad = new Ad(adJxonTree);
      if (ad) {
        adChain.push(ad);
      }

      if (validateAd(ad)) {
        return error;
      }

      if (ad.wrapper) {
        return getAd(ad.wrapper.VASTAdTagURI, adChain);
      }

      return adChain;
    } catch (e) {
      return new VASTError(
        "on VASTClient.getVASTAd.buildAd, error parsing xml",
        100
      );
    }
  }

  function validateAd(ad) {
    var wrapper = ad.wrapper;
    var inLine = ad.inLine;
    var errMsgPrefix = "on VASTClient.getVASTAd.validateAd, ";

    if (inLine && wrapper) {
      return new VASTError(
        errMsgPrefix + "InLine and Wrapper both found on the same Ad",
        101
      );
    }

    if (!inLine && !wrapper) {
      return new VASTError(
        errMsgPrefix + "nor wrapper nor inline elements found on the Ad",
        101
      );
    }

    if (inLine && !inLine.isSupported()) {
      return new VASTError(
        errMsgPrefix +
          "could not find MediaFile that is supported by this video player",
        403
      );
    }

    if (wrapper && !wrapper.VASTAdTagURI) {
      return new VASTError(
        errMsgPrefix + "missing 'VASTAdTagURI' in wrapper",
        101
      );
    }

    return null;
  }

  async function requestVASTAd(adTagUrl) {
    await requestVASTXml(adTagUrl);
  }

  function buildVastWaterfall(xmlStr) {
    var vastTree;
    try {
      vastTree = xml.toJXONTree(xmlStr);
      logger.debug("built JXONTree from VAST response:", vastTree);

      if (utilities.isArray(vastTree.ad)) {
        vastTree.ads = vastTree.ad;
      } else if (vastTree.ad) {
        vastTree.ads = [vastTree.ad];
      } else {
        vastTree.ads = [];
      }

      console.log("---------- VastTree:", vastTree);

      // check ads
      let checkErr = validateVASTTree(vastTree);

      var waterfallAds =
        vastTree && utilities.isArray(vastTree.ads)
          ? vastTree.ads
          : null;

      if (checkErr) {
        _trackError(checkErr, waterfallAds);
        return callback(checkErr, vastTree);
      }

      let urlAds = waterfallAds.shift();

      console.log("------ vastTree.ads ----------", vastTree);
      console.log("------ waterfallAds ----------", waterfallAds);

      let adChain = [];
      getAd(urlAds, adChain);

      /*** Local functions ***/
      // Callback này dùng để lấy giá trị từ getAd ra ngoài, đó chính là adChain, mà adChain ban đầu là 1 mảng rỗng, khi vào getAd nó sẽ được thêm 1 Ad từ JSONTree đã chyuyeern vào
      if (checkErr) {
        _trackError(checkErr, adChain);

        if (waterfallAds.length > 0) {
          let urlAds = waterfallAds.shift();
          getAd(urlAds, adChain);
        } else {
          return checkErr;
        }
      } else {
        console.log("adChain tại hàm build Vast waterfall: ", adChain);
        return adChain;
      }

      // return vastTree;
    } catch (e) {
      return new VASTError(
        "on VASTClient.getVASTAd.buildVastWaterfall, error parsing xml",
        100
      );
    }
  }
}

async function requestVASTXml(adTagUrl) {
  try {
    if (utilities.isFunction(adTagUrl)) {
      adTagUrl(requestHandler);
    } else {
      logger.info("requesting adTagUrl: " + adTagUrl);
      const response = await http.get(adTagUrl, {
        withCredentials: true,
      });
      if (response.error) {
        var errMsg = utilities.isDefined(response.status)
          ? "on VASTClient.requestVastXML, HTTP request error with status '" +
            response.status +
            "'"
          : "on VASTClient.requestVastXML, Error getting the the VAST XML with he passed adTagXML fn";
        return new VASTError(errMsg, 301);
      }
      return response;
    }
  } catch (e) {
    return e;
  }

  /*** Local functions ***/
  function requestHandler(error, response, status) {
    console.log({ error, response, status });
    if (error) {
      var errMsg = utilities.isDefined(status)
        ? "on VASTClient.requestVastXML, HTTP request error with status '" +
          status +
          "'"
        : "on VASTClient.requestVastXML, Error getting the the VAST XML with he passed adTagXML fn";
      return callback(new VASTError(errMsg, 301), null);
    }

    return response;
  }
}

VASTClient.prototype._buildVASTResponse = function buildVASTResponse(adsChain) {
  var response = new VASTResponse();
  console.log(
    "response vvresponse response response response response",
    response
  );
  addAdsToResponse(response, adsChain);
  validateResponse(response);
  return response;

  //*** Local function ****
  function addAdsToResponse(response, ads) {
    console.log("ads adsdads: ", ads);
    console.log("ads adsdads response: ", response);
    ads.forEach(function (ad) {
      response.addAd(ad);
    });
  }

  function validateResponse(response) {
    var progressEvents = response.trackingEvents.progress;

    if (!response.hasLinear()) {
      throw new VASTError(
        "on VASTClient._buildVASTResponse, Received an Ad type that is not supported",
        200
      );
    }

    if (response.duration === undefined) {
      throw new VASTError(
        "on VASTClient._buildVASTResponse, Missing duration field in VAST response",
        101
      );
    }

    if (progressEvents) {
      progressEvents.forEach(function (progressEvent) {
        if (!utilities.isNumber(progressEvent.offset)) {
          throw new VASTError(
            "on VASTClient._buildVASTResponse, missing or wrong offset attribute on progress tracking event",
            101
          );
        }
      });
    }
  }
};

function _trackError(error, adChain) {
  if (!utilities.isArray(adChain) || adChain.length === 0) {
    //There is nothing to track
    return;
  }

  var errorURLMacros = [];
  adChain.forEach(addErrorUrlMacros);
  vastUtil.track(errorURLMacros, { ERRORCODE: error.code || 900 }); //900 <== Undefined error

  /*** Local functions  ***/
  function addErrorUrlMacros(ad) {
    if (ad.wrapper && ad.wrapper.error) {
      errorURLMacros.push(ad.wrapper.error);
    }

    if (ad.inLine && ad.inLine.error) {
      errorURLMacros.push(ad.inLine.error);
    }
  }
}

export default VASTClient;
