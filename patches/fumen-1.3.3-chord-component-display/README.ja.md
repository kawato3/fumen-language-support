# Fumen 1.3.3 レンダリング拡張パッチ

[English](README.md) | 日本語

このフォルダーでは、[hbjpn/fumen](https://github.com/hbjpn/fumen) **v1.3.3** 用のレンダラーパッチを配布します。このリポジトリーの同梱レンダラーと同じ表示を、ほかの Fumen ベースのアプリケーションでも選択して使えるように、独立した形でまとめたものです。過去に公開した拡張と同じパッチが必要な場合は、対応するリリースタグを参照してください。

これは **Fumen 本家の正式な機能ではなく、Fumen の記法を変更するものでもありません。**
コード表示の設定と、任意で有効にする演奏順の小節番号を追加します。
パッチを当てていないレンダラーは追加の `%PARAM` を解釈せず、従来の表示を保ちます。

ファイル名の版番号は、その内容を導入する拡張のリリース番号です。独立したパッチの版番号
ではありません。`1.0.5` は拡張バージョン 1.0.5 に対応します。
従来のメジャー／マイナー表示と添え字配置用の
[1.0.3 パッチ](0001-fumen-1.3.3-chord-component-display-1.0.3.patch)は、内容を変えずに残しています。
どちらも未変更の上流に対する累積差分なので、両方を重ねて適用しないでください。

## 対応する上流版

このパッチを適用できるのは、次の上流 Fumen に限られます。

| 項目 | 値 |
| --- | --- |
| 上流リポジトリー | `https://github.com/hbjpn/fumen.git` |
| 上流タグ | `v1.3.3` |
| 上流コミット | `f3d04a522c19236c81f553871d6aee665d9eda22` |
| パッチファイル | [`0001-fumen-1.3.3-chord-component-display-1.0.5.patch`](0001-fumen-1.3.3-chord-component-display-1.0.5.patch) |
| SHA-256 | `cc044049ac62660e49acd9d6f5fd6393ab5ba7e9b25743a195e0a3206c2446f1` |

別の Fumen 版へそのまま当てないでください。より新しい上流版で使う場合は、パッチをリベースしてからテストしてください。パッチには `src/renderer/default_renderer.js` だけでなく、ビルド済みの `dist/fumen.js` も含まれます。リポジトリーにある配布物を使うブラウザー環境では、別途ビルドしなくても利用できます。

## 適用方法

Fumen を取得し、指定のコミットへ切り替えてから、パッチを検査・適用します。

```sh
git clone https://github.com/hbjpn/fumen.git
cd fumen
git checkout f3d04a522c19236c81f553871d6aee665d9eda22
git apply --check /path/to/0001-fumen-1.3.3-chord-component-display-1.0.5.patch
git apply /path/to/0001-fumen-1.3.3-chord-component-display-1.0.5.patch
```

これは未変更の v1.3.3 に対する累積差分であり、古いパッチの上に重ねて適用する更新差分ではありません。適用時にコミットは作成しません。必要であれば、適用後にご自身でコミットしてください。

上流の開発用依存関係を導入した後、パッチに含まれる描画テストを実行します。

```sh
npm ci
npm run test:chord-labels
npm run test:bar-numbers
```

このテストでは、コンパクトな既定表示、両配置でのラベル変更、同じ意味の入力表記、移調、テンション、変化音、オンコードを確認します。実際の Canvas への文字描画を検査するもので、ピクセル単位の浄書品質のテストではありません。

## レンダリング用パラメーター

すべての項目を、Fumen 既存の `%PARAM` の JSON オブジェクトに入れます。

| 項目 | 既定値 | 効果 |
| --- | --- | --- |
| `minor_label` | `"–"` | 短三和音に使う文字。既定の `–` はエンダッシュ（U+2013）。`Am` にするには `"m"`。 |
| `major_label` | `"Δ"` | 明示的な長三和音に使う文字。既定の `Δ` はギリシャ大文字のデルタ（U+0394）であり、`△` ではない。`AM7` にするには `"M"`。 |
| `diminished_label` | `"O"` | ディミニッシュに使う文字。既定は度記号ではなく大文字の O。`"dim"` にすると `Cdim`・`Cdim7` を文字で表示。 |
| `half_diminished_label` | `"Ø"` | ハーフディミニッシュの `m7-5` 全体に代わる文字。`minor_label` とは独立。`"m7-5"` にすると `Cm7-5`・`Cm7b5` の両方を `Cm7-5` と表示。 |
| `augmented_label` | `"+"` | オーギュメントに使う文字。`"aug"` にすると `Caug`・`C+` の両方を `Caug` と表示。 |
| `chord_suffix_style` | `"compact"` | `"compact"` は Fumen 本来の小さな上付き・下付き風の配置を保つ。`"inline"` はルート音の後に続く要素をすべて通常サイズ・同じ基準線で表示する。 |

すべての既定値は、次のように明示しても同じです。

```fumen
%PARAM={"minor_label":"–","major_label":"Δ","diminished_label":"O","half_diminished_label":"Ø","augmented_label":"+","chord_suffix_style":"compact"}
| Am7(#11)/C | AM7/E | Cdim7 | Cm7-5 | Caug | C+ |
```

文字によるコード表記をインライン表示するには、次のようにします。

```fumen
%PARAM={"minor_label":"m","major_label":"M","diminished_label":"dim","half_diminished_label":"m7-5","augmented_label":"aug","chord_suffix_style":"inline"}
| Am7(#11)/C | AM7/E | Cdim7 | Cm7-5 | Caug | C+ |
```

これはコードの種類ごとに表示を統一する設定であり、入力の綴りを保存する機能ではありません。`"aug"` を選ぶと `C+` も `Caug` と表示します。変化五度やシャープ・フラットの表記規則は変わらず、`CØ`・`C°` などの入力記法も増えません。ソースでは引き続き `Cm7-5`・`Cdim` と書いてください。移調や音価の扱いも変わりません。ラベルは文字列で指定し、文字列以外なら既定値を使います。ハーフディミニッシュのラベル全体を一つの文字列として扱うため、コンパクト表示でも `"m7-5"` 全体が同じ大きさ・基準線に並びます。`"min"`・`"maj"` を含め、すべての種類のラベルは複数文字の場合に自然な幅で表示します。インライン表示では `Caug7`・`C+7` のようにラベルを数字の前に置きます。

`"inline"` は、上付き用・下付き用に分けない 1 つの配置指定です。コードの性質、`7` などのテンション、変化五度、`#11`・`b9`、括弧、右側に置く `/C` のようなオンコードまで、ルート音の後に続く要素すべてに適用します。Fumen 既存の `on_bass_style` が `"below"` の場合、ベース音は下に残りますが、文字サイズは `inline` の通常サイズになります。

コピーして試せる例は [`examples/chord-component-display.fumen`](examples/chord-component-display.fumen) を参照してください。

## 小節番号

`%PARAM={"bar_number":"on"}` で、各段の先頭に演奏順の小節番号を小さく表示します。
`bar_start` は開始番号（既定値 `1`）です。弱起を小節番号 `0` と数える場合は
`%PARAM={"bar_number":"on","bar_start":0}` と指定します。
負数を含む安全な整数を指定でき、不正な値は `1` として扱います。
最初の小節で有効な設定を一度だけ使い、途中の変更は採番に影響しません。
表示設定 `bar_number` の既定値は `"off"` で、文字列 `"on"` の場合だけ有効です。繰り返しの周回は `1,9` のように
併記します。[利用規則](../../docs/CHEATSHEET.ja.md#extension-bar-numbers)と
[設計・テストシナリオ](../../docs/design/bar-numbering.md)を参照してください。

DOM に依存しない `src/renderer/bar_numbering.mjs` が上限付きの採番を担当し、
`test/bar-numbering.test.mjs` でブラウザーなしにテストできます。
通常の `renderer.render` 呼び出しはそのまま使えます。採番が有効な場合、完了時の戻り値に
`barNumbering: { stop: null | { reason, measure } }` が加わります。
`measure` は原稿内の小節を0から数えた位置です。`reason` は `indefinite-repeat`、
`invalid-repeat`、`unsupported-ending`、`invalid-rest`、`invalid-navigation`、
`visit-limit`、`counter-limit` のいずれかです。停止しても確定済みの番号と譜面の描画は残します。
拡張ではこの状態を翻訳して表示します。別のアプリケーションでは独自の通知に利用できます。

## ライセンスと権利表示

Fumen の著作権は Copyright (c) 2020 Hiroyuki Baba、ライセンスは MIT です。このパッチで新たに加えた部分は、このリポジトリーの [MIT ライセンス](../../LICENSE)で提供します。パッチ済みのビルドを再配布するときは、Fumen の既存のライセンス、著作権表示、第三者の権利表示を残してください。このパッチは独自に保守するものであり、Fumen 作者による推奨や承認を意味しません。
