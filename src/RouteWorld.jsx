import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const MOBILE_BREAKPOINT = 800
const DESKTOP_VERTICAL_FOV = 35
const MOBILE_HORIZONTAL_FOV = 54

const palette = {
  ink: '#13282b',
  coral: '#f2563d',
  blue: '#3d88b8',
  gold: '#e9aa3c',
  routeOut: '#008a50',
  routeOutGlow: '#28d486',
  routeBack: '#b93229',
  routeBackGlow: '#ff7463',
  cream: '#f4f0e4',
  concrete: '#d8d9cc',
  window: '#24444a',
  grass: '#aebc8a',
  roof: '#75877f',
}

const warehouseSites = [
  { position: [-17.4, -9.2], returnEdge: 'top' },
  { position: [-14.6, -1.7], returnEdge: 'top' },
  { position: [-18.2, 8.6], returnEdge: 'bottom' },
]
const customerSites = [
  [
    { type: 'hospital', position: [-7.7, -7.5] },
    { type: 'restaurant', position: [2.2, -10.1] },
    { type: 'hotel', position: [13.1, -7.1] },
  ],
  [
    { type: 'hospital', position: [-4.5, 1.5] },
    { type: 'restaurant', position: [5.3, -2.7] },
    { type: 'hotel', position: [10.4, 3.1] },
  ],
  [
    { type: 'hospital', position: [-8.3, 10.2] },
    { type: 'restaurant', position: [1.1, 6.2] },
    { type: 'hotel', position: [14.2, 9.6] },
  ],
]
const OUTBOUND_END = 0.48
const RETURN_START = 0.56
const RETURN_END = 0.96

const routes = warehouseSites.flatMap((warehouse, warehouseIndex) =>
  customerSites[warehouseIndex].map((customer, customerIndex) => {
    const [warehouseX, warehouseZ] = warehouse.position
    const [destinationX, destinationZ] = customer.position
    const laneOffset = (customerIndex - 1) * 0.42
    const start = [warehouseX, warehouseZ + laneOffset]
    const deltaX = destinationX - warehouseX
    const deltaZ = destinationZ - warehouseZ
    const arc = [0.46, -0.58, 0.72][customerIndex] * (warehouseIndex === 1 ? -1 : 1)
    const boundaryZ =
      warehouse.returnEdge === 'top'
        ? -11.8 - warehouseIndex * 0.7 - customerIndex * 0.32
        : 11.85 + customerIndex * 0.35
    const rightEdge = 20 + customerIndex * 0.32
    const leftEdge = warehouseX - 2.4 - customerIndex * 0.28

    return {
      id: `${warehouseIndex}-${customer.type}`,
      warehouseIndex,
      customerIndex,
      outbound: [
        start,
        [warehouseX + deltaX * 0.3, warehouseZ + deltaZ * 0.3 + arc],
        [warehouseX + deltaX * 0.7, warehouseZ + deltaZ * 0.7 + arc * 0.55],
        customer.position,
      ],
      returning: [
        customer.position,
        [
          destinationX + Math.min(3.2, (rightEdge - destinationX) * 0.3),
          destinationZ + (boundaryZ - destinationZ) * 0.1,
        ],
        [rightEdge - 1.8, boundaryZ],
        [leftEdge + 1.8, boundaryZ],
        [leftEdge, warehouseZ + (boundaryZ - warehouseZ) * 0.38],
        start,
      ],
      outboundProfile: (warehouseIndex * 2 + customerIndex) % 5,
      returnProfile: (warehouseIndex + customerIndex * 2 + 2) % 5,
    }
  }),
)

const speedProfiles = [
  (t) => t * t * (3 - 2 * t),
  (t) => 0.5 - Math.cos(Math.PI * t) / 2,
  (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  (t) => (t < 0.45 ? 0.18 * (t / 0.45) : 0.18 + 0.82 * Math.pow((t - 0.45) / 0.55, 0.64)),
  (t) => (t < 0.6 ? 0.7 * Math.pow(t / 0.6, 0.68) : 0.7 + 0.3 * Math.pow((t - 0.6) / 0.4, 2)),
]

const toCurve = (points) =>
  new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0.98, z)),
    false,
    'centripetal',
  )

const routeCurves = routes.map((route) => ({
  outbound: toCurve(route.outbound),
  returning: toCurve(route.returning),
}))

function phaseProgress(scrollProgress, start, end, profile) {
  const linear = THREE.MathUtils.clamp((scrollProgress - start) / (end - start), 0, 1)
  return speedProfiles[profile](linear)
}

function CameraRig({ scrollProgress }) {
  const { camera, pointer, size } = useThree()
  const target = useRef(new THREE.Vector3(-16, 0.5, 0))
  const focus = useRef(new THREE.Vector3(-16, 0.9, 0))

  useEffect(() => {
    if (!camera.isPerspectiveCamera) return

    const aspect = size.width / Math.max(size.height, 1)
    const horizontalFov = THREE.MathUtils.degToRad(MOBILE_HORIZONTAL_FOV)
    const mobileVerticalFov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(horizontalFov / 2) / aspect),
    )
    const nextFov =
      size.width <= MOBILE_BREAKPOINT
        ? THREE.MathUtils.clamp(mobileVerticalFov, DESKTOP_VERTICAL_FOV, 100)
        : DESKTOP_VERTICAL_FOV

    camera.fov = nextFov
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useFrame((_, delta) => {
    const desiredFocus = new THREE.Vector3()
    routes.forEach((route, index) => {
      let point
      if (scrollProgress < RETURN_START) {
        const progress = phaseProgress(scrollProgress, 0, OUTBOUND_END, route.outboundProfile)
        point = routeCurves[index].outbound.getPointAt(progress)
      } else {
        const progress = phaseProgress(scrollProgress, RETURN_START, RETURN_END, route.returnProfile)
        point = routeCurves[index].returning.getPointAt(progress)
      }
      desiredFocus.add(point)
    })
    desiredFocus.divideScalar(routes.length)

    focus.current.lerp(desiredFocus, 1 - Math.exp(-delta * 3.6))
    const mobile = size.width <= MOBILE_BREAKPOINT
    const orbit = Math.sin(scrollProgress * Math.PI * 1.25)
    const desiredPosition = new THREE.Vector3(
      focus.current.x + (mobile ? 1.5 : 3.5) + orbit * 2.4,
      mobile ? 30 : 25 + Math.sin(scrollProgress * Math.PI) * 2.5,
      focus.current.z + (mobile ? 33 : 29) - orbit * 2.2,
    )
    desiredPosition.x += pointer.x * 0.42
    desiredPosition.y += pointer.y * 0.2
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPosition.x, 3.2, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPosition.y, 3.2, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPosition.z, 3.2, delta)

    const desiredTarget = new THREE.Vector3(
      focus.current.x - (mobile ? 0 : 2.8),
      0.65,
      focus.current.z,
    )
    target.current.x = THREE.MathUtils.damp(target.current.x, desiredTarget.x, 3.2, delta)
    target.current.y = THREE.MathUtils.damp(target.current.y, desiredTarget.y, 3.2, delta)
    target.current.z = THREE.MathUtils.damp(target.current.z, desiredTarget.z, 3.2, delta)
    camera.lookAt(target.current)
  })

  return null
}

function RouteLine({ route, routeIndex, scrollProgress }) {
  const outboundMarker = useRef()
  const returnMarker = useRef()
  const geometry = useMemo(() => {
    const outboundCurve = routeCurves[routeIndex].outbound
    const returnCurve = routeCurves[routeIndex].returning
    const buildPair = (curve, segments) => {
      const line = new THREE.TubeGeometry(curve, segments, 0.095, 8, false)
      const glow = new THREE.TubeGeometry(curve, segments, 0.15, 8, false)
      line.setDrawRange(0, 0)
      glow.setDrawRange(0, 0)
      return { curve, line, glow }
    }
    return {
      outbound: buildPair(outboundCurve, 180),
      returning: buildPair(returnCurve, 320),
    }
  }, [routeIndex])

  useFrame(() => {
    const outboundProgress = phaseProgress(
      scrollProgress,
      0,
      OUTBOUND_END,
      route.outboundProfile,
    )
    const returnProgress = phaseProgress(
      scrollProgress,
      RETURN_START,
      RETURN_END,
      route.returnProfile,
    )
    geometry.outbound.line.setDrawRange(
      0,
      Math.floor(geometry.outbound.line.index.count * outboundProgress),
    )
    geometry.outbound.glow.setDrawRange(
      0,
      Math.floor(geometry.outbound.glow.index.count * outboundProgress),
    )
    geometry.returning.line.setDrawRange(
      0,
      Math.floor(geometry.returning.line.index.count * returnProgress),
    )
    geometry.returning.glow.setDrawRange(
      0,
      Math.floor(geometry.returning.glow.index.count * returnProgress),
    )

    const outboundPoint = geometry.outbound.curve.getPointAt(outboundProgress)
    const returnPoint = geometry.returning.curve.getPointAt(returnProgress)
    outboundMarker.current.position.copy(outboundPoint)
    returnMarker.current.position.copy(returnPoint)
    outboundMarker.current.visible = scrollProgress > 0.01 && scrollProgress < RETURN_START
    returnMarker.current.visible = scrollProgress >= RETURN_START && scrollProgress < RETURN_END
  })

  return (
    <>
      <mesh geometry={geometry.outbound.glow} frustumCulled={false}>
        <meshBasicMaterial
          color={palette.routeOutGlow}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometry.outbound.line} frustumCulled={false}>
        <meshBasicMaterial
          color={palette.routeOut}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={geometry.returning.glow} frustumCulled={false}>
        <meshBasicMaterial
          color={palette.routeBackGlow}
          transparent
          opacity={0.045}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh geometry={geometry.returning.line} frustumCulled={false}>
        <meshBasicMaterial
          color={palette.routeBack}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={outboundMarker} visible={false}>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshBasicMaterial color="#baffd5" toneMapped={false} />
      </mesh>
      <mesh ref={returnMarker} visible={false}>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshBasicMaterial color="#ffb2a8" toneMapped={false} />
      </mesh>
    </>
  )
}

function RoofVent({ position }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.3, 12]} />
        <meshStandardMaterial color={palette.ink} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 12]} />
        <meshStandardMaterial color={palette.roof} roughness={0.8} />
      </mesh>
    </group>
  )
}

function Warehouse({ position, index }) {
  const face = 1

  return (
    <group position={position}>
      <RoundedBox args={[3.1, 2.2, 5]} radius={0.16} smoothness={3} position={[0, 1.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.cream} roughness={0.82} />
      </RoundedBox>
      {[-1.75, -0.58, 0.58, 1.75].map((z, index) => (
        <mesh
          key={z}
          position={[0, 2.3, z]}
          rotation={[index % 2 ? -0.11 : 0.11, 0, 0]}
          castShadow
        >
          <boxGeometry args={[3.18, 0.12, 1.18]} />
          <meshStandardMaterial color={index % 2 ? '#8d9c91' : palette.roof} roughness={0.7} />
        </mesh>
      ))}
      {[-0.4, 0, 0.4].map((z) => (
        <group key={z} position={[face * 1.556, 0.49, z]}>
          <mesh rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[0.31, 0.78]} />
            <meshStandardMaterial color={palette.window} roughness={0.55} />
          </mesh>
          {[0.25, 0.5].map((y) => (
            <mesh key={y} position={[face * 0.008, y - 0.39, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.28, 0.018]} />
              <meshBasicMaterial color="#779095" />
            </mesh>
          ))}
        </group>
      ))}
      <RoundedBox
        args={[0.12, 0.55, 2.15]}
        radius={0.05}
        smoothness={2}
        position={[face * 1.61, 1.58, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={palette.ink}
          emissive={index === 1 ? palette.routeOut : '#000000'}
          emissiveIntensity={index === 1 ? 0.08 : 0}
        />
      </RoundedBox>
      <RoofVent position={[-0.7, 2.45, -1.5]} />
      <RoofVent position={[0.65, 2.45, 1.45]} />
      {[-1, 1].map((z) => (
        <group key={z} position={[face * 1.85, 0.18, z]}>
          <RoundedBox args={[0.52, 0.36, 0.62]} radius={0.08} smoothness={2} castShadow>
            <meshStandardMaterial color={z > 0 ? palette.blue : palette.gold} roughness={0.8} />
          </RoundedBox>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.38, 0.04, 0.5]} />
            <meshStandardMaterial color={palette.cream} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function TunnelShell({ color = palette.cream, height = 2.35 }) {
  return (
    <group>
      <RoundedBox args={[3.1, 1.15, 0.7]} radius={0.12} smoothness={3} position={[0, 0.575, -0.76]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[3.1, 1.15, 0.7]} radius={0.12} smoothness={3} position={[0, 0.575, 0.76]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.8} />
      </RoundedBox>
      <RoundedBox
        args={[3.1, height - 1.15, 2.22]}
        radius={0.14}
        smoothness={3}
        position={[0, 1.15 + (height - 1.15) / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.78} />
      </RoundedBox>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[3.02, 0.08, 0.72]} />
        <meshStandardMaterial color={palette.ink} roughness={0.65} />
      </mesh>
    </group>
  )
}

function Window({ position, color = palette.window, size = [0.4, 0.42] }) {
  return (
    <group position={position}>
      <RoundedBox args={[size[0], size[1], 0.055]} radius={0.04} smoothness={2} castShadow>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, 0, 0.032]}>
        <boxGeometry args={[0.025, size[1] * 0.84, 0.01]} />
        <meshBasicMaterial color="#b9d3d1" />
      </mesh>
    </group>
  )
}

function Hospital({ position }) {
  return (
    <group position={position}>
      <TunnelShell color="#e4ece8" height={2.55} />
      {[-1.05, -0.52, 0.52, 1.05].map((x) => (
        <Window key={x} position={[x, 1.78, 1.126]} size={[0.34, 0.38]} />
      ))}
      <group position={[0, 2.64, 0.68]}>
        <RoundedBox args={[0.88, 0.88, 0.18]} radius={0.08} smoothness={2} castShadow>
          <meshStandardMaterial color={palette.cream} />
        </RoundedBox>
        <mesh position={[0, 0, 0.105]}>
          <boxGeometry args={[0.17, 0.58, 0.05]} />
          <meshStandardMaterial color={palette.coral} />
        </mesh>
        <mesh position={[0, 0, 0.11]}>
          <boxGeometry args={[0.58, 0.17, 0.05]} />
          <meshStandardMaterial color={palette.coral} />
        </mesh>
      </group>
      <mesh position={[-0.95, 2.68, -0.46]} castShadow>
        <cylinderGeometry args={[0.28, 0.31, 0.25, 20]} />
        <meshStandardMaterial color={palette.roof} />
      </mesh>
      <mesh position={[-0.95, 2.82, -0.46]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.18, 20]} />
        <meshBasicMaterial color={palette.cream} />
      </mesh>
    </group>
  )
}

function Restaurant({ position }) {
  return (
    <group position={position}>
      <TunnelShell color="#f3dfbd" height={2.15} />
      <RoundedBox args={[2.25, 0.45, 0.18]} radius={0.07} smoothness={2} position={[0, 1.62, 1.19]} castShadow>
        <meshStandardMaterial color={palette.coral} />
      </RoundedBox>
      {[-0.86, -0.43, 0, 0.43, 0.86].map((x, index) => (
        <mesh key={x} position={[x, 1.42, 1.31]} rotation={[0.18, 0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.38, 0.07]} />
          <meshStandardMaterial color={index % 2 ? palette.cream : palette.coral} />
        </mesh>
      ))}
      {[-0.9, 0.9].map((x) => (
        <Window key={x} position={[x, 0.65, 1.122]} color="#385b61" size={[0.47, 0.55]} />
      ))}
      <group position={[0.82, 2.55, -0.35]}>
        <mesh castShadow>
          <boxGeometry args={[0.38, 1, 0.38]} />
          <meshStandardMaterial color={palette.ink} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.52, 0.12, 0.52]} />
          <meshStandardMaterial color={palette.roof} />
        </mesh>
      </group>
      <group position={[-1.9, 0, 1.42]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.12, 0.7, 18]} />
          <meshStandardMaterial color={palette.gold} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.55, 10]} />
          <meshStandardMaterial color={palette.ink} />
        </mesh>
        <mesh position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.12, 18]} />
          <meshStandardMaterial color={palette.cream} />
        </mesh>
      </group>
    </group>
  )
}

function Hotel({ position }) {
  const windowRows = [1.58, 2.2, 2.82, 3.44]
  return (
    <group position={position}>
      <TunnelShell color="#ddd5ca" height={4.05} />
      {windowRows.flatMap((y) =>
        [-1.08, -0.54, 0, 0.54, 1.08].map((x) => (
          <Window key={`${x}-${y}`} position={[x, y, 1.126]} size={[0.3, 0.33]} />
        )),
      )}
      <RoundedBox args={[0.74, 0.74, 0.16]} radius={0.08} smoothness={2} position={[0, 4.14, 0.72]} castShadow>
        <meshStandardMaterial color={palette.blue} />
      </RoundedBox>
      <mesh position={[0, 4.14, 0.82]}>
        <boxGeometry args={[0.13, 0.46, 0.04]} />
        <meshBasicMaterial color={palette.cream} />
      </mesh>
      <mesh position={[0, 4.14, 0.825]}>
        <boxGeometry args={[0.4, 0.12, 0.04]} />
        <meshBasicMaterial color={palette.cream} />
      </mesh>
      {[-0.72, 0.72].map((x) => (
        <RoofVent key={x} position={[x, 4.18, -0.55]} />
      ))}
    </group>
  )
}

function SmileBadge({ position, color, delay, activeStage, size = 1 }) {
  const group = useRef()
  const smileCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, -0.05, 0.08),
        new THREE.Vector3(0, -0.24, 0.08),
        new THREE.Vector3(0.3, -0.05, 0.08),
      ]),
    [],
  )
  const smileGeometry = useMemo(() => new THREE.TubeGeometry(smileCurve, 18, 0.045, 8, false), [smileCurve])

  useFrame((state, delta) => {
    const visible = activeStage === 3
    const elapsed = Math.max(0, state.clock.elapsedTime - delay)
    const targetScale = visible ? size : 0
    const nextScale = THREE.MathUtils.damp(group.current.scale.x, targetScale, visible ? 4 : 6, delta)
    group.current.scale.setScalar(nextScale)
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      visible ? position[1] + 1.15 + Math.sin(elapsed * 1.6) * 0.12 : position[1] - 0.25,
      3.5,
      delta,
    )
  })

  return (
    <group ref={group} position={[position[0], position[1] - 0.25, position[2]]} scale={0}>
      <Float speed={2} floatIntensity={0.12} rotationIntensity={0.08}>
        <Billboard>
          <mesh castShadow>
            <circleGeometry args={[0.66, 40]} />
            <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
          {[-0.22, 0.22].map((x) => (
            <mesh key={x} position={[x, 0.16, 0.06]}>
              <circleGeometry args={[0.07, 18]} />
              <meshBasicMaterial color={palette.ink} />
            </mesh>
          ))}
          <mesh geometry={smileGeometry}>
            <meshBasicMaterial color={palette.ink} />
          </mesh>
        </Billboard>
      </Float>
    </group>
  )
}

function Shrub({ position, color = palette.grass, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[-0.18, 0.2, 0]} castShadow>
        <dodecahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.16, 0.03]} castShadow>
        <dodecahedronGeometry args={[0.23, 0]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  )
}

function CityBlock({ position, height = 1.5, color = '#d7d8cb' }) {
  return (
    <group position={position}>
      <RoundedBox
        args={[2.5, height, 2.25]}
        radius={0.12}
        smoothness={3}
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} roughness={0.88} />
      </RoundedBox>
      {[-0.65, 0, 0.65].map((x) => (
        <Window
          key={x}
          position={[x, Math.min(height - 0.45, 0.72), 1.14]}
          color="#46646a"
          size={[0.32, 0.36]}
        />
      ))}
      <mesh position={[0.62, height + 0.1, -0.32]} castShadow>
        <boxGeometry args={[0.55, 0.2, 0.55]} />
        <meshStandardMaterial color={palette.roof} roughness={0.8} />
      </mesh>
    </group>
  )
}

function WorldDetails() {
  const shrubs = [
    [-13.1, -12.2, 0.9],
    [-5.1, -12.4, 1.1],
    [5.8, -12.1, 0.8],
    [16.7, -12, 1.05],
    [-12.8, 12.4, 1.1],
    [-3.3, 12.1, 0.85],
    [7.2, 12.3, 1.05],
    [17.3, 12.15, 0.9],
  ]
  const blocks = [
    [-10.5, -3.8, 1.3, '#d8d9cc'],
    [-11.2, 4.35, 1.8, '#d0d7d0'],
    [-0.9, -4.8, 1.7, '#ddd5ca'],
    [-0.4, 1.8, 1.25, '#d8d9cc'],
    [7.3, -6.5, 1.35, '#d0d7d0'],
    [7.1, 7.1, 1.85, '#ddd5ca'],
    [16.8, -1.1, 1.5, '#d8d9cc'],
  ]
  const lampPositions = [
    [-12.4, -5.7],
    [-9.5, 6.5],
    [-2.5, -7.2],
    [1.8, 3.4],
    [7.5, -4.4],
    [9.1, 5.5],
    [15.8, -5.2],
    [17.2, 6.4],
  ]
  const avenueRows = [-9.1, -1.35, 8.4]

  return (
    <>
      {avenueRows.map((z, index) => (
        <mesh
          key={`road-${z}`}
          position={[0, 0.28, z]}
          rotation={[0, index === 1 ? -0.025 : index === 2 ? 0.018 : 0, 0]}
          receiveShadow
        >
          <boxGeometry args={[44.5, 0.055, 2.7]} />
          <meshStandardMaterial color="#aeb5aa" roughness={0.98} />
        </mesh>
      ))}
      {[-10.2, -1.4, 8.1, 17].map((x) => (
        <mesh key={`cross-${x}`} position={[x, 0.285, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.06, 27]} />
          <meshStandardMaterial color="#aeb5aa" roughness={0.98} />
        </mesh>
      ))}
      {avenueRows.flatMap((z) =>
        [-10.2, -1.4, 8.1, 17].map((x) => (
          <mesh key={`crosswalk-${x}-${z}`} position={[x, 0.32, z]}>
            <boxGeometry args={[0.08, 0.02, 1.6]} />
            <meshBasicMaterial color="#d9dcd2" transparent opacity={0.72} />
          </mesh>
        )),
      )}
      {blocks.map(([x, z, height, color]) => (
        <CityBlock key={`${x}-${z}`} position={[x, 0.31, z]} height={height} color={color} />
      ))}
      {shrubs.map(([x, z, scale]) => (
        <Shrub key={`${x}-${z}`} position={[x, 0.42, z]} scale={scale} />
      ))}
      {lampPositions.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0.3, z]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.075, 1.3, 8]} />
            <meshStandardMaterial color={palette.ink} />
          </mesh>
          <mesh position={[0, 1.32, 0]}>
            <sphereGeometry args={[0.12, 14, 14]} />
            <meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={0.45} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function RouteWorld({ activeStage, scrollProgress }) {
  return (
    <>
      <color attach="background" args={['#e8eadc']} />
      <fog attach="fog" args={['#e8eadc', 42, 72]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#9a9a82', 0.9]} />
      <directionalLight
        castShadow
        position={[-6, 14, 9]}
        intensity={1.65}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={19}
        shadow-camera-bottom={-19}
        shadow-bias={-0.0004}
      />
      <CameraRig scrollProgress={scrollProgress} />

      <group position={[0, -0.18, 0]}>
        <RoundedBox args={[46, 0.42, 29]} radius={0.55} smoothness={5} position={[0, 0, 0]} receiveShadow>
          <meshStandardMaterial color="#c2c8ba" roughness={0.94} />
        </RoundedBox>
        <RoundedBox args={[45.3, 0.08, 28.3]} radius={0.45} smoothness={4} position={[0, 0.24, 0]} receiveShadow>
          <meshStandardMaterial color="#b9c1b2" roughness={0.92} />
        </RoundedBox>
        <WorldDetails />
        {routes.map((route, routeIndex) => (
          <RouteLine
            key={route.id}
            route={route}
            routeIndex={routeIndex}
            scrollProgress={scrollProgress}
          />
        ))}
        {warehouseSites.map((warehouse, index) => (
          <Warehouse
            key={`${warehouse.position[0]}-${warehouse.position[1]}`}
            position={[warehouse.position[0], 0.31, warehouse.position[1]]}
            index={index}
          />
        ))}
        {customerSites.flatMap((sites) =>
          sites.map((customer) => {
            const Component =
              customer.type === 'hospital'
                ? Hospital
                : customer.type === 'restaurant'
                  ? Restaurant
                  : Hotel
            return (
              <Component
                key={`${customer.type}-${customer.position[0]}-${customer.position[1]}`}
                position={[customer.position[0], 0.31, customer.position[1]]}
              />
            )
          }),
        )}
        {customerSites.flatMap((sites, rowIndex) =>
          sites.map((customer, customerIndex) => {
            const badgeY =
              customer.type === 'hospital' ? 3.05 : customer.type === 'restaurant' ? 2.75 : 4.55
            const badgeColor =
              customer.type === 'hospital'
                ? palette.blue
                : customer.type === 'restaurant'
                  ? palette.coral
                  : palette.gold
            return (
              <SmileBadge
                key={`badge-${customer.type}-${customer.position[0]}-${customer.position[1]}`}
                position={[customer.position[0], badgeY, customer.position[1]]}
                color={badgeColor}
                delay={(rowIndex * 3 + customerIndex) * 0.06}
                activeStage={activeStage}
                size={0.58}
              />
            )
          }),
        )}
      </group>
    </>
  )
}
