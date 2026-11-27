import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const CONTACT_FORM_ENABLED =
  import.meta.env.VITE_CONTACT_FORM_ENABLED === 'true' || import.meta.env.DEV

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.unobserve(el) } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function ContactSection() {
  const [formData, setFormData] = useState({
    nombre: '',
    empresa: '',
    email: '',
    telefono: '',
    especialidad: '',
    detalle: '',
    consentimiento: false,
    website_trap: '', // Honeypot anti-bot invisible
  })

  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  const leftRef  = useReveal()
  const rightRef = useReveal()

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')

    if (!CONTACT_FORM_ENABLED) return

    // Validación básica en cliente
    if (!formData.nombre.trim() || !formData.email.trim() || !formData.telefono.trim() || !formData.detalle.trim()) {
      setErrorMessage('Por favor complete todos los campos obligatorios.')
      return
    }

    if (!formData.consentimiento) {
      setErrorMessage('Debe autorizar el tratamiento de datos para procesar la cotización.')
      return
    }

    setStatus('loading')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json().catch(() => ({}))

      if (response.ok && result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Ocurrió un error al enviar su solicitud. Por favor intente más tarde o contáctenos por WhatsApp.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('No se pudo conectar con el servidor. Por favor intente más tarde.')
    }
  }

  return (
    <section className="contact-section" id="contacto" aria-labelledby="contact-title">
      {/* Texto de fondo animado en bucle continuo que se desplaza horizontalmente */}
      <div className="contact-marquee-wrap" aria-hidden="true">
        <div className="contact-marquee-track">
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
          <span>CSALMA.CL</span>
          <span className="contact-marquee-sep">·</span>
        </div>
      </div>

      <div className="container">
        <div className="contact-layout">

          {/* Columna izquierda: titular + canales oficiales balanceados */}
          <div ref={leftRef} className="reveal contact-left-col">
            <div>
              <p className="label label--light">Contacto y Licitaciones</p>
              <h2 className="contact-headline" id="contact-title">
                Hablemos<br />
                de tu <em>proyecto</em>
              </h2>
              <p className="contact-lead">
                Envíanos los requerimientos de tu obra. Nuestro equipo técnico evaluará
                los antecedentes y responderá a la brevedad con una propuesta formal.
              </p>
            </div>

            <div className="contact-info">
              <div className="contact-info-item">
                <span className="contact-info-icon">✉</span>
                <a href="mailto:correo@csalma.cl">correo@csalma.cl</a>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-icon">◷</span>
                <span>Lunes a Viernes · 09:00 a 18:00 hrs</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-icon">◈</span>
                <span>Región Metropolitana y cobertura nacional</span>
              </div>
            </div>

            <div>
              <a
                href="https://wa.me/56912345678?text=Hola%20CSALMA,%20quisiera%20solicitar%20una%20reuni%C3%B3n%20para%20un%20proyecto"
                className="whatsapp-cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="whatsapp-dot" />
                Atención directa por WhatsApp
              </a>
            </div>

            <div className="contact-security-box">
              <p className="contact-security-title">
                Seguridad de la Información (Chile)
              </p>
              <p className="contact-security-desc">
                Sus datos viajan cifrados bajo protocolo TLS y son tratados conforme a la <strong>Ley N° 19.628</strong> y estándares de la <strong>Ley Marco N° 21.663</strong>.
              </p>
            </div>
          </div>

          {/* Columna derecha: formulario seguro */}
          <div ref={rightRef} className="reveal reveal-delay-2">
            {status === 'success' ? (
              <div
                style={{
                  padding: '48px 36px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(180,122,66,0.4)',
                  textAlign: 'center',
                  color: 'var(--color-surface)',
                }}
              >
                <div style={{ width: '48px', height: '48px', margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(180,122,66,0.15)', display: 'grid', placeItems: 'center', color: 'var(--color-accent)', fontSize: '1.4rem' }}>
                  ✓
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '12px' }}>
                  Solicitud Recibida Correctamente
                </p>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-white)', marginBottom: '12px' }}>
                  Gracias por contactar a CSALMA
                </h3>
                <p style={{ color: 'var(--color-concrete)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 24px' }}>
                  Hemos recibido sus antecedentes y requerimientos. Un profesional de nuestro equipo técnico se comunicará con usted a la brevedad.
                </p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setStatus('idle')
                    setFormData({
                      nombre: '',
                      empresa: '',
                      email: '',
                      telefono: '',
                      especialidad: '',
                      detalle: '',
                      consentimiento: false,
                      website_trap: '',
                    })
                  }}
                  style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>

                {/* Campo trampa Honeypot anti-bots (Invisible a usuarios reales) */}
                <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, overflow: 'hidden' }}>
                  <label htmlFor="website_trap">Leave this field blank</label>
                  <input
                    id="website_trap"
                    name="website_trap"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website_trap}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cf-nombre">
                      Nombre y Apellido *
                    </label>
                    <input
                      id="cf-nombre"
                      name="nombre"
                      type="text"
                      className="form-input"
                      placeholder="Ej: Rodrigo Martínez"
                      required
                      maxLength={100}
                      autoComplete="name"
                      value={formData.nombre}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cf-empresa">
                      Empresa / Mandante
                    </label>
                    <input
                      id="cf-empresa"
                      name="empresa"
                      type="text"
                      className="form-input"
                      placeholder="Ej: Constructora o Inmobiliaria"
                      maxLength={120}
                      autoComplete="organization"
                      value={formData.empresa}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cf-email">
                      Correo Electrónico *
                    </label>
                    <input
                      id="cf-email"
                      name="email"
                      type="email"
                      className="form-input"
                      placeholder="contacto@empresa.cl"
                      required
                      maxLength={120}
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cf-telefono">
                      Teléfono Móvil *
                    </label>
                    <input
                      id="cf-telefono"
                      name="telefono"
                      type="tel"
                      required
                      className="form-input"
                      placeholder="+56 9 XXXX XXXX"
                      pattern="\+56\s?9(\s?\d){8}"
                      title="Ingrese el formato correcto (+56 9 XXXX XXXX)"
                      maxLength={30}
                      autoComplete="tel"
                      value={formData.telefono}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cf-especialidad">
                    Tipo de Obra o Especialidad
                  </label>
                  <input
                    id="cf-especialidad"
                    name="especialidad"
                    type="text"
                    className="form-input"
                    placeholder="Ej: Fundaciones, Obras Civiles, Estructura de Hormigón"
                    maxLength={150}
                    value={formData.especialidad}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cf-detalle">
                    Detalle del Requerimiento / Ubicación *
                  </label>
                  <textarea
                    id="cf-detalle"
                    name="detalle"
                    className="form-textarea"
                    placeholder="Describa el alcance de la obra, ubicación estimada, plazos y cualquier especificación técnica relevante..."
                    required
                    maxLength={3000}
                    value={formData.detalle}
                    onChange={handleChange}
                  />
                </div>

                {/* Consentimiento Informado (Ley 19.628 de Protección de Datos de Chile) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="cf-consentimiento"
                    name="consentimiento"
                    checked={formData.consentimiento}
                    onChange={handleChange}
                    required
                    style={{ marginTop: '3px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                  />
                  <label htmlFor="cf-consentimiento" style={{ fontSize: '0.78rem', color: 'var(--color-concrete)', lineHeight: 1.45, cursor: 'pointer' }}>
                    Autorizo el tratamiento de mis datos de contacto exclusivamente para la evaluación técnica y comercial de esta solicitud por parte de Construcciones CSALMA SPA conforme a la{' '}
                    <Link to="/privacidad" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                      Política de Privacidad (Ley N° 19.628)
                    </Link>.
                  </label>
                </div>

                {/* Mensaje de error si falla la validación o envío */}
                {errorMessage && (
                  <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.82rem', marginTop: '8px' }}>
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={!CONTACT_FORM_ENABLED || status === 'loading'}
                  style={{ opacity: !CONTACT_FORM_ENABLED || status === 'loading' ? 0.55 : 1, cursor: !CONTACT_FORM_ENABLED ? 'not-allowed' : status === 'loading' ? 'wait' : 'pointer' }}
                >
                  {!CONTACT_FORM_ENABLED ? (
                    'Envío temporalmente deshabilitado'
                  ) : status === 'loading' ? (
                    'Enviando solicitud cifrada...'
                  ) : (
                    <>
                      Enviar solicitud de cotización
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
                {!CONTACT_FORM_ENABLED && (
                  <p className="contact-form-notice" role="status">
                    El canal de contacto estará disponible próximamente. Por ahora no podemos recibir solicitudes por este formulario.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContactSection
