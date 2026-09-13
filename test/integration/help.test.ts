import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { helpFile } from '../../src/localization';
import { IntegrationCase, waitFor } from './helpers';

export const helpTests: IntegrationCase[] = [
  {
    name: 'Localized cheat sheet opens beside source, reuses its tab and stays resource-bound',
    async run(fixture) {
      const content = '[A]\n| C |';
      const source = await fixture.editor(content);
      const helpUri = vscode.Uri.joinPath(fixture.env.extension.extensionUri, 'docs', helpFile('CHEATSHEET', vscode.env.language));
      const tabs = () => vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
        tab.input instanceof vscode.TabInputCustom && tab.input.uri.toString() === helpUri.toString());
      await vscode.commands.executeCommand('fumen.openCheatSheet');
      await waitFor(() => tabs().length === 1, 'Bundled cheat sheet tab');
      const group = vscode.window.tabGroups.all.find(item => item.tabs.includes(tabs()[0]!));
      assert.notEqual(group?.viewColumn, source.viewColumn, 'Help opens beside the source');
      assert.ok(vscode.window.visibleTextEditors.some(editor => editor.document === source.document));
      assert.equal(source.document.getText(), content, 'Opening help never edits the score');
      await vscode.commands.executeCommand('fumen.openCheatSheet');
      assert.equal(tabs().length, 1, 'Repeated commands reuse the same tab');
      await fixture.editor('# Another Markdown document', 'markdown');
      assert.equal(tabs().length, 1, 'Help does not follow another Markdown document');
    }
  },
  {
    name: 'User guide follows the VS Code display language',
    async run() {
      await vscode.commands.executeCommand('fumen.openGuide');
      await waitFor(() => vscode.window.tabGroups.all.some(group => group.tabs.some(tab =>
        tab.label.includes(helpFile('QUICKSTART', vscode.env.language)))), 'Localized user guide');
    }
  }
];
