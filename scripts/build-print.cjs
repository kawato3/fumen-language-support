// A development-only bundler creates one offline browser script, not a PDF engine.
require('esbuild').build({
  entryPoints: ['src/webview/print.ts'], outfile: 'media/compiled/print.js',
  bundle: true, platform: 'browser', format: 'iife', target: 'es2022',
  legalComments: 'inline'
}).catch(error => { console.error(error); process.exitCode = 1; });
