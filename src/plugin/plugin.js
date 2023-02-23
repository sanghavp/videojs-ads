import videojs from "video.js";

import contribAdsPlugin from "../contrib_ads/plugin.js";
import ImaPlugin from "../videojs-ima/ima-plugin.js";
import VASTPlugin from "../vast-vpaid/scripts/plugin/videojs.vast.vpaid.js";

const parserXmlPlugin = function (player, url) {
    console.log("Tham số truyền vào plugin: ", { player, url });
    var xml = {};

    const adsPluginSettings = {
        debug: false,
        prerollTimeout: 1000,
        timeout: 5000,
    }

    player.contribAds = new contribAdsPlugin(adsPluginSettings, player);

    //utility Function
    function decapitalize(s) {
        return s.charAt(0).toLowerCase() + s.slice(1);
    }

    xml.strToXMLDoc = function strToXMLDoc(stringContainingXMLSource) {
        //IE 8
        if (typeof window.DOMParser === "undefined") {
            var xmlDocument = new ActiveXObject("Microsoft.XMLDOM");
            xmlDocument.async = false;
            xmlDocument.loadXML(stringContainingXMLSource);
            return xmlDocument;
        }

        return parseString(stringContainingXMLSource);

        function parseString(stringContainingXMLSource) {
            var parser = new DOMParser();
            var parsedDocument;

            //Note: This try catch is to deal with the fact that on IE parser.parseFromString does throw an error but the rest of the browsers don't.
            try {
                parsedDocument = parser.parseFromString(
                    stringContainingXMLSource,
                    "application/xml"
                );

                if (
                    isParseError(parsedDocument) ||
                    !(typeof stringContainingXMLSource === "string") ||
                    stringContainingXMLSource.length === 0
                ) {
                    throw new Error();
                }
            } catch (e) {
                throw new Error(
                    "xml.strToXMLDOC: Error parsing the string: '" +
                    stringContainingXMLSource +
                    "'"
                );
            }
            console.log(parsedDocument);
            return parsedDocument;
        }

        function isParseError(parsedDocument) {
            try {
                // parser and parsererrorNS could be cached on startup for efficiency
                var parser = new DOMParser(),
                    erroneousParse = parser.parseFromString("INVALID", "text/xml"),
                    parsererrorNS =
                        erroneousParse.getElementsByTagName("parsererror")[0].namespaceURI;

                if (parsererrorNS === "http://www.w3.org/1999/xhtml") {
                    // In PhantomJS the parseerror element doesn't seem to have a special namespace, so we are just guessing here :(
                    return parsedDocument.getElementsByTagName("parsererror").length > 0;
                }

                return (
                    parsedDocument.getElementsByTagNameNS(parsererrorNS, "parsererror")
                        .length > 0
                );
            } catch (e) {
                //Note on IE parseString throws an error by itself and it will never reach this code. Because it will have failed before
            }
        }
    };

    xml.parseText = function parseText(sValue) {
        if (/^\s*$/.test(sValue)) {
            return null;
        }
        if (/^(?:true|false)$/i.test(sValue)) {
            return sValue.toLowerCase() === "true";
        }
        if (isFinite(sValue)) {
            return parseFloat(sValue);
        }
        return sValue.trim();
    };

    xml.JXONTree = function JXONTree(oXMLParent) {
        var parseText = xml.parseText;

        //The document object is an especial object that it may miss some functions or attrs depending on the browser.
        //To prevent this problem with create the JXONTree using the root childNode which is a fully fleshed node on all supported
        //browsers.
        if (oXMLParent.documentElement) {
            return new xml.JXONTree(oXMLParent.documentElement);
        }

        if (oXMLParent.hasChildNodes()) {
            var sCollectedTxt = "";
            for (
                var oNode, sProp, vContent, nItem = 0;
                nItem < oXMLParent.childNodes.length;
                nItem++
            ) {
                oNode = oXMLParent.childNodes.item(nItem);
                /*jshint bitwise: false*/
                if (((oNode.nodeType - 1) | 1) === 3) {
                    sCollectedTxt +=
                        oNode.nodeType === 3 ? oNode.nodeValue.trim() : oNode.nodeValue;
                } else if (oNode.nodeType === 1 && !oNode.prefix) {
                    sProp = decapitalize(oNode.nodeName);
                    vContent = new xml.JXONTree(oNode);
                    if (this.hasOwnProperty(sProp)) {
                        if (this[sProp].constructor !== Array) {
                            this[sProp] = [this[sProp]];
                        }
                        this[sProp].push(vContent);
                    } else {
                        this[sProp] = vContent;
                    }
                }
            }
            if (sCollectedTxt) {
                this.keyValue = parseText(sCollectedTxt);
            }
        }

        //IE8 Stupid fix
        var hasAttr =
            typeof oXMLParent.hasAttributes === "undefined"
                ? oXMLParent.attributes.length > 0
                : oXMLParent.hasAttributes();
        if (hasAttr) {
            var oAttrib;
            for (var nAttrib = 0; nAttrib < oXMLParent.attributes.length; nAttrib++) {
                oAttrib = oXMLParent.attributes.item(nAttrib);
                this["@" + decapitalize(oAttrib.name)] = parseText(
                    oAttrib.value.trim()
                );
            }
        }
    };

    // xml.JXONTree.prototype.attr = function(attr) {
    //   return this['@' + decapitalize(attr)];
    // };

    xml.toJXONTree = function toJXONTree(xmlString) {
        var xmlDoc = xml.strToXMLDoc(xmlString);
        return new xml.JXONTree(xmlDoc);
    };

    const parseXML = (url) => {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                // Typical action to be performed when the document is ready:
                let response = xml.toJXONTree(xhttp.response);
                console.log(
                    "xml.toJXONTree(xhttp.response)",
                    "JSON.stringify(response)"
                );
                if (
                    !!response.ad &&
                    !!response.ad.wrapper &&
                    (!!response.ad.wrapper.vASTAdTagURI ||
                        !!response.ad.wrapper.VASTAdTagURI)
                ) {
                    parseXML(response.ad.wrapper.vASTAdTagURI.keyValue);
                }else {
                    let options = {
                        adTagUrl: url
                    }
                    if(url.includes("doubleclick") || url.includes("googleapi")){
                        // player.ima({adTagUrl: url})
                        player.ima = new ImaPlugin(player, options)
                    }else {
                        player.vastClient = new VASTPlugin(options, player)
                    }
                }
                // return response;
            }
        };
        xhttp.open("GET", url, true);
        xhttp.send();
    };
    // const response = xml.toJXONTree(url)
    parseXML(url)
};

const init = function (player, url) {
    this.parseXML = new parserXmlPlugin(player, url);
};
const registerPlugin = videojs.registerPlugin || videojs.plugin;
registerPlugin("parserXml", init);
// return parserXml;
