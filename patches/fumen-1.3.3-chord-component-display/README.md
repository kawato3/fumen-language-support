# Fumen 1.3.3 renderer extensions

English | [日本語](README.ja.md)

This directory distributes a renderer patch for [hbjpn/fumen](https://github.com/hbjpn/fumen) **v1.3.3**. It matches the bundled renderer in this repository, packaged separately so another Fumen-based application can opt in to the same chord-symbol appearance. Use a repository release tag when you need the patch matching an older extension release.

These are **not** official Fumen features or changes to Fumen notation. The patch
adds chord-display settings and opt-in performance-order bar numbers. An unpatched
renderer ignores these additional `%PARAM` members and keeps its usual appearance.

Patch filenames use the extension release that introduces their contents, not a
separate patch version. The `1.0.5` file matches extension version 1.0.5;
the unchanged [1.0.3 patch](0001-fumen-1.3.3-chord-component-display-1.0.3.patch)
remains available for the older major/minor-label and suffix-style functionality.
Do not apply both patches: each is cumulative against unmodified upstream.

## Compatibility

The patch applies only to this exact upstream base:

| Item | Value |
| --- | --- |
| Upstream repository | `https://github.com/hbjpn/fumen.git` |
| Upstream tag | `v1.3.3` |
| Upstream commit | `f3d04a522c19236c81f553871d6aee665d9eda22` |
| Patch file | [`0001-fumen-1.3.3-chord-component-display-1.0.5.patch`](0001-fumen-1.3.3-chord-component-display-1.0.5.patch) |
| SHA-256 | `3bcb1dd67f9d2cbfd8240b1b003e2cc67a6e1164c8f0770ce9c290e17bd9209f` |

Do not apply it blindly to another Fumen release. Rebase and retest the patch against a newer upstream revision instead. The patch includes source code, tests, build configuration and documentation, but no generated `dist/` files. **Build after applying it:** the upstream `dist/fumen.js` and its source map remain unchanged until you rebuild.

## Apply

Clone Fumen, check out the exact base revision, then validate and apply the patch:

```sh
git clone https://github.com/hbjpn/fumen.git
cd fumen
git checkout f3d04a522c19236c81f553871d6aee665d9eda22
git apply --check /path/to/0001-fumen-1.3.3-chord-component-display-1.0.5.patch
git apply /path/to/0001-fumen-1.3.3-chord-component-display-1.0.5.patch
```

This is a cumulative diff against unmodified v1.3.3, not an incremental update over an older copy of this patch. It does not create a commit; commit the changes yourself if needed.

Install the upstream development dependencies, then build and test:

```sh
npm ci
npm run test:chord-labels
npm run test:bar-numbers
```

`test:chord-labels` runs Webpack before the test, regenerating both `dist/fumen.js`
and `dist/fumen.js.map`. Use that rebuilt JavaScript in your application; if you
distribute a source map, use the newly generated one alongside it.

The tests verify the original compact defaults, custom labels in both layouts, equivalent input spellings, transposition, extensions, alterations, slash basses and bar numbering. Chord tests observe actual Canvas text drawing, not pixel-level engraving quality.

To verify that your build matches the renderer bundled with extension 1.0.5, run:

```sh
git hash-object dist/fumen.js
```

Expected Git blob ID: `8bfb817f8e9ad6c42f313d6be96e013e9819189b`.
If it differs, check the upstream revision, patch and locked dependencies before
deploying. The extension's renderer has not changed; only the patch's distribution
format has changed from including generated files to requiring a local build.

## Renderer parameters

All members belong inside Fumen's existing `%PARAM` JSON object.

| Member | Default | Effect |
| --- | --- | --- |
| `minor_label` | `"–"` | Text for a minor triad. The default is an en dash (U+2013). Use `"m"` for `Am`. |
| `major_label` | `"Δ"` | Text for an explicit major mark. The default is Greek capital delta (U+0394), not `△`. Use `"M"` for `AM7`. |
| `diminished_label` | `"O"` | Text for a diminished triad. The default is capital O, not a degree sign. Use `"dim"` for `Cdim` / `Cdim7`. |
| `half_diminished_label` | `"Ø"` | Text replacing the entire minor-seventh-flat-fifth combination, independently of `minor_label`. Use `"m7-5"` for both `Cm7-5` and `Cm7b5`. |
| `augmented_label` | `"+"` | Text for an augmented triad. Use `"aug"` for both `Caug` and `C+`. |
| `chord_suffix_style` | `"compact"` | `"compact"` preserves Fumen's original small upper/lower layout. `"inline"` draws every component after the root at ordinary size on one shared baseline. |

All defaults can be written explicitly:

```fumen
%PARAM={"minor_label":"–","major_label":"Δ","diminished_label":"O","half_diminished_label":"Ø","augmented_label":"+","chord_suffix_style":"compact"}
| Am7(#11)/C | AM7/E | Cdim7 | Cm7-5 | Caug | C+ |
```

For letter-based inline chord symbols:

```fumen
%PARAM={"minor_label":"m","major_label":"M","diminished_label":"dim","half_diminished_label":"m7-5","augmented_label":"aug","chord_suffix_style":"inline"}
| Am7(#11)/C | AM7/E | Cdim7 | Cm7-5 | Caug | C+ |
```

These settings standardize labels by chord quality, not by original spelling. Selecting `"aug"` also changes `C+` to `Caug`. They do not change altered-fifth or accidental-glyph conventions, or add input notation such as `CØ` / `C°`; continue to write `Cm7-5` / `Cdim`. Transposition and durations are unchanged. Labels accept strings; other types fall back to the defaults. The half-diminished label is one text unit, so `"m7-5"` shares a size and baseline even in compact mode. All multi-character quality labels, including `"min"` and `"maj"`, use their natural width. Inline augmented labels precede extensions (`Caug7` / `C+7`).

`"inline"` is intentionally one layout choice, not separate upper and lower controls. It applies to the quality label, extensions such as `7`, altered fifths, `#11`/`b9`, parentheses and a right-positioned slash bass such as `/C`. When Fumen's existing `on_bass_style` is `"below"`, the bass stays below the chord but uses the ordinary inline font size.

See [`examples/chord-component-display.fumen`](examples/chord-component-display.fumen) for a copyable example.

## Bar numbers

`%PARAM={"bar_number":"on"}` enables small performance-order numbers at rendered
row starts. The default is `"off"`; only the exact string `"on"` enables it.
`bar_start` sets the starting number (default `1`); use
`%PARAM={"bar_number":"on","bar_start":0}` for a pickup counted as bar zero.
Any safe integer, including negative values, is accepted; invalid values use `1`.
Only the setting effective at the first source measure is used, not later changes.
Repeat visits are listed together, e.g. `1,9`. See the [user rules](../../docs/CHEATSHEET.md#extension-bar-numbers)
and [design/test scenarios](../../docs/design/bar-numbering.md).

The DOM-free `src/renderer/bar_numbering.mjs` contains the bounded traversal;
`test/bar-numbering.test.mjs` tests it without a browser. Ordinary `renderer.render`
calls remain valid. When numbering is enabled, the resolved result additionally
contains `barNumbering: { stop: null | { reason, measure } }`. `measure` is the
zero-based source-measure index. Reasons are `indefinite-repeat`, `invalid-repeat`,
`unsupported-ending`, `invalid-rest`, `invalid-navigation`, `visit-limit` and
`counter-limit`. A stop leaves the known numbers and ordinary score drawing intact.
The extension translates this status; another host can display its own notice.

## License and attribution

Fumen is Copyright (c) 2020 Hiroyuki Baba and is licensed under the MIT License. This patch's original contributions are provided under this repository's [MIT License](../../LICENSE). Keep Fumen's existing license, copyright notices and third-party notices when redistributing a patched build. This patch is independently maintained and does not imply endorsement by the Fumen authors.
