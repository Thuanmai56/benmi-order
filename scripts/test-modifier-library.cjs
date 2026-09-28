const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('../benmi-worker-official/node_modules/typescript');
const source = fs.readFileSync('benmi-worker-official/src/modules/modifier-library.ts','utf8');
const part = source.slice(source.indexOf('export function buildModifierLibrary'), source.indexOf('export async function getModifierLibrary')).replace('export function','function');
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(part,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const build = (...args) => JSON.parse(JSON.stringify(context.buildModifierLibrary(...args)));
test('legacy-only tenants retain both representations and option metadata',()=>{
 const legacy={customizations:[{id:'old',title:'Flavor',type:'radio',options:[{name:'Normal',sub_options:['No salt'],minOrderSubtotal:100}]}],modifiers:[{id:'top',name:'Topping',options:[{id:'egg',name:'Egg',price:10}]}]};
 const result=build(legacy,[],[],[],[]);
 assert.equal(result.length,2);assert.equal(result[0].options[0].minOrderSubtotal,100);assert.equal(result[1].source,'modifier_category');
});
test('canonical Size and unassigned groups are included independently of legacy sources',()=>{
 const result=build({},[{id:'size',name:'Size',scope:'item'},{id:'unused',name:'Size',scope:'item'}],[{id:'small',group_id:'size',name:'Small',price:0,is_default:1}],[{item_id:'combo',group_id:'size'}],[]);
 assert.equal(result.length,2);assert.deepEqual(result[0].itemIds,['combo']);assert.equal(result[0].options[0].isDefault,true);assert.deepEqual(result[1].itemIds,[]);
});
test('legacy/canonical counterparts have one entry but names never deduplicate identities',()=>{
 const result=build({customizations:[{id:'old',title:'Same',options:[]}]},[{id:'mg_old',name:'Same'},{id:'different',name:'Same'}],[],[],[]);
 assert.equal(result.length,2);assert.equal(result[0].canonicalId,'mg_old');
});
test('ambiguous alias mapping fails rather than silently discarding a group',()=>{
 assert.throws(()=>build({customizations:[{id:'old'}]},[{id:'old'},{id:'mg_old'}],[],[],[]),/AMBIGUOUS/);
});
