import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SimulationShell from './components/SimulationShell'

// Code-split por simulación — cada chunk se carga solo cuando se necesita
const ConstantAcceleration = lazy(
  () => import('./simulations/constant-acceleration/ConstantAcceleration')
)
const ThreeForcesEquilibrium = lazy(
  () => import('./simulations/three-forces/ThreeForcesEquilibrium')
)
const ForceComposition = lazy(
  () => import('./simulations/force-composition/ForceComposition')
)

function SimulationLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div className="spinner" />
      <span style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
        Cargando simulación...
      </span>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/sim/movimiento-aceleracion-constante"
        element={
          <SimulationShell slug="movimiento-aceleracion-constante">
            <Suspense fallback={<SimulationLoader />}>
              <ConstantAcceleration />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/tres-fuerzas-equilibrio"
        element={
          <SimulationShell slug="tres-fuerzas-equilibrio">
            <Suspense fallback={<SimulationLoader />}>
              <ThreeForcesEquilibrium />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route
        path="/sim/composicion-fuerzas"
        element={
          <SimulationShell slug="composicion-fuerzas">
            <Suspense fallback={<SimulationLoader />}>
              <ForceComposition />
            </Suspense>
          </SimulationShell>
        }
      />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
