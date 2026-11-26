import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { DropOverlay } from './components/DropOverlay'
import { useGlobalDrop } from './lib/useGlobalDrop'
import { restoreSession, startPersisting } from './lib/persist'
import { scrollToTarget, scrollTopNow, startLenis } from './lib/lenis'
import { useT } from './i18n'
import { useUi } from './store/ui'
import Home from './pages/Home'
import About from './pages/About'
import Legal from './pages/Legal'
import NotFound from './pages/NotFound'

export default function App() {
  const t = useT()
  const lang = useUi((s) => s.lang)
  const dragging = useGlobalDrop()
  const { pathname, hash } = useLocation()

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('meta.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
  }, [lang, t])

  useEffect(() => {
    startPersisting()
    void restoreSession()
    startLenis()
  }, [])

  useEffect(() => {
    // un enlace con # baja con suavidad hasta su sección; sin él, cada página parte desde arriba
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      const id = window.setTimeout(() => scrollToTarget(target), 150)
      return () => window.clearTimeout(id)
    }
    scrollTopNow()
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main key={pathname} className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/privacidad" element={<Legal which="privacy" />} />
          <Route path="/terminos" element={<Legal which="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <DropOverlay show={dragging} />
    </div>
  )
}
