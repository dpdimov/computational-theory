import { useState, useMemo, useCallback } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, BarChart, Bar, Cell, Tooltip,
  CartesianGrid, LabelList
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
const CLIP      = 3.2;

// ── Zone classification ──────────────────────────────────────────────────────
function classify(vf, vm0, vm1) {
  const pursue = vf  > 0;
  const good0  = vm0 > 0;
  const good1  = vm1 > 0;
  if  (pursue && good0 && good1)  return "Q1s";
  if  (pursue && good0 && !good1) return "A1";
  if  (pursue && !good0 && good1) return "A2";
  if  (pursue && !good0 && !good1)return "Q2s";
  if  (!pursue && good0 && good1) return "Q3s";
  if  (!pursue && good0 && !good1)return "A3";
  if  (!pursue && !good0 && good1)return "A4";
  return "Q4s";
}

// ── Core simulation ──────────────────────────────────────────────────────────
function runSim(sigF, sigM, mu, dt) {
  const counts  = { Q1s:0, A1:0, Q2s:0, A2:0, Q3s:0, A3:0, Q4s:0, A4:0 };
  const scatter = [];

  for (let i = 0; i < N_STATS; i++) {
    const vm0  = randn();
    const vf   = vm0 + randn() * sigF;
    const vm1  = vm0 + mu * dt + randn() * Math.sqrt(Math.max(0.0001, sigM * sigM * dt));
    const zone = classify(vf, vm0, vm1);
    counts[zone]++;
    if (i < N_SCATTER) {
      scatter.push({
        x: Math.max(-CLIP, Math.min(CLIP, vf)),
        y: Math.max(-CLIP, Math.min(CLIP, vm1)),
        zone
      });
    }
  }
  return { counts, scatter };
}

// ── Visual config ────────────────────────────────────────────────────────────
const ZONE_META = {
  Q1s: { label: "Valuable → Succeeds",          short: "Q1 stable",  color: "#2563eb", group: "correct" },
  A1:  { label: "Area 1: Valuable → Fails",      short: "A1 (drift)", color: "#f59e0b", group: "drift"   },
  Q2s: { label: "False Positive → Fails",        short: "Q2 noise",   color: "#dc2626", group: "noise"   },
  A2:  { label: "Area 2: False Pos → Succeeds",  short: "A2 (drift)", color: "#059669", group: "drift"   },
  Q3s: { label: "Missed Opp → Succeeds",         short: "Q3 noise",   color: "#7c3aed", group: "noise"   },
  A3:  { label: "Area 3: Missed Opp → Fails",    short: "A3 (drift)", color: "#b45309", group: "drift"   },
  Q4s: { label: "Correctly Avoided → Fails",     short: "Q4 stable",  color: "#475569", group: "correct" },
  A4:  { label: "Area 4: Avoided → Succeeds",    short: "A4 (drift)", color: "#0891b2", group: "drift"   },
};

const ZONE_ORDER = ["Q1s","A1","Q2s","A2","Q3s","A3","Q4s","A4"];

// ── Slider component ─────────────────────────────────────────────────────────
function Slider({ label, sub, value, min, max, step, onChange, fmt }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom: 5 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", letterSpacing:"0.01em" }}>{label}</span>
          {sub && <span style={{ fontSize:11, color:"#64748b", marginLeft:6 }}>{sub}</span>}
        </div>
        <span style={{ fontSize:13, fontFamily:"'Courier New', monospace", color:"#94a3b8", fontWeight:700 }}>
          {fmt ? fmt(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:"100%", accentColor:"#f59e0b", cursor:"pointer" }}
      />
    </div>
  );
}

// ── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, emphasis }) {
  return (
    <div style={{
      background: emphasis ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${emphasis ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 8, padding:"14px 16px", flex:1
    }}>
      <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color: color || "#f1f5f9", fontFamily:"'Courier New', monospace", lineHeight:1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:"#475569", marginTop:5, lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
}

// ── Custom scatter dot ───────────────────────────────────────────────────────
function Dot({ cx, cy, fill }) {
  return <circle cx={cx} cy={cy} r={2.2} fill={fill} opacity={0.65} />;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function App() {
  const [sigF, setSigF] = useState(0.80);
  const [sigM, setSigM] = useState(0.50);
  const [mu,   setMu  ] = useState(0.00);
  const [dt,   setDt  ] = useState(1.00);
  const [showRef, setShowRef] = useState(false);

  const { counts, scatter } = useMemo(() => runSim(sigF, sigM, mu, dt), [sigF, sigM, mu, dt]);

  const pct   = k => (counts[k] / N_STATS * 100).toFixed(1);
  const flt   = k => counts[k] / N_STATS * 100;

  const driftTotal   = ["A1","A2","A3","A4"].reduce((s,k) => s + flt(k), 0);
  const noiseTotal   = ["Q2s","Q3s"].reduce((s,k) => s + flt(k), 0);
  const correctTotal = ["Q1s","Q4s"].reduce((s,k) => s + flt(k), 0);

  // Scatter data split by zone for individual Scatter elements
  const scatterByZone = useMemo(() =>
    ZONE_ORDER.map(z => ({ zone: z, data: scatter.filter(p => p.zone === z) })),
    [scatter]
  );

  // Bar chart data
  const barData = ZONE_ORDER.map(k => ({
    name: ZONE_META[k].short,
    value: parseFloat(pct(k)),
    fill: ZONE_META[k].color,
    label: ZONE_META[k].label,
  }));

  const driftMuLabel = mu > 0.04 ? `+${mu.toFixed(2)} (more lenient)` :
                       mu < -0.04 ? `${mu.toFixed(2)} (tightening)` : "0.00 (stable)";

  return (
    <div className="belief-root" style={{
      fontFamily: "'Georgia', serif",
      background: "#0f172a",
      minHeight: "100vh",
      color: "#e2e8f0",
      padding: "28px 24px",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize:11, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>
            Stochastic simulation · {N_STATS.toLocaleString()} simulated beliefs
          </div>
          <h1 style={{ fontSize:22, fontWeight:700, color:"#f1f5f9", margin:"0 0 6px", letterSpacing:"-0.02em" }}>
            Temporal Dynamics of Entrepreneurial Belief Validation
          </h1>
          <p style={{ fontSize:13, color:"#64748b", margin:0, maxWidth:720, lineHeight:1.6 }}>
            Separating <span style={{color:"#dc2626"}}>feedback noise σ<sub>f</sub></span> (reducible through better experiments) from{" "}
            <span style={{color:"#f59e0b"}}>market drift σ<sub>m</sub>, μ, Δt</span> (ineliminable). The experimental floor is
            the residual error that no amount of experimentation can remove.
          </p>
        </div>

        {/* ── Metric strip ── */}
        <div className="metric-strip" style={{ display:"flex", gap:12, marginBottom:24 }}>
          <MetricCard
            label="Correct outcomes"
            value={correctTotal.toFixed(1) + "%"}
            sub="Q1s + Q4s: pursued & won, avoided & lost"
            color="#2563eb"
          />
          <MetricCard
            label="Noise-induced error"
            value={noiseTotal.toFixed(1) + "%"}
            sub="Q2s + Q3s: reducible by better experiments"
            color="#dc2626"
          />
          <MetricCard
            label="Experimental floor"
            value={driftTotal.toFixed(1) + "%"}
            sub="Areas 1–4: irreducible drift-induced error"
            color="#f59e0b"
            emphasis
          />
        </div>

        {/* ── Main grid ── */}
        <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 280px", gap:16, alignItems:"start" }}>

          {/* ── Scatter plot ── */}
          <div style={{
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:10, padding:"18px 16px"
          }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#cbd5e1", marginBottom:3 }}>
                Belief Space: V(F) × V(M)₁
              </div>
              <div style={{ fontSize:11, color:"#475569", lineHeight:1.5 }}>
                x-axis = feedback signal at t₀ · y-axis = market verdict at t₁<br/>
                Vertical line: entrepreneur's pursuit threshold · Horizontal: market success threshold
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top:8, right:8, bottom:20, left:8 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="x" type="number"
                  domain={[-CLIP, CLIP]}
                  tick={{ fontSize:10, fill:"#475569" }}
                  label={{ value:"← Abandon  |  Pursue →", position:"insideBottom", offset:-12, fontSize:10, fill:"#475569" }}
                />
                <YAxis
                  dataKey="y" type="number"
                  domain={[-CLIP, CLIP]}
                  tick={{ fontSize:10, fill:"#475569" }}
                  label={{ value:"← Fail  |  Succeed →", angle:-90, position:"insideLeft", offset:8, fontSize:10, fill:"#475569" }}
                />
                <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />

                {/* Quadrant labels */}
                <ReferenceLine x={0} y={0} stroke="none" label={
                  { value:"I", position:"insideTopRight", offset:6, fontSize:11, fill:"rgba(255,255,255,0.2)", fontWeight:700 }
                } />

                {scatterByZone.map(({ zone, data }) => (
                  <Scatter
                    key={zone}
                    data={data}
                    fill={ZONE_META[zone].color}
                    shape={<Dot fill={ZONE_META[zone].color} />}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>

            {/* Mini legend */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", marginTop:8 }}>
              {ZONE_ORDER.map(k => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"#475569" }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:ZONE_META[k].color, display:"inline-block", flexShrink:0 }} />
                  {ZONE_META[k].short}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bar chart ── */}
          <div style={{
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:10, padding:"18px 16px"
          }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#cbd5e1", marginBottom:3 }}>
                Zone Decomposition
              </div>
              <div style={{ fontSize:11, color:"#475569" }}>
                Probability mass (%) across all 8 zones · {N_STATS.toLocaleString()} draws
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical" margin={{ top:4, right:48, bottom:4, left:4 }}>
                <XAxis type="number" domain={[0,50]} tick={{ fontSize:10, fill:"#475569" }} unit="%" />
                <YAxis
                  type="category" dataKey="name" width={76}
                  tick={{ fontSize:10, fill:"#94a3b8", fontFamily:"'Courier New', monospace" }}
                />
                <Tooltip
                  cursor={{ fill:"rgba(255,255,255,0.04)" }}
                  contentStyle={{ background:"#1e293b", border:"1px solid #334155", borderRadius:6, fontSize:11 }}
                  formatter={(v, _, props) => [`${v}% — ${props.payload.label}`, ""]}
                  labelFormatter={() => ""}
                />
                <Bar dataKey="value" radius={[0,4,4,0]} isAnimationActive={false}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize:10, fill:"#94a3b8", fontFamily:"monospace" }} formatter={v => v + "%"} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Three-group summary */}
            <div className="three-group" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:12 }}>
              {[
                { label:"Correct", value:correctTotal, color:"#2563eb" },
                { label:"Noise error", value:noiseTotal, color:"#dc2626" },
                { label:"Drift error", value:driftTotal, color:"#f59e0b" },
              ].map(g => (
                <div key={g.label} style={{ textAlign:"center", padding:"8px 4px", background:"rgba(255,255,255,0.03)", borderRadius:6, border:`1px solid ${g.color}30` }}>
                  <div style={{ fontSize:18, fontWeight:800, color:g.color, fontFamily:"monospace" }}>{g.value.toFixed(1)}%</div>
                  <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{g.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Controls ── */}
          <div style={{
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:10, padding:"18px 16px"
          }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#cbd5e1", marginBottom:18 }}>Parameters</div>

            {/* Experimental quality */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, background:"#dc2626", borderRadius:"50%" }} />
                Experimental quality
              </div>
              <Slider
                label="σf — Feedback noise"
                sub="V(F) = V(M)₀ + ε"
                value={sigF} min={0.01} max={2.0} step={0.05}
                onChange={setSigF}
              />
            </div>

            {/* Market dynamics */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, background:"#f59e0b", borderRadius:"50%" }} />
                Market dynamics
              </div>
              <Slider
                label="σm — Market volatility"
                sub="spread of δ"
                value={sigM} min={0.0} max={2.0} step={0.05}
                onChange={setSigM}
              />
              <Slider
                label="μ — Drift direction"
                sub="mean of δ"
                value={mu} min={-1.0} max={1.0} step={0.05}
                onChange={setMu}
                fmt={() => driftMuLabel}
              />
              <Slider
                label="Δt — Time gap"
                sub="t₁ − t₀"
                value={dt} min={0.1} max={3.0} step={0.1}
                onChange={setDt}
              />
            </div>

            {/* Model spec */}
            <div style={{
              background:"rgba(0,0,0,0.3)", borderRadius:6,
              padding:12, fontSize:11, lineHeight:1.8, color:"#475569",
              fontFamily:"'Courier New', monospace"
            }}>
              <div style={{ color:"#64748b", marginBottom:4, fontFamily:"Georgia, serif", fontSize:10, letterSpacing:"0.05em" }}>MODEL SPECIFICATION</div>
              V(M)₀ ~ N(0, 1)<br/>
              V(F) = V(M)₀ + ε<br/>
              ε ~ N(0, {sigF.toFixed(2)}²)<br/>
              V(M)₁ = V(M)₀ + δ<br/>
              δ ~ N({(mu*dt).toFixed(2)}, {(sigM*sigM*dt).toFixed(2)})
            </div>
          </div>
        </div>

        {/* ── Insight panel ── */}
        <div className="insight-panel" style={{
          marginTop:16,
          background:"rgba(245,158,11,0.06)",
          border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:10, padding:"16px 20px",
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20
        }}>
          <div>
            <div style={{ fontSize:11, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              The Experimental Floor
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:0, lineHeight:1.7 }}>
              Even with <em>perfect</em> feedback (σ<sub>f</sub> → 0), market drift alone generates{" "}
              <strong style={{ color:"#f59e0b" }}>{driftTotal.toFixed(1)}%</strong> residual error across Areas 1–4.
              This floor cannot be reduced by better experiments — it is structural.
            </p>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              What Experiments Can Fix
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:0, lineHeight:1.7 }}>
              Reducing σ<sub>f</sub> moves mass from noise zones (Q2s + Q3s ={" "}
              <strong style={{ color:"#dc2626" }}>{noiseTotal.toFixed(1)}%</strong>) toward correct zones.
              These are errors of commission and omission amenable to the scientists view.
            </p>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#2563eb", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
              The Irreducibility Argument
            </div>
            <p style={{ fontSize:12, color:"#94a3b8", margin:0, lineHeight:1.7 }}>
              Total correct + fixable error ={" "}
              <strong style={{ color:"#f1f5f9" }}>{(correctTotal + noiseTotal).toFixed(1)}%</strong>.
              Drift error (<strong style={{ color:"#f59e0b" }}>{driftTotal.toFixed(1)}%</strong>) persists regardless
              of experimental discipline — it grows with σ<sub>m</sub> and Δt alone.
            </p>
          </div>
        </div>

        {/* ── Zone Reference ── */}
        <div style={{ marginTop:16 }}>
          <button
            onClick={() => setShowRef(!showRef)}
            style={{
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:showRef ? "10px 10px 0 0" : 10,
              padding:"12px 20px",
              width:"100%",
              cursor:"pointer",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              color:"#cbd5e1", fontSize:13, fontWeight:600,
              fontFamily:"'Georgia', serif",
            }}
          >
            <span>Zone Reference: Understanding Q1–Q4 and A1–A4</span>
            <span style={{ fontSize:11, color:"#64748b", transition:"transform 0.2s", transform: showRef ? "rotate(180deg)" : "rotate(0)" }}>
              &#9660;
            </span>
          </button>

          {showRef && (
            <div style={{
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderTop:"none",
              borderRadius:"0 0 10px 10px",
              padding:"20px 24px",
            }}>
              {/* Static world table */}
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#cbd5e1", marginBottom:4 }}>
                  Original Quadrants — Static World (t₀ only)
                </div>
                <p style={{ fontSize:11, color:"#64748b", margin:"0 0 12px", lineHeight:1.5 }}>
                  In a stable world, good experiments shrink Q2 and Q3. The scientist's view assumes this is the whole problem.
                </p>
                <table className="zone-ref-table" style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                      {["Zone","Feedback V(F)","Market at t₀ V(M)₀","Outcome","Label"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#94a3b8", fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { zone:"Q1", color:"#2563eb", feedback:"Positive → pursue", market:"Would succeed", outcome:"Success I (sticking with good ideas)", label:"Valuable belief" },
                      { zone:"Q2", color:"#dc2626", feedback:"Positive → pursue", market:"Would fail", outcome:"False positive (Type I error)", label:"Actual failure" },
                      { zone:"Q3", color:"#7c3aed", feedback:"Negative → abandon", market:"Would succeed", outcome:"False negative (Type II error)", label:"Missed opportunity" },
                      { zone:"Q4", color:"#475569", feedback:"Negative → abandon", market:"Would fail", outcome:"Success II (abandoning bad ideas)", label:"Avoided failure" },
                    ].map(r => (
                      <tr key={r.zone} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:r.color, fontFamily:"'Courier New', monospace" }}>{r.zone}</td>
                        <td style={{ padding:"8px 10px", color:"#94a3b8" }}>{r.feedback}</td>
                        <td style={{ padding:"8px 10px", color:"#94a3b8" }}>{r.market}</td>
                        <td style={{ padding:"8px 10px", color:"#94a3b8" }}>{r.outcome}</td>
                        <td style={{ padding:"8px 10px", color:"#e2e8f0" }}>{r.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dynamic world table */}
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#cbd5e1", marginBottom:4 }}>
                  Drift-Induced Areas — Dynamic World (t₁ ≠ t₀)
                </div>
                <p style={{ fontSize:11, color:"#64748b", margin:"0 0 12px", lineHeight:1.5 }}>
                  Each area is a subset of a quadrant, carved out by market movement between t₀ and t₁.
                </p>
                <table className="zone-ref-table" style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                      {["Area","Parent","What happened","Epistemic status"].map(h => (
                        <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#94a3b8", fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { area:"A1", color:"#f59e0b", parent:"Q1", what:"Feedback positive, would have succeeded at t₀ — but market shifted against it by t₁", status:"Justified and true at t₀; false at t₁" },
                      { area:"A2", color:"#059669", parent:"Q2", what:"Feedback positive, would have failed at t₀ — but market shifted in its favour by t₁", status:"Unjustified at t₀; true at t₁" },
                      { area:"A3", color:"#b45309", parent:"Q3", what:"Feedback negative, would have succeeded at t₀ — market shifted against it by t₁", status:"Justified abandonment, but moot" },
                      { area:"A4", color:"#0891b2", parent:"Q4", what:"Feedback negative, would have failed at t₀ — market shifted in its favour by t₁", status:"Unjustified pursuit would have succeeded" },
                    ].map(r => (
                      <tr key={r.area} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:r.color, fontFamily:"'Courier New', monospace" }}>{r.area}</td>
                        <td style={{ padding:"8px 10px", color:"#94a3b8", fontFamily:"'Courier New', monospace" }}>{r.parent}</td>
                        <td style={{ padding:"8px 10px", color:"#94a3b8", lineHeight:1.5 }}>{r.what}</td>
                        <td style={{ padding:"8px 10px", color:"#e2e8f0", fontStyle:"italic", lineHeight:1.5 }}>{r.status}</td>
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
