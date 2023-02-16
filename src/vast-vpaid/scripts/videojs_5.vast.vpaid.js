'use strict';

import "./plugin/components/ads-label_5"
import "./plugin/components/black-poster_5"

// const VASTPlugin = require("./plugin/videojs.vast.vpaid")
import VASTPlugin from "./plugin/videojs.vast.vpaid.js"

videojs.plugin('vastClient', VASTPlugin);
