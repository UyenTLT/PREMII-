const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PREMII_TEST_URL||'http://127.0.0.1:3000');assert.equal(await page.locator('#export-excel').isDisabled(),true);
 const text='Study ID: 00123\nDate: 2026-11-17\nShift: 2\nRES1: 2\nRES3_1: 500.5\nABD1_1: 0\nWEIGHT1: 1200\nWEIGHT2: 2026-11-17\nWEIGHT3: 08:30\nStudy ID: =1+1\nNo usable observations.\nStudy ID: 病歷&<001>\nNo usable observations.';
 await page.setInputFiles('#source-file',{name:'excel-test.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
 const files=[];
 for(const [lang,button] of [['en','#export-excel'],['zh-Hant','#quick-export-excel']]){
  await page.selectOption('#language',lang);const wait=page.waitForEvent('download');await page.click(button);const download=await wait;assert.match(download.suggestedFilename(),/\.xlsx$/);const path='/tmp/premii-excel-'+lang+'.xlsx';await download.saveAs(path);files.push(path);assert.ok(fs.statSync(path).size>1000);await page.waitForFunction(()=>!document.querySelector('#export-excel').disabled);
 }
 const result=execFileSync('python3',['-c',`import sys,openpyxl
books=[openpyxl.load_workbook(p,data_only=False) for p in sys.argv[1:]]
a,b=[w['PREMII'] for w in books]
assert books[0].sheetnames==['PREMII']
assert a.max_column==33 and a.max_row==4
assert a['A2'].value=='00123' and a['A2'].data_type=='s'
assert a['A3'].value=='=1+1' and a['A3'].data_type=='s'
assert a['A4'].value=='病歷&<001>'
assert a['I2'].value==500.5 and a['I2'].data_type=='n'
assert a['M2'].value==0 and a['M2'].data_type=='n'
assert a['J2'].value is None
assert a['AE2'].value==1200
assert a['AF2'].value=='2026-11-17' and a['AG2'].value=='08:30'
assert a.freeze_panes=='A2' and a.auto_filter.ref=='A1:AG4'
assert a['A1'].font.bold
assert a['A1'].value=='Infant identifier' and a['AG1'].value=='Weighing time'
assert a['F1'].value=='Respiratory support' and a['F2'].value=='Continuous low-flow nasal cannula (< 2 L/min)'
assert not any(c.data_type=='f' for row in a for c in row)
assert list(a.values)==list(b.values)
print('PASS: valid XLSX, 33 clinical columns, leading-zero IDs, Unicode/XML characters, numeric data, real zeros vs blanks, literal formula-like IDs, frozen/filterable header, both languages')`,...files],{encoding:'utf8'});console.log(result.trim());assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
