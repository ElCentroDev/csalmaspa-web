import { lazy, Suspense, useLayoutEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout.jsx'
import HomePage from './pages/HomePage.jsx'

const AboutPage = lazy(() => import('./pages/AboutPage.jsx'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useLayoutEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '')
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}

function App() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={null}>
        <Routes>
          <Route path="admin/*" element={<AdminPage />} />
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="quienes-somos" element={<AboutPage />} />
            <Route path="privacidad" element={<PrivacyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
