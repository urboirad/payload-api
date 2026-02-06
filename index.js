const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// LOGIC
const generateSmartDocs = (key, value) => {
    const name = key.toLowerCase();
    if (name.includes('id')) return "Unique identifier";
    if (name.includes('email')) return "User contact email";
    if (name.includes('created')) return "ISO 8601 timestamp of creation";
    if (typeof value === 'boolean') return "Flag indicating state";
    if (Array.isArray(value)) return `Collection of ${key} items`;
    return `The ${key} property`;
  };
  
  const convertToTS = (obj, name = "RootObject") => {
    let interfaces = [];
    let mainInterface = `/**\n * @interface ${name}\n * Auto-generated documentation\n */\ninterface ${name} {\n`;
  
    for (const [key, value] of Object.entries(obj)) {
      const description = generateSmartDocs(key, value);
      mainInterface += `  /** ${description} */\n`; // Adds JSDoc comment
      
      if (value === null) {
        mainInterface += `  ${key}: any;\n`;
      } else if (Array.isArray(value)) {
        const typeOfElement = value.length > 0 ? typeof value[0] : 'any';
        mainInterface += `  ${key}: ${typeOfElement}[];\n`;
      } else if (typeof value === 'object') {
        const nestedName = key.charAt(0).toUpperCase() + key.slice(1);
        mainInterface += `  ${key}: ${nestedName};\n`;
        interfaces.push(convertToTS(value, nestedName));
      } else {
        mainInterface += `  ${key}: ${typeof value};\n`;
      }
    }
    mainInterface += `}`;
    return [...interfaces, mainInterface].join('\n\n');
  };

// FOR WIDGET
app.post('/api/convert-all', (req, res) => {
    try {
      const { jsonBody } = req.body;
      const obj = typeof jsonBody === 'string' ? JSON.parse(jsonBody) : jsonBody;
  
      // 1. TypeScript Logic
      const tsLines = ['interface GeneratedType {'];
      for (const [key, value] of Object.entries(obj)) {
        tsLines.push(`  ${key}: ${Array.isArray(value) ? 'any[]' : typeof value};`);
      }
      tsLines.push('}');
  
      // 2. JSDoc Logic
      const jsLines = ['/**', ' * @typedef {Object} GeneratedType'];
      for (const [key, value] of Object.entries(obj)) {
        jsLines.push(` * @property {${Array.isArray(value) ? 'Array' : typeof value}} ${key}`);
      }
      jsLines.push(' */');
  
      // 3. Markdown Logic
      const mdLines = ['| Property | Type | Value |', '|----------|------|-------|'];
      for (const [key, value] of Object.entries(obj)) {
        mdLines.push(`| ${key} | ${typeof value} | ${JSON.stringify(value)} |`);
      }
  
      res.json({
        typescript: tsLines.join('\n'),
        jsdoc: jsLines.join('\n'),
        markdown: mdLines.join('\n')
      });
    } catch (err) {
      res.status(400).json({ error: "Invalid JSON" });
    }
  });

// SERVER STUFF
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});