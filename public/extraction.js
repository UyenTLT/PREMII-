'use strict';
const PREMII_FIELDS=['infant','date','shift','start','end','RES1','RES2','RES3','RES3_1','OA','bradyThreshold','desatThreshold','ABD1_1','ABD1_2','ABD2_1','ABD2_2','ABD3_1','ABD3_2','ABD4','ABD4_1','THG1','THG2','fed','FEED1','FEED2','first','baselineWeight','baselineDate','baselineTime','weighed','WEIGHT1','WEIGHT2','WEIGHT3'];
function validDate(raw){
 const m=raw.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);if(!m)return null;
 const s=`${m[1]}-${m[2]}-${m[3]}`;const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;
}
function segmentFile(text){
 const cases=[...text.matchAll(/^[ \t]*【\s*研究\s*ID\s*[:：]\s*([^】\r\n]+)】[^\r\n]*|^[ \t]*(?:Study\s*ID|Infant\s*ID|研究代碼|研究編號)\s*[:：]\s*([^\r\n]+)/gim)];
 // A missing patient identifier never becomes a guessed identifier.
 if(!cases.length)cases.push({index:0,0:'',1:null});
 const segments=[];
 for(let ci=0;ci<cases.length;ci++){
  const c=cases[ci];const infant=(c[1]??c[2])?.trim()||null;
  const begin=c.index+c[0].length;const end=cases[ci+1]?.index??text.length;const body=text.slice(begin,end);
  const dates=[...body.matchAll(/^[ \t]*(?:(\d{4}[/-]\d{2}[/-]\d{2})[ \t]+([0-2]\d:[0-5]\d)|(?:Date|日期|記錄日期)\s*[:：]\s*(\d{4}[/-]\d{2}[/-]\d{2}))[ \t]*\r?$/gim)];
  const parts=[];
  if(dates.length&&body.slice(0,dates[0].index).trim())parts.push({from:0,to:dates[0].index,date:null,time:null});
  if(!dates.length)parts.push({from:0,to:body.length,date:null,time:null});
  for(let i=0;i<dates.length;i++){const d=dates[i];parts.push({from:d.index,to:dates[i+1]?.index??body.length,date:validDate(d[1]??d[3]),time:d[2]&&+d[2].slice(0,2)<24?d[2]:null});}
  for(const part of parts){const content=body.slice(part.from,part.to).trim();if(content)segments.push({infant,caseIndex:ci,date:part.date,noteTime:part.time,text:content,line:text.slice(0,begin+part.from).split('\n').length});}
 }
 return segments;
}
function currentObservations(text,date){
 let historical=false;
 return text.split('\n').filter(line=>{
  if(/(?:過去病史|個人病史|家族史|病史\(Summary of History\)|Past History|Personal History|Family History|Summary of History)/i.test(line)){historical=true;return false;}
  if(historical&&/(?:系統整理|理學檢查|實驗室檢查|臨床臆斷|處理計畫|Review of System|Physical Examination|Laboratory Findings|Impression|Plan)/i.test(line))historical=false;
  if(historical)return false;
  if(/(?:\b(?:birth|BBW|history|previously|planned|consider|if|rule out)\b|出生體重|曾經|病史|預計|考慮|若)/i.test(line))return false;
  const dates=[...line.matchAll(/\b(\d{4}[/-]\d{2}[/-]\d{2})\b/g)].map(m=>validDate(m[1]));
  if(date&&dates.some(d=>d&&d!==date))return false;
  // Timelines in progress notes are not assumed to describe current support.
  const shortDates=[...line.matchAll(/(?:^|[\s(（\[,，])(?:\d{4}[/-])?(\d{1,2})\/(\d{1,2})(?=[\s,:：，)）\]-]|$)/g)];
  if(date&&shortDates.some(m=>Number(m[1])!==Number(date.slice(5,7))||Number(m[2])!==Number(date.slice(8,10))))return false;
  return true;
 }).join('\n');
}
function isQuestionnaireTemplate(text){
 const identified=/(?:研究\s*ID|Study\s*ID|Infant\s*ID)\s*[:：]\s*[^\s】]+/i.test(text);
 return !identified&&(/PREMature Infant Index Questionnaire/i.test(text)&&/Instructions:/i.test(text)||/RES1[\s\S]*FEED1/.test(text)&&/請選擇/.test(text));
}
function extractFileRecords(text,filename,fileId='file-1'){
 if(isQuestionnaireTemplate(text))return [];
 return segmentFile(text).map((segment,index)=>{
  const r=Object.fromEntries(PREMII_FIELDS.map(k=>[k,null]));
  r.infant=segment.infant;r.date=segment.date;r.recordId=`${fileId}-${index+1}`;r.patientKey=`${fileId}-${segment.caseIndex}`;r.noteTime=segment.noteTime;
  r.filename=filename;r.sourceLine=segment.line;r.extractionStatus='automated-unverified';r.schemaVersion='premii-file-observations-v2';r.evidence={};r.fieldStatus=Object.fromEntries(PREMII_FIELDS.map(k=>[k,'not-found']));
  const clinical=currentObservations(segment.text,segment.date);
  const proposals=extractSuggestions(clinical);
  for(const p of proposals){if(p.field==='weighed')continue;r[p.field]=p.value;r.evidence[p.field]=p.evidence;r.fieldStatus[p.field]='extracted';}
  const set=(field,v,evidence)=>{if(v!==null&&v!==undefined){r[field]=v;r.fieldStatus[field]='extracted';r.evidence[field]=evidence;}};
  if(r.infant)set('infant',r.infant,'Source study/infant ID heading');if(r.date)set('date',r.date,'Source dated note heading');
  const shift=segment.text.match(/(?:\bShift|班別)\s*[:：]\s*([1-4])\b|第\s*([1-4])\s*班/i);if(shift)set('shift',shift[1]??shift[2],shift[0]);
  if(r.shift&&r.WEIGHT1!==null)set('weighed','yes',r.evidence.WEIGHT1);
  for(const [field,label] of [['start','Start'],['end','End']]){const m=segment.text.match(new RegExp('(?:\\b'+label+'(?: time)?|'+(field==='start'?'開始時間':'結束時間')+')\\s*[:：]\\s*([0-2]\\d:[0-5]\\d)','i'));if(m&&+m[1].slice(0,2)<24)set(field,m[1],m[0]);}
  for(const [field,re] of [['bradyThreshold',/(?:bradycardia threshold|心跳過緩(?:定義|閾值)?)\s*(?:[:：]|[≤≦]|<=)\s*(\d+)/i],['desatThreshold',/(?:desaturation threshold|血氧濃度過低(?:定義|閾值)?)\s*(?:[:：]|[≤≦]|<=)\s*(\d+)/i]]){const m=clinical.match(re);if(m&&+m[1]>0&&+m[1]<=(field==='bradyThreshold'?300:100))set(field,m[1],m[0]);}
  const numeric={RES3_1:[0,1999.99,false],WEIGHT1:[1,20000,true],baselineWeight:[1,20000,true],bradyThreshold:[1,300,true],desatThreshold:[1,100,true]};
  for(const [field,[min,max,integer]] of Object.entries(numeric)){
   const matches=[...clinical.matchAll(new RegExp('\\b'+field+'\\s*[:=：]\\s*(\\d+(?:\\.\\d+)?)\\b','gi'))].filter(m=>+m[1]>=min&&+m[1]<=max&&(!integer||Number.isInteger(+m[1])));
   if(new Set(matches.map(m=>String(+m[1]))).size>1){r[field]=null;r.fieldStatus[field]='conflicting';r.evidence[field]=matches.map(m=>m[0]).join(' / ');}else if(matches[0])set(field,String(+matches[0][1]),matches[0][0]);
  }
  for(const field of ['fed','weighed','first']){const m=clinical.match(new RegExp('\\b'+field+'\\s*[:=：]\\s*(yes|no|true|false|on|off|1|0)\\b','i'));if(m){const yes=/^(yes|true|on|1)$/i.test(m[1]);set(field,field==='first'?(yes?'on':'off'):(yes?'yes':'no'),m[0]);}}
  for(const field of ['WEIGHT2','baselineDate']){const m=clinical.match(new RegExp('\\b'+field+'\\s*[:=：]\\s*(\\d{4}[/-]\\d{2}[/-]\\d{2}|\\d{8})\\b','i'));if(m&&validDate(m[1]))set(field,validDate(m[1]),m[0]);}
  for(const field of ['WEIGHT3','baselineTime']){const m=clinical.match(new RegExp('\\b'+field+'\\s*[:=：]\\s*([0-2]\\d:[0-5]\\d)\\b','i'));if(m&&+m[1].slice(0,2)<24)set(field,m[1],m[0]);}
  // Resolve explicit coded contradictions instead of selecting an arbitrary value.
  for(const field of PREMII_FIELDS.filter(k=>/^(?:RES[123]|OA|THG[12]|FEED[12]|ABD4|ABD[123]_[12])$/.test(k))){const matches=[...clinical.matchAll(new RegExp('\\b'+field+'\\s*[:=：]\\s*(\\d+)\\b','gi'))];if(new Set(matches.map(m=>m[1])).size>1){r[field]=null;r.fieldStatus[field]='conflicting';r.evidence[field]=matches.map(m=>m[0]).join(' / ');}}
  if(r.RES1==='2'){r.OA=null;r.fieldStatus.OA='not-applicable';delete r.evidence.OA;}
  if(r.fed==='no'){const conflict=r.FEED1!==null;r.FEED1=null;r.fieldStatus.FEED1=conflict?'conflicting':'not-applicable';if(conflict)r.evidence.FEED1=(r.evidence.FEED1??'')+' / '+r.evidence.fed;}
  if(r.FEED1!==null&&r.fed===null)set('fed','yes',r.evidence.FEED1);
  if(r.WEIGHT1!==null){const weightLine=r.evidence.WEIGHT1??'';const m=weightLine.match(/\b(\d{4}[/-]\d{2}[/-]\d{2}|\d{8})\b/);if(m&&validDate(m[1]))set('WEIGHT2',validDate(m[1]),weightLine);const tm=weightLine.match(/\b([0-2]\d:[0-5]\d)\b/);if(tm&&+tm[1].slice(0,2)<24)set('WEIGHT3',tm[1],weightLine);}
  if(r.RES1!==null&&r.RES1!=='5'){r.RES2=null;r.fieldStatus.RES2='not-applicable';}
  if(r.RES1!==null&&r.RES1!=='2')for(const k of ['RES3','RES3_1']){r[k]=null;r.fieldStatus[k]='not-applicable';}
  r.sourceText=segment.text;
  return r;
 });
}
if(typeof module!=='undefined')module.exports={PREMII_FIELDS,validDate,segmentFile,currentObservations,isQuestionnaireTemplate,extractFileRecords};
