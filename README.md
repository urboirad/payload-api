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


  ---

  ### Additional Endpoints

  #### `GET /health`

  Simple health-check endpoint for uptime and monitoring.

  **Response:**

  ```json
  {
    "status": "ok",
    "name": "payload-api"
  }
  ```

  #### `POST /api/convert-all`

  Backwards-compatible endpoint that always returns TypeScript, JSDoc, and Markdown using a default root type name `GeneratedType`.

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
  ```

  ---

  ### Security and Rate Limiting

  The conversion endpoints (`/api/convert` and `/api/convert-all`) support optional API key authentication and simple in-memory rate limiting.

  Configure allowed API keys via environment variable:

  ```bash
  export API_KEYS="key1,key2,another-key"
  ```

  Clients must then send either:

  - Header: `X-API-Key: key1`
  - Query string: `?apiKey=key1`

  If `API_KEYS` is not set, the service does **not** enforce API key checks (useful for local development).

  Rate limiting is also configurable via environment variables:

  ```bash
  export RATE_LIMIT_WINDOW_MS=60000   # 1 minute window (default)
  export RATE_LIMIT_MAX=60            # max requests per window (default)
  ```

  If a client exceeds the limit, the API responds with:

  ```json
  {
    "error": "Too Many Requests",
    "message": "Rate limit exceeded. Please try again later."
  }
  ```

  The health endpoint (`/health`) is intentionally left open.

  ---

  ### CLI Usage

  Payload also ships with a CLI that uses the same conversion engine as the HTTP API.

  Run it via `npx` without global install:

  ```bash
  npx payload-api ./example.json
  ```

  Or via the npm script in this repo:

  ```bash
  npm run cli -- ./example.json --rootName UserPayload --emit typescript,markdown
  ```

  After installing this package globally, you can call it directly:

  ```bash
  payload-api ./example.json --rootName UserPayload --emit typescript,jsdoc,markdown
  ```

  **Flags:**

  - First positional argument: path to a JSON file.
  - `--rootName <Name>` – sets the root interface/typedef name (default `RootObject`).
  - `--emit <list>` – comma-separated list of outputs to generate: `typescript`, `jsdoc`, `markdown`.

  The CLI prints three sections to stdout:

  - `=== TypeScript Interfaces ===`
  - `=== JSDoc Typedef ===`
  - `=== Markdown Schema ===`

  You can pipe or redirect this output into files, editors, or documentation generators.
