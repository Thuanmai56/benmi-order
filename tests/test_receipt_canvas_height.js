const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const canvases = [];
const document = {
  createElement() {
    const canvas = { width: 0, height: 0, text: [], toDataURL: () => 'data:image/png;base64,test' };
    const context = new Proxy({}, { get(_, key) {
      if (key === 'fillText') return (text, x, y) => {
        assert(y + 34 <= canvas.height, `Text clipped: ${text}`);
        canvas.text.push(text);
      };
      if (key === 'drawImage') return (source, x, y, w, h) => assert(h <= source.height);
      return () => {};
    }});
    canvas.getContext = () => context;
    canvases.push(canvas);
    return canvas;
  }
};
const window = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/printer-service.js'), 'utf8'), {
  window, document, console, URLSearchParams,
  localStorage: { getItem: () => null }
});
for (const width of [58, 80]) for (const kitchen of [false, true]) {
  for (const count of [3, 100]) {
    canvases.length = 0;
    window.PrinterService.drawReceiptToCanvas({ key: 'TEST', content: Array.from({ length: count }, (_, i) => `Item ${i}`).join('\n'), note: 'Note', total: 100 }, kitchen, width);
    assert(canvases[0].text.includes(`Item ${count - 1}`));
    if (!kitchen) assert(canvases[0].text.includes('謝謝光臨，祝您用餐愉快！'));
    assert(canvases[1].height <= canvases[0].height);
  }
}
console.log('Receipt canvas: short/long cashier and kitchen bills fit at 58/80 mm.');
