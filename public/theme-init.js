// el tema se aplica antes de pintar para que no haya un destello claro en modo oscuro
try {
  var t = localStorage.getItem('squeezo-theme')
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light')
} catch (e) {
  document.documentElement.setAttribute('data-theme', 'light')
}
