import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';

const configuredEmulators = new Map();

export function createFirebaseTokenProvider({ apiKey, projectId, authDomain, emulatorUrl, appName = '[DEFAULT]' }) {
  if (!apiKey || !projectId) throw new Error('A configuração do Firebase está incompleta.');
  const app = getApps().find(existing => existing.name === appName) || initializeApp({ apiKey, projectId, ...(authDomain ? { authDomain } : {}) }, appName);
  const auth = getAuth(app);
  if (emulatorUrl) {
    const url = new URL(emulatorUrl);
    if (import.meta.env.PROD || url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Emulador de autenticação inválido.');
    if (configuredEmulators.has(appName) && configuredEmulators.get(appName) !== url.origin) throw new Error('Emulador de autenticação já configurado.');
    if (!configuredEmulators.has(appName)) {
      connectAuthEmulator(auth, url.origin, { disableWarnings: true });
      configuredEmulators.set(appName, url.origin);
    }
  }
  return async () => {
    try {
      await auth.authStateReady();
      const user = auth.currentUser || (await signInAnonymously(auth)).user;
      return await user.getIdToken();
    } catch {
      throw new Error('Não foi possível autenticar. Verifique a conexão e tente novamente.');
    }
  };
}
