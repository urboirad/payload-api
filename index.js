const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- Core description + type inference engine ---

const generateSmartDocs = (key, value) => {
  const name = key.toLowerCase();

  if (name.includes('id')) return 'Unique identifier for this entity';
  if (name.includes('email')) return 'User contact email address';
  if (name.includes('created') || name.includes('updated')) {
    return 'ISO 8601 timestamp representing when this value was set';
  }
  if (name.includes('name')) return 'Human-readable display name';
  if (name.includes('status')) return 'Current status flag or state';
  if (typeof value === 'boolean') return 'Boolean flag indicating state or configuration';
  if (Array.isArray(value)) return `Collection of ${key} items`;

  return `The ${key} property`;
};

// Normalize JS typeof → TypeScript friendly types
const normalizeTsType = (value) => {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) return 'any[]';

  const t = typeof value;
  if (t === 'number') return Number.isInteger(value) ? 'number' : 'number';
  if (t === 'string') return 'string';
  if (t === 'boolean') return 'boolean';
  if (t === 'object') return 'any';

  return 'any';
};

// Recursively build TypeScript interfaces from JSON
const buildInterfaces = (obj, name = 'RootObject', seen = new Map()) => {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { interfaces: [], rootName: name };
  }

  const signature = JSON.stringify(Object.keys(obj).sort());
  if (seen.has(signature)) {
    return { interfaces: [], rootName: seen.get(signature) };
  }

  seen.set(signature, name);

  const nestedInterfaces = [];
  let mainInterface = `/**\n * @interface ${name}\n * Auto-generated documentation for JSON payloads.\n */\ninterface ${name} {\n`;

  for (const [key, value] of Object.entries(obj)) {
    const description = generateSmartDocs(key, value);

    if (Array.isArray(value)) {
      const first = value[0];

      if (first && typeof first === 'object' && !Array.isArray(first)) {
        const nestedName = `${name}_${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        const { interfaces: childInterfaces, rootName: childName } = buildInterfaces(first, nestedName, seen);
        nestedInterfaces.push(...childInterfaces);

        mainInterface += `  /** ${description} */\n`;
        mainInterface += `  ${key}: ${childName}[];\n`;
      } else {
        mainInterface += `  /** ${description} */\n`;
        mainInterface += `  ${key}: ${normalizeTsType(first)}[];\n`;
      }
    } else if (value !== null && typeof value === 'object') {
      const nestedName = `${name}_${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      const { interfaces: childInterfaces, rootName: childName } = buildInterfaces(value, nestedName, seen);
      nestedInterfaces.push(...childInterfaces);

      mainInterface += `  /** ${description} */\n`;
      mainInterface += `  ${key}: ${childName};\n`;
    } else {
      mainInterface += `  /** ${description} */\n`;
      mainInterface += `  ${key}: ${normalizeTsType(value)};\n`;
    }
  }

  mainInterface += '}';

  return { interfaces: [...nestedInterfaces, mainInterface], rootName: name };
};

// Generate JSDoc typedef + properties from JSON
const buildJsDoc = (obj, name = 'GeneratedType') => {
  const lines = ['/**', ` * @typedef {Object} ${name}`];

  for (const [key, value] of Object.entries(obj)) {
    const description = generateSmartDocs(key, value);
    const type = Array.isArray(value)
      ? (value[0] && typeof value[0] === 'object' ? 'Object[]' : 'Array')
      : typeof value;

    lines.push(` * @property {${type}} ${key} - ${description}`);
  }

  lines.push(' */');
  return lines.join('\n');
};

// Generate Markdown table schema from JSON
const buildMarkdown = (obj) => {
  const lines = ['| Property | Type | Description | Example |', '|----------|------|-------------|---------|'];

  for (const [key, value] of Object.entries(obj)) {
    const description = generateSmartDocs(key, value);
    const type = Array.isArray(value)
      ? (value[0] && typeof value[0] === 'object' ? 'object[]' : 'array')
      : typeof value;

    const example = JSON.stringify(value)?.slice(0, 80) || '';
    lines.push(`| ${key} | ${type} | ${description} | ${example} |`);
  }

  return lines.join('\n');
};

// --- Helpers ---

const parseJsonBody = (jsonBody) => {
  if (jsonBody === undefined) {
    throw new Error('Missing "jsonBody" in request payload');
  }

  if (typeof jsonBody === 'string') {
    try {
      return JSON.parse(jsonBody);
    } catch (e) {
      throw new Error('"jsonBody" string is not valid JSON');
    }
  }

  if (typeof jsonBody !== 'object' || jsonBody === null) {
    throw new Error('"jsonBody" must be a non-null object or JSON string');
  }

  return jsonBody;
};

// --- API Endpoints ---

// Health check for uptime pings and monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'payload-api' });
});

// Primary conversion endpoint
app.post('/api/convert', (req, res) => {
  try {
    const { jsonBody, rootName = 'RootObject', emit = ['typescript', 'jsdoc', 'markdown'] } = req.body || {};
    const payload = parseJsonBody(jsonBody);

    const emitSet = new Set(Array.isArray(emit) ? emit : [emit]);

    const response = {};

    if (emitSet.has('typescript')) {
      const { interfaces, rootName: finalRoot } = buildInterfaces(payload, rootName);
      response.typescript = interfaces.join('\n\n');
      response.typescriptRoot = finalRoot;
    }

    if (emitSet.has('jsdoc')) {
      response.jsdoc = buildJsDoc(payload, rootName);
    }

    if (emitSet.has('markdown')) {
      response.markdown = buildMarkdown(payload);
    }

    res.json(response);
  } catch (err) {
    res.status(400).json({
      error: 'Invalid payload',
      message: err.message,
    });
  }
});

// Backwards-compatible widget endpoint
app.post('/api/convert-all', (req, res) => {
  try {
    const { jsonBody } = req.body || {};
    const payload = parseJsonBody(jsonBody);

    const { interfaces } = buildInterfaces(payload, 'GeneratedType');

    res.json({
      typescript: interfaces.join('\n\n'),
      jsdoc: buildJsDoc(payload, 'GeneratedType'),
      markdown: buildMarkdown(payload),
    });
  } catch (err) {
    res.status(400).json({
      error: 'Invalid payload',
      message: err.message,
    });
  }
});

// SERVER STUFF
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});