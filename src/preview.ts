import { randomBytes } from 'node:crypto';
import { posix } from 'node:path';
import * as vscode from 'vscode';
import { isPreviewStatus, MAX_PREVIEW_LENGTH, PREVIEW_DELAY, PreviewStatus } from './preview-protocol';
import { previewHtml } from './preview-html';

export class PreviewManager implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private document?: vscode.TextDocument;
  private timer?: ReturnType<typeof setTimeout>;
  private revision = 0;
  private ready = false;
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly statusChanged = new vscode.EventEmitter<PreviewStatus>();
  readonly onDidChangeStatus = this.statusChanged.event;
  status?: PreviewStatus;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.subscriptions.push(
      vscode.commands.registerCommand('fumen.openPreview', () => this.open()),
      vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document !== this.document || !event.contentChanges.length) return;
        this.invalidate();
        if (this.panel?.visible) this.timer = setTimeout(() => this.send(), PREVIEW_DELAY);
      }),
      vscode.workspace.onDidSaveTextDocument(document => {
        if (document === this.document) this.send();
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        // Closing/discarding or changing the language must not leave a live preview of a stale buffer.
        if (document === this.document) this.panel?.dispose();
      })
    );
  }

  open(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'fumen') {
      if (this.panel) this.panel.reveal(undefined, true);
      else void vscode.window.showInformationMessage(vscode.l10n.t("Open a Fumen file before opening the preview."));
      return;
    }
    const changed = this.document !== editor.document;
    this.document = editor.document;
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel('fumen.preview', '',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
        });
      const panel = this.panel;
      const disposables: vscode.Disposable[] = [];
      disposables.push(panel.webview.onDidReceiveMessage((message: unknown) => {
        if (!message || typeof message !== 'object') return;
        const type = (message as { type?: unknown }).type;
        if (type === 'ready') { this.ready = true; this.send(); }
        else if (type === 'refresh') this.reload();
        else if (isPreviewStatus(message) && message.uri === this.document?.uri.toString() && message.revision === this.revision) {
          this.status = message;
          this.statusChanged.fire(message);
        }
      }), panel.onDidChangeViewState(() => {
        clearTimeout(this.timer);
        if (panel.visible) this.send();
      }), panel.onDidDispose(() => {
        clearTimeout(this.timer);
        this.panel = undefined;
        this.document = undefined;
        this.status = undefined;
        this.ready = false;
        for (const disposable of disposables) disposable.dispose();
      }));
      this.reload();
    } else {
      this.panel.reveal(this.panel.viewColumn, true);
    }
    this.panel.title = vscode.l10n.t('Preview: {0}', posix.basename(editor.document.uri.path));
    if (changed) this.invalidate();
    this.send();
  }

  private invalidate(): void {
    clearTimeout(this.timer);
    this.status = undefined;
    ++this.revision;
    if (this.ready && this.panel?.visible) {
      void this.panel.webview.postMessage({ type: 'pending', uri: this.document?.uri.toString(), revision: this.revision });
    }
  }

  private send(): void {
    clearTimeout(this.timer);
    const document = this.document;
    if (!this.panel?.visible || !this.ready || !document || document.isClosed) return;
    const text = document.getText();
    void this.panel.webview.postMessage({
      type: 'render', uri: document.uri.toString(), revision: this.revision,
      // Oversized buffers never cross the webview boundary.
      text: text.length > MAX_PREVIEW_LENGTH ? '' : text,
      ...(text.length > MAX_PREVIEW_LENGTH ? { error: vscode.l10n.t("The preview supports up to 100,000 characters. Split the score into smaller files.") } : {})
    });
  }

  private reload(): void {
    if (!this.panel) return;
    this.ready = false;
    this.invalidate();
    const asset = (...parts: string[]) => this.panel!.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', ...parts)).toString();
    this.panel.webview.html = previewHtml({
      script: asset('compiled', 'webview', 'main.js'), library: asset('vendor', 'fumen.js'),
      style: asset('preview.css'), cspSource: this.panel.webview.cspSource, nonce: randomBytes(18).toString('base64')
    }, vscode.l10n.t, vscode.env.language, vscode.l10n.bundle);
  }

  dispose(): void {
    this.panel?.dispose();
    clearTimeout(this.timer);
    for (const disposable of this.subscriptions) disposable.dispose();
    this.statusChanged.dispose();
  }
}
