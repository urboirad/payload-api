// Core description + type inference engine and helpers shared by HTTP API and CLI

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

const normalizeTsType = (value) => {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) return 'any[]';

  const t = typeof value;
  if (t === 'number') return 'number';
  if (t === 'string') return 'string';
  if (t === 'boolean') return 'boolean';
  if (t === 'object') return 'any';

  return 'any';
};

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

module.exports = {
  generateSmartDocs,
  normalizeTsType,
  buildInterfaces,
  buildJsDoc,
  buildMarkdown,
  parseJsonBody,
};
