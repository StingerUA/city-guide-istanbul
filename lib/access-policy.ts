import type {Profile} from './model';

// Server-side policy. The email must come from the verified authentication
// provider, never from profile edits, request bodies, or browser storage.
const adminEmails = new Set([
  'nncdecdgc@gmail.com',
  'sayitatas@hotmail.com',
]);

export function isAdminEmail(email:string):boolean {
  return adminEmails.has(email.trim().toLowerCase());
}

export function accountRole(email:string, storedRole:unknown):Profile['role'] {
  if(isAdminEmail(email)) return 'admin';
  return storedRole==='partner' ? 'partner' : 'tourist';
}
