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
  await app.click('add-sub'); await app.click('sub-custom'); await app.click('remove-sub','[data-index="0"]');
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

test('product options entry shows only group settings; normal product entry keeps its full form', async () => {
  for (const [lang, label, save] of [['vi','Tùy chọn món','Lưu tùy chọn'],['zh-TW','餐點選項','儲存餐點選項']]) {
    const app = await setup({lang}); app.context.UnifiedMenu.product(0,0,'options');
    assert.equal(app.get('.ug-product-options-label').textContent,label);
    assert.equal(app.get('#ug-title').textContent.includes('Bánh mì'),true);
    assert.equal(app.get('[data-action="save"]').textContent,save);
    assert.equal(app.get('[data-action="subset"]').textContent.includes('Chọn đồ uống'),true);
    assert.ok(app.get('[data-action="groups"]'));
    for (const selector of ['[data-field="name"]','[data-field="price"]','[data-field="photo"]','[data-action="delete"]','[data-action="back"]']) {
      assert.equal(app.drawer().querySelector(selector),null);
    }
    await app.click('save'); assert.equal(app.posts.length,0); assert.equal(app.drawer().hidden,true);
    app.context.UnifiedMenu.product(0,0);
    assert.equal(app.get('[data-field="name"]').value,'Bản nháp khác');
    assert.equal(app.get('[data-field="price"]').value,'999');
    assert.ok(app.get('[data-action="delete"]'));
    await app.click('close'); assert.equal(app.drawer().hidden,true);
  }
});

test('saving product options only writes links and preserves inline drafts and their saved baseline', async () => {
  const app = await setup();
  Object.assign(app.catalog().products[0],{menu_revision:4,badge_text:'Đề xuất',is_recommended:true,image_key:null});
  const item = app.context.currentMenuData[0].items[0];
  Object.assign(item,{badgeText:'Nhãn nháp',imageKey:'draft-image',isRecommended:false});
  const before = structuredClone(item), baseline = JSON.parse(app.context.savedMenuSnapshot)[0].items[0];
  await app.context.UnifiedMenu.load(); app.context.UnifiedMenu.product(0,0,'options');
  await app.click('subset','[data-id="drinks"]');
  const custom = app.get('[data-check="subset"][value="custom"]'); custom.checked = false; app.emit('input',custom);
  await app.click('apply'); assert.equal(app.posts.length,0);
  assert.equal(app.get('[data-action="subset"]').textContent.includes('1/2'),true);
  await app.click('save');
  assert.equal(app.drawer().hidden,true);
  assert.equal(app.posts[0].name,'Bánh mì'); assert.equal(app.posts[0].price,100);
  assert.equal(app.posts[0].badgeText,'Đề xuất'); assert.equal(app.posts[0].isRecommended,true);
  assert.equal(app.posts[0].imageKey,null); assert.equal(app.posts[0].revision,4);
  assert.deepEqual(app.posts[0].links[0].optionIds,['coffee_option']);
  assert.deepEqual(app.context.currentMenuData[0].items[0],{...before,menuRevision:5});
  assert.deepEqual(JSON.parse(app.context.savedMenuSnapshot)[0].items[0],{...baseline,menuRevision:5});
  assert.equal(app.catalog().groups[0].options.length,2);
});

test('options entry preserves inherited defaults on no-op apply and warns for unapplied changes', async () => {
  const app = await setup(); app.catalog().links = [];
  app.catalog().categoryLinks = [{groupId:'drinks',categoryId:'food'}];
  await app.context.UnifiedMenu.load(); app.context.UnifiedMenu.product(0,0,'options');
  assert.equal(app.get('[data-action="subset"]').textContent.includes('Từ phân loại'),true);
  await app.click('groups'); app.input('search','đồ uống'); await app.click('apply');
  await app.click('subset','[data-id="drinks"]'); await app.click('apply'); await app.click('close');
  assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0); assert.deepEqual(app.catalog().links,[]);
  app.context.UnifiedMenu.product(0,0,'options'); await app.click('subset','[data-id="drinks"]');
  const option = app.get('[data-check="subset"][value="custom"]'); option.checked = false; app.emit('input',option);
  await app.click('close'); assert.equal(app.get('.ug-confirmation').hidden,false);
  await app.click('continue'); assert.equal(app.get('[data-check="subset"][value="custom"]').checked,false);
  await app.click('defaults'); await app.click('apply'); await app.click('save');
  assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0);
});

test('options-only network failures and version conflicts retain the subset draft for retry', async () => {
  for (const error of ['MENU_SAVE_FAILED','MENU_CONFLICT']) {
    const app = await setup(); app.context.UnifiedMenu.product(0,0,'options');
    await app.click('subset','[data-id="drinks"]');
    const custom = app.get('[data-check="subset"][value="custom"]'); custom.checked = false; app.emit('input',custom);
    await app.click('apply');
    app.responses.push({ok:false,json:async()=>({error})}); await app.click('save');
    assert.equal(app.drawer().hidden,false); assert.equal(app.get('.ug-error').textContent.length>0,true);
    assert.equal(app.get('[data-action="save"]').textContent,'Lưu tùy chọn');
    await app.click('subset','[data-id="drinks"]');
    assert.equal(app.get('[data-check="subset"][value="custom"]').checked,false);
    await app.click('apply'); await app.click('save');
    assert.equal(app.drawer().hidden,true); assert.deepEqual(app.posts[1].links[0].optionIds,['coffee_option']);
    assert.equal(app.context.currentMenuData[0].items[0].price,999);
  }
});

test('sub-option popover opens without dirtying the draft and Escape dismisses only the menu', async () => {
  for (const lang of ['vi','zh-TW']) {
    const app = await setup({lang}); app.context.UnifiedMenu.group('drinks','option','custom');
    const name = app.get('[data-field="option.name"]'), body = app.get('.ug-body');
    app.input('option.description','Draft description'); body.scrollTop = 160;
    await app.click('add-sub');
    assert.equal(app.get('.ug-sub-menu').hidden,false);
    assert.equal(app.get('[data-action="add-sub"]').getAttribute('aria-expanded'),'true');
    assert.equal(app.get('[data-action="sub-products"]').textContent.includes(lang==='vi'?'Từ món có sẵn':'從現有餐點選擇'),true);
    app.emit('keydown',app.get('[data-action="sub-products"]'),{key:'Escape'});
    assert.equal(app.get('.ug-sub-menu').hidden,true);
    assert.equal(app.drawer().hidden,false); assert.equal(app.get('[data-field="option.name"]'),name);
    assert.equal(app.get('[data-field="option.description"]').value,'Draft description');
    assert.equal(body.scrollTop,160); assert.equal(app.posts.length,0);
  }
});

test('sub-product picker retains both kinds, zero independent surcharge and selected reference on save/reopen', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks','option','custom');
  await app.click('add-sub'); await app.click('sub-products');
  const tea=app.get('[data-check="product"][value="tea"]'); tea.checked=true; app.emit('input',tea);
  await app.click('apply');
  assert.equal(app.get('[data-field="sub.0.name"]').value,'Nóng');
  assert.equal(app.get('[data-field="sub.1.name"]').value,'Trà đen');
  assert.equal(app.get('[data-field="sub.1.name"]').getAttribute('readonly'),'');
  assert.equal(app.get('[data-field="sub.1.price"]').value,'0');
  assert.match(app.get('.ug-sub-source-meta').textContent,/#tea.*37/);
  app.input('sub.1.price',15); await app.click('save');
  const sub=app.posts[0].options.find(o=>o.id==='custom').subOptions[1];
  assert.equal(sub.productId,'tea'); assert.equal(sub.price,15); assert.ok(sub.id);
  assert.equal(app.catalog().products.find(p=>p.id==='tea').price,37);
  app.context.UnifiedMenu.group('drinks','option','custom');
  assert.equal(app.get('[data-field="sub.1.price"]').value,'15');
  await app.click('add-sub'); await app.click('sub-products');
  assert.equal(app.get('[data-check="product"][value="tea"]').disabled,true);
  assert.equal(app.get('[data-check="product"][value="tea"]').checked,true);
  await app.click('apply'); await app.click('save'); assert.equal(app.posts.length,1);
});

test('canceling a sub-product picker preserves the option and adding/removing a link restores a clean draft', async () => {
  const app=await setup(); app.context.UnifiedMenu.group('drinks','option','coffee_option');
  await app.click('add-sub'); await app.click('sub-products');
  const tea=app.get('[data-check="product"][value="tea"]'); tea.checked=true; app.emit('input',tea);
  await app.click('back'); assert.equal(app.get('.ug-option-children').textContent.includes('(0)'),true);
  await app.click('add-sub'); await app.click('sub-products');
  const picked=app.get('[data-check="product"][value="tea"]'); picked.checked=true; app.emit('input',picked);
  await app.click('apply'); await app.click('remove-sub','[data-index="0"]');
  await app.click('close'); assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0);
});

test('linked sub-option names and stock come from the live catalog and cannot be renamed through the child form', async () => {
  const app=await setup();
  const sub={id:'linked-tea',productId:'tea',name:'Old tea',price:15};
  app.catalog().groups[0].options[1].subOptions.push(sub);
  app.catalog().products.find(p=>p.id==='tea').out_of_stock_until='2999-01-01T00:00:00Z';
  await app.context.UnifiedMenu.load(); app.context.UnifiedMenu.group('drinks','option','custom');
  assert.equal(app.get('[data-field="sub.1.name"]').value,'Trà đen');
  assert.match(app.get('.ug-sub-source-meta').textContent,/Hết món/);
  app.input('sub.1.name','Attempted rename'); await app.click('save');
  assert.equal(app.posts.length,0); assert.equal(sub.name,'Old tea');
});

test('optional rule hides minimum; switching required starts at one without correcting maximum', async () => {
  const app = await setup(); app.context.UnifiedMenu.group('drinks');
  app.input('required', false);
  assert.equal(app.drawer().querySelector('[data-field="minSelection"]'), null);
  assert.equal(app.get('[data-field="maxSelection"]').value, '1');
  app.input('maxSelection', 0); app.input('required', true);
  assert.equal(app.get('[data-field="minSelection"]').value, '1');
  assert.equal(app.get('[data-field="maxSelection"]').value, '0');
  await app.click('save'); assert.equal(app.posts.length, 0);
  assert.equal(app.get('[data-field="maxSelection"]').getAttribute('aria-invalid'),'true');
  app.input('maxSelection', 1); await app.click('close'); assert.equal(app.drawer().hidden, true);
});

test('numeric rules retain invalid inputs, show field errors and block writes until valid', async () => {
  for (const [key,value] of [['minSelection',''],['minSelection',0],['minSelection',1.5],['maxSelection',1000],['maxSelection',0]]) {
    const app=await setup(); app.context.UnifiedMenu.group('drinks'); app.input(key,value);
    app.emit('focusout',app.get(`[data-field="${key}"]`));
    assert.equal(app.get(`[data-field="${key}"]`).value,String(value));
    assert.equal(app.get(`#ug-${key}-error`).hidden,false);
    await app.click('save'); assert.equal(app.posts.length,0);
    assert.equal(app.doc.activeElement,app.get(`[data-field="${key}"]`));
    app.input(key,1); await app.click('save'); assert.equal(app.drawer().hidden,true); assert.equal(app.posts.length,0);
  }
  const app=await setup(); app.context.UnifiedMenu.group('drinks');
  app.input('minSelection',2); assert.equal(app.get('[data-field="required"]').checked,true);
  assert.equal(app.get('[data-field="maxSelection"]').value,'1');
  await app.click('save'); assert.equal(app.posts.length,0);
  assert.match(app.get('#ug-maxSelection-error').textContent,/lớn hơn hoặc bằng/);
  app.input('maxSelection',3); await app.click('save');
  assert.equal(app.posts[0].minSelection,2); assert.equal(app.posts[0].maxSelection,3);
});

test('optional minimum persists zero, rule errors are localized and included quantities stay read-only', async () => {
  const app=await setup(); app.context.UnifiedMenu.group('drinks'); app.input('required',false); app.input('maxSelection',4);
  await app.click('save'); assert.equal(app.posts[0].minSelection,0); assert.equal(app.posts[0].maxSelection,4);
  const zh=await setup({lang:'zh-TW'}); zh.context.UnifiedMenu.group('drinks'); zh.input('maxSelection',0); await zh.click('save');
  assert.match(zh.get('#ug-maxSelection-error').textContent,/請輸入/);
  const fixed=await setup({included:true}); fixed.context.UnifiedMenu.group('drinks');
  for(const key of ['required','minSelection','maxSelection','allowRepeats']) assert.equal(fixed.get(`[data-field="${key}"]`).disabled,true);
});

test('recommendation saves its explicit flag and publishes immediately, without deriving it from badge text', async () => {
  const app=await setup(); app.context.UnifiedMenu.product(0,0);
  assert.match(app.get('.ug-recommended-help').textContent,/sau khi lưu/);
  app.input('badgeText','推薦'); app.input('isRecommended',true); await app.click('save');
  assert.equal(app.posts[0].isRecommended,true);
  assert.equal(app.context.currentMenuData[0].items[0].isRecommended,true);
  app.context.UnifiedMenu.product(0,0); app.input('isRecommended',false); await app.click('save');
  assert.equal(app.posts[1].isRecommended,false); assert.equal(app.posts[1].badgeText,'推薦');
  assert.equal(app.context.currentMenuData[0].items[0].isRecommended,false);
});
