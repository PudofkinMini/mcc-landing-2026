import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

const MOBILE_BREAKPOINT = 800
const DESKTOP_FOV = 34

const colors = {
  ink: '#153235',
  darkInk: '#0d2528',
  cream: '#f2eee2',
  paper: '#e8eadc',
  coral: '#f2563d',
  blue: '#397fa9',
  paleBlue: '#b8d3d6',
  gold: '#e5a83d',
  green: '#16865c',
  grass: '#9caf7b',
  concrete: '#c9cec1',
  steel: '#8c9a94',
  window: '#31555c',
}

const smooth = (value, start, end) => THREE.MathUtils.smoothstep(value, start, end)

const processCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-19.4, 1.08, 0),
    new THREE.Vector3(-16.7, 1.08, 0),
    new THREE.Vector3(-14.7, 1.08, 0),
    new THREE.Vector3(-12.35, 1.08, 0),
    new THREE.Vector3(-9.7, 1.08, 0),
    new THREE.Vector3(-7.45, 1.08, 0),
    new THREE.Vector3(-5.8, 1.08, 0),
  ],
  false,
  'centripetal',
)

const customerSites = [
  {
    id: 'restaurant',
    position: [11.5, 0.3, 7.9],
    stop: [8.4, 0.58, 7.9],
    lane: 7.9,
    color: colors.coral,
  },
  {
    id: 'hotel',
    position: [12.7, 0.3, 0],
    stop: [9.4, 0.58, 0],
    lane: 0,
    color: colors.blue,
  },
  {
    id: 'hospital',
    position: [12.5, 0.3, -8.1],
    stop: [8.7, 0.58, -8.1],
    lane: -8.1,
    color: colors.green,
  },
]

const truckCurves = customerSites.map((site, index) => {
  const startZ = [1.45, 0, -1.45][index]
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-1.25, 0.58, startZ),
      new THREE.Vector3(-0.5, 0.58, startZ),
      new THREE.Vector3(0.7, 0.58, startZ + (site.lane - startZ) * 0.24),
      new THREE.Vector3(2.3, 0.58, site.lane),
      new THREE.Vector3(site.stop[0] - 2.2, 0.58, site.lane),
      new THREE.Vector3(...site.stop),
    ],
    false,
    'centripetal',
  )
})

function CameraRig({ scrollProgress }) {
  const { camera, pointer, size } = useThree()
  const target = useRef(new THREE.Vector3(-16.4, 0.9, 0))
  const processPoint = useMemo(() => new THREE.Vector3(), [])
  const truckFocus = useMemo(() => new THREE.Vector3(), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])
  const desiredPosition = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!camera.isPerspectiveCamera) return
    const aspect = size.width / Math.max(size.height, 1)
    const mobileFov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(55) / 2) / aspect),
    )
    camera.fov =
      size.width <= MOBILE_BREAKPOINT
        ? THREE.MathUtils.clamp(mobileFov, DESKTOP_FOV, 96)
        : DESKTOP_FOV
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useFrame((_, delta) => {
    const mobile = size.width <= MOBILE_BREAKPOINT
    const plantProgress = smooth(scrollProgress, 0, 0.36)
    processCurve.getPointAt(Math.min(plantProgress, 0.94), processPoint)

    const driveProgress = smooth(scrollProgress, 0.34, 0.9)
    truckFocus.set(0, 0, 0)
    truckCurves.forEach((curve) => truckFocus.add(curve.getPointAt(driveProgress)))
    truckFocus.divideScalar(truckCurves.length)

    const followBlend = smooth(scrollProgress, 0.29, 0.43)
    desiredTarget.lerpVectors(processPoint, truckFocus, followBlend)

    const reveal = smooth(scrollProgress, 0.5, 0.69)
    desiredTarget.lerp(new THREE.Vector3(-5.2, 0.65, 0), reveal)
    if (mobile && camera.isPerspectiveCamera) {
      const nextFov = THREE.MathUtils.lerp(74, 92, reveal)
      camera.fov = THREE.MathUtils.damp(camera.fov, nextFov, 4, delta)
      camera.updateProjectionMatrix()
    }

    const closeOffset = mobile
      ? new THREE.Vector3(2, 11.8, 14.5)
      : new THREE.Vector3(1.8, 9.8, 12.8)
    const wideOffset = mobile
      ? new THREE.Vector3(-7, 34, 42)
      : new THREE.Vector3(-8, 30, 38)
    desiredPosition.copy(desiredTarget).add(closeOffset.lerp(wideOffset, reveal))
    desiredPosition.x += pointer.x * 0.35
    desiredPosition.y += pointer.y * 0.18

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPosition.x, 3.5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPosition.y, 3.5, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPosition.z, 3.5, delta)
    target.current.x = THREE.MathUtils.damp(target.current.x, desiredTarget.x, 4, delta)
    target.current.y = THREE.MathUtils.damp(target.current.y, desiredTarget.y, 4, delta)
    target.current.z = THREE.MathUtils.damp(target.current.z, desiredTarget.z, 4, delta)
    camera.lookAt(target.current)
  })

  return null
}

function Window({ position, rotation = [0, 0, 0], size = [0.56, 0.52], color = colors.window }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[size[0], size[1], 0.07]} radius={0.035} smoothness={2} castShadow>
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.12} />
      </RoundedBox>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.025, size[1] * 0.86, 0.01]} />
        <meshBasicMaterial color="#b8d2d0" />
      </mesh>
    </group>
  )
}

function Conveyor({
  position,
  length,
  rotation = 0,
  slope = 0,
  width = 1.02,
  railColor = colors.gold,
  speed = 0.9,
}) {
  const rollersRef = useRef([])
  const markersRef = useRef([])
  const rollers = Array.from({ length: Math.ceil(length / 0.48) }, (_, index) => -length / 2 + 0.24 + index * 0.48)
  const markerTravel = length - 0.48
  const markerCount = Math.max(2, Math.ceil(length / 1.35))
  const markers = Array.from(
    { length: markerCount },
    (_, index) => -markerTravel / 2 + (index * markerTravel) / markerCount,
  )

  useFrame(({ clock }) => {
    const travel = clock.elapsedTime * speed
    rollersRef.current.forEach((roller) => {
      if (roller) roller.rotation.y = -travel * 3.8
    })
    markersRef.current.forEach((marker, index) => {
      if (!marker) return
      marker.position.x =
        -markerTravel / 2 +
        (((index * markerTravel) / markerCount + travel) % markerTravel)
    })
  })

  return (
    <group position={position} rotation={[0, rotation, slope]}>
      <mesh receiveShadow>
        <boxGeometry args={[length, 0.16, width]} />
        <meshStandardMaterial color={colors.darkInk} roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[length - 0.08, 0.06, width - 0.18]} />
        <meshStandardMaterial color={colors.blue} roughness={0.42} metalness={0.22} />
      </mesh>
      {markers.map((x, index) => (
        <mesh
          key={`marker-${x}`}
          ref={(marker) => {
            markersRef.current[index] = marker
          }}
          position={[x, 0.145, 0]}
        >
          <boxGeometry args={[0.08, 0.025, width - 0.22]} />
          <meshStandardMaterial color={index % 3 === 0 ? colors.coral : colors.paleBlue} roughness={0.45} />
        </mesh>
      ))}
      {rollers.map((x, index) => (
        <group key={x} position={[x, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh
            ref={(roller) => {
              rollersRef.current[index] = roller
            }}
          >
            <cylinderGeometry args={[0.06, 0.06, width - 0.14, 10]} />
            <meshStandardMaterial color="#b9c1bb" metalness={0.65} roughness={0.28} />
          </mesh>
        </group>
      ))}
      {[-width / 2 - 0.05, width / 2 + 0.05].map((z) => (
        <mesh key={z} position={[0, 0.16, z]}>
          <boxGeometry args={[length, 0.1, 0.08]} />
          <meshStandardMaterial color={railColor} metalness={0.25} roughness={0.46} />
        </mesh>
      ))}
      {[-length * 0.38, length * 0.38].flatMap((x) =>
        [-width * 0.4, width * 0.4].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.42, z]} castShadow>
            <boxGeometry args={[0.09, 0.78, 0.09]} />
            <meshStandardMaterial color={colors.steel} metalness={0.35} />
          </mesh>
        )),
      )}
    </group>
  )
}

function LinenStack({ color = colors.paleBlue }) {
  return (
    <group>
      {[0, 0.13, 0.26].map((y, index) => (
        <RoundedBox
          key={y}
          args={[0.72 - index * 0.04, 0.14, 0.62]}
          radius={0.06}
          smoothness={3}
          position={[index % 2 ? 0.04 : -0.02, y, 0]}
          castShadow
        >
          <meshStandardMaterial color={index === 1 ? colors.cream : color} roughness={0.94} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.23, 0.316]}>
        <boxGeometry args={[0.48, 0.025, 0.012]} />
        <meshBasicMaterial color={colors.blue} />
      </mesh>
    </group>
  )
}

function ProcessLoad({ scrollProgress }) {
  const load = useRef()
  const point = useMemo(() => new THREE.Vector3(), [])
  const start = 0.015
  const end = 0.34

  useFrame(() => {
    const progress = smooth(scrollProgress, start, end)
    processCurve.getPointAt(progress, point)
    load.current.position.copy(point)
    load.current.position.y += 0.25
    load.current.visible = scrollProgress < 0.375
  })

  return (
    <group ref={load}>
      <LinenStack />
    </group>
  )
}

function TransferLoads({ scrollProgress }) {
  const loads = useRef([])
  const start = useMemo(() => new THREE.Vector3(-6.15, 1.28, 0), [])
  const destination = useMemo(
    () => [
      new THREE.Vector3(-1.8, 1.52, 1.45),
      new THREE.Vector3(-1.8, 1.52, 0),
      new THREE.Vector3(-1.8, 1.52, -1.45),
    ],
    [],
  )

  useFrame(() => {
    const progress = smooth(scrollProgress, 0.265, 0.365)
    loads.current.forEach((load, index) => {
      if (!load) return
      load.position.lerpVectors(start, destination[index], progress)
      load.position.y += Math.sin(progress * Math.PI) * 0.12
      load.visible = scrollProgress >= 0.245 && scrollProgress < 0.375
      load.scale.setScalar(THREE.MathUtils.lerp(0.86, 0.52, progress))
    })
  })

  return (
    <>
      {customerSites.map((site, index) => (
        <group
          key={site.id}
          ref={(load) => {
            loads.current[index] = load
          }}
          visible={false}
        >
          <LinenStack color={index === 0 ? '#f2c2aa' : index === 1 ? colors.paleBlue : '#b7d5c3'} />
        </group>
      ))}
    </>
  )
}

function TunnelWasher() {
  const drum = useRef()

  useFrame((_, delta) => {
    if (drum.current) drum.current.rotation.y += delta * 0.38
  })

  return (
    <group position={[-15.75, 2.05, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.72, 1.72, 3.8, 48, 1, true]} />
          <meshStandardMaterial color="#dce2da" metalness={0.16} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={drum}>
          <cylinderGeometry args={[1.35, 1.35, 3.88, 36, 1, true]} />
          <meshStandardMaterial
            color="#5f7476"
            metalness={0.55}
            roughness={0.32}
            side={THREE.DoubleSide}
            wireframe
          />
        </mesh>
      </group>
      {[-1.9, -0.96, 0, 0.96, 1.9].map((x, index) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[1.76, index === 0 || index === 4 ? 0.13 : 0.075, 12, 42]} />
          <meshStandardMaterial
            color={index === 0 ? colors.coral : index === 4 ? colors.blue : colors.steel}
            metalness={0.44}
            roughness={0.34}
          />
        </mesh>
      ))}
      {[-1.45, 1.45].flatMap((x) =>
        [-1.25, 1.25].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -1.72, z]} castShadow>
            <boxGeometry args={[0.18, 1.15, 0.18]} />
            <meshStandardMaterial color={colors.steel} metalness={0.35} roughness={0.45} />
          </mesh>
        )),
      )}
      <group position={[0.75, 1.78, 1.25]}>
        <RoundedBox args={[1.55, 0.54, 0.18]} radius={0.08} smoothness={3} castShadow>
          <meshStandardMaterial color={colors.darkInk} roughness={0.42} />
        </RoundedBox>
        {[-0.5, 0, 0.5].map((x, index) => (
          <mesh key={x} position={[x, 0, 0.11]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color={[colors.green, colors.gold, colors.coral][index]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function IndustrialDryer() {
  return (
    <group position={[-11.35, 0.3, 0]}>
      <RoundedBox args={[2.9, 2.35, 3.1]} radius={0.22} smoothness={4} position={[0, 2.48, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d9ddd5" roughness={0.6} metalness={0.16} />
      </RoundedBox>
      <mesh position={[0, 2.48, 1.59]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 0.16, 40]} />
        <meshStandardMaterial color={colors.darkInk} metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.48, 1.69]}>
        <circleGeometry args={[0.66, 36]} />
        <meshStandardMaterial color="#789096" metalness={0.2} roughness={0.24} transparent opacity={0.74} />
      </mesh>
      <mesh position={[0, 2.48, 1.705]}>
        <torusGeometry args={[0.75, 0.09, 12, 36]} />
        <meshStandardMaterial color={colors.steel} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, 3.38, 1.6]}>
        <boxGeometry args={[1.46, 0.34, 0.12]} />
        <meshStandardMaterial color={colors.blue} />
      </mesh>
      {[-0.45, 0, 0.45].map((x, index) => (
        <mesh key={x} position={[x, 3.38, 1.68]}>
          <circleGeometry args={[0.07, 14]} />
          <meshBasicMaterial color={index === 0 ? colors.green : index === 1 ? colors.gold : colors.coral} />
        </mesh>
      ))}
      {[-1.22, 1.22].flatMap((x) =>
        [-1.25, 1.25].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.62, z]} castShadow>
            <boxGeometry args={[0.28, 1.25, 0.28]} />
            <meshStandardMaterial color={colors.steel} metalness={0.35} roughness={0.4} />
          </mesh>
        )),
      )}
      <mesh position={[0.74, 4.25, -0.55]} castShadow>
        <cylinderGeometry args={[0.35, 0.42, 1.5, 18]} />
        <meshStandardMaterial color={colors.steel} metalness={0.5} roughness={0.32} />
      </mesh>
      <mesh position={[0.74, 5.05, -0.55]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.2, 18]} />
        <meshStandardMaterial color={colors.steel} metalness={0.5} roughness={0.32} />
      </mesh>
    </group>
  )
}

function LinenFolder() {
  return (
    <group position={[-7.75, 0.3, 0]}>
      {[-1.22, 1.22].map((z) => (
        <RoundedBox
          key={z}
          args={[3.1, 2.55, 0.55]}
          radius={0.14}
          smoothness={4}
          position={[0, 1.45, z]}
          castShadow
        >
          <meshStandardMaterial color={colors.cream} metalness={0.08} roughness={0.64} />
        </RoundedBox>
      ))}
      <RoundedBox args={[3.1, 0.62, 3]} radius={0.18} smoothness={4} position={[0, 2.75, 0]} castShadow>
        <meshStandardMaterial color="#d9e1dc" roughness={0.58} metalness={0.14} />
      </RoundedBox>
      <mesh position={[0, 3.07, 0]}>
        <boxGeometry args={[2.25, 0.06, 2.2]} />
        <meshStandardMaterial color={colors.blue} />
      </mesh>
      {[-0.72, 0, 0.72].map((x, index) => (
        <group key={x} position={[x, 2.78, 1.54]}>
          <mesh>
            <circleGeometry args={[0.12, 18]} />
            <meshStandardMaterial
              color={index === 1 ? colors.coral : colors.green}
              emissive={index === 1 ? colors.coral : colors.green}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <boxGeometry args={[0.38, 0.1, 0.05]} />
            <meshStandardMaterial color={colors.ink} />
          </mesh>
        </group>
      ))}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 1.5, 0]} rotation={[0, 0, x < 0 ? -0.62 : 0.62]} castShadow>
          <boxGeometry args={[1.25, 0.08, 0.82]} />
          <meshStandardMaterial color={colors.steel} metalness={0.58} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, 1.62, 1.54]} castShadow>
        <boxGeometry args={[1.55, 0.58, 0.1]} />
        <meshStandardMaterial color={colors.darkInk} />
      </mesh>
      <mesh position={[0, 1.62, 1.605]}>
        <boxGeometry args={[1.24, 0.065, 0.015]} />
        <meshBasicMaterial color={colors.paleBlue} />
      </mesh>
    </group>
  )
}

function PlantDoor() {
  return (
    <group position={[-3.15, 0.3, 0]}>
      <mesh position={[0, 2.75, 0]} castShadow>
        <boxGeometry args={[0.55, 1.1, 8.6]} />
        <meshStandardMaterial color={colors.cream} roughness={0.8} />
      </mesh>
      {[-4.05, 4.05].map((z) => (
        <mesh key={z} position={[0, 1.25, z]} castShadow>
          <boxGeometry args={[0.55, 3.6, 0.52]} />
          <meshStandardMaterial color={colors.cream} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-0.34, 2.12, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[7.45, 0.12, 0.08]} />
        <meshStandardMaterial color={colors.steel} metalness={0.5} />
      </mesh>
      {[-2.65, 0, 2.65].map((z) => (
        <mesh key={z} position={[-0.37, 1.2, z]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[2.05, 1.7, 0.07]} />
          <meshStandardMaterial color={colors.window} transparent opacity={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.38, 3.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.1, 0.42, 0.07]} />
        <meshStandardMaterial color={colors.ink} />
      </mesh>
      <mesh position={[-0.425, 3.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.45, 0.045, 0.012]} />
        <meshBasicMaterial color={colors.cream} />
      </mesh>
    </group>
  )
}

function Plant({ scrollProgress }) {
  return (
    <group>
      <RoundedBox args={[18.7, 0.4, 11.2]} radius={0.35} smoothness={4} position={[-12.35, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#bcc3b7" roughness={0.96} />
      </RoundedBox>
      <mesh position={[-12.35, 0.25, -5.25]} receiveShadow>
        <boxGeometry args={[18.2, 0.08, 0.2]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[-21.25, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 3.5, 10.5]} />
        <meshStandardMaterial color={colors.cream} roughness={0.84} />
      </mesh>
      <mesh position={[-12.25, 1.75, -5.1]} castShadow receiveShadow>
        <boxGeometry args={[18.25, 3.5, 0.26]} />
        <meshStandardMaterial color="#e4e3d8" roughness={0.84} />
      </mesh>
      {[-18.3, -14.7, -11.1, -7.5].map((x) => (
        <Window key={x} position={[x, 2.25, -4.95]} size={[1.72, 0.78]} color="#6f9196" />
      ))}
      <Conveyor position={[-13, 1, 0]} length={14.8} speed={1.05} />
      {[
        { z: 1.45, length: 2.95, rotation: -0.52, color: colors.coral },
        { z: 0, length: 2.62, rotation: 0, color: colors.blue },
        { z: -1.45, length: 2.95, rotation: 0.52, color: colors.green },
      ].map(({ z, length, rotation, color }) => (
        <Conveyor
          key={z}
          position={[-4.28, 1.12, z / 2]}
          length={length}
          rotation={rotation}
          slope={0.14}
          width={0.62}
          railColor={color}
          speed={1.12}
        />
      ))}
      <TunnelWasher />
      <IndustrialDryer />
      <LinenFolder />
      <PlantDoor />
      {[-5.9, -4.9].map((x, index) => (
        <group key={x} position={[x, 0.44, index ? 2.8 : -2.8]}>
          <RoundedBox args={[1.5, 0.85, 1.1]} radius={0.11} smoothness={3} position={[0, 0.42, 0]} castShadow>
            <meshStandardMaterial color={index ? colors.gold : colors.blue} roughness={0.76} />
          </RoundedBox>
          {[-0.54, 0.54].flatMap((wheelX) =>
            [-0.43, 0.43].map((z) => (
              <mesh key={`${wheelX}-${z}`} position={[wheelX, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.13, 0.13, 0.08, 12]} />
                <meshStandardMaterial color={colors.darkInk} />
              </mesh>
            )),
          )}
        </group>
      ))}
      <ProcessLoad scrollProgress={scrollProgress} />
      <TransferLoads scrollProgress={scrollProgress} />
    </group>
  )
}

function TruckModel({ accent }) {
  return (
    <group>
      <RoundedBox args={[2.2, 1.3, 1.22]} radius={0.17} smoothness={4} position={[-0.55, 0.92, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} roughness={0.6} />
      </RoundedBox>
      <mesh position={[-1.665, 0.94, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.88, 0.82, 0.035]} />
        <meshStandardMaterial color={colors.darkInk} roughness={0.7} />
      </mesh>
      {[-0.49, 0.49].map((z) => (
        <mesh key={z} position={[-1.69, 0.94, z]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.08, 0.94, 0.05]} />
          <meshStandardMaterial color={colors.steel} metalness={0.45} roughness={0.35} />
        </mesh>
      ))}
      {[0.47, 1.41].map((y) => (
        <mesh key={y} position={[-1.69, y, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[0.98, 0.08, 0.05]} />
          <meshStandardMaterial color={colors.steel} metalness={0.45} roughness={0.35} />
        </mesh>
      ))}
      <RoundedBox args={[0.95, 1.22, 1.18]} radius={0.16} smoothness={4} position={[1.03, 0.72, 0]} castShadow>
        <meshStandardMaterial color={accent} roughness={0.58} />
      </RoundedBox>
      <mesh position={[1.36, 0.96, 0]} rotation={[0, Math.PI / 2, 0]}>
        <RoundedBox args={[0.74, 0.42, 0.06]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color="#315963" metalness={0.12} roughness={0.2} />
        </RoundedBox>
      </mesh>
      <mesh position={[-0.56, 0.93, 0.616]}>
        <boxGeometry args={[1.55, 0.12, 0.025]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <mesh position={[1.53, 0.38, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.72, 0.18, 0.08]} />
        <meshStandardMaterial color={colors.darkInk} />
      </mesh>
      {[-0.18, 1.13].flatMap((x) =>
        [-0.72, 0.72].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0.28, z]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.2, 20]} />
              <meshStandardMaterial color="#172426" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.09, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.17, 12]} />
              <meshStandardMaterial color={colors.steel} metalness={0.65} />
            </mesh>
          </group>
        )),
      )}
      {[-0.34, 0.34].map((z) => (
        <mesh key={z} position={[1.515, 0.72, z]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.09, 16]} />
          <meshStandardMaterial color="#fff2b6" emissive="#ffe58a" emissiveIntensity={0.7} />
        </mesh>
      ))}
      <mesh position={[-0.55, 0.9, 0.635]}>
        <circleGeometry args={[0.22, 24]} />
        <meshStandardMaterial color={colors.ink} />
      </mesh>
      <mesh position={[-0.55, 0.9, 0.646]}>
        <torusGeometry args={[0.12, 0.025, 8, 18, Math.PI]} />
        <meshBasicMaterial color={colors.cream} />
      </mesh>
    </group>
  )
}

function MovingTruck({ index, scrollProgress }) {
  const truck = useRef()
  const point = useMemo(() => new THREE.Vector3(), [])
  const tangent = useMemo(() => new THREE.Vector3(), [])
  const curve = truckCurves[index]
  const site = customerSites[index]

  useFrame(() => {
    const delay = index * 0.018
    const progress = smooth(scrollProgress, 0.32 + delay, 0.88 + delay)
    curve.getPointAt(progress, point)
    curve.getTangentAt(Math.min(progress, 0.995), tangent)
    truck.current.position.copy(point)
    truck.current.rotation.y = Math.atan2(-tangent.z, tangent.x)
  })

  return (
    <group ref={truck}>
      <TruckModel accent={site.color} />
    </group>
  )
}

function RoadNetwork() {
  return (
    <group position={[0, 0.36, 0]}>
      {customerSites.map((site) => (
        <group key={site.id}>
          <mesh position={[4.4, 0, site.lane]} receiveShadow>
            <boxGeometry args={[19.8, 0.1, 2.75]} />
            <meshStandardMaterial color="#53615e" roughness={0.98} />
          </mesh>
          {Array.from({ length: 9 }, (_, index) => (
            <mesh key={index} position={[-3.2 + index * 2.05, 0.075, site.lane]}>
              <boxGeometry args={[1.05, 0.025, 0.11]} />
              <meshBasicMaterial color="#f0d98c" />
            </mesh>
          ))}
          {[-1.36, 1.36].map((offset) => (
            <mesh key={offset} position={[4.4, 0.08, site.lane + offset]}>
              <boxGeometry args={[19.8, 0.12, 0.12]} />
              <meshStandardMaterial color="#d9ddd1" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-1.8, -0.01, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 18.75]} />
        <meshStandardMaterial color="#53615e" roughness={0.98} />
      </mesh>
      {customerSites.flatMap((site) =>
        [-0.72, -0.24, 0.24, 0.72].map((offset) => (
          <mesh key={`${site.id}-${offset}`} position={[9.8 + offset, 0.07, site.lane]}>
            <boxGeometry args={[0.22, 0.02, 1.8]} />
            <meshBasicMaterial color="#ecebdc" />
          </mesh>
        )),
      )}
    </group>
  )
}

function Restaurant({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[4.1, 2.1, 4.3]} radius={0.22} smoothness={4} position={[0, 1.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#efdcb9" roughness={0.82} />
      </RoundedBox>
      <RoundedBox args={[1.25, 1.35, 2.7]} radius={0.14} smoothness={3} position={[-2.15, 0.68, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} />
      </RoundedBox>
      <mesh position={[-2.79, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[2.72, 0.22, 0.12]} />
        <meshStandardMaterial color={colors.coral} />
      </mesh>
      {[-1.08, -0.54, 0, 0.54, 1.08].map((z, index) => (
        <mesh key={z} position={[-2.86, 1.34, z]} rotation={[0, -Math.PI / 2, -0.16]}>
          <boxGeometry args={[0.47, 0.42, 0.08]} />
          <meshStandardMaterial color={index % 2 ? colors.cream : colors.coral} />
        </mesh>
      ))}
      <Window position={[-2.21, 0.78, -0.84]} rotation={[0, -Math.PI / 2, 0]} size={[0.75, 0.8]} />
      <Window position={[-2.21, 0.78, 0.84]} rotation={[0, -Math.PI / 2, 0]} size={[0.75, 0.8]} />
      <mesh position={[-1.1, 2.76, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.35, 12]} />
        <meshStandardMaterial color={colors.ink} />
      </mesh>
      <mesh position={[-1.1, 3.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.48, 0.11, 12, 24]} />
        <meshStandardMaterial color={colors.gold} />
      </mesh>
      <mesh position={[-1.1, 3.35, 0]}>
        <circleGeometry args={[0.31, 24]} />
        <meshStandardMaterial color={colors.coral} />
      </mesh>
      {[-1.35, 1.35].map((z) => (
        <group key={z} position={[-3.25, 0, z]}>
          <mesh position={[0, 0.53, 0]} castShadow>
            <cylinderGeometry args={[0.64, 0.12, 0.72, 18]} />
            <meshStandardMaterial color={colors.gold} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.12, 18]} />
            <meshStandardMaterial color={colors.cream} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Hotel({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[4.4, 6.6, 4.6]} radius={0.25} smoothness={4} position={[0, 3.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d8d3c9" roughness={0.82} />
      </RoundedBox>
      <RoundedBox args={[1.1, 2, 2.6]} radius={0.15} smoothness={3} position={[-2.3, 1, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} />
      </RoundedBox>
      {[1.3, 2.35, 3.4, 4.45, 5.5].flatMap((y) =>
        [-1.45, -0.48, 0.48, 1.45].map((z) => (
          <Window key={`${y}-${z}`} position={[-2.22, y, z]} rotation={[0, -Math.PI / 2, 0]} size={[0.52, 0.56]} />
        )),
      )}
      <mesh position={[-2.9, 4.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[1.25, 1.25, 0.15]} />
        <meshStandardMaterial color={colors.blue} />
      </mesh>
      {[
        [0, 0.34, 0.08, 0.76],
        [0, -0.04, 0.08, 0.76],
        [0, 0, 0.67, 0.09],
      ].map(([x, y, width, height], index) => (
        <mesh key={index} position={[-2.99, 4.55 + y, x]} rotation={[0, -Math.PI / 2, 0]}>
          <boxGeometry args={[width, height, 0.05]} />
          <meshBasicMaterial color={colors.cream} />
        </mesh>
      ))}
      <mesh position={[-2.93, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[2.8, 0.24, 0.1]} />
        <meshStandardMaterial color={colors.gold} />
      </mesh>
      {[-1.15, 1.15].map((z) => (
        <mesh key={z} position={[-2.75, 0.48, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 1.35, 10]} />
          <meshStandardMaterial color={colors.ink} />
        </mesh>
      ))}
      <mesh position={[0.7, 6.86, -0.65]} castShadow>
        <boxGeometry args={[0.85, 0.52, 0.85]} />
        <meshStandardMaterial color={colors.steel} />
      </mesh>
    </group>
  )
}

function Hospital({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[5.7, 4.8, 7.2]} radius={0.26} smoothness={4} position={[0, 2.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#dce5e1" roughness={0.78} />
      </RoundedBox>
      <RoundedBox args={[1.3, 2.4, 4.2]} radius={0.16} smoothness={3} position={[-3.05, 1.2, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} />
      </RoundedBox>
      {[1.25, 2.35, 3.45].flatMap((y) =>
        [-2.5, -1.25, 0, 1.25, 2.5].map((z) => (
          <Window key={`${y}-${z}`} position={[-2.87, y, z]} rotation={[0, -Math.PI / 2, 0]} size={[0.6, 0.55]} color="#38616a" />
        )),
      )}
      <mesh position={[-3.74, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[1.28, 1.28, 0.16]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[-3.84, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.25, 0.88, 0.06]} />
        <meshStandardMaterial color={colors.coral} />
      </mesh>
      <mesh position={[-3.84, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.88, 0.25, 0.06]} />
        <meshStandardMaterial color={colors.coral} />
      </mesh>
      <mesh position={[-3.72, 1.72, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[4.3, 0.22, 0.12]} />
        <meshStandardMaterial color={colors.green} />
      </mesh>
      {[-1.8, 1.8].map((z) => (
        <mesh key={z} position={[-3.5, 0.58, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 1.42, 10]} />
          <meshStandardMaterial color={colors.ink} />
        </mesh>
      ))}
      <mesh position={[0.7, 5.08, -1.45]} castShadow>
        <cylinderGeometry args={[0.55, 0.62, 0.38, 24]} />
        <meshStandardMaterial color={colors.steel} />
      </mesh>
      <mesh position={[0.7, 5.29, -1.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.38, 24]} />
        <meshBasicMaterial color={colors.cream} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.15, 1.15, 9]} />
        <meshStandardMaterial color="#685f45" />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <dodecahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color={colors.grass} roughness={0.95} />
      </mesh>
      <mesh position={[-0.34, 1.2, 0.16]} castShadow>
        <dodecahedronGeometry args={[0.46, 1]} />
        <meshStandardMaterial color="#86a36f" roughness={0.95} />
      </mesh>
    </group>
  )
}

function Smiley({ position, scrollProgress, delay = 0 }) {
  const smiley = useRef()
  useFrame(() => {
    const appear = smooth(scrollProgress, 0.87 + delay, 0.94 + delay)
    const bounce = Math.sin(appear * Math.PI) * 0.35
    smiley.current.scale.setScalar(appear)
    smiley.current.position.y = position[1] + bounce
  })

  return (
    <group ref={smiley} position={position} scale={0}>
      <Billboard>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.72, 0.72, 0.18, 36]} />
          <meshStandardMaterial color="#ffd35a" roughness={0.5} />
        </mesh>
        {[-0.25, 0.25].map((x) => (
          <mesh key={x} position={[x, 0.2, 0.13]}>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshBasicMaterial color={colors.ink} />
          </mesh>
        ))}
        <mesh position={[0, -0.04, 0.13]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.33, 0.055, 10, 24, Math.PI]} />
          <meshBasicMaterial color={colors.ink} />
        </mesh>
      </Billboard>
    </group>
  )
}

function CustomerWorld({ scrollProgress }) {
  const treePositions = [
    [7.8, -11.6, 0.85],
    [10.2, -12, 1],
    [15.8, -11.4, 0.9],
    [16.8, -4.1, 0.82],
    [7.5, -3.7, 0.92],
    [16.6, 4.2, 0.88],
    [8, 4.35, 0.8],
    [15.8, 11.5, 1.05],
    [9.1, 11.7, 0.9],
  ]

  return (
    <>
      <RoadNetwork />
      <Restaurant position={customerSites[0].position} />
      <Hotel position={customerSites[1].position} />
      <Hospital position={customerSites[2].position} />
      {treePositions.map(([x, z, scale]) => (
        <Tree key={`${x}-${z}`} position={[x, 0.3, z]} scale={scale} />
      ))}
      {customerSites.map((site, index) => (
        <Smiley
          key={site.id}
          position={[site.stop[0] + 0.4, 2.25, site.stop[2] - 0.25]}
          scrollProgress={scrollProgress}
          delay={index * 0.012}
        />
      ))}
    </>
  )
}

export function RouteWorld({ scrollProgress }) {
  return (
    <>
      <color attach="background" args={[colors.paper]} />
      <fog attach="fog" args={[colors.paper, 44, 74]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ffffff', '#839174', 1.05]} />
      <directionalLight
        castShadow
        position={[-8, 18, 12]}
        intensity={1.85}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.00035}
      />
      <CameraRig scrollProgress={scrollProgress} />

      <group position={[0, -0.22, 0]}>
        <RoundedBox args={[45, 0.42, 27]} radius={0.6} smoothness={5} position={[-1.4, 0, 0]} receiveShadow>
          <meshStandardMaterial color="#bdc5b5" roughness={0.96} />
        </RoundedBox>
        <RoundedBox args={[44.3, 0.08, 26.3]} radius={0.5} smoothness={4} position={[-1.4, 0.24, 0]} receiveShadow>
          <meshStandardMaterial color="#b3beaa" roughness={0.95} />
        </RoundedBox>
        <Plant scrollProgress={scrollProgress} />
        <CustomerWorld scrollProgress={scrollProgress} />
        {customerSites.map((site, index) => (
          <MovingTruck key={site.id} index={index} scrollProgress={scrollProgress} />
        ))}
      </group>
    </>
  )
}
