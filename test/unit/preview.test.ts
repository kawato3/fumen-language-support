import assert from 'node:assert/strict';
import { test } from 'node:test';
import { previewHtml } from '../../src/preview-html';
import { isPreviewStatus } from '../../src/preview-protocol';
import { CanvasBudget, checkLayout } from '../../src/webview/layout-safety';
import { RenderQueue } from '../../src/webview/render-queue';

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('render queue serializes work, keeps only newest pending input, releases stale output', async () => {
  const first = deferred<string>();
  const rendered: number[] = [], visible: string[] = [], released: string[] = [];
  const queue = new RenderQueue<number, string>({
    render: async n => { rendered.push(n); return n === 1 ? first.promise : String(n); },
    success: (_, result) => { visible.push(result); }, failure: () => assert.fail('Unexpected failure'),
    release: result => { released.push(result); }
  });
  queue.submit(1);
  queue.submit(2);
  queue.submit(3);
  assert.deepEqual(rendered, [1]);
  first.resolve('1');
  await tick();
  assert.deepEqual(rendered, [1, 3]);
  assert.deepEqual(visible, ['3']);
  assert.deepEqual(released, ['1']);
});

test('render failures preserve previous output, and later edits recover', async () => {
  let visible = '', error = '';
  const queue = new RenderQueue<string, string>({
    render: async text => { if (text === '[') throw new Error('unfinished'); return text; },
    success: (_, result) => { visible = result; error = ''; },
    failure: (_, reason) => { error = (reason as Error).message; }, release() {}
  });
  queue.submit('| C |'); await tick();
  queue.submit('['); await tick();
  assert.equal(visible, '| C |');
  assert.equal(error, 'unfinished');
  queue.submit('| G |'); await tick();
  assert.equal(visible, '| G |');
  assert.equal(error, '');
});

test('pending edits and disposal invalidate even an already running render', async () => {
  const first = deferred<string>();
  let released = 0, isCurrent!: () => boolean;
  const queue = new RenderQueue<number, string>({
    render: (_, current) => { isCurrent = current; return first.promise; },
    success: () => assert.fail('Must not publish obsolete results'),
    failure: () => assert.fail('Must not publish obsolete errors'), release: () => { ++released; }
  });
  queue.submit(1);
  assert.ok(isCurrent());
  queue.invalidate();
  assert.ok(!isCurrent());
  queue.submit(2);
  queue.dispose();
  queue.submit(3);
  first.resolve('obsolete');
  await tick();
  assert.equal(released, 1);
});

test('obsolete errors never replace the current status', async () => {
  const first = deferred<string>();
  let visible = '';
  const queue = new RenderQueue<number, string>({
    render: n => n === 1 ? first.promise : Promise.resolve('current'),
    success: (_, result) => { visible = result; },
    failure: () => assert.fail('Stale failure must be ignored'), release() {}
  });
  queue.submit(1); queue.submit(2); first.reject(new Error('stale'));
  await tick(); assert.equal(visible, 'current');
});

test('preview markup contains no source text, allows local assets and embedded symbols only', () => {
  const html = previewHtml({ script: 'https://local.test/main.js?x="<', library: 'https://local.test/fumen.js',
    style: 'https://local.test/style.css', cspSource: 'https://local.test', nonce: 'abcdef' });
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes('img-src data:'));
  assert.ok(html.includes("base-uri 'none'"));
  assert.ok(!html.includes('unsafe-inline'));
  assert.ok(!html.includes('unsafe-eval'));
  assert.ok(!html.includes('connect-src https:'));
  assert.ok(html.includes('main.js?x=&quot;&lt;'));
  assert.ok(html.includes('type="module"'));
  assert.ok(!html.includes('<iframe'));
});

test('preview status messages are checked before use by the extension', () => {
  const good = { type: 'status', uri: 'untitled:1', revision: 1, state: 'rendered', pages: 2, message: '2 ページ' };
  assert.ok(isPreviewStatus(good));
  for (const bad of [null, {}, { ...good, pages: -1 }, { ...good, revision: 1.5 },
    { ...good, state: 'execute' }, { ...good, message: 'a'.repeat(1001) }]) assert.ok(!isPreviewStatus(bad));
});

test('layout guards accept normal and content-height settings but reject excessive allocation', () => {
  checkLayout({ childNodes: [{ name: 'PARAM', value: { paper_width: 800, paper_height: 0, text_size: 1, title_font_size: 24 } }] });
  for (const value of [{ paper_width: 1e9 }, { text_size: 0 }, { title_font_size: 1e6 }, { ncol: -1 }, { nrow: 1.5 }, { paper_width: null }, { paper_height: '1000' }]) {
    assert.throws(() => checkLayout({ childNodes: [{ name: 'PARAM', value }] }), /outside the preview range/);
  }
});

test('canvas pixel budget checks before allocation and releases previous reservations', () => {
  const budget = new CanvasBudget(1000), first = {}, second = {};
  budget.resize(first, 20, 20);
  budget.resize(second, 20, 30);
  assert.throws(() => budget.resize(second, 20, 31), /too large in total/);
  budget.resize(first, 0, 20);
  budget.resize(second, 20, 50);
  assert.throws(() => budget.resize(first, 1, 16385), /image dimensions/);
  assert.throws(() => budget.resize(first, Infinity, 1), /image dimensions/);
  assert.throws(() => budget.resize(first, -1, 1), /image dimensions/);
});
