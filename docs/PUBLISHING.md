# Marketplace 公開ガイド

ソースの公開先は [kawato3/fumen-language-support](https://github.com/kawato3/fumen-language-support) です。Marketplace の発行者 `kawato3`（表示名: Katsushi Kawato）は登録済みです。拡張はまだ Marketplace に公開していませんが、VSIX によるローカル利用ができます。

初回公開用のバージョンは **1.0.0** です。README と同梱の操作ガイドは公開後の導入手順に更新済みですが、それ自体は公開完了を意味しません。アップロードは所有者の最終確認後に行います。

## 1.0.0 の確認結果（2026-09-14）

公開用ファイルはプロジェクト直下の `fumen-language-support-1.0.0.vsix`（1,013,287 バイト）です。VSIX は Git には含めていません。以下の SHA-256 は検証したファイルそのものを識別します。再作成した場合は同じファイルとみなさず、配布物を再確認してください。

```text
7dda940111dc4bf43ce30bea45e500de59062c7dfa0aa583baad4cd2e1095cb3  fumen-language-support-1.0.0.vsix
```

- `npm ci`、公開メタデータ確認、ビルド、単体テスト39件、VSIX 作成が成功しました。
- 別のプロファイルへの VSIX インストールが成功し、`kawato3.fumen-language-support@1.0.0` として登録されることを確認しました。
- VSIX とインストール済みファイルの一致、MIT・第三者ライセンス、アイコン・紹介画像・日英資料の同梱、公開用 README の画像・日本語説明への HTTPS リンクを確認しました。
- macOS 26.6.2 / Apple Silicon 上で、配布物から拡張を読み込む隔離環境の統合テストを実行しました。全13ケースが各条件で成功しています。

| VS Code | 表示言語 | 起動条件 | 結果 |
| --- | --- | --- | --- |
| 1.90.0 | 英語 | 制限モード | 13 / 13 成功 |
| 1.90.0 | 日本語 | 制限モード | 13 / 13 成功 |
| 1.137.0 | 英語 | 標準のテスト起動 | 13 / 13 成功 |
| 1.137.0 | 日本語 | 標準のテスト起動 | 13 / 13 成功 |

日本語は Microsoft の言語パックをテスト専用プロファイルに導入し、実際の表示言語も検証しています。1.137.0 の括弧入力テストは画面ロック中に失敗しましたが、解除後は同じ配布物・元のテストで成功しました。このために製品コードやテストの期待値を変更していません。

Windows・Linux、Remote SSH / WSL、スクリーンリーダーでの実機確認は未実施です。Marketplace のアップロード・登録時の検証・公開後のインストール確認も未実施で、上記の成功に含めません。

## ローカル利用と公開の違い

VSIX は拡張のインストール用ファイルです。自分の PC や限定した利用者に導入するだけなら、Marketplace の発行者登録は不要です。

Marketplace に公開すると、ほかの利用者が拡張機能検索から見つけてインストールでき、同じ拡張 ID の新しい版へ更新できるようになります。

## 公開前に決める項目

1. **発行者 ID（登録・設定済み）**: `kawato3`。表示名は `Katsushi Kawato`、`package.json` の `publisher` に反映済みです。
2. **拡張名**: 現在の `fumen-language-support` が希望する名前で利用可能か確認します。拡張の ID は `発行者ID.拡張名` で決まります。
3. **公開リポジトリーと連絡先（設定済み）**: [GitHub リポジトリー](https://github.com/kawato3/fumen-language-support) をソースと案内の公開先、[Issues](https://github.com/kawato3/fumen-language-support/issues) を不具合報告・機能要望の窓口とします。`repository`、`homepage`、`bugs` に反映済みです。
4. **ライセンス（決定済み）**: 独自部分は MIT、著作権表示は `Copyright (c) 2026 Katsushi Kawato` とします。`LICENSE`、`package.json`、ロックファイルに反映済みです。同梱する第三者のライセンス・著作権表示は引き続き保持します。
5. **紹介内容（準備済み）**: 英語中心の紹介文と短い日本語案内、日英の相互リンクは README に反映済みです。選定済みの「F＋リピート」アイコンは `media/icon.png` に設定済みです。英語サンプルの編集画面とプレビューを撮影した画像 `media/screenshots/editor-preview.jpg` を、日英両方の README に掲載しています。導入案内は Marketplace 中心に更新済みで、ローカル VSIX の手順も残しています。
6. **同梱物の表記**: `THIRD_PARTY_NOTICES.md` と `media/vendor/` のライセンスを VSIX に含め、本家のライセンスヘッダーも保持します。独自部分の公開ライセンスを変更しても、同梱物のライセンスは変更しません。

現在の拡張 ID は `kawato3.fumen-language-support` で、以前のローカル版とは別の拡張になります。移行時は先に `fumen-local.fumen-language-support` をアンインストールしてから現在の版を入れ、二重に動かないようにします。譜面ファイルはそのまま使えます。

## 紹介文と言語の方針

検索結果向けの短い英語説明は `package.nls.json` の `description`、日本語の対応文は `package.nls.ja.json` に置きます。Marketplace の本文には標準の `README.md` が使われ、`README.ja.md` へ表示言語に応じて自動で切り替わるわけではありません。

README は英語を主にし、冒頭に短い日本語の概要を置きます。詳しい日本語説明は `README.ja.md`、拡張内の操作説明・チートシートは英語・日本語をそれぞれ用意します。全文を段落ごとに併記せず、言語を選んで読める構成にします。

両 README の冒頭に相互リンクを用意しています。`vsce` は公開 GitHub リポジトリーの情報から README の相対リンクを解決するため、公開用 VSIX でも日本語 README・ライセンス・各資料へのリンクを確認します。

参考: [Microsoft の Marketplace 表示ガイド](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#marketplace-integration)、[MIT ライセンス本文](https://spdx.org/licenses/MIT.html)。

## 公開する直前の手順

```sh
npm ci
npm run check
npm run test:integration
npm run check:publish
npm run package
```

`check:publish` は未設定の発行者・公開 URL・ライセンスを検出するローカル確認で、Marketplace への通信も公開も行いません。現在は基本メタデータを設定済みですが、実際の ID の利用可否や Marketplace の審査条件までは判定しません。

生成された VSIX を別の VS Code プロファイルにも入れて動作を確認します。サポートする OS と VS Code の最低バージョンも確認します。

その後、Marketplace の管理画面から VSIX をアップロードするか、`vsce` による公開を行います。公開操作は最終確認後に実行します。認証情報をリポジトリーに保存しないでください。

発行者登録や認証方式は変更されるため、公開時に [Microsoft の最新の公開手順](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) を確認します。初回は管理画面から VSIX をアップロードする方法でも構いません。

## 更新

変更内容を `CHANGELOG.md` に記録し、バージョンを上げて同じ発行者・同じ拡張名で公開します。ローカルの更新番号を上げる例:

```sh
npm version patch --no-git-tag-version
```

この操作は `package.json` とロックファイルのバージョンを更新します。変更をテストしてからパッケージを作り、意図した変更をまとめてコミットします。

## 参考

- [Marketplace の発行者管理](https://marketplace.visualstudio.com/manage)
- [拡張の公開・VSIX のインストール](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [拡張マニフェスト](https://code.visualstudio.com/api/references/extension-manifest)
