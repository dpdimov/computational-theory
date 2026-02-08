import React, { useState } from 'react';

const ComputationalTheoryCanvas = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [expandedElement, setExpandedElement] = useState(null);
  const [userInputs, setUserInputs] = useState({
    paperTitle: '',
    primaryLevel: '',
    constructs: [{ id: 1, name: '', description: '', entryPoint: '', entryPointDetails: '', functionalForm: '', functionalFormDetails: '' }],
    relationships: [],
    pathway: [],
    feedbackLoops: '',
    thresholdEffects: '',
    crossLevelUp: '',
    crossLevelDown: '',
    boundaryConditions: '',
    simulationNotes: ''
  });

  const handleInputChange = (field, value) => {
    setUserInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleConstructChange = (id, field, value) => {
    setUserInputs(prev => ({
      ...prev,
      constructs: prev.constructs.map(c => c.id === id ? { ...c, [field]: field === 'entryPoint' || field === 'functionalForm' ? value : value } : c)
    }));
  };

  const addConstruct = () => {
    const newId = Math.max(...userInputs.constructs.map(c => c.id), 0) + 1;
    setUserInputs(prev => ({
      ...prev,
      constructs: [...prev.constructs, { id: newId, name: '', description: '', entryPoint: '', entryPointDetails: '', functionalForm: '', functionalFormDetails: '' }]
    }));
  };

  const removeConstruct = (id) => {
    if (userInputs.constructs.length <= 1) return;
    setUserInputs(prev => ({
      ...prev,
      constructs: prev.constructs.filter(c => c.id !== id),
      relationships: prev.relationships.filter(r => r.from !== id && r.to !== id)
    }));
  };

  const addRelationship = () => {
    if (userInputs.constructs.length < 2) return;
    const newId = Math.max(...userInputs.relationships.map(r => r.id), 0) + 1;
    setUserInputs(prev => ({
      ...prev,
      relationships: [...prev.relationships, { id: newId, from: prev.constructs[0].id, to: prev.constructs[1]?.id || prev.constructs[0].id, type: 'causes', description: '' }]
    }));
  };

  const handleRelationshipChange = (id, field, value) => {
    setUserInputs(prev => ({
      ...prev,
      relationships: prev.relationships.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const removeRelationship = (id) => {
    setUserInputs(prev => ({
      ...prev,
      relationships: prev.relationships.filter(r => r.id !== id)
    }));
  };

  const handleArrayToggle = (field, value) => {
    setUserInputs(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const relationshipTypes = [
    { value: 'causes', label: 'causes', description: 'A directly increases/decreases B' },
    { value: 'moderates', label: 'moderates', description: 'A changes the strength of another relationship involving B' },
    { value: 'mediates', label: 'mediates', description: 'A transmits the effect of another construct to B' },
    { value: 'enables', label: 'enables', description: 'A is necessary for B to have effect' },
    { value: 'inhibits', label: 'inhibits', description: 'A reduces or blocks B' },
    { value: 'correlates', label: 'correlates with', description: 'A and B co-vary without clear causal direction' }
  ];

  const levels = {
    individual: {
      name: 'Individual Action',
      color: '#2D5A4A',
      lightColor: '#E8F0ED',
      borderColor: '#B8D4C8',
      question: 'How does the entrepreneur sustain effort and make judgments?',
      foundation: 'Dimov & Pistrui (2024); Dimov (2010)',
      timeScale: 'Days to months',
      stocks: [
        { category: 'Resource', items: ['Energy/Vitality', 'Motivation', 'Strain', 'Financial Resources'], description: 'Depletable and replenishable' },
        { category: 'Cumulative', items: ['Skill/Competence', 'Cumulative Effort', 'Experience'], description: 'Accumulating over time' },
        { category: 'Position', items: ['Confidence/Conviction', 'Progress', 'Commitment'], description: 'Location on continuum with thresholds' }
      ],
      flows: ['Effort exertion', 'Learning', 'Recovery', 'Depletion', 'Confidence updating', 'Skill development'],
      entryPoints: [
        { name: 'New stock variable', description: 'Your construct accumulates over time', example: 'e.g., Passion, Resilience' },
        { name: 'Flow modifier', description: 'Your construct affects the rate of change', example: 'e.g., Recovery practices' },
        { name: 'Gateway variable', description: 'Your construct acts as threshold for continuation', example: 'e.g., Opportunity confidence' },
        { name: 'Evaluation accuracy', description: 'Your construct affects judgment quality', example: 'e.g., Entrepreneurial experience' },
        { name: 'Parameter', description: 'Your construct modulates relationships', example: 'e.g., Ambition, Self-regulation' }
      ],
      pathways: [
        { name: 'Direct', description: 'Affects effort → outcome conversion directly' },
        { name: 'Indirect via gateway', description: 'Affects confidence/conviction which determines continuation' },
        { name: 'Indirect via resources', description: 'Affects motivation/strain stocks' },
        { name: 'Moderating', description: 'Changes strength of other relationships' }
      ],
      linkagesUp: ['Effort → Venture activity intensity', 'Confidence → Intentionality', 'Human capital → Initial venture resources'],
      linkagesDown: ['Ecosystem culture → Ambition', 'Networks → Information access', 'Role models → Self-efficacy']
    },
    venture: {
      name: 'Venture Emergence',
      color: '#8B4513',
      lightColor: '#F5EBE0',
      borderColor: '#D4C4B0',
      question: 'How does the venture come into being as a viable entity?',
      foundation: 'Katz & Gartner (1988)',
      timeScale: 'Months to years',
      stocks: [
        { category: 'Intentionality', items: ['Vision', 'Goals', 'Commitment', 'Drive'], description: 'Purpose and direction' },
        { category: 'Boundary', items: ['Legal identity', 'Physical demarcation', 'Team boundary', 'Cognitive boundary'], description: 'Inside/outside demarcation' },
        { category: 'Exchange', items: ['Customer relationships', 'Supplier relationships', 'Investor relationships', 'Partner relationships'], description: 'Stakeholder interface' },
        { category: 'Resources', items: ['Financial capital', 'Human capital', 'Physical capital', 'Intellectual capital'], description: 'Material substrate' }
      ],
      flows: ['Resource acquisition', 'Relationship formation', 'Boundary establishment', 'Capability building', 'Transaction execution'],
      entryPoints: [
        { name: 'Property modifier', description: 'Your construct affects one of the four properties', example: 'e.g., Legitimacy affects Boundary' },
        { name: 'Cross-property link', description: 'Your construct connects properties', example: 'e.g., How Resources enable Exchange' },
        { name: 'Threshold condition', description: 'Your construct defines minimum viability', example: 'e.g., Minimum viable product' },
        { name: 'Emergence accelerator', description: 'Your construct speeds property development', example: 'e.g., Accelerator participation' }
      ],
      pathways: [
        { name: 'Single property', description: 'Affects one property directly' },
        { name: 'Multiple properties', description: 'Affects several properties simultaneously' },
        { name: 'Sequential', description: 'Affects properties in sequence' },
        { name: 'Configurational', description: 'Affects how properties combine' }
      ],
      linkagesUp: ['Emergence → Ecosystem output stock', 'Exit events → Capital recycling', 'Founder learning → Leadership supply'],
      linkagesDown: ['Founder confidence → Intentionality', 'Founder effort → Activity across properties', 'Founder experience → Exchange effectiveness']
    },
    ecosystem: {
      name: 'Entrepreneurial Ecosystem',
      color: '#4A4A8A',
      lightColor: '#EEEEF5',
      borderColor: '#C8C8D8',
      question: 'How does the regional context enable productive entrepreneurship?',
      foundation: 'Stam (2015); Stam & Van de Ven (2021)',
      timeScale: 'Years to decades',
      stocks: [
        { category: 'Framework Conditions', items: ['Formal institutions', 'Culture', 'Physical infrastructure', 'Demand/Market access'], description: 'Fundamental enabling conditions' },
        { category: 'Systemic Conditions', items: ['Networks', 'Leadership', 'Finance', 'Talent', 'Knowledge', 'Intermediaries'], description: 'Heart of the ecosystem' },
        { category: 'Outputs', items: ['Startup rate', 'Scale-ups', 'Entrepreneurial employees', 'Exit events'], description: 'Entrepreneurial activity' },
        { category: 'Outcomes', items: ['Productivity', 'Employment', 'Income', 'Wellbeing'], description: 'Value creation' }
      ],
      flows: ['Upward causation', 'Downward feedback', 'Element interdependence', 'Knowledge spillovers', 'Capital recycling'],
      entryPoints: [
        { name: 'Framework condition', description: 'Your construct is a fundamental cause', example: 'e.g., Regulatory quality' },
        { name: 'Systemic element', description: 'Your construct is part of ecosystem heart', example: 'e.g., Mentor networks' },
        { name: 'Element interaction', description: 'Your construct links elements', example: 'e.g., University-industry ties' },
        { name: 'Feedback mechanism', description: 'Your construct enables reinforcement', example: 'e.g., Role model effects' }
      ],
      pathways: [
        { name: 'Upward only', description: 'Conditions → Outputs → Outcomes' },
        { name: 'With downward feedback', description: 'Includes reinforcement loops' },
        { name: 'Cross-element', description: 'Works through element interdependence' },
        { name: 'Multi-scalar', description: 'Operates across geographic levels' }
      ],
      linkagesUp: ['National policy context', 'Global knowledge flows', 'International capital'],
      linkagesDown: ['Systemic conditions → Venture resources', 'Culture → Founder ambition', 'Networks → Opportunity recognition']
    }
  };

  const functionalForms = [
    { name: 'Linear', description: 'Proportional relationship', formula: 'Y = a + bX' },
    { name: 'Threshold', description: 'Effect kicks in after a point', formula: 'Y = 0 if X < k, else f(X)' },
    { name: 'Multiplicative', description: 'Factors combine; all necessary', formula: 'Y = X₁ × X₂ × X₃' },
    { name: 'Logistic/S-curve', description: 'Bounded with diminishing returns', formula: 'Y = L / (1 + e^(-k(X-x₀)))' },
    { name: 'Moderating', description: 'Changes another relationship', formula: 'Y = b₁X + b₂XZ' },
    { name: 'Mediating', description: 'Transmits effect through variable', formula: 'X → M → Y' }
  ];

  const steps = [
    { id: 'intro', title: 'Introduction', subtitle: 'Understanding the canvas' },
    { id: 'level', title: 'Select Level', subtitle: 'Where does your theory operate?' },
    { id: 'explore', title: 'Explore Structure', subtitle: 'Stocks, flows, and dynamics' },
    { id: 'construct', title: 'Define Constructs', subtitle: 'Your theoretical contributions' },
    { id: 'pathways', title: 'Pathways & Feedback', subtitle: 'Causal structure' },
    { id: 'linkages', title: 'Cross-Level Effects', subtitle: 'Connections across levels' },
    { id: 'summary', title: 'Translation Summary', subtitle: 'Your computational specification' }
  ];

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case 'intro': return true;
      case 'level': return selectedLevel !== null;
      case 'explore': return true;
      case 'construct': return userInputs.constructs.some(c => c.name.trim() !== '');
      case 'pathways': return userInputs.pathway.length > 0;
      case 'linkages': return true;
      case 'summary': return true;
      default: return true;
    }
  };

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '1.5rem 3rem',
      borderBottom: '1px solid #E0E0E0',
      background: '#FAFAFA',
      overflowX: 'auto'
    }}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div
            onClick={() => idx <= currentStep && setCurrentStep(idx)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: idx <= currentStep ? 'pointer' : 'default',
              opacity: idx <= currentStep ? 1 : 0.5,
              minWidth: '80px'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: idx < currentStep ? (selectedLevel ? levels[selectedLevel].color : '#4A8A6A') :
                         idx === currentStep ? (selectedLevel ? levels[selectedLevel].color : '#333') : '#E0E0E0',
              color: idx <= currentStep ? '#FFF' : '#999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              transition: 'all 0.3s ease'
            }}>
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <div style={{
              fontSize: '0.7rem',
              color: idx === currentStep ? '#333' : '#888',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              fontWeight: idx === currentStep ? '500' : '400'
            }}>
              {step.title}
            </div>
          </div>
          {idx < steps.length - 1 && (
            <div style={{
              flex: '1',
              height: '2px',
              background: idx < currentStep ? (selectedLevel ? levels[selectedLevel].color : '#4A8A6A') : '#E0E0E0',
              minWidth: '20px',
              marginBottom: '1.5rem',
              transition: 'all 0.3s ease'
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderIntro = () => (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontWeight: '400',
        fontSize: '1.75rem',
        marginBottom: '1.5rem',
        color: '#1a1a1a'
      }}>
        Welcome to the Computational Theory Canvas
      </h2>

      <p style={{ color: '#555', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
        This tool helps you translate your theoretical contribution into computational form.
        By specifying where your constructs plug in, how relationships work, and what feedback
        loops operate, you create a blueprint for simulation and systematic exploration.
      </p>

      <div style={{
        background: '#FFF',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        border: '1px solid #E0E0E0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ color: '#333', fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>
          The canvas operates at three interconnected levels:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(levels).map(([key, level]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: level.color,
                marginTop: '0.35rem',
                flexShrink: 0
              }} />
              <div>
                <div style={{ color: level.color, fontWeight: '500', marginBottom: '0.25rem' }}>
                  {level.name}
                </div>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  {level.question}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #F0F7F4 0%, #F4F4FA 100%)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid #D0E0D8'
      }}>
        <h3 style={{ color: '#2D5A4A', fontSize: '1rem', marginBottom: '0.75rem', fontWeight: '500' }}>
          What you'll specify:
        </h3>
        <ul style={{ color: '#555', margin: 0, paddingLeft: '1.25rem', lineHeight: '1.8' }}>
          <li>Which level your theory primarily addresses</li>
          <li>Your theoretical constructs and their relationships</li>
          <li>Where they plug into the existing architecture</li>
          <li>The functional form of relationships</li>
          <li>Pathway structure and feedback loops</li>
          <li>Cross-level effects</li>
        </ul>
      </div>
    </div>
  );

  const renderLevelSelection = () => (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontWeight: '400',
        fontSize: '1.75rem',
        marginBottom: '0.75rem',
        color: '#1a1a1a'
      }}>
        Which level does your theory primarily address?
      </h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Select the level where your main theoretical contribution operates.
        You'll specify cross-level effects later.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Object.entries(levels).map(([key, level]) => (
          <div
            key={key}
            onClick={() => { setSelectedLevel(key); handleInputChange('primaryLevel', key); }}
            style={{
              background: selectedLevel === key ? level.lightColor : '#FFF',
              borderRadius: '12px',
              padding: '1.5rem',
              border: `2px solid ${selectedLevel === key ? level.color : '#E0E0E0'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedLevel === key ? `0 2px 8px ${level.color}20` : '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{
                  color: selectedLevel === key ? level.color : '#333',
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.2rem',
                  fontWeight: '500'
                }}>
                  {level.name}
                </h3>
                <p style={{
                  color: '#666',
                  margin: '0 0 0.75rem 0',
                  fontSize: '1rem',
                  fontStyle: 'italic'
                }}>
                  {level.question}
                </p>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
                  <span><strong>Time scale:</strong> {level.timeScale}</span>
                  <span><strong>Foundation:</strong> {level.foundation}</span>
                </div>
              </div>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `2px solid ${selectedLevel === key ? level.color : '#CCC'}`,
                background: selectedLevel === key ? level.color : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontSize: '0.9rem'
              }}>
                {selectedLevel === key && '✓'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExplore = () => {
    if (!selectedLevel) return null;
    const level = levels[selectedLevel];

    return (
      <div style={{ maxWidth: '900px' }}>
        <h2 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: '400',
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
          color: '#1a1a1a'
        }}>
          Explore the {level.name} Structure
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Familiarize yourself with the stocks, flows, and dynamics at this level.
          Click elements to expand details.
        </p>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: level.color, fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '500' }}>
            Stock Variables
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {level.stocks.map(cat => (
              <div
                key={cat.category}
                onClick={() => setExpandedElement(expandedElement === cat.category ? null : cat.category)}
                style={{
                  background: expandedElement === cat.category ? level.lightColor : '#FFF',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  border: `1px solid ${expandedElement === cat.category ? level.color : '#E0E0E0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{
                      color: expandedElement === cat.category ? level.color : '#333',
                      fontWeight: '500'
                    }}>
                      {cat.category}
                    </span>
                    <span style={{ color: '#888', marginLeft: '0.75rem', fontSize: '0.9rem' }}>
                      — {cat.description}
                    </span>
                  </div>
                  <span style={{ color: '#888' }}>{expandedElement === cat.category ? '−' : '+'}</span>
                </div>
                {expandedElement === cat.category && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: `1px solid ${level.borderColor}`
                  }}>
                    {cat.items.map(item => (
                      <span key={item} style={{
                        background: '#FFF',
                        color: level.color,
                        padding: '0.35rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        border: `1px solid ${level.borderColor}`
                      }}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ color: level.color, fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '500' }}>
            Key Flows
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            background: '#FFF',
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid #E0E0E0'
          }}>
            {level.flows.map(flow => (
              <span key={flow} style={{
                background: '#F8F8F8',
                color: '#555',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                border: '1px solid #E8E8E8'
              }}>
                {flow}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderConstruct = () => {
    if (!selectedLevel) return null;
    const level = levels[selectedLevel];

    return (
      <div style={{ maxWidth: '900px' }}>
        <h2 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: '400',
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
          color: '#1a1a1a'
        }}>
          Define Your Theoretical Constructs
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Add the constructs your theory introduces. You can specify multiple constructs and define relationships between them.
        </p>

        {/* Paper Title */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            color: '#666',
            fontSize: '0.8rem',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Paper or Theory Title
          </label>
          <input
            type="text"
            value={userInputs.paperTitle}
            onChange={(e) => handleInputChange('paperTitle', e.target.value)}
            placeholder="e.g., Nascent Entrepreneurs and Venture Emergence"
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Constructs */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: level.color, fontSize: '1.1rem', fontWeight: '500', margin: 0 }}>
              Constructs <span style={{ color: level.color }}>*</span>
            </h3>
            <button
              onClick={addConstruct}
              style={{
                padding: '0.5rem 1rem',
                background: level.lightColor,
                border: `1px solid ${level.color}`,
                borderRadius: '6px',
                color: level.color,
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              + Add Construct
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {userInputs.constructs.map((construct, idx) => (
              <div
                key={construct.id}
                style={{
                  background: '#FFF',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: `1px solid ${construct.name ? level.borderColor : '#E0E0E0'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ color: level.color, fontWeight: '500', fontSize: '0.9rem' }}>
                    Construct {idx + 1}
                  </span>
                  {userInputs.constructs.length > 1 && (
                    <button
                      onClick={() => removeConstruct(construct.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'transparent',
                        border: '1px solid #DDD',
                        borderRadius: '4px',
                        color: '#999',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={construct.name}
                      onChange={(e) => handleConstructChange(construct.id, 'name', e.target.value)}
                      placeholder="e.g., Opportunity Confidence"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#FAFAFA',
                        border: `1px solid ${construct.name ? level.borderColor : '#E0E0E0'}`,
                        borderRadius: '6px',
                        color: '#333',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Entry Point
                    </label>
                    <select
                      value={construct.entryPoint}
                      onChange={(e) => handleConstructChange(construct.id, 'entryPoint', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#FAFAFA',
                        border: '1px solid #E0E0E0',
                        borderRadius: '6px',
                        color: '#333',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="">Select entry point...</option>
                      {level.entryPoints.map(ep => (
                        <option key={ep.name} value={ep.name}>{ep.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Functional Form
                    </label>
                    <select
                      value={construct.functionalForm}
                      onChange={(e) => handleConstructChange(construct.id, 'functionalForm', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#FAFAFA',
                        border: '1px solid #E0E0E0',
                        borderRadius: '6px',
                        color: '#333',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="">Select form...</option>
                      {functionalForms.map(f => (
                        <option key={f.name} value={f.name}>{f.name} — {f.formula}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Form Details
                    </label>
                    <input
                      type="text"
                      value={construct.functionalFormDetails}
                      onChange={(e) => handleConstructChange(construct.id, 'functionalFormDetails', e.target.value)}
                      placeholder="Specific parameters or notes..."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#FAFAFA',
                        border: '1px solid #E0E0E0',
                        borderRadius: '6px',
                        color: '#333',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', color: '#666', fontSize: '0.75rem', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Description
                  </label>
                  <textarea
                    value={construct.description}
                    onChange={(e) => handleConstructChange(construct.id, 'description', e.target.value)}
                    placeholder="What does this construct capture? How is it defined?"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#FAFAFA',
                      border: '1px solid #E0E0E0',
                      borderRadius: '6px',
                      color: '#333',
                      fontSize: '0.9rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relationships */}
        {userInputs.constructs.filter(c => c.name).length >= 2 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: level.color, fontSize: '1.1rem', fontWeight: '500', margin: 0 }}>
                Relationships Between Constructs
              </h3>
              <button
                onClick={addRelationship}
                style={{
                  padding: '0.5rem 1rem',
                  background: level.lightColor,
                  border: `1px solid ${level.color}`,
                  borderRadius: '6px',
                  color: level.color,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                + Add Relationship
              </button>
            </div>

            {userInputs.relationships.length === 0 ? (
              <div style={{
                background: '#FAFAFA',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                color: '#888',
                fontSize: '0.9rem',
                border: '1px dashed #DDD'
              }}>
                Click "Add Relationship" to specify how your constructs relate to each other
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {userInputs.relationships.map(rel => {
                  const namedConstructs = userInputs.constructs.filter(c => c.name);
                  return (
                    <div
                      key={rel.id}
                      style={{
                        background: '#FFF',
                        borderRadius: '8px',
                        padding: '1rem',
                        border: '1px solid #E0E0E0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <select
                        value={rel.from}
                        onChange={(e) => handleRelationshipChange(rel.id, 'from', parseInt(e.target.value))}
                        style={{
                          padding: '0.5rem',
                          background: level.lightColor,
                          border: `1px solid ${level.borderColor}`,
                          borderRadius: '4px',
                          color: level.color,
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        {namedConstructs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>

                      <select
                        value={rel.type}
                        onChange={(e) => handleRelationshipChange(rel.id, 'type', e.target.value)}
                        style={{
                          padding: '0.5rem',
                          background: '#FFF',
                          border: '1px solid #DDD',
                          borderRadius: '4px',
                          color: '#555',
                          fontSize: '0.9rem'
                        }}
                      >
                        {relationshipTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      <select
                        value={rel.to}
                        onChange={(e) => handleRelationshipChange(rel.id, 'to', parseInt(e.target.value))}
                        style={{
                          padding: '0.5rem',
                          background: level.lightColor,
                          border: `1px solid ${level.borderColor}`,
                          borderRadius: '4px',
                          color: level.color,
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        {namedConstructs.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={rel.description}
                        onChange={(e) => handleRelationshipChange(rel.id, 'description', e.target.value)}
                        placeholder="Details (optional)..."
                        style={{
                          flex: 1,
                          minWidth: '150px',
                          padding: '0.5rem',
                          background: '#FAFAFA',
                          border: '1px solid #E0E0E0',
                          borderRadius: '4px',
                          color: '#333',
                          fontSize: '0.9rem'
                        }}
                      />

                      <button
                        onClick={() => removeRelationship(rel.id)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'transparent',
                          border: '1px solid #DDD',
                          borderRadius: '4px',
                          color: '#999',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPathways = () => {
    if (!selectedLevel) return null;
    const level = levels[selectedLevel];
    const constructNames = userInputs.constructs.filter(c => c.name).map(c => c.name).join(', ') || 'your constructs';

    return (
      <div style={{ maxWidth: '800px' }}>
        <h2 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: '400',
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
          color: '#1a1a1a'
        }}>
          Pathway Structure & Feedback
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Through which pathways do {constructNames} affect outcomes?
          Select all that apply.
        </p>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: level.color, fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>
            Causal Pathways <span style={{ color: level.color }}>*</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {level.pathways.map(path => (
              <div
                key={path.name}
                onClick={() => handleArrayToggle('pathway', path.name)}
                style={{
                  background: userInputs.pathway.includes(path.name) ? level.lightColor : '#FFF',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  border: `1px solid ${userInputs.pathway.includes(path.name) ? level.color : '#E0E0E0'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  border: `2px solid ${userInputs.pathway.includes(path.name) ? level.color : '#CCC'}`,
                  background: userInputs.pathway.includes(path.name) ? level.color : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontSize: '0.75rem',
                  flexShrink: 0
                }}>
                  {userInputs.pathway.includes(path.name) && '✓'}
                </div>
                <div>
                  <span style={{ color: userInputs.pathway.includes(path.name) ? level.color : '#333', fontWeight: '500' }}>
                    {path.name}
                  </span>
                  <span style={{ color: '#666', marginLeft: '0.75rem', fontSize: '0.9rem' }}>
                    — {path.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Feedback Loop Implications
          </label>
          <textarea
            value={userInputs.feedbackLoops}
            onChange={(e) => handleInputChange('feedbackLoops', e.target.value)}
            placeholder="Do your constructs create, close, or interrupt any feedback loops? Describe the reinforcing or balancing dynamics..."
            rows={3}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Threshold Effects
          </label>
          <textarea
            value={userInputs.thresholdEffects}
            onChange={(e) => handleInputChange('thresholdEffects', e.target.value)}
            placeholder="Are there threshold effects or state changes? What happens when certain levels are crossed?"
            rows={3}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>
      </div>
    );
  };

  const renderLinkages = () => {
    if (!selectedLevel) return null;
    const level = levels[selectedLevel];
    const constructNames = userInputs.constructs.filter(c => c.name).map(c => c.name).join(', ') || 'your constructs';

    return (
      <div style={{ maxWidth: '800px' }}>
        <h2 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: '400',
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
          color: '#1a1a1a'
        }}>
          Cross-Level Effects
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Do {constructNames} have effects that span levels?
        </p>

        <div style={{
          background: '#FFF',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #E0E0E0'
        }}>
          <h4 style={{ color: '#333', marginBottom: '1rem', fontSize: '0.95rem' }}>
            Reference: Linkages from {level.name}
          </h4>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>↑ Upward to next level:</div>
            <div style={{ color: '#555', fontSize: '0.9rem', paddingLeft: '1rem' }}>
              {level.linkagesUp.map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>↓ Receives from lower level:</div>
            <div style={{ color: '#555', fontSize: '0.9rem', paddingLeft: '1rem' }}>
              {level.linkagesDown.map((l, i) => <div key={i}>• {l}</div>)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Upward Effects (how your constructs feed into higher levels)
          </label>
          <textarea
            value={userInputs.crossLevelUp}
            onChange={(e) => handleInputChange('crossLevelUp', e.target.value)}
            placeholder="How do your constructs affect the level above? What do they contribute?"
            rows={3}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Downward Effects (how your constructs receive from or affect lower levels)
          </label>
          <textarea
            value={userInputs.crossLevelDown}
            onChange={(e) => handleInputChange('crossLevelDown', e.target.value)}
            placeholder="How do your constructs connect to the level below? What shapes them or what do they shape?"
            rows={3}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Boundary Conditions
          </label>
          <textarea
            value={userInputs.boundaryConditions}
            onChange={(e) => handleInputChange('boundaryConditions', e.target.value)}
            placeholder="Under what conditions does your theory apply? What does it hold constant? What are its limits?"
            rows={3}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FFF',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!selectedLevel) return null;
    const level = levels[selectedLevel];
    const namedConstructs = userInputs.constructs.filter(c => c.name);

    const SummarySection = ({ title, content, show = true }) => {
      if (!show || !content) return null;
      return (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>
            {title}
          </div>
          <div style={{ color: '#333', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {content}
          </div>
        </div>
      );
    };

    return (
      <div style={{ maxWidth: '900px' }}>
        <h2 style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: '400',
          fontSize: '1.75rem',
          marginBottom: '0.75rem',
          color: '#1a1a1a'
        }}>
          Translation Summary
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Your theoretical contribution translated into computational form.
        </p>

        <div style={{
          background: level.lightColor,
          borderRadius: '12px',
          padding: '2rem',
          border: `2px solid ${level.color}`,
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: `1px solid ${level.borderColor}`
          }}>
            <div>
              <div style={{ color: level.color, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Computational Translation
              </div>
              {userInputs.paperTitle && (
                <h3 style={{ color: '#333', margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontSize: '1.5rem', fontWeight: '500' }}>
                  {userInputs.paperTitle}
                </h3>
              )}
            </div>
            <div style={{
              background: level.color,
              color: '#FFF',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}>
              {level.name}
            </div>
          </div>

          {/* Constructs */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              Constructs ({namedConstructs.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {namedConstructs.map(c => (
                <div key={c.id} style={{
                  background: '#FFF',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: `1px solid ${level.borderColor}`
                }}>
                  <div style={{ fontWeight: '500', color: level.color, marginBottom: '0.25rem' }}>{c.name}</div>
                  {c.description && <div style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{c.description}</div>}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#666' }}>
                    {c.entryPoint && <span><strong>Entry:</strong> {c.entryPoint}</span>}
                    {c.functionalForm && <span><strong>Form:</strong> {c.functionalForm}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relationships */}
          {userInputs.relationships.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                Relationships
              </div>
              <div style={{ color: '#333', fontSize: '0.95rem' }}>
                {userInputs.relationships.map(r => {
                  const fromName = userInputs.constructs.find(c => c.id === r.from)?.name || '?';
                  const toName = userInputs.constructs.find(c => c.id === r.to)?.name || '?';
                  return (
                    <div key={r.id} style={{ marginBottom: '0.35rem' }}>
                      <strong>{fromName}</strong> {r.type} <strong>{toName}</strong>
                      {r.description && <span style={{ color: '#666' }}> — {r.description}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <SummarySection title="Causal Pathways" content={userInputs.pathway.length > 0 ? userInputs.pathway.join(', ') : null} />
          <SummarySection title="Feedback Loop Implications" content={userInputs.feedbackLoops} />
          <SummarySection title="Threshold Effects" content={userInputs.thresholdEffects} />
          <SummarySection title="Upward Cross-Level Effects" content={userInputs.crossLevelUp} />
          <SummarySection title="Downward Cross-Level Effects" content={userInputs.crossLevelDown} />
          <SummarySection title="Boundary Conditions" content={userInputs.boundaryConditions} />
        </div>

        <div style={{
          background: '#FFF',
          borderRadius: '12px',
          padding: '1.5rem',
          border: '1px solid #E0E0E0'
        }}>
          <h4 style={{ color: '#333', marginBottom: '1rem', fontSize: '1rem' }}>
            Simulation Notes (optional)
          </h4>
          <textarea
            value={userInputs.simulationNotes}
            onChange={(e) => handleInputChange('simulationNotes', e.target.value)}
            placeholder="Any additional notes for implementing this in a computational model? Parameter ranges, data sources, calibration considerations..."
            rows={4}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#FAFAFA',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              color: '#333',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              const summary = JSON.stringify(userInputs, null, 2);
              const blob = new Blob([summary], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${userInputs.paperTitle || 'translation'}-canvas.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '1rem 2rem',
              background: level.color,
              border: 'none',
              borderRadius: '8px',
              color: '#FFF',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Download Translation (JSON)
          </button>
          <button
            onClick={() => {
              setCurrentStep(0);
              setSelectedLevel(null);
              setUserInputs({
                paperTitle: '',
                primaryLevel: '',
                constructs: [{ id: 1, name: '', description: '', entryPoint: '', entryPointDetails: '', functionalForm: '', functionalFormDetails: '' }],
                relationships: [],
                pathway: [],
                feedbackLoops: '',
                thresholdEffects: '',
                crossLevelUp: '',
                crossLevelDown: '',
                boundaryConditions: '',
                simulationNotes: ''
              });
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid #DDD',
              borderRadius: '8px',
              color: '#888',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Start New Translation
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (steps[currentStep].id) {
      case 'intro': return renderIntro();
      case 'level': return renderLevelSelection();
      case 'explore': return renderExplore();
      case 'construct': return renderConstruct();
      case 'pathways': return renderPathways();
      case 'linkages': return renderLinkages();
      case 'summary': return renderSummary();
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F5',
      color: '#333',
      fontFamily: "'Söhne', 'Helvetica Neue', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem 3rem',
        borderBottom: '1px solid #E0E0E0',
        background: '#FFF'
      }}>
        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>
          Entrepreneurship Research Tool
        </div>
        <h1 style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: '400', fontSize: '1.5rem', letterSpacing: '-0.01em', color: '#1a1a1a' }}>
          Computational Theory Canvas
        </h1>
      </div>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Main Content */}
      <div style={{ padding: '3rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Step Title */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              color: selectedLevel ? levels[selectedLevel].color : '#888',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.25rem'
            }}>
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].subtitle}
            </div>
          </div>

          {/* Step Content */}
          {renderCurrentStep()}

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '1px solid #E0E0E0'
          }}>
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#FFF',
                border: '1px solid #DDD',
                borderRadius: '6px',
                color: currentStep === 0 ? '#CCC' : '#555',
                fontSize: '0.95rem',
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={!canProceed()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: canProceed() ? (selectedLevel ? levels[selectedLevel].color : '#4A8A6A') : '#E0E0E0',
                  border: 'none',
                  borderRadius: '6px',
                  color: canProceed() ? '#FFF' : '#999',
                  fontSize: '0.95rem',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                Continue →
              </button>
            ) : (
              <div style={{ color: '#888', fontSize: '0.9rem' }}>
                Translation complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1.5rem 3rem',
        borderTop: '1px solid #E0E0E0',
        background: '#FFF',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: '#888'
      }}>
        v0.2 • Based on Dimov & Pistrui (2024), Katz & Gartner (1988), Stam (2015)
      </div>
    </div>
  );
};

export default ComputationalTheoryCanvas;
