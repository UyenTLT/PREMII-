'use strict';
let importGeneration=0;
let fileSequence=0;
let pdfReader;
async function readDocument(file){
 if(file.size>10*1024*1024||! /\.(txt|docx|pdf)$/i.test(file.name))throw new Error('Choose a TXT, DOCX or PDF file up to 10 MB.');
 let text='';
 if(/\.txt$/i.test(file.name)){const bytes=await file.arrayBuffer();try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('big5').decode(bytes);}}
 else if(/\.docx$/i.test(file.name))text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
 else {
  pdfReader??=await import('./vendor/pdf.mjs');pdfReader.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',document.baseURI).href;
  const task=pdfReader.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useWasm:false});
  try{const pdf=await task.promise;if(pdf.numPages>200)throw new Error('PDF page limit exceeded.');for(let i=1;i<=pdf.numPages;i++){const content=await(await pdf.getPage(i)).getTextContent();text+=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n';}}finally{await task.destroy();}
 }
 if(!text.trim())throw new Error('No readable text found. Scanned PDFs need OCR first.');
 if(text.length>2000000)throw new Error('Document text limit exceeded.');
 return text;
}
$('#source-file').addEventListener('change',async e=>{
 const files=[...e.target.files];if(!files.length)return;
 const generation=++importGeneration;$('#source-file').disabled=true;$('#import-status').textContent=t('Reading and extracting documents…');
 try{
  for(const file of files){const item=node('li',file.name+' — '+t('Reading document…'));$('#import-files').append(item);
   try{const text=await readDocument(file);if(generation!==importGeneration)return;if(isQuestionnaireTemplate(text))throw new Error('Template detected. Upload patient records, not a blank PREMII questionnaire.');const extracted=extractFileRecords(text,file.name,`file-${++fileSequence}`);if(records.length+extracted.length>3000)throw new Error('Too many observations. Use smaller document batches.');records.push(...extracted);selectedRecordId??=extracted[0]?.recordId??null;item.textContent=file.name+' — '+extracted.length+' '+t('observations extracted');render();}
   catch(error){if(generation!==importGeneration)return;const known=['Template detected. Upload patient records, not a blank PREMII questionnaire.','Choose a TXT, DOCX or PDF file up to 10 MB.','No readable text found. Scanned PDFs need OCR first.','PDF page limit exceeded.','Document text limit exceeded.','Too many observations. Use smaller document batches.'];item.textContent=file.name+' — '+t(known.includes(error.message)?error.message:'Unable to read this document. Check the format, encryption and file integrity.');}
  }
  if(generation===importGeneration)$('#import-status').textContent=t('Extraction finished. Results contain only supported source observations; missing values remain undocumented.');
 }finally{if(generation===importGeneration){$('#source-file').disabled=false;$('#source-file').value='';}}
});
$('#clear-source').onclick=()=>{if(records.length&&!confirm(t('Clear all imported documents and extracted results?')))return;importGeneration++;records.splice(0);selectedRecordId=null;$('#source-file').disabled=false;$('#source-file').value='';$('#source-text').value='';$('#import-files').replaceChildren();$('#import-status').textContent='';$('#print-report').replaceChildren();render();};
window.addEventListener('languagechange',()=>{$('#import-status').textContent=translateText($('#import-status').textContent);});
function buildReport(){
 const report=$('#print-report');report.replaceChildren();const selected=activeRecord();if(!selected)return report;
 const r=selected;const shifts=Array(4).fill(null);shifts[r.shift?Number(r.shift)-1:0]=r;let pageNumber=0;
 function page(title){const p=node('article',undefined,'report-page');p.append(node('p',`PREMII™ · ${t('Infant ID')}: ${r.infant??t('Not found in source')} · ${r.date??t('Date not documented')}`,'report-header'),node('h2',t(title)));report.append(p);return p;}
 function finish(p){p.append(node('p',t('Original questionnaire: © 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire, a Takeda company.'),'report-footer'),node('p',`${t('Adapted research report — not the original licensed form.')} · ${t('Page')} ${++pageNumber} / 7`,'report-footer'));}
 function table(p){const table=node('table');const head=node('thead');const tr=node('tr');tr.append(node('th',t('Factors / levels')));for(let i=0;i<4;i++){const entry=shifts[i];let label=r.shift?`${t('Shift')} ${i+1}`:`${t('Observation')} ${i+1}`;label+='\n'+(entry?(entry.shift?`${entry.start??'—'}–${entry.end??'—'}`:t('Shift not documented')):t('No record'));tr.append(node('th',label));}head.append(tr);table.append(head);const body=node('tbody');table.append(body);p.append(table);return body;}
 function row(body,label,fn){const tr=node('tr');tr.append(node('td',t(label)));for(let i=0;i<4;i++)tr.append(node('td',shifts[i]?String(fn(shifts[i])??t('Not found in source')):''));body.append(tr);}
 function field(body,key,label=labels[key]){row(body,label,r=>fieldValue(r,key));}
 function levels(body,name,indices){for(const i of indices)row(body,options[name][i],r=>r[name]===null?missing(r,name):String(r[name])===String(i)?'☑':'☐');}
 let p=page('PREMature Infant Index Questionnaire');p.append(node('h1','PREMII™','cover-title'),node('p',t('Automatically extracted from the uploaded file. No manual data entry.')),node('p',`${r.filename} · ${t('Source line')} ${r.sourceLine}`),node('p',`${t('Source note timestamp')}: ${r.date??t('Date not documented')} ${r.noteTime??''}`),node('p',t('Missing items are not normal findings, zeros or negative responses.')),node('p',t('This report describes one source note. A dated note is not assumed to cover a complete shift.')),node('p',t('Automated extraction is unverified. Review the source evidence before clinical use.')));finish(p);
 p=page('Respiratory support');let body=table(p);levels(body,'RES1',[5,4,3,2]);field(body,'RES2');finish(p);
 p=page('Respiratory support');body=table(p);field(body,'RES3');field(body,'RES3_1');levels(body,'RES1',[1,0]);finish(p);
 p=page('Highest oxygen concentration');body=table(p);levels(body,'OA',[6,5,4,3,2,1]);field(body,'bradyThreshold');field(body,'desatThreshold');field(body,'ABD1_1');field(body,'ABD1_2');finish(p);
 p=page('Apnea, bradycardia & desaturation');body=table(p);for(const f of ['ABD2_1','ABD2_2','ABD3_1','ABD3_2','ABD4'])field(body,f);levels(body,'THG1',[3,2,1]);finish(p);
 p=page('Feeding');body=table(p);field(body,'fed');levels(body,'FEED1',[6,5,4,3,2,1]);finish(p);
 p=page('Weight');body=table(p);row(body,'First assessment',r=>r.first===null?missing(r,'first'):t(r.first==='on'?'Yes':'No'));row(body,'Baseline weight before first assessment',r=>r.baselineWeight===null?missing(r,'baselineWeight'):r.baselineWeight+' g');field(body,'weighed','Weighed during shift');field(body,'WEIGHT1');field(body,'WEIGHT2');field(body,'WEIGHT3');finish(p);
 return report;
}
$('#export-pdf').onclick=()=>{if(!activeRecord())return;buildReport();notify(t('In the print dialog, choose Save as PDF. The report uses the source questionnaire’s sections and four-shift columns.'));window.print();};
