const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers/menu-drawer-dom.cjs');

test('viewing and closing every existing drawer entry stays clean', async () => {
  for (const [entry, id] of [[undefined],['add-option'],['linked'],['option','coffee_option']]) {
    const app = await setup(); app.context.UnifiedMenu.group('drinks',entry,id);
    await app.click('close'); assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0);
  }
  const app = await setup(); app.context.UnifiedMenu.group('drinks');
  await app.click('add-option'); await app.click('products');
  app.input('search','Cà phê'); app.input('filter','drinks'); await app.click('close');
  assert.equal(app.drawer().hidden,true);
});

test('direct option editor has edit title, no back, and no-op save does not write', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','option','coffee_option');
  assert.equal(app.get('#ug-title').textContent,'Chỉnh sửa lựa chọn');
  assert.equal(app.drawer().querySelector('[data-action="back"]'),null);
  assert.equal(app.get('[data-action="save"]').textContent,'Lưu lựa chọn');
  await app.click('save'); assert.equal(app.posts.length,0); assert.equal(app.drawer().hidden,true);
});

test('direct save patches only its option and preserves unrelated menu drafts', async () => {
  const app = await setup(), before = structuredClone(app.catalog().groups[0]);
  const savedProduct = JSON.parse(app.context.savedMenuSnapshot)[0].items[0];
  app.context.UnifiedMenu.group('drinks','option','coffee_option'); app.input('option.price',12);
  await app.click('save'); assert.equal(app.posts.length,1); assert.equal(app.drawer().hidden,true);
  const payload = app.posts[0]; assert.equal(payload.options[0].price,12); assert.deepEqual(payload.options[1],before.options[1]);
  assert.deepEqual(payload.sources,before.sources); assert.deepEqual(payload.metadata,before.metadata);
  assert.deepEqual(payload.itemIds,['meal']); assert.equal(payload.revision,1);
  assert.equal(app.context.currentMenuData[0].items[0].price,999);
  assert.deepEqual(JSON.parse(app.context.savedMenuSnapshot)[0].items[0],savedProduct);
});

test('editing in a group only applies to its draft, then group save writes once', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks'); app.input('name','Tên nhóm mới');
  await app.click('option','[data-id="coffee_option"]'); assert.equal(app.drawer().querySelector('[data-action="back"]'),null);
  app.input('option.price',9); await app.click('apply'); assert.equal(app.posts.length,0);
  assert.equal(app.get('[data-field="name"]').value,'Tên nhóm mới');
  await app.click('save'); assert.equal(app.posts[0].name,'Tên nhóm mới'); assert.equal(app.posts[0].options[0].price,9);
});

test('unchanged child apply and source-option apply never materialize an override', async () => {
  for (const [source,id] of [[false,'coffee_option'],[true,'source:drinks:tea']]) {
    const app = await setup({source}); app.context.UnifiedMenu.group('drinks');
    await app.click('option',`[data-id="${id}"]`); await app.click('apply'); await app.click('close');
    assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0);
  }
});

test('reverting fields, toggles and legacy child representations becomes clean', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','option','custom');
  app.input('option.price',10); app.input('option.price',5);
  app.input('option.isDefault',true); app.input('option.isDefault',false);
  app.input('sub.0.price',3); app.input('sub.0.price',0);
  app.input('eligibility.min_order_subtotal',50); app.input('eligibility.min_order_subtotal',0);
  await app.click('close'); assert.equal(app.drawer().hidden,true);
});

test('unapplied child changes prompt, with continue preserving DOM, scroll and focus', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks'); await app.click('option','[data-id="coffee_option"]');
  app.input('option.price',8); const input = app.get('[data-field="option.price"]'), body = app.get('.ug-body');
  const details = app.get('details[data-section="conditions"]'); details.open = true; body.scrollTop = 190;
  app.emit('keydown',input,{key:'Escape'});
  assert.equal(app.get('.ug-confirmation').hidden,false); assert.equal(body.inert,true);
  assert.equal(app.get('[data-action="continue"]'),app.doc.activeElement);
  app.emit('keydown',app.doc.activeElement,{key:'Escape'});
  assert.equal(app.get('.ug-confirmation').hidden,true); assert.equal(body.inert,false);
  assert.equal(app.get('[data-field="option.price"]'),input); assert.equal(app.doc.activeElement,input);
  assert.equal(body.scrollTop,190); assert.equal(details.open,true); assert.equal(input.value,'8');
  await app.click('close'); await app.click('discard'); assert.equal(app.drawer().hidden,true); assert.equal(app.doc.activeElement,app.launch);
});

test('child picker selections are dirty but searching and reverting selections are not', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','linked');
  const coffee = app.get('[data-check="product"][value="coffee"]'); coffee.checked = true; app.emit('input',coffee);
  await app.click('close'); assert.equal(app.get('.ug-confirmation').hidden,false); await app.click('continue');
  coffee.checked = false; app.emit('input',coffee); await app.click('close'); assert.equal(app.drawer().hidden,true);
});

test('included group rendering is read-only and its unchanged save is a no-op', async () => {
  const app = await setup({included:true}); app.context.UnifiedMenu.group('drinks');
  assert.equal(app.get('[data-field="minSelection"]').value,'2'); await app.click('close'); assert.equal(app.drawer().hidden,true);
  app.context.UnifiedMenu.group('drinks'); await app.click('save'); assert.equal(app.posts.length,0);
});

test('failed direct saves retain edits, support retry and allow reverting after failure', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','option','coffee_option'); app.input('option.price',7);
  app.responses.push({ok:false,json:async()=>({error:'MENU_SAVE_FAILED'})}); await app.click('save');
  assert.equal(app.drawer().hidden,false); assert.equal(app.get('[data-field="option.price"]').value,'7');
  assert.match(app.get('.ug-error').textContent,/Dữ liệu.*giữ lại/);
  app.input('option.price',0); await app.click('close'); assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,1);
  app.context.UnifiedMenu.group('drinks','option','coffee_option'); app.input('option.price',7);
  app.responses.push({ok:false,json:async()=>({error:'MENU_CONFLICT'})}); await app.click('save');
  assert.match(app.get('.ug-error').textContent,/cập nhật ở nơi khác/); assert.equal(app.get('[data-field="option.price"]').value,'7');
  await app.click('save'); assert.equal(app.drawer().hidden,true); assert.equal(app.posts.at(-1).options[0].price,7);
});

test('removing in a draft waits for group save, direct removal waits for server success', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks'); await app.click('option','[data-id="custom"]');
  await app.click('remove-option'); assert.equal(app.posts.length,0); await app.click('save');
  assert.equal(app.posts[0].options.some((o)=>o.id==='custom'),false);
  app.context.UnifiedMenu.group('drinks','option','coffee_option');
  app.responses.push({ok:false,json:async()=>({error:'INVALID_SELECTION_RULES'})}); await app.click('remove-option');
  assert.equal(app.drawer().hidden,false); assert.equal(app.get('.ug-product-summary').textContent.includes('Cà phê'),true);
  await app.click('remove-option'); assert.equal(app.drawer().hidden,true); assert.equal(app.posts.at(-1).options.length,0);
});

test('source options retain automatic source; meaningful edit creates only a selected override', async () => {
  const app = await setup({source:true}); app.context.UnifiedMenu.group('drinks','option','source:drinks:tea');
  assert.equal(app.get('[data-action="remove-option"]').disabled,true); app.input('option.price',6); await app.click('save');
  assert.equal(app.posts[0].options.filter((o)=>o.productId==='tea').length,1);
  assert.equal(app.posts[0].options.find((o)=>o.productId==='tea').fromSource,false);
  assert.equal(app.posts[0].options.find((o)=>o.productId==='coffee').price,0);
  assert.deepEqual(app.posts[0].sources,[{type:'category',categoryId:'drinks'}]);
});

test('option form sections and primary action use Traditional Chinese labels', async () => {
  const app = await setup({lang:'zh-TW'}); app.context.UnifiedMenu.group('drinks','option','coffee_option');
  assert.equal(app.get('#ug-title').textContent,'編輯選項'); assert.equal(app.get('[data-action="save"]').textContent,'儲存選項');
  assert.equal(app.get('details[data-section="conditions"]').textContent.includes('適用條件'),true);
  assert.equal(app.get('[data-action="add-sub"]').textContent,'新增子選項');
});

test('product group picker and default subset view/apply do not dirty the product', async () => {
  const app = await setup(); app.context.UnifiedMenu.product(0,0);
  await app.click('groups'); await app.click('apply');
  await app.click('subset','[data-id="drinks"]');
  const option = app.get('[data-check="subset"][value="custom"]');
  option.checked = false; app.emit('input',option); option.checked = true; app.emit('input',option);
  await app.click('apply'); await app.click('close');
  assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0);
});

test('blank new option can close cleanly and add/remove child reverts to the original', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','add-option');
  await app.click('custom'); await app.click('close'); assert.equal(app.drawer().hidden,true);
  app.context.UnifiedMenu.group('drinks','option','coffee_option');
  await app.click('add-sub'); await app.click('remove-sub','[data-index="0"]');
  await app.click('close'); assert.equal(app.drawer().hidden,true);
});

test('invalid fixed quantity stays in the draft; valid changes save computed group rules', async () => {
  const app = await setup({included:true}); app.context.UnifiedMenu.group('drinks','option','coffee_option');
  app.input('option.quantity',0); await app.click('save');
  assert.equal(app.drawer().hidden,false); assert.equal(app.posts.length,0); assert.equal(app.get('[data-field="option.quantity"]').value,'0');
  app.input('option.quantity',3); await app.click('save');
  assert.equal(app.posts[0].minSelection,4); assert.equal(app.posts[0].maxSelection,4);
});

test('local stock toggle persists without changing referenced product availability', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','option','coffee_option');
  app.input('option.isLocallyOutOfStock',true); await app.click('save');
  assert.equal(app.posts[0].options[0].isLocallyOutOfStock,true);
  assert.equal(app.catalog().products.find((p)=>p.id==='coffee').is_out_of_stock,undefined);
});
