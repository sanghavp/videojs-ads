import videojs from "video.js";

import contribAdsPlugin from "../contrib_ads/plugin.js";
import VASTClient from "../vast-vpaid/scripts/ads/vast/VASTClient.js";
import utilities from "../vast-vpaid/scripts/utils/utilityFunctions.js";
import ImaPlugin from "../videojs-ima/ima-plugin.js";
import VASTPlugin from "../vast-vpaid/scripts/plugin/videojs.vast.vpaid.js";

const parserXmlPlugin = async function (player, options) {
    console.log("Tham số truyền vào plugin: ", { player, options });

    var defaultOpts = {
        // maximum amount of time in ms to wait to receive `adsready` from the ad
        // implementation after play has been requested. Ad implementations are
        // expected to load any dynamic libraries and make any requests to determine
        // ad policies for a video during this time.
        timeout: 500,

        //TODO:finish this IOS FIX
        //Whenever you play an add on IOS, the native player kicks in and we loose control of it. On very heavy pages the 'play' event
        // May occur after the video content has already started. This is wrong if you want to play a preroll ad that needs to happen before the user
        // starts watching the content. To prevent this usec
        iosPrerollCancelTimeout: 2000,

        // maximun amount of time for the ad to actually start playing. If this timeout gets
        // triggered the ads will be cancelled
        adCancelTimeout: 5000,

        // Boolean flag that configures the player to play a new ad before the user sees the video again
        // the current video
        playAdAlways: false,

        // Flag to enable or disable the ads by default.
        adsEnabled: true,

        // Boolean flag to enable or disable the resize with window.resize or orientationchange
        autoResize: true,

        // Path to the VPAID flash ad's loader
        vpaidFlashLoaderPath: "/VPAIDFlash.swf",

        // verbosity of console logging:
        // 0 - error
        // 1 - error, warn
        // 2 - error, warn, info
        // 3 - error, warn, info, log
        // 4 - error, warn, info, log, debug
        verbosity: 0,
    };

    var settings = utilities.extend({}, defaultOpts, options || {});

    const adsPluginSettings = {
        debug: false,
        prerollTimeout: 1000,
        timeout: 5000,
        adsCancelTimeout: 15000,
    };

    player.contribAds = new contribAdsPlugin(adsPluginSettings, player);

    // start get ad response
    const vast = VASTClient();

    let urlXml = !!settings.adTagUrl ? settings.adTagUrl : settings.adTagXML
    const vastResponse = await vast.getVASTResponse(urlXml);
    console.log("vastResponse", vastResponse);
    // end get ad response

    // Phân loại quảng cáo
    const checkAds = vastResponse.mediaFiles.find((Element) => {
        return Element.src.includes('imasdk') || Element.src.includes('google')
    })
    // player.vastClient = VASTPlugin(vastResponse, player);
    // Object.assign(options, {response: vastResponse})
    // player.ima = new ImaPlugin(player, options);
    if (checkAds) {
        player.ima = new ImaPlugin(player, options);
    } else {
        player.vastClient = VASTPlugin(vastResponse, player);
    }
};

const init = function (options) {
    this.parseXML = parserXmlPlugin(this, options);
};
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin("parserXml", init);
// return parserXml;
