import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminAuthController} from '../src/api/adminAuthCore.js';

const user = factor => ({getIdTokenResult: async()=>({claims:{firebase:factor ? {sign_in_second_factor:'totp'} : {}}}),getIdToken:async()=> 'admin-token'});
function fixture({withFactor=false}={}) {
 let current=user(withFactor), signedOut=0;
 const adapter={signIn:async()=>({user:current}), currentUser:()=>current, signOut:async()=>{signedOut++;current=null;}, getResolver:()=>{throw new Error('unexpected resolver');},totpAssertion:(uid,code)=>({uid,code})};
 return {adapter,get signedOut(){return signedOut;},setUser(value){current=value;}};
}
test('login sem segundo fator é recusado e a identidade é encerrada',async()=>{
 const f=fixture();const auth=createAdminAuthController(f.adapter);
 await assert.rejects(()=>auth.signIn('admin@example.test','senha-teste'),/duas etapas/);
 assert.equal(f.signedOut,1);await assert.rejects(()=>auth.getToken(),/Entre novamente/);
});
test('aceita código TOTP no fluxo de desafio e obtém apenas token da sessão verificada',async()=>{
 const f=fixture();const challenge=Object.assign(new Error('mfa'),{code:'auth/multi-factor-auth-required'});let assertion;
 f.adapter.signIn=async()=>{throw challenge;};
 f.adapter.getResolver=()=>({hints:[{uid:'factor-id',factorId:'totp',displayName:'Meu app'}],resolveSignIn:async value=>{assertion=value;const u=user(true);f.setUser(u);return {user:u};}});
 const auth=createAdminAuthController(f.adapter);
 assert.deepEqual(await auth.signIn('admin@example.test','senha-teste'),{status:'second-factor',factors:[{uid:'factor-id',name:'Meu app'}]});
 await assert.rejects(()=>auth.verify('outro','123456'),/Inicie/);
 assert.deepEqual(await auth.verify('factor-id','123456'),{status:'authenticated'});
 assert.deepEqual(assertion,{uid:'factor-id',code:'123456'});assert.equal(await auth.getToken(),'admin-token');
 await auth.signOut();await assert.rejects(()=>auth.getToken(),/Entre novamente/);
});
test('não aceita fator de outro tipo nem sessão sem autenticação confirmada',async()=>{
 const f=fixture();f.adapter.signIn=async()=>{throw Object.assign(new Error('mfa'),{code:'auth/multi-factor-auth-required'});};
 f.adapter.getResolver=()=>({hints:[{uid:'telefone',factorId:'phone'}]});
 const auth=createAdminAuthController(f.adapter);await assert.rejects(()=>auth.signIn('x','y'),/autenticador por aplicativo/);
 await assert.rejects(()=>auth.getToken(),/duas etapas/);assert.equal(f.signedOut,1);
});
