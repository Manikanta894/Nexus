import crypto from 'crypto';
import fs from 'fs';

const sa = JSON.parse(fs.readFileSync('C:/Users/Manikanta/Downloads/socialforge-503814-0e994793fb63.json', 'utf8'));
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const data = b64u(header) + '.' + b64u(claims);
  const sig = crypto.sign('RSA-SHA256', Buffer.from(data), sa.private_key);
  const assertion = data + '.' + sig.toString('base64url');
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) }).then(r => r.json());
  return tokenResp.access_token;
}

const gToken = await getToken();
const fileId = '1D7wsRJpApm1XmsQno2CyRxAJHBHEbIRk'; // 5.png
const archiveFolderId = '1awZyi7aRbLztSo4vUUSAWxU3KqXKGxzE';

// Step 1: Get current parents
console.log('--- Getting file metadata ---');
const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents,name`, {
  headers: { Authorization: 'Bearer ' + gToken },
});
console.log('GET status:', getRes.status);
const meta = await getRes.json();
console.log('File:', meta.name, 'Parents:', meta.parents);

// Step 2: Move
if (meta.parents?.length) {
  console.log('\n--- Moving file ---');
  const removeParents = meta.parents.join(',');
  const qs = `addParents=${archiveFolderId}&removeParents=${encodeURIComponent(removeParents)}`;
  const moveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${qs}&fields=id,name,parents`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + gToken },
  });
  console.log('MOVE status:', moveRes.status);
  const moveBody = await moveRes.json();
  console.log('MOVE result:', JSON.stringify(moveBody));
}

// Step 3: Verify
console.log('\n--- Verifying ---');
const archiveFiles = await fetch("https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent("'1awZyi7aRbLztSo4vUUSAWxU3KqXKGxzE' in parents and trashed=false") + "&pageSize=100&fields=files(id,name)", { headers: { Authorization: "Bearer " + gToken } }).then(r => r.json());
console.log('Archive folder now has:', archiveFiles.files?.length, 'files');
if (archiveFiles.files?.length) {
  console.log('  files:', archiveFiles.files.map(f => f.name).join(', '));
}
