/* DSH mobile adaptation behavior
 * Injected by scripts/install-dsh-mobile.sh. Adds a bottom navigation bar and
 * turns DSH's sidebar/rightbar into mobile overlays.
 */
;(() => {
  if (window.__dshMobileAdaptation) return
  window.__dshMobileAdaptation = true

  const icon = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5h15A1.5 1.5 0 0 1 21 7v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3v-3h-1A1.5 1.5 0 0 1 3 16V7a1.5 1.5 0 0 1 1.5-1.5Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m15.5 15.5 4.2 4.2"/></svg>',
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5a2 2 0 0 1 2-2h3l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
  }

  let frame = null
  let nav = null
  let backdrop = null
  let observer = null
  let retry = 0
  let sessionCloseBound = false

  function getFrame() {
    return document.querySelector('#root > div > div[data-rightbar-collapsed]')
  }

  function findButton(selectors) {
    for (const selector of selectors) {
      const button = document.querySelector(selector)
      if (button) return button
    }
    return null
  }

  function getSidebarToggle() {
    return document.querySelector('[data-slot="sidebar"] button[class*="toggle"]')
  }

  function openSidebar() {
    const button = getSidebarToggle()
    if (button) button.click()
  }

  function openAction(action) {
    if (action === 'sidebar') return openSidebar()
    if (action === 'new') {
      findButton(['button[class*="newSession"]'])?.click()
      return
    }
    if (action === 'search') {
      findButton(['button[class*="searchButton"]'])?.click()
      return
    }
    if (action === 'workspace') {
      const button = findButton([
        'button[aria-label="添加工作区"]',
        'button[aria-label="Add workspace"]',
        'button[aria-label*="工作区"]',
      ])
      if (button) button.click()
      else openSidebar()
    }
  }

  function makeNav() {
    if (nav) return
    nav = document.createElement('nav')
    nav.className = 'dsh-mobile-nav'
    nav.setAttribute('aria-label', 'DSH 移动端导航')
    nav.innerHTML = [
      ['sidebar', icon.chat, '会话'],
      ['new', icon.plus, '新建'],
      ['search', icon.search, '搜索'],
      ['workspace', icon.folder, '工作区'],
    ].map(([action, glyph, label]) =>
      '<button type="button" data-action="' + action + '" aria-label="' + label + '">' + glyph + '<span>' + label + '</span></button>',
    ).join('')
    nav.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]')
      if (button) openAction(button.dataset.action)
    })
    document.body.appendChild(nav)

    if (!sessionCloseBound) {
      sessionCloseBound = true
      document.addEventListener('click', (event) => {
        if (!window.matchMedia('(max-width: 700px)').matches) return
        if (!frame || frame.hasAttribute('data-sidebar-collapsed')) return
        if (!(event.target instanceof Element)) return
        if (event.target.closest('button')) return
        if (!event.target.closest('[class*="sessionRow"]')) return
        window.setTimeout(() => {
          if (frame && !frame.hasAttribute('data-sidebar-collapsed')) {
            getSidebarToggle()?.click()
          }
        }, 120)
      }, true)
    }

    backdrop = document.createElement('div')
    backdrop.className = 'dsh-mobile-backdrop'
    backdrop.setAttribute('aria-hidden', 'true')
    backdrop.addEventListener('click', () => {
      const button = getSidebarToggle()
      if (button && !frame?.hasAttribute('data-sidebar-collapsed')) button.click()
    })
    document.body.appendChild(backdrop)
  }

  function update() {
    if (!frame) return
    document.body.classList.toggle('dsh-mobile-sidebar-open', !frame.hasAttribute('data-sidebar-collapsed'))
    document.body.classList.toggle('dsh-mobile-rightbar-open', frame.hasAttribute('data-rightbar-fullscreen'))
  }

  function ensure() {
    const next = getFrame()
    if (!next) {
      if (retry < 100) {
        retry += 1
        window.setTimeout(ensure, 150)
      }
      return
    }
    retry = 0
    if (frame !== next) {
      frame = next
      frame.classList.add('dsh-mobile-frame')
      observer?.disconnect()
      observer = new MutationObserver(update)
      observer.observe(frame, {
        attributes: true,
        attributeFilter: ['data-sidebar-collapsed', 'data-rightbar-fullscreen'],
      })
    }
    document.body.classList.add('dsh-mobile-ready')
    makeNav()
    update()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure, { once: true })
  } else {
    ensure()
  }

  // DSH is a SPA. If its shell is replaced, reconnect the observer and nav.
  window.setInterval(() => {
    if (!document.querySelector('.dsh-mobile-frame') || !document.querySelector('.dsh-mobile-nav')) ensure()
  }, 2500)
})()
