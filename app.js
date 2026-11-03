'use strict';
const $=s=>document.querySelector(s);
const records=[];
let selectedRecordId=null;
const options = {
 RES1: ["No supplemental oxygen and no pulmonary medication","Supplemental oxygen, not continuously, or pulmonary medication","Continuous low-flow nasal cannula (< 2 L/min)","Continuous supplemental oxygen, not through a nasal cannula","Respiratory pressure support (nCPAP or high flow ≥ 2 L/min)","Mechanical ventilation via endotracheal tube, tracheostomy tube or mask"],
 OA: [null,"21% · Room air",'22–30%','31–40%','41–50%','51–60%','≥ 61%'],
 THG1: [null,"Open bassinet or cot, no additional warming support","Open bassinet or cot, additional warming support required","Closed, heated incubator or radiant warmer"],
 FEED1: [null,"All feeds by breast or bottle, no breathing or swallowing problems; all feeds ≤ 30 minutes","All feeds by breast or bottle, no breathing or swallowing problems; at least one feed > 30 minutes","All feeds by breast or bottle, with breathing or swallowing problems","Some tube feeds and some breast or bottle feeds, without breathing or swallowing problems","Some tube feeds and some breast or bottle feeds, with breathing or swallowing problems","Any intravenous nutrition or all feeds by enteral feeding tube"]
};
const labels={RES1:'Respiratory support',RES2:'Device (supplemental, unscored)',RES3:'Flow source',RES3_1:'Greatest flow (cc/min)',OA:'Oxygen concentration',bradyThreshold:'Bradycardia threshold ≤ (beats/min)',desatThreshold:'Desaturation threshold ≤ (%)',ABD1_1:'Apnea · Required intervention',ABD1_2:'Apnea · No intervention required',ABD2_1:'Bradycardia · Required intervention',ABD2_2:'Bradycardia · No intervention required',ABD3_1:'Desaturation · Required intervention',ABD3_2:'Desaturation · No intervention required',ABD4:'Prescribed caffeine or other stimulant',THG1:'Thermoregulation',fed:'Feeds during shift',FEED1:'Feeding',WEIGHT1:'Lowest documented weight in this note (g)',WEIGHT2:'Weighing date',WEIGHT3:'Weighing time'};
function missing(r,field){return t(r.fieldStatus?.[field]==='not-applicable'?'Not applicable':r.fieldStatus?.[field]==='conflicting'?'Conflicting source values':'Not found in source');}
function fieldValue(r,field){
 if(r[field]===null||r[field]===undefined||r[field]==='')return missing(r,field);
 if(options[field])return t(options[field][Number(r[field])])+` [${r[field]}]`;
 const yesNo={ABD4:{'1':'Yes','0':'No'},fed:{yes:'Yes',no:'No'},weighed:{yes:'Yes',no:'No'},RES2:{'3':'Endotracheal tube','2':'Tracheostomy tube','1':'Mask'},RES3:{'2':'Air flow meter','1':'Oxygen flow meter'}};
 return yesNo[field]?t(yesNo[field][r[field]]??r[field]):String(r[field]);
}
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function activeRecord(){return records.find(r=>r.recordId===selectedRecordId);}
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
function render(){
 $('#record-count').textContent=records.length;$('#empty-state').hidden=!!records.length;$('#results-section').hidden=!records.length;
 for(const id of ['export-json','export-csv','export-pdf'])$('#'+id).disabled=!records.length;
 const body=$('#records-table tbody');body.replaceChildren();
 for(const r of records){const row=document.createElement('tr');row.className=r.recordId===selectedRecordId?'selected-record':'';const view=node('button',t('View source results'),'secondary');view.type='button';view.onclick=()=>{selectedRecordId=r.recordId;render();$('#results-section').scrollIntoView({behavior:'smooth'});};
  for(const value of [r.infant??t('Not found in source'),r.date??t('Date not documented'),r.shift?`${t('Shift')} ${r.shift}`:t('Shift not documented'),Object.keys(labels).filter(k=>r[k]!==null&&r[k]!==undefined).length+' / '+Object.keys(labels).length])row.append(node('td',value));const td=node('td');td.append(view);row.append(td);body.append(row);
 }
 const r=activeRecord();if(!r)return;
 $('#selected-note').textContent=`${r.infant??t('Infant ID not documented')} · ${r.date??t('Date not documented')} ${r.noteTime??''}`;
 $('#source-context').textContent=`${r.filename} · ${t('Source line')} ${r.sourceLine} · ${r.shift?`${t('Shift')} ${r.shift}`:t('Shift not documented')}`;
 $('#source-text').value=r.sourceText;
 const details=$('#extracted-fields');details.replaceChildren();
 for(const [field,label] of Object.entries(labels)){
  const item=node('article',undefined,'extracted-field');item.append(node('p',field,'eyebrow'),node('h3',t(label)),node('p',fieldValue(r,field),r[field]===null?'missing-value':'extracted-value'));
  if(r.evidence[field])item.append(node('blockquote',r.evidence[field],'source-evidence'));details.append(item);
 }
}
function download(content,type,ext){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=`premii-${new Date().toISOString().slice(0,10)}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportRecords(){return records.map(({sourceText,...r})=>r);}
$('#export-json').onclick=()=>download(JSON.stringify({instrument:'PREMII',totalScoreCalculated:false,mode:'file-only',records:exportRecords()},null,2),'application/json','json');
$('#export-csv').onclick=()=>{const rows=exportRecords();const keys=[...new Set(rows.flatMap(Object.keys))];const esc=v=>'"'+(typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'')).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';download('\uFEFF'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(esc).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');};
window.addEventListener('beforeunload',e=>{if(records.length){e.preventDefault();e.returnValue='';}});
window.addEventListener('languagechange',()=>{render();localizeDOM();$('#toast').textContent=translateText($('#toast').textContent);});
render();localizeDOM();
