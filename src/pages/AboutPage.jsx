import { Link } from 'react-router-dom'

const TEAM_ROLES = [
  {
    name: 'Gerente General',
    role: 'Dirección Ejecutiva y Licitaciones',
    bio: 'Lidera la relación contractual con el mandante, evaluación de presupuestos cerrados y dirección estratégica de cada proyecto.',
    email: 'correo@csalma.cl',
    whatsappText: 'Hola%20CSALMA,%20quisiera%20contactar%20con%20Gerencia%20General',
  },
  {
    name: 'Gerente Técnico',
    role: 'Ingeniería y Normativa NCh433',
    bio: 'Responsable de cubicaciones, revisión de planos estructurales, trazabilidad de materiales y cumplimiento de normativa sísmica chilena.',
    email: 'correo@csalma.cl',
    whatsappText: 'Hola%20CSALMA,%20quisiera%20contactar%20con%20Gerencia%20T%C3%A9cnica',
  },
  {
    name: 'Gerente de Operaciones',
    role: 'Ejecución y Supervisión en Terreno',
    bio: 'Coordina especialidades en faena, controla avances de Carta Gantt, tolerancias constructivas y seguridad laboral en obra.',
    email: 'correo@csalma.cl',
    whatsappText: 'Hola%20CSALMA,%20quisiera%20contactar%20con%20Gerencia%20de%20Operaciones',
  },
]

const PILLARS_VALUES = [
  {
    code: '01',
    title: 'Misión',
    description:
      'Ejecutar obras civiles, fundaciones y estructuras con precisión técnica, presupuestos cerrados y supervisión directa en terreno, resguardando cada inversión del mandante desde el trazado inicial hasta la recepción conforme.',
  },
  {
    code: '02',
    title: 'Visión',
    description:
      'Consolidarnos en Chile como un referente en construcción integral e ingeniería aplicada, reconocidos por nuestra seriedad contractual, cumplimiento estricto de Carta Gantt y solidez estructural.',
  },
  {
    code: '03',
    title: 'Valores',
    description:
      'Rigor técnico bajo normativa sísmica (NCh433 / NCh2123), transparencia en cada partida, seguridad permanente en faena, comunicación directa y respaldo real post-entrega.',
  },
]

function AboutPage() {
  return (
    <div className="about-page">
      {/* 1. Banner fotográfico de empresa + submenú natural */}
      <section className="about-banner">
        <img
          className="about-banner-img"
          src="/images/hero-bg.webp"
          alt="Obra ejecutada por Construcciones CSALMA SPA"
        />
        <div className="about-banner-overlay" />
        <div className="container about-banner-content">
          <Link className="about-back-link" to="/">
            <span aria-hidden="true">←</span> Volver al inicio
          </Link>
          <h1 className="about-banner-title">
            Construcciones<br />
            CSALMA SPA
          </h1>
          <a className="about-banner-cta" href="#sobre-csalma">
            <span aria-hidden="true">→</span> Conocer nuestra historia y equipo
          </a>
        </div>
        <div className="about-subnav-bar">
          <div className="container about-subnav-inner">
            <nav className="about-subnav-links" aria-label="Secciones de Quiénes somos">
              <a href="#sobre-csalma">Sobre CSALMA</a>
              <a href="#equipo">Equipo</a>
              <a href="#mision-vision">Misión y Visión</a>
            </nav>
            <span className="about-subnav-badge">Construcciones CSALMA SPA · Chile</span>
          </div>
        </div>
      </section>

      {/* 2. Sobre CSALMA (Primero arriba) */}
      <section className="about-editorial section-wrap" id="sobre-csalma" aria-labelledby="about-editorial-title">
        <div className="container">
          <div className="about-editorial-header">
            <h2 id="about-editorial-title">Sobre CSALMA</h2>
          </div>

          <div className="about-editorial-grid">
            <figure className="about-editorial-media">
              <img
                src="/images/obra-industrial.jpeg"
                alt="Ejecución en terreno y estructura de hormigón de CSALMA"
                loading="lazy"
              />
              <figcaption>
                <span>01</span> Registro en terreno · Región Metropolitana y cobertura nacional
              </figcaption>
            </figure>

            <div className="about-editorial-copy">
              <span className="about-editorial-kicker">Nuestra Filosofía</span>
              <blockquote className="about-editorial-quote">
                &ldquo;No concebimos una obra sin rigurosidad técnica ni cumplimiento exacto de plazos.
                Cada proyecto es un compromiso formal con el mandante.&rdquo;
              </blockquote>
              <p>
                En <strong>Construcciones CSALMA SPA</strong> abordamos obras civiles, fundaciones,
                estructuras metálicas y de hormigón armado, así como proyectos de construcción integral,
                mantenimiento y renovación de espacios.
              </p>
              <p>
                Trabajamos con cubicaciones detalladas partida por partida antes de entrar a faena,
                programación Carta Gantt formal y materiales certificados que cumplen con la normativa
                sísmica chilena vigente (<strong>NCh433 / NCh2123</strong>).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Equipo (3 personas centradas con iconos SVG de WhatsApp y Correo) */}
      <section className="about-team section-wrap" id="equipo" aria-labelledby="team-title">
        <div className="container">
          <header className="about-team-header">
            <h2 id="team-title">Nuestro Equipo</h2>
            <p className="about-team-subtitle">
              Dirección Ejecutiva, Ingeniería y Operaciones en Terreno
            </p>
            <p className="about-team-intro">
              Cada proyecto cuenta con liderazgo técnico y supervisión directa para coordinar las
              partidas críticas desde la planificación inicial hasta la entrega conforme.
            </p>
          </header>

          <div className="about-team-grid">
            {TEAM_ROLES.map((member) => (
              <article className="about-team-card" key={member.name}>
                <div className="about-team-photo" aria-hidden="true">
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" width="56" height="56">
                    <circle cx="32" cy="22" r="10" />
                    <path d="M14 54c0-10 8-16 18-16s18 6 18 16" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="about-team-body">
                  <h3>{member.name}</h3>
                  <p className="about-team-role">{member.role}</p>
                  <p className="about-team-bio">{member.bio}</p>
                  <div className="about-team-links">
                    <a
                      href={`mailto:${member.email}`}
                      className="team-contact-btn"
                      aria-label={`Enviar correo a ${member.name}`}
                      title="Enviar correo"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                    <a
                      href={`https://wa.me/56912345678?text=${member.whatsappText}`}
                      className="team-contact-btn team-contact-btn--wsp"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Contactar por WhatsApp a ${member.name}`}
                      title="Contactar por WhatsApp"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.76 14.12c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.93-4.37-.15-.19-1.18-1.57-1.18-2.99 0-1.43.75-2.13 1.01-2.42.27-.29.58-.36.77-.36.19 0 .39 0 .56.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.19-.14.31-.29.48-.14.17-.31.38-.44.51-.14.14-.3.3-.13.59.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.34 1.44.29.15.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.65-.14.27.1 1.69.8 1.98.94.29.14.48.22.55.34.07.12.07.7-.17 1.38Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Misión, Visión y Valores */}
      <section className="about-mvv section-wrap" id="mision-vision" aria-labelledby="mvv-title">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Propósito y Compromiso</p>
              <h2 id="mvv-title">Misión, Visión y Valores</h2>
            </div>
            <p>Los pilares contractuales y humanos que respaldan cada obra entregada.</p>
          </div>

          <div className="about-mvv-grid">
            {PILLARS_VALUES.map((item) => (
              <article className="about-mvv-card" key={item.code}>
                <span className="about-mvv-code">{item.code}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <div className="about-cta-bar">
            <Link className="btn-primary" to="/#contacto">
              Solicitar cotización <span aria-hidden="true">↗</span>
            </Link>
            <Link className="about-secondary-btn" to="/#obras">
              Ver obras ejecutadas
            </Link>
            <Link className="about-secondary-btn" to="/">
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
