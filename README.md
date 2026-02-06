# Payload API

**Payload** is a high-utility, Node.js-based micro-service designed to accelerate the development workflow by transforming raw JSON data into production-ready technical documentation and type definitions.



### Core Functionality
The API serves as a "Structural Architect" for data. Instead of simply echoing back input, it performs semantic analysis on JSON payloads to generate three distinct developer-focused formats:

* **TypeScript Interface Generation**: Recursively parses JSON objects to build strongly-typed interfaces. It automatically detects data types (strings, numbers, booleans) and handles complex nested structures and arrays.
* **Semantic JSDoc Documentation**: Generates `@typedef` and `@property` documentation blocks. It includes a "smart" description engine that analyzes key names (e.g., `id`, `email`, `created_at`) to provide context-aware comments for each field.
* **Markdown Schema Mapping**: Converts JSON structures into clean, readable Markdown tables, making it easy to paste API documentation directly into GitHub READMEs or technical wikis.

---

### Technical Architecture
The service is built with an emphasis on low-latency processing and clean separation of concerns:

* **Express.js Framework**: A lightweight backend implementation for handling high-concurrency POST requests.
* **Recursive Parsing Engine**: A custom algorithm that traverses deep JSON trees to ensure nested objects are extracted into their own modular interfaces or documentation blocks.
* **CORS Enabled**: Configured for seamless integration with frontend widgets, CLI tools, or local development environments.

---

### API Endpoints

#### `POST /api/convert`
The primary endpoint for data transformation.

**Request Body:**
```json
{
  "jsonBody": {
    "id": 1,
    "user_email": "dev@example.com",
    "settings": { 
      "is_active": true 
    }
  }
}
