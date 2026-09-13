# 開発メモ

## 構成

- `src/catalog.ts`: 設定・記号の説明、コマンドで挿入するひな形。
- `src/notation.ts`: 文字位置を保持する小さな字句読み取り。音楽的な判定はしない。
- `src/language.ts`: VS Code に依存しない補完・説明・診断。
- `src/extension.ts`: VS Code への登録と、文書単位の診断更新。
- `docs/CHEATSHEET.md` / `docs/CHEATSHEET.ja.md`: Fumen 1.3.3 に合わせた英語・日本語の記法一覧。`vscode.openWith` と標準の `vscode.markdown.preview.editor` で、文書に固定して表示する。
- `package.nls*.json` / `l10n/`: メニュー・設定の説明と実行時メッセージの翻訳。英語を標準とする。
- `src/localization.ts`: 表示言語による資料選択と、VS Code に依存しない補助処理・Webview 向けの引数置換。
- `src/preview.ts`: 文書に固定された1枚の Webview と、300ミリ秒の更新待ち・破棄処理。
- `src/preview-html.ts`: 原稿を埋め込まない固定 HTML と CSP。
- `src/preview-protocol.ts`: 拡張と Webview のメッセージ型・サイズ上限。
- `src/webview/`: 本家による描画、最新入力だけを表示する直列キュー、倍率・スクロール復元。
- `media/vendor/`: 版・ハッシュを固定した本家の配布物と各ライセンス（Git に含める）。
- `media/compiled/`: `tsconfig.webview.json` から生成するブラウザー用 ES Modules（Git では除外、VSIX には含める）。
- `syntaxes/fumen.tmLanguage.json`: TextMate による色分け。
- `language-configuration.json`: 括弧・引用符とインデントの設定。
- `snippets/fumen.json`: VS Code のスニペット一覧。コマンドのひな形との一致をテストする。
- `test/unit`: 補完の置換範囲、診断の誤検出回避、実際の TextMate エンジンを使ったテスト。
- `test/integration`: VS Code 内での拡張の起動、編集、診断更新、括弧補完、Tab 移動を確認。

拡張ホストは VS Code API、プレビューは同梱の Fumen を使う。Language Server、外部プロセス、実行時のネットワーク通信はない。VSIX は実行時に必要なファイルとライセンスだけを許可リストで含める。

プレビューは解析から描画まで Webview 内で完結する。文書は HTML に連結せず、メッセージで渡す。CSP はネットワーク・任意スクリプト・インラインスクリプト・eval を許可しない。ローカル参照は拡張の `media/` だけ。`img-src data:` は本家の内蔵音楽記号に必要。

`retainContextWhenHidden` は使わず、倍率・位置と直前の正常なテキストを Webview の状態に保存する。非表示中は変更を描画せず、再表示時に最新の文書を送る。全体を描き直し、完了してから一括交換する。別の文書の画像は引き継がない。描画処理そのものを同期処理の途中で中断できるわけではないため、サイズ制限と更新の間引きを併用する。

本家が解析を受理することと、完全な譜面を描けることは同義ではない。本体には解析ループ数などの制約もある。独自の音楽的な判定は追加せず、描画時のエラーはプレビューだけに表示する。

提供するページの Canvas インスタンスに寸法の検査を設け、メモリー確保の前に単辺・総画素数を制限する（1回の描画につき合計3,200万画素）。ブラウザーのグローバルなプロトタイプや同梱ライブラリーは変更しない。用紙高さ0（内容に合わせる）の過大な1ページもこの検査で止める。`%PARAM` の主要寸法・倍率・フォントサイズにも制限を設ける。

本家1.3.3の `src/renderer/graphic.js` は、文字計測用の600×600論理画素の Canvas を画素密度・倍率の組み合わせごとに保持する。描画インスタンスを作り直しても消えないため、`src/webview/measurement-budget.ts` で別途、Webview の存続期間を通じて1,600万画素までに制限する。`Track.getVariable('PARAM')` のグローバル値を読み、A4 の既定値（pixel_ratio=2、text_size=1）、null 時の実際の画素密度を解決し、描画前に保守的に予約する。予約は失敗時も返さない。上流のキャッシュに残った可能性があるためである。画素密度の実効値も3以下に限定する。

同じ組み合わせでの通常の編集は追加の予約を使わない。上限時は以前の正常画像を残し、以前の設定への復帰またはプレビューを閉じて開き直す操作を案内する。「再読み込み」では最後の正常テキストを復元するため、その古い設定も再予約される。ページ予算は表示中と次回描画中で別々であり、これらの検査はブラウザープロセス全体のメモリー量や同期処理時間を保証するものではない。Fumen を更新するときは、この限定的な互換処理も再確認する。

## 検証

```sh
npm ci
npm run check
npm run test:integration
npm run package
```

通常のビルドは同梱ファイルの SHA-256 をローカルで確認するだけで、ダウンロードはしない。配布物が欠けている場合だけ `npm run vendor:fumen` で固定 URL から取得する。この取得処理もハッシュが合わなければ失敗する。ライブラリーを更新する際は、実装とライセンスの再確認、固定 URL・ハッシュ・バージョン表示の更新、描画の回帰テストを行う。

ブラウザー側の変更を監視する場合は `npm run watch:webview` を別の端末で使う。`npm run watch` は拡張ホスト側だけを監視する。F5 の事前ビルドと `npm run build` は両方を生成する。

統合テストは既定で公式の `@vscode/test-electron` が Stable 版 VS Code をダウンロードする。ユーザーの日常の設定に影響しないよう、OS の一時ディレクトリーに専用の設定・拡張フォルダーを作る。一時プロファイルはテスト失敗時の調査用に残し、パスを表示する。

インストール済み VS Code を使う場合は、実行ファイルのパスを明示できる。macOS の例:

```sh
FUMEN_VSCODE_EXECUTABLE='/Applications/Visual Studio Code.app/Contents/MacOS/Code' npm run test:integration
```

特定の版を検証する場合:

```sh
FUMEN_VSCODE_VERSION=1.90.0 npm run test:integration
```

制限モード（未信頼のワークスペース）で検証する場合:

```sh
FUMEN_TEST_RESTRICTED=1 npm run test:integration
```

この場合はテスト用の別フォルダーにサンプルをコピーし、ワークスペースが未信頼であることもアサートする。`@vscode/test-electron` の `runTests` は信頼機能を無効化する引数を自動付加するため、この検証だけは公式のダウンロード機能と VS Code のテスト用 CLI を組み合わせる。

VSIX に必要な資材がそろっているか確認する場合は、`FUMEN_TEST_EXTENSION_PATH` に VSIX を展開した `extension` ディレクトリー、またはインストール済み拡張のディレクトリーを指定する。同じテストを、その配布物を読み込む隔離プロファイルで実行できる。

VS Code の実行可否は OS の GUI 環境にも依存する。Linux のヘッドレス CI では Xvfb などを用意する。F5 で手動確認する場合は、このプロジェクトを VS Code で開き「Fumen 拡張を試す」を実行する。

キーボード入力の統合テストでは、画面のロックを解除し、テスト専用ウィンドウが入力を受け取れる状態にする。Mac のロック中は `type` コマンドが入力先を取得できず、括弧入力の検査が失敗することがある。待ち時間を延ばしたり期待値を緩めたりせず、画面状態を確認してから再実行する。

## 手動確認

1. `examples/basic.fumen` と `examples/notation.fumen` を開き、ライト・ダーク両テーマで構造が読み取れるか確認する。
2. `%TI` の補完後、引用符内にカーソルが置かれるか確認する。
3. `| C: |`、`| < |` で候補を選び、既存の小節内容が残るか確認する。
4. 日本語入力中に不要な候補が出ないか確認する。
5. 4小節スニペットの Tab・Shift+Tab、Escape を確認する。
6. 設定値を壊して修正し、波線が更新されるか確認する。
7. ローカル VSIX をインストールし、開発用ウィンドウ以外でも動作するか確認する。
8. 未保存の日本語の譜面を横にプレビューする。入力途中のエラー、修正、空文書、別文書での開き直しを確認する。
9. 複数ページで拡大・縮小・幅に合わせる表示、編集後のスクロール位置、タブの非表示・再表示を確認する。
10. ライト・ダーク・高コントラストで、操作部分と白い楽譜の視認性を確認する。
11. チートシートの本のボタン、目次、小節線の表、コピーできる記述例、再実行時のタブ再利用を確認する。
12. Fumen の本文で `Cmd+K V`（Windows/Linux は `Ctrl+K V`）がプレビューを開き、Markdown やターミナルに干渉しないことを確認する。

## ヘルプとキー割り当ての方針

チートシートの公開コマンドは `fumen.openCheatSheet`。Fumen 文書を開いていなくてもコマンドパレットから呼べる。本のボタンは Fumen エディターだけに表示する。標準 Markdown の固定プレビューを使い、専用 Webview やネットワーク取得を追加しない。表示失敗時のみ、利用者が選べる公式ページへの案内を出す。原資料の出典と MIT 表記は `THIRD_PARTY_NOTICES.md` に記載する。

プレビューの既定キーは、[標準 Markdown](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/package.json)と [AsciiDoc](https://github.com/asciidoctor/asciidoctor-vscode/blob/master/package.json) の横並びプレビューに合わせた。`editorTextFocus && editorLangId == fumen && !notebookEditorFocused` に限定する。チートシートなど共通の慣例がない機能は未割り当て。利用者の `keybindings.json` は変更しない。

記法一覧のテストでは Markdown の表の列数、縦棒・山括弧・バッククオートが失われないこと、設定と記号の掲載を確認する。実際の VS Code のテストでは全 `fumen` コードブロックを同梱の描画エンジンで描き、チートシートが横に開くこと・元の文書を変えないこと・タブを再利用すること・他の Markdown に追従しないことも確認する。

## 多言語対応

英語を標準とし、`vscode.env.language` が `ja`（地域指定付きも含む）なら日本語の資料を選ぶ。OS の言語・譜面の内容・ユーザー名などから推測しない。資料内の相互リンクでは表示言語を変更しない。コマンドで開き直すと再び表示言語で選ぶ。

静的な貢献情報は `package.nls.json` と `package.nls.ja.json`、拡張ホスト内の表示は `vscode.l10n.t` と `l10n/bundle.l10n.ja.json` を使う。[VS Code 公式の翻訳機構](https://github.com/microsoft/vscode-l10n)に従い、拡張ホスト用の独自ロケール読み込みや追加ライブラリーは導入しない。補完・ホバーの静的カタログは表示境界で翻訳し、動的な診断は翻訳関数へ値を引数として渡す。譜面の文字列やコード表記、スニペット本体は翻訳しない。

Webview には `vscode.l10n.bundle` をエスケープした JSON 属性として渡し、テキストとして使う。インラインスクリプトや外部通信は追加しない。本家エンジンが返す詳細エラーはそのまま表示する。スニペットの名前・接頭辞・仮の入力文字は言語間で共通の英語とし、コマンドのひな形選択画面の説明は翻訳する。

通常の統合テストは英語で実行する。日本語の確認は次のコマンドを使う（テスト専用の一時プロファイルに Microsoft の日本語言語パックをインストールするため、初期準備にネット接続が必要）。日常の VS Code の言語・設定は変更しない。

```sh
FUMEN_TEST_LOCALE=ja npm run test:integration
```

実際の `vscode.env.language`、翻訳済みコマンド名、補完・ホバー・診断・Webview の文言、両言語の全記述例の描画、資料の選択をアサートする。単体テストは資料の相互リンク、英語フォールバック、翻訳漏れ、引数の整合性と HTML エスケープも検査する。目次と相互リンクは、英語版 VS Code の実画面でも確認する。

統合テストは `editing.test.ts`、`preview.test.ts`、`help.test.ts` の名前付き独立ケースに分け、`index.ts` から公式の非同期 `run()` インターフェースで実行する。各ケースの文書・表示・登録を終了時に片付け、設定変更は `finally` で元に戻す。描画完了は文書 URI とリビジョンも照合し、古い成功を誤って採用しない。通常の待機は状態を観測し、「非表示中に更新しない」などの負の非同期契約だけは明示した観測期間で検証する。

単体テストは Node.js 標準の `node:test`、統合テストのアサートも標準の `node:assert/strict` を使う。追加のフレームワークは不要。全体が失敗してもケース名・原因を報告し、片付けに失敗した場合は後続を止める。1ケースに絞る例:

```sh
FUMEN_TEST_FILTER='Text measurement' npm run test:integration
```

細かな彫版・音楽的な正しさ・ピクセル比較は上流の責任とし、こちらは境界での安全性・更新と回復・同梱するコピー用の記述例の描画成功だけを検証する。

言語パックを CLI で新規インストールした直後は、初回 GUI 起動で登録情報が作られる。日本語テストは登録完了を確認してから再起動し、その後に実際の表示言語を検証する。言語を偽装したり、英語へのフォールバックを成功扱いにしたりしない。

## 対応記法の根拠

[公式記法](https://hbjpn.github.io/fumen/) と上流の `src/parser/parser.js`、`src/common/common.js` を参照。確認対象・同梱版は `v1.3.3`、コミット `f3d04a522c19236c81f553871d6aee665d9eda22`（2026-09-13 確認）。ライセンスは `THIRD_PARTY_NOTICES.md` に記載。

入力支援側では未知の設定名やコード表記を拒否しない。文字列内部を設定・記号として読み取らない。Fumen の通常のテキストは JSON の文字列とは異なるため、バックスラッシュのエスケープ処理を一律に適用しない。プレビューの解析・描画の可否は同梱した本家実装に従う。

## 公開用メタデータ

登録済みの発行者は `kawato3`、拡張 ID は `kawato3.fumen-language-support`。`private: true` は npm への誤公開を抑止する設定で、VS Code Marketplace への公開を抑止する設定ではない。公開用の npm スクリプトは用意していない。実際の公開前には [公開ガイド](PUBLISHING.md) を参照する。
