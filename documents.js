'use strict';
let sourceName='';
let importGeneration=0;
let suggestions=[];
let pdfReader;
const importStatus=key=>{$('#import-status').textContent=t(key);};
$('#source-file').addEventListener('change',async e=>{
 const generation=++importGeneration;
 const file=e.target.files[0];
 $('#source-review').hidden=true;$('#suggestion-review').hidden=true;$('#source-text').value='';$('#shift-excerpt').value='';sourceName='';
 if(!file)return;
 if(file.size>10*1024*1024||! /\.(txt|docx|pdf)$/i.test(file.name)){importStatus('Choose a TXT, DOCX or PDF file up to 10 MB.');return;}
 importStatus('Reading document…');
 try{
  let text='';
  if(/\.txt$/i.test(file.name)){const bytes=await file.arrayBuffer();try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('big5').decode(bytes);}}
  else if(/\.docx$/i.test(file.name)){text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;}
  else {
   pdfReader??=await import('./vendor/pdf.mjs');
   pdfReader.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',document.baseURI).href;
   const loadingTask=pdfReader.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useWasm:false});
   const pdf=await loadingTask.promise;
   try{if(pdf.numPages>200)throw new Error('Page limit');for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();text+=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n';}}finally{await loadingTask.destroy();}
  }
  if(generation!==importGeneration)return;
  if(!text.trim()){importStatus('No readable text found. Scanned PDFs need OCR first.');return;}
  if(text.length>2000000)throw new Error('Text limit');
  sourceName=file.name;$('#source-text').value=text;$('#source-review').hidden=false;importStatus('Document ready. Select the relevant infant and shift before entering observations.');
 }catch{if(generation===importGeneration)importStatus('Unable to read this document. Check the format, encryption and file integrity.');}
});
$('#clear-source').onclick=()=>{importGeneration++;sourceName='';suggestions=[];$('#source-file').value='';$('#source-text').value='';$('#shift-excerpt').value='';$('#source-review').hidden=true;$('#suggestion-review').hidden=true;$('#import-status').textContent='';};
$('#select-excerpt').onclick=()=>{const source=$('#source-text');const text=source.value.slice(source.selectionStart,source.selectionEnd);if(!text.trim()){notify(t('Select a passage in the source text first.'));return;}$('#shift-excerpt').value=text;$('#suggestion-review').hidden=true;notify(t('Excerpt selected. Review it and complete the assessment for this shift.'));};
function suggestionLabel(s){
 if(options[s.field])return t(reverseTranslations.get(options[s.field][Number(s.value)])??options[s.field][Number(s.value)]);
 const select=form.elements.namedItem(s.field);if(select?.tagName==='SELECT')return select.querySelector(`option[value="${s.value}"]`)?.textContent??s.value;
 return s.value;
}
function showSuggestions(){
 const panel=$('#suggestion-review');panel.replaceChildren();panel.hidden=false;
 const warning=document.createElement('p');warning.textContent=t('Rule-based proposals only. History, negation and context may be misread. Verify every value; unrecognized items stay blank. Selected values will replace the corresponding form fields.');panel.append(warning);
 if(!suggestions.length){const p=document.createElement('p');p.textContent=t('No supported explicit observations found. Complete the form manually.');panel.append(p);return;}
 for(const [i,s] of suggestions.entries()){
  const row=document.createElement('label');row.className='suggestion-row';const check=document.createElement('input');check.type='checkbox';check.dataset.suggestion=i;
  const description=document.createElement('span');const title=document.createElement('strong');title.textContent=`${s.field}: ${suggestionLabel(s)}`;const evidence=document.createElement('blockquote');evidence.textContent=s.evidence;description.append(title,evidence);row.append(check,description);panel.append(row);
 }
 const button=document.createElement('button');button.type='button';button.textContent=t('Apply selected proposals');button.onclick=()=>{
  const selected=[...panel.querySelectorAll('input:checked')].map(input=>suggestions[Number(input.dataset.suggestion)]);
  if(!selected.length){notify(t('Select at least one proposal to apply.'));return;}
  // Enable controlling branches before applying dependent values.
  const fields=Object.fromEntries(selected.map(s=>[s.field,s.value]));
  if('FEED1' in fields)fields.fed='yes';if('WEIGHT1' in fields)fields.weighed='yes';
  const set=(name,v)=>{const control=form.elements.namedItem(name);if(control instanceof RadioNodeList)control.value=v;else if(control)control.value=v;};
  for(const n of ['RES1','fed','weighed','ABD4','THG1'])if(n in fields)set(n,fields[n]);sync();
  for(const [n,v] of Object.entries(fields))set(n,v);sync();
  appliedSource={filename:sourceName,method:'reviewed-rule-proposals',proposals:selected,reviewed:false};
  $('#review-confirmation').hidden=false;$('#review-verified').required=true;$('#review-verified').checked=false;
  notify(t('Proposals applied. Complete missing fields and confirm your source review before saving.'));
  $('#assessment').scrollIntoView({behavior:'smooth'});
 };panel.append(button);
}
$('#suggest-fields').onclick=()=>{const text=$('#shift-excerpt').value;if(!text.trim()){notify(t('Select a passage in the source text first.'));return;}suggestions=extractSuggestions(text);showSuggestions();};
$('#review-verified').addEventListener('change',e=>{if(appliedSource)appliedSource.reviewed=e.target.checked;});
form.addEventListener('reset',()=>{appliedSource=null;$('#review-confirmation').hidden=true;$('#review-verified').required=false;});
window.addEventListener('languagechange',()=>{if(!$('#suggestion-review').hidden){const checked=[...document.querySelectorAll('#suggestion-review input:checked')].map(x=>x.dataset.suggestion);showSuggestions();for(const i of checked)$('#suggestion-review').querySelector(`[data-suggestion="${i}"]`).checked=true;}$('#import-status').textContent=translateText($('#import-status').textContent);});

function reportNode(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function buildReport(){
 const report=$('#print-report');report.replaceChildren();const groups=new Map();
 for(const r of records){const key=JSON.stringify([r.infant,r.date]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 for(const items of groups.values()){
  items.sort((a,b)=>Number(a.shift)-Number(b.shift)||a.start.localeCompare(b.start));
  const buckets=Array.from({length:4},(_,i)=>items.filter(r=>Number(r.shift)===i+1));
  for(let offset=0;offset<Math.max(...buckets.map(b=>b.length));offset++){
   const shifts=buckets.map(b=>b[offset]??null);const infant=items[0];let pageNumber=0;
   function page(title){const p=reportNode('article',undefined,'report-page');p.append(reportNode('p',`PREMII™ · ${t('Infant ID')}: ${infant.infant} · ${infant.date}`,'report-header'),reportNode('h2',t(title)));report.append(p);return p;}
   function finish(p){p.append(reportNode('p',t('Original questionnaire: © 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire, a Takeda company.'),'report-footer'),reportNode('p',`${t('Adapted research report — not the original licensed form.')} · ${t('Page')} ${++pageNumber} / 7`,'report-footer'));}
   function table(p){const table=reportNode('table');const head=reportNode('thead');const tr=reportNode('tr');tr.append(reportNode('th',t('Factors / levels')));for(let i=0;i<4;i++){const r=shifts[i];tr.append(reportNode('th',`${t('Shift')} ${i+1}\n${r?`${r.start}–${r.end}`:t('No record')}`));}head.append(tr);table.append(head);const body=reportNode('tbody');table.append(body);p.append(table);return body;}
   function row(body,label,fn){const tr=reportNode('tr');tr.append(reportNode('td',t(label)));for(let i=0;i<4;i++)tr.append(reportNode('td',shifts[i]?String(fn(shifts[i])??'—'):''));body.append(tr);}
   function levels(body,name,indices){for(const index of indices){const source=options[name][index];const key=reverseTranslations.get(source)??source;row(body,key,r=>r[name]===null?t('Not applicable'):String(r[name])===String(index)?'☑':'☐');}}
   let p=page('PREMature Infant Index Questionnaire');p.append(reportNode('h1','PREMII™','cover-title'),reportNode('p',t('Record the worst experience observed during each shift.')),reportNode('p',t('No total score calculated. Blank columns indicate shifts with no saved record.')),reportNode('p',t('Adapted research report — not the original licensed form.')));finish(p);
   p=page('Respiratory support');let body=table(p);levels(body,'RES1',[5,4,3,2]);row(body,'Device (supplemental, unscored)',r=>r.RES1==='5'?({'3':t('Endotracheal tube'),'2':t('Tracheostomy tube'),'1':t('Mask')}[r.RES2]??'—'):t('Not applicable'));finish(p);
   p=page('Respiratory support');body=table(p);row(body,'Flow source / greatest setting',r=>r.RES1==='2'?`${{'2':t('Air flow meter'),'1':t('Oxygen flow meter')}[r.RES3]??'—'} / ${r.RES3_1??'—'} cc/min`:t('Not applicable'));levels(body,'RES1',[1,0]);finish(p);
   p=page('Highest oxygen concentration');body=table(p);levels(body,'OA',[6,5,4,3,2,1]);row(body,'Bradycardia threshold ≤ (beats/min)',r=>r.bradyThreshold);row(body,'Desaturation threshold ≤ (%)',r=>r.desatThreshold);row(body,`${t('Apnea')} — ${t('Required intervention')}`,r=>r.ABD1_1);row(body,`${t('Apnea')} — ${t('No intervention required')}`,r=>r.ABD1_2);finish(p);
   p=page('Apnea, bradycardia & desaturation');body=table(p);for(const [n,label] of [[2,'Bradycardia'],[3,'Desaturation']])for(const j of [1,2])row(body,`${t(label)} — ${t(j===1?'Required intervention':'No intervention required')}`,r=>r[`ABD${n}_${j}`]);row(body,'Prescribed caffeine or other stimulant',r=>r.ABD4==='1'?`${t('Yes')}${r.ABD4_1?' · '+r.ABD4_1:''}`:t('No'));levels(body,'THG1',[3,2,1]);finish(p);
   p=page('Feeding');body=table(p);row(body,'Feeds during shift',r=>t(r.fed==='yes'?'Yes':'No'));levels(body,'FEED1',[6,5,4,3,2,1]);finish(p);
   p=page('Weight');body=table(p);row(body,'First assessment',r=>t(r.first==='on'?'Yes':'No'));row(body,'Baseline weight before first assessment',r=>r.first==='on'?`${r.baselineWeight??'—'} g · ${r.baselineDate??'—'} ${r.baselineTime??'—'}`:t('Not applicable'));row(body,'Weighed during shift',r=>t(r.weighed==='yes'?'Yes':'No'));row(body,'Lowest weight during shift',r=>r.weighed==='yes'?`${r.WEIGHT1??'—'} g`:t('Not applicable'));row(body,'Date / time',r=>r.weighed==='yes'?`${r.WEIGHT2??'—'} ${r.WEIGHT3??'—'}`:t('Not applicable'));finish(p);
  }
 }
 return report;
}
$('#export-pdf').onclick=()=>{if(!records.length)return;buildReport();notify(t('In the print dialog, choose Save as PDF. The report uses the source questionnaire’s sections and four-shift columns.'));window.print();};
