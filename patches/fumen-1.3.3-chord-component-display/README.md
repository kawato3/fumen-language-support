# Fumen 1.3.3 chord component display patch

English | [日本語](README.ja.md)

This directory distributes a renderer patch for [hbjpn/fumen](https://github.com/hbjpn/fumen) **v1.3.3**. It is the same renderer addition bundled in Fumen Language Support 1.0.2, packaged separately so another Fumen-based application can opt in to the same chord-symbol appearance.

This is **not** an official Fumen feature or a change to Fumen notation. It changes only how the renderer draws chord components. A score that uses these `%PARAM` members remains ordinary Fumen source, but an unpatched renderer has no behavior for them and uses its usual compact appearance.

## Compatibility

The patch applies only to this exact upstream base:

| Item | Value |
| --- | --- |
| Upstream repository | `https://github.com/hbjpn/fumen.git` |
| Upstream tag | `v1.3.3` |
| Upstream commit | `f3d04a522c19236c81f553871d6aee665d9eda22` |
| Patch file | [`0001-fumen-1.3.3-chord-component-display.patch`](0001-fumen-1.3.3-chord-component-display.patch) |
| SHA-256 | `70cc019dfb1dd2921fe897d2ace21ecf1af75cd8f84b3a0ac2855ffe1f285032` |

Do not apply it blindly to another Fumen release. Rebase and retest the patch against a newer upstream revision instead. The patch includes both `src/renderer/default_renderer.js` and the built `dist/fumen.js`, so browser deployments that use the checked-in distribution can use the result without a separate build.

## Apply

Clone Fumen, check out the exact base revision, then apply the patch as a commit:

```sh
git clone https://github.com/hbjpn/fumen.git
cd fumen
git checkout f3d04a522c19236c81f553871d6aee665d9eda22
git am --3way /path/to/0001-fumen-1.3.3-chord-component-display.patch
```

If you only need the file changes rather than the commit metadata, validate first and then use `git apply`:

```sh
git apply --check /path/to/0001-fumen-1.3.3-chord-component-display.patch
git apply /path/to/0001-fumen-1.3.3-chord-component-display.patch
```

After installing the upstream development dependencies, run the patch's focused renderer test:

```sh
npm ci
npm run test:chord-labels
```

The test verifies the original compact defaults, custom labels in compact mode, and ordinary-size inline rendering for labels, extensions, alterations and slash basses.

## Renderer parameters

All three members belong inside Fumen's existing `%PARAM` JSON object.

| Member | Default | Effect |
| --- | --- | --- |
| `minor_label` | `"–"` | Text for a minor triad. The default is an en dash (U+2013). Use `"m"` for `Am`. |
| `major_label` | `"Δ"` | Text for an explicit major mark. The default is Greek capital delta (U+0394), not `△`. Use `"M"` for `AM7`. |
| `chord_suffix_style` | `"compact"` | `"compact"` preserves Fumen's original small upper/lower layout. `"inline"` draws every component after the root at ordinary size on one shared baseline. |

All defaults can be written explicitly:

```fumen
%PARAM={"minor_label":"–","major_label":"Δ","chord_suffix_style":"compact"}
| Am7(#11)/C | AM7/E |
```

For conventional inline chord symbols:

```fumen
%PARAM={"minor_label":"m","major_label":"M","chord_suffix_style":"inline"}
| Am7(#11)/C | AM7/E |
```

`"inline"` is intentionally one layout choice, not separate upper and lower controls. It applies to the quality label, extensions such as `7`, altered fifths, `#11`/`b9`, parentheses and a right-positioned slash bass such as `/C`. When Fumen's existing `on_bass_style` is `"below"`, the bass stays below the chord but uses the ordinary inline font size.

See [`examples/chord-component-display.fumen`](examples/chord-component-display.fumen) for a copyable example.

## License and attribution

Fumen is Copyright (c) 2020 Hiroyuki Baba and is licensed under the MIT License. This patch's original contributions are provided under this repository's [MIT License](../../LICENSE). Keep Fumen's existing license, copyright notices and third-party notices when redistributing a patched build. This patch is independently maintained and does not imply endorsement by the Fumen authors.
