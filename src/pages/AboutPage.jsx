import { Link } from 'react-router-dom'

const TEAM_ROLES = [
  {
    code: 'DIR // 01',
    name: 'Dirección General',
    role: 'Gerencia y Licitaciones',
    bio: 'Lidera la relación contractual con el mandante, evaluación técnica de presupuestos cerrados y seguimiento estratégico de cada proyecto.',
    email: 'correo@csalma.cl',
  },
  {
    code: 'ING // 02',
    name: 'Gerencia Técnica',
    role: 'Ingeniería y Normativa NCh433',
    bio: 'Responsable de cubicaciones, revisión de planos estructurales, trazabilidad de materiales y cumplimiento de normativa sísmica chilena.',
    email: 'correo@csalma.cl',
  },
  {
    code: 'OBR // 03',
    name: 'Jefatura de Terreno',
    role: 'Supervisión Residente en Faena',
    bio: 'Coordina especialidades en obra, controla avances de Carta Gantt, tolerancias constructivas y estándares de seguridad laboral.',
    email: 'correo@csalma.cl',
  },
  {
    code: 'ADM // 04',
    name: 'Post-Venta y Calidad',
    role: 'Inspección y Recepción Conforme',
    bio: 'Ejecuta controles de calidad previos a la entrega y brinda soporte técnico post-entrega con respaldo formal.',
    email: 'correo@csalma.cl',
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
      {/* 1. Banner fotográfico de empresa + submenú editorial (estilo referencia 1) */}
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
              <a href="#equipo">Equipo</a>
              <a href="#sobre-csalma">Sobre CSALMA</a>
              <a href="#mision-vision">Misión y Visión</a>
            </nav>
            <span className="about-subnav-badge">CSALMA // CHILE</span>
          </div>
        </div>
      </section>

      {/* 2. Equipo en grilla limpia de 4 columnas (estilo referencia 2) */}
      <section className="about-team section-wrap" id="equipo" aria-labelledby="team-title">
        <div className="container">
          <header className="about-team-header">
            <h2 id="team-title">Quiénes somos</h2>
            <p className="about-team-subtitle">
              Equipo multidisciplinario de Ingeniería, Construcción y Supervisión en Terreno
            </p>
            <p className="about-team-intro">
              Cada proyecto cuenta con profesionales residentes y especialistas dedicados a coordinar
              las partidas críticas desde la planificación inicial hasta la entrega final.
            </p>
          </header>

          <div className="about-team-grid">
            {TEAM_ROLES.map((member) => (
              <article className="about-team-card" key={member.code}>
                <div className="about-team-photo" aria-hidden="true">
                  <span className="about-team-code">{member.code}</span>
                  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" width="52" height="52">
                    <circle cx="32" cy="22" r="10" />
                    <path d="M14 54c0-10 8-16 18-16s18 6 18 16" strokeLinecap="round" />
                  </svg>
                </div>
                <h3>{member.name}</h3>
                <p className="about-team-role">{member.role}</p>
                <p className="about-team-bio">{member.bio}</p>
                <div className="about-team-links">
                  <a href={`mailto:${member.email}`} aria-label={`Enviar correo a ${member.name}`}>
                    ✉
                  </a>
                  <a
                    href="https://wa.me/56912345678?text=Hola%20CSALMA,%20quisiera%20contactar%20al%20equipo%20t%C3%A9cnico"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Contactar por WhatsApp a ${member.name}`}
                  >
                    ✆
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. About / Información corporativa de CSALMA (estilo referencia 1 inferior) */}
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
