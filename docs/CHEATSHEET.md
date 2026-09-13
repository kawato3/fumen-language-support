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

The advanced `%PARAM` setting accepts a JSON object. For example, this changes paper width and height. The extension limits extreme image dimensions to keep the preview manageable.

```fumen
%PARAM={"paper_width":800,"paper_height":1100}
%TITLE="Paper settings example"

[A]
| C | Am7 | F | G7 ||.
```

[Variables](https://hbjpn.github.io/fumen/variable/) · [Transposition](https://hbjpn.github.io/fumen/transpose/) · [Rendering parameters](https://hbjpn.github.io/fumen/api_reference/)

## Sources and scope

Adapted from the [official Fumen v1.3.3 cheat sheet](https://github.com/hbjpn/fumen/blob/v1.3.3/docsrc/docs/cheatsheet.md) and related documentation. This reference adds clarifications but does not cover every combination or advanced rendering setting.

The official cheat sheet duplicates a sign in its “Da Capo al Coda” row. This reference uses `<D.C. al Coda>` to match the implementation.

Original material: Copyright (c) 2020 Hiroyuki Baba, MIT License. The full license is bundled as `media/vendor/FUMEN-LICENSE.txt`; see `THIRD_PARTY_NOTICES.md` for the inventory. This is an independently maintained adaptation, not official documentation.
