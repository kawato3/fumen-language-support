# Fumen Language Support

English | [日本語](README.ja.md)

Write [Fumen](https://github.com/hbjpn/fumen/) chord charts in VS Code with syntax highlighting, contextual completion, snippets and offline live previews. Keep English and Japanese notation guides close at hand, without chord-name suggestions getting in your way.

日本語: `.fumen` の譜面作成を、構文の色分け・設定や記号の補完・スニペット・オフラインのリアルタイムプレビューで支援します。コード名の補完は行いません。詳しくは [日本語の説明](README.ja.md)をご覧ください。

English is the default. With a Japanese VS Code display language, commands, settings descriptions, completion/hover explanations, diagnostics, preview controls and bundled help appear in Japanese. Each help document includes **日本語 / English** links, so you can read either language without changing VS Code's display language.

![Fumen source with syntax highlighting on the left and its rendered score preview on the right](media/screenshots/editor-preview.jpg)

Edit notation and see the score beside it. Try the [English sample](examples/notation-en.fumen) shown above.

## Install

Requires VS Code **1.90 or later**. No separate Node.js, Fumen or font installation is needed to use the extension.

1. Open the Extensions view in VS Code.
2. Search for `@id:kawato3.fumen-language-support`.
3. Select **Fumen Language Support** by **Katsushi Kawato** and click **Install**.
4. Open a `.fumen` file or run **Fumen: New Score** from the Command Palette.

To install a local build instead, choose **… → Install from VSIX…** and select `fumen-language-support-1.0.0.vsix`. See the development instructions below to build it yourself. If VS Code asks to reload after an update, save your work first.

If you used an earlier local build with the extension ID `fumen-local.fumen-language-support`, uninstall it before installing `kawato3.fumen-language-support` to avoid running both copies. Your `.fumen` files are unaffected.

## Features

- Syntax highlighting for settings, chords, bar lines, sections, durations, annotations and lyrics.
- Bracket/quote pairing and Tab-based snippets for common structures.
- Contextual completion for settings, fixed values, navigation signs and durations.
- Hover explanations and basic checks for malformed settings or missing delimiters.
- Live, side-by-side previews using the bundled **Fumen 1.3.3** renderer, including unsaved edits.
- Offline cheat sheets and user guides in English and Japanese, with links to the official reference.

The extension does **not** suggest chord names, judge chord progressions, validate beat counts or reformat your score. Fumen word-based suggestions are disabled by default to keep arbitrary chord names from being suggested. Your settings or other extensions may override this.

## Commands and shortcuts

Open the Command Palette with `Cmd+Shift+P` on macOS or `Ctrl+Shift+P` on Windows/Linux, then search for `Fumen`:

| Command | Purpose |
| --- | --- |
| Fumen: New Score | Start an untitled score with placeholders. |
| Fumen: Insert Template | Insert bars, sections, repeats, annotations or lyrics. |
| Fumen: Open Preview to the Side | Render the active Fumen document beside the source. |
| Fumen: Open Cheat Sheet | Open an offline notation reference beside the source. |
| Fumen: Open User Guide | Open detailed usage instructions. |

The preview and cheat sheet also have buttons at the top-right of a Fumen editor. Reopening the cheat sheet reuses its tab. Each document's language links work even in an English-only VS Code installation; reopening via the command follows the display language again.

The preview uses Markdown's familiar shortcut: **Cmd+K, then V** on macOS, or **Ctrl+K, then V** on Windows/Linux. Release the first keys before pressing V. It applies only while editing Fumen source text.

Other commands have no default key binding. Open **Keyboard Shortcuts** (`Cmd+K`, then `Cmd+S` on macOS; `Ctrl+K`, then `Ctrl+S` elsewhere), search for `Fumen`, and double-click a command to assign a key. User bindings override defaults; this extension never edits your `keybindings.json`.

## Preview behavior and limits

The preview updates after about 300 ms without typing. It follows the document from which it was opened and supports multiple pages, zoom and fit-to-width. While the source is incomplete, the last valid image remains visible with an error message. Close the preview to stop rendering; use **Reload** if necessary.

Rendering is local and uses no network service. Source text is sent to a sandboxed webview as data, never interpolated into HTML. The bundled renderer and licenses are version/hash pinned. The A4 preset is the default; `%PARAM` can override it within safety limits.

Limits: 100,000 source characters, 100 pages, 32 million page pixels per render and bounds on extreme rendering parameters. The renderer's retained text-measurement cache has a separate 16-million-pixel limit. Repeated changes to `%PARAM` text size or pixel ratio may fill it; close and reopen the preview to clear it. These are allocation guards, not a guarantee of total process memory or rendering time. Basic editor diagnostics stop above 500,000 characters. Split unusually large scores into smaller files.

PDF export, editing by clicking the score and synchronized source/preview scrolling are not included. Upstream renderer error details are shown as received, while the extension's own messages follow the display language.

## Settings and snippets

- `fumen.diagnostics.enabled`: enable basic setting/delimiter checks (default: true).
- `fumen.diagnostics.delay`: milliseconds after typing stops (default: 700; range: 200–5000).

Snippets use English names and stable `fumen-` prefixes in all display languages: `fumen-new`, `fumen-4bars`, `fumen-8bars`, `fumen-section`, `fumen-repeat`, `fumen-endings`, `fumen-note`, `fumen-lyric`. Use **Snippets: Insert Snippet** or invoke completion manually. Template placeholders and notation examples stay in English; existing score content is never translated.

## Development and distribution

Building requires Node.js 22 or later:

```sh
npm ci
npm run check
npm run test:integration
npm run package
```

Normal builds verify bundled assets locally; `npm run vendor:fumen` restores missing assets from pinned upstream URLs. Tests cover notation support, rendering safety, actual VS Code previews and localization. See the [development guide](docs/DEVELOPMENT.md) (Japanese) for isolated test profiles and specific VS Code versions.

Static contributions use `package.nls.json` and `package.nls.ja.json`; runtime strings use VS Code's `l10n` API and `l10n/bundle.l10n.ja.json`. English is the fallback. The extension follows VS Code's display language, not OS locale or document contents, and never changes the user's language settings.

The registered Marketplace publisher is `kawato3`; the extension ID is `kawato3.fumen-language-support`. Follow the [publishing guide](docs/PUBLISHING.md) (Japanese) before publication. `npm run check:publish` checks basic metadata but does not publish. `private: true` prevents npm publication, not Marketplace publication.

## Feedback

Report bugs and request features through [GitHub Issues](https://github.com/kawato3/fumen-language-support/issues). English and Japanese are both welcome. For bug reports, include your VS Code and extension versions and a small example you can share publicly.

## License and acknowledgments

MIT License — Copyright (c) 2026 Katsushi Kawato. See [LICENSE](LICENSE) for the full terms.

This is an independent extension, not an official Fumen product. Rendering is provided by [hbjpn/fumen](https://github.com/hbjpn/fumen/), created by Hiroyuki Baba. Bundled third-party code, documentation and music symbols retain their own MIT/OFL licenses and copyright notices; see [third-party notices](THIRD_PARTY_NOTICES.md) and [bundled licenses](media/vendor/).
