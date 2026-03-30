const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.join(process.cwd(), 'dist')
const port = Number(process.env.PORT || 4173)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
}

const server = http.createServer((request, response) => {
  const requestPath = (request.url || '/').split('?')[0]
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath
  const filePath = path.join(root, normalizedPath.replace(/^\/+/, ''))

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.statusCode = 404
      response.end('not found')
      return
    }

    const extension = path.extname(filePath)
    response.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream')
    response.end(data)
  })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`ReadFlow static server listening on http://127.0.0.1:${port}`)
})
