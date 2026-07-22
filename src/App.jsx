import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Loader } from '@react-three/drei'
import Lenis from 'lenis'
import { RouteWorld } from './RouteWorld'
import {
  HERO_SNAP_POINTS,
  HERO_STAGE_STARTS,
  HERO_TIMELINE_END,
} from './heroTimeline'

const HERO_SNAP_EPSILON = 0.006
const HERO_STAGE_SNAP_DURATIONS = [1.1, 1.6]
const HERO_MIN_SNAP_DURATION = 0.35
const HERO_MAX_SNAP_DURATION = 1.6
const HERO_SNAP_EASING = (time) => 1 - Math.pow(1 - time, 3)
const getHeroSnapDuration = (fromProgress, toProgress) => {
  const rangeStart = Math.min(fromProgress, toProgress)
  const rangeEnd = Math.max(fromProgress, toProgress)
  const duration = HERO_STAGE_SNAP_DURATIONS.reduce(
    (total, stageDuration, index) => {
      const stageStart = HERO_SNAP_POINTS[index]
      const stageEnd = HERO_SNAP_POINTS[index + 1]
      const overlap =
        Math.max(0, Math.min(rangeEnd, stageEnd) - Math.max(rangeStart, stageStart))
      return total + stageDuration * (overlap / (stageEnd - stageStart))
    },
    0,
  )

  return Math.min(
    HERO_MAX_SNAP_DURATION,
    Math.max(HERO_MIN_SNAP_DURATION, duration),
  )
}
const getViewportHeight = () =>
  window.visualViewport?.height ?? window.innerHeight

const stages = [
  {
    label: 'Process',
    eyebrow: '01 / Inside the plant',
    title: 'Every piece moves with purpose.',
    text: 'Follow the work from the wash floor to a service-ready load—with every handoff visible in M-LINX.',
  },
  {
    label: 'Load',
    eyebrow: '02 / Ready to roll',
    title: 'Clean. Counted. On the right truck.',
    text: 'Plant teams and route teams share one dependable picture of what is ready, what is loaded, and where it belongs.',
  },
  {
    label: 'Deliver',
    eyebrow: '03 / Service delivered',
    title: 'The right linen, right where it belongs.',
    text: 'From restaurants and hotels to major healthcare facilities, every stop is accurate, accountable, and ready for what comes next.',
  },
]

const modules = [
  {
    number: '01',
    title: 'Route delivery',
    text: 'Paperless manifests, delivery adjustments, signatures, notes, and electronic invoices—built for work in motion.',
    tags: ['Mobile workflows', 'eForms', 'Proof of service'],
  },
  {
    number: '02',
    title: 'Inventory control',
    text: 'Follow clean, soiled, and circulating inventory across plants, carts, trucks, and customer locations.',
    tags: ['Soil tracking', 'Cart management', 'Barcode & RFID'],
  },
  {
    number: '03',
    title: 'Customer & billing',
    text: 'Translate contract detail into accurate service and billing, including the pricing models your customers require.',
    tags: ['Contracts', 'Flexible pricing', 'CRM'],
  },
  {
    number: '04',
    title: 'Routing & visibility',
    text: 'Connect schedules, GPS activity, route progress, and exceptions in one dependable operating view.',
    tags: ['Optimization', 'GPS breadcrumbs', 'Alerts'],
  },
  {
    number: '05',
    title: 'Production flow',
    text: 'Coordinate load building, weight verification, garment identification, and plant-to-route readiness.',
    tags: ['Load management', 'Labels', 'Plant visibility'],
  },
  {
    number: '06',
    title: 'Business intelligence',
    text: 'Give leaders real-time answers and durable reporting without asking teams to build the same picture by hand.',
    tags: ['Dashboards', 'Operational reporting', 'History'],
  },
]

const industries = [
  {
    code: 'HC',
    title: 'Healthcare',
    text: 'Support high-volume linen programs where accountability, service consistency, and rapid issue resolution matter.',
  },
  {
    code: 'FB',
    title: 'Food & beverage',
    text: 'Keep chef wear, table linen, mats, and recurring service aligned with the pace of every location.',
  },
  {
    code: 'HO',
    title: 'Hospitality',
    text: 'Make complex property needs visible—from standing orders and special requests to pickup and reconciliation.',
  },
  {
    code: 'IW',
    title: 'Industrial & workwear',
    text: 'Manage garments, labels, wearer changes, repairs, and route-level inventory without losing the customer view.',
  },
]

const processSteps = [
  ['Listen first', 'We map the operation you have, the friction you feel, and the business you intend to become.'],
  ['Configure with purpose', 'We shape M-LINX around your workflows instead of forcing your teams into a generic template.'],
  ['Roll out together', 'We work with the people who use the system, from the plant and route to the office and leadership team.'],
  ['Keep evolving', 'A modular foundation lets you add capability, refine workflows, and respond as your operation changes.'],
]

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const sitePath = (path = '/') => `${basePath}${path}`

const clampProgress = (progress) => Math.max(0, Math.min(1, progress))

function LogoMark() {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true">
      <path className="logo-ring" d="M21 4.5a16.5 16.5 0 1 0 16.5 16.5" />
      <path d="M11.5 25.5 18.8 18l5.2 5.1 8-8.1" />
      <circle cx="11.5" cy="25.5" r="2" />
      <circle cx="18.8" cy="18" r="2" />
      <circle cx="24" cy="23.1" r="2" />
      <circle cx="32" cy="15" r="2" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 9h11M10 5l4 4-4 4" />
    </svg>
  )
}

function Header({ menuOpen, setMenuOpen, currentPath }) {
  return (
    <header className="header">
      <a className="brand" href={sitePath()} aria-label="MobileCom home">
        <LogoMark />
        <span>MobileCom</span>
      </a>
      <span className="brand-descriptor">Route accounting for textile rental</span>
      <div className="header-actions">
        <a className="text-link" href={sitePath('/contact')}>
          Start a conversation
        </a>
        <button
          className={`menu-button ${menuOpen ? 'is-open' : ''}`}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span />
          <span />
        </button>
      </div>
      <nav
        className={`menu-panel ${menuOpen ? 'is-open' : ''}`}
        id="site-menu"
        aria-hidden={!menuOpen}
        aria-label="Primary navigation"
      >
        <p>Explore MobileCom</p>
        {[
          ['/', 'Home'],
          ['/platform', 'Platform'],
          ['/industries', 'Industries'],
          ['/company', 'Company'],
          ['/contact', 'Contact'],
        ].map(([href, label], index) => (
          <a
            href={sitePath(href)}
            key={href}
            className={currentPath === href ? 'is-current' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {label}
          </a>
        ))}
        <div className="menu-contact">
          <span>Talk to us directly</span>
          <a href="tel:+18003928651">1 800 392 8651</a>
          <a href="mailto:MCCMarketing@mobilecom.com">MCCMarketing@mobilecom.com</a>
        </div>
      </nav>
    </header>
  )
}

function StageNav({ activeStage, scrollProgress, setStage }) {
  return (
    <nav className="stage-nav" aria-label="Route story chapters">
      {stages.map((stage, index) => {
        const start = HERO_STAGE_STARTS[index]
        const end = HERO_STAGE_STARTS[index + 1] ?? HERO_TIMELINE_END
        const lineProgress = clampProgress((scrollProgress - start) / (end - start))

        return (
          <button
            className={`stage-button ${activeStage === index ? 'is-active' : ''}`}
            type="button"
            key={stage.eyebrow}
            onClick={() => setStage(index)}
            aria-current={activeStage === index ? 'step' : undefined}
            aria-label={`Go to chapter ${index + 1}: ${stage.title}`}
          >
            <span className="stage-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="stage-line">
              <span className="stage-line-fill" style={{ transform: `scaleX(${lineProgress})` }} />
            </span>
            <span className="stage-label">{stage.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function HomeHero() {
  const trackRef = useRef(null)
  const lenisRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const activeStage = HERO_STAGE_STARTS.reduce(
    (currentStage, start, index) =>
      scrollProgress + HERO_SNAP_EPSILON >= start ? index : currentStage,
    0,
  )

  useEffect(() => {
    let measureFrame = 0
    let snapTargetIndex = null
    let snapDirection = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const getTrackMetrics = () => {
      if (!trackRef.current) return null
      const rect = trackRef.current.getBoundingClientRect()
      const top = window.scrollY + rect.top
      const distance = Math.max(1, rect.height - getViewportHeight())
      return { top, distance, end: top + distance }
    }

    const updateProgress = () => {
      measureFrame = 0
      const metrics = getTrackMetrics()
      if (!metrics) return
      setScrollProgress(
        clampProgress((window.scrollY - metrics.top) / metrics.distance),
      )
    }

    const requestUpdate = () => {
      if (!measureFrame) {
        measureFrame = window.requestAnimationFrame(updateProgress)
      }
    }

    const getHeroProgress = (lenis) => {
      const metrics = getTrackMetrics()
      if (
        !metrics ||
        lenis.targetScroll < metrics.top - 1 ||
        lenis.targetScroll > metrics.end + 1
      ) {
        return null
      }

      return {
        metrics,
        progress: clampProgress(
          (lenis.animatedScroll - metrics.top) / metrics.distance,
        ),
      }
    }

    const scrollToSnapPoint = (
      lenis,
      metrics,
      currentProgress,
      targetIndex,
      direction,
    ) => {
      snapTargetIndex = targetIndex
      snapDirection = direction
      const targetProgress = HERO_SNAP_POINTS[targetIndex]
      lenis.scrollTo(metrics.top + targetProgress * metrics.distance, {
        duration: getHeroSnapDuration(currentProgress, targetProgress),
        easing: HERO_SNAP_EASING,
        userData: { heroSnap: true },
        onComplete: () => {
          if (snapTargetIndex === targetIndex) {
            snapTargetIndex = null
            snapDirection = 0
          }
        },
      })
    }

    let lenis = null
    const onVirtualScroll = ({ deltaY, event }) => {
      const direction = Math.sign(deltaY)
      if (!lenis || event.ctrlKey || !direction) return

      const hero = getHeroProgress(lenis)
      if (!hero) return

      if (snapTargetIndex !== null) {
        event.preventDefault()
        if (direction !== snapDirection) {
          const reversedTarget = snapTargetIndex + direction
          if (reversedTarget >= 0 && reversedTarget < HERO_SNAP_POINTS.length) {
            scrollToSnapPoint(
              lenis,
              hero.metrics,
              hero.progress,
              reversedTarget,
              direction,
            )
          }
        }
        return false
      }

      const targetIndex =
        direction > 0
          ? HERO_SNAP_POINTS.findIndex(
              (point) => point > hero.progress + HERO_SNAP_EPSILON,
            )
          : HERO_SNAP_POINTS.findLastIndex(
              (point) => point < hero.progress - HERO_SNAP_EPSILON,
            )

      if (targetIndex === -1) return
      event.preventDefault()
      scrollToSnapPoint(
        lenis,
        hero.metrics,
        hero.progress,
        targetIndex,
        direction,
      )
      return false
    }

    lenis = reducedMotion.matches
      ? null
      : new Lenis({
          autoRaf: true,
          virtualScroll: onVirtualScroll,
        })

    lenisRef.current = lenis
    if (lenis) {
      lenis.on('scroll', requestUpdate)
    }

    updateProgress()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    window.visualViewport?.addEventListener('resize', requestUpdate)
    window.visualViewport?.addEventListener('scroll', requestUpdate)
    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      window.visualViewport?.removeEventListener('resize', requestUpdate)
      window.visualViewport?.removeEventListener('scroll', requestUpdate)
      if (measureFrame) window.cancelAnimationFrame(measureFrame)
      if (lenis) {
        lenis.off('scroll', requestUpdate)
        lenis.destroy()
      }
      if (lenisRef.current === lenis) lenisRef.current = null
    }
  }, [])

  const setStage = (index) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const trackTop = window.scrollY + rect.top
    const distance = rect.height - getViewportHeight()
    const top = trackTop + HERO_STAGE_STARTS[index] * distance
    if (lenisRef.current) {
      const currentProgress = clampProgress(
        (lenisRef.current.animatedScroll - trackTop) / distance,
      )
      lenisRef.current.scrollTo(top, {
        duration: getHeroSnapDuration(
          currentProgress,
          HERO_STAGE_STARTS[index],
        ),
        easing: HERO_SNAP_EASING,
      })
    } else {
      window.scrollTo({
        top,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    }
  }

  return (
    <section className="hero-track" ref={trackRef} aria-label="The M-LINX plant-to-customer story">
      <div className={`hero-frame stage-${activeStage + 1}`}>
        <div className="hero" aria-live="polite">
          <div className="hero-kicker">
            <span className="kicker-dot" />
            Route accounting, made around you
          </div>
          <div className="hero-copy" key={activeStage}>
            <p>{stages[activeStage].eyebrow}</p>
            <h1>{stages[activeStage].title}</h1>
            <span>{stages[activeStage].text}</span>
          </div>
        </div>

        <div className="canvas-wrap" aria-hidden="true">
          <Canvas
            shadows
            dpr={[1, 1.6]}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [-9, 9, 12], fov: 35 }}
          >
            <Suspense fallback={null}>
              <RouteWorld scrollProgress={scrollProgress} />
              <Environment preset="city" environmentIntensity={0.22} />
            </Suspense>
          </Canvas>
        </div>

        <StageNav
          activeStage={activeStage}
          scrollProgress={scrollProgress}
          setStage={setStage}
        />

        <div className="scroll-hint">
          <span className="desktop-scroll-copy">
            {activeStage === stages.length - 1 ? 'Keep exploring' : 'Follow the journey'}
          </span>
          <span className="mobile-scroll-copy">
            {activeStage === stages.length - 1 ? 'Keep scrolling' : 'Swipe to progress'}
          </span>
          <svg className="desktop-scroll-icon" viewBox="0 0 20 30" aria-hidden="true">
            <rect x="1" y="1" width="18" height="28" rx="9" />
            <circle cx="10" cy="8" r="2" />
          </svg>
          <svg className="mobile-scroll-icon" viewBox="0 0 18 24" aria-hidden="true">
            <path d="M9 2v17M4.5 14.5 9 19l4.5-4.5" />
          </svg>
        </div>

        <div className="hero-proof">
          <strong>15+</strong>
          <span>years in field-service software</span>
        </div>
      </div>
      <Loader
        containerStyles={{ background: '#dcdddb' }}
        innerStyles={{ width: '160px', height: '2px', background: '#b8bbb9' }}
        barStyles={{ background: '#555a5c', height: '2px' }}
        dataStyles={{ color: '#34383a', fontFamily: 'Arial, sans-serif', fontSize: '10px' }}
      />
    </section>
  )
}

function SectionIntro({ eyebrow, title, text, inverse = false }) {
  return (
    <div className={`section-intro ${inverse ? 'is-inverse' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p className="section-lede">{text}</p>}
    </div>
  )
}

function ModuleGrid({ limit }) {
  const displayedModules = limit ? modules.slice(0, limit) : modules
  return (
    <div className="module-grid">
      {displayedModules.map((module) => (
        <article className="module-card" key={module.number}>
          <span className="card-number">{module.number}</span>
          <h3>{module.title}</h3>
          <p>{module.text}</p>
          <ul aria-label={`${module.title} capabilities`}>
            {module.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

function IndustriesGrid() {
  return (
    <div className="industry-grid">
      {industries.map((industry) => (
        <article className="industry-card" key={industry.code}>
          <span>{industry.code}</span>
          <div>
            <h3>{industry.title}</h3>
            <p>{industry.text}</p>
          </div>
          <ArrowIcon />
        </article>
      ))}
    </div>
  )
}

function HomePage() {
  return (
    <>
      <HomeHero />
      <section className="manifesto ruled-section">
        <div className="manifesto-aside">
          <p className="eyebrow">One system. Your system.</p>
          <span>Built for linen and textile rental</span>
        </div>
        <div className="manifesto-copy">
          <h2>The route feels simple when everything behind it works.</h2>
          <p>
            M-LINX connects service, inventory, production, billing, and insight around the
            way your business actually runs. We make the hard things manageable—and the
            easy things nearly invisible.
          </p>
        </div>
      </section>

      <section className="principles dark-section">
        <SectionIntro
          eyebrow="Why MobileCom"
          title="Built to bend. Engineered to hold."
          text="A responsive platform and an experienced team give you room to operate now—and the foundation to grow on your terms."
          inverse
        />
        <div className="principle-list">
          {[
            ['01', 'Responsive by design', 'Give every role the right next action and the live context to respond when the day changes.'],
            ['02', 'Configured around you', 'Keep the workflows that make you distinct. Change the ones that hold your teams back.'],
            ['03', 'Robust where it matters', 'Depend on one connected operating record from customer contract to final invoice.'],
          ].map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-preview ruled-section">
        <SectionIntro
          eyebrow="The M-LINX platform"
          title="Every moving part, moving together."
          text="A modular route accounting system for the full textile rental service cycle—from customer setup and plant preparation to delivery, reconciliation, and decision support."
        />
        <ModuleGrid limit={4} />
        <a className="button-link" href={sitePath('/platform')}>
          Explore the platform <ArrowIcon />
        </a>
      </section>

      <section className="insight-section">
        <div className="insight-graphic" aria-hidden="true">
          <div className="signal-orbit signal-orbit-one" />
          <div className="signal-orbit signal-orbit-two" />
          <div className="signal-core">
            <span>LIVE</span>
            <strong>12:42</strong>
          </div>
          <span className="signal-label label-one">Route status</span>
          <span className="signal-label label-two">Inventory</span>
          <span className="signal-label label-three">Exceptions</span>
        </div>
        <div className="insight-copy">
          <p className="eyebrow">Information with a job to do</p>
          <h2>Empower the people closest to the decision.</h2>
          <p>
            Route representatives can see what changed. Dispatch can see what needs attention.
            Managers can see the operation as it unfolds. Leaders can see the patterns that
            shape what comes next.
          </p>
          <div className="insight-pair">
            <div>
              <strong>Right now</strong>
              <span>Live route, inventory, service, and exception visibility.</span>
            </div>
            <div>
              <strong>Over time</strong>
              <span>Consistent history for stronger operational and strategic decisions.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="industries-preview ruled-section">
        <SectionIntro
          eyebrow="Built for the work"
          title="One industry. Many ways to serve it."
          text="We focus on textile rental, then configure for the markets, customer commitments, and operating realities inside your business."
        />
        <IndustriesGrid />
        <a className="button-link" href={sitePath('/industries')}>
          See industry solutions <ArrowIcon />
        </a>
      </section>

      <section className="testimonial">
        <p className="eyebrow">From the field</p>
        <blockquote>
          “Implementing Route Manager solves every one of our order entry and invoicing
          issues. MobileCom’s technology significantly enhances our operational processes.”
        </blockquote>
        <cite>American Textile</cite>
      </section>

      <CtaBand />
    </>
  )
}

function PageHero({ eyebrow, title, text, accent }) {
  return (
    <section className="page-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <div className={`page-hero-mark mark-${accent}`} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}

function PlatformPage() {
  return (
    <>
      <PageHero
        eyebrow="The M-LINX platform"
        title="A route accounting system that fits the route you run."
        text="Connect customer, route, inventory, production, and financial workflows in a modular platform configured around your textile rental operation."
        accent="coral"
      />
      <section className="page-intro ruled-section">
        <p className="eyebrow">Capability without clutter</p>
        <h2>Start with what matters. Add what comes next.</h2>
        <p>
          M-LINX is designed as a connected suite, not a rigid bundle. We work with your
          team to choose, configure, and evolve the capabilities that create the clearest
          path from service activity to business result.
        </p>
      </section>
      <section className="all-modules ruled-section">
        <ModuleGrid />
      </section>
      <section className="workflow-section dark-section">
        <SectionIntro
          eyebrow="A connected service cycle"
          title="From promise to proof."
          text="Each step informs the next, creating one continuous view of what was expected, what happened, and what should happen now."
          inverse
        />
        <div className="workflow-line">
          {['Contract', 'Prepare', 'Load', 'Deliver', 'Reconcile', 'Learn'].map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="integration-band ruled-section">
        <div>
          <p className="eyebrow">Works with your ecosystem</p>
          <h2>Connected where it counts.</h2>
        </div>
        <p>
          Integrate M-LINX with the financial, HR, supply-chain, payment, and time-tracking
          systems your business depends on. The goal is a clean flow of information—not
          another isolated source of truth.
        </p>
      </section>
      <CtaBand />
    </>
  )
}

function IndustriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Linen & textile rental"
        title="Made for your industry. Configured for your market."
        text="Specialized route accounting for operations serving healthcare, hospitality, food service, and industrial customers."
        accent="blue"
      />
      <section className="industries-detail ruled-section">
        <SectionIntro
          eyebrow="Markets we support"
          title="Different service models. One adaptable core."
          text="The details change by market, but the need for accurate service, controlled inventory, responsive teams, and trustworthy information does not."
        />
        <IndustriesGrid />
      </section>
      <section className="needs-section dark-section">
        <SectionIntro
          eyebrow="Designed for the details"
          title="The exceptions are part of the system."
          text="Your operation is defined by more than a standard delivery. M-LINX makes room for the real-world variables your teams manage every day."
          inverse
        />
        <div className="needs-grid">
          {[
            'Customer-specific contracts',
            'Item, weight & flat-rate pricing',
            'Standing orders & adjustments',
            'Clean and soil reconciliation',
            'Wearer & garment tracking',
            'Mats, carts & bulk inventory',
            'Multi-plant operations',
            'Service notes & signatures',
          ].map((need) => (
            <div key={need}>
              <span />
              {need}
            </div>
          ))}
        </div>
      </section>
      <section className="promise-section ruled-section">
        <span className="promise-number">01</span>
        <div>
          <p className="eyebrow">One operating promise</p>
          <h2>Give every customer the service you designed for them.</h2>
        </div>
        <p>
          Bring customer agreements, route execution, and operating visibility into one
          system so your teams can deliver with confidence—even when requirements differ
          from one stop to the next.
        </p>
      </section>
      <CtaBand />
    </>
  )
}

function CompanyPage() {
  return (
    <>
      <PageHero
        eyebrow="About MobileCom"
        title="Field-service experience. Textile-rental focus."
        text="For more than 15 years, we have worked where operations, mobile teams, customers, and business systems meet."
        accent="gold"
      />
      <section className="company-story ruled-section">
        <div>
          <p className="eyebrow">Our point of view</p>
          <h2>Software should respect how work gets done.</h2>
        </div>
        <div className="story-copy">
          <p>
            No two textile rental operations are identical. Customer commitments vary.
            Plants run differently. Route teams build their own hard-earned rhythm. Growth
            introduces new needs without erasing the old ones.
          </p>
          <p>
            That is why MobileCom starts with your operation. We combine a robust, modular
            platform with practical implementation experience to create a system that is
            distinctly yours—and ready to keep changing with you.
          </p>
        </div>
      </section>
      <section className="process-section">
        <SectionIntro
          eyebrow="How we work"
          title="A partnership built for change."
          text="The best system is not simply installed. It is understood, shaped, adopted, and continuously improved."
        />
        <div className="process-list">
          {processSteps.map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="values-section dark-section">
        <div className="value-statement">
          <p className="eyebrow">What guides us</p>
          <h2>Clear enough for today. Capable enough for tomorrow.</h2>
        </div>
        <div className="value-list">
          <div><strong>Listen closely</strong><span>The useful answer begins with the right operational question.</span></div>
          <div><strong>Solve practically</strong><span>Technology earns its place by making work more reliable and understandable.</span></div>
          <div><strong>Build durably</strong><span>Your system should stay valuable as teams, markets, and ambitions evolve.</span></div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

function ContactPage() {
  const onSubmit = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject = encodeURIComponent(`M-LINX conversation — ${data.get('company')}`)
    const body = encodeURIComponent(
      `Name: ${data.get('name')}\nCompany: ${data.get('company')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`,
    )
    window.location.href = `mailto:MCCMarketing@mobilecom.com?subject=${subject}&body=${body}`
  }

  return (
    <>
      <PageHero
        eyebrow="Start a conversation"
        title="Tell us how your operation needs to move."
        text="Bring us the workflow that is too manual, the question you cannot answer quickly, or the next stage of growth you are planning."
        accent="coral"
      />
      <section className="contact-section ruled-section">
        <div className="contact-details">
          <p className="eyebrow">Talk with MobileCom</p>
          <h2>Let’s make the complex feel clear.</h2>
          <p>
            Share a little about your operation. We will start with a focused conversation
            about your goals, your current systems, and where M-LINX can create the most value.
          </p>
          <dl>
            <div><dt>Call</dt><dd><a href="tel:+18003928651">1 800 392 8651</a></dd></div>
            <div><dt>Email</dt><dd><a href="mailto:MCCMarketing@mobilecom.com">MCCMarketing@mobilecom.com</a></dd></div>
            <div><dt>Location</dt><dd>Mississauga, Ontario, Canada</dd></div>
          </dl>
        </div>
        <form className="contact-form" onSubmit={onSubmit}>
          <label>
            <span>Your name</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            <span>Company</span>
            <input name="company" type="text" autoComplete="organization" required />
          </label>
          <label>
            <span>Work email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>What would you like to improve?</span>
            <textarea name="message" rows="5" required />
          </label>
          <button type="submit">
            Compose your message <ArrowIcon />
          </button>
          <small>This button opens a prepared email in your default mail application.</small>
        </form>
      </section>
    </>
  )
}

function CtaBand() {
  return (
    <section className="cta-band">
      <p className="eyebrow">Built for where you are going</p>
      <h2>What should your route system make possible?</h2>
      <a href={sitePath('/contact')}>
        Let’s talk <ArrowIcon />
      </a>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <a className="brand footer-brand" href={sitePath()} aria-label="MobileCom home">
          <LogoMark />
          <span>MobileCom</span>
        </a>
        <p>Route accounting systems for linen and textile rental.</p>
        <div className="footer-contact">
          <a href="tel:+18003928651">1 800 392 8651</a>
          <a href="mailto:MCCMarketing@mobilecom.com">MCCMarketing@mobilecom.com</a>
        </div>
      </div>
      <div className="footer-links">
        <nav aria-label="Footer navigation">
          <a href={sitePath('/platform')}>Platform</a>
          <a href={sitePath('/industries')}>Industries</a>
          <a href={sitePath('/company')}>Company</a>
          <a href={sitePath('/contact')}>Contact</a>
        </nav>
        <address>PO Box 53018 RPO Erin Mills, Mississauga, ON L5M 5H7, Canada</address>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Mobile Computing Corp. Inc.</span>
        <span>M-LINX™ is a trademark of Mobile Computing Corp. Inc.</span>
      </div>
    </footer>
  )
}

function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Route not found</p>
      <h1>This stop isn’t on the manifest.</h1>
      <a className="button-link" href={sitePath()}>Return home <ArrowIcon /></a>
    </section>
  )
}

const pages = {
  '/': { title: 'MobileCom — Route accounting built around you', component: HomePage },
  '/platform': { title: 'M-LINX Platform — MobileCom', component: PlatformPage },
  '/industries': { title: 'Textile Rental Industries — MobileCom', component: IndustriesPage },
  '/company': { title: 'About MobileCom', component: CompanyPage },
  '/contact': { title: 'Contact MobileCom', component: ContactPage },
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  const currentPath =
    basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
      ? pathname.slice(basePath.length) || '/'
      : pathname
  const page = pages[currentPath]
  const Page = page?.component || NotFoundPage
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.title = page?.title || 'Page not found — MobileCom'
  }, [page])

  useEffect(() => {
    document.body.classList.toggle('menu-is-open', menuOpen)
    return () => document.body.classList.remove('menu-is-open')
  }, [menuOpen])

  return (
    <div className={`site ${currentPath === '/' ? 'is-home' : 'is-inner'}`}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} currentPath={currentPath} />
      <main id="main-content">
        <Page />
      </main>
      <Footer />
    </div>
  )
}

export default App
