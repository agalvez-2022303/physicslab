# Kinal Simulator — Plataforma de Simulaciones de Física Interactivas

Inspirada funcionalmente en Walter Fendt (walter-fendt.de/html5/phes/), con una interfaz futurista de alto impacto visual (exclusivamente en paleta **Blanco y Negro**), arquitectura modular preparada para escalar a ~125 simulaciones, y Serverless APIs desplegables en Vercel.

---

## 🚀 Inicio Rápido Local

### Requisitos previos
- Node.js >= 18.x
- npm >= 9.x

### Instalación y ejecución
```bash
# 1. Clonar e instalar dependencias del monorepo
npm install

# 2. Iniciar servidor de desarrollo (Frontend + API local)
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🎨 Identidad Visual
- **Paleta Estricta:** Exclusivamente `#000000`, `#080808`, `#111111` y `#FFFFFF` (escala de grises para profundidad).
- **Glassmorphism:** Paneles translúcidos con `backdrop-filter: blur(12px)`.
- **Hero Canvas 2D:** Escena interactiva de alto rendimiento con péndulo, proyectil y vectores reaccionando al mouse/touch (sin sobrecargar GPU en móviles).
- **Mobile First:** Controles táctiles optimizados, componentes con área interactiva mínima de 44px.

---

## 🏗️ Arquitectura del Monorepo

```
physicslab/
├── api/                      → Vercel Serverless Functions (Backend API)
│   ├── categories.ts         → GET /api/categories
│   ├── simulations/          → GET /api/simulations y GET /api/simulations/:slug
│   └── content/              → GET /api/content/:slug
├── data/                     → Fuente de verdad JSON
│   ├── categories.json
│   ├── simulations.json
│   └── content/              → Didáctica (teoría, fórmulas, glosario)
├── packages/
│   └── shared-types/         → Tipos TypeScript compartidos
├── src/                      → Frontend Vite + React + TypeScript
│   ├── app/
│   │   ├── registry/         → simulations.registry.ts (Registro Central)
│   │   ├── hooks/            → useAnimationLoop, useDraggable, useCanvasRenderer, useLiveChart
│   │   ├── components/       → Header, SimulationShell, SimulationCard, HeroCanvas
│   │   ├── pages/            → HomePage
│   │   └── simulations/      → Componentes de simulaciones (Lazy-loaded)
│   │       ├── constant-acceleration/
│   │       ├── three-forces/
│   │       └── force-composition/
│   └── vite.config.ts        → Code-splitting por simulación
├── vercel.json               → Configuración de despliegue en Vercel
└── package.json
```

---

## 📘 Guía: Cómo agregar la simulación #4 en adelante

Para añadir una nueva simulación (por ejemplo, `pendulo-simple`) sin romper la arquitectura:

### Paso 1: Definir los datos en Backend / JSON
1. En `data/simulations.json`, cambia el estado de la simulación de `"coming-soon"` a `"active"` (o inserta un nuevo objeto si no existía).
2. Crea el archivo de contenido didáctico `data/content/pendulo-simple.json` con la teoría, fórmulas y glosario en español.

### Paso 2: Crear el componente de la simulación
Crea la carpeta `src/app/simulations/pendulo-simple/`:
- `PenduloSimple.tsx`: Lógica de renderizado en Canvas / React usando los hooks `useAnimationLoop`, `useCanvasRenderer`, etc.
- `PenduloSimple.module.css`: Estilos locales del panel y canvas.
- `physics.ts`: Motor de física desacoplado del renderizado.

### Paso 3: Registrar en el Frontend
1. En `src/app/registry/simulations.registry.ts`:
   - Cambia el `estado` a `'active'`.
2. En `src/app/App.tsx`:
   - Añade el `React.lazy` import:
     ```ts
     const PenduloSimple = lazy(() => import('./simulations/pendulo-simple/PenduloSimple'))
     ```
   - Añade la ruta dentro de `<Routes>`:
     ```tsx
     <Route
       path="/sim/pendulo-simple"
       element={
         <SimulationShell slug="pendulo-simple">
           <Suspense fallback={<SimulationLoader />}>
             <PenduloSimple />
           </Suspense>
         </SimulationShell>
       }
     />
     ```

¡Listo! Vite separará automáticamente un nuevo *chunk* JS para esta simulación, manteniendo el bundle inicial liviano para móviles.

---

## 🧪 Pruebas
Ejecutar la suite de pruebas unitarias para los motores de física:
```bash
npm run test
```
