const fs = require('node:fs');
fs.mkdirSync('public/vendor', {recursive:true});
for(const [source,target] of [
 ['node_modules/mammoth/mammoth.browser.min.js','mammoth.browser.min.js'],
 ['node_modules/pdfjs-dist/build/pdf.mjs','pdf.mjs'],
 ['node_modules/pdfjs-dist/build/pdf.worker.mjs','pdf.worker.mjs'],
 ['node_modules/mammoth/LICENSE','mammoth-LICENSE'],
 ['node_modules/pdfjs-dist/LICENSE','pdfjs-LICENSE']
]) fs.copyFileSync(source,'public/vendor/'+target);
console.log('Local document parsers prepared.');
