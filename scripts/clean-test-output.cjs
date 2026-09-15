'use strict';

const { rmSync } = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const outputDirectory = path.resolve(repositoryRoot, 'out-test');

if (path.relative(repositoryRoot, outputDirectory) !== 'out-test') {
  throw new Error('Refusing to clean a directory outside this repository.');
}

rmSync(outputDirectory, { recursive: true, force: true });
