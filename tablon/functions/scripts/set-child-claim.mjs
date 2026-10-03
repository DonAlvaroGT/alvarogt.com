import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
if (!getApps().length) initializeApp();
const email = 'child-1@example.com';
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), childRole: 'supervised' });
const verified = await getAuth().getUser(user.uid);
console.log(JSON.stringify({ uid: verified.uid, email: verified.email, childRole: verified.customClaims?.childRole }, null, 2));
