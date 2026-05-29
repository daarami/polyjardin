import jsonServer from 'json-server';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// CORS: permite peticiones desde Vercel y localhost
const allowedOrigins = [
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

server.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const allowed = allowedOrigins.some((pattern) =>
    typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
  );
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

server.use(middlewares);
server.use(router);

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`PoliJardin backend running on port ${PORT}`);
});
