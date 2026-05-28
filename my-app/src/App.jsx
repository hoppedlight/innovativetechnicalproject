import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

const COLORS = {
  nn : '#F5A623',
  twoopt : '#4FC3F7',
  greedy : '#81C784',
  dijkstra : '#CE93D8',
}

const ALGO_META = [
  { id : 'nn', label : 'Nearest Neighbor', short : 'NN', color : COLORS.nn, desc : `Start from depot, always visit the closest unvisited stop. Fast, intuitive, suboptimal.` },
  { id : 'twoopt', label : '2-Opt', short : '2-OPT', color : COLORS.twoopt, desc : `Iteratively reverses sub-routes to remove crossings. Classic TSP local search.` },
  { id : 'greedy', label : 'Greedy', short : 'GDY', color : COLORS.greedy, desc : `Build route by merging shortest edges that don't create a premature cycle.` },
  { id : 'dijkstra', label : 'Dijkstra', short : 'DIJK', color : COLORS.dijkstra, desc : `Shortest cumulative path from depot through a priority queue. Graph-aware.` },
]


function makePreset(name, seed, n, W, H) {
  const rng = (s => () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 })(seed)
  const pts = Array.from({ length: n }, (_, i) => ({
    id : i, label : i === 0 ? 'Depot' : `P${String(i).padStart(2,'0')}`,
    x : Math.round(rng() * (W - 80) + 40),
    y : Math.round(rng() * (H - 80) + 40),
  }))
  return { name, nodes: pts }
}

const CANVAS_W = 680
const CANVAS_H = 420

const PRESETS = [
  makePreset('City grid', 42, 12, CANVAS_W, CANVAS_H),
  makePreset('Suburban', 99, 18, CANVAS_W, CANVAS_H),
  makePreset('Rural sparse', 7, 8, CANVAS_W, CANVAS_H),
  makePreset('Dense urban', 313, 24, CANVAS_W, CANVAS_H),
]


export default function App() {
  const [count, setCount] = useState(0)
  const [nodes, setNodes] = useState(PRESETS[0].nodes)
  const [results, setResults] = useState(() => runAll(PRESETS[0].nodes))
  const [activeAlgos, setActiveAlgos] = useState(new Set(['nn','twoopt']))
  const [focusAlgo, setFocusAlgo] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const [presetIdx, setPresetIdx] = useState(0)
  const [addMode, setAddMode] = useState(false)
  const svgRef = useRef(null)


  return (
    <>
      <div className = "app">
        {/* Header */}
        <div className = "header">
          <div className = "header-left">
            <h1>Route<span>Improver</span></h1>
            <p>Parcel delivery · Algorithm explorer · Prototype v0.1</p>
          </div>
          <div className = "version-badge">TSP · DIJKSTRA · 2-OPT · GREEDY</div>
        </div>

        <div className = "grid">
          {/* Canvas */}
          <div>
            <div className = "panel">
              {/* Preset selector */}
              <div className = "presets">
                {PRESETS.map((p, i) => (
                  <button
                    key = {i}
                    className = {`preset-pill${presetIdx === i ? ' active' : ''}`}
                    onClick = {() => loadPreset(i)}
                  >
                    {p.name} ({p.nodes.length})
                  </button>
                ))}
              </div>

              {/* Algorithm toggler */}
              <div className = "algo-toggles">
                <span style = {{ fontFamily : 'JetBrains Mono', fontSize : 10, color : '#6e7681', marginRight : 4 }}>SHOW :</span>
                {ALGO_META.map(a => {
                  const active = activeAlgos.has(a.id)
                  return (
                    <button
                      key = {a.id}
                      className = "algo-chip"
                      style = {{
                        borderColor : active ? a.color : 'transparent',
                        color : active ? a.color : '#6e7681',
                        background : active ? `${a.color}18` : '#21262d',
                      }}
                      onClick = {() => toggleAlgo(a.id)}
                    >
                      {a.short}
                    </button>
                  )
                })}
                {focusAlgo && (
                  <button className = "btn btn-sm" onClick={() => setFocusAlgo(null)}>
                    ✕ clear focus
                  </button>
                )}
              </div>

              {/* Canvas */}
              <div className = "canvas-wrap">
                <svg
                  ref = {svgRef}
                  className = {`canvas-svg${addMode ? ' add-mode' : ''}`}
                  viewBox = {`0 0 ${CANVAS_W} ${CANVAS_H}`}
                  onClick = {handleCanvasClick}
                  key = {animKey}
                >
                  {/* Grid */}
                  {Array.from({ length: Math.floor(CANVAS_W / 60) }, (_, i) => (
                    <line key = {`gx${i}`} className = "grid-line" x1 = {(i + 1) * 60} y1 = {0} x2 = {(i + 1) * 60} y2 = {CANVAS_H} />
                  ))}
                  {Array.from({ length: Math.floor(CANVAS_H / 60) }, (_, i) => (
                    <line key = {`gy${i}`} className = "grid-line" x1 = {0} y1 = {(i + 1) * 60} x2 = {CANVAS_W} y2 = {(i + 1) * 60} />
                  ))}

                  {/* Routes */}
                  {ALGO_META.map(a => {
                    if (!displayAlgos.includes(a.id)) return null
                    const r = results[a.id]
                    if (!r) return null
                    return (
                      <RoutePath
                        key = {a.id}
                        route = {r.route}
                        nodes = {nodes}
                        color = {a.color}
                        opacity = {focusAlgo ? (focusAlgo === a.id ? 1 : 0.15) : 0.75}
                        animated = {focusAlgo === a.id}
                      />
                    )
                  })}

                  {/* Nodes */}
                  {nodes.map((node, i) => (
                    <NodeDot
                      key = {i}
                      node = {node}
                      index = {i}
                      selected = {false}
                      onClick = {(e) => { e.stopPropagation() }}
                    />
                  ))}
                </svg>
              </div>

              {/* Stat summary */}
              {bestId && results[bestId] && (
                <div className = "stat-row">
                  <div className = "stat-cell">
                    <div className = "stat-cell-label">Nodes</div>
                    <div className = "stat-cell-val">{nodes.length}</div>
                    <div className = "stat-cell-sub">incl. depot</div>
                  </div>
                  <div className = "stat-cell">
                    <div className = "stat-cell-label">Best route</div>
                    <div className = "stat-cell-val" style = {{ color : COLORS[bestId] }}>
                      {Math.round(results[bestId].dist)}
                    </div>
                    <div className = "stat-cell-sub">px units</div>
                  </div>
                  <div className = "stat-cell">
                    <div className = "stat-cell-label">Best algo</div>
                    <div className = "stat-cell-val" style = {{ color : COLORS[bestId], fontSize : 12 }}>
                      {ALGO_META.find(a => a.id === bestId)?.short}
                    </div>
                    <div className = "stat-cell-sub">{results[bestId].ms.toFixed(2)} ms</div>
                  </div>
                  <div className = "stat-cell">
                    <div className = "stat-cell-label">Worst/best</div>
                    <div className = "stat-cell-val">
                      {(() => {
                        const vals = Object.values(results).map(r => r.dist)
                        return `${Math.round((Math.max(...vals) / Math.min(...vals) - 1) * 100)}%`
                      })()}
                    </div>
                    <div className = "stat-cell-sub">gap</div>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className = "toolbar">
                <button
                  className = {`btn${addMode ? ' active' : ''}`}
                  onClick = {() => setAddMode(v => !v)}
                >
                  {addMode ? '✓ click map to add' : '+ add stop'}
                </button>
                <button className = "btn danger" onClick = {removeLastNode}>
                  − remove last
                </button>
                <div className = "sep" />
                <button className = "btn" onClick = {() => recompute(nodes)}>
                  ↻ rerun
                </button>
                <div className = "node-count">{nodes.length} stops</div>
              </div>
            </div>
          </div>

          {/* Results sidebar */}
          <div style={{ display : 'flex', flexDirection : 'column', gap : 20 }}>
            {/* Algorithm results */}
            <div className = "panel">
              <div className = "panel-header">
                <span className = "panel-title">Algorithm results</span>
                <span style = {{ fontFamily : 'JetBrains Mono', fontSize : 10, color : '#6e7681' }}>click to focus</span>
              </div>
              <div className = "results-list">
                {ALGO_META.map(a => {
                  const r = results[a.id]
                  if (!r) return null
                  const isBest = a.id === bestId
                  const isFocused = focusAlgo === a.id
                  return (
                    <div
                      key = {a.id}
                      className = {`result-card${isFocused ? ' focused' : ''}`}
                      style = {{ '--accent': a.color }}
                      onClick = {() => setFocusAlgo(isFocused ? null : a.id)}
                    >
                      <div className = "result-card-header" style = {{ background: `${a.color}0a` }}>
                        <div className = "result-card-name">
                          <div className = "dot" style = {{ background: a.color }} />
                          {a.label}
                        </div>
                        {isBest && <span className = "best-badge">BEST</span>}
                      </div>
                      <div className = "result-card-body">
                        <div className = "metric">
                          <div className = "metric-label">Distance</div>
                          <div className = {`metric-value${isBest ? ' highlight' : ''}`}>
                            {Math.round(r.dist)}
                          </div>
                        </div>
                        <div className = "metric">
                          <div className = "metric-label">Time</div>
                          <div className = "metric-value">{r.ms < 0.1 ? '<0.1' : r.ms.toFixed(1)} ms</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bar chart */}
              {Object.keys(results).length > 0 && (() => {
                const maxD = Math.max(...Object.values(results).map(r => r.dist))
                return (
                  <div className = "chart-area">
                    <div className = "chart-label">Distance comparison</div>
                    {ALGO_META.map(a => {
                      const r = results[a.id]
                      if (!r) return null
                      const pct = (r.dist / maxD) * 100
                      return (
                        <div key = {a.id} className = "bar-row">
                          <div className = "bar-name">{a.short}</div>
                          <div className = "bar-track">
                            <div className = "bar-fill" style = {{ width:`${pct}%`, background: a.color }} />
                          </div>
                          <div className = "bar-val">{Math.round(r.dist)}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Algorithm descriptions */}
            <div className = "panel">
              <div className = "panel-header">
                <span className = "panel-title">About the algorithms</span>
              </div>
              <div className = "algo-info">
                {ALGO_META.map(a => (
                  <div key = {a.id} className = "algo-info-card">
                    <div className = "algo-info-dot" style = {{ background : a.color }} />
                    <div>
                      <div className = "algo-info-name">{a.label}</div>
                      <div className = "algo-info-text">{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>

  )
}
