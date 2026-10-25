/* Apply Miuix theme from the system color scheme before first paint. */
;(() => {
  try {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.classList.toggle('m-theme-dark', media.matches)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', media.matches ? '#000000' : '#f7f7f7')
    }
    apply()
    if (media.addEventListener) media.addEventListener('change', apply)
    else if (media.addListener) media.addListener(apply)
  } catch {}
})()
