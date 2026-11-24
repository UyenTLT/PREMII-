'use strict';

const databaseList=$('#database-records');
const databaseLogin=$('#database-login');
const databaseMessage=$('#database-message');
let databaseSignedIn=false;
let databaseGeneration=0;

async function databaseRequest(path='',method='GET',body){
 const response=await fetch('/api/workspace'+path,{
  method,
  headers:body?{'Content-Type':'application/json'}:undefined,
  body:body?JSON.stringify(body):undefined
 });
 const result=await response.json();
 if(response.status===401){
  showDatabaseSignedOut();
  throw new Error('Sign in to use the database.');
 }
 if(!response.ok){
  const message=result.error==='invalid_record'?'Check the Infant ID, dates and times before saving.':
   result.error==='not_found'?'This saved record was already removed.':'Database unavailable. Please try again.';
  throw new Error(message);
 }
 return result;
}

function showDatabaseSignedOut(){
 databaseGeneration++;
 databaseSignedIn=false;
 databaseList.replaceChildren();
 $('#database-empty').hidden=true;
 $('#database-actions').hidden=true;
 databaseLogin.hidden=false;
}

async function refreshDatabase(){
 const generation=++databaseGeneration;
 const {records:saved}=await databaseRequest();
 if(generation!==databaseGeneration)return;
 databaseSignedIn=true;
 databaseLogin.hidden=true;
 $('#database-actions').hidden=false;
 $('#database-empty').hidden=!!saved.length;
 databaseList.replaceChildren();
 for(const {id,observation} of saved){
  const row=node('li');
  const fields=[observation.infant,observation.date||t('Date not documented')];
  if(observation.shift)fields.push(t('Shift')+' '+observation.shift);
  row.append(node('span',fields.filter(Boolean).join(' · ')));
  const actions=node('div',undefined,'record-actions');
  const open=node('button',t('Open saved record'),'secondary');
  open.type='button';
  open.onclick=()=>{
   const recordId='database-'+id;
   let record=records.find(item=>item.recordId===recordId);
   if(!record){
    record={
     ...observation,recordId,filename:t('Database'),
     sourceText:'',evidence:{},fieldStatus:{},extractionStatus:'saved-record'
    };
    records.push(record);
   }
   showRecordInList(record);
   openObservationDetails(record,open);
  };
  const remove=node('button',t('Delete record'),'secondary');
  remove.type='button';
  remove.onclick=async()=>{
   if(!confirm(t('Permanently delete this saved record?')+' '+observation.infant))return;
   remove.disabled=true;
   try{
    await databaseRequest('?id='+encodeURIComponent(id),'DELETE');
    const recordId='database-'+id;
    const index=records.findIndex(item=>item.recordId===recordId);
    if(index>=0){
     records.splice(index,1);
     if(selectedRecordId===recordId){
      selectedRecordId=records[0]?.recordId??null;
      observationDialog.close();
     }
     render();
    }
    databaseMessage.textContent=t('Saved record deleted.');
    await refreshDatabase();
   }catch(error){
    databaseMessage.textContent=t(error.message);
   }finally{
    remove.disabled=false;
   }
  };
  actions.append(open,remove);
  row.append(actions);
  databaseList.append(row);
 }
}

function databaseFields(observation){
 return {...Object.fromEntries(editorFields.map(field=>[field,observation[field]??null])),fio2Readings:exportFiO2(observation)};
}

function promptDatabaseLogin(){
 if(observationDialog.open)observationDialog.close();
 $('#database').scrollIntoView();
 databaseLogin.querySelector('input').focus();
 databaseMessage.textContent=t('Sign in to use the database.');
}

const batchSaveStatus=$('#batch-save-status');
$('#save-imported-db').onclick=async event=>{
 if($('#source-file').disabled){
  batchSaveStatus.textContent=t('Wait until document import finishes.');
  return;
 }
 const imported=exportableRecords().filter(record=>record.sourceText);
 if(!imported.length){
  batchSaveStatus.textContent=t('There are no imported observations to save.');
  return;
 }
 if(!databaseSignedIn){
  promptDatabaseLogin();
  return;
 }
 const button=event.currentTarget;
 button.disabled=true;
 batchSaveStatus.textContent=t('Saving imported observations…');
 try{
  const {saved,duplicates,invalid}=await databaseRequest('','POST',{
   action:'save_batch',observations:imported.map(databaseFields)
  });
  const summary=[
   saved+' '+t('observations saved'),
   duplicates+' '+t('duplicates skipped'),
   invalid+' '+t('invalid observations skipped')
  ].join(' · ');
  batchSaveStatus.textContent=summary;
  await refreshDatabase().catch(()=>{
   batchSaveStatus.textContent=summary+' '+t('Reopen the page to refresh the database list.');
  });
 }catch(error){
  batchSaveStatus.textContent=t(error.message);
 }finally{
  button.disabled=false;
 }
};
$('#source-file').addEventListener('change',()=>{batchSaveStatus.textContent='';});
$('#file-drop-zone').addEventListener('drop',()=>{batchSaveStatus.textContent='';});
$('#clear-source').addEventListener('click',()=>{
 if(!records.length)batchSaveStatus.textContent='';
});

async function saveDatabaseObservation(observation){
 if(!databaseSignedIn)throw new Error('Sign in to use the database.');
 const fields=databaseFields(observation);
 const {duplicate}=await databaseRequest('','POST',{action:'save',observation:fields});
 const message=t(duplicate?'An identical observation is already saved.':'Observation saved to the database.');
 databaseMessage.textContent=message;
 notify(message);
 await refreshDatabase().catch(()=>{
  databaseMessage.textContent=message+' '+t('Reopen the page to refresh the database list.');
 });
}

databaseLogin.onsubmit=async event=>{
 event.preventDefault();
 const form=new FormData(databaseLogin);
 const submit=databaseLogin.querySelector('[type="submit"]');
 submit.disabled=true;
 try{
  const response=await fetch('/api/login',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id:form.get('id'),password:form.get('password')})
  });
  if(!response.ok)throw new Error(response.status===401?'Invalid account ID or password.':'Database unavailable. Please try again.');
  databaseMessage.textContent='';
  await refreshDatabase();
 }catch(error){
  databaseMessage.textContent=t(error.message);
 }finally{
  databaseLogin.elements.namedItem('password').value='';
  submit.disabled=false;
 }
};

$('#database-logout').onclick=async()=>{
 try{
  const response=await fetch('/api/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  if(!response.ok&&response.status!==401)throw new Error('Database unavailable. Please try again.');
  showDatabaseSignedOut();
  databaseMessage.textContent='';
 }catch(error){
  databaseMessage.textContent=t(error.message);
 }
};
$('#database-add').onclick=()=>openObservationEditor({},true);
$('#save-observation-db').onclick=async event=>{
 const record=activeRecord();
 if(!record)return;
 if(!databaseSignedIn){
  promptDatabaseLogin();
  return;
 }
 const button=event.currentTarget;
 button.disabled=true;
 try{
  await saveDatabaseObservation(record);
 }catch(error){
  databaseMessage.textContent=t(error.message);
  notify(t(error.message));
 }finally{
  button.disabled=false;
 }
};

refreshDatabase().catch(error=>{
 if(error.message!=='Sign in to use the database.')databaseMessage.textContent=t(error.message);
});
window.addEventListener('languagechange',()=>{
 if(databaseSignedIn)refreshDatabase().catch(()=>{});
});
