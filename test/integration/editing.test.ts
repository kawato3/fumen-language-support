import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { IntegrationCase, remainsTrue, suggestions, waitFor } from './helpers';

export const editingTests: IntegrationCase[] = [
  {
    name: 'Setting completions insert placeholders and replace values without duplicate quotes',
    async run(fixture) {
      const title = await fixture.editor('%TI');
      const items = await suggestions(title.document, 3);
      const completion = items?.items.find(item => item.label === 'TITLE');
      assert.ok(completion);
      assert.equal(completion.detail, fixture.env.t('Song title. Enclose it in double quotes.'));
      assert.ok(completion.insertText instanceof vscode.SnippetString);
      assert.ok(completion.range instanceof vscode.Range);
      assert.ok(await title.insertSnippet(completion.insertText, completion.range));
      assert.equal(title.document.getText(), '%TITLE=""');
      assert.equal(title.selection.active.character, 8, 'Caret inside quotes');
      await vscode.commands.executeCommand('leaveSnippet');

      const values = await fixture.editor('%SHOW_STAFF="Y"');
      const candidates = await suggestions(values.document, 14);
      const yes = candidates?.items.find(item => item.label === '"YES"');
      assert.ok(yes);
      const range = yes.range, insertText = yes.insertText;
      assert.ok(range instanceof vscode.Range);
      assert.equal(typeof insertText, 'string');
      assert.ok(await values.edit(builder => builder.replace(range, insertText as string)));
      assert.equal(values.document.getText(), '%SHOW_STAFF="YES"');
    }
  },
  {
    name: 'Accepting a partial navigation sign preserves later measures and annotations',
    async run(fixture) {
      const editor = await fixture.editor('| <D C | <Fine> |');
      const items = await suggestions(editor.document, 4);
      const item = items?.items.find(candidate => candidate.label === '<D.S.>');
      assert.ok(item);
      const range = item.range, insertText = item.insertText;
      assert.ok(range instanceof vscode.Range);
      assert.equal(typeof insertText, 'string');
      assert.ok(await editor.edit(builder => builder.replace(range, insertText as string)));
      assert.equal(editor.document.getText(), '| <D.S.> C | <Fine> |');
    }
  },
  {
    name: 'Fumen defaults do not suggest chord names from the document',
    async run(fixture) {
      const editor = await fixture.editor('| Cmaj7 | C');
      assert.equal(vscode.workspace.getConfiguration('editor', editor.document).get('wordBasedSuggestions'), 'off');
      const candidates = await suggestions(editor.document, editor.document.getText().length);
      assert.ok(!candidates?.items.some(item => /^(Cmaj7|Cm7|CM7|C7)$/.test(typeof item.label === 'string' ? item.label : item.label.label)));
    }
  },
  {
    name: 'Diagnostics recover after edits, respect configuration, and clear on language change',
    async run(fixture) {
      const editor = await fixture.editor('%SHOW_STAFF="yes"');
      const document = editor.document;
      const diagnostics = () => vscode.languages.getDiagnostics(document.uri);
      await waitFor(() => diagnostics().some(item => item.code === 'variable-value'), 'Invalid setting diagnostic');
      assert.equal(diagnostics()[0]?.message,
        fixture.env.t('%{0} must be one of: {1}.', 'SHOW_STAFF', '"YES", "NO", "AUTO"'));
      await fixture.replace(document, '%SHOW_STAFF="YES"');
      await waitFor(() => diagnostics().length === 0, 'Diagnostic clears after repair');
      const hover = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', document.uri, new vscode.Position(0, 4));
      assert.ok(hover?.some(item => item.contents.some(content => typeof content === 'object' && 'value' in content
        && content.value.includes(fixture.env.japanese ? '五線' : 'Staff'))), JSON.stringify(hover));

      const config = vscode.workspace.getConfiguration('fumen', document.uri);
      const previous = config.inspect<boolean>('diagnostics.enabled')?.globalValue;
      try {
        await config.update('diagnostics.enabled', false, vscode.ConfigurationTarget.Global);
        await fixture.replace(document, '%TITLE=123');
        const delay = config.get<number>('diagnostics.delay', 700);
        await remainsTrue(() => diagnostics().length === 0, delay + 200, 'Disabled diagnostics stay empty after the debounce window');
        await config.update('diagnostics.enabled', true, vscode.ConfigurationTarget.Global);
        await waitFor(() => diagnostics().some(item => item.code === 'variable-type'), 'Configuration re-enables diagnostics');
        fixture.own(await vscode.languages.setTextDocumentLanguage(document, 'plaintext'));
        await waitFor(() => diagnostics().length === 0, 'Language change clears diagnostics');
      } finally {
        await config.update('diagnostics.enabled', previous, vscode.ConfigurationTarget.Global);
      }
    }
  },
  {
    name: 'Bracket pairing and new-score placeholders use VS Code editing behavior',
    async run(fixture) {
      const bracket = await fixture.editor('');
      await vscode.commands.executeCommand('type', { text: '[' });
      assert.equal(bracket.document.getText(), '[]');
      await vscode.commands.executeCommand('type', { text: 'A' });
      await vscode.commands.executeCommand('type', { text: ']' });
      assert.equal(bracket.document.getText(), '[A]', 'Existing closing bracket is skipped');

      await vscode.commands.executeCommand('fumen.newScore');
      const editor = vscode.window.activeTextEditor;
      assert.ok(editor);
      fixture.own(editor.document);
      assert.equal(editor.document.languageId, 'fumen');
      assert.ok(editor.document.isUntitled);
      assert.ok(editor.document.getText().includes('%TITLE="Song title"'));
      assert.equal(editor.document.getText(editor.selection), 'Song title');
      await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
      assert.equal(editor.document.getText(editor.selection), 'Artist');
    }
  }
];
