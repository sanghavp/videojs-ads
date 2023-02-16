// import copy from 'rollup-plugin-copy';
import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import scss from 'rollup-plugin-scss';

export default {
    name: 'Videojs-Vast-Vpaid',
    input: 'src/vast-vpaid/scripts/videojs_5.vast.vpaid',
    output: {
        file: 'dist/videojs-vast-vpaid.js',
        format: 'umd',
    },
    external: ['video.js', 'videojs-contrib-ads','vpaid-flash-client'],
    globals: {
        'video.js': 'videojs',
        'vpaid-flash-client' : 'vpaidFlashClient',
        'vpaid-html5-client': 'vpaidHtml5Client'
    },
    plugins: [
        json(),
        scss({
            name: 'output.css'
        }),
        babel({
            exclude: 'node_modules/**',
        }),
    ],
};