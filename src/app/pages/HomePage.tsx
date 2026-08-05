import { useState, useMemo } from 'react'
import Header from '../components/Header'
import HeroCanvas from '../components/HeroCanvas'
import SimulationCard from '../components/SimulationCard'
import {
  SIMULATIONS_REGISTRY,
  getByCategory,
  filterByText,
  type SimulationEntry,
} from '../registry/simulations.registry'
import styles from './HomePage.module.css'

const CATEGORY_NAMES: Record<string, string> = {
  mecanica:           'Mecánica',
  'oscilaciones-ondas': 'Oscilaciones y Ondas',
  electrodinamica:    'Electrodinámica',
  optica:             'Óptica',
  termodinamica:      'Termodinámica',
  relatividad:        'Teoría de la Relatividad',
  'fisica-atomica':   'Física Atómica',
  'fisica-nuclear':   'Física Nuclear',
  'estado-solido':    'Estado Sólido',
}

const CATEGORIES = Object.keys(CATEGORY_NAMES)

export default function HomePage() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<string>('todas')

  const filtered: SimulationEntry[] = useMemo(() => {
    let sims = [...SIMULATIONS_REGISTRY]
    if (filter !== 'todas') sims = sims.filter(s => s.categoriaId === filter)
    if (search.trim()) sims = filterByText(sims, search)
    return sims
  }, [search, filter])

  const byCategory = useMemo(() => getByCategory(), [])
  const showSearch = search.trim() || filter !== 'todas'

  return (
    <div className={styles.page}>
      <Header />

      {/* ─── Hero ───────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <HeroCanvas />
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>Plataforma de Simulaciones</div>
          <h1 className={styles.heroTitle}>
            Física <span className={styles.heroAccent}>interactiva</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Experimenta con más de 125 simulaciones. Ajusta parámetros en tiempo real
            y visualiza los fenómenos físicos.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>125</span>
              <span className={styles.statLabel}>Simulaciones</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>9</span>
              <span className={styles.statLabel}>Categorías</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>3</span>
              <span className={styles.statLabel}>Disponibles</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Búsqueda y filtros ──────────────────────────────────── */}
      <section className={styles.controls}>
        <div className={styles.controlsInner}>
          {/* Buscador */}
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon} aria-hidden="true">⌕</span>
            <input
              id="search-simulations"
              type="search"
              className={`input ${styles.search}`}
              placeholder="Buscar simulación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar simulaciones"
            />
          </div>

          {/* Filtros de categoría */}
          <div className={styles.filters} role="group" aria-label="Filtrar por categoría">
            <button
              className={`${styles.filterBtn} ${filter === 'todas' ? styles.filterActive : ''}`}
              onClick={() => setFilter('todas')}
            >
              Todas
            </button>
            {CATEGORIES.filter(cat =>
              SIMULATIONS_REGISTRY.some(s => s.categoriaId === cat)
            ).map(cat => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {CATEGORY_NAMES[cat]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Grid de simulaciones ────────────────────────────────── */}
      <main className={styles.main} id="simulaciones">
        {showSearch ? (
          // Vista plana cuando hay filtro/búsqueda
          <section className={styles.category}>
            <div className={styles.categoryHeader}>
              <h2 className={styles.categoryTitle}>
                {filtered.length > 0
                  ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                  : 'Sin resultados'}
              </h2>
            </div>
            {filtered.length > 0 ? (
              <div className={styles.grid}>
                {filtered.map((sim, i) => (
                  <SimulationCard key={sim.id} simulation={sim} index={i} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>◎</span>
                <p>No se encontraron simulaciones para "{search}"</p>
              </div>
            )}
          </section>
        ) : (
          // Vista agrupada por categorías
          Object.entries(byCategory).map(([catId, sims]) => (
            <section key={catId} className={styles.category}>
              <div className={styles.categoryHeader}>
                <h2 className={styles.categoryTitle}>{CATEGORY_NAMES[catId]}</h2>
                <span className={styles.categoryCount}>
                  {sims.filter(s => s.estado === 'active').length} activa{sims.filter(s => s.estado === 'active').length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.grid}>
                {sims.map((sim, i) => (
                  <SimulationCard key={sim.id} simulation={sim} index={i} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>Φ PhysicsLab</span>
          <span className={styles.footerText}>
            Fase 1 · 3 de 125 simulaciones
          </span>
        </div>
      </footer>
    </div>
  )
}
