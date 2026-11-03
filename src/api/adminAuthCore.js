// Firebase remains the authority; a second-factor claim is required before exposing the session.
export function createAdminAuthController(adapter) {
  let resolver = null;
  async function requireSecondFactor(user) {
    const token = await user.getIdTokenResult();
    if (!token.claims?.firebase?.sign_in_second_factor) {
      await adapter.signOut();
      throw new Error('O administrador precisa entrar com verificação em duas etapas.');
    }
    return user;
  }
  return {
    async signIn(email, password) {
      resolver = null;
      try {
        const credential = await adapter.signIn(email, password);
        await requireSecondFactor(credential.user);
        return {status: 'authenticated'};
      } catch (error) {
        if (error.code !== 'auth/multi-factor-auth-required') throw error;
        resolver = adapter.getResolver(error);
        const hints = resolver.hints.filter(hint => hint.factorId === 'totp');
        if (!hints.length) { resolver = null; throw new Error('Esta tela precisa de um autenticador por aplicativo já cadastrado.'); }
        return {status: 'second-factor', factors: hints.map(h => ({uid: h.uid, name: h.displayName || 'Aplicativo autenticador'}))};
      }
    },
    async verify(factorId, code) {
      if (!resolver || !resolver.hints.some(hint => hint.factorId === 'totp' && hint.uid === factorId)) throw new Error('Inicie o acesso novamente.');
      const assertion = adapter.totpAssertion(factorId, code);
      const credential = await resolver.resolveSignIn(assertion);
      await requireSecondFactor(credential.user);
      resolver = null;
      return {status: 'authenticated'};
    },
    async getToken() {
      const user = adapter.currentUser();
      if (!user) throw new Error('Entre novamente como administrador.');
      await requireSecondFactor(user);
      return user.getIdToken();
    },
    async signOut() { resolver = null; await adapter.signOut(); }
  };
}
