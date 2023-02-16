'use strict';

var baseVideoJsComponent = videojs.getComponent('Component');
import AdsLabelFactory from './ads-label'
var AdsLabel = AdsLabelFactory(baseVideoJsComponent);

videojs.registerComponent('AdsLabel', videojs.extend(baseVideoJsComponent, AdsLabel));
