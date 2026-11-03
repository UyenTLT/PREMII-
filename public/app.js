'use strict';
const $ = s => document.querySelector(s);
const form = $('#assessment-form');
const records = [];
let appliedSource = null;
const options = {
 RES1: [t("No supplemental oxygen and no pulmonary medication"),t("Supplemental oxygen, not continuously, or pulmonary medication"),t("Continuous low-flow nasal cannula (< 2 L/min)"),t("Continuous supplemental oxygen, not through a nasal cannula"),t("Respiratory pressure support (nCPAP or high flow ≥ 2 L/min)"),t("Mechanical ventilation via endotracheal tube, tracheostomy tube or mask")],
 OA: [null,t("21% · Room air"),'22–30%','31–40%','41–50%','51–60%','≥ 61%'],
 THG1: [null,t("Open bassinet or cot, no additional warming support"),t("Open bassinet or cot, additional warming support required"),t("Closed, heated incubator or radiant warmer")],
 FEED1: [null,t("All feeds by breast or bottle, no breathing or swallowing problems; all feeds ≤ 30 minutes"),t("All feeds by breast or bottle, no breathing or swallowing problems; at least one feed > 30 minutes"),t("All feeds by breast or bottle, with breathing or swallowing problems"),t("Some tube feeds and some breast or bottle feeds, without breathing or swallowing problems"),t("Some tube feeds and some breast or bottle feeds, with breathing or swallowing problems"),t("Any intravenous nutrition or all feeds by enteral feeding tube")]
};
function radios(target, name, reverse = true) {
 const values = options[name].map((label, value) => ({label,value})).filter(x=>x.label);
 if (reverse) values.reverse();
 for (const {label,value} of values) {
  const row = document.createElement('label'); row.className='option';
  const input = document.createElement('input'); input.type='radio'; input.name=name; input.value=value; input.required=true;
  const text = document.createElement('span'); text.textContent=label;
  const badge=document.createElement('b'); badge.textContent=String(value).padStart(2,'0');
  row.append(input,text,badge); $(target).append(row);
 }
}
radios('#resp-options','RES1');radios('#oxygen-options','OA',false);radios('#thermal-options','THG1');radios('#feeding-options','FEED1');
[t("Apnea"),t("Bradycardia"),t("Desaturation")].forEach((title,i)=>{
 const row=document.createElement('div');row.className='event-row';
 const label=document.createElement('span');label.textContent=title;row.append(label);
 for(let j=1;j<=2;j++) {const input=document.createElement('input');input.type='number';input.name=`ABD${i+1}_${j}`;input.min=0;input.max=10000;input.step=1;input.required=true;input.placeholder='0';input.setAttribute('aria-label',`${title} — ${t(j===1?"Required intervention":"No intervention required")}`);row.append(input);}
 $('#events').append(row);
});
function value(name){return new FormData(form).get(name);}
function toggle(selector, show, requiredNames=[]) {
 const el=$(selector);el.hidden=!show;
 el.querySelectorAll('input,select').forEach(input=>{input.disabled=!show;input.required=show&&requiredNames.includes(input.name);});
}
function sync(){
 toggle('#vent-detail',value('RES1')==='5');
 toggle('#flow-detail',value('RES1')==='2',['RES3','RES3_1']);
 toggle('#oxygen',value('RES1')!=='2',['OA']);
 toggle('#thermal-detail',value('THG1')==='3');
 toggle('#feeding-detail',value('fed')==='yes',['FEED1']);
 toggle('#stimulant-detail',value('ABD4')==='1');
 toggle('#baseline',value('first')==='on',['baselineWeight','baselineDate','baselineTime']);
 toggle('#weight-detail',value('weighed')==='yes',['WEIGHT1','WEIGHT2','WEIGHT3']);
 const complete = [ ['infant','date','shift','start','end'].every(n=>value(n)), value('RES1')!==null && (value('RES1')==='2'?value('RES3')&&value('RES3_1'):value('OA')), ['bradyThreshold','desatThreshold','ABD4',...Array.from({length:3},(_,i)=>[`ABD${i+1}_1`,`ABD${i+1}_2`]).flat()].every(n=>value(n)!==null&&value(n)!==''), value('THG1'), value('fed')==='no'||value('fed')==='yes'&&value('FEED1'), value('weighed') && (value('weighed')==='no'||['WEIGHT1','WEIGHT2','WEIGHT3'].every(n=>value(n))) && (!value('first')||['baselineWeight','baselineDate','baselineTime'].every(n=>value(n))) ];
 const count=complete.filter(Boolean).length;$('#progress').value=count;$('#progress-text').textContent=`${count} / 6 ${t("sections complete")}`;
 $('#summary-values').replaceChildren();
 for(const [name,label] of [['RES1',t("Respiratory support")],['OA',t("Oxygen concentration")],['THG1',t("Temperature regulation")],['FEED1',t("Feeding")]]) {const row=document.createElement('div');row.className='summary-row';const text=document.createElement('span');text.textContent=label;const badge=document.createElement('b');badge.textContent=value(name)??((name==='OA'&&value('RES1')==='2'||name==='FEED1'&&value('fed')==='no')?t("Skipped"):'—');row.append(text,badge);$('#summary-values').append(row);}
}
form.addEventListener('input',sync);form.addEventListener('change',sync);
form.addEventListener('reset',()=>setTimeout(sync,0));
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function render(){
 $('#record-count').textContent=records.length;$('#empty-state').hidden=records.length>0;$('#records-table').hidden=!records.length;
 $('#export-json').disabled=$('#export-csv').disabled=$('#export-pdf').disabled=!records.length;
 const body=$('#records-table tbody');body.replaceChildren();
 records.forEach((r,i)=>{const row=document.createElement('tr');for(const text of [r.infant,`${r.date} · ${t("Shift")} ${r.shift}`,r.RES1,r.OA??'N/A',r.THG1,r.FEED1??'N/A',r.WEIGHT1?`${r.WEIGHT1} g`:t("Not weighed")]){const td=document.createElement('td');td.textContent=text;row.append(td);}const td=document.createElement('td');const del=document.createElement('button');del.className='delete';del.textContent=t("Delete");del.setAttribute('aria-label',`${t("Delete assessment")} ${r.infant} ${t("Shift")} ${r.shift}`);del.onclick=()=>{if(confirm(t("Delete this record from this session?"))){records.splice(i,1);render();}};td.append(del);row.append(td);body.append(row);});
}
form.addEventListener('submit',e=>{e.preventDefault();sync();if(!form.reportValidity())return;const r=Object.fromEntries(new FormData(form));for(const n of ['OA','FEED1','RES2','RES3','RES3_1','THG2','FEED2','ABD4_1','WEIGHT1','WEIGHT2','WEIGHT3','baselineWeight','baselineDate','baselineTime']) if(!(n in r)) r[n]=null;if(appliedSource)r.sourceReview=structuredClone(appliedSource);r.recordedAt=new Date().toISOString();r.schemaVersion='premii-item-codes-v1';if(records.some(x=>x.infant===r.infant&&x.date===r.date&&x.shift===r.shift&&x.start===r.start)){notify(t("A record already exists for this infant and shift. Delete it before saving a replacement."));return;}records.push(r);render();notify(t("Assessment saved. Export your data before closing the page."));$('#records').scrollIntoView({behavior:'smooth'});});
function download(content,type,ext){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=`premii-${new Date().toISOString().slice(0,10)}.${ext}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-json').onclick=()=>download(JSON.stringify({instrument:'PREMII',totalScoreCalculated:false,records},null,2),'application/json','json');
$('#export-csv').onclick=()=>{const keys=[...new Set(records.flatMap(Object.keys))];const escape=v=>'"'+(typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'')).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';download('\uFEFF'+[keys,...records.map(r=>keys.map(k=>r[k]))].map(row=>row.map(escape).join(',')).join('\r\n'),'text/csv;charset=utf-8','csv');};
window.addEventListener('beforeunload',e=>{if(records.length){e.preventDefault();e.returnValue='';}});
const today=new Date();form.elements.date.value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
sync();

window.addEventListener('languagechange',()=>{sync();render();localizeDOM();$('#toast').textContent=translateText($('#toast').textContent);});
localizeDOM();
