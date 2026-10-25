/* DSH Pocket Launcher — mobile client */
(() => {
  'use strict'

  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

  const els = {
    body: document.body,
    heroOrb: $('#heroOrb'),
    orbCaption: $('#orbCaption'),
    eyebrowText: $('#eyebrowText'),
    heroTitle: $('#heroTitle'),
    heroSubtitle: $('#heroSubtitle'),
    quickMeta: $('#quickMeta'),
    metaProfile: $('#metaProfile'),
    metaPort: $('#metaPort'),
    metaUptime: $('#metaUptime'),
    primaryBtn: $('#primaryBtn'),
    primaryLabel: $('#primaryLabel'),
    primarySpinner: $('#primarySpinner'),
    primaryHint: $('#primaryHint'),
    restartBtn: $('#restartBtn'),
    stopBtn: $('#stopBtn'),
    logsBtn: $('#logsBtn'),
    externalBtn: $('#externalBtn'),
    errorBanner: $('#errorBanner'),
    errorTitle: $('#errorTitle'),
    errorText: $('#errorText'),
    dismissError: $('#dismissError'),
    recentList: $('#recentList'),
    recentCount: $('#recentCount'),
    openRecentBtn: $('#openRecentBtn'),
    envProfile: $('#envProfile'),
    envWorkspace: $('#envWorkspace'),
    envAddress: $('#envAddress'),
    envManaged: $('#envManaged'),
    envFootnote: $('#envFootnote'),
    localPill: $('#localPill'),
    localPillText: $('#localPillText'),
    installBtn: $('#installBtn'),
    settingsBtn: $('#settingsBtn'),
    appVersion: $('#appVersion'),
    connectionState: $('#connectionState'),
    settingsSheet: $('#settingsSheet'),
    settingsForm: $('#settingsForm'),
    profileSelect: $('#profileSelect'),
    workspaceSelect: $('#workspaceSelect'),
    customWorkspaceField: $('#customWorkspaceField'),
    customWorkspaceInput: $('#customWorkspaceInput'),
    portInput: $('#portInput'),
    hostSelect: $('#hostSelect'),
    settingsNote: $('#settingsNote'),
    saveSettings: $('#saveSettings'),
    installBtnSheet: $('#installBtnSheet'),
    copyAddress: $('#copyAddress'),
    directOpen: $('#directOpen'),
    sheetBackdrop: $('#sheetBackdrop'),
    logsSheet: $('#logsSheet'),
    logSource: $('#logSource'),
    logOutput: $('#logOutput'),
    refreshLogs: $('#refreshLogs'),
    copyLogs: $('#copyLogs'),
    editEnvBtn: $('#editEnvBtn'),
    dshScreen: $('#dshScreen'),
    dshFrame: $('#dshFrame'),
    dshLoading: $('#dshLoading'),
    dshLoadingHint: $('#dshLoadingHint'),
    dshFallback: $('#dshFallback'),
    backToLauncher: $('#backToLauncher'),
    reloadDsh: $('#reloadDsh'),
    resetDshView: $('#resetDshView'),
    openInNewTab: $('#openInNewTab'),
    confirmBackdrop: $('#confirmBackdrop'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    confirmCancel: $('#confirmCancel'),
    confirmOk: $('#confirmOk'),
    toast: $('#toast'),
  }

  const state = {
    status: null,
    loading: true,
    busy: false,
    busyKind: '',
    clientError: '',
    polling: false,
    pollTimer: 0,
    deferredPrompt: null,
    confirmResolve: null,
    openSheet: '',
    dshOpen: false,
    iframeLoaded: false,
    iframeRequested: false,
    iframePort: 0,
    connectionLost: false,
    toastTimer: 0,
    loadingHintTimer: 0,
    installVisible: false,
  }

  function icon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('class', 'icon')
    svg.setAttribute('aria-hidden', 'true')
    const use = document.createElementNS(SVG_NS, 'use')
    use.setAttribute('href', '#' + name)
    svg.appendChild(use)
    return svg
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value)
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return '--'
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return seconds + ' 秒'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return minutes + ' 分钟'
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + ' 小时'
    return Math.floor(hours / 24) + ' 天'
  }

  function uptimeText(ms, external) {
    if (external) return '外部启动'
    if (!Number.isFinite(ms) || ms < 60_000) return '刚刚启动'
    return '已运行 ' + formatDuration(ms)
  }

  function relativeTime(timestamp) {
    if (!timestamp) return ''
    const diff = Math.max(0, Date.now() - timestamp)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return minutes + ' 分钟前'
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return hours + ' 小时前'
    const days = Math.floor(hours / 24)
    if (days < 7) return days + ' 天前'
    const date = new Date(timestamp)
    return (date.getMonth() + 1) + '月' + date.getDate() + '日'
  }

  function shortPath(value) {
    const input = String(value || '')
    if (input === '/root') return '~'
    if (input.startsWith('/root/')) return '~' + input.slice(5)
    return input
  }

  function basename(value) {
    const input = String(value || '')
    if (!input) return ''
    const parts = input.replace(/\/+$/, '').split('/')
    return parts[parts.length - 1] || input
  }

  function isDshUsable(status) {
    return Boolean(status?.dsh && status.dsh.tokenReady)
  }

  function toast(message, options = {}) {
    clearTimeout(state.toastTimer)
    els.toast.textContent = message
    els.toast.classList.add('visible')
    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.remove('visible')
    }, options.duration || 3200)
  }

  function setBusy(kind, label) {
    state.busy = true
    state.busyKind = kind
    els.body.dataset.phase = 'starting'
    if (els.heroOrb) els.heroOrb.dataset.phase = 'starting'
    els.primaryBtn.disabled = true
    els.primaryBtn.dataset.mode = 'starting'
    setText(els.primaryLabel, label)
    if (els.primarySpinner) els.primarySpinner.hidden = false
    els.primaryHint.textContent = kind === 'stop' ? '正在安全停止 DSH…' : '正在唤起 DSH，首次启动大约需要 5–10 秒…'
    if (els.orbCaption) setText(els.orbCaption, kind === 'stop' ? '停止中' : '启动中')
    els.heroTitle.textContent = kind === 'stop' ? '正在停止 DSH' : '正在唤醒 DSH'
    els.heroSubtitle.textContent = kind === 'stop' ? '正在安全结束当前实例，请稍候。' : '正在准备运行环境，马上就好。'
    setText(els.eyebrowText, kind === 'stop' ? '正在停止' : '正在启动 DSH')
  }

  function clearBusy() {
    state.busy = false
    state.busyKind = ''
    if (els.primarySpinner) els.primarySpinner.hidden = true
  }

  function showClientError(message) {
    state.clientError = String(message || '未知错误')
    renderError()
  }

  class ApiError extends Error {
    constructor(message, status, code) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
    }
  }

  async function api(path, options = {}) {
    const controller = new AbortController()
    const timeout = options.timeout || 12_000
    const timer = window.setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(path, {
        method: options.method || 'GET',
        headers: options.body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new ApiError(data.error || ('HTTP ' + response.status), response.status, data.code || '')
      }
      return data
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error?.name === 'AbortError') throw new ApiError('操作超时，请查看日志。', 0, 'TIMEOUT')
      throw new ApiError(error?.message || '无法连接到启动器', 0, 'NETWORK')
    } finally {
      window.clearTimeout(timer)
    }
  }

  function schedulePoll(delay) {
    window.clearTimeout(state.pollTimer)
    state.pollTimer = window.setTimeout(() => loadStatus(true), delay)
  }

  async function loadStatus(silent = false) {
    if (state.polling) return
    state.polling = true
    window.clearTimeout(state.pollTimer)
    try {
      const wasConnectionLost = state.connectionLost
      const data = await api('/api/status', { timeout: 9000 })
      state.status = data
      state.loading = false
      state.connectionLost = false
      if (wasConnectionLost) state.clientError = ''
      render(data)
      const delay = ['starting', 'stopping'].includes(data.phase) ? 1200 : 4500
      schedulePoll(delay)
    } catch (error) {
      if (!silent) state.loading = false
      state.clientError = error.message
      state.connectionLost = true
      state.status = null
      renderConnectionError(error)
      schedulePoll(3500)
    } finally {
      state.polling = false
    }
  }

  function renderConnectionError(error) {
    els.body.dataset.phase = 'error'
    if (els.heroOrb) els.heroOrb.dataset.phase = 'error'
    els.heroTitle.textContent = '连接不到启动器'
    els.heroSubtitle.textContent = '请确认 DSH 启动器仍在运行。'
    setText(els.eyebrowText, '连接断开')
    setText(els.orbCaption, '离线')
    setText(els.primaryLabel, '重新连接')
    if (els.primarySpinner) els.primarySpinner.hidden = true
    els.primaryBtn.disabled = false
    els.primaryBtn.dataset.mode = 'error'
    els.primaryHint.textContent = error?.message || '启动器没有响应'
    els.quickMeta.hidden = true
    els.restartBtn.disabled = true
    els.stopBtn.disabled = true
    els.externalBtn.disabled = true
    els.openRecentBtn.disabled = true
    setText(els.connectionState, '连接断开')
    els.errorBanner.hidden = false
    els.errorTitle.textContent = '启动器没有响应'
    els.errorText.textContent = error?.message || '请检查启动器进程。'
  }

  function renderError() {
    const statusError = state.status?.lastError || ''
    const message = state.clientError || statusError
    if (!message) {
      els.errorBanner.hidden = true
      return
    }
    els.errorBanner.hidden = false
    const isToken = /令牌|token/i.test(message)
    els.errorTitle.textContent = isToken ? '找不到 DSH 访问令牌' : (state.status?.phase === 'error' ? '启动遇到问题' : '需要处理一下')
    els.errorText.textContent = message
  }

  function renderHero(status) {
    const phase = state.busy ? 'starting' : status.phase
    els.body.dataset.phase = phase
    if (els.heroOrb) els.heroOrb.dataset.phase = phase
    setText(els.connectionState, status.launcher.localOnly ? '本机连接' : '局域网连接')
    setText(els.localPillText, status.launcher.localOnly ? '本机' : '局域网')

    let title = 'DSH 正在休息'
    let accent = '休息中'
    let subtitle = '启动后会在本机拉起 DeepSeek Harness，不需要再打开终端。'
    let caption = '待机'
    let eyebrow = '待机中 · 点一下开始'
    let hint = '首次启动约 5–10 秒，启动后会自动进入 DSH。'

    if (status.phase === 'running') {
      title = 'DSH 已就绪'
      accent = '已就绪'
      subtitle = '点一下，继续和它一起做事。会话和上下文都还在。'
      caption = '运行中'
      eyebrow = status.dsh.external ? '运行中 · 系统托管' : '运行中 · 本机'
      hint = (status.dsh.external ? '这个 DSH 由系统或终端启动' : '由启动器托管，可以随时停止') +
        (status.dsh.uptimeMs && status.dsh.uptimeMs >= 60_000 ? ' · 已运行 ' + formatDuration(status.dsh.uptimeMs) : '')
      if (!status.dsh.tokenReady) {
        hint = '找不到 DSH 访问令牌，请重启 DSH 后再试。'
        eyebrow = '运行中 · 令牌缺失'
      }
    } else if (status.phase === 'starting') {
      title = '正在唤醒 DSH'
      accent = '启动中'
      subtitle = '正在准备运行环境，马上就好。'
      caption = '启动中'
      eyebrow = '正在启动 DSH'
      hint = status.starting?.stage ? status.starting.stage + '…' : '正在拉起 DSH 进程…'
    } else if (status.phase === 'stopping') {
      title = '正在停止 DSH'
      accent = '停止中'
      subtitle = '正在安全结束当前实例。'
      caption = '停止中'
      eyebrow = '正在停止'
      hint = '请稍候…'
    } else if (status.phase === 'error') {
      title = '启动遇到问题'
      accent = '需要处理'
      subtitle = '别担心，DSH 的会话记录不会丢。看看日志再试一次。'
      caption = '出错'
      eyebrow = '需要处理一下'
      hint = '查看日志，或者直接重新启动。'
    }

    if (state.busy) {
      title = state.busyKind === 'stop' ? '正在停止 DSH' : '正在唤醒 DSH'
      subtitle = state.busyKind === 'stop' ? '正在安全结束当前实例。' : '正在准备运行环境，马上就好。'
      caption = state.busyKind === 'stop' ? '停止中' : '启动中'
      eyebrow = state.busyKind === 'stop' ? '正在停止' : '正在启动 DSH'
      hint = state.busyKind === 'stop' ? '请稍候…' : '首次启动约 5–10 秒，启动后会自动进入 DSH。'
    }
    els.heroTitle.textContent = title

    els.heroSubtitle.textContent = subtitle
    setText(els.eyebrowText, eyebrow)
    setText(els.orbCaption, caption)
    els.primaryHint.textContent = hint
    els.quickMeta.hidden = !status.dsh
    if (status.dsh) {
      setText(els.metaProfile, status.dsh.profile || status.config.profile)
      setText(els.metaPort, ':' + status.dsh.port)
      setText(els.metaUptime, uptimeText(status.dsh.uptimeMs, status.dsh.external))
    }
    renderPrimary(status)
    renderError()
  }

  function renderPrimary(status) {
    const phase = state.busy ? 'starting' : status.phase
    if (state.busy) {
      els.primaryBtn.disabled = true
      els.primaryBtn.dataset.mode = 'starting'
      setText(els.primaryLabel, state.busyKind === 'stop' ? '正在停止…' : '正在启动…')
      return
    }

    if (status.phase === 'starting') {
      els.primaryBtn.disabled = true
      els.primaryBtn.dataset.mode = 'starting'
      setText(els.primaryLabel, '正在启动…')
      if (els.primarySpinner) els.primarySpinner.hidden = false
      return
    }

    if (status.phase === 'stopping') {
      els.primaryBtn.disabled = true
      els.primaryBtn.dataset.mode = 'starting'
      setText(els.primaryLabel, '正在停止…')
      if (els.primarySpinner) els.primarySpinner.hidden = false
      return
    }

    if (status.dsh) {
      if (!status.dsh.tokenReady) {
        els.primaryBtn.disabled = !status.canRestart
        els.primaryBtn.dataset.mode = 'error'
        setText(els.primaryLabel, status.canRestart ? '重启 DSH' : '缺少访问令牌')
        if (els.primarySpinner) els.primarySpinner.hidden = true
        return
      }
      els.primaryBtn.disabled = false
      els.primaryBtn.dataset.mode = 'open'
      setText(els.primaryLabel, '进入 DSH')
      if (els.primarySpinner) els.primarySpinner.hidden = true
      return
    }

    if (status.phase === 'error') {
      els.primaryBtn.disabled = false
      els.primaryBtn.dataset.mode = 'error'
      setText(els.primaryLabel, '重新启动')
      if (els.primarySpinner) els.primarySpinner.hidden = true
      return
    }

    els.primaryBtn.disabled = false
    els.primaryBtn.dataset.mode = 'start'
    setText(els.primaryLabel, '启动并进入')
    if (els.primarySpinner) els.primarySpinner.hidden = true
  }

  function renderQuickActions(status) {
    const managed = Boolean(status.dsh && !status.dsh.external)
    els.restartBtn.hidden = !managed
    els.stopBtn.hidden = !managed
    els.externalBtn.hidden = !status.dsh
    els.restartBtn.disabled = state.busy || !status.canRestart
    els.stopBtn.disabled = state.busy || !status.canStop
    els.externalBtn.disabled = state.busy || !status.dsh
    els.logsBtn.disabled = false
  }

  function renderEnvironment(status) {
    setText(els.envProfile, status.config.profile)
    const workspace = status.config.workspace || ''
    setText(els.envWorkspace, shortPath(workspace))
    els.envWorkspace.title = workspace
    setText(els.envAddress, (status.config.host || '127.0.0.1') + ':' + status.config.port)
    let managed = '未启动'
    if (status.dsh) managed = status.dsh.external ? '系统 / 终端启动' : '启动器托管'
    setText(els.envManaged, managed)
    els.envFootnote.lastElementChild.textContent = status.launcher.localOnly
      ? '所有数据都留在这台手机上'
      : '局域网模式 · 请保管好访问密钥'
    els.localPill.classList.toggle('protected', Boolean(status.launcher.authRequired))
  }

  function renderRecent(status) {
    const sessions = Array.isArray(status.sessions) ? status.sessions : []
    setText(els.recentCount, sessions.length)
    els.recentList.replaceChildren()
    if (sessions.length === 0) {
      const wrap = document.createElement('div')
      wrap.className = 'empty-state'
      const mark = document.createElement('span')
      mark.className = 'empty-mark'
      mark.appendChild(icon('i-clock'))
      const title = document.createElement('p')
      title.textContent = '还没有最近的会话'
      const sub = document.createElement('span')
      sub.textContent = '启动 DSH 后，从第一句开始。'
      wrap.append(mark, title, sub)
      els.recentList.appendChild(wrap)
    } else {
      for (const session of sessions) {
        const row = document.createElement('div')
        row.className = 'recent-item'
        const bullet = document.createElement('span')
        bullet.className = 'recent-bullet'
        bullet.appendChild(icon('i-terminal'))
        const body = document.createElement('div')
        body.className = 'recent-body'
        const title = document.createElement('div')
        title.className = 'recent-title'
        title.textContent = session.title || '未命名会话'
        const meta = document.createElement('div')
        meta.className = 'recent-meta'
        const workspace = document.createElement('span')
        workspace.textContent = session.workspace ? basename(session.workspace) : '未知工作区'
        const sep = document.createElement('span')
        sep.className = 'meta-separator'
        const time = document.createElement('span')
        time.textContent = relativeTime(session.updatedAt)
        meta.append(workspace, sep, time)
        body.append(title, meta)
        row.append(bullet, body)
        els.recentList.appendChild(row)
      }
    }
    const usable = isDshUsable(status)
    els.openRecentBtn.disabled = !usable
    els.openRecentBtn.classList.toggle('is-disabled', !usable)
    els.openRecentBtn.querySelector('span').textContent = sessions.length ? '进入 DSH 继续' : '进入 DSH 开始'
  }

  function renderSettingsSummary(status) {
    if (!status.dsh) {
      els.settingsNote.textContent = '当前没有运行中的 DSH。保存后点启动即可。'
      return
    }
    if (status.dsh.port !== status.config.port || status.dsh.host !== status.config.host) {
      els.settingsNote.textContent = '当前实例运行在 ' + status.dsh.host + ':' + status.dsh.port + '，新地址会在下次启动时生效。'
    } else {
      els.settingsNote.textContent = '修改会在下次启动时生效；当前会话不会中断。'
    }
  }

  function render(status) {
    renderHero(status)
    renderQuickActions(status)
    renderEnvironment(status)
    renderRecent(status)
    renderSettingsSummary(status)
    setText(els.appVersion, 'v' + (status.app?.version || '1.0.0'))
    if (!isStandalone()) updateInstallUI()
    if (!status.dsh && state.iframeLoaded) {
      state.iframeLoaded = false
      state.iframeRequested = false
      els.dshFrame.src = 'about:blank'
    }
    if (state.dshOpen) {
      if (!status.dsh || !status.dsh.tokenReady) closeDsh(true)
      else if (state.iframePort && state.iframePort !== status.dsh.port) {
        state.iframeLoaded = false
        state.iframeRequested = false
        els.dshFrame.dataset.loaded = ''
      }
    }
  }

  function fillSelect(select, items, selected) {
    select.replaceChildren()
    for (const item of items) {
      const option = document.createElement('option')
      option.value = item.value
      option.textContent = item.label
      if (item.value === selected) option.selected = true
      select.appendChild(option)
    }
  }

  function populateSettings() {
    const status = state.status
    if (!status) return
    const profiles = status.profiles?.length ? status.profiles : [{ name: 'web', label: 'web' }]
    fillSelect(els.profileSelect, profiles.map((profile) => ({ value: profile.name, label: profile.label || profile.name })), status.config.profile)

    const workspaces = status.workspaces?.length
      ? [...status.workspaces]
      : [{ path: status.config.workspace, title: basename(status.config.workspace) }]
    if (!workspaces.some((item) => item.path === status.config.workspace)) {
      workspaces.unshift({ path: status.config.workspace, title: basename(status.config.workspace) })
    }
    const workspaceItems = workspaces.map((item) => ({
      value: item.path,
      label: (item.title || basename(item.path)) + '  ·  ' + shortPath(item.path),
    }))
    workspaceItems.push({ value: '__custom__', label: '自定义路径…' })
    fillSelect(els.workspaceSelect, workspaceItems, status.config.workspace)
    els.customWorkspaceField.hidden = true
    els.customWorkspaceInput.value = status.config.workspace

    const hosts = status.networkHosts?.length ? status.networkHosts : ['127.0.0.1']
    if (!hosts.includes(status.config.host)) hosts.unshift(status.config.host)
    fillSelect(
      els.hostSelect,
      hosts.map((host) => ({
        value: host,
        label: host === '127.0.0.1' ? '本机 · 127.0.0.1' : host,
      })),
      status.config.host,
    )
    els.portInput.value = String(status.config.port)
    renderSettingsSummary(status)
  }

  async function openSettings() {
    if (!state.status) {
      await loadStatus()
      if (!state.status) return
    }
    populateSettings()
    openSheet('settings')
  }

  function openSheet(name) {
    state.openSheet = name
    els.sheetBackdrop.hidden = false
    els.settingsSheet.hidden = name !== 'settings'
    els.logsSheet.hidden = name !== 'logs'
    els.body.classList.add('sheet-open')
  }

  function closeSheet() {
    state.openSheet = ''
    els.sheetBackdrop.hidden = true
    els.settingsSheet.hidden = true
    els.logsSheet.hidden = true
    els.body.classList.remove('sheet-open')
  }

  function askConfirm(title, text, label = '确定') {
    if (state.confirmResolve) {
      state.confirmResolve(false)
      state.confirmResolve = null
    }
    setText(els.confirmTitle, title)
    setText(els.confirmText, text)
    setText(els.confirmOk, label)
    els.confirmBackdrop.hidden = false
    return new Promise((resolve) => {
      state.confirmResolve = resolve
    })
  }

  function resolveConfirm(value) {
    if (!state.confirmResolve) return
    const resolve = state.confirmResolve
    state.confirmResolve = null
    els.confirmBackdrop.hidden = true
    resolve(value)
  }

  async function startFlow() {
    if (state.busy) return
    if (state.dshOpen) return
    if (!state.status || state.connectionLost) {
      await loadStatus()
      if (!state.status) return
    }
    if (state.status.dsh) {
      if (!state.status.dsh.tokenReady) {
        if (state.status.canRestart) return restartFlow()
        toast('缺少 DSH 访问令牌，请先重启 DSH')
        return
      }
      openDsh()
      return
    }
    clearBusy()
    setBusy('start', '正在启动…')
    toast('正在唤醒 DSH…', { duration: 1800 })
    try {
      const data = await api('/api/start', { method: 'POST', body: {}, timeout: 95_000 })
      state.clientError = ''
      state.status = data
      clearBusy()
      render(data)
      toast('DSH 已启动')
      window.setTimeout(() => openDsh(), 120)
    } catch (error) {
      clearBusy()
      if (error.code === 'ALREADY_RUNNING') {
        await loadStatus(true)
        if (isDshUsable(state.status)) openDsh()
        return
      }
      showClientError(error.message)
      await loadStatus(true)
      toast('启动失败，点日志查看详情', { duration: 4200 })
    }
  }

  async function stopFlow() {
    if (state.busy || !state.status?.canStop) return
    const ok = await askConfirm('停止 DSH？', '正在进行的任务会中断。对话记录和上下文会保留，下次启动可以继续。', '停止 DSH')
    if (!ok) return
    setBusy('stop', '正在停止…')
    try {
      const data = await api('/api/stop', { method: 'POST', body: {}, timeout: 30_000 })
      state.clientError = ''
      state.status = data
      clearBusy()
      render(data)
      toast('DSH 已停止')
      if (state.iframeLoaded) {
        state.iframeLoaded = false
        els.dshFrame.dataset.loaded = ''
        els.dshFrame.src = 'about:blank'
      }
    } catch (error) {
      clearBusy()
      showClientError(error.message)
      await loadStatus(true)
    }
  }

  async function restartFlow() {
    if (state.busy || !state.status?.canRestart) return
    const ok = await askConfirm('重启 DSH？', 'DSH 会重新启动，正在进行的任务可能会中断。', '重启 DSH')
    if (!ok) return
    setBusy('start', '正在重启…')
    try {
      const data = await api('/api/restart', { method: 'POST', body: {}, timeout: 100_000 })
      state.clientError = ''
      state.status = data
      clearBusy()
      render(data)
      toast('DSH 已重启')
      state.iframeLoaded = false
      els.dshFrame.dataset.loaded = ''
    } catch (error) {
      clearBusy()
      showClientError(error.message)
      await loadStatus(true)
    }
  }

  function openDsh() {
    if (!state.status?.dsh) {
      toast('DSH 还没有启动')
      return
    }
    if (!state.status.dsh.tokenReady) {
      showClientError('找不到 DSH 访问令牌。请重启 DSH 后再试。')
      toast('缺少访问令牌，点日志查看详情')
      return
    }
    state.dshOpen = true
    state.iframePort = state.status.dsh.port
    els.dshScreen.hidden = false
    els.body.classList.add('dsh-open')
    if (!state.iframeLoaded) {
      els.dshLoading.classList.remove('is-hidden')
      setText(els.dshLoadingHint, '正在交换访问令牌…')
      state.iframeRequested = true
      els.dshFrame.src = '/open'
      state.iframeLoaded = false
      window.clearTimeout(state.loadingHintTimer)
      state.loadingHintTimer = window.setTimeout(() => {
        setText(els.dshLoadingHint, '如果页面没有显示，可以点下面的链接换一个窗口打开。')
      }, 12_000)
    }
    if (!history.state?.dsh) {
      history.pushState({ dsh: true }, '', '#dsh')
    }
  }

  function closeDsh(fromPopstate = false) {
    if (!state.dshOpen) return
    state.dshOpen = false
    els.dshScreen.hidden = true
    els.body.classList.remove('dsh-open')
    if (!fromPopstate && history.state?.dsh) {
      history.back()
    } else if (!fromPopstate && location.hash === '#dsh') {
      history.replaceState(null, '', location.pathname + location.search)
    }
  }

  function reloadDsh() {
    if (!state.dshOpen) return
    els.dshLoading.classList.remove('is-hidden')
    setText(els.dshLoadingHint, '正在重新进入 DSH…')
    state.iframeLoaded = false
    state.iframeRequested = true
    els.dshFrame.src = 'about:blank'
    window.setTimeout(() => {
      els.dshFrame.src = '/open'
    }, 60)
    state.loadingHintTimer = window.setTimeout(() => {
      setText(els.dshLoadingHint, '如果页面没有显示，可以打开右上角的新页面链接。')
    }, 10_000)
  }

  async function showLogs() {
    openSheet('logs')
    els.logOutput.textContent = '正在读取日志…'
    setText(els.logSource, '最近 220 行')
    try {
      const data = await api('/api/logs?lines=220')
      els.logOutput.textContent = data.text || (data.hint || '暂无日志。')
      setText(els.logSource, data.source ? data.source + ' · 最近 220 行' : '暂无日志')
      els.logOutput.scrollTop = els.logOutput.scrollHeight
    } catch (error) {
      els.logOutput.textContent = '读取日志失败：' + error.message
    }
  }

  async function refreshLogs() {
    els.logOutput.textContent = '正在刷新…'
    try {
      const data = await api('/api/logs?lines=260')
      els.logOutput.textContent = data.text || data.hint || '暂无日志。'
      setText(els.logSource, data.source ? data.source + ' · 最近 260 行' : '暂无日志')
      els.logOutput.scrollTop = els.logOutput.scrollHeight
      toast('日志已刷新')
    } catch (error) {
      els.logOutput.textContent = '读取日志失败：' + error.message
    }
  }

  async function copyText(value, message = '已复制') {
    try {
      await navigator.clipboard.writeText(value)
      toast(message)
    } catch {
      const area = document.createElement('textarea')
      area.value = value
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        document.execCommand('copy')
        toast(message)
      } catch {
        toast('复制失败，请手动选择复制')
      }
      area.remove()
    }
  }

  function updateInstallUI() {
    const show = !isStandalone()
    state.installVisible = show
    els.installBtn.hidden = !show
    els.installBtnSheet.hidden = !show
  }

  async function installApp() {
    if (state.deferredPrompt) {
      const prompt = state.deferredPrompt
      state.deferredPrompt = null
      updateInstallUI()
      try {
        await prompt.prompt()
        const choice = await prompt.userChoice
        if (choice.outcome === 'accepted') toast('正在安装到主屏…')
        else toast('已取消安装')
      } catch {
        toast('安装没有完成，请从浏览器菜单添加')
      }
      return
    }
    if (isIOS()) {
      toast('Safari：点分享按钮 → 添加到主屏幕', { duration: 7000 })
      return
    }
    toast('Chrome：右上角菜单 → 添加到主屏幕 / 安装应用', { duration: 7000 })
  }

  async function saveSettings(event) {
    event.preventDefault()
    if (!state.status) return
    const custom = els.workspaceSelect.value === '__custom__'
    const workspace = custom ? els.customWorkspaceInput.value.trim() : els.workspaceSelect.value
    if (!workspace) {
      toast('请填写工作区路径')
      els.customWorkspaceInput.focus()
      return
    }
    const port = Number(els.portInput.value)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast('端口必须在 1–65535 之间')
      els.portInput.focus()
      return
    }
    els.saveSettings.disabled = true
    setText(els.saveSettings.querySelector('.primary-label'), '保存中…')
    try {
      const data = await api('/api/settings', {
        method: 'POST',
        body: {
          profile: els.profileSelect.value,
          workspace,
          port,
          host: els.hostSelect.value,
        },
      })
      state.clientError = ''
      state.status = data
      render(data)
      closeSheet()
      toast('设置已保存')
    } catch (error) {
      els.settingsNote.textContent = error.message
      toast('保存失败：' + error.message, { duration: 5000 })
    } finally {
      els.saveSettings.disabled = false
      setText(els.saveSettings.querySelector('.primary-label'), '保存设置')
    }
  }

  function attachEvents() {
    els.primaryBtn.addEventListener('click', () => {
      if (state.busy) return
      if (!state.status || state.connectionLost) {
        loadStatus()
        return
      }
      if (state.status.dsh) {
        if (!state.status.dsh.tokenReady) {
          if (state.status.canRestart) restartFlow()
          else toast('缺少访问令牌，请重启 DSH')
          return
        }
        openDsh()
        return
      }
      startFlow()
    })
    els.restartBtn.addEventListener('click', restartFlow)
    els.stopBtn.addEventListener('click', stopFlow)
    els.logsBtn.addEventListener('click', showLogs)
    els.externalBtn.addEventListener('click', () => {
      if (!state.status?.dsh) return
      window.open('/open', '_blank', 'noopener')
    })
    els.openRecentBtn.addEventListener('click', () => {
      if (isDshUsable(state.status)) openDsh()
      else toast('先启动 DSH，再继续会话')
    })
    els.settingsBtn.addEventListener('click', openSettings)
    els.editEnvBtn.addEventListener('click', openSettings)
    els.installBtn.addEventListener('click', installApp)
    els.installBtnSheet.addEventListener('click', installApp)
    els.dismissError.addEventListener('click', async () => {
      state.clientError = ''
      els.errorBanner.hidden = true
      try {
        const data = await api('/api/dismiss', { method: 'POST', body: {} })
        state.status = data
        render(data)
      } catch {}
    })
    els.sheetBackdrop.addEventListener('click', closeSheet)
    $$('[data-close]').forEach((button) => button.addEventListener('click', closeSheet))
    els.settingsForm.addEventListener('submit', saveSettings)
    els.workspaceSelect.addEventListener('change', () => {
      const custom = els.workspaceSelect.value === '__custom__'
      els.customWorkspaceField.hidden = !custom
      if (custom) {
        els.customWorkspaceInput.value = state.status?.config.workspace || '/root'
        window.setTimeout(() => els.customWorkspaceInput.focus(), 60)
      }
    })
    els.copyAddress.addEventListener('click', () => copyText(location.origin + '/', '启动器地址已复制'))
    els.directOpen.addEventListener('click', (event) => {
      if (!ifDshOpenable()) {
        event.preventDefault()
        toast('DSH 还没有启动')
      }
    })
    els.refreshLogs.addEventListener('click', refreshLogs)
    els.copyLogs.addEventListener('click', () => copyText(els.logOutput.textContent || '', '日志已复制'))
    els.backToLauncher.addEventListener('click', () => closeDsh())
    els.reloadDsh.addEventListener('click', reloadDsh)
    els.resetDshView.addEventListener('click', reloadDsh)
    els.confirmCancel.addEventListener('click', () => resolveConfirm(false))
    els.confirmBackdrop.addEventListener('click', (event) => {
      if (event.target === els.confirmBackdrop) resolveConfirm(false)
    })
    els.confirmOk.addEventListener('click', () => resolveConfirm(true))
    els.dshFrame.addEventListener('load', () => {
      if (!state.iframeRequested) return
      if (els.dshFrame.src === 'about:blank') return
      state.iframeLoaded = true
      window.clearTimeout(state.loadingHintTimer)
      els.dshLoading.classList.add('is-hidden')
    })
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      state.deferredPrompt = event
      updateInstallUI()
    })
    window.addEventListener('appinstalled', () => {
      state.deferredPrompt = null
      updateInstallUI()
      toast('已安装到主屏')
    })
    window.addEventListener('popstate', () => {
      if (state.dshOpen) closeDsh(true)
    })
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (state.confirmResolve) resolveConfirm(false)
        else if (state.openSheet) closeSheet()
        else if (state.dshOpen) closeDsh()
      }
    })
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) loadStatus(true)
    })
    window.addEventListener('online', () => {
      toast('网络已恢复')
      loadStatus(true)
    })
    window.addEventListener('offline', () => toast('网络已断开'))
  }

  function ifDshOpenable() {
    return isDshUsable(state.status)
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }

  attachEvents()
  updateInstallUI()
  registerServiceWorker()
  if (isStandalone()) {
    document.documentElement.classList.add('standalone')
  }
  loadStatus()
  window.setInterval(() => {
    if (!state.status?.dsh?.uptimeMs || state.dshOpen) return
    const startedAt = state.status.dsh.startedAt
    if (!startedAt) return
    setText(els.metaUptime, uptimeText(Date.now() - startedAt, false))
  }, 30_000)
})()
