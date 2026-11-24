'use strict';
// Conservative text rules, not a clinical inference model. Operates on a single separated source note; unknown values remain absent.
function oxygenCategory(percent){
 if(percent===21)return 1;
 if(percent>=22&&percent<=30)return 2;
 if(percent>=31&&percent<=40)return 3;
 if(percent>=41&&percent<=50)return 4;
 if(percent>=51&&percent<=60)return 5;
 if(percent>=61&&percent<=100)return 6;
 return null;
}

function documentedFiO2(text){
 const readings=[];
 const value=String.raw`(\d+(?:\.\d+)?|\.\d+)\s*(%)?(?![\d.]|\s*[-–~])`;
 const label=String.raw`(?:\bFi[ \t]*O[ \t]*2\b|\b(?:inspired )?oxygen concentration\b|吸入氧氣濃度|吸氧濃度|供氧濃度|氧氣濃度)`;
 const setting=new RegExp(label+String.raw`\s*(\(%\))?\s*[:=]?\s*(?:(?:was\s+)?(?:weaned|titrated|reduced|increased|decreased|adjusted|changed)\s+(?:from|to)\s+|at\s+|of\s+)?`+value+String.raw`(?:\s*(?:→|->|to\b)\s*`+value+')?','gi');
 const context=/\b(?:no|not|without|off|stopped|discontinued|history|previous(?:ly)?|plan(?:ned)?|consider|target|goal|if)\b|未使用|未給予|無需|停用|曾經|病史|預計|目標|考慮/i;
 for(const line of text.split('\n')){
  for(const clause of line.normalize('NFKC').split(/[;。]|,(?=\s*[^\d\s])/)){
   if(context.test(clause))continue;
   for(const match of clause.matchAll(setting)){
    for(const [number,unit] of [[match[2],match[3]],[match[4],match[5]]]){
     if(number===undefined)continue;
     const numeric=Number(number);
     const percent=unit||match[1]||numeric>1?numeric:Math.round(numeric*10000)/100;
     if(percent>=21&&percent<=100)readings.push({percent,evidence:line.trim()});
    }
   }
  }
 }
 return readings;
}

function extractSuggestions(text,fio2Readings=documentedFiO2(text)){
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
  if(/(?:\b(?:intubat(?:ed|ion)|endotracheal|tracheostomy|mechanical ventilation|SIMV|HFOV)\b|氣管插管|氣管造口)/i.test(line))resp.push([5,line]);
  else if(/(?:\b(?:n?CPAP|NIPPV|HFNC|high[- ]flow nasal)\b|呼吸壓力輔助|高流量鼻導管)/i.test(line))resp.push([4,line]);
  else if(/(?:nasal cannula|\bNC\b|鼻導管)/i.test(line)){
   const m=line.match(/(\d+(?:\.\d+)?)\s*(L\s*\/\s*min|LPM|cc\s*\/\s*min|mL\s*\/\s*min)/i);
   if(m){const cc=+m[1]*(/^(?:L\s*\/|LPM)/i.test(m[2])?1000:1);if(cc>0){if(cc>=2000||/continuous|持續|連續/i.test(line))resp.push([cc>=2000?4:2,line]);if(cc<2000)add('RES3_1',cc,line);}}
  }
 }
 if(resp.length){resp.sort((a,b)=>b[0]-a[0]);add('RES1',resp[0][0],resp[0][1]);}
 const oxygen=fio2Readings.reduce((highest,reading)=>
  !highest||reading.percent>highest.percent?reading:highest,null);
 if(oxygen&&found.get('RES1')?.value!=='2'){
  const category=oxygenCategory(oxygen.percent);
  if(category!==null)add('OA',category,oxygen.evidence);
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
if(typeof module!=='undefined')module.exports={extractSuggestions,documentedFiO2,oxygenCategory};
