// Manual operator entrypoint. Never run automatically on push, PR, schedule or untrusted input.
import {writeFile} from 'node:fs/promises';
import {createD1AdminAdapter} from '../src/d1-admin-adapter.mjs';
import {createMaintenance} from '../src/maintenance.mjs';
const [operation,target,...flags]=process.argv.slice(2);
const operations={admit:'admitApplication','reject-application':'rejectApplication','approve-profile':'approveProfile','reject-profile':'rejectProfile',withdraw:'withdrawProfile',suspend:'suspendMember',revoke:'revokeSessions',purge:'purgeExpired'};
try{
  if(process.env.STRAYDOGS_ADMIN_CONFIRM!=='authorised-straydogs-only')throw new Error('EXPLICIT_REMOTE_CONFIRMATION_REQUIRED');
  if(!operations[operation]&&!['review-application','review-profile','pending'].includes(operation))throw new Error('UNKNOWN_OPERATION');
  if(!['purge','pending'].includes(operation)&&!/^[A-Za-z0-9_-]{1,100}$/.test(target||''))throw new Error('INVALID_TARGET');
  const allowedFlags=operation==='admit'?['--publish']:[];
  if(flags.some(x=>!allowedFlags.includes(x)))throw new Error('INVALID_OPTION');
  const db=createD1AdminAdapter({accountId:process.env.CLOUDFLARE_ACCOUNT_ID,databaseId:process.env.STRAYDOGS_D1_DATABASE_ID,token:process.env.CLOUDFLARE_API_TOKEN,confirmed:true});
  await db.verifyTarget();
  if(['review-application','review-profile','pending'].includes(operation)){
    // Private records go only to a new 0600 local file, never CI logs/artifacts or stdout.
    const out=process.env.STRAYDOGS_PRIVATE_REVIEW_FILE;if(!out)throw new Error('PRIVATE_REVIEW_FILE_REQUIRED');
    const sql=operation==='pending'?"SELECT id,status,created_at FROM applications WHERE status='pending' ORDER BY created_at LIMIT 25":operation==='review-application'?'SELECT * FROM applications WHERE id=?':'SELECT * FROM profile_submissions WHERE id=?';
    const result=await db.prepare(sql).bind(...(operation==='pending'?[]:[target])).all();
    await writeFile(out,JSON.stringify(result.results||[],null,2),{mode:0o600,flag:'wx'});console.log(JSON.stringify({status:'private_review_saved',operation,count:result.results?.length||0}));
  }else{
    const maintenance=createMaintenance(db),result=operation==='purge'?await maintenance.purgeExpired():await maintenance[operations[operation]](target,...(operation==='admit'?[{publishProfile:flags.includes('--publish')}]:[]));
    console.log(JSON.stringify({operation,...result}));
  }
}catch(error){const code=/^[A-Z_]+$/.test(error.message)?error.message:'ADMIN_OPERATION_FAILED';console.error(JSON.stringify({status:'failed',code}));process.exitCode=1;}
