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
app.post('/api/convert', (req, res) => {
  try {
    const { jsonBody } = req.body;
    if (!jsonBody) {
      return res.status(400).json({ error: "No JSON provided" });
    }
    const result = convertToTS(jsonBody);
    res.json({ code: result });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// SERVER STUFF
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});