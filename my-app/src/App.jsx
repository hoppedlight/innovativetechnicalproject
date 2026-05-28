import { useState, useRef, useEffect, useCallback } from 'react'
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

// Helpers 
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const totalDist = (route, nodes) =>
  route.reduce((s, id, i, arr) => {
    const next = arr[(i + 1) % arr.length]
    return s + dist(nodes[id], nodes[next])
  }, 0)

// Algorithms 
function nearestNeighbour(nodes) {
  if (nodes.length < 2) return nodes.map((_, i) => i)
  const visited = new Set([0])
  const route = [0]
  while (visited.size < nodes.length) {
    const last = route[route.length - 1]
    let best = -1, bestD = Infinity
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i)) {
        const d = dist(nodes[last], nodes[i])
        if (d < bestD) { bestD = d; best = i }
      }
    }
    visited.add(best)
    route.push(best)
  }
  return route
}

function twoOpt(nodes) {
  let route = nearestNeighbour(nodes)
  let improved = true
  while (improved) {
    improved = false
    for (let i = 1; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const d1 = dist(nodes[route[i - 1]], nodes[route[i]])   + dist(nodes[route[k]], nodes[route[(k + 1) % route.length]])
        const d2 = dist(nodes[route[i - 1]], nodes[route[k]])   + dist(nodes[route[i]], nodes[route[(k + 1) % route.length]])
        if (d2 < d1 - 0.001) {
          route = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)]
          improved = true
        }
      }
    }
  }
  return route
}

function greedyTSP(nodes) {
  if (nodes.length < 2) return nodes.map((_, i) => i)
  const edges = []
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      edges.push({ i, j, d : dist(nodes[i], nodes[j]) })
  edges.sort((a, b) => a.d - b.d)

  const degree = new Array(nodes.length).fill(0)
  const adj = Array.from({ length: nodes.length }, () => [])

  const find = (parent, x) => { while (parent[x] !== x) x = parent[x]; return x }
  const parent = nodes.map((_, i) => i)

  for (const { i, j } of edges) {
    if (adj.flat().length / 2 === nodes.length) break
    if (degree[i] >= 2 || degree[j] >= 2) continue
    const ri = find(parent, i), rj = find(parent, j)
    if (ri === rj && adj.flat().length / 2 < nodes.length - 1) continue
    parent[ri] = rj
    degree[i]++; degree[j]++
    adj[i].push(j); adj[j].push(i)
  }

  const route = [0]
  const seen = new Set([0])
  while (route.length < nodes.length) {
    const cur = route[route.length - 1]
    const next = adj[cur]?.find(n => !seen.has(n))
    if (next === undefined) break
    seen.add(next)
    route.push(next)
  }
  for (let i = 0; i < nodes.length; i++) if (!seen.has(i)) route.push(i)
  return route
}

function dijkstraTSP(nodes) {
  if (nodes.length < 2) return nodes.map((_, i) => i)
  const visited = new Set([0])
  const dist_from = new Array(nodes.length).fill(Infinity)
  dist_from[0] = 0
  const route = [0]
  while (visited.size < nodes.length) {
    const cur = route[route.length - 1]
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i)) {
        const d = dist_from[cur] + dist(nodes[cur], nodes[i])
        if (d < dist_from[i]) dist_from[i] = d
      }
    }
    let best = -1, bestD = Infinity
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && dist_from[i] < bestD) { bestD = dist_from[i]; best = i }
    }
    if (best === -1) break
    visited.add(best); route.push(best)
  }
  return route
}

// Run all algos + measure time 
function runAll(nodes) {
  if (nodes.length < 2) return {}
  const fns = { nn : nearestNeighbour, twoopt : twoOpt, greedy : greedyTSP, dijkstra : dijkstraTSP }
  const out = {}
  for (const [id, fn] of Object.entries(fns)) {
    const t0 = performance.now()
    const route = fn(nodes)
    const ms = performance.now() - t0
    out[id] = { route, dist : totalDist(route, nodes), ms }
  }
  return out
}


function makePreset(name, seed, n, W, H) {
  const rng = (s => () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 })(seed)
  const pts = Array.from({ length: n }, (_, i) => ({
    id : i, label : i === 0 ? 'Depot' : `P${String(i).padStart(2, '0')}`,
    x : Math.round(rng() * (W - 80) + 40),
    y : Math.round(rng() * (H - 80) + 40),
  }))
  return { name, nodes : pts }
}

const CANVAS_W = 680
const CANVAS_H = 420

const PRESETS = [
  makePreset('City grid', 42, 12, CANVAS_W, CANVAS_H),
  makePreset('Suburban', 99, 18, CANVAS_W, CANVAS_H),
  makePreset('Rural sparse', 7, 8, CANVAS_W, CANVAS_H),
  makePreset('Dense urban', 313, 24, CANVAS_W, CANVAS_H),
]

function RoutePath({ route, nodes, color, opacity = 1, animated = false }) {
  if (!route || route.length < 2) return null
  const pts = [...route, route[0]].map(i => nodes[i])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <path
      d = {d}
      fill = "none"
      stroke = {color}
      strokeWidth = {animated ? 2.5 : 1.5}
      strokeOpacity = {opacity}
      strokeLinejoin = "round"
      strokeLinecap = "round"
      style = {animated ? {
        strokeDasharray : 2000,
        strokeDashoffset : 0,
        animation : 'dash 1.2s ease-out forwards',
      } : {}}
    />
  )
}

function NodeDot({ node, index, selected, onClick }) {
  const isDepot = index === 0
  return (
    <g
      transform = {`translate(${node.x},${node.y})`}
      onClick = {onClick}
      style = {{ cursor : 'pointer' }}
    >
      {selected && (
        <circle r = {isDepot ? 14 : 11} fill = "none" stroke = "#fff" strokeWidth = {1.5} strokeOpacity = {0.4} />
      )}
      <circle
        r = {isDepot ? 10 : 7}
        fill = {isDepot ? '#F5A623' : '#1a2332'}
        stroke = {isDepot ? '#FFD580' : '#4FC3F7'}
        strokeWidth = {isDepot ? 2 : 1.5}
      />
      {isDepot && (
        <text textAnchor = "middle" dominantBaseline = "central" fontSize = {10} fontWeight = {700} fill = "#1a1f2e" fontFamily = "monospace">D</text>
      )}
      {!isDepot && (
        <text textAnchor = "middle" dominantBaseline = "central" fontSize = {8} fill = "#93c5fd" fontFamily = "monospace">{index}</text>
      )}
    </g>
  )
}

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

  const recompute = useCallback((ns) => {
    setResults(runAll(ns))
    setAnimKey(k => k + 1)
  }, [])

  const loadPreset = (i) => {
    setPresetIdx(i)
    setNodes(PRESETS[i].nodes)
    recompute(PRESETS[i].nodes)
    setFocusAlgo(null)
  }

  const handleCanvasClick = (e) => {
    if (!addMode) return
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    const id = nodes.length
    const newNodes = [...nodes, { id, label: `P${String(id).padStart(2,'0')}`, x, y }]
    setNodes(newNodes)
    recompute(newNodes)
  }

  const removeLastNode = () => {
    if (nodes.length <= 2) return
    const newNodes = nodes.slice(0, -1)
    setNodes(newNodes)
    recompute(newNodes)
  }

  const toggleAlgo = (id) => {
    setActiveAlgos(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size > 1) next.delete(id) }
      else next.add(id)
      return next
    })
  }

  const bestId = results && Object.entries(results).length > 0
    ? Object.entries(results).sort((a, b) => a[1].dist - b[1].dist)[0][0]
    : null

  const displayAlgos = focusAlgo ? [focusAlgo] : [...activeAlgos]


  return (
    <>
      <div className = "app">
        {/* Header */}
        <div className = "header">
          <div className = "header-left">
            <h1>Route<span> Improver</span></h1>
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
