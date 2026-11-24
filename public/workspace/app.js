'use strict';
const $=s=>document.querySelector(s);
const records=[];
const expandedGroups=new Set();
let mergeSequence=0;
let selectedRecordId=null;
let detailsOpen=false;
let recordPage=0;
let exportingExcel=false;
const RECORDS_PER_PAGE=20;
const options = {
 RES1: ["No supplemental oxygen and no pulmonary medication","Supplemental oxygen, not continuously, or pulmonary medication","Continuous low-flow nasal cannula (< 2 L/min)","Continuous supplemental oxygen, not through a nasal cannula","Respiratory pressure support (nCPAP or high flow ≥ 2 L/min)","Mechanical ventilation via endotracheal tube, tracheostomy tube or mask"],
 OA: [null,"21% · Room air",'22–30%','31–40%','41–50%','51–60%','≥ 61%'],
 THG1: [null,"Open bassinet or cot, no additional warming support","Open bassinet or cot, additional warming support required","Closed, heated incubator or radiant warmer"],
 FEED1: [null,"All feeds by breast or bottle, no breathing or swallowing problems; all feeds ≤ 30 minutes","All feeds by breast or bottle, no breathing or swallowing problems; at least one feed > 30 minutes","All feeds by breast or bottle, with breathing or swallowing problems","Some tube feeds and some breast or bottle feeds, without breathing or swallowing problems","Some tube feeds and some breast or bottle feeds, with breathing or swallowing problems","Any intravenous nutrition or all feeds by enteral feeding tube"]
};
const labels={RES1:'Respiratory support',RES2:'Device (supplemental, unscored)',RES3:'Flow source',RES3_1:'Greatest flow (cc/min)',OA:'Oxygen concentration',bradyThreshold:'Bradycardia threshold ≤ (beats/min)',desatThreshold:'Desaturation threshold ≤ (%)',ABD1_1:'Apnea · Required intervention',ABD1_2:'Apnea · No intervention required',ABD2_1:'Bradycardia · Required intervention',ABD2_2:'Bradycardia · No intervention required',ABD3_1:'Desaturation · Required intervention',ABD3_2:'Desaturation · No intervention required',ABD4:'Prescribed caffeine or other stimulant',THG1:'Thermoregulation',fed:'Feeds during shift',FEED1:'Feeding',WEIGHT1:'Lowest documented weight in this note (g)',WEIGHT2:'Weighing date',WEIGHT3:'Weighing time'};
const codedLabels = {
 ABD4: {0:'No',1:'Yes'},
 fed: {yes:'Yes',no:'No'},
 weighed: {yes:'Yes',no:'No'},
 first: {on:'Yes',off:'No'},
 RES2: {1:'Mask',2:'Tracheostomy tube',3:'Endotracheal tube'},
 RES3: {1:'Oxygen flow meter',2:'Air flow meter'},
 THG2: {1:'Radiant warmer',2:'Closed, heated incubator'},
 FEED2: {1:'Bottle',2:'Breast',both:'Both'},
 shift: {1:'Shift 1',2:'Shift 2',3:'Shift 3',4:'Shift 4'}
};
function missing(r,field){if(r.fieldStatus?.[field]==='manually-edited')return t('Not documented');return t(r.fieldStatus?.[field]==='not-applicable'?'Not applicable':r.fieldStatus?.[field]==='conflicting'?'Conflicting source values':'Not found in source');}
function readableValue(field,value,localize=false){
 if(value===null||value===undefined||value==='')return value;
 const description=options[field]?.[Number(value)]??codedLabels[field]?.[value];
 if(!description)return value;
 if(localize)return t(description).replaceAll('nCPAP',document.documentElement.lang==='zh-Hant'?'鼻式持續氣道正壓':'nasal continuous positive airway pressure');
 return description.replaceAll('nCPAP','nasal continuous positive airway pressure');
}
function fieldValue(r,field){
 if(r[field]===null||r[field]===undefined||r[field]==='')return missing(r,field);
 return String(readableValue(field,r[field],true));
}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function activeRecord(){return records.find(r=>r.recordId===selectedRecordId);}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
function matchingRecords(){
 const query=$('#record-search').value.trim().toLowerCase();
 return query?records.filter(record=>record.infant?.toLowerCase().includes(query)):records;
}
function exportableRecords(){
 const mergedIds=new Set(records.flatMap(record=>record.mergedFrom?.map(source=>source.recordId)??[]));
 return records.filter(record=>!mergedIds.has(record.recordId));
}
function mergedParent(record){
 return records.find(item=>item.mergedFrom?.some(source=>source.recordId===record.recordId));
}
function sameShiftSources(record){
 if(!record||record.mergedFrom||!record.infant||!record.date||!record.shift)return [];
 const scope=records.filter(item=>item.infant===record.infant&&item.date===record.date&&item.shift===record.shift);
 if(scope.some(item=>item.mergedFrom))return [];
 return scope.filter(item=>!mergedParent(item));
}
function recordGroups(rows){
 const grouped=new Map();
 for(const row of rows){
  const key=row.infant?'infant:'+row.infant:'record:'+row.recordId;
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(row);
 }
 return [...grouped];
}
function showRecordInList(record,expandGroup=true){
 let rows=matchingRecords();
 if(!rows.includes(record)){
  $('#record-search').value='';
  rows=records;
 }
 if($('#group-by-infant').checked){
  const groups=recordGroups(rows);
  const index=groups.findIndex(([,items])=>items.includes(record));
  if(expandGroup&&index>=0)expandedGroups.add(groups[index][0]);
  recordPage=Math.floor(Math.max(0,index)/RECORDS_PER_PAGE);
 }else{
  recordPage=Math.floor(Math.max(0,rows.indexOf(record))/RECORDS_PER_PAGE);
 }
}
function render(){
 const visibleRecords=matchingRecords();
 const grouped=$('#group-by-infant').checked;
 const groups=grouped?recordGroups(visibleRecords):[];
 const pageCount=grouped?groups.length:visibleRecords.length;
 const active=activeRecord();
 $('#record-count').textContent=records.length;$('#empty-state').hidden=!!records.length;$('#results-section').hidden=!active||!detailsOpen;
 for(const id of ['export-json','export-csv'])$('#'+id).disabled=!records.length;
 $('#output-ready').hidden=!records.length;
 for(const id of ['export-pdf','quick-export-pdf'])$('#'+id).disabled=!active;
 $('#record-search-panel').hidden=!records.length;
 $('#no-results').hidden=!records.length||!!visibleRecords.length;
 $('#records-list').hidden=!visibleRecords.length;
 $('#record-search-count').textContent=visibleRecords.length===records.length?'':(
  `${visibleRecords.length} / ${records.length} ${t('observations')}`
 );
 for(const id of ['export-excel','quick-export-excel']){$('#'+id).disabled=!records.length||exportingExcel;$('#'+id).textContent=t(exportingExcel?'Creating Excel…':'Excel (.xlsx) · All observations');}
 const infantCount=new Set(records.filter(r=>r.infant!==null).map(r=>r.infant)).size;
 const exportCount=records.some(record=>record.mergedFrom)?' · '+exportableRecords().length+' '+t('observations in batch exports'):'';
 $('#output-summary').textContent=`${records.length} ${t('observations')} · ${infantCount} ${t('infants')}${exportCount}`;
 recordPage=Math.min(recordPage,Math.max(0,Math.ceil(pageCount/RECORDS_PER_PAGE)-1));
 $('#record-pagination').hidden=pageCount<=RECORDS_PER_PAGE;
 $('#previous-page').disabled=recordPage===0;
 $('#next-page').disabled=(recordPage+1)*RECORDS_PER_PAGE>=pageCount;
 $('#page-summary').textContent=`${t('Page')} ${recordPage+1} / ${Math.max(1,Math.ceil(pageCount/RECORDS_PER_PAGE))} · ${visibleRecords.length} ${t('observations')}`;
 const body=$('#records-table tbody');
 body.replaceChildren();
 function appendObservation(r){
  const row=node('tr',undefined,r.recordId===selectedRecordId?'selected-record':undefined);
  const view=node('button',t('View source results'),'secondary');
  view.type='button';
  view.onclick=()=>{
   selectedRecordId=r.recordId;
   detailsOpen=true;
   render();
   $('#selected-note').focus();
  };
  const timestamp=[r.date,r.noteTime].filter(Boolean).join(' ');
  const documented=Object.keys(labels).filter(key=>r[key]!=null).length;
  for(const value of [
   r.infant??t('Not found in source'),
   timestamp||t('Date not documented'),
   r.mergedFrom?t('Merged observation'):r.filename,
   r.shift?`${t('Shift')} ${r.shift}`:t('Shift not documented'),
   `${documented} / ${Object.keys(labels).length}`
  ])row.append(node('td',value));
  const action=node('td');
  action.append(view);
  if(mergedParent(r))action.append(node('small',t('Included in merged observation'),'merge-badge'));
  row.append(action);
  body.append(row);
 }
 const offset=recordPage*RECORDS_PER_PAGE;
 if(grouped){
  for(const [key,items] of groups.slice(offset,offset+RECORDS_PER_PAGE)){
   const groupRow=node('tr',undefined,'infant-group');
   const cell=node('td');
   cell.colSpan=6;
   const open=expandedGroups.has(key);
   const toggle=node('button',`${items[0].infant??t('Infant ID not documented')} · ${items.length} ${t('observations')}`,'secondary');
   toggle.type='button';
   toggle.dataset.groupKey=key;
   toggle.setAttribute('aria-expanded',String(open));
   toggle.onclick=()=>{
    if(open)expandedGroups.delete(key);
    else expandedGroups.add(key);
    render();
    for(const button of body.querySelectorAll('[data-group-key]')){
     if(button.dataset.groupKey===key){button.focus();break;}
    }
   };
   cell.append(toggle);
   groupRow.append(cell);
   body.append(groupRow);
   if(open)items.forEach(appendObservation);
  }
 }else{
  visibleRecords.slice(offset,offset+RECORDS_PER_PAGE).forEach(appendObservation);
 }
 $('#merge-observations').hidden=sameShiftSources(active).length<2;
 $('#undo-observation-merge').hidden=!active?.mergedFrom;
 $('#edit-observation').disabled=!!(active&&mergedParent(active));
 const pdfSelection=active?`${t('Selected for PDF')} · ${active.infant??t('Infant ID not documented')} · ${[active.date,active.noteTime].filter(Boolean).join(' ')||t('Date not documented')} · ${active.mergedFrom?t('Merged observation'):active.filename}`:'';
 $('#pdf-selection').textContent=pdfSelection;
 $('#records-pdf-selection').textContent=pdfSelection;
 $('#records-pdf-selection').hidden=!active;
 const r=active;if(!r){$('#selected-note').textContent='';$('#source-context').textContent='';$('#source-text').value='';$('#extracted-fields').replaceChildren();return;}
 $('#selected-note').textContent=`${r.infant??t('Infant ID not documented')} · ${r.date??t('Date not documented')} ${r.noteTime??''}`;
 if(r.mergedFrom)$('#source-context').textContent=t('Merged observation')+' · '+r.mergedFrom.map(source=>source.filename+' :'+source.sourceLine).join(' · ');
 else $('#source-context').textContent=`${r.manualEdits?t('Manually edited')+' · ':''}${r.filename} · ${r.sourceLine===undefined?'':t('Source line')+' '+r.sourceLine+' · '}${r.shift?`${t('Shift')} ${r.shift}`:t('Shift not documented')}`;
 $('#original-note-panel').hidden=!r.sourceText;
 $('#source-text').value=r.sourceText;
 const details=$('#extracted-fields');details.replaceChildren();
 for(const [field,label] of Object.entries(labels)){
  const item=node('article',undefined,'extracted-field');item.append(node('h3',t(label)),node('p',fieldValue(r,field),r[field]===null?'missing-value':'extracted-value'));
  if(r.manualEdits?.[field])item.append(node('p',t('Manually edited'),'edit-marker'));
  if(r.evidence[field]){
   if(r.manualEdits?.[field])item.append(node('p',t('Original extraction evidence'),'muted'));
   item.append(node('blockquote',r.evidence[field],'source-evidence'));
  }
  details.append(item);
 }
}
function download(content,type,ext){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=`premii-${new Date().toISOString().slice(0,10)}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportRecords(){
 return exportableRecords().map(record=>{
  const output={};
  for(const field of editorFields)output[exportColumnLabel(field)]=readableValue(field,record[field]??null);
  for(const field of ['recordId','patientKey','filename','sourceLine','extractionStatus','schemaVersion','mergedFrom']){
   if(record[field]!==undefined)output[field]=record[field];
  }
  for(const field of ['evidence','fieldStatus','fieldSources']){
   if(record[field])output[field]=Object.fromEntries(Object.entries(record[field]).map(([key,value])=>[exportColumnLabel(key),value]));
  }
  if(record.manualEdits)output.manualEdits=Object.fromEntries(
   Object.entries(record.manualEdits).map(([key,edit])=>[
    exportColumnLabel(key),{...edit,originalValue:readableValue(key,edit.originalValue)}
   ])
  );
  return output;
 });
}
$('#export-json').onclick=()=>download(JSON.stringify({instrument:'PREMII',totalScoreCalculated:false,mode:'file-only',exportFormat:'descriptive-observations-v1',records:exportRecords()},null,2),'application/json','json');
$('#export-csv').onclick=()=>{
 const columns=PREMII_FIELDS.map(exportColumnLabel);
 const rows=exportableRecords().map(record=>PREMII_FIELDS.map(key=>readableValue(key,record[key]??null)));
 const escape=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 download('\uFEFF'+[columns,...rows].map(row=>row.map(escape).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');
};
window.addEventListener('beforeunload',e=>{if(records.length){e.preventDefault();e.returnValue='';}});
window.addEventListener('languagechange',()=>{render();localizeDOM();$('#toast').textContent=translateText($('#toast').textContent);});
render();localizeDOM();

$('#show-results').onclick=()=>$('#records').focus();
$('#group-by-infant').addEventListener('change',()=>{
 recordPage=0;
 render();
});
$('#record-search').addEventListener('input',()=>{
 recordPage=0;
 render();
});
$('#quick-export-pdf').onclick=()=>$('#export-pdf').click();
$('#quick-export-csv').onclick=()=>$('#export-csv').click();
$('#previous-page').onclick=()=>{recordPage--;render();$('#records').scrollIntoView({block:'start'});};
$('#next-page').onclick=()=>{recordPage++;render();$('#records').scrollIntoView({block:'start'});};

$('#export-excel').onclick=async()=>{
 if(!records.length||exportingExcel)return;
 exportingExcel=true;render();
 try{const workbook=await createPremiiWorkbook(exportableRecords());download(workbook,PREMII_XLSX_TYPE,'xlsx');}
 catch{notify(t('Excel export failed. Please try again.'));}
 finally{exportingExcel=false;render();}
};
$('#quick-export-excel').onclick=()=>$('#export-excel').click();


const editor = $('#observation-editor');
let addingObservation=false;
const editorForm = $('#observation-form');
const editorLabels = {
 ...labels, infant:'Infant ID', date:'Date', noteTime:'Source note timestamp',
 shift:'Shift', start:'Start time', end:'End time', ABD4_1:'Stimulant name',
 THG2:'Warming device', FEED2:'Feeding method', first:'First assessment',
 baselineWeight:'Baseline weight (g)', baselineDate:'Baseline weight date',
 baselineTime:'Baseline weight time', weighed:'Weighed during shift'
};
const exportColumnOverrides = {
 infant:'Infant identifier', noteTime:'Source note time',
 RES2:'Supplemental respiratory device',
 RES3_1:'Greatest flow (milliliters per minute)',
 bradyThreshold:'Bradycardia threshold (beats per minute)',
 desatThreshold:'Desaturation threshold (percent)',
 WEIGHT1:'Lowest documented weight in this note (grams)',
 baselineWeight:'Baseline weight (grams)'
};
function exportColumnLabel(field){
 return exportColumnOverrides[field]??editorLabels[field]??field;
}
const numericFields = {
 RES3_1:[0,1999.99,'any'], bradyThreshold:[1,300,1], desatThreshold:[1,100,1],
 WEIGHT1:[1,20000,1], baselineWeight:[1,20000,1],
 ABD1_1:[0,null,1], ABD1_2:[0,null,1], ABD2_1:[0,null,1],
 ABD2_2:[0,null,1], ABD3_1:[0,null,1], ABD3_2:[0,null,1]
};
const editorFields = [...PREMII_FIELDS.slice(0,2),'noteTime',...PREMII_FIELDS.slice(2)];

$('#edit-observation').onclick=()=>{
 const record=activeRecord();
 if(record)openObservationEditor(record);
};

function openObservationEditor(record, adding=false){
 addingObservation=adding;
 $('#editor-title').textContent=t(adding?'Add record':'Edit observation');
 $('#observation-editor-error').textContent='';
 const fields=$('#observation-fields');
 fields.replaceChildren();
 for(const field of editorFields){
  const label=node('label',t(editorLabels[field]));
  const choices=options[field]??codedLabels[field];
  const input=node(choices?'select':'input');
  input.name=field;
  input.required=adding&&field==='infant';
  input.disabled=!!record.mergedFrom&&['infant','date','shift','noteTime'].includes(field);
  if(choices){
   const blank=node('option',t('Not documented'));
   blank.value='';
   input.append(blank);
   for(const [value,description] of Object.entries(choices)){
    if(!description)continue;
    const option=node('option',String(readableValue(field,value,true)));
    option.value=value;
    input.append(option);
   }
  }else if(numericFields[field]){
   const [min,max,step]=numericFields[field];
   input.type='number';
   input.min=min;
   if(max!==null)input.max=max;
   input.step=step;
  }else if(['date','WEIGHT2','baselineDate'].includes(field)){
   input.type='date';
  }else if(['noteTime','start','end','WEIGHT3','baselineTime'].includes(field)){
   input.type='time';
  }
  input.value=record[field]??'';
  input.dataset.initialValue=input.value;
  label.append(input);
  fields.append(label);
 }
 editor.showModal();
}
$('#cancel-observation').onclick=()=>editor.close();
editorForm.addEventListener('input',()=>{
 for(const field of ['OA','RES2','RES3','RES3_1','FEED1','FEED2']){
  editorForm.elements.namedItem(field).setCustomValidity('');
 }
});
editorForm.onsubmit=async event=>{
 event.preventDefault();
 const record=addingObservation?{fieldStatus:{}}:activeRecord();
 if(!record)return;
 const updated=Object.fromEntries(editorFields.map(field=>{
  const input=editorForm.elements.namedItem(field);
  const value=input.value===input.dataset.initialValue?record[field]??null:input.value.trim()||null;
  return [field,value];
 }));
 for(const [controller,field,invalid,message] of observationConstraints(updated)){
  if(!invalid||updated[field]===null||(updated[field]===record[field]&&updated[controller]===record[controller]))continue;
  const input=editorForm.elements.namedItem(field);
  input.setCustomValidity(t(message));
  input.reportValidity();
  return;
 }
 if(addingObservation){
  const submit=editorForm.querySelector('[type="submit"]');
  submit.disabled=true;
  try{
   await saveDatabaseObservation(updated);
   editor.close();
  }catch(error){
   $('#observation-editor-error').textContent=t(error.message);
  }finally{
   submit.disabled=false;
  }
  return;
 }
 let changed=false;
 for(const field of editorFields){
  const previous=record[field]??null;
  const value=updated[field];
  if(previous===value)continue;
  changed=true;
  record.manualEdits??={};
  const original=record.manualEdits[field]??{originalValue:previous,originalStatus:record.fieldStatus[field]??null};
  record[field]=value;
  if(value===original.originalValue){
   if(original.originalStatus===null)delete record.fieldStatus[field];
   else record.fieldStatus[field]=original.originalStatus;
   delete record.manualEdits[field];
  }else{
   record.manualEdits[field]=original;
   record.fieldStatus[field]='manually-edited';
  }
 }
 if(record.manualEdits&&!Object.keys(record.manualEdits).length)delete record.manualEdits;
 editor.close();
 render();
 $('#edit-observation').focus();
 if(changed)notify(t('Observation updated.'));
};

function observationConstraints(updated){
 return [
  ['RES1','OA',updated.RES1==='2','Clear oxygen concentration for low-flow support.'],
  ['RES1','RES2',updated.RES1!==null&&updated.RES1!=='5','Clear the device for this respiratory support.'],
  ['RES1','RES3',updated.RES1!==null&&updated.RES1!=='2','Clear the flow source for this respiratory support.'],
  ['RES1','RES3_1',updated.RES1!==null&&updated.RES1!=='2','Clear the flow value for this respiratory support.'],
  ['fed','FEED1',updated.fed==='no','Clear the feeding level when no feeds occurred.'],
  ['fed','FEED2',updated.fed==='no','Clear the feeding method when no feeds occurred.']
 ];
}

const mergeDialog=$('#merge-dialog');
let mergeDraft=null;

function mergeSourceLabel(record){
 return [record.filename,record.noteTime,t('Source line')+' '+record.sourceLine].filter(Boolean).join(' · ');
}

$('#merge-observations').onclick=()=>{
 const selected=activeRecord();
 const sources=sameShiftSources(selected);
 if(sources.length<2)return;
 const prototype={
  infant:selected.infant,date:selected.date,shift:selected.shift,noteTime:null,
  evidence:{},fieldStatus:{},fieldSources:{}
 };
 const conflicts=new Map();
 const conflictPanel=$('#merge-conflicts');
 conflictPanel.replaceChildren();
 $('#merge-error').textContent='';
 $('#merge-sources').replaceChildren(...sources.map(source=>node('li',mergeSourceLabel(source))));
 for(const field of PREMII_FIELDS){
  if(['infant','date','shift'].includes(field))continue;
  const present=sources.filter(source=>source[field]!=null);
  const values=new Set(present.map(source=>source[field]));
  const unresolved=sources.filter(source=>source.fieldStatus[field]==='conflicting');
  prototype[field]=null;
  if(values.size<2&&!unresolved.length){
   if(present.length)applyMergedValue(prototype,field,present[0],present);
   else prototype.fieldStatus[field]=sources.every(source=>source.fieldStatus[field]==='not-applicable')?'not-applicable':'not-found';
   continue;
  }
  const box=node('div',undefined,'merge-conflict');
  const label=node('label',t(editorLabels[field]));
  const select=node('select');
  select.name=field;
  select.required=true;
  const placeholder=node('option',t('Choose a source or leave unresolved'));
  placeholder.value='';
  select.append(placeholder);
  const blank=node('option',t('Leave unresolved'));
  blank.value='unresolved';
  select.append(blank);
  const evidence=node('ul');
  for(const [index,source] of present.entries()){
   const option=node('option',fieldValue(source,field)+' · '+mergeSourceLabel(source));
   option.value=String(index);
   select.append(option);
   const snippet=source.evidence[field];
   if(snippet&&!source.manualEdits?.[field])evidence.append(node('li',mergeSourceLabel(source)+' — '+snippet));
  }
  for(const source of unresolved){
   evidence.append(node('li',mergeSourceLabel(source)+' — '+(source.evidence[field]??t('Conflicting source values'))));
  }
  label.append(select);
  box.append(label,evidence);
  conflictPanel.append(box);
  conflicts.set(field,present);
 }
 if(conflicts.size)conflictPanel.prepend(node('h3',t('Resolve conflicting values')));
 mergeDraft={selected,sources,prototype,conflicts};
 mergeDialog.showModal();
};

function applyMergedValue(target,field,source,agreeingSources){
 target[field]=source[field];
 target.fieldStatus[field]=source.fieldStatus[field];
 target.fieldSources[field]=agreeingSources.map(item=>item.recordId);
 if(source.evidence[field]&&!source.manualEdits?.[field])target.evidence[field]=source.evidence[field];
}

$('#merge-form').onsubmit=event=>{
 event.preventDefault();
 if(!mergeDraft)return;
 const {selected,sources,prototype,conflicts}=mergeDraft;
 const current=sameShiftSources(selected);
 if(current.length!==sources.length||sources.some(source=>!current.includes(source))){
  $('#merge-error').textContent=t('The source list changed. Close this dialog and start the merge again.');
  return;
 }
 const result=structuredClone(prototype);
 const choices=new FormData(event.currentTarget);
 for(const [field,options] of conflicts){
  const index=choices.get(field);
  if(index==='unresolved'){
   result.fieldStatus[field]='conflicting';
   continue;
  }
  const source=options[Number(index)];
  if(!source)return;
  applyMergedValue(result,field,source,options.filter(item=>item[field]===source[field]));
 }
 const incompatible=observationConstraints(result).find(([,field,invalid])=>invalid&&result[field]!==null);
 if(incompatible){
  $('#merge-error').textContent=t(incompatible[3])+' '+t('Review the source observations or choose another value before merging.');
  return;
 }
 result.recordId='merged-'+(++mergeSequence);
 result.extractionStatus='merged-unverified';
 result.schemaVersion=selected.schemaVersion;
 result.mergedFrom=sources.map(({recordId,filename,sourceLine,noteTime})=>({recordId,filename,sourceLine,noteTime}));
 result.filename=sources.map(source=>source.filename).join(', ');
 result.sourceText=sources.map(source=>mergeSourceLabel(source)+'\n'+source.sourceText).join('\n\n');
 records.push(result);
 selectedRecordId=result.recordId;
 showRecordInList(result);
 mergeDialog.close();
 render();
 $('#selected-note').focus();
 notify(t('Merged observation saved.'));
};
$('#cancel-merge').onclick=()=>mergeDialog.close();
mergeDialog.addEventListener('close',()=>{mergeDraft=null;});
$('#undo-observation-merge').onclick=()=>{
 const merged=activeRecord();
 if(!merged?.mergedFrom)return;
 if(!confirm(t('Undo this merge? Changes to the merged observation will be discarded.')))return;
 records.splice(records.indexOf(merged),1);
 selectedRecordId=merged.mergedFrom[0].recordId;
 showRecordInList(activeRecord());
 render();
 $('#selected-note').focus();
 notify(t('Merge undone.'));
};
