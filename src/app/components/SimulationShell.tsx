import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import styles from './SimulationShell.module.css'
import type { Simulation, SimulationContent } from '@physicslab/shared-types'

interface Props {
  slug: string
  children: ReactNode
}

/**
 * SimulationShell
 *
 * Contenedor común para todas las simulaciones.
 * Proporciona:
 *   - Header con nombre, categoría y botón volver
 *   - Layout de panel de control + canvas (flex responsivo)
 *   - Panel lateral con contenido didáctico (teoría, fórmulas, glosario)
 *   - Carga de metadata y contenido desde la API
 */
export default function SimulationShell({ slug, children }: Props) {
  const [sim, setSim]         = useState<Simulation | null>(null)
  const [content, setContent] = useState<SimulationContent | null>(null)
  const [tab, setTab]         = useState<'sim' | 'teoria' | 'glosario'>('sim')

  useEffect(() => {
    fetch(`/api/simulations/${slug}`)
      .then(r => r.json())
      .then(d => setSim(d.data))
      .catch(() => {}) // falla silenciosa — los datos del registry son suficientes

    fetch(`/api/content/${slug}`)
      .then(r => r.json())
      .then(d => setContent(d.data))
      .catch(() => {})
  }, [slug])

  return (
    <div className={styles.shell}>
      <Header />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <div className={styles.breadcrumbInner}>
          <Link to="/" className={styles.breadcrumbLink}>Inicio</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbCurrent}>{sim?.titulo ?? slug}</span>
          {sim && (
            <span className={`badge badge--${sim.dificultad}`} style={{ marginLeft: 'var(--sp-3)' }}>
              {sim.dificultad}
            </span>
          )}
        </div>
      </div>

      {/* Tab bar (móvil) */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'sim' ? styles.tabActive : ''}`}
          onClick={() => setTab('sim')}
        >
          Simulación
        </button>
        <button
          className={`${styles.tab} ${tab === 'teoria' ? styles.tabActive : ''}`}
          onClick={() => setTab('teoria')}
        >
          Teoría
        </button>
        <button
          className={`${styles.tab} ${tab === 'glosario' ? styles.tabActive : ''}`}
          onClick={() => setTab('glosario')}
        >
          Glosario
        </button>
      </div>

      {/* Contenido principal */}
      <main className={styles.main}>
        {/* Panel de simulación */}
        <div className={`${styles.simPanel} ${tab !== 'sim' ? styles.hiddenMobile : ''}`}>
          {children}
        </div>

        {/* Panel de información */}
        <aside className={`${styles.infoPanel} ${tab === 'sim' ? styles.hiddenMobile : ''}`}>
          {tab !== 'sim' && (
            <div className={styles.infoContent}>
              {tab === 'teoria' && content && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Teoría</h2>
                  <div className={styles.theory}>
                    {content.teoria.split('\n\n').map((p, i) => (
                      <p key={i} dangerouslySetInnerHTML={{
                        __html: p
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }} />
                    ))}
                  </div>
                  <h3 className={styles.subTitle}>Fórmulas</h3>
                  {content.formulas.map((f, i) => (
                    <div key={i} className={styles.formulaCard}>
                      <code className={styles.formulaExpr}>{f.expresion}</code>
                      <p className={styles.formulaDesc}>{f.descripcion}</p>
                      <div className={styles.variables}>
                        {f.variables.map(v => (
                          <div key={v.simbolo} className={styles.variable}>
                            <code className={styles.varSymbol}>{v.simbolo}</code>
                            <span className={styles.varDesc}>{v.descripcion}</span>
                            <span className={styles.varUnit}>[{v.unidad}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <h3 className={styles.subTitle}>Unidades SI</h3>
                  <table className={styles.unitTable}>
                    <thead>
                      <tr>
                        <th>Magnitud</th><th>Unidad</th><th>Símbolo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.unidades.map(u => (
                        <tr key={u.simbolo}>
                          <td>{u.magnitud}</td>
                          <td>{u.unidad}</td>
                          <td><code>{u.simbolo}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'glosario' && content && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Glosario</h2>
                  <dl className={styles.glossary}>
                    {content.glosario.map(g => (
                      <div key={g.termino} className={styles.glossaryItem}>
                        <dt className={styles.glossaryTerm}>{g.termino}</dt>
                        <dd className={styles.glossaryDef}>{g.definicion}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}

          {/* Panel desktop siempre visible */}
          <div className={styles.desktopInfo}>
            {content && (
              <>
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Fórmulas</h3>
                  {content.formulas.map((f, i) => (
                    <div key={i} className={styles.formulaCard}>
                      <code className={styles.formulaExpr}>{f.expresion}</code>
                      <p className={styles.formulaDesc}>{f.descripcion}</p>
                    </div>
                  ))}
                </div>
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Unidades</h3>
                  <div className={styles.units}>
                    {content.unidades.map(u => (
                      <div key={u.simbolo} className={styles.unit}>
                        <code>{u.simbolo}</code>
                        <span>{u.magnitud}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
