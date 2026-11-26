// el tema se aplica antes de pintar para que no haya un destello claro en modo oscuro
try {
  var t = localStorage.getItem('squeezo-theme')
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', t)
} catch (e) {
  document.documentElement.setAttribute('data-theme', 'light')
}
