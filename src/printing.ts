import { randomBytes } from 'node:crypto';
import { posix, join } from 'node:path';
import * as vscode from 'vscode';
import { MAX_PREVIEW_LENGTH } from './preview-protocol';
import { printHtml } from './print-html';
import { findChrome, isLocalPrintStorage, launchChrome, PrintFiles } from './print-platform';

type PrintContext = Pick<vscode.ExtensionContext, 'extensionUri' | 'globalStorageUri' | 'extension'>;
interface PrintBrowser {
  findChrome(configured: string): Promise<string | undefined>;
  launchChrome(executable: string, filename: string): Promise<void>;
}

export class PrintManager implements vscode.Disposable {
  private busy = false;
  private disposed = false;
  private readonly files: PrintFiles;

  constructor(private readonly context: PrintContext, private readonly browser: PrintBrowser = { findChrome, launchChrome }) {
    this.files = new PrintFiles(join(context.globalStorageUri.fsPath, 'print'));
  }

  async open(document?: vscode.TextDocument): Promise<void> {
    if (this.busy || this.disposed) return;
    const t = vscode.l10n.t;
    if (!document || document.isClosed || document.languageId !== 'fumen') {
      void vscode.window.showInformationMessage(t('Open a Fumen file before opening the print view.'));
      return;
    }
    if (vscode.env.uiKind === vscode.UIKind.Web || (vscode.env.remoteName && this.context.extension.extensionKind === vscode.ExtensionKind.Workspace)
      || !isLocalPrintStorage(this.context.globalStorageUri)) {
      void vscode.window.showInformationMessage(t('Printing is available in local desktop VS Code. Open the file locally to print it.'));
      return;
    }
    const text = document.getText(), version = document.version;
    if (!text.trim()) { void vscode.window.showInformationMessage(t('The score is empty.')); return; }
    if (text.length > MAX_PREVIEW_LENGTH) {
      void vscode.window.showWarningMessage(t('The preview supports up to 100,000 characters. Split the score into smaller files.'));
      return;
    }
    this.busy = true;
    let filename: string | undefined;
    try {
      // Machine-scoped setting, read only from user settings; workspace files cannot choose an executable.
      const configured = vscode.workspace.getConfiguration('fumen').inspect<string>('print.chromePath')?.globalValue ?? '';
      const chrome = await this.browser.findChrome(configured);
      if (!chrome) {
        const choice = await vscode.window.showWarningMessage(t('Google Chrome was not found. Install it or set Fumen: Print Chrome Path to its executable.'), t('Open Settings'));
        if (choice) await vscode.commands.executeCommand('workbench.action.openSettings', 'fumen.print.chromePath');
        return;
      }
      const read = async (...parts: string[]) => new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.context.extensionUri, ...parts)));
      const [library, script, style, notices] = await Promise.all([
        read('media', 'vendor', 'fumen.js'), read('media', 'compiled', 'print.js'), read('media', 'print.css'),
        Promise.all(['FUMEN-LICENSE.txt', 'OFL.txt', 'BABEL-LICENSE.txt', 'CORE-JS-LICENSE.txt', 'REGENERATOR-LICENSE.txt', 'WEBPACK-LICENSE.txt']
          .map(async name => `${name}\n\n${await read('media', 'vendor', name)}`)).then(licenses => licenses.join('\n\n'))
      ]);
      filename = await this.files.create(printHtml({ text, name: posix.basename(document.uri.path) || 'Untitled.fumen' },
        { library, script, style, notices, nonce: randomBytes(18).toString('base64') }, t, vscode.env.language, vscode.l10n.bundle));
      if (this.disposed || document.isClosed || document.version !== version || document.languageId !== 'fumen') {
        await this.files.remove(filename);
        if (!this.disposed) void vscode.window.showInformationMessage(t('The document changed. Open the print view again to use the latest score.'));
        return;
      }
      await this.browser.launchChrome(chrome, filename);
    } catch (error) {
      if (filename) await this.files.remove(filename).catch(() => {});
      if (!this.disposed) void vscode.window.showErrorMessage(t('Could not open the print view. {0}',
        (error instanceof Error ? error.message : String(error)).slice(0, 350)));
    } finally { this.busy = false; }
  }

  async close(): Promise<void> { this.disposed = true; await this.files.dispose(); }
  dispose(): void { void this.close().catch(error => console.error('Fumen print cleanup failed', error)); }
}
