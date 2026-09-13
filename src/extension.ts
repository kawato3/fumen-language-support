import * as vscode from 'vscode';
import { NEW_SCORE, TEMPLATES } from './catalog';
import { complete, diagnose, hover } from './language';
import { PreviewManager } from './preview';
import { helpFile } from './localization';

const MAX_DOCUMENT_LENGTH = 500_000;

export function activate(context: vscode.ExtensionContext): { preview: PreviewManager } | undefined {
  const t = vscode.l10n.t;
  const preview = new PreviewManager(context);
  context.subscriptions.push(preview);
  const selector: vscode.DocumentSelector = { language: 'fumen' };
  const diagnostics = vscode.languages.createDiagnosticCollection('fumen');
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const range = (document: vscode.TextDocument, start: number, end: number): vscode.Range =>
    new vscode.Range(document.positionAt(start), document.positionAt(end));

  const validate = (document: vscode.TextDocument): void => {
    const key = document.uri.toString();
    clearTimeout(timers.get(key));
    timers.delete(key);
    const config = vscode.workspace.getConfiguration('fumen', document.uri);
    if (document.isClosed || document.languageId !== 'fumen' || !config.get<boolean>('diagnostics.enabled', true)) {
      diagnostics.delete(document.uri);
      return;
    }
    const text = document.getText();
    if (text.length > MAX_DOCUMENT_LENGTH) {
      const note = new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), t("Basic checks are skipped for large files (limit: 500,000 characters). Highlighting and snippets are still available."), vscode.DiagnosticSeverity.Information);
      note.source = 'Fumen';
      diagnostics.set(document.uri, [note]);
      return;
    }
    diagnostics.set(document.uri, diagnose(text, t).map(issue => {
      const diagnostic = new vscode.Diagnostic(range(document, issue.start, issue.end), issue.message, vscode.DiagnosticSeverity.Error);
      diagnostic.source = 'Fumen';
      diagnostic.code = issue.code;
      return diagnostic;
    }));
  };

  const schedule = (document: vscode.TextDocument): void => {
    if (document.languageId !== 'fumen') return;
    const key = document.uri.toString();
    clearTimeout(timers.get(key));
    const delay = vscode.workspace.getConfiguration('fumen', document.uri).get<number>('diagnostics.delay', 700);
    timers.set(key, setTimeout(() => validate(document), Math.max(200, Math.min(5000, delay))));
  };

  context.subscriptions.push(
    diagnostics,
    { dispose: () => { for (const timer of timers.values()) clearTimeout(timer); timers.clear(); } },
    vscode.languages.registerCompletionItemProvider(selector, {
      provideCompletionItems(document, position) {
        const text = document.getText();
        if (text.length > MAX_DOCUMENT_LENGTH) return [];
        return complete(text, document.offsetAt(position)).map((suggestion, index) => {
          const item = new vscode.CompletionItem(suggestion.label, vscode.CompletionItemKind.Value);
          item.detail = t(suggestion.detail);
          item.documentation = new vscode.MarkdownString().appendText(t(suggestion.detail));
          item.range = range(document, suggestion.start, suggestion.end);
          item.insertText = suggestion.snippet ? new vscode.SnippetString(suggestion.insertText) : suggestion.insertText;
          item.filterText = suggestion.filterText;
          item.sortText = index.toString().padStart(3, '0');
          return item;
        });
      }
    }, '%', '=', '<', ':', '"'),
    vscode.languages.registerHoverProvider(selector, {
      provideHover(document, position) {
        const text = document.getText();
        if (text.length > MAX_DOCUMENT_LENGTH) return undefined;
        const info = hover(text, document.offsetAt(position));
        if (!info) return undefined;
        const markdown = new vscode.MarkdownString();
        markdown.appendText(t(info.title)).appendMarkdown('\n\n').appendText(t(info.description));
        if (info.example) markdown.appendCodeblock(info.example, 'fumen');
        markdown.appendMarkdown(`\n\n[${t('Fumen notation')}](https://hbjpn.github.io/fumen/${info.page}/)`);
        return new vscode.Hover(markdown, range(document, info.start, info.end));
      }
    }),
    vscode.workspace.onDidOpenTextDocument(validate),
    vscode.workspace.onDidChangeTextDocument(event => schedule(event.document)),
    vscode.workspace.onDidSaveTextDocument(validate),
    vscode.workspace.onDidCloseTextDocument(document => {
      const key = document.uri.toString();
      clearTimeout(timers.get(key));
      timers.delete(key);
      diagnostics.delete(document.uri);
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('fumen')) vscode.workspace.textDocuments.forEach(validate);
    }),
    vscode.commands.registerCommand('fumen.newScore', async () => {
      const document = await vscode.workspace.openTextDocument({ language: 'fumen' });
      const editor = await vscode.window.showTextDocument(document);
      await editor.insertSnippet(new vscode.SnippetString(NEW_SCORE));
    }),
    vscode.commands.registerCommand('fumen.insertTemplate', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.languageId !== 'fumen') return;
      const templates = TEMPLATES.map(template => ({ ...template, label: t(template.label), description: t(template.description) }));
      const template = await vscode.window.showQuickPick(templates, { placeHolder: t("Choose a template to insert") });
      if (template && !editor.document.isClosed) {
        const target = await vscode.window.showTextDocument(editor.document, editor.viewColumn);
        await target.insertSnippet(new vscode.SnippetString(template.body));
      }
    }),
    vscode.commands.registerCommand('fumen.openGuide', async () => {
      await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.joinPath(context.extensionUri, 'docs', helpFile('QUICKSTART', vscode.env.language)));
    }),
    vscode.commands.registerCommand('fumen.openCheatSheet', async () => {
      try {
        const uri = vscode.Uri.joinPath(context.extensionUri, 'docs', helpFile('CHEATSHEET', vscode.env.language));
        const viewType = 'vscode.markdown.preview.editor';
        // Use VS Code's resource-bound Markdown viewer. Reuse its actual column even when
        // the command is invoked from the help tab itself or after the user moves it.
        const existing = vscode.window.tabGroups.all.find(group => group.tabs.some(tab =>
          tab.input instanceof vscode.TabInputCustom && tab.input.viewType === viewType
          && tab.input.uri.toString() === uri.toString()));
        await vscode.commands.executeCommand('vscode.openWith', uri, viewType,
          { viewColumn: existing?.viewColumn ?? vscode.ViewColumn.Beside, preview: false });
      } catch {
        const action = await vscode.window.showWarningMessage(
          t("Could not open the cheat sheet. Check that VS Code's built-in Markdown support is enabled."), t("Open Official Website"));
        if (action) await vscode.env.openExternal(vscode.Uri.parse('https://hbjpn.github.io/fumen/cheatsheet/'));
      }
    })
  );
  vscode.workspace.textDocuments.forEach(validate);
  // Test builds can observe actual webview render completion without a production debug command.
  return context.extensionMode === vscode.ExtensionMode.Test ? { preview } : undefined;
}
