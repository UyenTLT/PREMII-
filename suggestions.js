'use strict';
// Conservative text rules, not a clinical inference model. Operates only on a user-selected shift excerpt.
function extractSuggestions(text){
 const found=new Map();
 const add=(field,value,evidence)=>{if(!found.has(field))found.set(field,{field,value:String(value),evidence:evidence.trim().slice(0,400)});};
 const lines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
 const ranges={RES1:[0,5],OA:[1,6],THG1:[1,3],FEED1:[1,6],RES2:[1,3],RES3:[1,2],THG2:[1,2],FEED2:[1,2],ABD4:[0,1]};
 for(const line of lines){
  for(const [field,[min,max]] of Object.entries(ranges)){
   const match=line.match(new RegExp('\\b'+field+'\\s*[:=：]\\s*(\\d+)\\b','i'));
   if(match&&+match[1]>=min&&+match[1]<=max)add(field,match[1],line);
  }
  for(const field of ['ABD1_1','ABD1_2','ABD2_1','ABD2_2','ABD3_1','ABD3_2']){
   const m=line.match(new RegExp('\\b'+field+'\\s*[:=：]\\s*(\\d+)\\b','i'));if(m&&+m[1]<=10000)add(field,m[1],line);
  }
 }
 const positive=lines.filter(line=>!/(?:\b(?:no|not|without|off|stop(?:ped)?|discontinued|history|previous(?:ly)?|weaned)\b|未使用|未給予|無需|停用|移除|曾經|病史)/i.test(line));
 const resp=[];
 for(const line of positive){
  if(/(?:\b(?:intubat(?:ed|ion)|endotracheal|tracheostomy|mechanical ventilation|SIMV|HFOV|NIPPV)\b|氣管插管|氣管造口)/i.test(line))resp.push([5,line]);
  else if(/(?:\b(?:n?CPAP|HFNC|high[- ]flow nasal)\b|呼吸壓力輔助|高流量鼻導管)/i.test(line))resp.push([4,line]);
  else if(/(?:nasal cannula|\bNC\b|鼻導管)/i.test(line)){
   const m=line.match(/(\d+(?:\.\d+)?)\s*(L\s*\/\s*min|LPM|cc\s*\/\s*min|mL\s*\/\s*min)/i);
   if(m){const cc=+m[1]*(/^(?:L\s*\/|LPM)/i.test(m[2])?1000:1);if(cc>0){resp.push([cc>=2000?4:2,line]);if(cc<2000)add('RES3_1',cc,line);}}
  }
 }
 if(resp.length){resp.sort((a,b)=>b[0]-a[0]);add('RES1',resp[0][0],resp[0][1]);}
 const oxygen=[];
 for(const line of positive){const m=line.match(/(?:FiO[₂2]|oxygen concentration|供氧濃度|氧氣濃度)\s*[:=：]?\s*(\d+(?:\.\d+)?)\s*(%)?/i);if(m){let n=+m[1];if(!m[2]&&n>0&&n<=1)n*=100;if(n>=21&&n<=100)oxygen.push([n,line]);}}
 if(oxygen.length&&found.get('RES1')?.value!=='2'){
  oxygen.sort((a,b)=>b[0]-a[0]);const [n,line]=oxygen[0];add('OA',n>=61?6:n>=51?5:n>=41?4:n>=31?3:n>=22?2:1,line);
 }
 const weights=[];
 for(const line of positive){
  const m=line.match(/(?:\b(?:body weight|weight|BW)\b|體重)\s*[:=：]?\s*(\d+(?:\.\d+)?)\s*(kg|gm|grams?|g|公克|克|公斤)/i);
  if(m){const g=Math.round(+m[1]*(/^(kg|公斤)$/i.test(m[2])?1000:1));if(g>0&&g<=20000)weights.push([g,line]);}
  if(/(?:heated incubator|closed incubator|radiant warmer|封閉.*保溫箱|輻射式保溫器)/i.test(line))add('THG1',3,line);
  if(/(?:\bTPN\b|total parenteral nutrition|intravenous nutrition|靜脈營養)/i.test(line)){add('fed','yes',line);add('FEED1',6,line);}
  if(/(?:\bcaffeine\b|咖啡因)/i.test(line)&&/(?:\d|prescrib|administ|given|使用|給予|服用)/i.test(line))add('ABD4',1,line);
 }
 if(weights.length){weights.sort((a,b)=>a[0]-b[0]);add('weighed','yes',weights[0][1]);add('WEIGHT1',weights[0][0],weights[0][1]);}
 return [...found.values()];
}
if(typeof module!=='undefined')module.exports={extractSuggestions};
