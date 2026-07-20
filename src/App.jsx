import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader } from '@react-three/drei'
import { RouteWorld } from './RouteWorld'

const stages = [
  {
    eyebrow: '01 / Dispatch',
    title: 'Start with your way.',
    text: 'Placeholder copy for the first step in your route story.',
  },
  {
    eyebrow: '02 / Service',
    title: 'Every stop, understood.',
    text: 'Placeholder copy for the second step in your route story.',
  },
  {
    eyebrow: '03 / Return',
    title: 'Bring it all together.',
    text: 'Placeholder copy for the third step in your route story.',
  },
  {
    eyebrow: '04 / Results',
    title: 'Keep every customer smiling.',
    text: 'Placeholder copy for the fourth step in your route story.',
  },
]

function LogoMark() {
  return (
    <svg viewBox="0 0 38 38" aria-hidden="true">
      <path d="M5 8.5 19 3l14 5.5v20L19 35 5 28.5z" />
      <path d="m12 13 7-3 7 3v11l-7 3-7-3z" />
      <path d="M5 8.5 19 15l14-6.5M19 15v20" />
    </svg>
  )
}

function StageNav({ activeStage, setStage }) {
  return (
    <nav className="stage-nav" aria-label="Animation chapters">
      {stages.map((stage, index) => (
        <button
          className={`stage-button ${activeStage === index ? 'is-active' : ''}`}
          type="button"
          key={stage.eyebrow}
          onClick={() => setStage(index)}
          aria-current={activeStage === index ? 'step' : undefined}
          aria-label={`Go to stage ${index + 1}: ${stage.title}`}
        >
          <span className="stage-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="stage-line">
            <span className="stage-line-fill" />
          </span>
          <span className="stage-label">{stage.eyebrow.split(' / ')[1]}</span>
        </button>
      ))}
    </nav>
  )
}

function App() {
  const [activeStage, setActiveStage] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const wheelLock = useRef(false)
  const touchStart = useRef(null)

  const setStage = useCallback((next) => {
    setActiveStage(Math.max(0, Math.min(stages.length - 1, next)))
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        setStage(activeStage + 1)
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        setStage(activeStage - 1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeStage, setStage])

  const onWheel = (event) => {
    if (wheelLock.current || Math.abs(event.deltaY) < 10) return
    wheelLock.current = true
    setStage(activeStage + (event.deltaY > 0 ? 1 : -1))
    window.setTimeout(() => {
      wheelLock.current = false
    }, 900)
  }

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0].clientY
  }

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return
    const distance = touchStart.current - event.changedTouches[0].clientY
    if (Math.abs(distance) > 45) setStage(activeStage + (distance > 0 ? 1 : -1))
    touchStart.current = null
  }

  return (
    <main
      className={`site stage-${activeStage + 1}`}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="header">
        <a className="brand" href="/" aria-label="MCC home">
          <LogoMark />
          <span>MCC</span>
        </a>
        <span className="brand-descriptor">Route systems for textile rental</span>
        <div className="header-actions">
          <a className="text-link" href="#contact">
            Start a conversation
          </a>
          <button
            className="menu-button"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <section className="hero" aria-live="polite">
        <div className="hero-kicker">
          <span className="kicker-dot" />
          Software that follows your operation
        </div>
        <div className="hero-copy" key={activeStage}>
          <p>{stages[activeStage].eyebrow}</p>
          <h1>{stages[activeStage].title}</h1>
          <span>{stages[activeStage].text}</span>
        </div>
      </section>

      <div className="canvas-wrap" aria-hidden="true">
        <Canvas
          shadows
          dpr={[1, 1.8]}
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [-9, 9, 12], fov: 35 }}
        >
          <Suspense fallback={null}>
            <RouteWorld activeStage={activeStage} />
            <Environment preset="city" environmentIntensity={0.35} />
          </Suspense>
        </Canvas>
      </div>

      <StageNav activeStage={activeStage} setStage={setStage} />

      <div className="scroll-hint">
        <span>Scroll to move</span>
        <svg viewBox="0 0 20 30" aria-hidden="true">
          <rect x="1" y="1" width="18" height="28" rx="9" />
          <circle cx="10" cy="8" r="2" />
        </svg>
      </div>

      <div className={`menu-panel ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <button type="button" onClick={() => setMenuOpen(false)}>
          Close
        </button>
        <a href="#platform">Platform</a>
        <a href="#industries">Industries</a>
        <a href="#company">Company</a>
        <a href="#contact">Contact</a>
      </div>
      <Loader
        containerStyles={{ background: '#e8eadc' }}
        innerStyles={{ width: '160px', height: '2px', background: '#b7bbad' }}
        barStyles={{ background: '#f2563d', height: '2px' }}
        dataStyles={{ color: '#13282b', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}
      />
    </main>
  )
}

export default App
