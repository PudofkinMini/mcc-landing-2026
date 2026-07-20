import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const palette = {
  ink: '#13282b',
  coral: '#f2563d',
  blue: '#3d88b8',
  gold: '#e9aa3c',
  cream: '#f4f0e4',
  concrete: '#d8d9cc',
  window: '#24444a',
  grass: '#aebc8a',
  roof: '#75877f',
}

const routes = [
  {
    color: palette.blue,
    points: [
      [-11, -1],
      [-8.4, -1.15],
      [-5.5, -3.25],
      [-2.2, -4],
      [0, -4],
      [2.2, -4],
      [5.5, -3.25],
      [8.4, -1.15],
      [11, -1],
    ],
  },
  {
    color: palette.coral,
    points: [
      [-11, 0],
      [-8.2, 0],
      [-4.6, 0],
      [0, 0],
      [4.6, 0],
      [8.2, 0],
      [11, 0],
    ],
  },
  {
    color: palette.gold,
    points: [
      [-11, 1],
      [-8.4, 1.15],
      [-5.5, 3.25],
      [-2.2, 4],
      [0, 4],
      [2.2, 4],
      [5.5, 3.25],
      [8.4, 1.15],
      [11, 1],
    ],
  },
]

function CameraRig({ scrollProgress }) {
  const { camera, pointer, size } = useThree()
  const target = useRef(new THREE.Vector3(-7, 0, 0))

  const desktopViews = [
    { position: [-3.8, 13.2, 18.8], target: [-6.5, 0.1, 0] },
    { position: [-12.2, 14.8, 18.2], target: [0, 0.3, 0] },
    { position: [3.8, 13.2, 18.8], target: [6.5, 0.1, 0] },
    { position: [-12.5, 18.8, 24.5], target: [0, 0.8, 0] },
  ]
  const mobileViews = [
    { position: [-7.8, 16.5, 23.8], target: [-6.4, 0, 0] },
    { position: [-0.2, 20, 28], target: [0, 0.2, 0] },
    { position: [7.8, 16.5, 23.8], target: [6.4, 0, 0] },
    { position: [0.5, 23, 33], target: [0, 0.6, 0] },
  ]

  useFrame((_, delta) => {
    const views = size.width < 720 ? mobileViews : desktopViews
    const viewProgress = scrollProgress * (views.length - 1)
    const startIndex = Math.min(views.length - 2, Math.floor(viewProgress))
    const viewMix = viewProgress - startIndex
    const startView = views[startIndex]
    const endView = views[startIndex + 1]
    const desiredPosition = new THREE.Vector3(...startView.position).lerp(
      new THREE.Vector3(...endView.position),
      viewMix,
    )
    desiredPosition.x += pointer.x * 0.35
    desiredPosition.y += pointer.y * 0.15
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPosition.x, 3.2, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPosition.y, 3.2, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPosition.z, 3.2, delta)

    const desiredTarget = new THREE.Vector3(...startView.target).lerp(
      new THREE.Vector3(...endView.target),
      viewMix,
    )
    target.current.x = THREE.MathUtils.damp(target.current.x, desiredTarget.x, 3.2, delta)
    target.current.y = THREE.MathUtils.damp(target.current.y, desiredTarget.y, 3.2, delta)
    target.current.z = THREE.MathUtils.damp(target.current.z, desiredTarget.z, 3.2, delta)
    camera.lookAt(target.current)
  })

  return null
}

function routeProgressAt(scrollProgress) {
  // Dispatch starts in the first warehouse, service reaches the customer,
  // and return finishes inside the destination warehouse.
  if (scrollProgress <= 1 / 3) return scrollProgress * 1.5
  if (scrollProgress <= 2 / 3) return 0.5 + (scrollProgress - 1 / 3) * 1.5
  return 1
}

function RouteLine({ route, scrollProgress }) {
  const geometry = useMemo(() => {
    // Keep the routes just above the beveled site slab and below each building bridge.
    const points = route.points.map(([x, z]) => new THREE.Vector3(x, 0.9, z))
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.32)
    const tube = new THREE.TubeGeometry(curve, 128, 0.065, 8, false)
    tube.setDrawRange(0, 0)
    return tube
  }, [route.points])
  const progress = useRef(routeProgressAt(scrollProgress))
  const maxDrawCount = geometry.index.count

  useFrame((_, delta) => {
    progress.current = THREE.MathUtils.damp(
      progress.current,
      routeProgressAt(scrollProgress),
      7,
      delta,
    )
    const visibleSegments = Math.floor(progress.current * 128)
    geometry.setDrawRange(0, Math.min(maxDrawCount, visibleSegments * 8 * 6))
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial color={route.color} roughness={0.48} />
    </mesh>
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

function Warehouse({ end = false }) {
  const x = end ? 11 : -11
  const face = end ? -1 : 1

  return (
    <group position={[x, 0, 0]}>
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
        <meshStandardMaterial color={end ? palette.coral : palette.ink} />
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

function Hospital() {
  return (
    <group position={[0, 0, -4]}>
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

function Restaurant() {
  return (
    <group position={[0, 0, 0]}>
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

function Hotel() {
  const windowRows = [1.58, 2.2, 2.82, 3.44]
  return (
    <group position={[0, 0, 4]}>
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

function SmileBadge({ position, color, delay, activeStage }) {
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
    const targetScale = visible ? 1 : 0
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

function WorldDetails() {
  const shrubs = [
    [-5.7, -5.1, 1.1],
    [-3.8, -2.25, 0.8],
    [3.8, -2.1, 0.9],
    [5.8, -4.9, 1.2],
    [-5.8, 4.9, 1],
    [5.6, 5.1, 0.95],
    [-4.4, 1.55, 0.75],
    [4.2, 1.55, 0.8],
  ]
  return (
    <>
      {shrubs.map(([x, z, scale]) => (
        <Shrub key={`${x}-${z}`} position={[x, 0.16, z]} scale={scale} />
      ))}
      {[-6.4, 6.4].map((x) =>
        [-4.4, 4.4].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.65, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.075, 1.3, 8]} />
              <meshStandardMaterial color={palette.ink} />
            </mesh>
            <mesh position={[0, 1.32, 0]}>
              <sphereGeometry args={[0.12, 14, 14]} />
              <meshStandardMaterial color={palette.gold} emissive={palette.gold} emissiveIntensity={0.4} />
            </mesh>
          </group>
        )),
      )}
    </>
  )
}

export function RouteWorld({ activeStage, scrollProgress }) {
  return (
    <>
      <color attach="background" args={['#e8eadc']} />
      <fog attach="fog" args={['#e8eadc', 28, 46]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#9a9a82', 0.9]} />
      <directionalLight
        castShadow
        position={[-6, 14, 9]}
        intensity={1.65}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-17}
        shadow-camera-right={17}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-bias={-0.0004}
      />
      <CameraRig scrollProgress={scrollProgress} />

      <group position={[0, -0.18, 0]}>
        <RoundedBox args={[25, 0.42, 13]} radius={0.45} smoothness={5} position={[0, 0, 0]} receiveShadow>
          <meshStandardMaterial color="#c2c8ba" roughness={0.94} />
        </RoundedBox>
        <RoundedBox args={[24.3, 0.08, 12.3]} radius={0.35} smoothness={4} position={[0, 0.24, 0]} receiveShadow>
          <meshStandardMaterial color="#b9c1b2" roughness={0.92} />
        </RoundedBox>
        {routes.map((route) => (
          <RouteLine
            key={route.color}
            route={route}
            scrollProgress={scrollProgress}
          />
        ))}
        <Warehouse />
        <Hospital />
        <Restaurant />
        <Hotel />
        <Warehouse end />
        <WorldDetails />
        <SmileBadge position={[0, 3.05, -4]} color={palette.blue} delay={0} activeStage={activeStage} />
        <SmileBadge position={[0, 2.75, 0]} color={palette.coral} delay={0.18} activeStage={activeStage} />
        <SmileBadge position={[0, 4.55, 4]} color={palette.gold} delay={0.36} activeStage={activeStage} />
      </group>
    </>
  )
}
