import copy from 'rollup-plugin-copy';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';

export default {
  name: 'videojsContribAds',
  input: 'src/contrib_ads/plugin.js',
  output: {
    file: 'dist/videojsContribAds.js',
    format: 'umd',
  },
  external: ['video.js', 'videojs-contrib-ads'],
  globals: {
    'video.js': 'videojs',
  },
  plugins: [
    json(),
    copy({
      'src/contrib_ads/plugin.scss': 'dist/videojsContribAds.scss',
    }),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};