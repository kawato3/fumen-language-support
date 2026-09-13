/** Canonical notation reference: https://hbjpn.github.io/fumen/ */
export interface Setting {
  name: string;
  description: string;
  type: 'string' | 'transpose';
  choices?: readonly string[];
  initial: string;
  example: string;
}

export const SETTINGS: readonly Setting[] = [
  { name: 'TITLE', description: "Song title. Enclose it in double quotes.", type: 'string', initial: '"${1}"', example: '%TITLE="Song title"' },
  { name: 'SUB_TITLE', description: "Subtitle.", type: 'string', initial: '"${1}"', example: '%SUB_TITLE="Subtitle"' },
  { name: 'ARTIST', description: "Artist name.", type: 'string', initial: '"${1}"', example: '%ARTIST="Artist"' },
  { name: 'KEY', description: "Original key. The musical validity of keys and chords is not checked.", type: 'string', initial: '"${1:C}"', example: '%KEY="C"' },
  { name: 'TRANSPOSE', description: "Target key as a string, or transposition in semitones as an integer.", type: 'transpose', initial: '${1:0}', example: '%TRANSPOSE=2' },
  { name: 'KEY_TYPE', description: "Accidentals when transposing: b for flats, # for sharps, AUTO for automatic selection.", type: 'string', choices: ['b', '#', 'AUTO'], initial: '"${1|b,#,AUTO|}"', example: '%KEY_TYPE="b"' },
  { name: 'SHOW_STAFF', description: "Staff visibility: YES to show, NO to hide, AUTO to show when needed.", type: 'string', choices: ['YES', 'NO', 'AUTO'], initial: '"${1|YES,NO,AUTO|}"', example: '%SHOW_STAFF="YES"' },
  { name: 'SHOW_FOOTER', description: "Footer visibility: YES to show, NO to hide.", type: 'string', choices: ['YES', 'NO'], initial: '"${1|YES,NO|}"', example: '%SHOW_FOOTER="NO"' }
];

export const SIGNS = [
  { value: '<S>', description: "Segno. Numbered example: <S2>." },
  { value: '<Coda>', description: "Coda. Numbered example: <Coda2>." },
  { value: '<to Coda>', description: "Go to Coda. Numbered example: <to Coda2>." },
  { value: '<D.S.>', description: "Dal Segno. Return to the Segno sign." },
  { value: '<D.S. al Coda>', description: "Dal Segno al Coda." },
  { value: '<D.S. al Fine>', description: "Dal Segno al Fine." },
  { value: '<D.C.>', description: "Da Capo. Return to the beginning." },
  { value: '<D.C. al Coda>', description: "Da Capo al Coda." },
  { value: '<D.C. al Fine>', description: "Da Capo al Fine." },
  { value: '<Fine>', description: "Fine. End of the piece." }
] as const;

export const DURATIONS = [
  ['1', "Whole note"], ['2', "Half note"], ['4', "Quarter note"], ['8', "Eighth note"],
  ['16', "Sixteenth note"], ['32', "Thirty-second note"], ['64', "Sixty-fourth note"],
  ['2.', "Dotted half note"], ['4.', "Dotted quarter note"], ['8.', "Dotted eighth note"],
  ['16.', "Dotted sixteenth note"]
] as const;

export const NEW_SCORE = '%TITLE="${1:Song title}"\n%ARTIST="${2:Artist}"\n\n[${3:A}]\n| ${4} | ${5} | ${6} | ${7} |\n$0';

export const TEMPLATES = [
  { label: "4 bars", description: "Use Tab to move between bars", body: '| ${1} | ${2} | ${3} | ${4} |\n$0' },
  { label: "8 bars", description: "Two rows of 4 bars", body: '| ${1} | ${2} | ${3} | ${4} |\n| ${5} | ${6} | ${7} | ${8} |\n$0' },
  { label: "Section", description: "Section label and 4 bars", body: '\n[${1:A}]\n| ${2} | ${3} | ${4} | ${5} |\n$0' },
  { label: "Repeat", description: "4 bars with repeat boundaries", body: '||: ${1} | ${2} | ${3} | ${4} :||\n$0' },
  { label: "First and second endings", description: "Repeat with alternate endings", body: '||: ${1} | ${2} | [1.] ${3} | ${4} :||\n>| [2.] ${5} | ${6} ||.\n$0' },
  { label: "Annotation above chord", description: "Attach to the following chord", body: "'${1:annotation}'@ ${0}" },
  { label: "Lyrics", description: "Display below the following chord", body: '`${1:lyrics}`@ ${0}' }
] as const;
