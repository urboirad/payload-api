const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Helper to convert JSON keys to TS types
const convertToTS = (obj, name = "Root") => {
  let interfaces = [];
  let mainInterface = `interface ${name} {\n`;

  for (const [key, value] of Object.entries(obj)) {
    const type = typeof value;
    if (value !== null && type === 'object' && !Array.isArray(value)) {
      const nestedName = key.charAt(0).toUpperCase() + key.slice(1);
      mainInterface += `  ${key}: ${nestedName};\n`;
      interfaces.push(convertToTS(value, nestedName));
    } else if (Array.isArray(value)) {
      mainInterface += `  ${key}: any[];\n`;
    } else {
      mainInterface += `  ${key}: ${type};\n`;
    }
  }
  mainInterface += `}`;
  return [...interfaces, mainInterface].join('\n\n');
};

app.post('/api/convert', (req, res) => {
  try {
    const { jsonBody } = req.body;
    const tsResult = convertToTS(jsonBody);
    res.json({ code: tsResult });
  } catch (err) {
    res.status(400).json({ error: "Invalid JSON provided" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));