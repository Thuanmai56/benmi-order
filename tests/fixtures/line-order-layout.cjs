const choice = (name, extra = {}) => ({ optionId: name, itemId: '', name, quantity: 1, surcharge: 0, groups: [], subOptions: [], ...extra });
const group = (name, names) => ({ groupId: name, groupName: name, items: names.map(n => typeof n === 'string' ? choice(n) : n) });
const portions = () => [
  { portionIndex: 0, note: '少花生粉', groups: [group('先選米', ['紫米']), group('份量調整', ['正常']), group('辣度選擇', ['不加辣']),
    group('加料10元', [choice('花生粉', { surcharge: 10 })]), group('加料15元', [choice('皮蛋', { surcharge: 15 })])] },
  { portionIndex: 1, note: '泡菜另外放', groups: [group('先選米', ['紫米']), group('份量調整', ['加大']), group('辣度選擇', ['大辣']),
    group('加料15元', [choice('泡菜', { surcharge: 15 })])] }
];
const line = (extra = {}) => ({ lineId: 'line-a', itemId: 'meal', name: '素筍飯糰', category: '任意分類', quantity: 2, unitPrice: 50,
  subtotal: 140, note: '分袋', portions: portions(), ...extra });
const legacy = (extra = {}) => ({ name: '素筍飯糰', quantity: 2, price: 50, subtotal: 140,
  bundleSelections: { portions: portions() }, ...extra });
const snapshot = (items = [line()]) => ({ schemaVersion: 1, total: 140, rounds: [
  { roundNumber: 1, createdAt: '', note: '全單備註', groups: [group('餐具', ['需要筷子'])], items, discount: 0, total: 140 }
] });
const order = (extra = {}) => ({ key: 'internal-key', displayKey: 'TEST1030-T001', content: '', time: '2026-10-30 12:00', total: 140,
  diningOption: 'takeaway', ...extra });
module.exports = { choice, group, portions, line, legacy, snapshot, order };
