# Fumen 1.3.3 コード構成要素表示パッチ

[English](README.md) | 日本語

このフォルダーでは、[hbjpn/fumen](https://github.com/hbjpn/fumen) **v1.3.3** 用のレンダラーパッチを配布します。Fumen Language Support 1.0.2 に同梱したものと同じ追加機能を、ほかの Fumen ベースのアプリケーションでも選択して使えるように、独立した形でまとめたものです。

これは **Fumen 本家の正式な機能ではなく、Fumen の記法を変更するものでもありません。** コード構成要素の描画だけを変更します。これらの `%PARAM` を使う譜面は通常の Fumen 原稿のままですが、パッチを当てていないレンダラーは追加項目を解釈せず、従来のコンパクトな見た目で表示します。

## 対応する上流版

このパッチを適用できるのは、次の上流 Fumen に限られます。

| 項目 | 値 |
| --- | --- |
| 上流リポジトリー | `https://github.com/hbjpn/fumen.git` |
| 上流タグ | `v1.3.3` |
| 上流コミット | `f3d04a522c19236c81f553871d6aee665d9eda22` |
| パッチファイル | [`0001-fumen-1.3.3-chord-component-display.patch`](0001-fumen-1.3.3-chord-component-display.patch) |
| SHA-256 | `70cc019dfb1dd2921fe897d2ace21ecf1af75cd8f84b3a0ac2855ffe1f285032` |

別の Fumen 版へそのまま当てないでください。より新しい上流版で使う場合は、パッチをリベースしてからテストしてください。パッチには `src/renderer/default_renderer.js` だけでなく、ビルド済みの `dist/fumen.js` も含まれます。リポジトリーにある配布物を使うブラウザー環境では、別途ビルドしなくても利用できます。

## 適用方法

Fumen を取得し、指定のコミットへ切り替えてから、パッチをコミットとして適用します。

```sh
git clone https://github.com/hbjpn/fumen.git
cd fumen
git checkout f3d04a522c19236c81f553871d6aee665d9eda22
git am --3way /path/to/0001-fumen-1.3.3-chord-component-display.patch
```

コミット情報を必要とせず、ファイルの変更だけを適用する場合は、まず検査してから `git apply` を使えます。

```sh
git apply --check /path/to/0001-fumen-1.3.3-chord-component-display.patch
git apply /path/to/0001-fumen-1.3.3-chord-component-display.patch
```

上流の開発用依存関係を導入した後、パッチに含まれる描画テストを実行します。

```sh
npm ci
npm run test:chord-labels
```

このテストでは、従来どおりのコンパクトな既定表示、コンパクト表示で記号だけを変えた場合、コード名・テンション・変化音・オンコードを通常サイズで表示する `inline` を確認します。

## レンダリング用パラメーター

3 項目はすべて、Fumen 既存の `%PARAM` の JSON オブジェクトに入れます。

| 項目 | 既定値 | 効果 |
| --- | --- | --- |
| `minor_label` | `"–"` | 短三和音に使う文字。既定の `–` はエンダッシュ（U+2013）。`Am` にするには `"m"`。 |
| `major_label` | `"Δ"` | 明示的な長三和音に使う文字。既定の `Δ` はギリシャ大文字のデルタ（U+0394）であり、`△` ではない。`AM7` にするには `"M"`。 |
| `chord_suffix_style` | `"compact"` | `"compact"` は Fumen 本来の小さな上付き・下付き風の配置を保つ。`"inline"` はルート音の後に続く要素をすべて通常サイズ・同じ基準線で表示する。 |

3 項目の既定値は、次のように明示しても同じです。

```fumen
%PARAM={"minor_label":"–","major_label":"Δ","chord_suffix_style":"compact"}
| Am7(#11)/C | AM7/E |
```

一般的なコード表記にするには、次のようにします。

```fumen
%PARAM={"minor_label":"m","major_label":"M","chord_suffix_style":"inline"}
| Am7(#11)/C | AM7/E |
```

`"inline"` は、上付き用・下付き用に分けない 1 つの配置指定です。コードの性質、`7` などのテンション、変化五度、`#11`・`b9`、括弧、右側に置く `/C` のようなオンコードまで、ルート音の後に続く要素すべてに適用します。Fumen 既存の `on_bass_style` が `"below"` の場合、ベース音は下に残りますが、文字サイズは `inline` の通常サイズになります。

コピーして試せる例は [`examples/chord-component-display.fumen`](examples/chord-component-display.fumen) を参照してください。

## ライセンスと権利表示

Fumen の著作権は Copyright (c) 2020 Hiroyuki Baba、ライセンスは MIT です。このパッチで新たに加えた部分は、このリポジトリーの [MIT ライセンス](../../LICENSE)で提供します。パッチ済みのビルドを再配布するときは、Fumen の既存のライセンス、著作権表示、第三者の権利表示を残してください。このパッチは独自に保守するものであり、Fumen 作者による推奨や承認を意味しません。
