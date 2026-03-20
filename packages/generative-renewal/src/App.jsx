import { useState, useCallback, useMemo } from "react";

// ── Data ────────────────────────────────────────────────────────────────────

const CAPACITIES = {
  connection:  { name: "Connection",  tagline: "Staying close across difference",          color: "#2D6A4F", light: "#D8F3DC", icon: "◈" },
  values:      { name: "Values",      tagline: "Keeping commitments alive, not frozen",     color: "#7B2D8E", light: "#F0D9F5", icon: "◇" },
  imagination: { name: "Imagination", tagline: "Envisioning contribution beyond preservation", color: "#C2570A", light: "#FDECD0", icon: "◆" },
  coherence:   { name: "Coherence",   tagline: "Remaining whole amid complexity",           color: "#1A5276", light: "#D4E6F1", icon: "◎" },
};

const CAP_KEYS = Object.keys(CAPACITIES);

const DYNAMICS = [
  { name: "Aspiration",          caps: ["imagination", "values"],    color: "#8B6914", icon: "⬡",
    desc: "When living values guide imagination, families envision futures that feel purposeful and legitimate.",
    whenStrong: "The family envisions futures that feel both bold and legitimate — grounded in values yet reaching toward meaningful contribution.",
    whenWeak: "Strategic thinking defaults to preservation and threat management, disconnected from the family's deeper commitments." },
  { name: "Integrity",           caps: ["values", "coherence"],      color: "#4A6741", icon: "⬢",
    desc: "When values are held with emotional steadiness, families adapt without losing core commitments.",
    whenStrong: "Values and emotional steadiness reinforce each other — the family can adapt without losing what matters most.",
    whenWeak: "The family oscillates between rigid defence of tradition and anxious abandonment of commitments when pressure mounts." },
  { name: "Trusting",            caps: ["coherence", "connection"],  color: "#2D5F5D", icon: "⬠",
    desc: "When a family stays grounded under pressure, connection becomes more honest and resilient.",
    whenStrong: "Difficult moments deepen rather than threaten relationships — the family can hold hard truths together.",
    whenWeak: "Stress drives family members apart; honesty feels too risky when stakes are high." },
  { name: "Exploration",         caps: ["connection", "imagination"],color: "#8B4513", icon: "⬣",
    desc: "When imaginative ideas remain connected to real relationships, families test aspirations against lived experience.",
    whenStrong: "Imaginative ideas are grounded in real relationships — the family explores together rather than in isolation.",
    whenWeak: "Bold thinking happens in abstract or by lone voices, never tested against the texture of actual family life." },
  { name: "Meaning-making",      caps: ["connection", "values"],     color: "#6B3A6B", icon: "⬟",
    desc: "When strong relationships support open exploration of values, differences become sources of insight.",
    whenStrong: "Strong relationships allow the family to explore values openly — disagreement generates insight rather than fracture.",
    whenWeak: "Differences in perspective threaten the family rather than enriching it; values discussions become positional." },
  { name: "Generative Learning",  caps: ["imagination", "coherence"], color: "#4A5568", icon: "⬡",
    desc: "When imagination is held within coherence, families learn by acting forward without destabilising the system.",
    whenStrong: "The family experiments and learns without losing its footing — imagination and stability reinforce each other.",
    whenWeak: "Innovation feels like a threat to stability, or bold action destabilises the family system." },
];

const PRACTICES = [
  { id: 1,  cap: "connection",  title: "Begin with Story, Not Structure", boost: 0.08 },
  { id: 2,  cap: "connection",  title: "Map the Unspoken Hierarchy", boost: 0.07 },
  { id: 3,  cap: "connection",  title: "Structured Disagreement", boost: 0.09 },
  { id: 4,  cap: "connection",  title: "Cross-Generational Pairs", boost: 0.06 },
  { id: 5,  cap: "connection",  title: "Silence Before Response", boost: 0.05 },
  { id: 6,  cap: "values",      title: "Function vs Form Audit", boost: 0.08 },
  { id: 7,  cap: "values",      title: "Values Archaeology", boost: 0.07 },
  { id: 8,  cap: "values",      title: "Next-Gen Reinterpretation", boost: 0.09 },
  { id: 9,  cap: "values",      title: "Constraint as Invitation", boost: 0.06 },
  { id: 10, cap: "values",      title: "Forward-Looking Ritual", boost: 0.05 },
  { id: 11, cap: "imagination", title: "Contribution Question", boost: 0.08 },
  { id: 12, cap: "imagination", title: "Small-Scale Experiments", boost: 0.07 },
  { id: 13, cap: "imagination", title: "Bold Possibility Space", boost: 0.09 },
  { id: 14, cap: "imagination", title: "Shared Aspiration Mapping", boost: 0.06 },
  { id: 15, cap: "imagination", title: "Beyond the Asset Base", boost: 0.05 },
  { id: 16, cap: "coherence",   title: "Pressure Protocols", boost: 0.08 },
  { id: 17, cap: "coherence",   title: "Distributed Decision Timing", boost: 0.07 },
  { id: 18, cap: "coherence",   title: "Personal Steadiness Practice", boost: 0.09 },
  { id: 19, cap: "coherence",   title: "Holding Discomfort Together", boost: 0.06 },
  { id: 20, cap: "coherence",   title: "Difficulty as Strengthening", boost: 0.05 },
];

// ── Thresholds ──────────────────────────────────────────────────────────────

const LOW_THRESH  = 0.4;
const HIGH_THRESH = 0.6;

function dynamicStatus(capA, capB) {
  if (capA >= HIGH_THRESH && capB >= HIGH_THRESH) return "generative";
  if (capA < LOW_THRESH && capB < LOW_THRESH)     return "nascent";
  return "emerging";
}

const STATUS_META = {
  generative: { label: "Generative", color: "#16a34a", bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.35)" },
  emerging:   { label: "Emerging",   color: "#ca8a04", bg: "rgba(202,138,4,0.10)",  border: "rgba(202,138,4,0.35)" },
  nascent:    { label: "Nascent",    color: "#dc2626", bg: "rgba(220,38,38,0.10)",  border: "rgba(220,38,38,0.35)" },
};

// ── Components ──────────────────────────────────────────────────────────────

function CapacitySlider({ capKey, value, onChange }) {
  const cap = CAPACITIES[capKey];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 600, color: cap.color }}>{cap.icon} {cap.name}</span>
          <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>{cap.tagline}</span>
        </div>
        <span style={{ fontSize: 13, fontFamily: "'Courier New', monospace", color: "#64748b", fontWeight: 700 }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(capKey, parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: cap.color, cursor: "pointer" }}
      />
    </div>
  );
}

function DynamicCard({ dynamic, caps, expanded, onToggle }) {
  const [capA, capB] = dynamic.caps;
  const status = dynamicStatus(caps[capA], caps[capB]);
  const meta = STATUS_META[status];
  const capAData = CAPACITIES[capA];
  const capBData = CAPACITIES[capB];

  return (
    <div
      onClick={onToggle}
      style={{
        background: meta.bg,
        border: `1.5px solid ${meta.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        cursor: "pointer",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{dynamic.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>{dynamic.name}</span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: 20, padding: "3px 10px",
        }}>
          {meta.label}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        <span style={{ color: capAData.color, fontWeight: 600 }}>{capAData.name}</span>
        {" "}({(caps[capA] * 100).toFixed(0)}%) +{" "}
        <span style={{ color: capBData.color, fontWeight: 600 }}>{capBData.name}</span>
        {" "}({(caps[capB] * 100).toFixed(0)}%)
      </div>
      {/* Combined strength indicator */}
      <div style={{ marginBottom: expanded ? 10 : 0 }}>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3, width: `${caps[capA] * caps[capB] * 100}%`,
            background: meta.color, transition: "width 0.4s ease",
          }} />
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: "#475569" }}>
          <p style={{ marginBottom: 6 }}>{dynamic.desc}</p>
          <p style={{ color: meta.color, fontStyle: "italic" }}>
            {status === "generative" ? dynamic.whenStrong : dynamic.whenWeak}
          </p>
        </div>
      )}
    </div>
  );
}

function DiamondVisual({ caps }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;

  // Positions: top=imagination, right=coherence, bottom=connection, left=values
  const positions = {
    imagination: { angle: -90,  label: "Im" },
    coherence:   { angle: 0,    label: "Co" },
    connection:  { angle: 90,   label: "Cn" },
    values:      { angle: 180,  label: "Va" },
  };

  const points = Object.entries(positions).map(([key, { angle }]) => {
    const r = caps[key] * maxR;
    const rad = (angle * Math.PI) / 180;
    return { key, x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <circle key={f} cx={cx} cy={cy} r={maxR * f}
          fill="none" stroke="#e2e8f0" strokeWidth={1} strokeDasharray={f < 1 ? "3,3" : "none"} />
      ))}
      {/* Axis lines */}
      {Object.entries(positions).map(([key, { angle }]) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line key={key} x1={cx} y1={cy}
            x2={cx + maxR * Math.cos(rad)} y2={cy + maxR * Math.sin(rad)}
            stroke="#cbd5e1" strokeWidth={1} />
        );
      })}
      {/* Filled shape */}
      <polygon points={polyPoints} fill="rgba(45,90,74,0.12)" stroke="#2D5A4A" strokeWidth={2} />
      {/* Dots and labels */}
      {points.map(p => (
        <g key={p.key}>
          <circle cx={p.x} cy={p.y} r={5} fill={CAPACITIES[p.key].color} />
          <text
            x={cx + (maxR + 18) * Math.cos((positions[p.key].angle * Math.PI) / 180)}
            y={cy + (maxR + 18) * Math.sin((positions[p.key].angle * Math.PI) / 180)}
            textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 11, fontWeight: 600, fill: CAPACITIES[p.key].color }}
          >
            {CAPACITIES[p.key].name}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PracticeButton({ practice, onPractice, disabled }) {
  const cap = CAPACITIES[practice.cap];
  return (
    <button
      onClick={() => onPractice(practice)}
      disabled={disabled}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "8px 12px", marginBottom: 4,
        background: disabled ? "#f1f5f9" : cap.light,
        border: `1px solid ${disabled ? "#e2e8f0" : cap.color + "40"}`,
        borderRadius: 8, cursor: disabled ? "default" : "pointer",
        fontSize: 12.5, color: disabled ? "#94a3b8" : "#1e293b",
        transition: "all 0.2s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontWeight: 600, color: disabled ? "#94a3b8" : cap.color }}>{cap.icon}</span>{" "}
      {practice.title}
      <span style={{ float: "right", fontSize: 11, color: "#94a3b8" }}>+{(practice.boost * 100).toFixed(0)}%</span>
    </button>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [caps, setCaps] = useState({
    connection: 0.25, values: 0.25, imagination: 0.25, coherence: 0.25,
  });
  const [practiceLog, setPracticeLog] = useState([]);
  const [expandedDynamic, setExpandedDynamic] = useState(null);
  const [activeCapFilter, setActiveCapFilter] = useState(null);

  const handleCapChange = useCallback((key, val) => {
    setCaps(prev => ({ ...prev, [key]: Math.min(1, Math.max(0, val)) }));
    setPracticeLog([]);
  }, []);

  const handlePractice = useCallback((practice) => {
    setCaps(prev => ({
      ...prev,
      [practice.cap]: Math.min(1, prev[practice.cap] + practice.boost),
    }));
    setPracticeLog(prev => [...prev, { ...practice, timestamp: Date.now() }]);
  }, []);

  const handleReset = useCallback(() => {
    setCaps({ connection: 0.25, values: 0.25, imagination: 0.25, coherence: 0.25 });
    setPracticeLog([]);
    setExpandedDynamic(null);
    setActiveCapFilter(null);
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { generative: 0, emerging: 0, nascent: 0 };
    DYNAMICS.forEach(d => { counts[dynamicStatus(caps[d.caps[0]], caps[d.caps[1]])]++; });
    return counts;
  }, [caps]);

  const filteredPractices = activeCapFilter
    ? PRACTICES.filter(p => p.cap === activeCapFilter)
    : PRACTICES;

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#f8fafc", minHeight: "100vh", color: "#1e293b",
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 0" }}>
        <h1 style={{
          fontFamily: "'Newsreader', Georgia, serif", fontSize: "2rem",
          fontWeight: 500, marginBottom: 6, color: "#1e293b",
        }}>
          Generative Renewal Simulator
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", maxWidth: 700, marginBottom: 24, lineHeight: 1.5 }}>
          Set initial capacity levels, then practice to enhance them.
          The six dynamics emerge from the interaction between capacity pairs —
          shifting from <span style={{ color: "#dc2626", fontWeight: 600 }}>nascent</span> to{" "}
          <span style={{ color: "#ca8a04", fontWeight: 600 }}>emerging</span> to{" "}
          <span style={{ color: "#16a34a", fontWeight: 600 }}>generative</span> as capacities grow.
        </p>
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 20px 40px",
        display: "grid", gridTemplateColumns: "320px 1fr", gap: 24,
      }}>
        {/* Left panel — Capacities + Practices */}
        <div>
          {/* Diamond visual */}
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
            padding: 20, marginBottom: 16,
          }}>
            <DiamondVisual caps={caps} />
          </div>

          {/* Capacity sliders */}
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
            padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 16, fontWeight: 500 }}>
                Capacities
              </h2>
              <button onClick={handleReset} style={{
                fontSize: 11, color: "#64748b", background: "none", border: "1px solid #e2e8f0",
                borderRadius: 6, padding: "4px 10px", cursor: "pointer",
              }}>
                Reset
              </button>
            </div>
            {CAP_KEYS.map(k => (
              <CapacitySlider key={k} capKey={k} value={caps[k]} onChange={handleCapChange} />
            ))}
          </div>

          {/* Practices */}
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
            padding: 20,
          }}>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              Practices
            </h2>
            <p style={{ fontSize: 11.5, color: "#64748b", marginBottom: 12 }}>
              Click a practice to enhance its capacity. Filter by capacity:
            </p>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setActiveCapFilter(null)}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 14, cursor: "pointer",
                  border: `1px solid ${!activeCapFilter ? "#2D5A4A" : "#e2e8f0"}`,
                  background: !activeCapFilter ? "rgba(45,90,74,0.1)" : "#fff",
                  color: !activeCapFilter ? "#2D5A4A" : "#64748b",
                }}
              >All</button>
              {CAP_KEYS.map(k => (
                <button key={k}
                  onClick={() => setActiveCapFilter(k)}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 14, cursor: "pointer",
                    border: `1px solid ${activeCapFilter === k ? CAPACITIES[k].color : "#e2e8f0"}`,
                    background: activeCapFilter === k ? CAPACITIES[k].light : "#fff",
                    color: activeCapFilter === k ? CAPACITIES[k].color : "#64748b",
                  }}
                >{CAPACITIES[k].name}</button>
              ))}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {filteredPractices.map(p => (
                <PracticeButton key={p.id} practice={p}
                  onPractice={handlePractice}
                  disabled={caps[p.cap] >= 1}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — Dynamics dashboard */}
        <div>
          {/* Summary bar */}
          <div style={{
            display: "flex", gap: 12, marginBottom: 16,
          }}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} style={{
                flex: 1, background: meta.bg, border: `1px solid ${meta.border}`,
                borderRadius: 10, padding: "12px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: meta.color }}>
                  {statusCounts[key]}
                </div>
                <div style={{ fontSize: 11, color: meta.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {meta.label}
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {DYNAMICS.map((d, i) => (
              <DynamicCard key={d.name} dynamic={d} caps={caps}
                expanded={expandedDynamic === i}
                onToggle={() => setExpandedDynamic(expandedDynamic === i ? null : i)}
              />
            ))}
          </div>

          {/* Practice log */}
          {practiceLog.length > 0 && (
            <div style={{
              marginTop: 20, background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: 14, padding: 20,
            }}>
              <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 15, fontWeight: 500, marginBottom: 10 }}>
                Practice History ({practiceLog.length})
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {practiceLog.map((p, i) => {
                  const cap = CAPACITIES[p.cap];
                  return (
                    <span key={i} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 14,
                      background: cap.light, color: cap.color, border: `1px solid ${cap.color}30`,
                    }}>
                      {cap.icon} {p.title}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Theory note */}
          <div style={{
            marginTop: 20, background: "rgba(45,90,74,0.04)", border: "1px solid rgba(45,90,74,0.15)",
            borderRadius: 14, padding: 20,
          }}>
            <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 15, fontWeight: 500, marginBottom: 8, color: "#2D5A4A" }}>
              The Diamond Model
            </h3>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              Each <strong>dynamic</strong> captures the interaction between a specific pair of <strong>capacities</strong>.
              When both capacities in a pair are low, the dynamic is <em>nascent</em> — the family system struggles.
              When one capacity is developed but its partner lags, the dynamic is <em>emerging</em> — there is
              potential but imbalance. When both capacities are strong, the dynamic becomes fully <em>generative</em>,
              enabling renewal. Practices target individual capacities, but their effects ripple
              through all dynamics that depend on them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
