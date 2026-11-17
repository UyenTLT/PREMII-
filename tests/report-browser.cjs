const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PREMII_TEST_URL||'http://127.0.0.1:3000');await page.evaluate(()=>window.print=()=>{});
 const dense=['Study ID: '+ '測試'.repeat(100),'Date: 2026-11-17','Shift: 4','Start: 20:00','End: 23:59','RES1: 5','RES2: 3','OA: 4','THG1: 3','THG2: 2','fed: yes','FEED1: 5','FEED2: 2','ABD1_1: 0','ABD1_2: 1','ABD2_1: 2','ABD2_2: 3','ABD3_1: 4','ABD3_2: 5','ABD4: 1','bradyThreshold: 80','desatThreshold: 85','WEIGHT1: 2100','WEIGHT2: 2026-11-17','WEIGHT3: 21:00','first: yes','baselineWeight: 2200','baselineDate: 2026-11-17','baselineTime: 19:00'].map((line,i)=>i>4?line+' '+ '來源文字測試'.repeat(40):line).join('\n');
 const cases=[['short','Study ID: SHORT\nDate: 2026-11-17\nOn nCPAP\nFiO2: 35%\nWeight: 1200 g',1],['unknown','Study ID: UNKNOWN\nNo usable observations.',1],['dense',dense,2],['wrapped','Study ID: '+ '測試'.repeat(60)+'\nDate: 2026-11-17\nOn nCPAP\nFiO2: 35%\nWEIGHT1: 2100\nFEED1: 2',2]];
 const output=[];
 for(const [name,text,expected] of cases){
  await page.setInputFiles('#source-file',{name:name==='dense'?'來源病歷'.repeat(40)+'.txt':name+'.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
  for(const lang of ['en','zh-Hant']){
   await page.selectOption('#language',lang);await page.click('#quick-export-pdf');const domCount=await page.locator('.report-page').count();assert.equal(domCount,expected);
   const file=`/tmp/premii-report-${name}-${lang}.pdf`;await page.pdf({path:file,preferCSSPageSize:true});const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});const pages=Number(info.match(/Pages:\s+(\d+)/)[1]);assert.equal(pages,expected,`${name}/${lang} overflowed`);
   const content=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});assert.match(content,/PREMII/);assert.ok(content.length>400,`${name}/${lang} has no readable content`);assert.match(content,lang==='en'?/Respiratory support & oxygen/:/呼吸輔助與供氧/);assert.match(content,lang==='en'?/Thermoregulation/:/體溫調節/);if(name==='unknown')assert.doesNotMatch(content,/2026-11-17/);
   if(name==='dense'){assert.match(content,/2100/);assert.match(content,/2200/);assert.match(content,/20:00/);assert.match(content,/23:59/);assert.match(content,/21:00/);assert.match(content,/19:00/);}
   assert.equal(await page.locator('.pdf-weights tbody tr').count(),2);assert.equal(await page.locator('.pdf-events tbody tr').count(),3);if(name==='dense')assert.equal(await page.locator('.pdf-events tbody tr').first().locator('td').first().innerText(),'0');if(name==='unknown')assert.equal(await page.locator('.pdf-events tbody tr').first().locator('td').first().innerText(),'—');
   output.push({name,lang,pages,bytes:fs.statSync(file).size});
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,reports:output}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
