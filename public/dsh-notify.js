/* DSH task notification bridge
 * Injected into DSH's web frontend by scripts/install-dsh-notify.sh.
 * Watches [data-chat-running] and forwards task edges to the launcher parent.
 */
;(() => {
  if (window.__dshTaskNotifyInstalled) return
  window.__dshTaskNotifyInstalled = true

  const RUNNING_SELECTOR = '[data-chat-running]'
  const ERROR_SELECTOR = '[role="alert"], [data-error], [class*="error"], [class*="Error"]'
  let active = false
  let startedAt = 0
  let title = 'DSH 任务'
  let process = '正在处理…'
  let lastProcess = ''
  let lastTitle = ''
  let scheduleTimer = 0
  let finishTimer = 0

  const compact = (value, limit = 140) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    if (!text) return ''
    return text.length > limit ? text.slice(0, limit) + '…' : text
  }

  const currentTitle = () => {
    const nodes = document.querySelectorAll('[data-session-title], [class*="sessionTitle"], [class*="headerTitle"]')
    for (const node of nodes) {
      const text = compact(node.textContent, 60)
      if (text) return text
    }
    return 'DSH 任务'
  }

  const elapsedFromText = (text) => {
    const source = compact(text, 5000)
    let match = source.match(/(?:用时|已运行)\s*(\d+)\s*分\s*(\d+)\s*秒/)
    if (match) return (Number(match[1]) * 60 + Number(match[2])) * 1000
    match = source.match(/(?:用时|已运行)\s*(\d+)\s*小时\s*(\d+)\s*分/)
    if (match) return (Number(match[1]) * 3600 + Number(match[2]) * 60) * 1000
    return 0
  }

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
  }

  const hasError = () => {
    const pieces = []
    for (const node of document.querySelectorAll(ERROR_SELECTOR)) {
      if (!isVisible(node)) continue
      const text = compact(node.textContent, 200)
      if (text) pieces.push(text)
    }
    return /失败|错误|异常|error|failed|请求失败|网络错误/i.test(pieces.join(' '))
  }

  const post = (state, extra = {}) => {
    if (window.parent === window) return
    try {
      window.parent.postMessage({
        channel: 'dsh-task',
        state,
        title,
        process,
        startedAt,
        ...extra,
      }, '*')
    } catch {
      // Parent gone or blocked.
    }
  }

  const evaluate = () => {
    const running = document.querySelector(RUNNING_SELECTOR)
    if (running) {
      const text = compact(running.innerText || running.textContent || '')
      const nextProcess = text ? text.slice(-140) : '正在处理…'
      const nextTitle = currentTitle()
      if (!active) {
        active = true
        title = nextTitle
        process = nextProcess
        lastProcess = nextProcess
        lastTitle = nextTitle
        startedAt = Date.now() - elapsedFromText(document.body?.innerText || '')
        post('running')
      } else if (nextProcess !== lastProcess || nextTitle !== lastTitle) {
        lastProcess = nextProcess
        lastTitle = nextTitle
        process = nextProcess
        title = nextTitle
        post('update')
      }
      return
    }

    if (!active) return
    active = false
    window.clearTimeout(finishTimer)
    finishTimer = window.setTimeout(() => {
      if (document.querySelector(RUNNING_SELECTOR)) {
        active = true
        return
      }
      const failed = hasError()
      const message = failed ? '任务失败' : '任务完成'
      post(failed ? 'failed' : 'completed', { message })
    }, 700)
  }

  const schedule = () => {
    if (scheduleTimer) return
    scheduleTimer = window.setTimeout(() => {
      scheduleTimer = 0
      evaluate()
    }, 220)
  }

  const boot = () => {
    if (!document.body) {
      window.setTimeout(boot, 100)
      return
    }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-chat-running'],
    })
    window.setInterval(schedule, 2000)
    evaluate()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }
})()
