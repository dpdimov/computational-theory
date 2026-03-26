import { useState, useMemo, useCallback } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  CartesianGrid
} from "recharts";

// ── Box-Muller normal sampler ────────────────────────────────────────────────
function randn() {
  let u, v;
  do { u = Math.random(); } while (!u);
  do { v = Math.random(); } while (!v);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const N_STATS   = 6000;
const N_SCATTER = 1200;
const CLIP      = 3.5;

// ── 8 zones based on signal signs (Fc, Fp, M) ───────────────────────────────
// These are inherent to the belief, independent of strategy
function classify(fc, fp, vm1) {
  const c = fc > 0, p = fp > 0, m = vm1 > 0;
  if  (c &&  p &&  m) return "FS";   // Full Success
  if  (c &&  p && !m) return "FF";   // Full Failure
  if  (c && !p &&  m) return "PM";   // Product Missed
  if  (c && !p && !m) return "PS";   // Product Saved
  if (!c &&  p &&  m) return "GD";   // Garage Discovery
  if (!c &&  p && !m) return "BF";   // Builder's Folly
  if (!c && !p &&  m) return "DB";   // Double Blind
  return "DC";                        // Double Correct
}

// ── Strategy determines which zones lead to pursuit ──────────────────────────
const PURSUED_BY_STRATEGY = {
  dual:    new Set(["FS", "FF"]),                       // Fc+ AND Fp+
  concept: new Set(["FS", "FF", "PM", "PS"]),           // Fc+ (skip prototype)
  product: new Set(["FS", "FF", "GD", "BF"]),           // Fp+ (skip concept)
};

// ── Core simulation ──────────────────────────────────────────────────────────
function runSim(sigC, sigP, rho, g, sigM, mu, dt) {
  const counts  = { FS:0, FF:0, PM:0, PS:0, GD:0, BF:0, DB:0, DC:0 };
  const scatter = [];

  const rhoSafe = Math.max(-0.99, Math.min(0.99, rho));
  const rhoComp = Math.sqrt(1 - rhoSafe * rhoSafe);

  for (let i = 0; i < N_STATS; i++) {
    const vm0 = randn();

    // Bivariate correlated noise
    const z1 = randn();
    const z2 = randn();
    const ec = sigC * z1;
    const ep = sigP * (rhoSafe * z1 + rhoComp * z2);

    const fc  = vm0 + ec;
    const fp  = vm0 + g + ep;
    const vm1 = vm0 + mu * dt + randn() * Math.sqrt(Math.max(0.0001, sigM * sigM * dt));

    const zone = classify(fc, fp, vm1);
    counts[zone]++;

    if (i < N_SCATTER) {
      scatter.push({
        fc: Math.max(-CLIP, Math.min(CLIP, fc)),
        fp: Math.max(-CLIP, Math.min(CLIP, fp)),
        vm1: Math.max(-CLIP, Math.min(CLIP, vm1)),
        zone
      });
    }
  }
  return { counts, scatter };
}

// ── Sweep simulation (lighter weight for experiment grid) ─────────────────────
const N_SWEEP = 4000;

function runSweepSim(sigC, sigP, rho, g, sigM, mu, dt) {
  const counts = { FS:0, FF:0, PM:0, PS:0, GD:0, BF:0, DB:0, DC:0 };
  const rhoSafe = Math.max(-0.99, Math.min(0.99, rho));
  const rhoComp = Math.sqrt(1 - rhoSafe * rhoSafe);
  const driftSig = Math.sqrt(Math.max(0.0001, sigM * sigM * dt));
  const driftMu = mu * dt;

  for (let i = 0; i < N_SWEEP; i++) {
    const vm0 = randn();
    const z1 = randn(), z2 = randn();
    const fc  = vm0 + sigC * z1;
    const fp  = vm0 + g + sigP * (rhoSafe * z1 + rhoComp * z2);
    const vm1 = vm0 + driftMu + randn() * driftSig;
    counts[classify(fc, fp, vm1)]++;
  }

  // Return percentages
  const pcts = {};
  for (const k in counts) pcts[k] = counts[k] / N_SWEEP * 100;
  return pcts;
}

// ── Sweep parameter definitions ──────────────────────────────────────────────
const SWEEP_PARAMS = {
  sigC: { label: "\u03C3c (Concept noise)",   min: 0.1,  max: 2.0, steps: 5 },
  sigP: { label: "\u03C3p (Product noise)",    min: 0.1,  max: 2.0, steps: 5 },
  rho:  { label: "\u03C1 (Correlation)",       min: -0.3, max: 0.9, steps: 5 },
  g:    { label: "g (Execution gap)",          min: -1.0, max: 1.0, steps: 5 },
  sigM: { label: "\u03C3m (Market volatility)",min: 0.1,  max: 1.5, steps: 5 },
  mu:   { label: "\u03BC (Drift direction)",   min: -0.5, max: 0.5, steps: 5 },
  dt:   { label: "\u0394t (Time gap)",         min: 0.2,  max: 2.0, steps: 5 },
};

const SWEEP_METRICS = {
  correct:  { label: "Correct %",        color: "#2563eb", fn: (p, pursued) => sumPursued(p, pursued, true) + sumNotPursued(p, pursued, false) },
  error:    { label: "Error %",           color: "#dc2626", fn: (p, pursued) => sumPursued(p, pursued, false) + sumNotPursued(p, pursued, true) },
  pursued:  { label: "Pursuit rate %",    color: "#475569", fn: (p, pursued) => Object.keys(p).filter(k => pursued.has(k)).reduce((s,k) => s + p[k], 0) },
  FS:       { label: "Full Success %",    color: "#2563eb", fn: p => p.FS },
  FF:       { label: "Full Failure %",    color: "#dc2626", fn: p => p.FF },
  PM:       { label: "Product Missed %",  color: "#7c3aed", fn: p => p.PM },
  PS:       { label: "Product Saved %",   color: "#475569", fn: p => p.PS },
  GD:       { label: "Garage Discovery %",color: "#059669", fn: p => p.GD },
  BF:       { label: "Builder Folly %",   color: "#f59e0b", fn: p => p.BF },
  DB:       { label: "Double Blind %",    color: "#be185d", fn: p => p.DB },
  DC:       { label: "Double Correct %",  color: "#94a3b8", fn: p => p.DC },
};

// M+ zones and M- zones for metric computation
const M_PLUS  = new Set(["FS","PM","GD","DB"]);
function sumPursued(p, pursued, marketPos) {
  const target = marketPos ? M_PLUS : new Set(["FF","PS","BF","DC"]);
  return Object.keys(p).filter(k => pursued.has(k) && target.has(k)).reduce((s,k) => s + p[k], 0);
}
function sumNotPursued(p, pursued, marketPos) {
  const target = marketPos ? M_PLUS : new Set(["FF","PS","BF","DC"]);
  return Object.keys(p).filter(k => !pursued.has(k) && target.has(k)).reduce((s,k) => s + p[k], 0);
}

function linspace(min, max, n) {
  if (n === 1) return [min];
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(min + (max - min) * i / (n - 1));
  return arr;
}

// ── Visual config ────────────────────────────────────────────────────────────
const ZONE_META = {
  FS: { label: "Full Success",      short: "Full Success",     color: "#2563eb",
        desc: "Concept +, Product +, Market +", detail: "Both signals aligned and market confirms. The idea was sound, the prototype was compelling, and the market rewarded it." },
  FF: { label: "Full Failure",       short: "Full Failure",     color: "#dc2626",
        desc: "Concept +, Product +, Market \u2212", detail: "Both signals positive but market rejects. Neither reason nor experience caught the flaw \u2014 a double false positive." },
  PM: { label: "Product Missed",     short: "Product Missed",   color: "#7c3aed",
        desc: "Concept +, Product \u2212, Market +", detail: "The idea was good, but the prototype felt wrong and killed it. Execution gap (g < 0) or product noise turned a good concept into a bad experience." },
  PS: { label: "Product Saved",      short: "Product Saved",    color: "#475569",
        desc: "Concept +, Product \u2212, Market \u2212", detail: "Concept said go, but the prototype felt wrong. Experience caught what reason missed \u2014 feelings as a corrective to rationality." },
  GD: { label: "Garage Discovery",   short: "Garage Discovery", color: "#059669",
        desc: "Concept \u2212, Product +, Market +", detail: "The idea sounded bad, but building it revealed something the market wants. The act of making disclosed value that reason could not foresee." },
  BF: { label: "Builder\u2019s Folly", short: "Builder\u2019s Folly", color: "#f59e0b",
        desc: "Concept \u2212, Product +, Market \u2212", detail: "Concept was negative but building felt good anyway. The prototype was seductive but the concept was right \u2014 experience misled." },
  DB: { label: "Double Blind",       short: "Double Blind",     color: "#be185d",
        desc: "Concept \u2212, Product \u2212, Market +", detail: "Both signals negative, but the market would reward it. A fundamental blind spot \u2014 neither reason nor experience detected the opportunity." },
  DC: { label: "Double Correct",     short: "Double Correct",   color: "#94a3b8",
        desc: "Concept \u2212, Product \u2212, Market \u2212", detail: "Both signals negative, market confirms. Correct rejection through convergent evidence from both epistemic channels." },
};

const ZONE_ORDER = ["FS", "FF", "PM", "PS", "GD", "BF", "DB", "DC"];

const STRATEGY_META = {
  dual:    { label: "Dual-gate",     sub: "Concept \u2192 Product \u2192 Market", desc: "Pursue only if both concept (reason) and product (experience) are positive. The cautious, scientific path." },
  concept: { label: "Concept-first", sub: "Concept \u2192 Market (skip prototype)", desc: "Pursue if concept passes \u2014 skip prototyping. The visionary path: trust the idea, ship it." },
  product: { label: "Product-first", sub: "Product \u2192 Market (skip concept)", desc: "Build first, evaluate later \u2014 skip concept testing. The maker\u2019s path: let the thing speak for itself." },
};

// ── Slider component ─────────────────────────────────────────────────────────
function Slider({ label, sub, value, min, max, step, onChange, fmt, accent }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom: 5 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:600, color:"#1e293b", letterSpacing:"0.01em" }}>{label}</span>
          {sub && <span style={{ fontSize:11, color:"#64748b", marginLeft:6 }}>{sub}</span>}
        </div>
        <span style={{ fontSize:13, fontFamily:"'Courier New', monospace", color:"#64748b", fontWeight:700 }}>
          {fmt ? fmt(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:"100%", accentColor: accent || "#2563eb", cursor:"pointer" }}
      />
    </div>
  );
}

// ── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, emphasis }) {
  return (
    <div style={{
      background: emphasis ? `${color}0a` : "#ffffff",
      border: `1px solid ${emphasis ? `${color}40` : "#e2e8f0"}`,
      borderRadius: 8, padding:"14px 16px", flex:1
    }}>
      <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color: color || "#1e293b", fontFamily:"'Courier New', monospace", lineHeight:1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:"#475569", marginTop:5, lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
}

// ── Custom scatter dot ───────────────────────────────────────────────────────
function ZoneDot({ cx, cy, fill, pursued }) {
  return <circle cx={cx} cy={cy} r={pursued ? 2.5 : 1.8} fill={fill} opacity={pursued ? 0.7 : 0.25} />;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function App() {
  const [sigC, setSigC] = useState(0.80);
  const [sigP, setSigP] = useState(0.80);
  const [rho,  setRho ] = useState(0.30);
  const [g,    setG   ] = useState(0.00);
  const [sigM, setSigM] = useState(0.50);
  const [mu,   setMu  ] = useState(0.00);
  const [dt,   setDt  ] = useState(1.00);
  const [strategy, setStrategy] = useState("dual");
  const [scatterView, setScatterView] = useState("signals"); // "signals" or "outcome"
  const [showRef, setShowRef] = useState(false);

  // Experiment state
  const [showExperiment, setShowExperiment] = useState(false);
  const [expRowParam, setExpRowParam] = useState("sigC");
  const [expColParam, setExpColParam] = useState("rho");
  const [expMetric, setExpMetric] = useState("correct");
  const [expStrategy, setExpStrategy] = useState("dual");
  const [expResults, setExpResults] = useState(null);
  const [expRunning, setExpRunning] = useState(false);

  const { counts, scatter } = useMemo(() => runSim(sigC, sigP, rho, g, sigM, mu, dt), [sigC, sigP, rho, g, sigM, mu, dt]);

  const pursued = PURSUED_BY_STRATEGY[strategy];
  const pct = k => (counts[k] / N_STATS * 100).toFixed(1);
  const flt = k => counts[k] / N_STATS * 100;

  // Metrics by strategy
  const pursuedPct = ZONE_ORDER.filter(z => pursued.has(z)).reduce((s,k) => s + flt(k), 0);
  const successPct = ZONE_ORDER.filter(z => pursued.has(z) && z.endsWith("S") || z === "FS" || z === "GD").reduce((s, k) => {
    // Pursued zones where market is positive
    if (!pursued.has(k)) return s;
    if (k === "FS" || k === "PM" || k === "GD" || k === "DB") return s + flt(k); // M+
    return s;
  }, 0);
  const failurePct = ZONE_ORDER.filter(z => pursued.has(z)).reduce((s, k) => {
    if (!pursued.has(k)) return s;
    if (k === "FF" || k === "PS" || k === "BF" || k === "DC") return s + flt(k); // M-
    return s;
  }, 0);
  const missedPct = ZONE_ORDER.filter(z => !pursued.has(z)).reduce((s, k) => {
    if (pursued.has(k)) return s;
    if (k === "FS" || k === "PM" || k === "GD" || k === "DB") return s + flt(k); // M+ but not pursued
    return s;
  }, 0);
  const avoidedPct = ZONE_ORDER.filter(z => !pursued.has(z)).reduce((s, k) => {
    if (pursued.has(k)) return s;
    if (k === "FF" || k === "PS" || k === "BF" || k === "DC") return s + flt(k); // M- and not pursued
    return s;
  }, 0);

  const correctPct = successPct + avoidedPct;
  const errorPct   = failurePct + missedPct;

  // Experiment runner
  const runExperiment = useCallback(() => {
    setExpRunning(true);
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const rowDef = SWEEP_PARAMS[expRowParam];
      const colDef = SWEEP_PARAMS[expColParam];
      const rowVals = linspace(rowDef.min, rowDef.max, rowDef.steps);
      const colVals = linspace(colDef.min, colDef.max, colDef.steps);
      const pursuedSet = PURSUED_BY_STRATEGY[expStrategy];

      // Base params from current slider values
      const base = { sigC, sigP, rho, g, sigM, mu, dt };
      const grid = [];

      for (let r = 0; r < rowVals.length; r++) {
        const row = [];
        for (let c = 0; c < colVals.length; c++) {
          const params = { ...base, [expRowParam]: rowVals[r], [expColParam]: colVals[c] };
          const pcts = runSweepSim(params.sigC, params.sigP, params.rho, params.g, params.sigM, params.mu, params.dt);
          const metricFn = SWEEP_METRICS[expMetric].fn;
          const val = metricFn(pcts, pursuedSet);
          row.push({ pcts, val, rowVal: rowVals[r], colVal: colVals[c] });
        }
        grid.push(row);
      }

      setExpResults({ grid, rowVals, colVals, rowParam: expRowParam, colParam: expColParam, metric: expMetric, strategy: expStrategy });
      setExpRunning(false);
    }, 20);
  }, [expRowParam, expColParam, expMetric, expStrategy, sigC, sigP, rho, g, sigM, mu, dt]);

  // Scatter data split by zone, with pursued flag
  const scatterByZone = useMemo(() =>
    ZONE_ORDER.map(z => ({
      zone: z,
      pursued: pursued.has(z),
      data: scatter.filter(p => p.zone === z)
    })),
    [scatter, pursued]
  );

  // Pie chart data
  const pieData = ZONE_ORDER.map(k => ({
    name: ZONE_META[k].short,
    value: parseFloat(pct(k)),
    fill: pursued.has(k) ? ZONE_META[k].color : ZONE_META[k].color + "50",
    fullColor: ZONE_META[k].color,
    label: ZONE_META[k].label,
    pursued: pursued.has(k),
    desc: ZONE_META[k].desc,
    zone: k,
  })).filter(d => d.value > 0);

  const driftMuLabel = mu > 0.04 ? `+${mu.toFixed(2)} (more lenient)` :
                       mu < -0.04 ? `${mu.toFixed(2)} (tightening)` : "0.00 (stable)";
  const gLabel = g > 0.04 ? `+${g.toFixed(2)} (team elevates)` :
                 g < -0.04 ? `${g.toFixed(2)} (team degrades)` : "0.00 (neutral)";
  const rhoLabel = rho > 0.6 ? `${rho.toFixed(2)} (concept predicts product)` :
                   rho < 0.1 ? `${rho.toFixed(2)} (concept \u2260 product)` : rho.toFixed(2);

  // Scatter axes based on view
  const xKey = scatterView === "signals" ? "fc" : (strategy === "product" ? "fp" : "fc");
  const yKey = scatterView === "signals" ? "fp" : "vm1";
  const xLabel = scatterView === "signals"
    ? "\u2190 Concept negative  |  Concept positive \u2192"
    : (strategy === "product"
      ? "\u2190 Product negative  |  Product positive \u2192"
      : "\u2190 Concept negative  |  Concept positive \u2192");
  const yLabel = scatterView === "signals"
    ? "\u2190 Product negative  |  Product positive \u2192"
    : "\u2190 Fail  |  Succeed \u2192";

  return (
    <div className="decomp-root" style={{
      fontFamily: "'Georgia', serif",
      background: "#f8fafc",
      minHeight: "100vh",
      color: "#1e293b",
      padding: "28px 24px",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize:11, color:"#2563eb", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>
            Stochastic simulation &middot; {N_STATS.toLocaleString()} simulated beliefs
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#1e293b", margin:"0 0 6px", letterSpacing:"-0.02em" }}>
            Belief Decomposition: Concept vs Product Feedback
          </h1>
          <p style={{ fontSize:13, color:"#64748b", margin:0, maxWidth:760, lineHeight:1.6 }}>
            Every belief generates two signals:{" "}
            <strong style={{color:"#2563eb"}}>concept feedback</strong> (reason &mdash; is this a good idea?) and{" "}
            <strong style={{color:"#7c3aed"}}>product feedback</strong> (experience &mdash; is this a good thing?).
            The entrepreneur&rsquo;s <em>strategy</em> determines which gates are used. Bright dots = pursued; faded = abandoned.
          </p>
        </div>

        {/* ── Strategy selector ── */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          {Object.entries(STRATEGY_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setStrategy(key)}
              style={{
                flex:1,
                padding:"12px 16px",
                borderRadius:8,
                cursor:"pointer",
                border: strategy === key ? "2px solid #2563eb" : "1px solid #e2e8f0",
                background: strategy === key ? "#eff6ff" : "#ffffff",
                textAlign:"left",
                transition:"all 0.15s",
              }}
            >
              <div style={{ fontSize:13, fontWeight:700, color: strategy === key ? "#2563eb" : "#1e293b", marginBottom:2 }}>
                {meta.label}
              </div>
              <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>{meta.sub}</div>
              <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.4 }}>{meta.desc}</div>
            </button>
          ))}
        </div>

        {/* ── Metric strip ── */}
        <div className="metric-strip" style={{ display:"flex", gap:12, marginBottom:24 }}>
          <MetricCard
            label="Correct outcomes"
            value={correctPct.toFixed(1) + "%"}
            sub="Pursued winners + avoided losers"
            color="#2563eb"
          />
          <MetricCard
            label="Total error"
            value={errorPct.toFixed(1) + "%"}
            sub="Pursued losers + missed winners"
            color="#dc2626"
            emphasis
          />
          <MetricCard
            label="Pursuit rate"
            value={pursuedPct.toFixed(1) + "%"}
            sub={`Beliefs that pass the ${strategy === "dual" ? "dual" : strategy === "concept" ? "concept" : "product"} gate`}
            color="#475569"
          />
        </div>

        {/* ── Main grid ── */}
        <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 280px", gap:16, alignItems:"start" }}>

          {/* ── Scatter plot ── */}
          <div style={{
            background:"#ffffff",
            border:"1px solid #e2e8f0",
            borderRadius:10, padding:"18px 16px"
          }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#475569" }}>
                  Belief Space
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <button
                    onClick={() => setScatterView("signals")}
                    style={{
                      fontSize:10, padding:"3px 8px", borderRadius:4, cursor:"pointer",
                      border: scatterView === "signals" ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      background: scatterView === "signals" ? "#eff6ff" : "#ffffff",
                      color: scatterView === "signals" ? "#2563eb" : "#64748b",
                      fontWeight: scatterView === "signals" ? 600 : 400,
                    }}
                  >Fc &times; Fp</button>
                  <button
                    onClick={() => setScatterView("outcome")}
                    style={{
                      fontSize:10, padding:"3px 8px", borderRadius:4, cursor:"pointer",
                      border: scatterView === "outcome" ? "1px solid #7c3aed" : "1px solid #e2e8f0",
                      background: scatterView === "outcome" ? "#f5f3ff" : "#ffffff",
                      color: scatterView === "outcome" ? "#7c3aed" : "#64748b",
                      fontWeight: scatterView === "outcome" ? 600 : 400,
                    }}
                  >Signal &times; Market</button>
                </div>
              </div>
              <div style={{ fontSize:11, color:"#475569", lineHeight:1.5 }}>
                {scatterView === "signals"
                  ? "Concept vs product feedback \u2014 the two epistemic channels. Quadrants show signal agreement/disagreement."
                  : "Gating signal vs market verdict \u2014 how the decision maps to outcomes."
                }
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top:8, right:8, bottom:20, left:8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" />
                <XAxis
                  dataKey={xKey} type="number"
                  domain={[-CLIP, CLIP]}
                  tick={{ fontSize:10, fill:"#475569" }}
                  label={{ value: xLabel, position:"insideBottom", offset:-12, fontSize:9, fill:"#475569" }}
                />
                <YAxis
                  dataKey={yKey} type="number"
                  domain={[-CLIP, CLIP]}
                  tick={{ fontSize:10, fill:"#475569" }}
                  label={{ value: yLabel, angle:-90, position:"insideLeft", offset:8, fontSize:9, fill:"#475569" }}
                />
                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />

                {/* Render non-pursued zones first (faded), then pursued (bright) */}
                {scatterByZone
                  .sort((a, b) => (a.pursued ? 1 : 0) - (b.pursued ? 1 : 0))
                  .map(({ zone, data, pursued: isPursued }) => (
                  <Scatter
                    key={zone}
                    data={data}
                    fill={ZONE_META[zone].color}
                    shape={(props) => <ZoneDot {...props} fill={ZONE_META[zone].color} pursued={isPursued} />}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Mini legend */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 10px", marginTop:8 }}>
              {ZONE_ORDER.map(k => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color: pursued.has(k) ? "#1e293b" : "#94a3b8" }}>
                  <span style={{
                    width:8, height:8, borderRadius:"50%",
                    background: pursued.has(k) ? ZONE_META[k].color : ZONE_META[k].color + "40",
                    display:"inline-block", flexShrink:0
                  }} />
                  {ZONE_META[k].short}
                </div>
              ))}
            </div>
          </div>

          {/* ── Pie chart + breakdown ── */}
          <div style={{
            background:"#ffffff",
            border:"1px solid #e2e8f0",
            borderRadius:10, padding:"18px 16px"
          }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#475569", marginBottom:3 }}>
                Zone Decomposition
              </div>
              <div style={{ fontSize:11, color:"#475569" }}>
                8 zones by signal agreement &middot; bright = pursued under {STRATEGY_META[strategy].label}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={40}
                  paddingAngle={1}
                  isAnimationActive={false}
                  label={({ name, value, cx, cy, midAngle, outerRadius }) => {
                    if (value < 2) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 18;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
                        style={{ fontSize:9, fill:"#475569", fontFamily:"'Courier New', monospace" }}>
                        {value}%
                      </text>
                    );
                  }}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke={entry.pursued ? entry.fullColor : "#e2e8f0"} strokeWidth={entry.pursued ? 2 : 1} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background:"#ffffff", border:"1px solid #e2e8f0", borderRadius:6, fontSize:11, color:"#1e293b" }}
                  formatter={(v, name, props) => {
                    const p = props.payload;
                    return [`${v}% \u2014 ${p.desc}${p.pursued ? " [PURSUED]" : " [abandoned]"}`, p.name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Pie legend */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 12px", marginTop:4, marginBottom:12 }}>
              {ZONE_ORDER.map(k => {
                const v = parseFloat(pct(k));
                return (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color: pursued.has(k) ? "#1e293b" : "#94a3b8" }}>
                    <span style={{
                      width:8, height:8, borderRadius:2, flexShrink:0,
                      background: pursued.has(k) ? ZONE_META[k].color : ZONE_META[k].color + "50",
                      border: pursued.has(k) ? `1px solid ${ZONE_META[k].color}` : "1px solid #e2e8f0",
                    }} />
                    <span style={{ fontFamily:"monospace", minWidth:32 }}>{v.toFixed(1)}%</span>
                    <span>{ZONE_META[k].short}</span>
                  </div>
                );
              })}
            </div>

            {/* Outcome summary */}
            <div className="three-group" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6 }}>
              {[
                { label:"Pursued wins",  value: successPct, color:"#2563eb" },
                { label:"Pursued losses", value: failurePct, color:"#dc2626" },
                { label:"Missed winners", value: missedPct,  color:"#f59e0b" },
                { label:"Avoided losers", value: avoidedPct, color:"#475569" },
              ].map(item => (
                <div key={item.label} style={{ textAlign:"center", padding:"8px 4px", background:"#f8fafc", borderRadius:6, border:`1px solid ${item.color}30` }}>
                  <div style={{ fontSize:16, fontWeight:800, color:item.color, fontFamily:"monospace" }}>{item.value.toFixed(1)}%</div>
                  <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Controls ── */}
          <div style={{
            background:"#ffffff",
            border:"1px solid #e2e8f0",
            borderRadius:10, padding:"18px 16px"
          }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#475569", marginBottom:18 }}>Parameters</div>

            {/* Concept feedback */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#2563eb", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, background:"#2563eb", borderRadius:"50%" }} />
                Concept feedback (reason)
              </div>
              <Slider
                label={<>&sigma;<sub>c</sub> &mdash; Concept noise</>}
                sub="rational evaluation"
                value={sigC} min={0.01} max={2.0} step={0.05}
                onChange={setSigC}
                accent="#2563eb"
              />
            </div>

            {/* Product feedback */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, background:"#7c3aed", borderRadius:"50%" }} />
                Product feedback (experience)
              </div>
              <Slider
                label={<>&sigma;<sub>p</sub> &mdash; Product noise</>}
                sub="experiential evaluation"
                value={sigP} min={0.01} max={2.0} step={0.05}
                onChange={setSigP}
                accent="#7c3aed"
              />
              <Slider
                label="g — Execution gap"
                sub="team quality"
                value={g} min={-1.5} max={1.5} step={0.05}
                onChange={setG}
                fmt={() => gLabel}
                accent="#7c3aed"
              />
            </div>

            {/* Coupling */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#059669", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, background:"#059669", borderRadius:"50%" }} />
                Concept–product coupling
              </div>
              <Slider
                label={<>&rho; &mdash; Correlation</>}
                sub="concept difficulty"
                value={rho} min={-0.5} max={0.99} step={0.05}
                onChange={setRho}
                fmt={() => rhoLabel}
                accent="#059669"
              />
            </div>

            {/* Market dynamics */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, background:"#f59e0b", borderRadius:"50%" }} />
                Market dynamics
              </div>
              <Slider
                label={<>&sigma;<sub>m</sub> &mdash; Volatility</>}
                sub="spread of drift"
                value={sigM} min={0.0} max={2.0} step={0.05}
                onChange={setSigM}
                accent="#f59e0b"
              />
              <Slider
                label={<>&mu; &mdash; Drift</>}
                sub="direction"
                value={mu} min={-1.0} max={1.0} step={0.05}
                onChange={setMu}
                fmt={() => driftMuLabel}
                accent="#f59e0b"
              />
              <Slider
                label={<>&Delta;t &mdash; Time gap</>}
                sub={"t\u2081 \u2212 t\u2080"}
                value={dt} min={0.1} max={3.0} step={0.1}
                onChange={setDt}
                accent="#f59e0b"
              />
            </div>

            {/* Model spec */}
            <div style={{
              background:"#f1f5f9", borderRadius:6,
              padding:12, fontSize:11, lineHeight:1.8, color:"#475569",
              fontFamily:"'Courier New', monospace"
            }}>
              <div style={{ color:"#64748b", marginBottom:4, fontFamily:"Georgia, serif", fontSize:10, letterSpacing:"0.05em" }}>MODEL SPECIFICATION</div>
              V(M)&#x2080; ~ N(0, 1)<br/>
              V(Fc) = V(M)&#x2080; + &epsilon;<sub>c</sub><br/>
              V(Fp) = V(M)&#x2080; + g + &epsilon;<sub>p</sub><br/>
              (&epsilon;<sub>c</sub>, &epsilon;<sub>p</sub>) ~ BVN(0, 0, {sigC.toFixed(2)}&sup2;, {sigP.toFixed(2)}&sup2;, {rho.toFixed(2)})<br/>
              g = {g.toFixed(2)}<br/>
              V(M)&#x2081; = V(M)&#x2080; + &delta;<br/>
              &delta; ~ N({(mu*dt).toFixed(2)}, {(sigM*sigM*dt).toFixed(2)})
            </div>
          </div>
        </div>

        {/* ── Insight panel ── */}
        <div className="insight-panel" style={{
          marginTop:16,
          background:"rgba(37,99,235,0.05)",
          border:"1px solid rgba(37,99,235,0.15)",
          borderRadius:10, padding:"16px 20px",
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20
        }}>
          <div>
            <div style={{ fontSize:11, color:"#059669", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              Garage Discovery
            </div>
            <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.7 }}>
              When &rho; is low and the entrepreneur skips concept testing (product-first strategy),
              <strong style={{color:"#059669"}}> {pct("GD")}%</strong> of beliefs are Garage Discoveries &mdash;
              ideas that sounded bad but whose making disclosed value. These are invisible under concept-first
              or dual-gate strategies.
              {strategy !== "product" && <em style={{ color:"#94a3b8" }}> (Switch to product-first to pursue them.)</em>}
            </p>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              Execution Gap
            </div>
            <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.7 }}>
              Product Missed ({pct("PM")}%) captures ideas killed by poor execution.
              When <em>g</em> &lt; 0, the team degrades concepts into inferior prototypes.
              Under dual-gate, these become abandoned opportunities. Under concept-first,
              they are launched regardless &mdash; and sometimes the market still rewards the concept.
            </p>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              Strategy Matters
            </div>
            <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.7 }}>
              The same beliefs produce different outcomes under different strategies.
              Dual-gate is safest (lowest pursuit rate: {strategy === "dual" ? pursuedPct.toFixed(1) : "\u2014"}%) but misses
              Garage Discoveries. Product-first captures them but admits Builder&rsquo;s Folly ({pct("BF")}%).
              No strategy dominates &mdash; the choice reflects epistemic orientation.
            </p>
          </div>
        </div>

        {/* ── Experiment panel ── */}
        <div style={{ marginTop:16 }}>
          <button
            onClick={() => setShowExperiment(!showExperiment)}
            style={{
              background: showExperiment ? "#eff6ff" : "#ffffff",
              border: showExperiment ? "1px solid #2563eb" : "1px solid #e2e8f0",
              borderRadius: showExperiment ? "10px 10px 0 0" : 10,
              padding:"12px 20px",
              width:"100%",
              cursor:"pointer",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              color: showExperiment ? "#2563eb" : "#475569", fontSize:13, fontWeight:600,
              fontFamily:"'Georgia', serif",
            }}
          >
            <span>Parameter Experiment: Systematic Sweep</span>
            <span style={{ fontSize:11, color:"#64748b", transition:"transform 0.2s", transform: showExperiment ? "rotate(180deg)" : "rotate(0)" }}>
              &#9660;
            </span>
          </button>

          {showExperiment && (
            <div style={{
              background:"#ffffff",
              border:"1px solid #e2e8f0",
              borderTop:"none",
              borderRadius:"0 0 10px 10px",
              padding:"20px 24px",
            }}>
              {/* Controls row */}
              <div style={{ display:"flex", gap:16, alignItems:"flex-end", flexWrap:"wrap", marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Row parameter</div>
                  <select value={expRowParam} onChange={e => setExpRowParam(e.target.value)}
                    style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #e2e8f0", color:"#1e293b", fontFamily:"Georgia, serif", background:"#ffffff" }}>
                    {Object.entries(SWEEP_PARAMS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Column parameter</div>
                  <select value={expColParam} onChange={e => setExpColParam(e.target.value)}
                    style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #e2e8f0", color:"#1e293b", fontFamily:"Georgia, serif", background:"#ffffff" }}>
                    {Object.entries(SWEEP_PARAMS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Metric</div>
                  <select value={expMetric} onChange={e => setExpMetric(e.target.value)}
                    style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #e2e8f0", color:"#1e293b", fontFamily:"Georgia, serif", background:"#ffffff" }}>
                    {Object.entries(SWEEP_METRICS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Strategy</div>
                  <select value={expStrategy} onChange={e => setExpStrategy(e.target.value)}
                    style={{ fontSize:12, padding:"6px 10px", borderRadius:6, border:"1px solid #e2e8f0", color:"#1e293b", fontFamily:"Georgia, serif", background:"#ffffff" }}>
                    {Object.entries(STRATEGY_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <button
                  onClick={runExperiment}
                  disabled={expRunning || expRowParam === expColParam}
                  style={{
                    fontSize:12, fontWeight:600, padding:"8px 20px", borderRadius:6, cursor: (expRunning || expRowParam === expColParam) ? "not-allowed" : "pointer",
                    border:"none", background: (expRunning || expRowParam === expColParam) ? "#e2e8f0" : "#2563eb", color: (expRunning || expRowParam === expColParam) ? "#94a3b8" : "#ffffff",
                    fontFamily:"Georgia, serif",
                  }}
                >
                  {expRunning ? "Running..." : "Run Sweep"}
                </button>
                {expRowParam === expColParam && (
                  <span style={{ fontSize:11, color:"#dc2626" }}>Row and column must differ</span>
                )}
              </div>
              <div style={{ fontSize:11, color:"#94a3b8", marginBottom:16 }}>
                Non-varied parameters use current slider values &middot; {SWEEP_PARAMS[expRowParam]?.steps ?? 5} &times; {SWEEP_PARAMS[expColParam]?.steps ?? 5} = {(SWEEP_PARAMS[expRowParam]?.steps ?? 5) * (SWEEP_PARAMS[expColParam]?.steps ?? 5)} combinations &times; {N_SWEEP.toLocaleString()} draws each
              </div>

              {/* Results heatmap */}
              {expResults && (
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:12 }}>
                    {SWEEP_METRICS[expResults.metric].label} &mdash; {STRATEGY_META[expResults.strategy].label} strategy
                  </div>

                  {/* Heatmap grid */}
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ borderCollapse:"collapse", fontSize:11, width:"100%" }}>
                      <thead>
                        <tr>
                          <th style={{ padding:"6px 8px", fontSize:10, color:"#64748b", textAlign:"left", borderBottom:"1px solid #e2e8f0" }}>
                            {SWEEP_PARAMS[expResults.rowParam].label} &#x2193; / {SWEEP_PARAMS[expResults.colParam].label} &#x2192;
                          </th>
                          {expResults.colVals.map((cv, ci) => (
                            <th key={ci} style={{ padding:"6px 8px", fontSize:10, color:"#64748b", textAlign:"center", borderBottom:"1px solid #e2e8f0", fontFamily:"monospace", fontWeight:600 }}>
                              {cv.toFixed(2)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expResults.grid.map((row, ri) => {
                          // Find min/max for color scaling
                          const allVals = expResults.grid.flat().map(c => c.val);
                          const minVal = Math.min(...allVals);
                          const maxVal = Math.max(...allVals);
                          const range = maxVal - minVal || 1;

                          return (
                            <tr key={ri}>
                              <td style={{ padding:"6px 8px", fontSize:10, color:"#1e293b", fontFamily:"monospace", fontWeight:700, borderRight:"1px solid #e2e8f0", whiteSpace:"nowrap" }}>
                                {row[0].rowVal.toFixed(2)}
                              </td>
                              {row.map((cell, ci) => {
                                const intensity = (cell.val - minVal) / range;
                                const mc = SWEEP_METRICS[expResults.metric].color;
                                // Parse hex color
                                const r = parseInt(mc.slice(1,3), 16);
                                const gv = parseInt(mc.slice(3,5), 16);
                                const b = parseInt(mc.slice(5,7), 16);
                                const bg = `rgba(${r}, ${gv}, ${b}, ${0.08 + intensity * 0.45})`;

                                return (
                                  <td key={ci} style={{
                                    padding:"8px 6px", textAlign:"center",
                                    background: bg,
                                    color: intensity > 0.6 ? "#1e293b" : "#475569",
                                    fontFamily:"monospace", fontWeight: intensity > 0.7 ? 700 : 400,
                                    fontSize:11,
                                    borderRight: ci < row.length - 1 ? "1px solid rgba(255,255,255,0.5)" : "none",
                                    borderBottom: ri < expResults.grid.length - 1 ? "1px solid rgba(255,255,255,0.5)" : "none",
                                  }}>
                                    {cell.val.toFixed(1)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Color scale legend */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontSize:10, color:"#64748b" }}>
                    <span>Low</span>
                    <div style={{
                      width:120, height:10, borderRadius:3,
                      background: `linear-gradient(to right, ${SWEEP_METRICS[expResults.metric].color}14, ${SWEEP_METRICS[expResults.metric].color}85)`,
                    }} />
                    <span>High</span>
                    <span style={{ marginLeft:8, color:"#94a3b8" }}>
                      Range: {Math.min(...expResults.grid.flat().map(c => c.val)).toFixed(1)}% &ndash; {Math.max(...expResults.grid.flat().map(c => c.val)).toFixed(1)}%
                    </span>
                  </div>

                  {/* Full decomposition table */}
                  <div style={{ marginTop:24 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:8 }}>
                      Full Zone Decomposition
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ borderCollapse:"collapse", fontSize:10, width:"100%" }}>
                        <thead>
                          <tr style={{ borderBottom:"2px solid #e2e8f0" }}>
                            <th style={{ padding:"6px 6px", color:"#64748b", textAlign:"left", fontSize:9 }}>
                              {SWEEP_PARAMS[expResults.rowParam].label}
                            </th>
                            <th style={{ padding:"6px 6px", color:"#64748b", textAlign:"left", fontSize:9 }}>
                              {SWEEP_PARAMS[expResults.colParam].label}
                            </th>
                            {ZONE_ORDER.map(z => (
                              <th key={z} style={{ padding:"6px 4px", color: ZONE_META[z].color, textAlign:"center", fontSize:9, fontFamily:"monospace" }}>
                                {z}
                              </th>
                            ))}
                            <th style={{ padding:"6px 4px", color:"#2563eb", textAlign:"center", fontSize:9 }}>Correct</th>
                            <th style={{ padding:"6px 4px", color:"#dc2626", textAlign:"center", fontSize:9 }}>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expResults.grid.flat().map((cell, idx) => {
                            const pursuedSet = PURSUED_BY_STRATEGY[expResults.strategy];
                            const correct = sumPursued(cell.pcts, pursuedSet, true) + sumNotPursued(cell.pcts, pursuedSet, false);
                            const error = sumPursued(cell.pcts, pursuedSet, false) + sumNotPursued(cell.pcts, pursuedSet, true);
                            return (
                              <tr key={idx} style={{ borderBottom:"1px solid #f1f5f9" }}>
                                <td style={{ padding:"4px 6px", fontFamily:"monospace", color:"#1e293b", fontWeight:600 }}>{cell.rowVal.toFixed(2)}</td>
                                <td style={{ padding:"4px 6px", fontFamily:"monospace", color:"#1e293b", fontWeight:600 }}>{cell.colVal.toFixed(2)}</td>
                                {ZONE_ORDER.map(z => (
                                  <td key={z} style={{ padding:"4px 4px", textAlign:"center", fontFamily:"monospace", color:"#64748b" }}>
                                    {cell.pcts[z].toFixed(1)}
                                  </td>
                                ))}
                                <td style={{ padding:"4px 4px", textAlign:"center", fontFamily:"monospace", color:"#2563eb", fontWeight:700 }}>{correct.toFixed(1)}</td>
                                <td style={{ padding:"4px 4px", textAlign:"center", fontFamily:"monospace", color:"#dc2626", fontWeight:700 }}>{error.toFixed(1)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Zone Reference ── */}
        <div style={{ marginTop:16 }}>
          <button
            onClick={() => setShowRef(!showRef)}
            style={{
              background:"#ffffff",
              border:"1px solid #e2e8f0",
              borderRadius: showRef ? "10px 10px 0 0" : 10,
              padding:"12px 20px",
              width:"100%",
              cursor:"pointer",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              color:"#475569", fontSize:13, fontWeight:600,
              fontFamily:"'Georgia', serif",
            }}
          >
            <span>Zone Reference: The Eight Outcomes</span>
            <span style={{ fontSize:11, color:"#64748b", transition:"transform 0.2s", transform: showRef ? "rotate(180deg)" : "rotate(0)" }}>
              &#9660;
            </span>
          </button>

          {showRef && (
            <div style={{
              background:"#ffffff",
              border:"1px solid #e2e8f0",
              borderTop:"none",
              borderRadius:"0 0 10px 10px",
              padding:"20px 24px",
            }}>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>
                  Eight Zones by Signal Agreement
                </div>
                <p style={{ fontSize:11, color:"#64748b", margin:"0 0 12px", lineHeight:1.5 }}>
                  Every belief produces three signals: concept (reason), product (experience), and market verdict.
                  The eight zones are defined by the signs of these signals. The entrepreneur&rsquo;s <em>strategy</em> determines
                  which zones lead to pursuit (highlighted) vs abandonment (faded).
                </p>
                <table className="zone-ref-table" style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #e2e8f0" }}>
                      {["Zone","Concept","Product","Market","Pursued under","Interpretation"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { zone:"FS", color:"#2563eb", c:"+", p:"+", m:"+", strategies:"All", interp:"Both signals aligned and market confirms. Full validation." },
                      { zone:"FF", color:"#dc2626", c:"+", p:"+", m:"\u2212", strategies:"All", interp:"Both positive but market rejects. Double false positive \u2014 neither channel caught the flaw." },
                      { zone:"PM", color:"#7c3aed", c:"+", p:"\u2212", m:"+", strategies:"Concept-first", interp:"Good idea, bad prototype, market would reward. Execution gap killed a winner. Pursued only if prototype is skipped." },
                      { zone:"PS", color:"#475569", c:"+", p:"\u2212", m:"\u2212", strategies:"Concept-first", interp:"Concept passed, prototype felt wrong, market confirms. Experience as corrective \u2014 unless prototype is skipped." },
                      { zone:"GD", color:"#059669", c:"\u2212", p:"+", m:"+", strategies:"Product-first", interp:"Garage Discovery: idea sounded bad, but making it disclosed value. Only accessible when concept testing is skipped." },
                      { zone:"BF", color:"#f59e0b", c:"\u2212", p:"+", m:"\u2212", strategies:"Product-first", interp:"Builder\u2019s Folly: concept was right to be skeptical, but the prototype was seductive. Experience misled." },
                      { zone:"DB", color:"#be185d", c:"\u2212", p:"\u2212", m:"+", strategies:"None", interp:"Double Blind: both reason and experience negative, but market would reward. A fundamental blind spot." },
                      { zone:"DC", color:"#94a3b8", c:"\u2212", p:"\u2212", m:"\u2212", strategies:"None", interp:"Double Correct: both channels negative, market confirms. Convergent evidence for correct rejection." },
                    ].map(r => (
                      <tr key={r.zone} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:r.color, fontFamily:"'Courier New', monospace" }}>{r.zone}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", textAlign:"center" }}>{r.c}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", textAlign:"center" }}>{r.p}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", textAlign:"center" }}>{r.m}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", fontSize:10 }}>{r.strategies}</td>
                        <td style={{ padding:"8px 10px", color:"#1e293b", lineHeight:1.5 }}>{r.interp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#475569", marginBottom:4 }}>
                  Strategy Comparison
                </div>
                <table className="zone-ref-table" style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid #e2e8f0" }}>
                      {["Strategy","Decision rule","Pursued zones","Strength","Weakness"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#64748b", fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { strat:"Dual-gate", rule:"Fc > 0 AND Fp > 0", zones:"FS, FF", strength:"Lowest error rate \u2014 two filters", weakness:"Misses Garage Discoveries and Product Missed opportunities" },
                      { strat:"Concept-first", rule:"Fc > 0", zones:"FS, FF, PM, PS", strength:"Captures ideas with poor prototypes (PM)", weakness:"Launches products that feel wrong (PS pursues untested)" },
                      { strat:"Product-first", rule:"Fp > 0", zones:"FS, FF, GD, BF", strength:"Captures Garage Discoveries (GD)", weakness:"Admits Builder\u2019s Folly (BF) \u2014 seductive but flawed" },
                    ].map(r => (
                      <tr key={r.strat} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:"#1e293b" }}>{r.strat}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", fontFamily:"'Courier New', monospace", fontSize:10 }}>{r.rule}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", fontFamily:"'Courier New', monospace", fontSize:10 }}>{r.zones}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", lineHeight:1.5 }}>{r.strength}</td>
                        <td style={{ padding:"8px 10px", color:"#64748b", lineHeight:1.5 }}>{r.weakness}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
