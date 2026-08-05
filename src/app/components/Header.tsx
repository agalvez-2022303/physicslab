import { Link, useLocation } from 'react-router-dom'
import styles from './Header.module.css'

export default function Header() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMark}>K</span>
          <span className={styles.logoText}>Kinal Simulator</span>
        </Link>

        {!isHome && (
          <Link to="/" className={`btn btn--ghost ${styles.back}`}>
            ← Inicio
          </Link>
        )}
      </div>
    </header>
  )
}
