const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// LOGIC
const convertToTS = (obj, name = "RootObject") => {
  let interfaces = [];
  let mainInterface = `interface ${name} {\n`;

  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      mainInterface += `  ${key}: any; // null value\n`;
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

// "Smart" logic
const describeField = (key, value) => {
    if (key.includes('id')) return "Unique identifier for the resource.";
    if (key.includes('email')) return "Validated user email address.";
    if (typeof value === 'number') return "Floating point or integer value.";
    return "General data field.";
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