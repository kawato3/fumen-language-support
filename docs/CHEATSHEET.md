# Fumen Cheat Sheet

English | [日本語](CHEATSHEET.ja.md)

A quick reference for the bundled **Fumen 1.3.3**, available offline. Chord names are notation examples, not suggestions offered by this extension.

[Official cheat sheet (browser)](https://hbjpn.github.io/fumen/cheatsheet/) · [Extension user guide](QUICKSTART.md)

## Contents

- [Basic structure and line breaks](#basics)
- [Chords, durations and rests](#rhythm)
- [Bar lines and repeats](#repeats)
- [Navigation signs](#signs)
- [Annotations, lyrics and spacing](#text)
- [Titles and display settings](#settings)
- [Extension-specific bar numbers](#extension-bar-numbers)
- [Extension-specific chord component display](#extension-chord-display)

<a id="basics"></a>

## Basic structure and line breaks

```fumen
%TITLE="Practice"
%ARTIST=""

[A]
| C | Am7 | F | G7 |
| C | Am7 | Dm7 G7 | C ||.

[B]
| F | G7 | C | C ||.
```

- Write `[A]`, `[Chorus]` or another label outside a measure to name a section.
- Bar lines enclose a measure. Each measure can contain multiple chords.
- Normally, one source line produces one row of the score. Blank lines also affect blocks and layout.
- Put a blank line before a new section to start it on a separate row. Without one, its label may continue on the previous row.
- At the start of a row, `<` requests left alignment and `>` requests right alignment. The renderer uses these for rows with fewer measures than the preceding regular row.

[Official structure reference](https://hbjpn.github.io/fumen/structure/)

<a id="rhythm"></a>

## Chords, durations and rests

| Example | Meaning |
| --- | --- |
| `C`, `Am7`, `Cm7-5#11` | Chord names. See the official chord reference for details. |
| `C/D` | Slash chord. The bass note follows `/`. |
| `/D` | Bass note only. |
| `(4/4)` | Time signature, written inside a measure. |
| `C:4` | Chord with a quarter-note duration; displays staff and rhythm slashes. |
| `C:4.` | Dotted quarter note. `C:4..` is double-dotted. |
| `:4` | Duration without a chord name. |
| `C:4~ :4` | `~` ties to the following rhythm slash. |
| `C:4_3 :4_3 :4_3` | Quarter-note triplet. `_5`, `_6` and `_7` are also available. |
| `<:16 C:2` | Anticipate the following chord by a sixteenth note. |
| `r:4`, `r:4.` | Quarter rest and dotted quarter rest. Rests require a duration. |
| `-2-` | Two-measure rest. The number sets the measure count. |

Duration numbers: `1` = whole, `2` = half, `4` = quarter, `8` = eighth, `16` = sixteenth, `32` = thirty-second, `64` = sixty-fourth note.

The duration-only, tie and tuplet examples describe chords/rhythm slashes. Do not assume that every combination also applies to rests.

```fumen
[Rhythm]
| (4/4) C:4 :4 G7:4 :4 | Am7:2 r:2 |
| C:4~ :4 F:2 | G7:1 ||.
```

[Chords](https://hbjpn.github.io/fumen/chord/) · [Durations](https://hbjpn.github.io/fumen/duration-indicator/) · [Rests](https://hbjpn.github.io/fumen/rest/)

<a id="repeats"></a>

## Bar lines and repeats

| Notation | Meaning |
| --- | --- |
| `\|` | Regular bar line. |
| `\|\|` | Double bar line. |
| `\|\|.` | Final bar line (thick second line). |
| `\|\|:` | Start a repeat. |
| `:\|\|` | End a repeat. |
| `:\|\|x3` | Display a repeat count of 3. |
| `:\|\|xX` | Display X as the repeat count. |
| `:\|\|:` | End one repeat and start another. |
| `[1.]`, `[2.]` | First/second ending when written inside a measure. Other text such as `[2-3.]` is also allowed. |
| `./.` | One-measure repeat sign (simile). |
| `.//.` | Two-measure repeat sign. |
| `./\|/.` | Repeat sign spanning a bar line. |

```fumen
[A]
||: C | Am7 | [1.] F | G7 :||
>| [2.] F | C ||.
```

Square brackets depend on position: `[A]` outside a measure labels a section; `[1.]` inside a measure marks an ending.

<a id="signs"></a>

## Navigation signs

Write these inside a measure.

| Notation | Meaning |
| --- | --- |
| `<S>` | Segno. |
| `<Coda>` | Coda. |
| `<to Coda>` | Go to Coda. |
| `<D.S.>` | Dal Segno. |
| `<D.S. al Coda>` | Dal Segno al Coda. |
| `<D.S. al Fine>` | Dal Segno al Fine. |
| `<D.C.>` | Da Capo. |
| `<D.C. al Coda>` | Da Capo al Coda. |
| `<D.C. al Fine>` | Da Capo al Fine. |
| `<Fine>` | Fine. |

Numbered signs include `<S2>`, `<Coda2>`, `<to Coda2>` and `<D.S.2>`. See the [official navigation-sign reference](https://hbjpn.github.io/fumen/repeat-sign/) for combinations.

<a id="text"></a>

## Annotations, lyrics and spacing

| Example | Position / use |
| --- | --- |
| `"text"` | Text at the same height as the chords. |
| `'annotation'` | Above the chord area, left-aligned within the measure. |
| `'softly'@ C7` | Annotation attached above the following chord. |
| `` `lyrics`@ C7 `` | Lyrics attached below the following chord. Use backticks. |
| `,` | Horizontal space roughly the width of one chord. |

```fumen
[A]
| 'slowly' C | 'softly'@ G7 |
| `lyrics`@ C | C "rit." ||.
```

Annotations appear on the score. They are not hidden source-code comments.

[Official text reference](https://hbjpn.github.io/fumen/text/)

<a id="settings"></a>

## Titles and display settings

Write one `%NAME=value` setting per line. Values use JSON syntax; enclose strings in double quotes. Names and values are case-sensitive.

| Example | Meaning |
| --- | --- |
| `%TITLE="Song title"` | Title. |
| `%SUB_TITLE="Subtitle"` | Subtitle. |
| `%ARTIST="Artist"` | Artist name. |
| `%KEY="C"` | Original key. A minor-key example is `"Gm"`. |
| `%TRANSPOSE=2` | Transpose up two semitones; negative integers transpose down. |
| `%TRANSPOSE="D"` | Specify a target key as a string. |
| `%KEY_TYPE="b"` | Transposition spelling: `"b"` = flats, `"#"` = sharps, `"AUTO"` = automatic. |
| `%SHOW_STAFF="YES"` | Staff visibility: `"YES"` = show, `"NO"` = hide, `"AUTO"` = show when needed. |
| `%SHOW_FOOTER="NO"` | Hide the footer. `"YES"` shows it (the upstream default). |

Omitting `SHOW_STAFF` also selects automatic display. The `AUTO` descriptions follow the Fumen 1.3.3 implementation. Set the original `%KEY` when transposing.

[Variables](https://hbjpn.github.io/fumen/variable/) · [Transposition](https://hbjpn.github.io/fumen/transpose/)

`%PARAM` accepts a JSON object. For upstream Fumen rendering settings such as paper size, font size and margins, see [RenderParam in the official API reference](https://hbjpn.github.io/fumen/api_reference/#renderparam). This extension uses the A4 preset by default and limits extreme rendering settings.

<a id="extension-bar-numbers"></a>

## Extension-specific bar numbers

This is an independent extension to the bundled Fumen renderer, not an upstream
Fumen 1.3.3 feature. Other Fumen environments need the matching renderer patch.

```fumen
%PARAM={"bar_number":"on"}
[A]
||: C | G |
| Am | F :||
| C | G ||.
```

The three row starts show `1,5`, `3,7`, and `9`. These are **performance-order**
numbers, including repeat passes, rather than fixed source-measure numbers.
Labels appear in small type just left of each row's first barline, including rows
without a rehearsal name. They also appear in the Chrome print/PDF output.

- **`bar_number` default: `"off"`.** Only the exact string `"on"` enables the display. Use
  `"off"` or omit the parameter to hide it; hiding it does not reset the count.
- **`bar_start` default: `1`.** Set the starting number in the initial PARAM,
  for example `0` for a pickup. Integers, including negative values, are accepted;
  invalid values or numbers outside the safe integer range use `1`.
  This sets the initial count only, not a reset at later sections or repeat visits.
- Counting continues across sections and pages. A pickup counts as
  one bar; `-4-` counts as four bars, displaying only its starting number.
- Ordinary repeats, numeric `xN`, numeric ending lists/ranges, D.S./D.C., Fine
  and Coda affect the count. On a D.S./D.C. return, repeats are skipped and final
  endings selected; `<S with repeat>` requests repeats after returning to that Segno.
- At a reached `xX`, counting stops. Known numbers stay visible, but later visits
  and bars are not numbered. There is no assumed repeat count.
- Free-text endings, ambiguous/unmatched repeats, missing/duplicate jump targets
  or conflicting navigation stop numbering. A `with repeat` jump into the middle
  of a repeat is not supported. Counting also stops after 10,000 traversal steps
  or when numbers exceed safe integer arithmetic.
- A preview/print status explains a stop; the score remains viewable and printable.
  Numbers before the stop show only the visits established so far. Very wide
  labels may extend beyond the page margin.

To count a pickup as bar `0`, use:

```fumen
%PARAM={"bar_number":"on","bar_start":0}
| C:4 |
| F:1 | C:1 ||.
```

The row starts show `0` and `1`. Add `bar_start` to your existing PARAM object if
you already have one; it does not turn the display on by itself.

<a id="extension-chord-display"></a>

## Extension-specific chord component display

**This section describes an addition made by Fumen Language Support; it is not part of the published Fumen 1.3.3 documentation or parameter set.** The bundled renderer supports the `%PARAM` members below. Fumen applications without the same renderer patch, including the official browser playground, may ignore them and use their normal chord appearance. The score's chord notation and musical meaning do not change; only the renderer's appearance changes. Omitted members use the defaults below. Remove these members when sharing a score without this extension-specific display choice.

In Fumen's original compact appearance, the root note is full size while the following chord components are smaller and arranged above or below it. The original minor glyph is an en dash (`–`, U+2013), and the explicit major glyph is a Greek capital delta (`Δ`, U+0394), not the white triangle (`△`). This extension lets you preserve that compact style explicitly or use familiar full-size, baseline-aligned chord symbols such as `Am7` and `AM7`.

| `%PARAM` member | Default and effect |
| --- | --- |
| `minor_label` | **Default: `"–"`** — the text for a minor triad. Choose `"m"` for conventional `Am` symbols. |
| `major_label` | **Default: `"Δ"`** — the text for an explicit major mark. Choose `"M"` for conventional `AM7` symbols. |
| `diminished_label` | **Default: `"O"`** — a capital O drawn as the diminished circle, not a degree sign. Choose `"dim"` to display `Cdim` and `Cdim7` with letters. |
| `half_diminished_label` | **Default: `"Ø"`** — replaces the whole minor-seventh-flat-fifth combination. Choose `"m7-5"` to display both `Cm7-5` and `Cm7b5` as `Cm7-5`. This label is independent of `minor_label`. |
| `augmented_label` | **Default: `"+"`** — the augmented-triad label. Choose `"aug"` to display both `Caug` and `C+` as `Caug`. |
| `chord_suffix_style` | **Default: `"compact"`** — preserves Fumen's original smaller upper/lower layout. `"inline"` draws every component after the root at the ordinary size on one shared baseline. |

This form spells out all defaults and reproduces the original Fumen appearance:

```fumen
%PARAM={"minor_label":"–","major_label":"Δ","diminished_label":"O","half_diminished_label":"Ø","augmented_label":"+","chord_suffix_style":"compact"}
| Am7(#11)/C | AM7/E | Cdim7 | Cm7-5 | Caug | C+ |
```

For letter-based labels at ordinary size, select the labels and switch the layout to `"inline"`:

```fumen
%PARAM={"minor_label":"m","major_label":"M","diminished_label":"dim","half_diminished_label":"m7-5","augmented_label":"aug","chord_suffix_style":"inline"}
| Am7(#11)/C | AM7/E | Cdim7 | Cm7-5 | Caug | C+ |
```

These settings **standardize the label for each chord quality; they do not preserve the input spelling**. For example, `augmented_label:"aug"` changes `C+` to `Caug` as well. They do not change `b5`/`#5` handling or the musical sharp/flat glyphs, and do not add input spellings such as `CØ` or `C°`. Continue to write `Cm7-5` and `Cdim` in the source. Transposition, durations, additional alterations and slash basses continue to work.

All labels are strings; non-string values fall back to their defaults. The half-diminished label is one text unit: `"m7-5"` stays together even in `"compact"`, rather than placing `-5` above `m7`. In compact mode all quality labels stay small, but multi-character text (including `"min"` and `"maj"`) gets its natural width. In inline mode the augmented label precedes the extension (`Caug7` or `C+7`).

`"inline"` is deliberately one switch: it applies consistently to every component after the root, including chord qualities, `7` and other extensions, altered fifths, `#11`/`b9` and other alterations, parentheses, and a right-positioned slash bass such as `/C`. There is no separate upper-versus-lower setting. If the existing Fumen `on_bass_style` is `"below"`, the bass remains below the chord as requested, but uses the ordinary inline font size.

## Sources and scope

Adapted from the [official Fumen v1.3.3 cheat sheet](https://github.com/hbjpn/fumen/blob/v1.3.3/docsrc/docs/cheatsheet.md) and related documentation. This reference adds clarifications but does not cover every combination or advanced rendering setting.

The official cheat sheet duplicates a sign in its “Da Capo al Coda” row. This reference uses `<D.C. al Coda>` to match the implementation.

Original material: Copyright (c) 2020 Hiroyuki Baba, MIT License. The full license is bundled as `resources/vendor/FUMEN-LICENSE.txt`; see `resources/vendor/THIRD_PARTY_NOTICES.md` for the inventory. This is an independently maintained adaptation, not official documentation.
