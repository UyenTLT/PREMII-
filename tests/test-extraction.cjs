const assert=require('node:assert/strict');
global.extractSuggestions=require('../public/suggestions.js').extractSuggestions;
const {extractFileRecords,validDate}=require('../public/extraction.js');
const text=`【研究ID：00131】
2021/11/09   17:20
On nCPAP
FiO2: 35%
Weight: 1200 g
2021/11/10   09:00
Unspecified observation
【研究ID：00132】
2021/11/09   17:20
Shift: 4
Start: 20:00
End: 23:59
RES1: 2
RES3: 1
FiO2: 30%
ABD1_1: 0
Weight: 1400 g (20211109 22:00)`;
const rs=extractFileRecords(text,'synthetic.txt');
assert.equal(rs.length,3);assert.equal(rs[0].infant,'00131');assert.equal(rs[0].date,'2021-11-09');assert.equal(rs[0].noteTime,'17:20');assert.equal(rs[0].shift,null);assert.equal(rs[0].start,null);assert.equal(rs[0].RES1,'4');assert.equal(rs[0].OA,'3');assert.equal(rs[0].weighed,null);assert.equal(rs[0].WEIGHT2,null);assert.equal(rs[0].WEIGHT3,null);
assert.equal(rs[1].RES1,null);assert.equal(rs[1].ABD4,null);assert.equal(rs[1].fed,null);assert.equal(rs[1].WEIGHT1,null);
assert.equal(rs[2].infant,'00132');assert.equal(rs[2].shift,'4');assert.equal(rs[2].start,'20:00');assert.equal(rs[2].ABD1_1,'0');assert.equal(rs[2].ABD1_2,null);assert.equal(rs[2].fieldStatus.OA,'not-applicable');assert.equal(rs[2].OA,null);assert.equal(rs[2].WEIGHT2,'2021-11-09');assert.equal(rs[2].WEIGHT3,'22:00');
const empty=extractFileRecords('No usable clinical observations.','unknown.txt')[0];for(const key of ['infant','date','shift','RES1','OA','THG1','FEED1','ABD4','WEIGHT1'])assert.equal(empty[key],null);assert.equal(empty.fieldStatus.RES1,'not-found');
const conflict=extractFileRecords('RES1: 4\nRES1: 5','conflict.txt')[0];assert.equal(conflict.RES1,null);assert.equal(conflict.fieldStatus.RES1,'conflicting');
const historical=extractFileRecords('Date: 2026-11-03\nPast History:\nTPN administered\nPhysical Examination:\nNo CPAP\n10/01: intubated\nWeight: 1300 g\nBBW: 800 g','history.txt')[0];assert.equal(historical.RES1,null);assert.equal(historical.FEED1,null);assert.equal(historical.WEIGHT1,'1300');
assert.equal(validDate('2026-02-30'),null);assert.equal(validDate('20261103'),'2026-11-03');
assert.equal(extractFileRecords('Nasal cannula 0.5 L/min','intermittent.txt')[0].RES1,null);
console.log('PASS: file-only extraction, study/date separation, missingness, source timestamps, no invented shift/weight date, explicit zeros, conflicts, history isolation');

assert.equal(extractFileRecords('PREMature Infant Index Questionnaire\nInstructions: select one response.','template.pdf').length,0);

const explicit=extractFileRecords('Study ID: E001\nShift: 2\nRES1: 2\nRES3_1: 500\nWEIGHT1: 1200\nWEIGHT2: 2026-11-03\nWEIGHT3: 09:15\nfed: no\nABD1_1: 0','explicit.txt')[0];
assert.equal(explicit.RES3_1,'500');assert.equal(explicit.WEIGHT1,'1200');assert.equal(explicit.WEIGHT2,'2026-11-03');assert.equal(explicit.WEIGHT3,'09:15');assert.equal(explicit.fed,'no');assert.equal(explicit.fieldStatus.FEED1,'not-applicable');
