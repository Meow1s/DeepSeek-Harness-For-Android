#!/usr/bin/env node
/**
 * DSH Pocket Launcher
 * -------------------
 * A dependency-free, mobile-first launcher and control panel for
 * DeepSeek Harness (DSH) Web.
 *
 * It can adopt an already-running dsh web instance (using the token printed
 * in the DSH logs), or start and supervise its own detached instance.
 */

import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const APP_NAME = 'DSH Pocket Launcher'
const APP_VERSION = '1.0.0'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(__dirname, 'public')
const DATA_DIR = path.resolve(process.env.DSH_LAUNCHER_DATA || path.join(__dirname, 'data'))
const LOG_DIR = path.join(DATA_DIR, 'logs')
const CONFIG_PATH = path.join(DATA_DIR, 'config.json')
const STATE_PATH = path.join(DATA_DIR, 'managed.json')
const ACCESS_KEY_PATH = path.join(DATA_DIR, 'access-key')
const PID_PATH = path.join(DATA_DIR, 'launcher.pid')
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const DSH_PROFILES_DIR = path.join(DSH_HOME, 'profiles')
const DSH_WORKSPACE_STORE = path.join(DSH_HOME, 'storages', 'workspace.json')
const DSH_SESSION_CACHE = path.join(DSH_HOME, 'storages', 'session_projcache', 'sessions')

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
])

const DEFAULT_CONFIG = Object.freeze({
  profile: 'web',
  workspace: '/root',
  host: '127.0.0.1',
  port: 3080,
})

class HttpError extends Error {
  constructor(status, message, code = '') {
    super(message)
    this.status = status
    this.code = code
  }
}

function now() {
  return Date.now()
}

function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost'
}

function formatHost(host) {
  return net.isIPv6(host) ? '[' + host + ']' : host
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return crypto.timingSafeEqual(aa, bb)
}

function parseCookies(header) {
  const result = {}
  if (!header) return result
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) result[key] = decodeURIComponent(value)
  }
  return result
}

function parseArgs(argv) {
  const options = {
    host: process.env.DSH_LAUNCHER_HOST || '127.0.0.1',
    port: Number(process.env.DSH_LAUNCHER_PORT || 3081),
    accessKey: process.env.DSH_LAUNCHER_ACCESS_KEY || '',
    help: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--host') {
      if (i + 1 >= argv.length) throw new Error('--host 缺少参数')
      options.host = argv[++i]
    } else if (arg === '--port') {
      if (i + 1 >= argv.length) throw new Error('--port 缺少参数')
      options.port = Number(argv[++i])
    } else if (arg === '--access-key') {
      if (i + 1 >= argv.length) throw new Error('--access-key 缺少参数')
      options.accessKey = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error('未知参数: ' + arg)
    }
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error('启动器端口无效: ' + options.port)
  }
  if (!options.host || typeof options.host !== 'string') throw new Error('启动器监听地址无效')
  return options
}

function printHelp() {
  console.log([
    APP_NAME + ' ' + APP_VERSION,
    '',
    '用法:',
    '  node server.mjs [options]',
    '',
    '选项:',
    '  --host <地址>        启动器监听地址，默认 127.0.0.1',
    '  --port <端口>        启动器端口，默认 3081',
    '  --access-key <密钥>  监听非回环地址时使用的访问密钥',
    '  --help              显示帮助',
    '',
    '环境变量:',
    '  DSH_LAUNCHER_DATA             数据目录（默认 ./data）',
    '  DSH_LAUNCHER_HOST             同 --host',
    '  DSH_LAUNCHER_PORT             同 --port',
    '  DSH_LAUNCHER_ACCESS_KEY       同 --access-key',
    '  DSH_LAUNCHER_DSH_COMMAND      dsh 可执行文件（默认 dsh）',
  ].join('\n'))
}

async function ensureDataDirs() {
  await fsp.mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
  await fsp.mkdir(LOG_DIR, { recursive: true, mode: 0o700 })
  await fsp.chmod(DATA_DIR, 0o700).catch(() => {})
  await fsp.chmod(LOG_DIR, 0o700).catch(() => {})
}

async function isDirectory(target) {
  try {
    return (await fsp.stat(target)).isDirectory()
  } catch {
    return false
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

async function writeJsonAtomic(file, value) {
  const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp'
  const text = JSON.stringify(value, null, 2) + '\n'
  await fsp.writeFile(tmp, text, { mode: 0o600 })
  await fsp.chmod(tmp, 0o600).catch(() => {})
  await fsp.rename(tmp, file)
  await fsp.chmod(file, 0o600).catch(() => {})
}

async function readOrCreateAccessKey(explicit) {
  if (explicit) return explicit
  try {
    const saved = (await fsp.readFile(ACCESS_KEY_PATH, 'utf8')).trim()
    if (saved.length >= 16) return saved
  } catch {}
  const key = crypto.randomBytes(24).toString('base64url')
  await fsp.writeFile(ACCESS_KEY_PATH, key + '\n', { mode: 0o600 })
  await fsp.chmod(ACCESS_KEY_PATH, 0o600).catch(() => {})
  return key
}

async function loadConfig() {
  const raw = await readJson(CONFIG_PATH, {})
  const config = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) }

  if (typeof config.profile !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(config.profile)) {
    config.profile = DEFAULT_CONFIG.profile
  }
  if (typeof config.workspace !== 'string' || !path.isAbsolute(config.workspace)) {
    config.workspace = DEFAULT_CONFIG.workspace
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    config.port = DEFAULT_CONFIG.port
  }
  if (typeof config.host !== 'string' || !config.host || config.host === '0.0.0.0' || config.host === '::') {
    config.host = DEFAULT_CONFIG.host
  }

  if (!(await isDirectory(config.workspace))) {
    if (await isDirectory(DEFAULT_CONFIG.workspace)) config.workspace = DEFAULT_CONFIG.workspace
    else if (await isDirectory('/workspace')) config.workspace = '/workspace'
    else config.workspace = os.homedir()
  }
  return config
}

async function saveConfig(config) {
  await writeJsonAtomic(CONFIG_PATH, config)
}

function localAddresses() {
  const addresses = ['127.0.0.1']
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address)
    }
  }
  return [...new Set(addresses)]
}

function isLocalBindAddress(host) {
  return localAddresses().includes(host)
}

async function tailFile(file, maxLines = 180, maxBytes = 256 * 1024) {
  let handle
  try {
    handle = await fsp.open(file, 'r')
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size === 0) return ''
    const start = Math.max(0, stat.size - maxBytes)
    const length = stat.size - start
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, start)
    let text = buffer.toString('utf8')
    if (start > 0) {
      const firstNewline = text.indexOf('\n')
      text = firstNewline >= 0 ? text.slice(firstNewline + 1) : ''
    }
    return text.split(/\r?\n/).slice(-maxLines).join('\n')
  } catch {
    return ''
  } finally {
    await handle?.close().catch(() => {})
  }
}

function redact(text) {
  return String(text || '')
    .replace(/([?&]token=)[A-Za-z0-9_-]{12,}/g, '$1••••••')
    .replace(/(Authorization:\s*Bearer\s+)[^\s]+/gi, '$1••••••')
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, 'sk-••••••')
}

function extractToken(text) {
  const matches = [...String(text || '').matchAll(/[?&]token=([A-Za-z0-9_-]{16,})/g)]
  return matches.length ? matches[matches.length - 1][1] : null
}

function localRequest(host, port, urlPath, options = {}) {
  const timeout = options.timeout || 1200
  const connectHost = host === 'localhost' ? '127.0.0.1' : host
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const req = http.request(
      {
        host: connectHost,
        port,
        path: urlPath,
        method: 'GET',
        timeout,
        headers: { Accept: 'text/html,application/json;q=0.8,*/*;q=0.5' },
      },
      (res) => {
        const chunks = []
        let size = 0
        res.on('data', (chunk) => {
          if (size < 128 * 1024) {
            chunks.push(chunk)
            size += chunk.length
          }
        })
        res.on('end', () => {
          finish({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
        res.on('error', () => finish(null))
      },
    )
    req.on('timeout', () => {
      req.destroy()
      finish(null)
    })
    req.on('error', () => finish(null))
    req.end()
  })
}

function tcpProbe(host, port, timeout = 700) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const socket = net.connect({ host: host === 'localhost' ? '127.0.0.1' : host, port })
    socket.setTimeout(timeout)
    socket.once('connect', () => {
      socket.destroy()
      finish(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      finish(false)
    })
    socket.once('error', () => finish(false))
  })
}

async function probeDsh(host, port) {
  const result = await localRequest(host, port, '/', { timeout: 1100 })
  if (!result) return { running: false, status: 0 }
  const body = result.body || ''
  const isDsh =
    (result.status === 401 && /dsh web authentication required/i.test(body)) ||
    (result.status === 200 && /DeepSeek Harness|__DSH_|dsh web/i.test(body)) ||
    result.status === 303
  return { running: isDsh, status: result.status, otherService: !isDsh }
}

const tokenValidationCache = new Map()
const resetPageAvailability = new Map()

async function hasResetPage(host, port) {
  const key = host + ':' + port
  const cached = resetPageAvailability.get(key)
  if (cached && now() - cached.at < 30_000) return cached.ok
  const result = await localRequest(host, port, '/dsh-pocket-reset.html', { timeout: 800 })
  const ok = Boolean(result && result.status === 200 && /dsh-pocket-reset/.test(result.body || ''))
  resetPageAvailability.set(key, { ok, at: now() })
  return ok
}

async function validateToken(host, port, token) {
  if (!token) return false
  const cacheKey = host + '\u0000' + port + '\u0000' + token
  const cached = tokenValidationCache.get(cacheKey)
  if (cached && now() - cached < 15_000) return true
  const result = await localRequest(host, port, '/?token=' + encodeURIComponent(token), { timeout: 1600 })
  const ok = Boolean(result && (result.status === 302 || result.status === 303))
  if (ok) tokenValidationCache.set(cacheKey, now())
  return ok
}

async function listLogFiles() {
  const files = new Map()
  const add = async (file) => {
    if (!file) return
    try {
      const stat = await fsp.stat(file)
      if (stat.isFile()) files.set(path.resolve(file), stat.mtimeMs)
    } catch {}
  }
  const addDir = async (dir, match) => {
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        if (!match(entry.name)) continue
        await add(path.join(dir, entry.name))
      }
    } catch {}
  }

  if (instance?.logPath) await add(instance.logPath)
  await addDir(LOG_DIR, (name) => name.endsWith('.log'))
  await addDir('/workspace/daemon', (name) => /^dm_.*\.log$/.test(name))
  await addDir('/workspace/dsh', (name) => name.endsWith('.log'))
  await add('/workspace/start-dsh.log')

  return [...files.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([file, mtime]) => ({ file, mtime }))
}

let lastTokenLookupAt = 0
async function findTokenForPort(host, port) {
  if (now() - lastTokenLookupAt < 3500) {
    return instance?.port === port && (instance.host || config.host) === host ? instance.token : null
  }
  lastTokenLookupAt = now()
  const logs = await listLogFiles()
  let checked = 0
  for (const log of logs.slice(0, 12)) {
    const text = await tailFile(log.file, 240, 256 * 1024)
    if (!text) continue
    const tokens = [...text.matchAll(/[?&]token=([A-Za-z0-9_-]{16,})/g)].map((match) => match[1])
    const unique = [...new Set(tokens.reverse())].slice(0, 6)
    for (const token of unique) {
      checked += 1
      if (checked > 20) return null
      if (await validateToken(host, port, token)) return token
    }
  }
  return null
}

function isAlive(pid) {
  if (!pid || !Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function killGroup(pid, signal) {
  if (!pid) return false
  try {
    process.kill(-pid, signal)
    return true
  } catch {}
  try {
    process.kill(pid, signal)
    return true
  } catch {}
  return false
}

async function listProfiles() {
  const names = []
  try {
    const entries = await fsp.readdir(DSH_PROFILES_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (!/^[A-Za-z0-9._-]{1,64}$/.test(entry.name)) continue
      let webCapable = entry.name === 'web'
      try {
        const pkg = JSON.parse(await fsp.readFile(path.join(DSH_PROFILES_DIR, entry.name, 'package.json'), 'utf8'))
        const bundles = pkg?.dsh?.profile?.bundles || []
        webCapable = webCapable || bundles.includes('@deepseek-ai/dsh-web-app')
      } catch {}
      if (webCapable) names.push({ name: entry.name, label: entry.name })
    }
  } catch {}
  if (!names.some((item) => item.name === 'web')) names.unshift({ name: 'web', label: 'web' })
  names.sort((a, b) => (a.name === 'web' ? -1 : b.name === 'web' ? 1 : a.name.localeCompare(b.name)))
  return names
}

async function listWorkspaces() {
  const found = new Map()
  const add = async (workspacePath, title) => {
    if (typeof workspacePath !== 'string' || !path.isAbsolute(workspacePath)) return
    if (!(await isDirectory(workspacePath))) return
    if (!found.has(workspacePath)) {
      found.set(workspacePath, {
        path: workspacePath,
        title: title || path.basename(workspacePath) || workspacePath,
      })
    }
  }
  try {
    const store = await readJson(DSH_WORKSPACE_STORE, null)
    for (const workspace of Object.values(store?.tables?.workspaces || {})) {
      await add(workspace?.path, workspace?.title)
    }
  } catch {}
  await add(config.workspace, path.basename(config.workspace) || config.workspace)
  await add('/root', 'root')
  await add('/workspace', 'workspace')
  return [...found.values()].slice(0, 16)
}

let sessionCache = { at: 0, value: [] }

async function listSessions() {
  if (now() - sessionCache.at < 10_000) return sessionCache.value
  const sessions = []
  try {
    const entries = await fsp.readdir(DSH_SESSION_CACHE, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const file = path.join(DSH_SESSION_CACHE, entry.name)
      try {
        const stat = await fsp.stat(file)
        files.push({ file, id: entry.name.slice(0, -5), mtime: stat.mtimeMs })
      } catch {}
    }
    files.sort((a, b) => b.mtime - a.mtime)
    for (const item of files.slice(0, 20)) {
      if (sessions.length >= 6) break
      try {
        const data = JSON.parse(await fsp.readFile(item.file, 'utf8'))
        const rows = data?.record?.rows || {}
        const title = rows.title?.val || rows.titleInput?.val?.first?.text || ''
        if (!title || typeof title !== 'string') continue
        const cwd = data?.record?.identity?.cwd || ''
        sessions.push({
          id: item.id,
          title: title.slice(0, 120),
          workspace: typeof cwd === 'string' ? cwd : '',
          updatedAt: item.mtime,
        })
      } catch {}
    }
  } catch {}
  sessionCache = { at: now(), value: sessions }
  return sessions
}

function phaseOf() {
  if (stopPromise) return 'stopping'
  if (startPromise) return 'starting'
  if (instance) return 'running'
  if (lastError) return 'error'
  return 'stopped'
}

async function getStatus() {
  await refreshInstance()
  const phase = phaseOf()
  const current = instance
  const canStart = !current && !startPromise && !stopPromise
  const canStop = Boolean(current && !current.external && !startPromise && !stopPromise)
  const canRestart = Boolean(current && !current.external && !startPromise && !stopPromise)
  const sessions = await listSessions()
  const profiles = await listProfiles()
  const workspaces = await listWorkspaces()

  return {
    ok: true,
    app: { name: APP_NAME, version: APP_VERSION },
    now: now(),
    phase,
    launcher: {
      host: options.host,
      port: options.port,
      localOnly: isLoopbackHost(options.host),
      authRequired: Boolean(accessKey),
      addresses: localAddresses(),
    },
    config: {
      profile: config.profile,
      workspace: config.workspace,
      host: config.host,
      port: config.port,
      nextStartProfile: config.profile,
      nextStartWorkspace: config.workspace,
      nextStartPort: config.port,
    },
    dsh: current
      ? {
          pid: current.external ? null : current.pid,
          port: current.port,
          host: current.host || config.host,
          profile: current.profile || config.profile,
          workspace: current.workspace || config.workspace,
          startedAt: current.startedAt || null,
          uptimeMs: current.startedAt ? Math.max(0, now() - current.startedAt) : null,
          external: Boolean(current.external),
          tokenReady: Boolean(current.token),
          logAvailable: Boolean(current.logPath),
        }
      : null,
    canStart,
    canStop,
    canRestart,
    starting: startState.active
      ? { stage: startState.stage, startedAt: startState.startedAt }
      : null,
    stopping: Boolean(stopPromise),
    lastError: lastError || '',
    profiles,
    workspaces,
    sessions,
    networkHosts: localAddresses(),
    counts: {
      sessions: sessions.length,
      profiles: profiles.length,
    },
  }
}

async function refreshInstance(optionsRefresh = {}) {
  if (startPromise || stopPromise) return instance
  if (!optionsRefresh.force && now() - lastRefreshAt < 700) return instance
  lastRefreshAt = now()

  if (instance) {
    const probe = await probeDsh(instance.host || config.host, instance.port)
    if (!probe.running) {
      instanceMisses += 1
      if (instanceMisses >= 2) {
        if (!instance.external) lastError = 'DSH 进程已退出，请重新启动。'
        instance = null
        instanceMisses = 0
        await fsp.rm(STATE_PATH, { force: true }).catch(() => {})
      }
      return instance
    }
    instanceMisses = 0
    instance.lastSeenAt = now()
    if (!instance.token || !(await validateToken(instance.host || config.host, instance.port, instance.token))) {
      const token = await findTokenForPort(instance.host || config.host, instance.port)
      instance.token = token || null
    }
    return instance
  }

  const probe = await probeDsh(config.host, config.port)
  if (!probe.running) return null
  const token = await findTokenForPort(config.host, config.port)
  instance = {
    pid: null,
    port: config.port,
    host: config.host,
    profile: config.profile,
    workspace: config.workspace,
    startedAt: null,
    token,
    external: true,
    logPath: null,
  }
  instanceMisses = 0
  return instance
}

async function restoreManagedState() {
  const saved = await readJson(STATE_PATH, null)
  if (!saved || !Number.isInteger(saved.pid) || !Number.isInteger(saved.port)) return
  if (!isAlive(saved.pid)) {
    await fsp.rm(STATE_PATH, { force: true }).catch(() => {})
    return
  }
  const savedHost = saved.host || config.host
  const probe = await probeDsh(savedHost, saved.port)
  if (!probe.running) {
    await fsp.rm(STATE_PATH, { force: true }).catch(() => {})
    return
  }
  let token = typeof saved.token === 'string' ? saved.token : null
  if (token && !(await validateToken(savedHost, saved.port, token))) token = null
  if (!token) token = await findTokenForPort(savedHost, saved.port)
  instance = {
    pid: saved.pid,
    port: saved.port,
    host: saved.host || config.host,
    profile: saved.profile || config.profile,
    workspace: saved.workspace || config.workspace,
    startedAt: saved.startedAt || null,
    token,
    external: false,
    logPath: saved.logPath || null,
  }
}

async function validateConfigForStart() {
  if (!(await isDirectory(config.workspace))) {
    throw new HttpError(400, '工作区不存在: ' + config.workspace)
  }
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(config.profile)) {
    throw new HttpError(400, 'Profile 名称无效')
  }
  if (!isLocalBindAddress(config.host)) {
    throw new HttpError(400, '监听地址必须是本机地址: ' + config.host)
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new HttpError(400, '端口无效')
  }
}

async function startDsh() {
  if (startPromise) return startPromise
  startPromise = (async () => {
    startState = { active: true, stage: '检查运行环境', startedAt: now(), error: '' }
    lastError = ''
    let child = null
    let logPath = null
    try {
      await refreshInstance({ force: true })
      if (instance) {
        throw new HttpError(409, 'DSH 已在运行，直接进入即可。', 'ALREADY_RUNNING')
      }
      await validateConfigForStart()

      if (await tcpProbe(config.host, config.port)) {
        throw new HttpError(409, '端口 ' + config.port + ' 已被占用，请换一个端口。', 'PORT_IN_USE')
      }

      const command = process.env.DSH_LAUNCHER_DSH_COMMAND || 'dsh'
      const args = [
        '--profile',
        config.profile,
        '--host',
        config.host,
        '--port',
        String(config.port),
        '--no-open',
      ]
      if (!isLoopbackHost(config.host)) {
        args.push('--trusted-host', formatHost(config.host) + ':' + config.port)
      }

      const logName = 'dsh-' + new Date().toISOString().replace(/[:.]/g, '-') + '.log'
      logPath = path.join(LOG_DIR, logName)
      lastLogPath = logPath
      const fd = fs.openSync(logPath, 'a', 0o600)
      fs.chmodSync(logPath, 0o600)
      const env = { ...process.env }
      for (const key of ['DSH_WEB_URL', 'DSH_PROFILE', 'DSH_PROFILE_DIR', 'DSH_SESSION_ID', 'DSH_SHELL']) {
        delete env[key]
      }

      startState.stage = '拉起 DSH 进程'
      try {
        child = spawn(command, args, {
          cwd: config.workspace,
          env,
          detached: true,
          stdio: ['ignore', fd, fd],
        })
      } finally {
        fs.closeSync(fd)
      }

      let exitInfo = null
      let spawnError = null
      child.once('exit', (code, signal) => {
        exitInfo = { code, signal }
      })
      child.once('error', (error) => {
        spawnError = error
      })
      child.unref()

      startState.stage = '等待 DSH Web 就绪'
      let token = null
      let stageAt = now()
      const deadline = now() + 75_000
      while (now() < deadline) {
        if (spawnError) throw new HttpError(500, '无法启动 dsh: ' + spawnError.message)
        if (exitInfo) break
        const text = await tailFile(logPath, 240, 384 * 1024)
        const candidate = extractToken(text)
        if (candidate) {
          startState.stage = '验证访问令牌'
          if (await validateToken(config.host, config.port, candidate)) {
            token = candidate
            break
          }
        }
        if (now() - stageAt > 6000) {
          startState.stage = '等待 DSH Web 就绪'
          stageAt = now()
        }
        await delay(250)
      }

      if (!token) {
        const logTail = redact(await tailFile(logPath, 30, 12 * 1024))
        let reason = 'DSH 启动超时（75 秒）。'
        if (spawnError) reason = '无法启动 dsh: ' + spawnError.message
        else if (exitInfo) reason = 'DSH 进程已退出（' + (exitInfo.code ?? 'signal ' + exitInfo.signal) + '）。'
        else if (logTail) reason = '未能获取 DSH 访问令牌。'
        throw new HttpError(500, reason + (logTail ? '\n\n' + logTail.slice(-900) : ''), 'START_FAILED')
      }

      startState.stage = '就绪'
      instance = {
        pid: child.pid,
        port: config.port,
        host: config.host,
        profile: config.profile,
        workspace: config.workspace,
        startedAt: now(),
        token,
        external: false,
        logPath,
      }
      instanceMisses = 0
      await writeJsonAtomic(STATE_PATH, instance)

      return instance
    } catch (error) {
      if (child && child.pid) {
        if (!child.killed) killGroup(child.pid, 'SIGTERM')
      }
      const message = error instanceof Error ? error.message : String(error)
      if (!(error instanceof HttpError && error.code === 'ALREADY_RUNNING')) lastError = message
      startState.error = message
      throw error instanceof HttpError ? error : new HttpError(500, message, 'START_FAILED')
    } finally {
      startState.active = false
      startState.stage = ''
      startPromise = null
    }
  })()
  return startPromise
}

async function stopDsh() {
  if (stopPromise) return stopPromise
  stopPromise = (async () => {
    await refreshInstance({ force: true })
    if (!instance) throw new HttpError(409, 'DSH 当前没有运行。', 'NOT_RUNNING')
    if (instance.external) {
      throw new HttpError(409, '这个 DSH 是从启动器外部拉起的，启动器不会结束它。请从原启动位置停止。', 'EXTERNAL_INSTANCE')
    }
    const pid = instance.pid
    stopState.active = true
    const stopped = killGroup(pid, 'SIGTERM')
    if (!stopped) {
      instance = null
      await fsp.rm(STATE_PATH, { force: true }).catch(() => {})
      throw new HttpError(500, '无法向 DSH 进程发送停止信号。')
    }
    const deadline = now() + 10_000
    while (now() < deadline && isAlive(pid)) await delay(200)
    if (isAlive(pid)) {
      killGroup(pid, 'SIGKILL')
      const killDeadline = now() + 2500
      while (now() < killDeadline && isAlive(pid)) await delay(150)
    }
    if (isAlive(pid)) throw new HttpError(500, 'DSH 进程未能停止。', 'STOP_FAILED')
    instance = null
    lastError = ''
    await fsp.rm(STATE_PATH, { force: true }).catch(() => {})
  })().finally(() => {
    stopState.active = false
    stopPromise = null
  })
  return stopPromise
}

async function restartDsh() {
  if (startPromise || stopPromise) throw new HttpError(409, '正在处理中，请稍候。', 'BUSY')
  await refreshInstance({ force: true })
  if (!instance) return startDsh()
  if (instance.external) {
    throw new HttpError(409, '外部拉起的 DSH 不能由启动器重启。', 'EXTERNAL_INSTANCE')
  }
  await stopDsh()
  return startDsh()
}

async function getLogs(lines) {
  const count = Math.min(500, Math.max(20, Number(lines) || 180))
  const current = instance?.logPath || lastLogPath
  let file = current
  if (!file || !fs.existsSync(file)) {
    const logs = await listLogFiles()
    file = logs[0]?.file || null
  }
  if (!file) return { available: false, source: '', text: '', hint: '还没有 DSH 日志。' }
  const text = redact(await tailFile(file, count, 384 * 1024))
  return { available: true, source: path.basename(file), text, hint: '' }
}

function validateSettings(body) {
  const next = { ...config }
  if (body.profile !== undefined) {
    if (typeof body.profile !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(body.profile)) {
      throw new HttpError(400, 'Profile 名称无效。')
    }
    next.profile = body.profile
  }
  if (body.workspace !== undefined) {
    if (typeof body.workspace !== 'string' || !path.isAbsolute(body.workspace)) {
      throw new HttpError(400, '工作区必须是绝对路径。')
    }
    next.workspace = body.workspace
  }
  if (body.port !== undefined) {
    const port = Number(body.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new HttpError(400, '端口必须在 1–65535 之间。')
    }
    next.port = port
  }
  if (body.host !== undefined) {
    if (typeof body.host !== 'string' || !isLocalBindAddress(body.host)) {
      throw new HttpError(400, '监听地址必须是本机 IPv4 地址。')
    }
    next.host = body.host
  }
  return next
}

async function applySettings(body) {
  const next = validateSettings(body)
  if (!(await isDirectory(next.workspace))) {
    throw new HttpError(400, '工作区不存在: ' + next.workspace)
  }
  const currentProfileNames = (await listProfiles()).map((item) => item.name)
  if (!currentProfileNames.includes(next.profile) && next.profile !== 'web') {
    throw new HttpError(400, '找不到这个 Profile: ' + next.profile)
  }
  config = next
  await saveConfig(config)
  sessionCache = { at: 0, value: [] }
  return config
}

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 64 * 1024) throw new HttpError(413, '请求体过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not object')
    return value
  } catch {
    throw new HttpError(400, 'JSON 请求体无效')
  }
}

function json(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  })
  res.end(body)
}

function html(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

function commonHeaders() {
  const frameHosts = new Set(['127.0.0.1', 'localhost'])
  if (config.host && !isLoopbackHost(config.host) && net.isIPv4(config.host)) frameHosts.add(config.host)
  if (instance?.host && !isLoopbackHost(instance.host) && net.isIPv4(instance.host)) frameHosts.add(instance.host)
  const frameSources = [
    "'self'",
    ...[...frameHosts].map((host) => 'http://' + host + ':*'),
  ]
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "frame-src " + frameSources.join(' '),
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  }
}

function isAuthorized(req) {
  if (!accessKey) return true
  const cookies = parseCookies(req.headers.cookie)
  return safeEqual(cookies.dsh_launcher, accessKey)
}

function sendUnauthorized(res) {
  const body = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>需要访问密钥</title><body style="font:16px system-ui;padding:32px;background:#070b14;color:#eef2ff"><h1>需要访问密钥</h1><p>请使用启动器启动时打印的带 <code>?key=…</code> 的地址打开。</p>'
  html(res, 401, body)
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const parsed = new URL(origin)
    return parsed.host === req.headers.host
  } catch {
    return false
  }
}

function requireSameOrigin(req) {
  if (!sameOrigin(req)) throw new HttpError(403, '跨站请求被拒绝')
  const site = req.headers['sec-fetch-site']
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, '跨站请求被拒绝')
}

async function handleApi(req, res, url) {
  const pathname = url.pathname
  if (req.method === 'GET' && pathname === '/api/status') {
    return json(res, 200, await getStatus())
  }
  if (req.method === 'GET' && pathname === '/api/logs') {
    return json(res, 200, { ok: true, ...(await getLogs(url.searchParams.get('lines'))) })
  }
  if (req.method === 'POST' && pathname === '/api/start') {
    requireSameOrigin(req)
    await readJsonBody(req)
    await startDsh()
    return json(res, 200, await getStatus())
  }
  if (req.method === 'POST' && pathname === '/api/stop') {
    requireSameOrigin(req)
    await readJsonBody(req)
    await stopDsh()
    return json(res, 200, await getStatus())
  }
  if (req.method === 'POST' && pathname === '/api/restart') {
    requireSameOrigin(req)
    await readJsonBody(req)
    await restartDsh()
    return json(res, 200, await getStatus())
  }
  if (req.method === 'POST' && pathname === '/api/settings') {
    requireSameOrigin(req)
    const body = await readJsonBody(req)
    await applySettings(body)
    return json(res, 200, await getStatus())
  }
  if (req.method === 'POST' && pathname === '/api/dismiss') {
    requireSameOrigin(req)
    await readJsonBody(req)
    lastError = ''
    return json(res, 200, await getStatus())
  }
  throw new HttpError(404, '接口不存在')
}

async function openDsh(req, res) {
  const current = instance
  if (!current) {
    return html(res, 503, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSH 未启动</title><body style="font:16px system-ui;padding:32px;background:#070b14;color:#eef2ff"><h1>DSH 还没有启动</h1><p>回到 <a style="color:#8ea2ff" href="/">启动器</a> 点一下启动按钮。</p>')
  }
  if (!current.token) {
    return html(res, 503, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>缺少 DSH 令牌</title><body style="font:16px system-ui;padding:32px;background:#070b14;color:#eef2ff"><h1>找不到 DSH 访问令牌</h1><p>这个 DSH 是外部启动的，启动器没有在日志里找到访问令牌。</p><p><a style="color:#8ea2ff" href="/">返回启动器</a>，重启 DSH 后再试。</p>')
  }
  const requestedHost = String(req.headers.host || '').split(':')[0].toLowerCase()
  const loopbackAlias = requestedHost === 'localhost' ? 'localhost' : '127.0.0.1'
  const host = isLoopbackHost(current.host || config.host) ? loopbackAlias : (current.host || config.host)
  const encodedToken = encodeURIComponent(current.token)
  const resetAvailable = await hasResetPage(host, current.port)
  const pathname = resetAvailable
    ? '/dsh-pocket-reset.html?token=' + encodedToken
    : '/?token=' + encodedToken
  const target = 'http://' + formatHost(host) + ':' + current.port + pathname
  res.writeHead(302, {
    Location: target,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  })
  res.end()
}

async function serveStatic(req, res, url) {
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    throw new HttpError(400, '无效路径')
  }
  if (pathname === '/' || pathname === '') pathname = '/index.html'
  if (pathname === '/healthz') {
    return json(res, 200, { ok: true, name: APP_NAME, version: APP_VERSION, uptime: process.uptime() })
  }
  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Cache-Control': 'no-cache' })
    return res.end()
  }
  if (pathname === '/open') return openDsh(req, res)

  const normalized = path.posix.normalize(pathname)
  if (!normalized.startsWith('/') || normalized.includes('\u0000')) throw new HttpError(400, '无效路径')
  const resolved = path.resolve(PUBLIC_DIR, '.' + normalized)
  if (!(resolved === PUBLIC_DIR || resolved.startsWith(PUBLIC_DIR + path.sep))) {
    throw new HttpError(403, '禁止访问')
  }
  let stat
  try {
    stat = await fsp.stat(resolved)
  } catch {
    throw new HttpError(404, '页面不存在')
  }
  if (!stat.isFile()) throw new HttpError(404, '页面不存在')
  const body = await fsp.readFile(resolved)
  const ext = path.extname(resolved).toLowerCase()
  const headers = {
    ...commonHeaders(),
    'Content-Type': MIME.get(ext) || 'application/octet-stream',
    'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' || path.basename(resolved) === 'sw.js' || ext === '.webmanifest'
      ? 'no-cache'
      : 'public, max-age=3600',
    'Content-Length': body.length,
  }
  if (path.basename(resolved) === 'sw.js') headers['Service-Worker-Allowed'] = '/'
  res.writeHead(200, headers)
  res.end(body)
}

function urlPath(req) {
  try {
    return new URL(req.url || '/', 'http://localhost').pathname
  } catch {
    return '/'
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]))
}

async function handleRequest(req, res) {
  try {
    const hostHeader = req.headers.host || '127.0.0.1'
    const url = new URL(req.url || '/', 'http://' + hostHeader)
    if (url.pathname === '/healthz') {
      return json(res, 200, { ok: true, name: APP_NAME, version: APP_VERSION, uptime: process.uptime() })
    }
    if (accessKey) {
      const queryKey = url.searchParams.get('key')
      if (queryKey !== null && safeEqual(queryKey, accessKey)) {
        const clean = new URL(url)
        clean.searchParams.delete('key')
        const cookie = 'dsh_launcher=' + encodeURIComponent(accessKey) + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000'
        res.writeHead(303, {
          Location: clean.pathname + clean.search,
          'Set-Cookie': cookie,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        })
        return res.end()
      }
      if (!isAuthorized(req)) return sendUnauthorized(res)
    }

    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url)
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, '方法不允许')
    return await serveStatic(req, res, url)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const message = error instanceof Error ? error.message : String(error)
    if (status >= 500) console.error('[request]', req.method, req.url, message)
    if (res.headersSent) return res.end()
    if ((req.headers.accept || '').includes('text/html') && !urlPath(req).startsWith('/api/')) {
      return html(res, status, '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>出错了</title><body style="font:16px system-ui;padding:32px;background:#070b14;color:#eef2ff"><h1>出错了</h1><p>' + escapeHtml(message) + '</p><p><a style="color:#8ea2ff" href="/">返回启动器</a></p>')
    }
    return json(res, status, {
      ok: false,
      error: message,
      code: error instanceof HttpError ? error.code : '',
    })
  }
}

async function main() {
  if (options.help) {
    printHelp()
    return
  }
  await ensureDataDirs()
  accessKey = isLoopbackHost(options.host)
    ? (options.accessKey || '')
    : await readOrCreateAccessKey(options.accessKey)
  config = await loadConfig()
  await saveConfig(config).catch(() => {})
  await restoreManagedState()
  await refreshInstance({ force: true })

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[fatal-request]', error)
      if (!res.headersSent) json(res, 500, { ok: false, error: '内部错误' })
      else res.end()
    })
  })
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error('启动器端口 ' + options.port + ' 已被占用。')
    } else {
      console.error('启动器无法监听:', error.message)
    }
    process.exitCode = 1
  })
  server.listen(options.port, options.host, () => {
    const shownHost = isLoopbackHost(options.host) ? '127.0.0.1' : formatHost(options.host)
    const keySuffix = accessKey ? '/?key=' + accessKey : '/'
    console.log(APP_NAME + ' ' + APP_VERSION)
    console.log('  本机: http://' + shownHost + ':' + options.port + '/')
    if (accessKey) console.log('  带密钥: http://' + shownHost + ':' + options.port + keySuffix)
    if (instance) {
      console.log('  DSH: 已连接 ' + formatHost(instance.host || config.host) + ':' + instance.port + (instance.external ? '（外部启动）' : '（由启动器拉起）'))
    } else {
      console.log('  DSH: 未运行，等待从手机启动')
    }
    console.log('  日志: ' + LOG_DIR)
    fs.writeFileSync(PID_PATH, String(process.pid) + '\n', { mode: 0o600 })
  })

  const shutdown = () => {
    console.log('\n正在关闭启动器（DSH 会继续运行）…')
    try {
      if (fs.readFileSync(PID_PATH, 'utf8').trim() === String(process.pid)) fs.unlinkSync(PID_PATH)
    } catch {}
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 2500).unref()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (error) => {
    console.error('[uncaught]', error)
  })
  process.on('unhandledRejection', (error) => {
    console.error('[unhandled]', error)
  })
}

let options = { host: '127.0.0.1', port: 3081, accessKey: '', help: false }
let accessKey = ''
let config = { ...DEFAULT_CONFIG }
let instance = null
let instanceMisses = 0
let lastRefreshAt = 0
let lastError = ''
let lastLogPath = null
let startPromise = null
let stopPromise = null
let startState = { active: false, stage: '', startedAt: 0, error: '' }
let stopState = { active: false }

try {
  options = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(error.message)
  printHelp()
  process.exit(1)
}

main().catch((error) => {
  console.error('启动器启动失败:', error)
  process.exit(1)
})
