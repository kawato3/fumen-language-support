import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { IntegrationCase, waitFor } from './helpers';

const options: vscode.FormattingOptions = { tabSize: 4, insertSpaces: true };
const editsFor = (document: vscode.TextDocument) =>
  vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', document.uri, options);

export const formattingTests: IntegrationCase[] = [
  {
    name: 'Standard Format Document changes only whitespace and supports one-step undo',
    async run(fixture) {
      const source = '%TITLE = "🎵  Song"\r\n\r\n\r\n\r\n[A]\r\n|Cmaj7  Dm7|G7||.  ';
      const expected = '%TITLE="🎵  Song"\r\n\r\n[A]\r\n| Cmaj7 Dm7 | G7 ||.';
      const editor = await fixture.editor(source);
      const document = editor.document;
      assert.equal(document.eol, vscode.EndOfLine.CRLF);
      const edits = await editsFor(document);
      assert.ok(edits && edits.length > 0, 'Provider is registered for Fumen');
      assert.equal(document.getText(), source, 'Requesting edits does not apply them');
      for (const edit of edits) {
        assert.match(document.getText(edit.range), /^[ \t\r\n]*$/);
        if (edit.range.start.line !== edit.range.end.line) assert.equal(edit.newText, '', 'Only redundant blank lines are deleted');
      }

      // Wait for the UI to acknowledge the selection. A late cursor change can
      // cancel VS Code's formatting operation, just like a real user moving it.
      let selectionApplied = false;
      const listener = vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor === editor && event.selections[0]?.active.isEqual(new vscode.Position(5, 5))) selectionApplied = true;
      });
      fixture.disposables.push(listener);
      editor.selection = new vscode.Selection(5, 5, 5, 5);
      await waitFor(() => selectionApplied, 'Selection acknowledged by the editor');
      listener.dispose();
      await vscode.commands.executeCommand('editor.action.formatDocument');
      assert.equal(document.getText(), expected);
      assert.equal(editor.selection.active.line, 3);
      assert.equal(document.eol, vscode.EndOfLine.CRLF);
      assert.equal((await editsFor(document))?.length ?? 0, 0, 'A second format is a no-op');
      await vscode.commands.executeCommand('undo');
      assert.equal(document.getText(), source, 'The entire format is undone in one step');
    }
  },
  {
    name: 'Standard Format Document orders settings within each run and supports one-step undo',
    async run(fixture) {
      const source = '% PARAM = {"minor_label":"m","paper_width":800}\r\n% TITLE = "🎵  Song"\r\n\r\n[A]\r\n|C|\r\n%SHOW_STAFF="YES"\r\n%TRANSPOSE=2\r\n|D|';
      const expected = '%TITLE="🎵  Song"\r\n%PARAM={"paper_width":800,"minor_label":"m"}\r\n\r\n[A]\r\n| C |\r\n%TRANSPOSE=2\r\n%SHOW_STAFF="YES"\r\n| D |';
      const editor = await fixture.editor(source);
      const document = editor.document;
      await vscode.commands.executeCommand('editor.action.formatDocument');
      assert.equal(document.getText(), expected);
      assert.equal(document.eol, vscode.EndOfLine.CRLF);
      assert.equal((await editsFor(document))?.length ?? 0, 0, 'A second format is a no-op');
      await vscode.commands.executeCommand('undo');
      assert.equal(document.getText(), source, 'Sorting and whitespace changes undo together');
    }
  },
  {
    name: 'Formatting is scoped to Fumen and does not enable automatic formatting',
    async run(fixture) {
      const plain = await fixture.editor('|C  D|', 'plaintext');
      assert.equal((await editsFor(plain.document))?.length ?? 0, 0);
      const score = await fixture.editor('|C  D|');
      const config = vscode.workspace.getConfiguration('editor', score.document);
      assert.equal(config.get('formatOnSave'), false);
      assert.equal(config.get('formatOnType'), false);
      assert.equal(config.get('formatOnPaste'), false);
      await fixture.replace(score.document, '|E  F|');
      assert.equal(score.document.getText(), '|E  F|', 'Ordinary edits are not reformatted');
      await fixture.replace(score.document, ' '.repeat(500_001));
      assert.equal((await editsFor(score.document))?.length ?? 0, 0, 'Large documents are not partially formatted');
    }
  }
];
