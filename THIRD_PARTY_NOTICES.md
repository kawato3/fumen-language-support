# Third-party notices

This extension bundles a browser distribution derived from
[hbjpn/fumen 1.3.3](https://github.com/hbjpn/fumen/tree/v1.3.3), commit
`f3d04a522c19236c81f553871d6aee665d9eda22`, as `media/vendor/fumen.js`.
It includes the local chord-component patch `10aa5970aef0c5daa53f0cf542bea4e88e58e639`:
`minor_label`, `major_label` and `chord_suffix_style` select chord labels and
compact or inline chord-component display. This extension-specific addition is
not part of the published Fumen 1.3.3 parameter set. The original license banner
is preserved. No source map, playground page, analytics,
URL-sharing code, or externally hosted script is loaded at runtime.

`docs/CHEATSHEET.md` and `docs/CHEATSHEET.ja.md` are English and Japanese
adaptations of the v1.3.3 documentation,
including `docsrc/docs/cheatsheet.md`, structure, duration, text and variable
references. It is reorganized, supplemented and corrected against the
bundled implementation. Original documentation: Copyright 2020 Hiroyuki
Baba, MIT (see `media/vendor/FUMEN-LICENSE.txt`). This is not an official translation.

| Component | License text included in this package |
| --- | --- |
| Fumen — Copyright 2020 Hiroyuki Baba | [MIT](media/vendor/FUMEN-LICENSE.txt) |
| Embedded Fumen/Bravura music symbols — Copyright 2015 Steinberg Media Technologies GmbH, 2020 Hiroyuki Baba | [SIL Open Font License 1.1](media/vendor/OFL.txt) |
| @babel/polyfill 7.8.7 (inside the upstream bundle) | [MIT](media/vendor/BABEL-LICENSE.txt) |
| core-js 2.6.11 (inside the upstream bundle) | [MIT](media/vendor/CORE-JS-LICENSE.txt) |
| regenerator-runtime 0.13.11 (inside the upstream bundle) | [MIT](media/vendor/REGENERATOR-LICENSE.txt) |
| webpack 5.78.0 (generated bootstrap/runtime inside the upstream bundle) | [MIT](media/vendor/WEBPACK-LICENSE.txt) |

The embedded font's reserved names are **Bravura** and **Fumen**. Font assets
are distributed unmodified, under their own license. These licenses apply
to the third-party components independently of this extension's MIT license
(Copyright 2026 Katsushi Kawato; see `LICENSE`). No endorsement by the
upstream authors is implied.

`scripts/vendor-fumen.cjs` verifies the local patched bundle and the bundled
third-party licenses with SHA-256 checksums. The patched bundle is intentionally
not downloaded automatically. The dependency versions are taken from the
upstream 1.3.3 package lock.
