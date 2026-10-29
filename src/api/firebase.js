import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';

let configuredEmulatorUrl = null;

export function createFirebaseTokenProvider({ apiKey, projectId, authDomain, emulatorUrl }) {
  if (!apiKey || !projectId) throw new Error('A configuração do Firebase está incompleta.');
  const app = getApps().length ? getApp() : initializeApp({ apiKey, projectId, ...(authDomain ? { authDomain } : {}) });
  const auth = getAuth(app);
  if (emulatorUrl) {
    const url = new URL(emulatorUrl);
    if (import.meta.env.PROD || url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Emulador de autenticação inválido.');
    if (configuredEmulatorUrl && configuredEmulatorUrl !== url.origin) throw new Error('Emulador de autenticação já configurado.');
    if (!configuredEmulatorUrl) {
      connectAuthEmulator(auth, url.origin, { disableWarnings: true });
      configuredEmulatorUrl = url.origin;
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
