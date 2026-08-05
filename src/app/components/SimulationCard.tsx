import { Link } from 'react-router-dom'
import type { SimulationEntry } from '../registry/simulations.registry'
import styles from './SimulationCard.module.css'

interface Props {
  simulation: SimulationEntry
  index?: number
}

export default function SimulationCard({ simulation, index = 0 }: Props) {
  const isActive = simulation.estado === 'active'

  const card = (
    <div
      className={`${styles.card} ${isActive ? styles.active : styles.comingSoon}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Icono */}
      <div className={styles.iconWrap}>
        <span className={styles.icon} aria-hidden="true">{simulation.icono}</span>
      </div>

      {/* Contenido */}
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={`badge badge--${simulation.dificultad}`}>
            {simulation.dificultad}
          </span>
          {!isActive && <span className={styles.comingTag}>Próximamente</span>}
        </div>

        <h3 className={styles.title}>{simulation.titulo}</h3>
        <p className={styles.desc}>{simulation.descripcionCorta}</p>

        <div className={styles.tags}>
          {simulation.etiquetas.slice(0, 3).map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Indicador activo */}
      {isActive && <div className={styles.activeIndicator} aria-hidden="true" />}
    </div>
  )

  if (!isActive) return card

  return (
    <Link to={simulation.path} className={styles.link}>
      {card}
    </Link>
  )
}
