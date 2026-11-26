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
      <div className="hero-blueprint-grid" aria-hidden="true" />

      <div className="container hero-content">
        <div className="hero-kicker-row">
          <span className="hero-kicker-badge">INGENIERÍA &amp; OBRA CIVIL</span>
          <span className="hero-kicker-sep" aria-hidden="true" />
          <p className="eyebrow eyebrow-light">CSALMA · Construcciones Salma SPA</p>
        </div>

        <h1 className="hero-headline">
          Construimos<br />
          <span className="hero-headline-line--muted">lo que otros</span><br />
          no se atreven<span className="hero-headline-dot">.</span>
        </h1>

        <span className="hero-rule" />

        <p className="hero-copy">
          Desde las fundaciones hasta la entrega, ejecutamos proyectos de construcción
          con precisión técnica, supervisión en terreno y compromiso real.
        </p>

        <div className="hero-actions">
          <a className="button button-light" href="#proyectos">
            Ver proyectos <span aria-hidden="true">→</span>
          </a>
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
