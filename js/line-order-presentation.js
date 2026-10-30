/* LINE-only presentation. Never changes the persisted snapshot or printer contract. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; module.exports.default = api; }
  else root.LineOrderPresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const list = value => Array.isArray(value) ? value : [];
  const str = value => value == null ? '' : String(value);
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const qty = value => number(value) > 0 ? number(value) : 1;
  const labels = locale => locale === 'vi'
    ? { portion: n => `Phần ${n}`, same: 'Cùng tùy chọn', note: 'Ghi chú', group: 'Tùy chọn', unit: 'Đơn giá' }
    : { portion: n => `第 ${n} 份`, same: '相同設定', note: '備註', group: '搭配', unit: '單價' };
  function parse(value) {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return null; }
  }
  function groups(value) {
    return list(value).filter(g => g && typeof g === 'object').map(g => ({
      id: str(g.groupId || g.group_id || g.id), name: str(g.groupName || g.group_name),
      choices: list(g.items).filter(c => c != null).map(choice)
    }));
  }
  function choice(c) {
    if (typeof c !== 'object') return { id: '', itemId: '', name: str(c), quantity: 1, surcharge: 0, subOptions: [], groups: [] };
    return { id: str(c.optionId || c.option_id || c.id), itemId: str(c.itemId || c.item_id),
      name: str(c.name || c.item_name || c.choice), quantity: qty(c.quantity), surcharge: number(c.surcharge),
      subOptions: list(c.subOptions || c.modifiers).map(s => ({ id: str(s.id), name: str(s.name), price: number(s.price) })),
      groups: groups(c.groups) };
  }
  function choiceText(c) {
    const children = c.groups.flatMap(g => g.choices.map(child => `${g.name ? g.name + ': ' : ''}${choiceText(child)}`));
    return c.name + (c.quantity > 1 ? ` ×${c.quantity}` : '')
      + (c.subOptions.length + children.length ? ` (${c.subOptions.map(s => s.name).concat(children).join('、')})` : '');
  }
  function extra(c) {
    return (c.surcharge + c.subOptions.reduce((n, s) => n + s.price, 0)
      + c.groups.reduce((n, g) => n + g.choices.reduce((s, child) => s + extra(child), 0), 0)) * c.quantity;
  }
  function bundlePortions(raw) {
    const data = parse(raw);
    const portions = Array.isArray(data) ? (data[0]?.groups ? data : [{ groups: data }]) : data?.portions;
    if (!Array.isArray(portions)) return null;
    return portions.map((p, i) => ({ index: Number.isInteger(p?.portionIndex) && p.portionIndex >= 0 ? p.portionIndex : i,
      groups: groups(p?.groups), note: str(p?.note), opaque: [], fingerprint: JSON.stringify(p?.groups) }));
  }
  function price(item) {
    // Null and empty are unknown; zero is an authoritative sale value.
    const known = value => value != null && value !== '' && Number.isFinite(Number(value));
    if (known(item.subtotal)) return { amount: Number(item.subtotal), unit: false };
    const value = item.price ?? item.unit_price ?? item.unitPrice;
    return known(value) ? { amount: Number(value), unit: true } : null;
  }
  function splitPortion(text) {
    const match = text.match(/^(?:第\s*(\d+)\s*份|Phần\s*(\d+))\s*[:：]\s*([\s\S]*)$/i);
    return match ? { index: Number(match[1] || match[2]) - 1, text: match[3] } : { index: null, text };
  }
  function item(raw) {
    const line = raw.detailLine;
    if (line && Array.isArray(line.portions)) return {
      name: str(line.name), quantity: qty(line.quantity), price: price(line), note: str(line.note), common: [],
      portions: line.portions.map((p, i) => ({ index: Number.isInteger(p.portionIndex) ? p.portionIndex : i,
        groups: groups(p.groups), note: str(p.note), opaque: [], fingerprint: JSON.stringify(p.groups) })),
      complete: line.portions.length === qty(line.quantity) && line.portions.every((p, i) => p.portionIndex === i)
    };
    const bundle = bundlePortions(raw.bundleSelections || raw.bundle_snapshot_json);
    const portions = bundle || [];
    const common = [];
    const getPortion = index => {
      let p = portions.find(p => p.index === index);
      if (!p) { p = { index, groups: [], note: '', opaque: [] }; portions.push(p); }
      return p;
    };
    const rawOptions = raw.options ?? raw.selected_options;
    const parsed = parse(rawOptions);
    const options = Array.isArray(parsed) ? parsed : typeof rawOptions === 'string' && rawOptions.trim() ? [rawOptions] : [];
    const representedNotes = new Set();
    for (const o of options) {
      const source = typeof o === 'string' ? o : str(o?.choice || o?.name);
      if (!source) continue;
      const scoped = splitPortion(source);
      const note = scoped.text.match(/^(?:備註|Ghi chú|Note)\s*[:：]\s*([\s\S]*)$/i);
      const text = scoped.text + (number(o?.price) ? ` (+$${number(o.price)})` : '');
      const target = scoped.index !== null && scoped.index >= 0 ? getPortion(scoped.index) : qty(raw.quantity) === 1 ? getPortion(0) : null;
      if (note) {
        representedNotes.add(`${scoped.index ?? ''}:${note[1].normalize('NFC')}`);
        if (target) target.note = [target.note, note[1]].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('\n');
        else common.push(text);
      } else if (target) target.opaque.push(text);
      else common.push(text);
    }
    let itemNote = '';
    for (const entry of str(raw.note || raw.notes).split(/\s*\|\s*(?=(?:第\s*\d+\s*份|Phần\s*\d+)\s*[:：])/i)) {
      if (!entry) continue;
      const scoped = splitPortion(entry);
      const value = scoped.text.replace(/^(?:備註|Ghi chú|Note)\s*[:：]\s*/i, '');
      if (representedNotes.has(`${scoped.index ?? ''}:${value.normalize('NFC')}`)) continue;
      if (scoped.index !== null && scoped.index >= 0) getPortion(scoped.index).note = value;
      else itemNote = entry;
    }
    // Malformed bundle JSON remains visible instead of disappearing.
    const rawBundle = raw.bundleSelections || raw.bundle_snapshot_json;
    if (rawBundle && !bundle) common.push(typeof rawBundle === 'string' ? rawBundle : JSON.stringify(rawBundle));
    portions.sort((a, b) => a.index - b.index);
    return { name: str(raw.name || raw.item_name), quantity: qty(raw.quantity), price: price(raw), note: itemNote,
      common, portions, complete: !!bundle && portions.length === qty(raw.quantity) && portions.every((p, i) => p.index === i && !p.opaque.length) };
  }
  function runs(model) {
    const out = [];
    if (model.portions.every(p => !p.groups.length && !p.note && !p.opaque.length)) return out;
    for (const p of model.portions) {
      const signature = JSON.stringify([p.groups, p.note, p.opaque, p.fingerprint]);
      const previous = out[out.length - 1];
      if (model.complete && previous && previous.end + 1 === p.index && previous.signature === signature) previous.end = p.index;
      else out.push({ ...p, end: p.index, signature });
    }
    return out;
  }
  function title(p, locale) {
    const l = labels(locale);
    return l.portion(p.end === p.index ? p.index + 1 : `${p.index + 1}–${p.end + 1}`)
      + (p.end > p.index ? ` · ${l.same}` : '');
  }
  function rows(p, locale) {
    return p.groups.flatMap(g => g.choices.map(c => ({ label: g.name || labels(locale).group,
      value: choiceText(c), extra: extra(c) })));
  }
  function text(model, locale) {
    const l = labels(locale);
    const amount = model.price;
    const out = [`${model.quantity}${locale === 'vi' ? ' × ' : '份 x '}${model.name}${amount ? ` ${amount.unit ? l.unit + ' ' : ''}$${amount.amount}` : ''}`];
    model.common.forEach(t => out.push(`   ↳ ${t}`));
    for (const p of runs(model)) {
      if (model.quantity > 1) out.push('', `   ↳ ${title(p, locale)}:`);
      const indent = model.quantity > 1 ? '      ' : '   ';
      for (const r of rows(p, locale)) out.push(`${indent}↳ ${r.label}：${r.value}${r.extra ? ` (+$${r.extra})` : ''}`);
      p.opaque.forEach(t => out.push(`${indent}↳ ${t}`));
      if (p.note) out.push(`${indent}↳ ${l.note}: ${p.note}`);
      if (!rows(p, locale).length && !p.opaque.length && !p.note) out.push(`${indent}↳ —`);
    }
    if (model.note) out.push(`   ↳ ${l.note}: ${model.note}`);
    return out.join('\n');
  }
  const flexText = (text, color = '#64748B') => ({ type: 'text', text: text || '—', size: 'xs', color, wrap: true });
  function flex(model, locale) {
    const l = labels(locale);
    const contents = model.common.map(t => flexText(t));
    for (const p of runs(model)) {
      const body = [];
      if (model.quantity > 1) body.push({ ...flexText(title(p, locale)), size: 'sm', margin: 'xs' });
      for (const r of rows(p, locale)) body.push({ type: 'box', layout: 'vertical', spacing: 'xs', contents: [
        { ...flexText(r.label), size: 'xxs' }, flexText(`${r.value}${r.extra ? ` (+$${r.extra})` : ''}`, '#1E293B')
      ] });
      p.opaque.forEach(t => body.push(flexText(t, '#1E293B')));
      if (p.note) body.push(flexText(`${l.note}: ${p.note}`, '#334155'));
      if (!rows(p, locale).length && !p.opaque.length && !p.note) body.push(flexText('—'));
      if (body.length) contents.push({ type: 'box', layout: 'vertical', spacing: 'sm', margin: 'sm',
        backgroundColor: '#F8FAFC', cornerRadius: 'md', paddingAll: '8px', contents: body });
    }
    if (model.note) contents.push({ ...flexText(`${l.note}: ${model.note}`, '#334155'), margin: 'xs' });
    return contents;
  }
  function bytes(value) {
    let size = 0;
    for (const c of JSON.stringify(value)) { const n = c.codePointAt(0); size += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4; }
    return size;
  }
  // Keep the item header and portion heading on continuation blocks. No choice is discarded.
  function splitNode(node) {
    if (node.type === 'text') {
      const chars = Array.from(node.text);
      const out = [];
      for (let i = 0; i < chars.length; i += 1000) out.push({ ...node, text: chars.slice(i, i + 1000).join('') });
      return out.length ? out : [node];
    }
    if (!node.contents || bytes(node) < 7000) return [node];
    if (node.layout !== 'vertical') return splitNode({ type: 'box', layout: 'vertical', spacing: 'xs', contents: node.contents });
    const first = node.contents[0];
    const context = first && (first.layout === 'horizontal' || first.type === 'text') && bytes(first) < 2000 ? [first] : [];
    const children = node.contents.slice(context.length).flatMap(splitNode);
    const out = []; let current = [...context];
    for (const child of children) {
      if (current.length > context.length && bytes({ ...node, contents: [...current, child] }) > 10000) {
        out.push({ ...node, contents: current }); current = [...context];
      }
      current.push(child);
    }
    if (current.length) out.push({ ...node, contents: current });
    return out;
  }
  function paginate(bubble, items) {
    if (bytes(bubble) <= 28000) return bubble;
    const index = bubble.body.contents.findIndex(block => block.contents?.some(child => items.includes(child)));
    // Non-item sections can also contain long historical notes: split those safely as a last resort.
    const all = index < 0 ? bubble.body.contents : items;
    const template = chunk => ({ ...bubble, body: { ...bubble.body, contents: index < 0 ? chunk : bubble.body.contents.map((block, i) =>
      i === index ? { ...block, contents: [...block.contents.filter(child => !items.includes(child)), ...chunk] } : block) } });
    const bubbles = []; let current = [];
    for (const node of all.flatMap(splitNode)) {
      if (current.length && bytes(template([...current, node])) > 26000) { bubbles.push(template(current)); current = []; }
      current.push(node);
    }
    if (current.length) bubbles.push(template(current));
    // A large global note/header is repeated by template; fall back to paging the complete body instead.
    if (bubbles.some(b => bytes(b) > 28000) && index >= 0) return paginate(bubble, []);
    if (bubbles.length > 1) bubbles.forEach((b, i) => b.body.contents.unshift({ type: 'text',
      text: `明細 ${i + 1}/${bubbles.length}`, size: 'xs', color: '#64748B' }));
    const pages = []; let carousel = [];
    for (const b of bubbles) {
      if (carousel.length && (carousel.length === 12 || bytes({ type: 'carousel', contents: [...carousel, b] }) > 48000)) {
        pages.push(carousel.length === 1 ? carousel[0] : { type: 'carousel', contents: carousel }); carousel = [];
      }
      carousel.push(b);
    }
    if (carousel.length) pages.push(carousel.length === 1 ? carousel[0] : { type: 'carousel', contents: carousel });
    return pages.length === 1 ? pages[0] : { type: 'receipt-pages', pages };
  }
  return { item, text, flex, runs, bundlePortions, labels, price, paginate, bytes };
});
