import {initializeApp, getApps} from 'firebase/app';
import {getAuth, setPersistence, inMemoryPersistence, connectAuthEmulator, signInWithEmailAndPassword, getMultiFactorResolver, TotpMultiFactorGenerator, signOut} from 'firebase/auth';
import {createAdminAuthController} from './adminAuthCore.js';

export async function createAdminFirebaseAuth({apiKey, projectId, authDomain, emulatorUrl}) {
  if (!apiKey || !projectId) throw new Error('A configuração do Firebase está incompleta.');
  const appName = 'vamo-admin';
  const app = getApps().find(item => item.name === appName) || initializeApp({apiKey, projectId, ...(authDomain ? {authDomain} : {})}, appName);
  const auth = getAuth(app);
  if (emulatorUrl) {
    const url = new URL(emulatorUrl);
    if (import.meta.env.PROD || url.protocol !== 'http:' || !['localhost','127.0.0.1'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Emulador de autenticação inválido.');
    if (!auth.emulatorConfig) connectAuthEmulator(auth, url.origin, {disableWarnings:true});
  }
  await setPersistence(auth, inMemoryPersistence);
  return createAdminAuthController({
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    getResolver: error => getMultiFactorResolver(auth, error),
    totpAssertion: (uid, code) => TotpMultiFactorGenerator.assertionForSignIn(uid, code),
    currentUser: () => auth.currentUser,
    signOut: () => signOut(auth)
  });
}
