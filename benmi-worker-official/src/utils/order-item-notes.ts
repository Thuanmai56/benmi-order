// Notes also exist as legacy option entries. Compare within a portion only;
// identical instructions on two different portions must remain independent.
export function itemNoteKey(value: string, labeledOnly = false): string | null {
  let text = String(value || '').trim();
  const portion = text.match(/^(第\s*[\d一二三四五六七八九十]+\s*份|Phần\s*\d+)\s*[:：]\s*/i);
  if (portion) text = text.slice(portion[0].length);
  const label = text.match(/^(?:備註|Ghi chú|Note)\s*[:：]\s*/i);
  if (labeledOnly && !label) return null;
  if (label) text = text.slice(label[0].length);
  const portionId = portion ? (portion[1].match(/\d+/)?.[0] || portion[1].replace(/\s/g, '')) : '';
  return `${portionId}:${text.trim().normalize('NFC')}`;
}

export function remainingItemNote(rawOptions: unknown, note: string | null | undefined): string {
  let options = rawOptions;
  if (typeof options === 'string') {
    const text = options;
    try { options = JSON.parse(text); } catch { options = text.split('\n'); }
  }
  const represented = new Set((Array.isArray(options) ? options : []).map(option =>
    itemNoteKey(typeof option === 'string' ? option : option?.choice || option?.name || '', true)
  ).filter(key => key !== null));
  return String(note || '').trim()
    .split(/\s*\|\s*(?=(?:第\s*[\d一二三四五六七八九十]+\s*份|Phần\s*\d+)\s*[:：])/i)
    .filter(entry => {
      const key = itemNoteKey(entry);
      return entry && key !== null && !represented.has(key);
    })
    .join(' | ');
}
