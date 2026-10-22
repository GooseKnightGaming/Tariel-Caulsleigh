// Builds the game into the repo root (GitHub Pages serves main): index.html + game.js; assets/ already sit there.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, statSync } from 'fs';
await esbuild.build({
  entryPoints: ['src/game/main.js'], bundle: true, minify: true, format: 'iife',
  target: ['es2020'], outfile: 'game.js', legalComments: 'eof', logLevel: 'warning',
  external: ['node:worker_threads'],
});
const ver = (readFileSync('src/game/main.js', 'utf8').match(/const VERSION = '([^']+)'/) || [, 'dev'])[1];
let html = readFileSync('src/index.html', 'utf8');
html = html.replace('<script src="game.js"></script>', `<script src="game.js?v=${ver}"></script>`)
           .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Cache-Control" content="no-cache">');
writeFileSync('index.html', html);
console.log('version', ver, '·', (statSync('game.js').size / 1024 / 1024).toFixed(2), 'MB');
