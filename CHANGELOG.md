# Changelog

## Unreleased

- Adopt the MIT license for the extension, retaining all third-party notices and licenses.
- Prepare concise English listing copy with a Japanese introduction and document the bilingual publication approach.
- Add the public GitHub repository and issue tracker, with links between the English and Japanese READMEs.
- Set the registered Marketplace publisher to `kawato3` and document migration from the earlier `fumen-local` builds.
- Add an extension icon featuring an F monogram and repeat dots.

## 0.4.1 — 2026-09-14

- Preserve later measures and annotations when completing an unfinished navigation sign.
- Bound the pinned renderer's retained text-measurement canvases across edits, including automatic display density.
- Split integration checks into named, isolated cases with explicit cleanup and revision-aware preview assertions; add regressions for the repaired boundaries.
- Include the upstream bundle's webpack runtime license and verify the third-party notice inventory.

## 0.4.0 — 2026-09-14

- Use English by default and Japanese when VS Code's display language is Japanese.
- Bundle English and Japanese cheat sheets and user guides, with language links at the top of each document.
- Localize commands, settings descriptions, completion/hover help, diagnostics and preview controls using VS Code's standard localization APIs.
- Keep snippet names and editable template placeholders in English, with unchanged command IDs and shortcut behavior.

## 0.3.0 — 2026-09-14

- Fumen 1.3.3 の記法をまとめた日本語チートシートを同梱。
- コマンドパレットとエディター右上の本のボタンから、固定した Markdown プレビューとして横に表示。
- 楽譜プレビューに、Markdown／AsciiDoc と同じ `Ctrl+K V`（macOS は `Cmd+K V`）を追加。Fumen の本文編集中だけ有効。
- チートシートなどのキーを自分で追加・変更する手順をガイドに追加。

## 0.2.0 — 2026-09-13

- 本家 Fumen 1.3.3 を同梱した、オフラインの横並びプレビュー。
- 保存前の編集を約0.3秒の入力待ちで反映。古い描画結果の上書きを防止。
- 解析・描画エラーでは同じ文書の前回の正常な表示を保持。
- 複数ページ、拡大・縮小、幅に合わせる表示、スクロール位置の復元。
- 閉じたプレビューの停止と、別文書の表示の分離。
- 同梱ファイルのハッシュ確認と、MIT・OFL・内包依存のライセンス表記。
- PDF 出力、楽譜の直接編集、音楽的な入力提案は追加しない。

## 0.1.0 — 2026-09-13

- `.fumen` の自動認識と構文の色分け。
- 括弧・引用符の入力支援。
- 設定名・設定値・演奏記号・音価の文脈に応じた補完。
- 曲のひな形と、小節・繰り返し・注記・歌詞のスニペット。
- 日本語のホバー説明と、設定・閉じ忘れの基本チェック。
- ローカルの導入ガイドと、将来の Marketplace 公開手順。
- コード名の候補表示を抑制する Fumen 用の既定値。
