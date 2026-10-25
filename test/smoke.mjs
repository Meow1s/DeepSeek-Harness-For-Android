import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-launcher-test-'))
const launcherPort = 3181
const workspace = path.join(temp, 'workspace')
await fs.mkdir(path.join(temp, 'logs'), { recursive: true })
await fs.mkdir(workspace, { recursive: true })
await fs.writeFile(path.join(temp, 'config.json'), JSON.stringify({
  profile: 'web',
  workspace,
  host: '127.0.0.1',
  port: 3190,
}, null, 2))

const output = []
const child = spawn(process.execPath, ['server.mjs', '--host', '127.0.0.1', '--port', String(launcherPort)], {
  cwd: root,
  env: {
    ...process.env,
    DSH_LAUNCHER_DATA: temp,
    DSH_LAUNCHER_DSH_COMMAND: path.join(root, 'test', 'mock-dsh.mjs'),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', (data) => output.push(String(data)))
child.stderr.on('data', (data) => output.push(String(data)))

let base = 'http://127.0.0.1:' + launcherPort
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let requests = 0

async function req(pathname, options = {}) {
  requests += 1
  const response = await fetch(base + pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const text = await response.text()
  let body = null
  try { body = JSON.parse(text) } catch {}
  return { response, text, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  let ready = false
  for (let i = 0; i < 80; i += 1) {
    try {
      const check = await fetch(base + '/healthz')
      if (check.ok) { ready = true; break }
    } catch {}
    await sleep(100)
  }
  assert(ready, 'launcher did not become ready')
  let status = (await req('/api/status')).body
  assert(status.phase === 'stopped', 'expected stopped, got ' + status.phase)
  assert(status.canStart === true, 'expected canStart')

  const started = await req('/api/start', { method: 'POST', body: '{}' })
  assert(started.response.ok, 'start failed: ' + started.text)
  status = started.body
  assert(status.phase === 'running', 'expected running, got ' + status.phase)
  assert(status.dsh.external === false, 'expected managed')
  assert(status.dsh.tokenReady === true, 'expected tokenReady')

  const open = await fetch(base + '/open', { redirect: 'manual' })
  assert(open.status === 302, 'expected /open 302')
  const location = open.headers.get('location') || ''
  assert(location.includes('127.0.0.1:3190'), 'bad redirect: ' + location)
  assert(location.includes('?token='), 'redirect missing token')

  const logs = (await req('/api/logs?lines=30')).body
  assert(logs.available, 'logs not available')
  assert(!logs.text.includes('mocktoken_'), 'token leaked in logs')

  const stopped = await req('/api/stop', { method: 'POST', body: '{}' })
  assert(stopped.response.ok, 'stop failed: ' + stopped.text)
  assert(stopped.body.phase === 'stopped', 'expected stopped after stop')

  const invalid = await req('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ port: 0 }),
  })
  assert(invalid.response.status === 400, 'expected 400 for invalid port')

  const settings = await req('/api/settings', {
    method: 'POST',
    body: JSON.stringify({ workspace, port: 3192 }),
  })
  assert(settings.response.ok, 'settings failed: ' + settings.text)
  assert(settings.body.config.port === 3192, 'port not saved')
  assert(settings.body.config.workspace === workspace, 'workspace not saved')

  const manifest = await (await fetch(base + '/manifest.webmanifest')).json()
  assert(manifest.name.includes('DSH'), 'manifest missing')

  const icon = await fetch(base + '/icons/icon-192.png')
  assert(icon.ok, 'icon missing')

  console.log('smoke: ok (' + requests + ' requests)')
} catch (error) {
  console.error('smoke: failed:', error.message)
  if (output.length) console.error(output.join('').slice(-4000))
  process.exitCode = 1
} finally {
  child.kill('SIGTERM')
  await sleep(300)
  try { child.kill('SIGKILL') } catch {}
  const managed = await fs.readFile(path.join(temp, 'managed.json'), 'utf8').catch(() => '')
  if (managed) {
    try {
      const data = JSON.parse(managed)
      process.kill(data.pid, 'SIGKILL')
    } catch {}
  }
  await fs.rm(temp, { recursive: true, force: true })
}
