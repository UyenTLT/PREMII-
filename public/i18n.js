'use strict';
// UI language only is persisted. Assessment data is never stored here.
const translations = {
  "Preterm infant assessment": "早產兒評估",
  "Shift assessment": "每班評估",
  "Saved assessments": "已記錄評估",
  "User guide": "使用說明",
  "Local session": "本機工作階段",
  "Data stays in this tab’s memory.": "資料僅保留於此分頁記憶體中。",
  "Export before closing the page.": "關閉頁面前請匯出資料。",
  "Workspace": "工作區",
  "Research prototype": "研究原型",
  "A complete picture, every shift.": "每一班，完整掌握照護狀況。",
  "Record preterm infant support and observations using PREMII.": "依 PREMII 結構記錄早產兒的支持需求與觀察結果。",
  "Record the worst experience during the shift.": "請記錄當班最嚴重的狀況。",
  "Item codes follow the supplied documents; a validated total-score formula has not been provided. This does not replace clinical judgment.": "項目代碼依據提供的文件；尚未提供經驗證的總分公式。本工具不能取代臨床判斷。",
  "Shift information": "班別資訊",
  "Use a study ID, without identifying information.": "請使用研究代碼，勿輸入可識別身分的資料。",
  "Infant / study ID": "嬰兒／研究代碼",
  "e.g. PRE-001": "例如 PRE-001",
  "Shift start date": "當班開始日期",
  "Select shift": "請選擇班別",
  "Shift": "班別",
  "Shift 1": "第 1 班",
  "Shift 2": "第 2 班",
  "Shift 3": "第 3 班",
  "Shift 4": "第 4 班",
  "Start time": "開始時間",
  "End time": "結束時間",
  "Respiratory support": "呼吸輔助",
  "Select the greatest support during the shift · RES1": "選擇當班最高程度的呼吸輔助 · RES1",
  "Device (supplemental, unscored)": "裝置（補充記錄，不計分）",
  "Not recorded": "尚未記錄",
  "Endotracheal tube": "氣管插管",
  "Tracheostomy tube": "氣管造口管",
  "Mask": "面罩",
  "Flow source": "流量來源",
  "Select source": "請選擇來源",
  "Air flow meter": "空氣流量計",
  "Oxygen flow meter": "氧氣流量計",
  "Greatest flow (cc/min)": "最高流量（cc/min）",
  "Below 2000 cc/min": "低於 2000 cc/min",
  "1 L/min = 1000 cc/min. For low flow, skip oxygen concentration as instructed in the original questionnaire.": "1 L/min = 1000 cc/min。依原版問卷，選擇低流量時跳過供氧濃度。",
  "Highest oxygen concentration": "最高供氧濃度",
  "Apnea, bradycardia & desaturation": "呼吸暫停、心跳過緩與血氧過低",
  "Enter event counts for the shift; enter 0 for no events.": "輸入當班事件次數；無事件請填 0。",
  "Bradycardia threshold ≤ (beats/min)": "心跳過緩定義 ≤（次／分鐘）",
  "Desaturation threshold ≤ (%)": "血氧濃度過低定義 ≤（%）",
  "Event": "事件",
  "Required intervention": "需要干預",
  "No intervention required": "不需要干預",
  "Currently prescribed caffeine or another stimulant?": "目前是否使用咖啡因或其他興奮劑？",
  "Select response": "請選擇答案",
  "Yes": "是",
  "No": "否",
  "Stimulant name (optional)": "興奮劑名稱（選填）",
  "Thermoregulation": "體溫調節",
  "Select the greatest support needed · THG1": "選擇需要最多支持的狀況 · THG1",
  "Warming device (optional)": "保溫裝置（選填）",
  "Closed, heated incubator": "封閉且加熱的保溫箱",
  "Radiant warmer": "輻射式保溫器",
  "Feeding": "餵食",
  "Record the worst feeding experience during the shift.": "記錄當班最嚴重的餵食狀況。",
  "Did any feeds occur during the shift (including intravenous nutrition)?": "當班是否有餵食（包括靜脈營養）？",
  "No — skip feeding assessment": "否 — 跳過餵食評估",
  "Feeding method (supplemental, optional)": "餵食方式（補充資料，選填）",
  "Not recorded / not applicable": "尚未記錄／不適用",
  "Breast": "母乳",
  "Bottle": "奶瓶",
  "Both": "兩者皆有",
  "Weight": "體重",
  "Record weight in grams, rounded to a whole number.": "體重以公克記錄，四捨五入至整數。",
  "This is the infant’s first assessment": "這是此嬰兒的首次評估",
  "Last weight before the shift (g)": "當班前最近一次體重（g）",
  "Pre-shift weighing date": "當班前測重日期",
  "Pre-shift weighing time": "當班前測重時間",
  "Was the infant weighed during the shift?": "當班是否有測量體重？",
  "Lowest weight during the shift (g)": "當班最低體重（g）",
  "Weighing date": "測重日期",
  "Weighing time": "測重時間",
  "Clear form": "清除表單",
  "Save assessment": "記錄評估",
  "SHIFT OVERVIEW": "當班概覽",
  "Assessment summary": "評估摘要",
  "Item codes ≠ a PREMII total score. Skipped fields are recorded as not applicable.": "項目代碼 ≠ PREMII 總分。跳過的欄位記錄為不適用。",
  "Consistency across shifts": "維持各班記錄一致",
  "Complete near the end of the shift. Each response reflects the worst experience observed during that shift.": "請於當班接近結束時填寫。每項答案應反映該班觀察到的最嚴重狀況。",
  "SESSION DATA": "本次工作階段資料",
  "Export JSON": "匯出 JSON",
  "Export CSV": "匯出 CSV",
  "No assessments yet. Complete the form to create the first record.": "尚無評估。請完成表單以建立第一筆記錄。",
  "Infant ID": "嬰兒代碼",
  "Date / shift": "日期／班別",
  "Records are not sent to the server and are lost on reload or tab close. Exports may contain health data; store them in an authorized location.": "記錄不會傳送至伺服器，重新整理或關閉分頁後即消失。匯出檔案可能含有健康資料，請儲存於獲准的位置。",
  "About this questionnaire": "關於本問卷",
  "Based on the supplied English PREMature Infant Index Questionnaire (PREMII™) and the codebook “PREMII 建立資料用”. The Traditional Chinese interface is a development translation, not an officially validated version.": "依據提供的英文 PREMature Infant Index Questionnaire（PREMII™）與「PREMII 建立資料用」編碼文件製作。繁體中文介面為開發用翻譯，尚非正式驗證版本。",
  "Select one response per support domain. For low-flow respiratory support, record source and flow, and skip OA. If no feeds occurred, skip FEED1. Device and feeding-method details are supplemental and unscored. The supplied documents contain no total-score algorithm.": "各支持項目請選擇一個答案。低流量呼吸輔助須記錄來源與流量，並跳過 OA。當班未餵食則跳過 FEED1。裝置與餵食方式為補充資料，不計分。提供的文件未包含總分計算公式。",
  "© 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire Human Genetic Therapies, Inc., a Takeda company. The original states “Reproduced with permission from Shire”; this app does not assert distribution rights or clinical certification.": "© 2018 Shire Human Genetic Therapies, Inc. PREMII 為 Shire Human Genetic Therapies, Inc.（Takeda 集團公司）的商標。原文件註明「Reproduced with permission from Shire」；本應用程式不主張取得散布授權或臨床認證。",
  "Designed for structured observations.": "為結構化記錄而設計。",
  "No supplemental oxygen and no pulmonary medication": "未補充氧氣且未使用肺部藥物",
  "Supplemental oxygen, not continuously, or pulmonary medication": "不連續補充氧氣，或使用肺部藥物",
  "Continuous low-flow nasal cannula (< 2 L/min)": "鼻導管持續低流量（< 2 L/min）",
  "Continuous supplemental oxygen, not through a nasal cannula": "持續補充氧氣，非經鼻導管",
  "Respiratory pressure support (nCPAP or high flow ≥ 2 L/min)": "呼吸壓力輔助（nCPAP 或高流量 ≥ 2 L/min）",
  "Mechanical ventilation via endotracheal tube, tracheostomy tube or mask": "經氣管插管、氣管造口管或面罩進行機械通氣",
  "21% · Room air": "21% · 室內空氣",
  "Open bassinet or cot, no additional warming support": "開放式搖籃或嬰兒床，不需額外保溫支持",
  "Open bassinet or cot, additional warming support required": "開放式搖籃或嬰兒床，需要額外保溫支持",
  "Closed, heated incubator or radiant warmer": "封閉且加熱的保溫箱或輻射式保溫器",
  "All feeds by breast or bottle, no breathing or swallowing problems; all feeds ≤ 30 minutes": "全部以母乳或奶瓶餵食，無呼吸或吞嚥問題；所有餵食 ≤ 30 分鐘",
  "All feeds by breast or bottle, no breathing or swallowing problems; at least one feed > 30 minutes": "全部以母乳或奶瓶餵食，無呼吸或吞嚥問題；至少一次餵食 > 30 分鐘",
  "All feeds by breast or bottle, with breathing or swallowing problems": "全部以母乳或奶瓶餵食，有呼吸或吞嚥問題",
  "Some tube feeds and some breast or bottle feeds, without breathing or swallowing problems": "部分管灌、部分母乳或奶瓶餵食，無呼吸或吞嚥問題",
  "Some tube feeds and some breast or bottle feeds, with breathing or swallowing problems": "部分管灌、部分母乳或奶瓶餵食，有呼吸或吞嚥問題",
  "Any intravenous nutrition or all feeds by enteral feeding tube": "有靜脈營養或全部經腸內管餵食",
  "Apnea": "呼吸暫停",
  "Bradycardia": "心跳過緩",
  "Desaturation": "血氧濃度過低",
  "Oxygen concentration": "供氧濃度",
  "Temperature regulation": "體溫調節",
  "Skipped": "已跳過",
  "Not weighed": "未測重",
  "Delete": "刪除",
  "Delete this record from this session?": "確定要從此次工作階段刪除此筆記錄？",
  "A record already exists for this infant and shift. Delete it before saving a replacement.": "此嬰兒與班別已有記錄。請先刪除舊記錄再儲存。",
  "Assessment saved. Export your data before closing the page.": "已記錄評估。關閉頁面前請匯出資料。",
  "sections complete": "部分已完成",
  "Delete assessment": "刪除評估",
  "Language": "語言",
  "0 / 6 sections complete": "0 / 6 部分已完成",
  "NEONATAL CARE WORKSPACE": "新生兒照護工作區",
  "PREMATURE INFANT INDEX": "早產兒指數",
  "RESPIRATORY": "呼吸輔助",
  "PREMII workspace": "PREMII 工作區"
};
Object.assign(translations, {
  "Import medical record": "匯入病歷",
  "Choose your own TXT, DOCX or text-based PDF. Example records are not preloaded.": "請選取自己的 TXT、DOCX 或文字型 PDF。系統不會預載範例病歷。",
  "Source document": "來源文件",
  "Files are read locally in your browser, never uploaded. Maximum file size: 10 MB. Scanned PDFs require OCR and are not supported.": "文件僅在瀏覽器本機讀取，不會上傳。檔案上限 10 MB。掃描式 PDF 需先進行 OCR，目前不支援。",
  "Source text": "來源文字",
  "Remove source": "移除來源",
  "A file may include multiple infants or shifts. Select only the relevant passage, then use the excerpt below to complete the assessment.": "同一文件可能包含多名嬰兒或多個班別。請僅選取相關段落，再參照下方摘錄完成評估。",
  "Use selected passage": "使用選取段落",
  "Current shift excerpt": "當班摘錄",
  "Select or paste text for one infant and one shift.": "請選取或貼上一名嬰兒、單一班別的文字。",
  "Export PDF": "匯出 PDF",
  "Reading document…": "正在讀取文件…",
  "Document ready. Select the relevant infant and shift before entering observations.": "文件已就緒。填寫觀察結果前，請選取對應的嬰兒與班別。",
  "Choose a TXT, DOCX or PDF file up to 10 MB.": "請選取不超過 10 MB 的 TXT、DOCX 或 PDF 檔案。",
  "No readable text found. Scanned PDFs need OCR first.": "未找到可讀文字。掃描式 PDF 須先進行 OCR。",
  "Unable to read this document. Check the format, encryption and file integrity.": "無法讀取此文件。請檢查格式、加密設定與檔案完整性。",
  "Select a passage in the source text first.": "請先在來源文字中選取段落。",
  "Excerpt selected. Review it and complete the assessment for this shift.": "已選取摘錄。請檢視內容並完成當班評估。",
  "In the print dialog, choose Save as PDF. The report uses the source questionnaire’s sections and four-shift columns.": "請在列印對話框選擇「另存為 PDF」。報告依原始問卷的章節與四班欄位編排。",
  "PREMature Infant Index Questionnaire": "早產兒指數問卷",
  "Adapted research report — not the original licensed form.": "研究用改編報告 — 非原版授權表單。",
  "Record the worst experience observed during each shift.": "請記錄每班觀察到的最嚴重狀況。",
  "No record": "無記錄",
  "Not applicable": "不適用",
  "Baseline weight before first assessment": "首次評估前體重",
  "Lowest weight during shift": "當班最低體重",
  "Original questionnaire: © 2018 Shire Human Genetic Therapies, Inc. PREMII is a trademark of Shire, a Takeda company.": "原問卷：© 2018 Shire Human Genetic Therapies, Inc.。PREMII 為 Shire（Takeda 集團公司）的商標。",
  "No total score calculated. Blank columns indicate shifts with no saved record.": "未計算總分。空白欄位表示該班尚無已儲存記錄。",
  "Page": "頁",
  "Flow source / greatest setting": "流量來源／最高設定",
  "Prescribed caffeine or other stimulant": "使用咖啡因或其他興奮劑",
  "Feeds during shift": "當班有餵食",
  "Weighed during shift": "當班有測量體重",
  "First assessment": "首次評估",
  "Date / time": "日期／時間",
  "Continue": "續頁"
});
Object.assign(translations, {"Suggest PREMII items": "建議 PREMII 項目", "I checked the proposed values against the source for this infant and shift.": "我已核對此嬰兒與班別的病歷來源及建議值。", "Rule-based proposals only. History, negation and context may be misread. Verify every value; unrecognized items stay blank. Selected values will replace the corresponding form fields.": "僅提供規則式建議，可能誤讀病史、否定語句與上下文。請逐項核對；無法辨識的項目將留白。選取的值會取代對應表單欄位。", "No supported explicit observations found. Complete the form manually.": "未找到可辨識的明確觀察資料。請手動完成表單。", "Apply selected proposals": "套用選取建議", "Select at least one proposal to apply.": "請至少選取一項建議。", "Proposals applied. Complete missing fields and confirm your source review before saving.": "已套用建議。儲存前請補齊欄位並確認已核對來源。", "Factors / levels": "項目／程度"});
const reverseTranslations = new Map(Object.entries(translations).map(([en,zh])=>[zh,en]));
let language='en';
try { if(localStorage.getItem('premii-language')==='zh-Hant') language='zh-Hant'; } catch {}
function t(key){return language==='zh-Hant' ? (translations[key]??key) : key;}
function translateText(text){
 const content=text.trim();
 const key=reverseTranslations.get(content)??content;
 const translated=t(key);
 return text.replace(content,translated);
}
function localizeDOM(){
 document.documentElement.lang=language;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())) {
  if(node.parentElement.closest('script,style,#records-table tbody,input,textarea,#toast,#print-report,.suggestion-row blockquote')) continue;
  // Labels with decorative symbols retain their prefix.
  const raw=node.nodeValue;
  const prefix=raw.match(/^(\s*[▦◷ⓘ●]\s*)/);
  node.nodeValue=prefix?prefix[0]+translateText(raw.slice(prefix[0].length)):translateText(raw);
 }
 document.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{
  if(el.closest('#records-table tbody')) return;
  for(const name of ['placeholder','aria-label']) if(el.hasAttribute(name)) el.setAttribute(name,translateText(el.getAttribute(name)));
 });
 // Rebuild event aria labels from stable codes, without touching entered values.
 ['Apnea','Bradycardia','Desaturation'].forEach((name,i)=>{
  for(let j=1;j<=2;j++) document.querySelector(`[name="ABD${i+1}_${j}"]`)?.setAttribute('aria-label',`${t(name)} — ${t(j===1?'Required intervention':'No intervention required')}`);
 });
 document.title='PREMII · '+t('Preterm infant assessment');
 document.querySelector('#language').value=language;
}
document.querySelector('#language').addEventListener('change',e=>{
 language=e.target.value;
 try { localStorage.setItem('premii-language',language); } catch {}
 window.dispatchEvent(new Event('languagechange'));
});
