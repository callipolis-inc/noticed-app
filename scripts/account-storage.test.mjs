import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('account cleanup removes both application namespaces, including future keys, and preserves unrelated storage',()=>{
 const localStorage={noticed_notes:'private',sidenotes_notes:'legacy',noticed_new_feature:'private',sidenotes_new_feature:'private',unrelated:'keep',removeItem(key){delete this[key]}};
 const context={exports:{},window:{localStorage},localStorage};
 const input=fs.readFileSync(new URL('../src/lib/storage.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 context.exports.clearAppLocalStorage();
 assert.equal(localStorage.unrelated,'keep');
 assert.deepEqual(Object.keys(localStorage).filter(key=>/^(noticed_|sidenotes_)/.test(key)),[]);
});
