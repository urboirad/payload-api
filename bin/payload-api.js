#!/usr/bin/env node

// CLI entrypoint for Payload API converter
// Usage: payload-api <path/to/file.json> [--rootName Name] [--emit typescript,jsdoc,markdown]

const fs = require('fs');
const path = require('path');
const {
  buildInterfaces,
  buildJsDoc,
  buildMarkdown,
  parseJsonBody,
} = require('../lib/converter');

const argv = process.argv.slice(2);

const showHelp = () => {
  // eslint-disable-next-line no-console
  console.log(`Usage: payload-api <file.json> [--rootName Name] [--emit typescript,jsdoc,markdown]

Examples:
  payload-api payload.json
  payload-api payload.json --rootName UserPayload --emit typescript,markdown
`);
};

if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

let filePath = null;
let rootName = 'RootObject';
let emit = ['typescript', 'jsdoc', 'markdown'];

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];

  if (!arg.startsWith('-') && !filePath) {
    filePath = arg;
    continue;
  }

  if (arg === '--rootName' && i + 1 < argv.length) {
    rootName = argv[i + 1];
    i += 1;
    continue;
  }

  if (arg === '--emit' && i + 1 < argv.length) {
    emit = argv[i + 1].split(',').map((v) => v.trim()).filter(Boolean);
    i += 1;
  }
}

if (!filePath) {
  // eslint-disable-next-line no-console
  console.error('Error: missing path to JSON file.');
  showHelp();
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), filePath);

let fileContents;
try {
  fileContents = fs.readFileSync(absolutePath, 'utf8');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`Error: unable to read file at ${absolutePath}`);
  process.exit(1);
}

let json;
try {
  json = JSON.parse(fileContents);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Error: file does not contain valid JSON.');
  process.exit(1);
}

let payload;
try {
  payload = parseJsonBody(json);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

const emitSet = new Set(Array.isArray(emit) ? emit : [emit]);

const output = {};

if (emitSet.has('typescript')) {
  const { interfaces } = buildInterfaces(payload, rootName);
  output.typescript = interfaces.join('\n\n');
}

if (emitSet.has('jsdoc')) {
  output.jsdoc = buildJsDoc(payload, rootName);
}

if (emitSet.has('markdown')) {
  output.markdown = buildMarkdown(payload);
}

// Print in a human-friendly multi-section format
if (output.typescript) {
  // eslint-disable-next-line no-console
  console.log('=== TypeScript Interfaces ===');
  // eslint-disable-next-line no-console
  console.log(output.typescript);
  // eslint-disable-next-line no-console
  console.log();
}

if (output.jsdoc) {
  // eslint-disable-next-line no-console
  console.log('=== JSDoc Typedef ===');
  // eslint-disable-next-line no-console
  console.log(output.jsdoc);
  // eslint-disable-next-line no-console
  console.log();
}

if (output.markdown) {
  // eslint-disable-next-line no-console
  console.log('=== Markdown Schema ===');
  // eslint-disable-next-line no-console
  console.log(output.markdown);
}
