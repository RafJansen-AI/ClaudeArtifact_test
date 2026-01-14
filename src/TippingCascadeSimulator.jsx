import React, { useState, useEffect, useCallback, useRef } from 'react';

// Tipping element data - accurate to Wunderling et al. 2021 Table 1
const TIPPING_ELEMENTS = {
  greenland: {
    id: 'greenland',
    name: 'Greenland',
    tippingName: 'Ice Sheet Collapse',
    fullName: 'Greenland Ice Sheet',
    icon: '🏔️',
    thresholdMin: 0.8,
    thresholdMax: 3.2,
    role: 'Main Initiator',
    shortDesc: 'Ice sheet disintegration',
    description: 'The Greenland Ice Sheet is the second-largest ice body on Earth. "Tipping" means crossing a threshold where melting becomes self-sustaining — the ice sheet will continue to shrink even if warming stops. This would raise global sea levels by approximately 7 meters over centuries to millennia.',
    color: '#60a5fa',
    position: { x: 50, y: 8 }
  },
  wais: {
    id: 'wais',
    name: 'Antarctica',
    tippingName: 'Ice Sheet Collapse',
    fullName: 'West Antarctic Ice Sheet',
    icon: '🧊',
    thresholdMin: 0.8,
    thresholdMax: 5.5,
    role: 'Initiator & Mediator',
    shortDesc: 'Marine ice sheet collapse',
    description: 'The West Antarctic Ice Sheet sits on bedrock below sea level, making it vulnerable to "marine ice sheet instability." Warming oceans can melt ice from below, causing glaciers to retreat unstoppably. The Thwaites "Doomsday Glacier" is already showing signs of instability. Full collapse would raise sea levels by 3+ meters.',
    color: '#a78bfa',
    position: { x: 50, y: 92 }
  },
  amoc: {
    id: 'amoc',
    name: 'AMOC',
    tippingName: 'Circulation Collapse',
    fullName: 'Atlantic Meridional Overturning Circulation',
    icon: '🌊',
    thresholdMin: 3.5,
    thresholdMax: 6.0,
    role: 'Cascade Transmitter',
    shortDesc: 'Ocean current shutdown',
    description: 'The AMOC is a massive "conveyor belt" of ocean currents including the Gulf Stream. It carries warm water northward and cold water southward, keeping Europe ~5°C warmer than it would otherwise be. "Tipping" means this circulation could slow dramatically or collapse, causing rapid cooling in Europe, shifted rainfall patterns globally, and rising seas along the US East Coast.',
    color: '#2dd4bf',
    position: { x: 8, y: 50 }
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    tippingName: 'Rainforest Dieback',
    fullName: 'Amazon Rainforest',
    icon: '🌳',
    thresholdMin: 3.5,
    thresholdMax: 4.5,
    role: 'Follower Only',
    shortDesc: 'Forest-to-savanna shift',
    description: 'The Amazon rainforest generates much of its own rainfall through evapotranspiration — trees release water vapor that falls as rain downwind. "Tipping" means this moisture recycling breaks down: drought kills trees, reducing rainfall, killing more trees in a vicious cycle. Large parts of the rainforest could transition to savanna, releasing massive amounts of stored carbon and devastating biodiversity.',
    color: '#4ade80',
    position: { x: 92, y: 50 }
  }
};

// Interactions from Table 2
const INTERACTIONS = [
  { from: 'greenland', to: 'amoc', type: 'destabilizing', strength: 10, label: 'Meltwater weakens currents' },
  { from: 'amoc', to: 'greenland', type: 'stabilizing', strength: 10, label: 'Less heat if AMOC weakens' },
  { from: 'greenland', to: 'wais', type: 'destabilizing', strength: 10, label: 'Sea level rise' },
  { from: 'wais', to: 'greenland', type: 'destabilizing', strength: 2, label: 'Sea level rise' },
  { from: 'wais', to: 'amoc', type: 'unclear', strength: 3, label: 'Complex effects' },
  { from: 'amoc', to: 'wais', type: 'destabilizing', strength: 1.5, label: 'Southern ocean warming' },
  { from: 'amoc', to: 'amazon', type: 'unclear', strength: 3, label: 'Rainfall pattern changes' }
];

// Scenarios
const SCENARIOS = [
  { 
    id: 'paris15',
    name: 'Paris 1.5°C',
    icon: '🌱',
    targetTemp: 1.5,
    yearsToTarget: 30,
    color: '#22c55e',
    description: 'Best case: aggressive emissions cuts'
  },
  { 
    id: 'paris2',
    name: 'Paris 2°C',
    icon: '🌡️',
    targetTemp: 2.0,
    yearsToTarget: 35,
    color: '#84cc16',
    description: 'Paris Agreement upper limit'
  },
  { 
    id: 'current',
    name: 'Current Policies',
    icon: '📈',
    targetTemp: 2.7,
    yearsToTarget: 50,
    color: '#eab308',
    description: 'Where we\'re headed now (~2.7°C)'
  },
  { 
    id: 'worst',
    name: 'High Emissions',
    icon: '🔥',
    targetTemp: 4.0,
    yearsToTarget: 75,
    color: '#ef4444',
    description: 'Continued fossil fuel use'
  }
];

const INTERACTION_STRENGTH = 0.35;

export default function TippingCascadeSimulator() {
  const [temperature, setTemperature] = useState(1.1);
  const [elements, setElements] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [cascadeLog, setCascadeLog] = useState([]);
  const [year, setYear] = useState(2025);
  const [scenario, setScenario] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [infoElement, setInfoElement] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const intervalRef = useRef(null);

  const initializeElements = useCallback(() => {
    return Object.fromEntries(
      Object.keys(TIPPING_ELEMENTS).map(id => {
        const el = TIPPING_ELEMENTS[id];
        const threshold = el.thresholdMin + Math.random() * (el.thresholdMax - el.thresholdMin);
        return [id, { stress: 0, tipped: false, threshold }];
      })
    );
  }, []);

  useEffect(() => {
    setElements(initializeElements());
  }, [initializeElements]);

  const calculateStress = useCallback((elementId, currentElements, temp) => {
    if (!currentElements) return 0;
    const state = currentElements[elementId];
    if (state.tipped) return 100;
    
    const tempRatio = Math.max(0, (temp - 0.8) / (state.threshold - 0.8));
    let stress = tempRatio * 55;
    
    INTERACTIONS.forEach(interaction => {
      if (interaction.to === elementId && currentElements[interaction.from]?.tipped) {
        if (interaction.type === 'stabilizing') {
          stress -= interaction.strength * INTERACTION_STRENGTH * 12;
        } else if (interaction.type === 'destabilizing') {
          stress += interaction.strength * INTERACTION_STRENGTH * 10;
        } else {
          stress += interaction.strength * INTERACTION_STRENGTH * 4;
        }
      }
    });
    
    return Math.max(0, Math.min(100, stress));
  }, []);

  const checkTipping = useCallback((stress, tipped) => {
    if (tipped) return false;
    if (stress >= 85) return Math.random() < (stress - 85) / 15 * 0.4;
    if (stress >= 70) return Math.random() < 0.05;
    return false;
  }, []);

  useEffect(() => {
    if (!isRunning || gameOver || !elements || !scenario) return;

    intervalRef.current = setInterval(() => {
      setYear(prevYear => {
        const newYear = prevYear + 1;
        const elapsed = newYear - 2025;
        const progress = Math.min(1, elapsed / scenario.yearsToTarget);
        const newTemp = 1.1 + (scenario.targetTemp - 1.1) * progress;
        setTemperature(newTemp);
        return newYear;
      });
      
      setElements(prev => {
        if (!prev) return prev;
        const newElements = { ...prev };
        let newTips = [];
        
        const elapsed = year - 2024;
        const progress = Math.min(1, elapsed / scenario.yearsToTarget);
        const currentTemp = 1.1 + (scenario.targetTemp - 1.1) * progress;
        
        Object.keys(TIPPING_ELEMENTS).forEach(id => {
          const stress = calculateStress(id, prev, currentTemp);
          newElements[id] = { ...newElements[id], stress };
          
          if (checkTipping(stress, prev[id].tipped)) {
            newElements[id] = { ...newElements[id], tipped: true, stress: 100 };
            newTips.push(id);
          }
        });
        
        if (newTips.length > 0) {
          const hasPriorTips = Object.values(prev).some(e => e.tipped);
          setCascadeLog(log => [
            ...log,
            ...newTips.map(id => ({
              year: year + 1,
              element: TIPPING_ELEMENTS[id].fullName,
              icon: TIPPING_ELEMENTS[id].icon,
              temp: currentTemp.toFixed(1),
              isCascade: hasPriorTips
            }))
          ]);
        }
        
        return newElements;
      });
    }, 600);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, gameOver, elements, scenario, year, calculateStress, checkTipping]);

  useEffect(() => {
    if (!elements) return;
    const allTipped = Object.values(elements).every(e => e.tipped);
    if (allTipped && !gameOver) {
      setGameOver(true);
      setIsRunning(false);
    }
  }, [elements, gameOver]);

  const startScenario = (newScenario) => {
    setElements(initializeElements());
    setTemperature(1.1);
    setYear(2025);
    setCascadeLog([]);
    setGameOver(false);
    setScenario(newScenario);
    setIsRunning(true);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setElements(initializeElements());
    setTemperature(1.1);
    setYear(2025);
    setCascadeLog([]);
    setGameOver(false);
    setScenario(null);
  };

  if (!elements) return null;

  const tippedCount = Object.values(elements).filter(e => e.tipped).length;

  const getTempColor = (t) => {
    if (t <= 1.5) return '#22c55e';
    if (t <= 2.0) return '#84cc16';
    if (t <= 3.0) return '#eab308';
    if (t <= 4.0) return '#f97316';
    return '#ef4444';
  };

  const getArrowPath = (fromPos, toPos, curveOffset = 12) => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    const startX = fromPos.x + (dx / len) * 14;
    const startY = fromPos.y + (dy / len) * 14;
    const endX = toPos.x - (dx / len) * 14;
    const endY = toPos.y - (dy / len) * 14;
    
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const perpX = (-dy / len) * curveOffset;
    const perpY = (dx / len) * curveOffset;
    
    return {
      path: `M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`,
      endX, endY,
      angle: Math.atan2(toPos.y - (midY + perpY), toPos.x - (midX + perpX))
    };
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0c1222 0%, #1a1a2e 100%)',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: 'white',
      padding: '16px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', margin: '0 0 4px', fontWeight: '700' }}>
          🌍 Climate Tipping Points Simulator
        </h1>
        <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
          Based on Wunderling et al. (2021) • Stockholm Resilience Centre
        </p>
      </div>

      {/* Temperature Indicator */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Global Temperature Rise</span>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Year: <strong style={{ color: 'white' }}>{year}</strong></span>
        </div>
        
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <div style={{
            height: '24px',
            borderRadius: '12px',
            background: 'linear-gradient(90deg, #22c55e 0%, #84cc16 18%, #eab308 35%, #f97316 55%, #ef4444 75%, #991b1b 100%)',
            position: 'relative'
          }}>
            {[1.5, 2.0, 3.0, 4.0].map(t => (
              <div key={t} style={{
                position: 'absolute',
                left: `${((t - 1) / 4) * 100}%`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'rgba(0,0,0,0.3)'
              }} />
            ))}
          </div>
          
          <div style={{
            position: 'absolute',
            left: `${Math.min(100, Math.max(0, ((temperature - 1) / 4) * 100))}%`,
            top: '-4px',
            transform: 'translateX(-50%)',
            transition: 'left 0.3s ease'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: getTempColor(temperature),
              border: '3px solid white',
              boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700'
            }}>
              {temperature.toFixed(1)}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', paddingTop: '8px' }}>
          <span>1.0°C</span>
          <span style={{ color: '#22c55e' }}>1.5°</span>
          <span style={{ color: '#84cc16' }}>2.0°</span>
          <span style={{ color: '#eab308' }}>3.0°</span>
          <span style={{ color: '#f97316' }}>4.0°</span>
          <span style={{ color: '#ef4444' }}>5.0°C</span>
        </div>
      </div>

      {/* Scenario Selection */}
      {!isRunning && !gameOver && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px', textAlign: 'center' }}>
            Choose a warming scenario to simulate:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => startScenario(s)}
                style={{
                  padding: '14px 12px',
                  background: `${s.color}15`,
                  border: `2px solid ${s.color}50`,
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: s.color }}>{s.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Running controls */}
      {(isRunning || scenario) && !gameOver && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              flex: 1,
              padding: '12px',
              background: isRunning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              border: `1px solid ${isRunning ? '#ef4444' : '#22c55e'}50`,
              borderRadius: '10px',
              color: isRunning ? '#fca5a5' : '#86efac',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {isRunning ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button
            onClick={resetSimulation}
            style={{
              padding: '12px 20px',
              background: 'rgba(100, 116, 139, 0.2)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              borderRadius: '10px',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ↻ New Scenario
          </button>
        </div>
      )}

      {/* Network Visualization */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px',
        position: 'relative',
        height: '320px'
      }}>
        {/* Connection lines with arrows */}
        <svg 
          style={{ 
            position: 'absolute', 
            inset: '16px', 
            width: 'calc(100% - 32px)', 
            height: 'calc(100% - 32px)',
            overflow: 'visible'
          }} 
          viewBox="0 0 100 100"
        >
          <defs>
            {/* Smaller arrow markers */}
            <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,4 L6,2 z" fill="#ef4444" />
            </marker>
            <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,4 L6,2 z" fill="#22c55e" />
            </marker>
            <marker id="arrowGray" markerWidth="6" markerHeight="6" refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,4 L6,2 z" fill="#94a3b8" />
            </marker>
            <marker id="arrowRedActive" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
            </marker>
            <marker id="arrowGreenActive" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L8,3 z" fill="#22c55e" />
            </marker>
          </defs>
          
          {INTERACTIONS.map((int, i) => {
            const fromPos = TIPPING_ELEMENTS[int.from].position;
            const toPos = TIPPING_ELEMENTS[int.to].position;
            const isActive = elements[int.from]?.tipped;
            
            const color = int.type === 'destabilizing' ? '#ef4444' : 
                         int.type === 'stabilizing' ? '#22c55e' : '#94a3b8';
            
            const markerId = int.type === 'destabilizing' 
              ? (isActive ? 'arrowRedActive' : 'arrowRed')
              : int.type === 'stabilizing' 
                ? (isActive ? 'arrowGreenActive' : 'arrowGreen')
                : 'arrowGray';
            
            const reverseLink = INTERACTIONS.find(other => other.from === int.to && other.to === int.from);
            const curveOffset = reverseLink ? (INTERACTIONS.indexOf(reverseLink) > i ? 10 : -10) : 8;
            
            const { path } = getArrowPath(fromPos, toPos, curveOffset);
            
            return (
              <g key={i}>
                {isActive && (
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={5}
                    strokeOpacity={0.25}
                    strokeLinecap="round"
                  />
                )}
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeOpacity={isActive ? 1 : 0.6}
                  strokeDasharray={int.type === 'unclear' ? '3 2' : 'none'}
                  strokeLinecap="round"
                  markerEnd={`url(#${markerId})`}
                  style={{ transition: 'all 0.3s' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Tipping element nodes */}
        {Object.values(TIPPING_ELEMENTS).map(element => {
          const state = elements[element.id];
          if (!state) return null;
          const stress = calculateStress(element.id, elements, temperature);
          
          return (
            <div
              key={element.id}
              onClick={() => setSelectedElement(selectedElement?.id === element.id ? null : element)}
              style={{
                position: 'absolute',
                left: `${element.position.x}%`,
                top: `${element.position.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              {/* Stress ring */}
              <svg width="80" height="80" style={{ position: 'absolute', top: '-14px', left: '-14px' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke={state.tipped ? '#ef4444' : stress > 50 ? '#f97316' : element.color}
                  strokeWidth="5"
                  strokeDasharray={`${stress * 2.14} 214`}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
                />
              </svg>
              
              {/* Node */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: state.tipped 
                  ? 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)'
                  : `linear-gradient(135deg, ${element.color}30 0%, ${element.color}10 100%)`,
                border: `2px solid ${state.tipped ? '#ef4444' : element.color}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                boxShadow: state.tipped 
                  ? '0 0 25px rgba(239, 68, 68, 0.6)' 
                  : `0 4px 12px ${element.color}30`
              }}>
                <span style={{ fontSize: '22px' }}>{element.icon}</span>
              </div>
              
              {/* Name label - positioned below node */}
              <div style={{
                position: 'absolute',
                top: '58px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: state.tipped ? '#fca5a5' : element.color,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}>
                  {element.name}
                </div>
                <div style={{ 
                  fontSize: '9px', 
                  color: '#64748b',
                  marginTop: '1px'
                }}>
                  {element.shortDesc}
                </div>
              </div>
              
              {/* Status badge - positioned above node */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '3px 8px',
                borderRadius: '100px',
                fontSize: '10px',
                fontWeight: '700',
                background: state.tipped ? '#ef4444' : stress > 60 ? '#f97316' : '#22c55e',
                color: 'white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}>
                {state.tipped ? '⚠️ TIPPED' : `${Math.round(stress)}%`}
              </div>
            </div>
          );
        })}

        {/* Center counter */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: '44px',
            fontWeight: '900',
            color: tippedCount >= 3 ? '#ef4444' : tippedCount >= 1 ? '#f97316' : '#22c55e',
            lineHeight: 1,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            {tippedCount}/4
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Tipped
          </div>
        </div>
      </div>

      {/* Selected element info (from diagram) */}
      {selectedElement && (
        <div style={{
          background: `${selectedElement.color}15`,
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px',
          border: `1px solid ${selectedElement.color}30`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '28px' }}>{selectedElement.icon}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: selectedElement.color }}>
                {selectedElement.fullName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Tipping threshold: {selectedElement.thresholdMin}–{selectedElement.thresholdMax}°C • {selectedElement.role}
              </div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
            {selectedElement.description}
          </p>
        </div>
      )}

      {/* Event Log */}
      {cascadeLog.length > 0 && (
        <div style={{
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          maxHeight: '100px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>📋 Tipping Events</div>
          {cascadeLog.slice().reverse().map((event, i) => (
            <div key={i} style={{
              padding: '6px 10px',
              background: event.isCascade ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
              borderRadius: '6px',
              marginBottom: '4px',
              fontSize: '11px',
              color: event.isCascade ? '#fca5a5' : '#fde047'
            }}>
              {event.icon} <strong>{event.year}</strong> @ {event.temp}°C — {event.element}
              {event.isCascade && <span style={{ color: '#ef4444' }}> (CASCADE!)</span>}
            </div>
          ))}
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.3) 0%, rgba(30, 27, 75, 0.3) 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          textAlign: 'center',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🌍💔</div>
          <h2 style={{ margin: '0 0 8px', color: '#fca5a5', fontSize: '18px' }}>Full Cascade by {year}</h2>
          <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: '13px' }}>
            All four tipping elements crossed their thresholds under the "{scenario?.name}" scenario.
          </p>
          <button
            onClick={resetSimulation}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Try Another Scenario
          </button>
        </div>
      )}

      {/* Explanation Box */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '16px',
        padding: '16px',
        fontSize: '12px',
        color: '#94a3b8',
        lineHeight: 1.6
      }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: '#cbd5e1' }}>ℹ️ About This Simulation</h3>
        
        <p style={{ margin: '0 0 12px' }}>
          This model visualizes how <strong style={{ color: '#60a5fa' }}>climate tipping points</strong> can 
          interact and trigger cascade effects. <strong>Click any box below</strong> to learn what each tipping point means.
        </p>

        {/* Clickable 2x2 grid */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {Object.values(TIPPING_ELEMENTS).map(el => (
            <button
              key={el.id}
              onClick={() => setInfoElement(infoElement?.id === el.id ? null : el)}
              style={{ 
                background: infoElement?.id === el.id ? `${el.color}30` : `${el.color}10`,
                borderRadius: '8px', 
                padding: '10px',
                border: `1px solid ${infoElement?.id === el.id ? el.color : 'transparent'}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>{el.icon}</span>
                <strong style={{ color: el.color, fontSize: '12px' }}>{el.name}</strong>
              </div>
              <div style={{ fontSize: '10px', marginTop: '3px', color: '#94a3b8' }}>{el.tippingName}</div>
            </button>
          ))}
        </div>

        {/* Expanded info panel */}
        {infoElement && (
          <div style={{
            background: `${infoElement.color}10`,
            border: `1px solid ${infoElement.color}40`,
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: infoElement.color, marginBottom: '6px' }}>
              {infoElement.icon} {infoElement.fullName}: {infoElement.tippingName}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6 }}>
              {infoElement.description}
            </p>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b' }}>
              Estimated threshold: {infoElement.thresholdMin}–{infoElement.thresholdMax}°C above pre-industrial
            </div>
          </div>
        )}

        {/* Link legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '2px', background: '#ef4444' }}></div>
            <span style={{ fontSize: '11px' }}>Destabilizing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '2px', background: '#22c55e' }}></div>
            <span style={{ fontSize: '11px' }}>Stabilizing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '2px', background: '#94a3b8', opacity: 0.6 }}></div>
            <span style={{ fontSize: '11px' }}>Uncertain</span>
          </div>
        </div>

        {/* How It Works - Collapsible */}
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(96, 165, 250, 0.1)',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            borderRadius: '8px',
            color: '#93c5fd',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: showHowItWorks ? '12px' : '12px'
          }}
        >
          <span>🔬 How does this simulation work?</span>
          <span style={{ transform: showHowItWorks ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
        </button>

        {showHowItWorks && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(96, 165, 250, 0.2)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 10px' }}>
                <strong style={{ color: '#93c5fd' }}>🎲 Randomized Thresholds:</strong> Each simulation run 
                randomly selects the exact tipping threshold for each element within its scientific uncertainty range. 
                For example, Greenland's threshold is somewhere between 0.8°C and 3.2°C — scientists aren't sure exactly where. 
                This means <em>each run produces different results</em>, reflecting real-world uncertainty.
              </p>
              
              <p style={{ margin: '0 0 10px' }}>
                <strong style={{ color: '#93c5fd' }}>📊 Stress Level:</strong> The percentage shown on each element 
                represents "stress" — how close it is to tipping. Stress increases as global temperature approaches 
                that element's randomly-assigned threshold. The ring around each element fills up to show this visually.
              </p>
              
              <p style={{ margin: '0 0 10px' }}>
                <strong style={{ color: '#93c5fd' }}>⚡ Probabilistic Tipping:</strong> When stress exceeds ~70%, there's 
                a small random chance of tipping each year. Above ~85%, this chance increases significantly. This 
                models real uncertainty — we can't predict exactly <em>when</em> a tipping point will be crossed, only the risk.
              </p>
              
              <p style={{ margin: '0 0 10px' }}>
                <strong style={{ color: '#93c5fd' }}>🔗 Cascade Effects:</strong> When one element tips, it affects 
                connected elements via the arrows. Red arrows <em>increase</em> stress on the target (destabilizing), 
                green arrows <em>decrease</em> stress (stabilizing), and gray dashed arrows have uncertain effects. 
                This is how one tipping point can trigger others — the "domino effect" from the research paper.
              </p>
              
              <p style={{ margin: '0' }}>
                <strong style={{ color: '#93c5fd' }}>🔄 Run It Again:</strong> Because of the randomization, you might see 
                Greenland tip at 1.3°C in one run and 2.1°C in another — both are scientifically plausible. Try running 
                the same scenario multiple times to see the range of possible outcomes!
              </p>
            </div>
          </div>
        )}

        <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
          <strong>Source:</strong> Wunderling et al. (2021) "Interacting tipping elements increase risk of climate 
          domino effects" — Earth System Dynamics
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: '#475569' }}>
        Click diagram nodes or info boxes to learn more • Tap a scenario to begin
      </div>

      <style>{`
        * { box-sizing: border-box; }
        button:hover { opacity: 0.9; }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
      `}</style>
    </div>
  );
}
