import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import type { Translator } from '../../src/localization';
import type { PreviewManager } from '../../src/preview';
import type { PreviewStatus } from '../../src/preview-protocol';

export interface TestEnvironment {
  extension: vscode.Extension<unknown>;
  preview: PreviewManager;
  globalStorageUri: vscode.Uri;
  t: Translator;
  japanese: boolean;
}

export interface IntegrationCase {
  name: string;
  run(fixture: Fixture): Promise<void>;
}

export async function waitFor(predicate: () => boolean, description: string | (() => string)): Promise<void> {
  const until = Date.now() + 20_000;
  while (!predicate()) {
    if (Date.now() >= until) throw new Error(`Timed out: ${typeof description === 'string' ? description : description()}`);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

// Negative asynchronous contracts need an observation window, not a one-time assertion.
export async function remainsTrue(predicate: () => boolean, milliseconds: number, description: string): Promise<void> {
  const until = Date.now() + milliseconds;
  do {
    assert.ok(predicate(), description);
    await new Promise(resolve => setTimeout(resolve, 25));
  } while (Date.now() < until);
  assert.ok(predicate(), description);
}

/** Only documents/resources created by the current case are discarded. */
export class Fixture {
  private readonly documents = new Set<vscode.TextDocument>();
  readonly disposables: vscode.Disposable[] = [];

  constructor(readonly env: TestEnvironment) {}

  own(document: vscode.TextDocument): vscode.TextDocument {
    this.documents.add(document);
    return document;
  }

  async editor(content: string, language = 'fumen'): Promise<vscode.TextEditor> {
    const document = this.own(await vscode.workspace.openTextDocument({ language, content }));
    return vscode.window.showTextDocument(document, vscode.ViewColumn.One);
  }

  async replace(document: vscode.TextDocument, content: string): Promise<void> {
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    const wholeDocument = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    assert.ok(await editor.edit(builder => builder.replace(wholeDocument, content)), 'Source edit applied');
  }

  async previewState(document: vscode.TextDocument, state: PreviewStatus['state'], afterRevision = -1): Promise<PreviewStatus> {
    const preview = this.env.preview;
    await waitFor(() => preview.status?.uri === document.uri.toString()
      && preview.status.state === state && preview.status.revision > afterRevision,
    () => `preview ${state} for ${document.uri}; current: ${JSON.stringify(preview.status)}`);
    return preview.status!;
  }

  async dispose(): Promise<void> {
    try {
      await vscode.commands.executeCommand('leaveSnippet');
      // This test host has an isolated, empty profile. These views belong to its test cases.
      const views = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
        tab.input instanceof vscode.TabInputWebview || tab.input instanceof vscode.TabInputCustom);
      await vscode.window.tabGroups.close(views);
      for (const document of this.documents) {
        if (document.isClosed) continue;
        await vscode.window.showTextDocument(document);
        await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
      }
    } finally {
      for (const disposable of this.disposables) disposable.dispose();
    }
  }
}

export async function suggestions(document: vscode.TextDocument, offset: number): Promise<vscode.CompletionList | undefined> {
  return vscode.commands.executeCommand('vscode.executeCompletionItemProvider', document.uri, document.positionAt(offset));
}
