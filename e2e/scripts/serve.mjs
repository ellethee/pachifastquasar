// Static server for the built playground (playground/dist/spa) with SPA fallback and an `/api` proxy to the backend.
// Usage: node scripts/serve.mjs   (env: E2E_APP_PORT default 9100, COMPAT_PORT default 8030)
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../../playground/dist/spa', import.meta.url)))
if (!existsSync(join(root, 'index.html'))) {
  console.error('playground/dist/spa not found: run `pnpm build:playground` first')
  process.exit(1)
}
const port = Number(process.env.E2E_APP_PORT ?? 9100)
const backendPort = Number(process.env.COMPAT_PORT ?? 8030)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

/**
 * Forwards a request to the backend.
 * @param {import('node:http').IncomingMessage} req - incoming request
 * @param {import('node:http').ServerResponse} res - response
 */
function proxy(req, res) {
  const upstream = request(
    { host: '127.0.0.1', port: backendPort, path: req.url, method: req.method, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers)
      up.pipe(res)
    },
  )
  upstream.on('error', () => {
    res.writeHead(502)
    res.end('backend unreachable')
  })
  req.pipe(upstream)
}

/**
 * Serves a static file or falls back to index.html (history mode).
 * @param {import('node:http').IncomingMessage} req - incoming request
 * @param {import('node:http').ServerResponse} res - response
 */
function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  let file = join(root, normalize(pathname))
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) file = join(root, 'index.html')
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}

createServer((req, res) => {
  if ((req.url ?? '').startsWith('/api')) proxy(req, res)
  else serveStatic(req, res)
}).listen(port, '127.0.0.1', () => console.log(`playground on http://127.0.0.1:${port}`))
