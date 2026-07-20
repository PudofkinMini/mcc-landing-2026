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

const clampProgress = (progress) => Math.max(0, Math.min(1, progress))

function StageNav({ activeStage, scrollProgress, setStage }) {
  const chapterProgress = scrollProgress * (stages.length - 1)

  return (
    <nav className="stage-nav" aria-label="Animation chapters">
      {stages.map((stage, index) => {
        const lineProgress =
          index === stages.length - 1
            ? Number(chapterProgress >= index)
            : clampProgress(chapterProgress - index)

        return (
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
              <span className="stage-line-fill" style={{ transform: `scaleX(${lineProgress})` }} />
            </span>
            <span className="stage-label">{stage.eyebrow.split(' / ')[1]}</span>
          </button>
        )
      })}
    </nav>
  )
}

function App() {
  const requestedStage = Number.parseInt(new URLSearchParams(window.location.search).get('stage'), 10)
  const initialStage = Number.isInteger(requestedStage)
    ? Math.max(0, Math.min(stages.length - 1, requestedStage))
    : 0
  const [scrollProgress, setScrollProgress] = useState(
    initialStage / (stages.length - 1),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const touchPosition = useRef(null)
  const activeStage = Math.min(
    stages.length - 1,
    Math.floor(scrollProgress * (stages.length - 1) + 0.5),
  )

  const setStage = useCallback((next) => {
    const stage = Math.max(0, Math.min(stages.length - 1, next))
    setScrollProgress(stage / (stages.length - 1))
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
    const modeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
    setScrollProgress((progress) => clampProgress(progress + (event.deltaY * modeScale) / 1200))
  }

  const onTouchStart = (event) => {
    touchPosition.current = event.touches[0].clientY
  }

  const onTouchMove = (event) => {
    if (touchPosition.current === null) return
    const nextPosition = event.touches[0].clientY
    const distance = touchPosition.current - nextPosition
    touchPosition.current = nextPosition
    setScrollProgress((progress) => clampProgress(progress + distance / 900))
  }

  const onTouchEnd = () => {
    touchPosition.current = null
  }

  return (
    <main
      className={`site stage-${activeStage + 1}`}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
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
            <RouteWorld activeStage={activeStage} scrollProgress={scrollProgress} />
            <Environment preset="city" environmentIntensity={0.22} />
          </Suspense>
        </Canvas>
      </div>

      <StageNav activeStage={activeStage} scrollProgress={scrollProgress} setStage={setStage} />

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
