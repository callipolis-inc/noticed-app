import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load({rpcError=null,configured=true,userId='owner'}={}) {
 const calls=[];
 const client={auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null}),signOut:async(options)=>{calls.push(['signOut',options]);return {error:null}}},functions:{invoke:async(_name,options)=>{calls.push(['delete',options.body]);return {data:{deleted:true},error:rpcError}}}};
 const input=fs.readFileSync(new URL('../src/lib/supabase.ts',import.meta.url),'utf8').replaceAll('import.meta.env.VITE_SUPABASE_URL',JSON.stringify(configured?'https://test.supabase.co':'')).replaceAll('import.meta.env.VITE_SUPABASE_ANON_KEY',JSON.stringify(configured?'test':''));
 const source=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const context={exports:{},console:{warn(){},error(){}},setTimeout,clearTimeout,require(name){if(name==='@supabase/supabase-js')return {createClient:()=>client};if(name==='@capacitor/core')return {Capacitor:{isNativePlatform:()=>false,getPlatform:()=> 'web'}};return {};}};
 vm.runInNewContext(source,context);
 return {deleteAccount:context.exports.deleteUserAccount,calls};
}
test('server failure preserves session for retry',async()=>{const h=load({rpcError:{message:'database unavailable'}});await assert.rejects(()=>h.deleteAccount('owner'));assert.equal(h.calls.length,1);assert.equal(h.calls[0][0],'delete');assert.equal(h.calls[0][1].expectedUserId,'owner');});
test('unconfigured deletion fails instead of reporting success',async()=>{const h=load({configured:false});await assert.rejects(()=>h.deleteAccount('owner'));assert.deepEqual(h.calls,[]);});
test('changed identity cannot delete another signed-in account',async()=>{const h=load({userId:'another'});await assert.rejects(()=>h.deleteAccount('owner'));assert.deepEqual(h.calls,[]);});
test('missing authentication never invokes deletion',async()=>{const h=load({userId:null});await assert.rejects(()=>h.deleteAccount('owner'));assert.deepEqual(h.calls,[]);});
test('confirmed deletion clears the local session without requiring deleted server identity',async()=>{const h=load();await h.deleteAccount('owner');assert.equal(h.calls[0][0],'delete');assert.equal(h.calls[1][0],'signOut');assert.equal(h.calls[1][1]?.scope,'local');});
