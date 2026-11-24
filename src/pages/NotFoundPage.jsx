import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="container not-found">
      <p className="eyebrow">404</p>
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no está disponible.</p>
      <Link className="button button-primary" to="/">Volver al inicio</Link>
    </section>
  )
}

export default NotFoundPage
