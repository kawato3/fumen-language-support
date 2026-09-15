import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { PreviewManager } from '../../src/preview';
import { createTranslator } from '../../src/localization';
import { editingTests } from './editing.test';
import { formattingTests } from './formatting.test';
import { helpTests } from './help.test';
import { Fixture, TestEnvironment } from './helpers';
import { previewTests } from './preview.test';
import { printingTests } from './printing.test';

export async function run(): Promise<void> {
  const manifest = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8')) as { publisher: string; name: string };
  const extension = vscode.extensions.getExtension(`${manifest.publisher}.${manifest.name}`);
  assert.ok(extension, 'Extension is discoverable');
  const api = await extension.activate() as { preview: PreviewManager; globalStorageUri: vscode.Uri };
  assert.ok(extension.isActive);
  assert.equal(vscode.env.language, process.env.FUMEN_TEST_LOCALE || 'en', 'Actual VS Code display language');
  if (process.env.FUMEN_VSCODE_VERSION && /^\d+\.\d+\.\d+$/.test(process.env.FUMEN_VSCODE_VERSION)) {
    assert.equal(vscode.version, process.env.FUMEN_VSCODE_VERSION, 'Requested runtime version (check for an auto-updated test cache)');
  }
  if (process.env.FUMEN_TEST_RESTRICTED) assert.equal(vscode.workspace.isTrusted, false, 'Restricted mode is actually active');
  const japanese = /^ja(?:-|$)/i.test(vscode.env.language);
  const environment: TestEnvironment = {
    extension, preview: api.preview, globalStorageUri: api.globalStorageUri, japanese,
    t: createTranslator(japanese ? JSON.parse(readFileSync(path.join(extension.extensionPath, 'resources/l10n/bundle.l10n.ja.json'), 'utf8')) : {})
  };
  // Manifest and runtime translations are separate VS Code mechanisms.
  const title = extension.packageJSON.contributes.commands.find((command: { command: string }) => command.command === 'fumen.openCheatSheet').title;
  assert.equal(typeof title === 'string' ? title : title.value, japanese ? 'チートシートを開く' : 'Open Cheat Sheet');
  console.log(`VS Code ${vscode.version}; language ${vscode.env.language}; trusted ${vscode.workspace.isTrusted}; storage ${api.globalStorageUri.scheme}`);

  const failures: Error[] = [];
  const cases = [...editingTests, ...formattingTests, ...previewTests, ...printingTests, ...helpTests]
    .filter(test => test.name.includes(process.env.FUMEN_TEST_FILTER || ''));
  assert.ok(cases.length, 'The test filter must select at least one case');
  // The official test-electron runner accepts an async run function. Named cases
  // keep this small suite dependency-free, isolated and useful when one case fails.
  for (const test of cases) {
    const fixture = new Fixture(environment);
    try {
      await test.run(fixture);
      console.log(`PASS: ${test.name}`);
    } catch (cause) {
      const error = new Error(test.name, { cause });
      failures.push(error);
      console.error(`FAIL: ${test.name}`, cause);
    } finally {
      // Stop if isolation cannot be restored; subsequent results would not be reliable.
      await fixture.dispose();
    }
  }
  if (failures.length) throw new AggregateError(failures, `${failures.length}/${cases.length} integration cases failed`);
  console.log(`Integration checks passed: ${cases.length} independent cases.`);
}
