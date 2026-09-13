import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { PREVIEW_DELAY } from '../../src/preview-protocol';
import { IntegrationCase, remainsTrue } from './helpers';

const SCORE = '%TITLE="未保存の日本語タイトル"\n[A]\n| C | Am7 | F | G7 |';

export const previewTests: IntegrationCase[] = [
  {
    name: 'Text measurement cache is bounded across edits and normal settings still recover',
    async run(fixture) {
      const score = '%TITLE="Cache budget"\n[A]\n| C |';
      const document = (await fixture.editor(score)).document;
      await vscode.commands.executeCommand('fumen.openPreview');
      let previous = await fixture.previewState(document, 'rendered');
      await fixture.replace(document, '%PARAM={"text_size":3,"pixel_ratio":2}\n' + score);
      previous = await fixture.previewState(document, 'rendered', previous.revision);
      const lastPages = previous.pages;
      await fixture.replace(document, '%PARAM={"text_size":2,"pixel_ratio":2}\n' + score);
      previous = await fixture.previewState(document, 'error', previous.revision);
      assert.ok(previous.message.includes(fixture.env.t('The text-measurement cache is full. Close and reopen the preview, or reuse earlier text_size and pixel_ratio values.')), previous.message);
      assert.equal(previous.pages, lastPages, 'Cache exhaustion keeps the previous preview');
      await fixture.replace(document, score);
      previous = await fixture.previewState(document, 'rendered', previous.revision);
      await fixture.replace(document, '%PARAM={"text_size":2,"pixel_ratio":2}\n' + score);
      previous = await fixture.previewState(document, 'error', previous.revision);
      const views = vscode.window.tabGroups.all.flatMap(group => group.tabs)
        .filter(tab => tab.input instanceof vscode.TabInputWebview);
      await vscode.window.tabGroups.close(views);
      await vscode.commands.executeCommand('fumen.openPreview');
      previous = await fixture.previewState(document, 'rendered', previous.revision);
      await fixture.replace(document, '%PARAM={"text_size":4,"pixel_ratio":3}\n' + score);
      previous = await fixture.previewState(document, 'error', previous.revision);
      assert.ok(previous.message.includes(fixture.env.t('The text-measurement image would be too large. Reduce %PARAM text_size or pixel_ratio.')), previous.message);
    }
  },
  {
    name: 'Unsaved previews retain the last valid image after errors and recover to the latest edit',
    async run(fixture) {
      const document = (await fixture.editor(SCORE)).document;
      await vscode.commands.executeCommand('fumen.openPreview');
      const first = await fixture.previewState(document, 'rendered');
      assert.equal(first.pages, 1, 'Real Fumen runs inside the CSP-protected webview');
      assert.equal(first.message, fixture.env.t('Pages: {0} · Fumen 1.3.3', 1));
      assert.ok(document.isUntitled && document.isDirty);
      await fixture.replace(document, SCORE + '\n[');
      const error = await fixture.previewState(document, 'error', first.revision);
      assert.equal(error.pages, 1, 'An incomplete edit keeps the last valid image');
      await fixture.replace(document, SCORE.replace('未保存', '最新'));
      const repaired = await fixture.previewState(document, 'rendered', error.revision);
      await fixture.replace(document, '[broken');
      await fixture.replace(document, SCORE);
      const newest = await fixture.previewState(document, 'rendered', repaired.revision);
      assert.equal(newest.pages, 1, 'A rapid repair does not publish stale errors');
      await fixture.replace(document, '');
      assert.equal((await fixture.previewState(document, 'empty', newest.revision)).pages, 0);
    }
  },
  {
    name: 'Hidden previews defer updates, restore the last good image, and never follow another file implicitly',
    async run(fixture) {
      const document = (await fixture.editor(SCORE)).document;
      await vscode.commands.executeCommand('fumen.openPreview');
      const first = await fixture.previewState(document, 'rendered');
      await fixture.replace(document, SCORE + '\n[');
      const invalid = await fixture.previewState(document, 'error', first.revision);
      const cover = fixture.own(await vscode.workspace.openTextDocument({ language: 'plaintext', content: 'Cover the preview tab' }));
      await vscode.window.showTextDocument(cover, vscode.ViewColumn.Two);
      await fixture.replace(document, SCORE + '\n[still unfinished');
      await remainsTrue(() => !fixture.env.preview.status, PREVIEW_DELAY + 200, 'A hidden preview does not render after its debounce window');
      await vscode.commands.executeCommand('fumen.openPreview');
      assert.equal((await fixture.previewState(document, 'error', invalid.revision)).pages, 1, 'Last good image survives a hidden webview');
      const other = (await fixture.editor('[')).document;
      assert.equal(fixture.env.preview.status?.uri, document.uri.toString(), 'Switching editor alone does not retarget the preview');
      await vscode.commands.executeCommand('fumen.openPreview');
      assert.equal((await fixture.previewState(other, 'error')).pages, 0, 'A different file never inherits the previous image');
    }
  },
  {
    name: 'Preview safety limits reject oversized inputs and recover without modifying source',
    async run(fixture) {
      const document = (await fixture.editor(SCORE)).document;
      await vscode.commands.executeCommand('fumen.openPreview');
      let previous = await fixture.previewState(document, 'rendered');
      const cases = [
        { content: '%PARAM={"paper_width":1000000000}\n' + SCORE,
          messages: [fixture.env.t('%PARAM {0} is outside the preview range ({1}–{2}).', 'paper_width', 100, 2000)] },
        { content: SCORE + '\n'.repeat(100_001),
          messages: [fixture.env.t('The preview supports up to 100,000 characters. Split the score into smaller files.')] },
        { content: '%PARAM={"paper_height":0}\n[A]\n' + '| C | Am7 | F | G7 |\n'.repeat(300),
          messages: [fixture.env.t('The score image dimensions are too large. Adjust %PARAM or split the score.'),
            fixture.env.t('The preview images are too large in total. Split the score into smaller files.')] }
      ];
      for (const { content, messages } of cases) {
        await fixture.replace(document, content);
        previous = await fixture.previewState(document, 'error', previous.revision);
        assert.ok(messages.some(message => previous.message.includes(message)), previous.message);
        assert.equal(previous.pages, 1, 'Rejected input preserves the last good image');
        assert.equal(document.getText(), content, 'Limits never rewrite source');
      }
      await fixture.replace(document, SCORE);
      await fixture.previewState(document, 'rendered', previous.revision);
    }
  },
  {
    name: 'Bundled examples render, including multiple pages and HTML-looking title text',
    async run(fixture) {
      const document = (await fixture.editor('%TITLE="複数ページ"\n[A]\n' + '| C | Am7 | F | G7 |\n'.repeat(45))).document;
      await vscode.commands.executeCommand('fumen.openPreview');
      let previous = await fixture.previewState(document, 'rendered');
      assert.ok(previous.pages > 1);
      const examples = [
        '%TITLE="<script>alert(1)</script> 日本語"\n[A]\n| C |',
        readFileSync(path.join(fixture.env.extension.extensionPath, 'examples/notation.fumen'), 'utf8'),
        readFileSync(path.join(fixture.env.extension.extensionPath, 'examples/notation-en.fumen'), 'utf8')
      ];
      for (const filename of ['CHEATSHEET.md', 'CHEATSHEET.ja.md']) {
        const text = readFileSync(path.join(fixture.env.extension.extensionPath, 'docs', filename), 'utf8');
        const fences = [...text.matchAll(/^```fumen\n([\s\S]*?)^```/gm)];
        assert.ok(fences.length > 0, `${filename} includes copyable examples`);
        examples.push(...fences.map(match => match[1]!));
      }
      // Smoke-test our shipped examples, not Fumen's engraving or pixel placement.
      for (const content of examples) {
        await fixture.replace(document, content);
        previous = await fixture.previewState(document, 'rendered', previous.revision);
      }
    }
  },
  {
    name: 'Preview supports non-file document URIs and closes when its source changes language',
    async run(fixture) {
      fixture.disposables.push(vscode.workspace.registerTextDocumentContentProvider('fumen-test', {
        provideTextDocumentContent: () => SCORE
      }));
      const document = fixture.own(await vscode.workspace.openTextDocument(vscode.Uri.parse('fumen-test:/virtual.fumen')));
      assert.equal(document.languageId, 'fumen');
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      await vscode.commands.executeCommand('fumen.openPreview');
      assert.equal((await fixture.previewState(document, 'rendered')).pages, 1);
      fixture.own(await vscode.languages.setTextDocumentLanguage(document, 'plaintext'));
      assert.equal(fixture.env.preview.status, undefined, 'Closing the source disposes the preview state');
    }
  }
];
