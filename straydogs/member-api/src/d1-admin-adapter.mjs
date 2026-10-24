// Privileged operator adapter, never imported by the public Worker or frontend.
// Existing credential only; caller must separately authorise each remote operation.
export function createD1AdminAdapter({accountId,databaseId,token,fetcher=globalThis.fetch,confirmed=false}) {
  if(confirmed!==true)throw new Error('EXPLICIT_REMOTE_CONFIRMATION_REQUIRED');
  if(!/^[a-f0-9]{32}$/i.test(accountId||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(databaseId||'')||typeof token!=='string'||token.length<20)throw new Error('INVALID_ADMIN_CONFIGURATION');
  const endpoint=`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  let verified=false;
  async function send(batch){
    // A single REST batch request preserves the maintenance module's transaction boundary.
    let response,body;try{response=await fetcher(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({batch}),signal:AbortSignal.timeout(15000),redirect:'error'});body=await response.json();}catch{throw new Error('D1_ADMIN_NETWORK_FAILED');}
    if(!response.ok||body.success!==true||!Array.isArray(body.result)||body.result.length!==batch.length||body.result.some(r=>r.success!==true))throw new Error('D1_ADMIN_QUERY_FAILED');
    return body.result;
  }
  const adapter={
    async verifyTarget(){const rows=await send([{sql:"SELECT value FROM straydogs_metadata WHERE key='application'",params:[]}]);if(rows[0].results?.[0]?.value!=='straydogs-members-v1')throw new Error('WRONG_DATABASE_TARGET');verified=true;return true;},
    prepare(sql){if(typeof sql!=='string'||sql.length>10000)throw new Error('INVALID_QUERY');const statement={sql,params:[],bind(...params){if(params.some(v=>v!==null&&!['string','number'].includes(typeof v)))throw new Error('INVALID_BINDING');return {...statement,params};},async run(){return (await adapter.batch([this]))[0];},async first(){const r=await this.run();return r.results?.[0]||null;},async all(){return this.run();}};return statement;},
    async batch(statements){if(!verified)throw new Error('VERIFY_DATABASE_TARGET_FIRST');if(!Array.isArray(statements)||!statements.length||statements.length>10)throw new Error('INVALID_BATCH');return send(statements.map(({sql,params})=>({sql,params})));}
  };return adapter;
}
