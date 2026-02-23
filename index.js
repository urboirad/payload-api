const express = require('express');
const cors = require('cors');
const {
  buildInterfaces,
  buildJsDoc,
  buildMarkdown,
  parseJsonBody,
} = require('./lib/converter');

const app = express();

app.use(cors());
app.use(express.json());

// --- Security: optional API key + simple rate limiting ---

const allowedKeys = process.env.API_KEYS
  ? process.env.API_KEYS.split(',').map((k) => k.trim()).filter(Boolean)
  : null;

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);

const rateBuckets = new Map();

const getClientKey = (req) => {
  return (
    req.header('x-api-key') ||
    req.query.apiKey ||
    req.ip ||
    'anonymous'
  );
};

const applySecurity = (req, res, next) => {
  const key = getClientKey(req);

  if (allowedKeys && allowedKeys.length) {
    if (!key || !allowedKeys.includes(String(key))) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      });
    }
  }

  const now = Date.now();
  const bucketKey = allowedKeys ? key : req.ip;
  const bucket = rateBuckets.get(bucketKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  rateBuckets.set(bucketKey, bucket);

  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }

  return next();
};

// --- API Endpoints ---

// Health check for uptime pings and monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'payload-api' });
});

// Primary conversion endpoint
app.post('/api/convert', applySecurity, (req, res) => {
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
app.post('/api/convert-all', applySecurity, (req, res) => {
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