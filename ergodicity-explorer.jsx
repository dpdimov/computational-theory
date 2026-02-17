import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

const ErgodicitySandbox = () => {
  // Parameters
  const [skill, setSkill] = useState(0.05); // μ - drift/expected growth
  const [luckVariance, setLuckVariance] = useState(0.20); // σ - volatility
  const [numVentures, setNumVentures] = useState(50); // N for ensemble
  const [numPeriods, setNumPeriods] = useState(20); // T for time
  const [numAttempts, setNumAttempts] = useState(1); // Serial entrepreneurship
  const [safetyNet, setSafetyNet] = useState(0); // Floor on losses (0-0.5)
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' or 'extended'

  // Generate random normal variable (Box-Muller transform)
  const randomNormal = (mean = 0, std = 1) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z0;
  };

  // Generate ensemble data (many ventures at each time point)
  const generateEnsembleData = () => {
    const data = [];
    const ventures = Array(numVentures).fill(0).map(() => ({
      value: 1, // Start with normalized capital
      path: [1]
    }));

    for (let t = 0; t <= numPeriods; t++) {
      // Calculate ensemble average at this time point
      const ensembleAvg = ventures.reduce((sum, v) => sum + v.value, 0) / numVentures;
      
      // Theoretical ensemble average (includes volatility pump +σ²/2)
      const volatilityBoost = (luckVariance * luckVariance) / 2;
      const theoreticalEnsemble = Math.exp((skill + volatilityBoost) * t);
      
      data.push({
        period: t,
        ensembleAvg,
        theoreticalEnsemble,
        ventures: ventures.map(v => v.value)
      });

      // Update each venture for next period
      if (t < numPeriods) {
        ventures.forEach(v => {
          const luck = randomNormal(0, luckVariance);
          const growth = skill + luck;
          v.value *= Math.exp(growth);
        });
      }
    }

    return data;
  };

  // Generate time average data (one venture over many realizations)
  const generateTimeData = () => {
    const data = [];
    const numRealizations = 100; // Multiple "parallel universes" of one entrepreneur
    const timePaths = Array(numRealizations).fill(0).map(() => ({
      value: 1,
      path: [1]
    }));

    for (let t = 0; t <= numPeriods; t++) {
      // Time average is geometric mean across realizations at final period
      const timeAvgs = timePaths.map(path => path.value);
      const geometricMean = Math.exp(
        timeAvgs.reduce((sum, val) => sum + Math.log(val), 0) / numRealizations
      );
      
      // Theoretical time average (geometric mean, no volatility boost)
      const theoreticalTime = Math.exp(skill * t);
      
      data.push({
        period: t,
        timeAvg: geometricMean,
        theoreticalTime,
        paths: timePaths.map(p => p.value)
      });

      // Update each path for next period
      if (t < numPeriods) {
        timePaths.forEach(p => {
          const luck = randomNormal(0, luckVariance);
          const growth = skill + luck;
          const multiplier = Math.exp(growth);
          
          // Apply safety net if enabled
          if (safetyNet > 0) {
            const minMultiplier = 1 - safetyNet; // e.g., 0.5 means max loss is 50%
            p.value *= Math.max(multiplier, minMultiplier);
          } else {
            p.value *= multiplier;
          }
        });
      }
    }

    return data;
  };

  // Generate serial entrepreneurship data
  const generateSerialData = () => {
    const data = [];
    const numEntrepreneurs = 100;
    
    // Each entrepreneur gets numAttempts tries
    const finalOutcomes = Array(numEntrepreneurs).fill(0).map(() => {
      let bestOutcome = 0;
      
      for (let attempt = 0; attempt < numAttempts; attempt++) {
        let value = 1;
        for (let t = 0; t < numPeriods; t++) {
          const luck = randomNormal(0, luckVariance);
          const growth = skill + luck;
          const multiplier = Math.exp(growth);
          
          if (safetyNet > 0) {
            const minMultiplier = 1 - safetyNet;
            value *= Math.max(multiplier, minMultiplier);
          } else {
            value *= multiplier;
          }
        }
        bestOutcome = Math.max(bestOutcome, value);
      }
      
      return bestOutcome;
    });
    
    // Calculate distribution
    const sorted = [...finalOutcomes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    
    return {
      outcomes: finalOutcomes,
      median,
      mean,
      p90,
      p10,
      sorted
    };
  };

  const [serialData, setSerialData] = useState(null);

  const [ensembleData, setEnsembleData] = useState([]);
  const [timeData, setTimeData] = useState([]);

  // Regenerate on parameter change or manual trigger
  const regenerate = () => {
    setEnsembleData(generateEnsembleData());
    setTimeData(generateTimeData());
    setSerialData(generateSerialData());
    setIsRunning(true);
  };

  useEffect(() => {
    regenerate();
  }, []);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (!ensembleData.length || !timeData.length) return null;

    const finalEnsemble = ensembleData[ensembleData.length - 1];
    const finalTime = timeData[timeData.length - 1];

    const volatilityBoost = (luckVariance * luckVariance) / 2;
    const ensembleGrowth = skill + volatilityBoost;  // Ensemble benefits from variance
    const timeGrowth = skill;  // Time average doesn't

    return {
      ensembleAvg: finalEnsemble.ensembleAvg,
      timeAvg: finalTime.timeAvg,
      ensembleTheoretical: finalEnsemble.theoreticalEnsemble,
      timeTheoretical: finalTime.theoreticalTime,
      volatilityBoost: volatilityBoost,
      ensembleGrowth: ensembleGrowth,
      timeGrowth: timeGrowth,
      divergence: (finalEnsemble.ensembleAvg / finalTime.timeAvg - 1) * 100
    };
  }, [ensembleData, timeData, skill, luckVariance]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)',
      color: '#e8e6e3',
      fontFamily: "'IBM Plex Sans', -apple-system, sans-serif",
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '300',
          letterSpacing: '-0.02em',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          The Ergodicity Break
        </h1>
        <p style={{
          fontSize: '1.1rem',
          color: '#a8b2d1',
          fontWeight: '300',
          maxWidth: '900px',
          lineHeight: '1.6'
        }}>
          Why investors and entrepreneurs experience different realities in the same market
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem',
        display: 'flex',
        gap: '1rem',
        borderBottom: '1px solid rgba(164, 178, 209, 0.1)'
      }}>
        <button
          onClick={() => setActiveTab('basic')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'basic' ? 'rgba(244, 162, 97, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'basic' ? '2px solid #f4a261' : '2px solid transparent',
            color: activeTab === 'basic' ? '#f4a261' : '#a8b2d1',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            transition: 'all 0.2s'
          }}
        >
          Basic: Ensemble vs Time
        </button>
        <button
          onClick={() => setActiveTab('extended')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'extended' ? 'rgba(78, 205, 196, 0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'extended' ? '2px solid #4ecdc4' : '2px solid transparent',
            color: activeTab === 'extended' ? '#4ecdc4' : '#a8b2d1',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            transition: 'all 0.2s'
          }}
        >
          Extended: Paradox of Failure
        </button>
      </div>

      {activeTab === 'basic' && (
        <>
      {/* Formula Display */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(164, 178, 209, 0.1)',
        borderRadius: '8px',
        padding: '1.5rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Multiplicative Model
            </div>
            <div style={{ 
              fontFamily: "'Fira Code', monospace", 
              fontSize: '1.2rem',
              color: '#f4a261'
            }}>
              Success = Skill × Luck
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Ensemble Growth (Investors)
            </div>
            <div style={{ 
              fontFamily: "'Fira Code', monospace", 
              fontSize: '1.2rem',
              color: '#f4a261'
            }}>
              μ<sub>ensemble</sub> = μ + σ²/2 = {((skill + (luckVariance * luckVariance) / 2) * 100).toFixed(1)}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Time Growth (Entrepreneurs)
            </div>
            <div style={{ 
              fontFamily: "'Fira Code', monospace", 
              fontSize: '1.2rem',
              color: '#4ecdc4'
            }}>
              μ<sub>time</sub> = μ = {(skill * 100).toFixed(1)}%
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Ergodicity Gap
            </div>
            <div style={{ 
              fontFamily: "'Fira Code', monospace", 
              fontSize: '1.2rem',
              color: '#ef476f'
            }}>
              σ²/2 = {((luckVariance * luckVariance / 2) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(164, 178, 209, 0.1)',
        borderRadius: '8px',
        padding: '1.5rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {/* Skill slider */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a8b2d1', fontWeight: '500' }}>
              Skill (Expected Growth μ): {(skill * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min="-0.05"
              max="0.15"
              step="0.01"
              value={skill}
              onChange={(e) => setSkill(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#f4a261'
              }}
            />
          </div>

          {/* Luck variance slider */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a8b2d1', fontWeight: '500' }}>
              Luck Variance (σ): {(luckVariance * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={luckVariance}
              onChange={(e) => setLuckVariance(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#ef476f'
              }}
            />
          </div>

          {/* Number of ventures */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a8b2d1', fontWeight: '500' }}>
              Portfolio Size: {numVentures}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={numVentures}
              onChange={(e) => setNumVentures(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#4ecdc4'
              }}
            />
          </div>

          {/* Regenerate button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={regenerate}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #f4a261 0%, #e76f51 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#0a0e27',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Regenerate Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Charts Side by Side */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Ensemble Chart */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(164, 178, 209, 0.1)',
          borderRadius: '8px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#f4a261'
          }}>
            Ensemble Average (Investor Portfolio)
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#a8b2d1',
            marginBottom: '0.5rem',
            lineHeight: '1.5'
          }}>
            {numVentures} ventures running simultaneously. The two lines show the same thing (ensemble average) from empirical simulation vs. theoretical prediction.
          </p>
          <div style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: '0.8rem',
            color: '#f4a261',
            background: 'rgba(244, 162, 97, 0.1)',
            padding: '0.5rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            E[V<sub>t</sub>] = V<sub>0</sub> × exp((μ + σ²/2)t)
          </div>
          <LineChart width={550} height={350} data={ensembleData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(164, 178, 209, 0.1)" />
            <XAxis 
              dataKey="period" 
              label={{ value: 'Time Period', position: 'insideBottom', offset: -5, fill: '#a8b2d1' }}
              stroke="#a8b2d1"
            />
            <YAxis 
              label={{ value: 'Normalized Return', angle: -90, position: 'insideLeft', fill: '#a8b2d1' }}
              stroke="#a8b2d1"
            />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(10, 14, 39, 0.95)', 
                border: '1px solid rgba(164, 178, 209, 0.2)',
                borderRadius: '4px',
                color: '#e8e6e3'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="ensembleAvg" 
              stroke="#f4a261" 
              strokeWidth={3}
              name="Simulated"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="theoreticalEnsemble" 
              stroke="#e76f51" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Theory: exp((μ+σ²/2)t)"
              dot={false}
            />
          </LineChart>
        </div>

        {/* Time Average Chart */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(164, 178, 209, 0.1)',
          borderRadius: '8px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#4ecdc4'
          }}>
            Time Average (Entrepreneurial Journey)
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#a8b2d1',
            marginBottom: '0.5rem',
            lineHeight: '1.5'
          }}>
            One venture over {numPeriods} periods. The two lines show the same thing (geometric mean) from empirical simulation vs. theoretical prediction.
          </p>
          <div style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: '0.8rem',
            color: '#4ecdc4',
            background: 'rgba(78, 205, 196, 0.1)',
            padding: '0.5rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            Median[V<sub>t</sub>] = V<sub>0</sub> × exp(μt)
          </div>
          <LineChart width={550} height={350} data={timeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(164, 178, 209, 0.1)" />
            <XAxis 
              dataKey="period" 
              label={{ value: 'Time Period', position: 'insideBottom', offset: -5, fill: '#a8b2d1' }}
              stroke="#a8b2d1"
            />
            <YAxis 
              label={{ value: 'Normalized Return', angle: -90, position: 'insideLeft', fill: '#a8b2d1' }}
              stroke="#a8b2d1"
            />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(10, 14, 39, 0.95)', 
                border: '1px solid rgba(164, 178, 209, 0.2)',
                borderRadius: '4px',
                color: '#e8e6e3'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="timeAvg" 
              stroke="#4ecdc4" 
              strokeWidth={3}
              name="Simulated"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="theoreticalTime" 
              stroke="#48a9a6" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Theory: exp(μt)"
              dot={false}
            />
          </LineChart>
        </div>
      </div>

      {/* Mathematical Derivation */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(164, 178, 209, 0.1)',
        borderRadius: '8px',
        padding: '1.5rem',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '500',
          marginBottom: '1rem',
          color: '#e8e6e3'
        }}>
          Why the Formulas Differ: The Mathematics
        </h3>

        <div style={{
          fontSize: '0.875rem',
          lineHeight: '1.8',
          color: '#a8b2d1'
        }}>
          <p style={{ marginBottom: '1rem' }}>
            Each venture experiences multiplicative growth: V<sub>t+1</sub> = V<sub>t</sub> × exp(μ + σZ), where Z ~ N(0,1) is random luck.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              background: 'rgba(244, 162, 97, 0.05)',
              border: '1px solid rgba(244, 162, 97, 0.2)',
              padding: '1rem',
              borderRadius: '6px'
            }}>
              <div style={{ color: '#f4a261', fontWeight: '600', marginBottom: '0.5rem' }}>
                Ensemble Average (What Investors See)
              </div>
              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                E[V<sub>t</sub>] = E[V<sub>0</sub> × exp(Σ(μ + σZ<sub>i</sub>))]
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a8b2d1' }}>
                Taking expectations of the exponential:<br/>
                E[exp(σZ)] = exp(σ²/2) when Z ~ N(0,1)<br/>
                <br/>
                This gives: E[V<sub>t</sub>] = V<sub>0</sub> × exp((μ + σ²/2)t)
              </div>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem',
                background: 'rgba(244, 162, 97, 0.1)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#f4a261'
              }}>
                <strong>Key:</strong> The +σ²/2 comes from E[exp(σZ)] ≠ exp(E[σZ]). Jensen's inequality: E[f(X)] ≠ f(E[X]) for nonlinear f.
              </div>
            </div>

            <div style={{
              background: 'rgba(78, 205, 196, 0.05)',
              border: '1px solid rgba(78, 205, 196, 0.2)',
              padding: '1rem',
              borderRadius: '6px'
            }}>
              <div style={{ color: '#4ecdc4', fontWeight: '600', marginBottom: '0.5rem' }}>
                Time Average (What Entrepreneurs Experience)
              </div>
              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Median[V<sub>t</sub>] = V<sub>0</sub> × exp(Σ(μ + σZ<sub>i</sub>))
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a8b2d1' }}>
                For a single path, we compound the actual shocks:<br/>
                Median[Σ σZ<sub>i</sub>] = 0 (symmetric distribution)<br/>
                <br/>
                This gives: Median[V<sub>t</sub>] = V<sub>0</sub> × exp(μt)
              </div>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem',
                background: 'rgba(78, 205, 196, 0.1)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#4ecdc4'
              }}>
                <strong>Key:</strong> No +σ²/2 term! The typical path just compounds at rate μ. Only the ensemble average benefits from variance.
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(239, 71, 111, 0.05)',
            border: '1px solid rgba(239, 71, 111, 0.2)',
            padding: '1rem',
            borderRadius: '6px'
          }}>
            <div style={{ color: '#ef476f', fontWeight: '600', marginBottom: '0.5rem' }}>
              The Ergodicity Gap = σ²/2
            </div>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              This is <strong>not</strong> "volatility drag" on entrepreneurs - it's a <strong>volatility boost</strong> for investors. 
              The ensemble average grows faster than the typical path because E[exponential] {'>'} exponential[E[·]]. 
              Investors pool independent draws, so variance creates upside optionality. 
              Entrepreneurs experience sequential draws, so they just get the median outcome.
            </p>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      {metrics && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(164, 178, 209, 0.1)',
          borderRadius: '8px',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '500',
            marginBottom: '1rem',
            color: '#e8e6e3'
          }}>
            The Ergodicity Break: Why Temporal ≠ Spatial Diversification
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'rgba(244, 162, 97, 0.1)',
              border: '1px solid rgba(244, 162, 97, 0.3)',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#f4a261', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Ensemble Final Average
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: '#f4a261', fontFamily: "'Fira Code', monospace" }}>
                {metrics.ensembleAvg.toFixed(2)}×
              </div>
            </div>

            <div style={{
              background: 'rgba(78, 205, 196, 0.1)',
              border: '1px solid rgba(78, 205, 196, 0.3)',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#4ecdc4', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Time Average Final
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: '#4ecdc4', fontFamily: "'Fira Code', monospace" }}>
                {metrics.timeAvg.toFixed(2)}×
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 71, 111, 0.1)',
              border: '1px solid rgba(239, 71, 111, 0.3)',
              borderRadius: '6px',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#ef476f', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Divergence
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: '#ef476f', fontFamily: "'Fira Code', monospace" }}>
                {metrics.divergence.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(164, 178, 209, 0.05)',
            borderLeft: '3px solid #4ecdc4',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.6',
            color: '#a8b2d1'
          }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong style={{ color: '#e8e6e3' }}>Investors</strong> securitize luck <em>horizontally</em> across {numVentures} simultaneous bets. 
              Their portfolio average benefits from the <strong style={{ color: '#f4a261' }}>volatility boost (+σ²/2)</strong>, growing at {((skill + metrics.volatilityBoost) * 100).toFixed(1)}% per period.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong style={{ color: '#e8e6e3' }}>Entrepreneurs</strong> can only diversify <em>temporally</em> through sequential attempts. 
              The geometric mean (typical path) grows at the base rate: <strong style={{ color: '#4ecdc4' }}>{(skill * 100).toFixed(1)}% per period</strong>, missing the volatility boost.
            </p>
            <p style={{ margin: 0 }}>
              The <strong style={{ color: '#ef476f' }}>ergodicity gap</strong> (σ²/2 = {(metrics.volatilityBoost * 100).toFixed(2)}%): 
              Ensemble averages <em>benefit</em> from variance (more variance → higher expected value for portfolios), 
              while individual paths experience only the drift. Advice optimized for ensemble averages 
              (e.g., "more variance is good") can be misleading for entrepreneurs who experience time averages.
            </p>
          </div>
        </div>
      )}

      </>
      )}

      {/* Extended Tab: Paradox of Failure */}
      {activeTab === 'extended' && (
        <>
          {/* Controls for Extended Analysis */}
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            marginBottom: '2rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(164, 178, 209, 0.1)',
            borderRadius: '8px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '500',
              marginBottom: '1rem',
              color: '#4ecdc4'
            }}>
              The Paradox of Failure
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#a8b2d1',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              Like the paradox of thrift, individual rationality (avoiding risk) can lead to collective harm (low growth). 
              But unlike saving, entrepreneurs cannot diversify temporally without institutional support.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {/* Number of attempts */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a8b2d1', fontWeight: '500' }}>
                  Serial Attempts: {numAttempts}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={numAttempts}
                  onChange={(e) => setNumAttempts(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#4ecdc4'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  How many times can an entrepreneur try?
                </div>
              </div>

              {/* Safety net */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a8b2d1', fontWeight: '500' }}>
                  Safety Net (Max Loss): {(safetyNet * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.1"
                  value={safetyNet}
                  onChange={(e) => setSafetyNet(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#4ecdc4'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Floor on downside (0 = no protection)
                </div>
              </div>

              {/* Luck variance (repeated for convenience) */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a8b2d1', fontWeight: '500' }}>
                  Societal Risk Appetite (σ): {(luckVariance * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.50"
                  step="0.05"
                  value={luckVariance}
                  onChange={(e) => setLuckVariance(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ef476f'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Cultural tolerance for variance
                </div>
              </div>

              {/* Regenerate button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={regenerate}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #4ecdc4 0%, #48a9a6 100%)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#0a0e27',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  Regenerate Analysis
                </button>
              </div>
            </div>
          </div>

          {/* Serial Entrepreneurship Results */}
          {serialData && (
            <div style={{
              maxWidth: '1400px',
              margin: '0 auto',
              marginBottom: '2rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(164, 178, 209, 0.1)',
              borderRadius: '8px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '500',
                marginBottom: '1rem',
                color: '#4ecdc4'
              }}>
                Serial Entrepreneurship: Converting Temporal → Spatial
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  background: 'rgba(78, 205, 196, 0.1)',
                  border: '1px solid rgba(78, 205, 196, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#4ecdc4', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Median Outcome
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '600', color: '#4ecdc4', fontFamily: "'Fira Code', monospace" }}>
                    {serialData.median.toFixed(2)}×
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    50th percentile
                  </div>
                </div>

                <div style={{
                  background: 'rgba(244, 162, 97, 0.1)',
                  border: '1px solid rgba(244, 162, 97, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#f4a261', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Mean Outcome
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '600', color: '#f4a261', fontFamily: "'Fira Code', monospace" }}>
                    {serialData.mean.toFixed(2)}×
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Pulled by tail
                  </div>
                </div>

                <div style={{
                  background: 'rgba(72, 169, 166, 0.1)',
                  border: '1px solid rgba(72, 169, 166, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#48a9a6', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    90th Percentile
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '600', color: '#48a9a6', fontFamily: "'Fira Code', monospace" }}>
                    {serialData.p90.toFixed(2)}×
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Top 10%
                  </div>
                </div>

                <div style={{
                  background: 'rgba(100, 116, 139, 0.1)',
                  border: '1px solid rgba(100, 116, 139, 0.3)',
                  borderRadius: '6px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    10th Percentile
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '600', color: '#64748b', fontFamily: "'Fira Code', monospace" }}>
                    {serialData.p10.toFixed(2)}×
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Bottom 10%
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(164, 178, 209, 0.05)',
                borderLeft: '3px solid #4ecdc4',
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                color: '#a8b2d1'
              }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#e8e6e3' }}>With {numAttempts} attempt(s)</strong> {safetyNet > 0 && `and ${(safetyNet * 100).toFixed(0)}% safety net`}:
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  The median entrepreneur achieves {serialData.median.toFixed(2)}× return (vs single-attempt median of ~{Math.exp(skill * numPeriods).toFixed(2)}×).
                  {numAttempts > 1 && ` Multiple attempts improve outcomes by letting entrepreneurs "max" over tries.`}
                  {safetyNet > 0 && ` The safety net reduces catastrophic losses, allowing more risk-taking.`}
                </p>
                <p style={{ margin: 0 }}>
                  But the ensemble average ({serialData.mean.toFixed(2)}×) still exceeds the median, showing that 
                  even serial entrepreneurship cannot fully replicate spatial diversification.
                </p>
              </div>
            </div>
          )}

          {/* The Coordination Problem */}
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(164, 178, 209, 0.1)',
            borderRadius: '8px',
            padding: '1.5rem',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '500',
              marginBottom: '1rem',
              color: '#ef476f'
            }}>
              The Coordination Problem
            </h3>

            {metrics && (
              <div style={{
                fontSize: '0.875rem',
                lineHeight: '1.8',
                color: '#a8b2d1'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    background: 'rgba(78, 205, 196, 0.05)',
                    border: '1px solid rgba(78, 205, 196, 0.2)',
                    padding: '1rem',
                    borderRadius: '6px'
                  }}>
                    <div style={{ color: '#4ecdc4', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Individual Rationality
                    </div>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>
                      Entrepreneurs experience time average: growth rate = μ = {(skill * 100).toFixed(1)}%.<br/><br/>
                      Variance (σ²) doesn't help the median outcome. Individually rational to:
                      <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li>Minimize risk (low σ)</li>
                        <li>Avoid failure</li>
                        <li>Play it safe</li>
                      </ul>
                    </p>
                  </div>

                  <div style={{
                    background: 'rgba(244, 162, 97, 0.05)',
                    border: '1px solid rgba(244, 162, 97, 0.2)',
                    padding: '1rem',
                    borderRadius: '6px'
                  }}>
                    <div style={{ color: '#f4a261', fontWeight: '600', marginBottom: '0.5rem' }}>
                      Social Optimum
                    </div>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>
                      Society benefits from ensemble average: growth rate = μ + σ²/2 = {((skill + metrics.volatilityBoost) * 100).toFixed(1)}%.<br/><br/>
                      Higher variance creates:
                      <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li>Kolmogorov breakage → power law tail</li>
                        <li>More unicorns (aggregate value)</li>
                        <li>Portfolio diversification benefits</li>
                      </ul>
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(239, 71, 111, 0.05)',
                  border: '1px solid rgba(239, 71, 111, 0.2)',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ color: '#ef476f', fontWeight: '600', marginBottom: '0.5rem' }}>
                    The Ergodicity Gap = {(metrics.volatilityBoost * 100).toFixed(2)}%
                  </div>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>
                    Society wants high σ (creates {(metrics.volatilityBoost * 100).toFixed(2)}% extra growth for investors + fat tail). 
                    Individuals want low σ (doesn't help them, only adds risk). 
                    Without institutions to bridge this gap, we get <strong>underproduction of variance</strong> – 
                    the paradox of failure.
                  </p>
                </div>

                <div style={{
                  background: 'rgba(164, 178, 209, 0.05)',
                  borderLeft: '3px solid #4ecdc4',
                  padding: '1rem'
                }}>
                  <div style={{ color: '#4ecdc4', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Policy Implications
                  </div>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}>
                    To align individual and social incentives, we need:
                  </p>
                  <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <li><strong>Safety nets</strong>: Floor on downside (try {(safetyNet * 100).toFixed(0)}% → 30% above to see effect)</li>
                    <li><strong>Serial entrepreneurship infrastructure</strong>: Bankruptcy laws, fast failure cycles (try increasing attempts above)</li>
                    <li><strong>Cultural shift</strong>: Celebrate failure, reduce stigma</li>
                    <li><strong>Progressive taxation</strong>: Redistribute ensemble gains</li>
                  </ul>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.75rem', margin: 0 }}>
                    These convert temporal averaging toward spatial averaging, letting individuals capture more of the societal benefit from variance.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Footer with attribution */}
      <div style={{
        maxWidth: '1400px',
        margin: '2rem auto 0',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#64748b',
        borderTop: '1px solid rgba(164, 178, 209, 0.1)',
        paddingTop: '1.5rem'
      }}>
        Based on Ole Peters' ergodicity economics • Success = Skill × Luck framework
      </div>
    </div>
  );
};

export default ErgodicitySandbox;
