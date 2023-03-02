import copy from 'rollup-plugin-copy';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import scss from 'rollup-plugin-scss';

export default {
  name: 'parserXml',
  input: 'src/plugin/plugin.js',
  output: {
    file: 'dist/plugin.js',
    format: 'umd',
  },
  external: ['video.js', 'videojs-contrib-ads', 'vpaidFlashClient'],
  globals: {
    'video.js': 'videojs',
    'vpaid-flash-client': 'vpaidFlashClient',
    'vpaid-html5-client': 'vpaidFlashClient',
    'swfobject': 'swfobject'
  },
  plugins: [
    json(),
    scss({
      output : 'dist/videojs.vast.vpaid.css',
      failOnError: true,
    }),
    copy({
      'src/videojs-ima/css/videojs.ima.css': 'dist/videojs.ima.css',
    }),
    copy({
      'src/videojs-ima/css/videojs.ima.css': 'dist/videojs.ima.scss',
    }),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
