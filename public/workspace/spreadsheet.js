'use strict';
const PREMII_XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PREMII_NUMERIC_FIELDS=new Set(['RES3_1','bradyThreshold','desatThreshold','ABD1_1','ABD1_2','ABD2_1','ABD2_2','ABD3_1','ABD3_2','baselineWeight','WEIGHT1']);
function spreadsheetColumn(index){let label='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))label=String.fromCharCode(65+(n-1)%26)+label;return label;}
function spreadsheetXml(value){return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');}
async function createPremiiWorkbook(rows){
 const zip=new JSZip();const keys=[...PREMII_FIELDS,'fio2Readings'];const last=spreadsheetColumn(keys.length-1)+(rows.length+1);const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const label=key=>key==='fio2Readings'?fio2ExportLabel:exportColumnLabel(key);
 function textCell(ref,value,style=''){
  const text=String(value);if(text.length>32767)throw new Error('Cell exceeds Excel text limit');
  // Explicit string cells preserve leading-zero IDs and never create formulas.
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${spreadsheetXml(text)}</t></is></c>`;
 }
 const header='<row r="1" ht="48" customHeight="1">'+keys.map((key,i)=>textCell(spreadsheetColumn(i)+'1',label(key),' s="1"')).join('')+'</row>';
 const data=rows.map((row,ri)=>{const n=ri+2;return `<row r="${n}">`+keys.map((key,ci)=>{
  const ref=spreadsheetColumn(ci)+n;const value=key==='fio2Readings'?fio2Text(row):readableValue(key,row[key]);
  if(value===null||value===undefined||value==='')return `<c r="${ref}"/>`;
  if(PREMII_NUMERIC_FIELDS.has(key)&&Number.isFinite(Number(value)))return `<c r="${ref}" t="n"><v>${Number(value)}</v></c>`;
  return textCell(ref,value);
 }).join('')+'</row>';}).join('');
 const cols=keys.map((key,i)=>`<col min="${i+1}" max="${i+1}" width="${key==='infant'?20:Math.max(11,Math.min(40,label(key).length+3))}" customWidth="1"/>`).join('');
 zip.file('[Content_Types].xml',declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 zip.file('_rels/.rels',declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml',declaration+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="PREMII" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels',declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 zip.file('xl/styles.xml',declaration+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color rgb="FF244637"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF28634B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
 zip.file('xl/worksheets/sheet1.xml',declaration+`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${header}${data}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`);
 return zip.generateAsync({type:'blob',mimeType:PREMII_XLSX_TYPE,compression:'DEFLATE',compressionOptions:{level:6}});
}
