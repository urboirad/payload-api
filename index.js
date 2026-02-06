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
    // 1. Handle Nulls
    if (value === null) {
      mainInterface += `  ${key}: any; // null value\n`;
    } 
    // 2. Handle Arrays
    else if (Array.isArray(value)) {
      const typeOfElement = value.length > 0 ? typeof value[0] : 'any';
      mainInterface += `  ${key}: ${typeOfElement}[];\n`;
    } 
    // 3. Handle Nested Objects
    else if (typeof value === 'object') {
      const nestedName = key.charAt(0).toUpperCase() + key.slice(1);
      mainInterface += `  ${key}: ${nestedName};\n`;
      interfaces.push(convertToTS(value, nestedName));
    } 
    // 4. Handle Primitives (string, number, boolean)
    else {
      mainInterface += `  ${key}: ${typeof value};\n`;
    }
  }
  mainInterface += `}`;
  return [...interfaces, mainInterface].join('\n\n');
};