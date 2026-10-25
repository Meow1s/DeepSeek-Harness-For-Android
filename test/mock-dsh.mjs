#!/usr/bin/env node
import http from 'node:http'

const args = process.argv.slice(2)
const read = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}
const port = Number(read('--port', '3190'))
const token = 'mocktoken_' + process.pid + '_' + Math.random().toString(36).slice(2, 12)
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.searchParams.get('token') === token) {
    res.writeHead(303, {
      Location: './',
      'Set-Cookie': 'mock-auth=1; Path=/; HttpOnly; SameSite=Strict',
    })
    return res.end()
  }
  if (url.pathname !== '/') {
    res.writeHead(404)
    return res.end('not found')
  }
  if (String(req.headers.cookie || '').includes('mock-auth=1')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end('<!doctype html><title>DeepSeek Harness Mock</title><body style="background:#0b0d14;color:#fff;font:16px system-ui;padding:24px"><h1>Mock DSH</h1><p>嵌入模式工作正常。</p></body>')
  }
  res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('dsh web authentication required; reopen the URL printed by dsh web.')
})
server.listen(port, '127.0.0.1', () => {
  console.log('dsh web: http://127.0.0.1:' + port + '/?token=' + token)
})
process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('SIGINT', () => server.close(() => process.exit(0)))
