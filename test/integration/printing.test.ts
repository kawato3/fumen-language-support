import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import * as vscode from 'vscode';
import type { PrintManager } from '../../src/printing';
import { IntegrationCase } from './helpers';

export const printingTests: IntegrationCase[] = [{
  name: 'Printing snapshots the requested unsaved document with bundled assets and cleans up on close',
  async run(fixture) {
    const {extension, japanese} = fixture.env;
    // Load the actual extension under test, including when running against an extracted VSIX.
    const Manager = (require(join(extension.extensionPath, 'out/printing.js')) as {PrintManager: typeof PrintManager}).PrintManager;
    // Preserve the scheme and provider of VS Code's real storage, including vscode-userdata.
    const storage = vscode.Uri.joinPath(fixture.env.globalStorageUri, `test-${randomUUID()}`);
    await vscode.workspace.fs.createDirectory(storage);
    const root = storage.fsPath;
    let filename = '';
    const manager = new Manager({extension, extensionUri: extension.extensionUri, globalStorageUri: storage}, {
      findChrome: async () => '/test/chrome',
      launchChrome: async (executable, file) => { assert.equal(executable, '/test/chrome'); filename = file; }
    });
    try {
      assert.ok((await vscode.commands.getCommands()).includes('fumen.openPrint'));
      const editor = await fixture.editor('[A]\n| C |');
      const source = '%TITLE="Unsaved 青い空 </script>"\n[A]\n| C |';
      await fixture.replace(editor.document, source);
      assert.ok(editor.document.isDirty);
      await fixture.editor('[Other]\n| G |');
      await manager.open(editor.document);
      assert.ok(filename.startsWith(join(root, 'print')));
      const html = await fs.readFile(filename, 'utf8');
      const data = JSON.parse(/<script id="input"[^>]*>(.*?)<\/script>/s.exec(html)![1]!);
      assert.equal(data.text, source, 'The preview source wins over whichever editor happens to be active');
      assert.equal(editor.document.getText(), source);
      assert.ok(html.includes(japanese ? '印刷 / PDF に保存' : 'Print / Save as PDF'));
      for (const name of ['FUMEN-LICENSE.txt', 'OFL.txt', 'BABEL-LICENSE.txt', 'CORE-JS-LICENSE.txt', 'REGENERATOR-LICENSE.txt', 'WEBPACK-LICENSE.txt']) {
        assert.ok(html.includes(name), `Generated snapshots retain ${name}`);
      }
      assert.equal((html.match(/src="data:text\/javascript;base64,/g) || []).length, 2);
      await manager.close();
      await assert.rejects(fs.stat(filename), {code: 'ENOENT'});
      await manager.open(editor.document);
      await assert.rejects(fs.stat(filename), {code: 'ENOENT'}, 'A closed manager cannot create another snapshot');
    } finally { await manager.close(); await vscode.workspace.fs.delete(storage, {recursive: true}); }
  }
}, {
  name: 'Printing rejects empty or oversized input and discards a snapshot changed during preparation',
  async run(fixture) {
    const {extension} = fixture.env;
    const Manager = (require(join(extension.extensionPath, 'out/printing.js')) as {PrintManager: typeof PrintManager}).PrintManager;
    const storage = vscode.Uri.joinPath(fixture.env.globalStorageUri, `test-${randomUUID()}`);
    await vscode.workspace.fs.createDirectory(storage);
    const root = storage.fsPath;
    let searches = 0, launches = 0;
    let browserFound!: (value: string) => void;
    const manager = new Manager({extension, extensionUri: extension.extensionUri, globalStorageUri: storage}, {
      findChrome: () => { ++searches; return new Promise(resolve => { browserFound = resolve; }); },
      launchChrome: async () => { ++launches; }
    });
    try {
      for (const [text, language] of [['| C |', 'plaintext'], ['', 'fumen'], ['x'.repeat(100_001), 'fumen']]) {
        await manager.open((await fixture.editor(text!, language!)).document);
      }
      assert.equal(searches, 0, 'Invalid input must not reach external browser preparation');
      const document = (await fixture.editor('[A]\n| C |')).document;
      const pending = manager.open(document);
      assert.equal(searches, 1);
      await manager.open(document);
      assert.equal(searches, 1, 'Repeated clicks while preparing must not open duplicate tabs');
      await fixture.replace(document, '[A]\n| D |');
      browserFound('/test/chrome');
      await pending;
      assert.equal(launches, 0, 'Changed input must not be handed off as if it were current');
      assert.deepEqual(await fs.readdir(join(root, 'print')), []);
    } finally { browserFound?.('/test/chrome'); await manager.close(); await vscode.workspace.fs.delete(storage, {recursive: true}); }
  }
}];
