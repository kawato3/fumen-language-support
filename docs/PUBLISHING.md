# 将来 Marketplace に公開するとき

ソースの公開先は [kawato3/fumen-language-support](https://github.com/kawato3/fumen-language-support) です。Marketplace の発行者 `kawato3`（表示名: Katsushi Kawato）は登録済みです。拡張はまだ Marketplace に公開していませんが、VSIX によるローカル利用ができます。

## ローカル利用と公開の違い

VSIX は拡張のインストール用ファイルです。自分の PC や限定した利用者に導入するだけなら、Marketplace の発行者登録は不要です。

Marketplace に公開すると、ほかの利用者が拡張機能検索から見つけてインストールでき、同じ拡張 ID の新しい版へ更新できるようになります。

## 公開前に決める項目

1. **発行者 ID（登録・設定済み）**: `kawato3`。表示名は `Katsushi Kawato`、`package.json` の `publisher` に反映済みです。
2. **拡張名**: 現在の `fumen-language-support` が希望する名前で利用可能か確認します。拡張の ID は `発行者ID.拡張名` で決まります。
3. **公開リポジトリーと連絡先（設定済み）**: [GitHub リポジトリー](https://github.com/kawato3/fumen-language-support) をソースと案内の公開先、[Issues](https://github.com/kawato3/fumen-language-support/issues) を不具合報告・機能要望の窓口とします。`repository`、`homepage`、`bugs` に反映済みです。
4. **ライセンス（決定済み）**: 独自部分は MIT、著作権表示は `Copyright (c) 2026 Katsushi Kawato` とします。`LICENSE`、`package.json`、ロックファイルに反映済みです。同梱する第三者のライセンス・著作権表示は引き続き保持します。
5. **紹介内容**: 英語中心の紹介文と短い日本語案内、日英の相互リンクは README に反映済みです。Marketplace 公開時にはソースからの導入案内を更新します。見つけやすさのため、独自のアイコン（PNG）と実際の画面の画像もあると便利です。
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
