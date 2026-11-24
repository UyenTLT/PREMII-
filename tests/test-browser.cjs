const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.PREMII_TEST_URL||'http://127.0.0.1:3000');
 assert.equal(await page.locator('main form,main input:not([type=file]):not(#record-search):not(#group-by-infant)').count(),0);assert.equal(await page.locator('textarea:not([readonly])').count(),0);
 const text='【研究ID：TEST-001】\nDate: 2026-11-03\nOn nCPAP\nFiO2: 35%\nWeight: 1230 g\nABD1_1: 0\n【研究ID：TEST-002】\nNo usable observations.';
 await page.setInputFiles('#source-file',{name:'synthetic.txt',mimeType:'text/plain',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.querySelectorAll('#records-table tbody tr').length===2);
 assert.equal(await page.locator('#group-by-infant').isChecked(),true);
 assert.equal(await page.locator('.infant-group button[aria-expanded="false"]').count(),2);
 assert.equal(await page.locator('[data-pdf-note]').count(),0);
 await page.locator('#group-by-infant').uncheck();
 assert.equal(await page.locator('#results-section').isVisible(),false);await page.locator('#records-table tbody tr').first().getByRole('button').click();
 assert.match(await page.locator('#selected-note').innerText(),/TEST-001/);assert.match(await page.locator('#extracted-fields').innerText(),/Not found in source/);assert.equal(await page.locator('#extracted-fields article').filter({has:page.getByRole('heading',{name:'Apnea · Required intervention',exact:true})}).locator('.extracted-value').innerText(),'0');
 const exportJson=async path=>{const wait=page.waitForEvent('download');await page.click('#export-json');await(await wait).saveAs(path);return JSON.parse(fs.readFileSync(path,'utf8'));};
 const en=await exportJson('/tmp/premii-file-en.json');assert.equal(en.mode,'file-only');assert.equal(en.records[0]['Infant identifier'],'TEST-001');assert.equal(en.records[0]['Shift'],null);assert.equal(en.records[0]['Weighing date'],null);assert.equal(en.records[0]['Prescribed caffeine or other stimulant'],null);assert.equal(en.records[0]['Apnea · Required intervention'],'0');assert.equal(en.records[1]['Date'],null);assert.equal(en.records[1]['Respiratory support'],null);assert.equal(en.records[0].sourceText,undefined);assert.equal(en.records[0].RES1,undefined);assert.equal(await page.locator('#extracted-fields .eyebrow').count(),0);
 await page.evaluate(()=>window.print=()=>{});await page.click('#export-pdf');await page.click('#print-selected-pdf');assert.ok([1,2].includes(await page.locator('.report-page').count()));assert.match(await page.locator('#print-report').textContent(),/Shift not documented/);assert.equal(await page.locator('#print-report').isVisible(), false);
 await page.click('#export-pdf');
 await page.locator('#pdf-infant').selectOption({label:'TEST-002'});
 assert.equal(await page.locator('#pdf-observation-field').isVisible(),false);
 await page.click('#print-selected-pdf');
 assert.match(await page.locator('#print-report').textContent(),/TEST-002/);
 await page.click('#export-pdf');
 await page.locator('#pdf-infant').selectOption({label:'TEST-001'});
 await page.click('#print-selected-pdf');
 const raw=await page.locator('#print-report').textContent();assert.match(raw,/Not found in source/);await page.pdf({path:'/tmp/premii-file-only-en.pdf',preferCSSPageSize:true});
 await page.selectOption('#language','zh-Hant');assert.match(await page.locator('.intro h1').innerText(),/您的文件/);assert.match(await page.locator('#extracted-fields').innerText(),/來源中未找到/);const zh=await exportJson('/tmp/premii-file-zh.json');assert.deepEqual(zh,en);await page.click('#export-pdf');await page.click('#print-selected-pdf');await page.pdf({path:'/tmp/premii-file-only-zh.pdf',preferCSSPageSize:true});assert.match(await page.locator('#print-report').textContent(),/未記錄班別/);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/premii-file-only-mobile.png',fullPage:true});
 await page.selectOption('#language','en');await page.locator('#records-table tbody tr').nth(1).getByRole('button').click();assert.match(await page.locator('#selected-note').innerText(),/TEST-002/);assert.equal(await page.locator('#extracted-fields .extracted-value').count(),0);await page.click('#export-pdf');await page.click('#print-selected-pdf');const unknownReport=await page.locator('#print-report').textContent();assert.doesNotMatch(unknownReport,/2026-11-03/);assert.match(unknownReport,/Date not documented/);
 const makeDocx=require('node:child_process').execFileSync('python3',['-c',`import io,zipfile,sys
b=io.BytesIO()
with zipfile.ZipFile(b,'w') as z:
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
 z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
 z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Infant ID: DOCX-001</w:t></w:r></w:p><w:p><w:r><w:t>On nCPAP</w:t></w:r></w:p></w:body></w:document>')
sys.stdout.buffer.write(b.getvalue())`]);
 await page.setInputFiles('#source-file',{name:'patient.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:makeDocx});await page.waitForFunction(()=>document.querySelectorAll('#records-table tbody tr').length===3);
 const pdfPage=await browser.newPage();await pdfPage.setContent('<p>Infant ID: PDF-001</p><p>On nCPAP</p><p>FiO2: 35%</p>');const pdfBuffer=await pdfPage.pdf();await pdfPage.close();await page.setInputFiles('#source-file',{name:'patient.pdf',mimeType:'application/pdf',buffer:pdfBuffer});await page.waitForFunction(()=>document.querySelectorAll('#records-table tbody tr').length===4);
 const all=await exportJson('/tmp/premii-three-formats.json');assert.equal(all.records[2]['Infant identifier'],'DOCX-001');assert.equal(all.records[2]['Respiratory support'],'Respiratory pressure support (nasal continuous positive airway pressure or high flow ≥ 2 L/min)');assert.equal(all.records[3]['Infant identifier'],'PDF-001');assert.equal(all.records[3]['Oxygen concentration'],'31–40%');
 await page.locator('#records-table tbody tr').first().getByRole('button').click();
 const source=await page.locator('#source-text').inputValue();
 await page.click('#edit-observation');
 await page.locator('#observation-form [name=infant]').fill('CANCELLED');
 await page.click('#cancel-observation');
 assert.match(await page.locator('#selected-note').innerText(),/TEST-001/);
 await page.click('#edit-observation');
 await page.locator('#observation-form [name=infant]').fill('TEST-EDITED');
 await page.locator('#observation-form [name=WEIGHT1]').fill('1240');
 await page.locator('#observation-form button[type=submit]').click();
 assert.equal(await page.locator('#observation-editor').isVisible(),false);
 assert.match(await page.locator('#selected-note').innerText(),/TEST-EDITED/);
 assert.equal(await page.locator('#source-text').inputValue(),source);
 const edited=await exportJson('/tmp/premii-edited.json');
 assert.equal(edited.records[0]['Lowest documented weight in this note (grams)'],'1240');
 assert.equal(edited.records[0].manualEdits['Lowest documented weight in this note (grams)'].originalValue,'1230');
 assert.equal(edited.records[0].fieldStatus['Lowest documented weight in this note (grams)'],'manually-edited');
 await page.click('#export-pdf');await page.click('#print-selected-pdf');
 assert.match(await page.locator('#print-report').textContent(),/Contains manual edits/);
 await page.setInputFiles('#source-file',{name:'synthetic-copy.txt',mimeType:'text/plain',buffer:Buffer.from(text)});
 await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
 assert.equal(await page.locator('#record-count').innerText(),'4');
 const mergeFiles=[
  ['shift-a.txt','2026-11-20 08:00','Shift: 1\nWeight: 1200 g\nOn nCPAP'],
  ['shift-b.txt','2026-11-20 09:00','Shift: 1\nWeight: 1250 g\nFiO2: 35%'],
  ['shift-c.txt','2026-11-20 16:00','Shift: 2\nWeight: 1300 g']
 ].map(([name,stamp,note])=>({name,mimeType:'text/plain',buffer:Buffer.from(`Study ID: MERGE-001\n${stamp}\n${note}`)}));
 await page.locator('#group-by-infant').check();
 await page.setInputFiles('#source-file',mergeFiles);
 await page.waitForFunction(()=>!document.querySelector('#source-file').disabled);
 await page.locator('#record-search').fill('MERGE-001');
 assert.equal(await page.locator('.infant-group button').getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('#records-table tbody tr').count(),1);
 await page.getByRole('button',{name:/MERGE-001.*3 observations/}).click();
 assert.equal(await page.locator('#records-table tbody tr').count(),4);
 await page.locator('#records-table tbody tr').filter({hasText:'shift-c.txt'}).getByRole('button').click();
 assert.equal(await page.locator('#merge-observations').isVisible(),false);
 await page.locator('#records-table tbody tr').filter({hasText:'shift-a.txt'}).getByRole('button').click();
 await page.click('#merge-observations');
 assert.match(await page.locator('#merge-conflicts').innerText(),/1200 g/);
 assert.match(await page.locator('#merge-conflicts').innerText(),/1250 g/);
 await page.locator('#merge-form select[name=WEIGHT1]').selectOption('1');
 await page.locator('#merge-form button[type=submit]').click();
 assert.equal(await page.locator('#merge-dialog').isVisible(),false);
 const merged=await exportJson('/tmp/premii-merged.json');
 const group=merged.records.filter(record=>record['Infant identifier']==='MERGE-001');
 assert.equal(group.length,2);
 const combined=group.find(record=>record.mergedFrom);
 assert.equal(combined['Lowest documented weight in this note (grams)'],'1250');
 assert.equal(combined['Respiratory support'],'Respiratory pressure support (nasal continuous positive airway pressure or high flow ≥ 2 L/min)');
 assert.equal(combined['Oxygen concentration'],'31–40%');
 assert.equal(combined.mergedFrom.length,2);
 assert.deepEqual(combined.fieldSources['Lowest documented weight in this note (grams)'],[combined.mergedFrom[1].recordId]);
 await page.click('#export-pdf');
 assert.equal(await page.locator('#pdf-observation-field').isVisible(),true);
 assert.match(await page.locator('#pdf-observation option:checked').textContent(),/Merged observation/);
 await page.click('#print-selected-pdf');
 assert.match(await page.locator('#print-report').textContent(),/Merged observations/);
 page.once('dialog',dialog=>dialog.accept());
 await page.click('#undo-observation-merge');
 assert.equal((await exportJson('/tmp/premii-undo-merge.json')).records.filter(record=>record['Infant identifier']==='MERGE-001').length,3);
 assert.deepEqual(errors,[]);console.log('PASS: upload→automatic records→PDF/JSON, no data-entry inputs, explicit zeros vs unknowns, no invented dates/shifts, EN↔ZH, mobile, no JS errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
