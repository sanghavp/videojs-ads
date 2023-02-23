'use strict';

// import {flash} from '../../utils/mimetypes';

import VASTError from '../vast/VASTError';

// import VPAIDFLASHClient  from '../../VPAIDFLASHClient/VPAIDFLASHClient.js';

import utilities from '../../utils/utilityFunctions';
import dom from '../../utils/dom';

import logger from '../../utils/consoleLogger';

function VPAIDFlashTech(mediaFile, settings) {
  if (!(this instanceof VPAIDFlashTech)) {
    return new VPAIDFlashTech(mediaFile);
  }
  sanityCheck(mediaFile);
  this.name = 'vpaid-flash';
  this.mediaFile = mediaFile;
  this.containerEl = null;
  this.vpaidFlashClient = null;
  this.settings = settings;

  /*** local functions ***/
  function sanityCheck(mediaFile) {
    if (!mediaFile || !utilities.isString(mediaFile.src)) {
      throw new VASTError('on VPAIDFlashTech, invalid MediaFile');
    }
  }
}

// VPAIDFlashTech.VPAIDFLASHClient = VPAIDFLASHClient;

// VPAIDFlashTech.supports = function (type) {
//   return (flash.indexOf(type) > -1) && VPAIDFlashTech.VPAIDFLASHClient.isSupported();
// };

// VPAIDFlashTech.prototype.loadAdUnit = function loadFlashCreative(containerEl, objectEl, callback) {
//   var that = this;
//   var flashClientOpts = this.settings && this.settings.vpaidFlashLoaderPath ? {data: this.settings.vpaidFlashLoaderPath} : undefined;
//   sanityCheck(containerEl, callback);

//   this.containerEl = containerEl;

//   logger.debug ("<VPAIDFlashTech.loadAdUnit> loading VPAIDFLASHClient with opts:", flashClientOpts);

//   this.vpaidFlashClient = new VPAIDFlashTech.VPAIDFLASHClient(containerEl, function (error) {
//     if (error) {
//       return callback(error);
//     }

//     logger.info ("<VPAIDFlashTech.loadAdUnit> calling VPAIDFLASHClient.loadAdUnit(); that.mediaFile:", that.mediaFile);
//     that.vpaidFlashClient.loadAdUnit(that.mediaFile.src, callback);
//   }, flashClientOpts);

//   /*** Local Functions ***/
//   function sanityCheck(container, cb) {

//     if (!dom.isDomElement(container)) {
//       throw new VASTError('on VPAIDFlashTech.loadAdUnit, invalid dom container element');
//     }

//     if (!utilities.isFunction(cb)) {
//       throw new VASTError('on VPAIDFlashTech.loadAdUnit, missing valid callback');
//     }
//   }
// };

VPAIDFlashTech.prototype.unloadAdUnit = function () {
  if (this.vpaidFlashClient) {
    try{
      this.vpaidFlashClient.destroy();
    } catch(e){
      logger.error ('VAST ERROR: trying to unload the VPAID adunit');
    }
    this.vpaidFlashClient = null;
  }

  if (this.containerEl) {
    dom.remove(this.containerEl);
    this.containerEl = null;
  }
};

export default  VPAIDFlashTech;
