'use strict';
let importGeneration=0;
let fileSequence=0;
let pdfReader;
let lastImportSummary=null;
const importItems=[];
function noteKey(record){
 if(record.mergedFrom||!record.sourceText)return null;
 const original=field=>record.manualEdits?.[field]?record.manualEdits[field].originalValue:record[field];
 const infant=original('infant');
 if(!infant)return null;
 return JSON.stringify([
  infant,original('date'),original('noteTime'),
  record.sourceText.replace(/\r\n?/g,'\n').trim()
 ]);
}
function renderImportItem(row){
 row.item.textContent=row.filename+' — '+(row.error?t(row.error):row.count===null?t('Reading document…'):row.count+' '+t('observations extracted')+(row.skipped?' · '+row.skipped+' '+t('duplicate observations skipped'):'') );
}
function renderImportStatus(){
 if(!lastImportSummary)return;
 const {added,failed,skipped}=lastImportSummary;
 const summary=[
  `${added} ${t('new observations')}`,
  `${skipped} ${t('duplicate observations skipped')}`,
  `${failed} ${t('files failed')}`
 ].join(' · ');
 const guidance=added||skipped?'':' · '+t('No output was generated. Check the file errors above and try another supported document.');
 $('#import-status').textContent=summary+guidance;
}
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
const importErrors={
 template:'Template detected. Upload patient records, not a blank PREMII questionnaire.',
 unsupported:'Choose a TXT, DOCX or PDF file up to 10 MB.',
 empty:'No readable text found. Scanned PDFs need OCR first.',
 pages:'PDF page limit exceeded.',text:'Document text limit exceeded.',
 count:'Too many observations. Use smaller document batches.'
};
async function importDocuments(files){
 if(!files.length||$('#source-file').disabled)return;
 const generation=++importGeneration;const startCount=records.length;lastImportSummary=null;
 const seenNotes=new Set(records.map(noteKey).filter(key=>key!==null));
 let failed=0,skipped=0,firstNewRecordId=null;
 $('#import-file-details').open=false;
 $('#source-file').disabled=true;$('#import-status').textContent=t('Reading and extracting documents…');
 try{
  for(const file of files){
   if(generation!==importGeneration)return;
   const item=node('li');const row={item,filename:file.name,count:null,error:null};importItems.push(row);renderImportItem(row);$('#import-issues').append(item);$('#import-issues').hidden=false;
   // Yield a frame so status changes are painted before processing a large file.
   await new Promise(resolve=>setTimeout(resolve,0));
   try{
    const text=await readDocument(file);if(generation!==importGeneration)return;
    if(isQuestionnaireTemplate(text))throw new Error(importErrors.template);
    const extracted=extractFileRecords(text,file.name,`file-${++fileSequence}`);
    if(!extracted.length)throw new Error(importErrors.empty);
    const newKeys=new Set();
    const unique=extracted.filter(record=>{
     const key=noteKey(record);
     if(key===null)return true;
     if(seenNotes.has(key)||newKeys.has(key))return false;
     newKeys.add(key);
     return true;
    });
    if(records.length+unique.length>3000)throw new Error(importErrors.count);
    for(const key of newKeys)seenNotes.add(key);
    for(const record of unique)records.push(record);
    firstNewRecordId??=unique[0]?.recordId??null;
    row.count=unique.length;
    row.skipped=extracted.length-unique.length;
    skipped+=row.skipped;
    renderImportItem(row);
    $('#import-files').append(item);
    $('#import-file-details').hidden=false;
    $('#import-issues').hidden=!$('#import-issues').childElementCount;
   }catch(error){
    if(generation!==importGeneration)return;
    failed++;item.classList.add('import-error');
    row.error=Object.values(importErrors).includes(error.message)?error.message:'Unable to read this document. Check the format, encryption and file integrity.';renderImportItem(row);
   }
  }
  if(generation!==importGeneration)return;
  if(firstNewRecordId){
   selectedRecordId=firstNewRecordId;
   detailsOpen=false;
   $('#record-search').value='';
   expandedGroups.clear();
   showRecordInList(activeRecord(),false);
  }
  render();
  const added=records.length-startCount;
  lastImportSummary={added,failed,skipped};renderImportStatus();
  if(added){$('#output-ready').scrollIntoView({behavior:'smooth',block:'start'});notify(t('Results are ready below. View the extracted fields or export the report.'));}
 }finally{if(generation===importGeneration){$('#source-file').disabled=false;$('#source-file').value='';}}
}
$('#source-file').addEventListener('change',e=>importDocuments([...e.target.files]));
const fileDropZone = $('#file-drop-zone');
fileDropZone.addEventListener('dragover', event => {
  if (!event.dataTransfer.types.includes('Files')) return;
  event.preventDefault();
  const available = !$('#source-file').disabled;
  event.dataTransfer.dropEffect = available ? 'copy' : 'none';
  fileDropZone.classList.toggle('dragging', available);
});
fileDropZone.addEventListener('dragleave', event => {
  if (!fileDropZone.contains(event.relatedTarget)) fileDropZone.classList.remove('dragging');
});
fileDropZone.addEventListener('drop', event => {
  if (!event.dataTransfer.types.includes('Files')) return;
  event.preventDefault();
  fileDropZone.classList.remove('dragging');
  importDocuments([...event.dataTransfer.files]);
});
$('#clear-source').onclick=()=>{if(records.length&&!confirm(t('Clear all imported documents and extracted results?')))return;importGeneration++;records.splice(0);expandedGroups.clear();selectedRecordId=null;detailsOpen=false;recordPage=0;$('#record-search').value='';lastImportSummary=null;importItems.splice(0);$('#source-file').disabled=false;$('#source-file').value='';$('#source-text').value='';$('#import-files').replaceChildren();$('#import-file-details').hidden=true;$('#import-issues').replaceChildren();$('#import-issues').hidden=true;$('#import-status').textContent='';$('#print-report').replaceChildren();render();};
window.addEventListener('languagechange',()=>{if(lastImportSummary)renderImportStatus();else $('#import-status').textContent=translateText($('#import-status').textContent);importItems.forEach(renderImportItem);});
function buildReport(){
 const report=$('#print-report');report.replaceChildren();const r=activeRecord();if(!r)return report;
 const clip=(value,max)=>{const chars=Array.from(String(value??''));return chars.length>max?chars.slice(0,max-1).join('')+'…':chars.join('');};
 const clinical=PREMII_FIELDS.filter(k=>!['infant','date','shift','start','end'].includes(k));
 const snippets=new Map();
 for(const field of clinical){const quote=r.manualEdits?.[field]?null:r.evidence?.[field];if(quote){if(!snippets.has(quote))snippets.set(quote,[]);snippets.get(quote).push(field);}}
 const denseSummary=clinical.filter(k=>r[k]!=null).length>12||Array.from(r.infant??'').length>60||Array.from(r.filename??'').length>90||(r.FEED1!=null&&t(options.FEED1[Number(r.FEED1)]).length>120);
 const separateEvidence=snippets.size>4||(snippets.size>0&&denseSummary);
 const totalPages=separateEvidence?2:1;
 function page(title,pageNumber){
  const sheet=node('article',undefined,'report-page compact-report');
  const head=node('header',undefined,'pdf-header');const brand=node('div');brand.append(node('p','PREMII™','pdf-brand'),node('h1',t(title)));head.append(brand,node('span',`${pageNumber} / ${totalPages}`,'pdf-page-number'));sheet.append(head);
  const meta=node('div',undefined,'pdf-meta');
  for(const [label,value] of [
   ['Infant / study ID',r.infant??t('Not documented')],[r.mergedFrom?'Date':'Source note timestamp',`${r.date??t('Date not documented')} ${r.noteTime??''}`],
   ['Shift',r.shift?`${t('Shift')} ${r.shift}`:t('Shift not documented')],['Start time / end time',`${r.start??'—'} / ${r.end??'—'}`]
  ]){const item=node('div');item.append(node('span',t(label)),node('strong',clip(value,70)));meta.append(item);}sheet.append(meta);
  sheet.append(node('p',`${t('Source document')}: ${clip(r.filename,110)}${r.mergedFrom||r.sourceLine===undefined?'':' · '+t('Source line')+' '+r.sourceLine}`,'pdf-source'));
  const content=node('div',undefined,'pdf-content');sheet.append(content);
  const footer=node('footer',undefined,'pdf-footer');footer.append(node('span','PREMII™ · © 2018 Shire Human Genetic Therapies, Inc.'),node('span',t('Adapted research report · No total score')));sheet.append(footer);report.append(sheet);return content;
 }
 function value(field){
  if(r[field]===null||r[field]===undefined||r[field]==='')return r.fieldStatus?.[field]==='not-applicable'?'N/A':r.fieldStatus?.[field]==='conflicting'?t('Conflict'):'—';
  if(field==='first')return t(r.first==='on'?'Yes':'No');
  if(field==='THG2')return t({'2':'Closed, heated incubator','1':'Radiant warmer'}[r[field]]??r[field]);
  if(field==='FEED2')return t({'2':'Breast','1':'Bottle','both':'Both'}[r[field]]??r[field]);
  return clip(fieldValue(r,field),210);
 }
 function section(parent,title){const block=node('section',undefined,'pdf-section');block.append(node('h2',t(title)));parent.append(block);return block;}
 function rows(parent,items){const table=node('table',undefined,'pdf-values');const body=node('tbody');for(const [label,field,unit] of items){const row=node('tr');row.append(node('th',t(label)));const val=value(field);row.append(node('td',val+(unit&&r[field]!=null?' '+unit:'')));body.append(row);}table.append(body);parent.append(table);}
 const first=page('Observation summary',1);
 first.append(node('p',t(r.extractionStatus==='saved-record'?'Saved database observation · Source note not stored':r.mergedFrom?'Merged observations · Review original sources':r.manualEdits?'Contains manual edits · One source note':'Automatically extracted · Unverified · One source note, not an assumed complete shift'),'pdf-status'));
 const resp=section(first,'01 · Respiratory support & oxygen');
 rows(resp,[['Respiratory support','RES1'],['Device','RES2'],['Flow source','RES3'],['Greatest flow','RES3_1','cc/min'],['Highest oxygen concentration','OA']]);
 const pair=node('div',undefined,'pdf-pair');first.append(pair);
 const thermal=section(pair,'02 · Thermoregulation');rows(thermal,[['Support','THG1'],['Warming device','THG2']]);
 const feeding=section(pair,'03 · Feeding');rows(feeding,[['Feeds documented','fed'],['Feeding level','FEED1'],['Feeding method','FEED2']]);
 const events=section(first,'04 · Apnea, bradycardia & desaturation');
 const eventTable=node('table',undefined,'pdf-events');const eventHead=node('thead');const headings=node('tr');for(const label of ['Event','Required intervention','No intervention required'])headings.append(node('th',t(label)));eventHead.append(headings);eventTable.append(eventHead);const eventBody=node('tbody');
 for(const [label,a,b] of [['Apnea','ABD1_1','ABD1_2'],['Bradycardia','ABD2_1','ABD2_2'],['Desaturation','ABD3_1','ABD3_2']]){const row=node('tr');row.append(node('th',t(label)),node('td',value(a)),node('td',value(b)));eventBody.append(row);}eventTable.append(eventBody);events.append(eventTable);
 const eventNotes=node('div',undefined,'pdf-inline');
 for(const [label,field,unit] of [['Bradycardia ≤','bradyThreshold','beats/min'],['Desaturation ≤','desatThreshold','%'],['Stimulant prescribed','ABD4',''],['Stimulant name','ABD4_1','']])eventNotes.append(node('span',`${t(label)}: ${value(field)}${unit&&r[field]!=null?' '+unit:''}`));events.append(eventNotes);
 const weight=section(first,'05 · Weight');const weightTable=node('table',undefined,'pdf-weights');const wh=node('thead'),whr=node('tr');for(const label of ['Measurement','Weight (g)','Date','Time'])whr.append(node('th',t(label)));wh.append(whr);weightTable.append(wh);const wb=node('tbody');
 for(const [label,keys] of [['Before first assessment',['baselineWeight','baselineDate','baselineTime']],['Lowest documented in this note',['WEIGHT1','WEIGHT2','WEIGHT3']]]){const row=node('tr');row.append(node('th',t(label)),...keys.map(k=>node('td',value(k))));wb.append(row);}weightTable.append(wb);weight.append(weightTable);
 const weightNotes=node('div',undefined,'pdf-inline');weightNotes.append(node('span',`${t('First assessment')}: ${value('first')}`),node('span',`${t('Weighed during shift')}: ${value('weighed')}`));weight.append(weightNotes);
 first.append(node('p',t('Legend: — Not found in source · N/A Not applicable · Conflict Unresolved source values. Missing is not normal, zero or No.'),'pdf-legend'));
 first.append(node('p',t('Only recorded responses are shown. Source note times are not shift boundaries.'),'pdf-note'));
 if(snippets.size){
  const second=separateEvidence?page('Source evidence & interpretation',2):first;
  const evidenceSection=section(second,'Source evidence');evidenceSection.append(node('p',t('Short source excerpts supporting the selected observation. Original language is preserved.'),'pdf-note'));
  const limit=separateEvidence?8:4;
  const table=node('table',undefined,'pdf-evidence');const head=node('thead'),tr=node('tr');for(const label of ['Observation fields','Source excerpt'])tr.append(node('th',t(label)));head.append(tr);table.append(head);const body=node('tbody');
  for(const [quote,fields] of [...snippets].slice(0,limit)){const row=node('tr');row.append(node('th',fields.map(field=>t(editorLabels[field])).join(' · ')),node('td',clip(quote.replace(/\s+/g,' '),separateEvidence?120:90)));body.append(row);}table.append(body);evidenceSection.append(table);
  if(snippets.size>limit)second.append(node('p',`${snippets.size-limit} ${t('additional excerpts are available in JSON export.')}`,'pdf-note'));
  if(separateEvidence){const notes=section(second,'Interpretation notes');const list=node('ul');for(const text of [
   'Automatic extraction has not been clinically verified. Review the original source before clinical use.',
   'Missing dates, times and shift assignments are left undocumented. No event count is assumed to be zero.',
   'Some excerpts are shortened for this compact report. Full extraction evidence and field statuses remain in JSON export.',
   'This is an adapted research summary, not the original licensed PREMII questionnaire. No diagnostic recommendation or total score is generated.'
  ])list.append(node('li',t(text)));notes.append(list);}
 }
 return report;
}
const pdfDialog=$('#pdf-dialog');
const pdfInfant=$('#pdf-infant');
const pdfObservation=$('#pdf-observation');
let pdfGroups=[];

function pdfChoice(label,value){
 const option=node('option',label);
 option.value=value;
 return option;
}

function renderPdfObservations(preferredId){
 const notes=pdfGroups[Number(pdfInfant.value)]?.[1]??[];
 pdfObservation.replaceChildren(...notes.map(record=>{
  const time=[record.date,record.noteTime].filter(Boolean).join(' ')||t('Date not documented');
  const shift=record.shift?t('Shift')+' '+record.shift:t('Shift not documented');
  const source=record.mergedFrom?t('Merged observation'):[record.filename,record.sourceLine?t('Source line')+' '+record.sourceLine:''].filter(Boolean).join(' · ');
  return pdfChoice([time,shift,source].join(' · '),record.recordId);
 }));
 if(notes.some(record=>record.recordId===preferredId))pdfObservation.value=preferredId;
 $('#pdf-observation-field').hidden=notes.length<2;
}

$('#export-pdf').onclick=()=>{
 if(!records.length)return;
 pdfGroups=recordGroups(records);
 pdfInfant.replaceChildren(...pdfGroups.map(([,notes],index)=>
  pdfChoice(notes[0].infant??t('Infant ID not documented'),String(index))
 ));
 const current=pdfGroups.findIndex(([,notes])=>notes.some(record=>record.recordId===selectedRecordId));
 if(current>=0)pdfInfant.value=String(current);
 renderPdfObservations(selectedRecordId);
 pdfDialog.showModal();
};
pdfInfant.onchange=()=>renderPdfObservations();
$('#cancel-pdf').onclick=()=>pdfDialog.close();
$('#pdf-form').onsubmit=event=>{
 event.preventDefault();
 const id=pdfObservation.value;
 if(!records.some(record=>record.recordId===id))return;
 selectedRecordId=id;
 pdfDialog.close();
 render();
 buildReport();
 notify(t('Choose Save as PDF in the print dialog. The compact report uses one or two A4 pages.'));
 window.print();
};

$('#source-file').disabled=false;
$('#startup-warning').hidden=true;
