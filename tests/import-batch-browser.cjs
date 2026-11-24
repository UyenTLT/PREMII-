const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
// Optional private input files are passed at runtime, never committed as fixtures.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PREMII_TEST_URL||'http://127.0.0.1:3000');
 const files=process.argv.slice(2);const count=files.length?Number(process.env.PREMII_EXPECTED_RECORDS):65;const infantCount=files.length?Number(process.env.PREMII_EXPECTED_INFANTS):65;assert.ok(Number.isInteger(count)&&count>0,'Set PREMII_EXPECTED_RECORDS for private inputs');assert.ok(Number.isInteger(infantCount)&&infantCount>0,'Set PREMII_EXPECTED_INFANTS for private inputs');
 const fixture=Array.from({length:65},(_,i)=>`【研究ID：TEST-${String(i+1).padStart(3,'0')}】\nDate: 2026-11-03\nOn nCPAP\nFiO2: 35%\nWeight: 1200 g`);
 const batch= [fixture.slice(0,32),fixture.slice(32)].map((items,index)=>({name:`batch-${index+1}.txt`,mimeType:'text/plain',buffer:Buffer.from(items.join('\n'))}));
 await page.setInputFiles('#source-file',files.length?files:batch);
 await page.waitForFunction(()=>!document.querySelector('#source-file').disabled,{},{timeout:120000});
 await page.locator('#group-by-infant').uncheck();
 assert.equal(await page.locator('#record-count').innerText(),String(count));assert.equal(await page.locator('#records-table tbody tr').count(),20);assert.equal(await page.locator('#output-ready').isVisible(),true);assert.match(await page.locator('#output-summary').innerText(),new RegExp(String(count)));assert.equal(await page.locator('#quick-export-pdf').isEnabled(),true);
 assert.equal(await page.locator('#results-section').evaluate(el=>el.compareDocumentPosition(document.querySelector('#records'))&Node.DOCUMENT_POSITION_PRECEDING),2);
 await page.waitForTimeout(500);const outputY=await page.locator('#output-ready').evaluate(el=>el.getBoundingClientRect().top);assert.ok(outputY>-200&&outputY<500,`outputY=${outputY}`);
 await page.click('#next-page');assert.match(await page.locator('#page-summary').innerText(),/2 \/ /);assert.equal(await page.locator('#records-table tbody tr').count(),20);await page.locator('#records-table tbody tr').first().getByRole('button').click();assert.equal(await page.locator('#results-section').isVisible(),true);
 const out=process.env.PREMII_ARTIFACT_DIR||'/tmp';fs.mkdirSync(out,{recursive:true});const download=page.waitForEvent('download');await page.click('#quick-export-csv');await(await download).saveAs(out+'/premii-import-results.csv');assert.ok(fs.statSync(out+'/premii-import-results.csv').size>1000);const header=fs.readFileSync(out+'/premii-import-results.csv','utf8').replace(/^\uFEFF/,'').split(/\r?\n/)[0].split(',').map(v=>v.slice(1,-1));assert.equal(header.length,33);assert.equal(header[0],'Infant identifier');assert.equal(header.at(-1),'Weighing time');for(const metadata of ['recordId','patientKey','noteTime','filename','sourceLine','extractionStatus','schemaVersion','evidence','fieldStatus'])assert.equal(header.includes(metadata),false);
 await page.evaluate(()=>window.print=()=>{});await page.click('#quick-export-pdf');await page.click('#print-selected-pdf');assert.ok([1,2].includes(await page.locator('.report-page').count()));await page.pdf({path:out+'/premii-sample-report.pdf',preferCSSPageSize:true});
 const jsonDownload=page.waitForEvent('download');await page.click('#export-json');await(await jsonDownload).saveAs(out+'/premii-import-results.json');const data=JSON.parse(fs.readFileSync(out+'/premii-import-results.json'));assert.equal(data.records.length,count);const excelDownload=page.waitForEvent('download');await page.click('#quick-export-excel');await(await excelDownload).saveAs(out+'/premii-import-results.xlsx');
 require('node:child_process').execFileSync('python3',['-c',`import sys,json,openpyxl
sheet=openpyxl.load_workbook(sys.argv[1],data_only=False)['PREMII']
records=json.load(open(sys.argv[2]))['records']
assert sheet.max_column==33 and sheet.max_row==len(records)+1
headers=[c.value for c in sheet[1]]
assert headers[0]=='Infant identifier' and headers[-1]=='Weighing time'
assert sheet.freeze_panes=='A2'
for cells,record in zip(sheet.iter_rows(min_row=2),records):
 for cell,key in zip(cells,headers):
  actual,expected=cell.value,record[key]
  assert cell.data_type!='f'
  if expected is None: assert actual is None
  elif isinstance(actual,(int,float)): assert actual==float(expected) and key!='Infant identifier'
  else: assert actual==str(expected)
`,out+'/premii-import-results.xlsx',out+'/premii-import-results.json']);
 assert.equal(new Set(data.records.map(r=>r['Infant identifier'])).size,infantCount);
 await page.selectOption('#language','zh-Hant');await page.click('#quick-export-pdf');await page.click('#print-selected-pdf');await page.pdf({path:out+'/premii-sample-report-zh.pdf',preferCSSPageSize:true});assert.match(await page.locator('#output-summary').innerText(),/筆觀察記錄/);assert.match(await page.locator('#next-page').innerText(),/下一頁/);assert.equal(await page.locator('#records-table tbody tr').count(),20);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.click('#show-results');await page.waitForTimeout(500);await page.screenshot({path:out+'/premii-import-results-mobile.png'});assert.deepEqual(errors,[]);
 // A later upload must show its own output, not keep an earlier selected observation.
 await page.setInputFiles('#source-file',{name:'appended.txt',mimeType:'text/plain',buffer:Buffer.from('Study ID: APPEND-TEST\nOn nCPAP')});await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);assert.match(await page.locator('#selected-note').innerText(),/APPEND-TEST/);assert.equal(await page.locator('#next-page').isDisabled(),true);
 const dropped=await page.evaluateHandle(()=>{
  const transfer=new DataTransfer();
  for(const id of ['DROP-001','DROP-002'])transfer.items.add(new File([`Study ID: ${id}\nOn nCPAP`],`${id}.txt`,{type:'text/plain'}));
  return transfer;
 });
 await page.locator('#file-drop-zone').dispatchEvent('drop',{dataTransfer:dropped});
 await dropped.dispose();
 await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
 assert.equal(await page.locator('#record-count').innerText(),String(count+3));
 assert.match(await page.locator('#selected-note').innerText(),/DROP-001/);
 // Identical notes are skipped across files and batches. Same infant, new date or text stays.
 await page.selectOption('#language','en');
 const note=(name,date,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(`Study ID: DEDUP-001\nDate: ${date}\n${text}`)});
 const original=note('original.txt','2026-11-03','On nCPAP');
 const copy={...original,name:'copy.txt'};
 const differentDate=note('later.txt','2026-11-04','On nCPAP');
 const differentText=note('different.txt','2026-11-03','On nCPAP\nFiO2: 35%');
 await page.setInputFiles('#source-file',[original,copy,differentDate,differentText]);
 await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
 assert.equal(await page.locator('#record-count').innerText(),String(count+6));
 assert.match(await page.locator('#import-status').innerText(),/1 duplicate observations skipped/);
 await page.setInputFiles('#source-file',copy);
 await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
 assert.equal(await page.locator('#record-count').innerText(),String(count+6));
 assert.match(await page.locator('#import-status').innerText(),/1 duplicate observations skipped/);
 await page.selectOption('#language','zh-Hant');
 await page.selectOption('#language','en');
 await page.locator('#record-search').fill('dedup-001');
 assert.equal(await page.locator('#records-table tbody tr').count(),3);
 assert.match(await page.locator('#records-table tbody').innerText(),/original.txt/);
 await page.locator('#records-table tbody tr').filter({hasText:'later.txt'}).getByRole('button').click();
 assert.match(await page.locator('#records-pdf-selection').innerText(),/DEDUP-001.*2026-11-04.*later.txt/);
 await page.locator('#record-search').fill('NO-MATCH-999');
 assert.ok(await page.locator('#no-results').isVisible());
 assert.match(await page.locator('#export-excel').innerText(),/All observations/);
 assert.ok(await page.locator('#import-file-details').isVisible());
 assert.equal(await page.locator('#import-file-details').getAttribute('open'),null);
 await page.selectOption('#language','zh-Hant');
 // Clear, then verify an all-failed import never reports success or enables exports.
 page.on('dialog',d=>d.accept());await page.click('#clear-source');await page.setInputFiles('#source-file',{name:'bad.bin',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')});await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);assert.equal(await page.locator('#output-ready').isVisible(),false);assert.equal(await page.locator('#export-pdf').isDisabled(),true);assert.match(await page.locator('#import-status').innerText(),/未產生結果/);assert.ok(await page.locator('#import-issues').getByText('bad.bin',{exact:false}).isVisible());
 const broken=await browser.newPage();await broken.route('**/documents.js*',route=>route.abort());await broken.goto(process.env.PREMII_TEST_URL||'http://127.0.0.1:3000');assert.equal(await broken.locator('#source-file').isDisabled(),true);assert.equal(await broken.locator('#startup-warning').isVisible(),true);await broken.close();
 console.log(JSON.stringify({passed:true,importedRecords:count,infants:infantCount,rowsPerPage:20,outputVisible:true,exports:['Excel','CSV','JSON','PDF'],uncaughtErrors:errors.length}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
