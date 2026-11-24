import { lazy, Suspense, useRef, useState } from 'react'

const HeroArchitectureScene = lazy(() => import('../components/three/HeroArchitectureScene.jsx'))

function HeroSection() {
  const heroRef = useRef(null)
  const [webglFallback, setWebglFallback] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  return (
    <section
      className={`hero-section${webglFallback ? ' hero-section--fallback' : ''}`}
      id="inicio"
      ref={heroRef}
    >
      <img
        className="hero-image"
        src="/images/estructura-metalica.jpeg"
        alt="Estructura metálica durante la ejecución de una obra"
        fetchPriority="high"
      />
      <div className="hero-overlay" />
      <div className="container hero-content">
        <p className="eyebrow eyebrow-light">Obras civiles · Fundaciones · Estructuras · Chile</p>
        <h1>
          Construimos<br />
          lo que otros<br />
          no se atreven
        </h1>
        <span className="hero-rule" />
        <p className="hero-copy">
          Desde las fundaciones hasta la entrega, ejecutamos proyectos de construcción con precisión técnica y compromiso.
        </p>
        <div className="hero-actions">
          <a className="button button-light" href="#proyectos">Ver proyectos</a>
          <a className="button button-outline" href="#contacto">
            Solicitar cotización <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      {!webglFallback && (
        <Suspense fallback={null}>
          <HeroArchitectureScene
            triggerRef={heroRef}
            onFallback={() => setWebglFallback(true)}
          />
        </Suspense>
      )}
      <p className="hero-caption">Construcciones Salma SPA <span>—</span> Chile</p>
    </section>
  )
}

export default HeroSection
