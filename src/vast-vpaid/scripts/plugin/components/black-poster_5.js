'use strict';

var baseVideoJsComponent = videojs.getComponent('Component');
import BlackPosterFactory from './black-poster'
var BlackPoster = BlackPosterFactory(baseVideoJsComponent);

videojs.registerComponent('BlackPoster', videojs.extend(baseVideoJsComponent, BlackPoster));
