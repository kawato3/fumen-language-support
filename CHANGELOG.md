# Changelog

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
