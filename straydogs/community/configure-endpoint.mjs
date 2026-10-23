// Run only after the isolated backend has been deployed and verified.
// This file accepts a public origin, never a credential, and does not deploy.
import {readFile,writeFile} from 'node:fs/promises';
const argument=process.argv[2];if(!argument)throw Error('Supply the verified HTTPS API origin.');
const u=new URL(argument);if(u.protocol!=='https:'||u.origin!==argument||u.username||u.password)throw Error('HTTPS origin only; no path, query, credentials or slash.');
// HttpOnly SameSite=Strict must stay on the existing site's HTTPS registrable domain.
if(u.hostname!=='confluenceofminds.com'&&!u.hostname.endsWith('.confluenceofminds.com'))throw Error('Use an approved same-site API hostname under confluenceofminds.com; workers.dev is not supported.');
const base=new URL('./',import.meta.url);
await writeFile(new URL('runtime-config.js',base),`// Public backend origin; no secrets.\nglobalThis.STRAYDOGS_RUNTIME=Object.freeze(${JSON.stringify({mode:'production',apiBase:u.origin})});\n`);
const html=await readFile(new URL('index.html',base),'utf8');
await writeFile(new URL('index.html',base),html.replace(/connect-src [^;]+;/,'connect-src '+u.origin+';'));
console.log('Configured public API origin and CSP. No deployment performed.');

