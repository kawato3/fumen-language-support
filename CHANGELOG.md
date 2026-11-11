# Changelog

## 1.0.7

- Accept lowercase `maj` wherever the major mark `M` is supported, including slash chords and minor-major chords. Use the configured chord labels and layout, support transposition, and preserve the input spelling when exporting scores.
- Keep lyrics, annotations and quoted text unchanged when using the new alias.

## 1.0.6

- Draw a lyric attached to a rhythm slash (`./.`) or a rest instead of dropping it.
- Add `\/` and `\\` escapes to write a slash and a backslash in lyrics.
- Accept `add4`, `add11` and `add13` as chord tensions.
- Draw time signatures with more than one digit, such as `(12/8)`, which previously stopped the whole preview from rendering.

## 1.0.5

- Add configurable diminished, half-diminished and augmented chord labels.
- Add optional performance-order bar numbers with a configurable starting number.

## 1.0.4

- Sort consecutive settings and top-level `%PARAM` fields with Format Document.
- Simplify rendering-setting guidance in the cheat sheet and link to Fumen's API reference.

## 1.0.3

- Add a searchable Fumen notation picker with editable snippets.
- Open the bundled offline cheat sheet directly from notation hover help.

## 1.0.2

- Add extension-specific `minor_label`, `major_label` and `chord_suffix_style` `%PARAM` values to choose chord labels and compact or full-size inline chord-component display.

## 1.0.1

- Fix local Chrome printing when VS Code supplies a `vscode-userdata:` storage URI. Keep remote and web printing restrictions in place.
- Test print snapshots against VS Code's actual storage URI and file-system provider instead of substituting a `file:` URI.
- Clarify migration from earlier `fumen-local` builds.
