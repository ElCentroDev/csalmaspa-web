import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Construcciones Salma SPA, inicio">
          <span className="brand-mark" aria-hidden="true">CS</span>
          <span className="brand-name">Construcciones Salma <span>SPA</span></span>
        </Link>
      </div>
    </header>
  )
}

export default Header
