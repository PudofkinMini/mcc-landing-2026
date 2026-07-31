import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import {
  DISC_RADIUS,
  ROUTE_CRUISE_SPEED,
  ROUTE_LENGTH,
  ROUTE_PAUSE_SECONDS,
  ROUTE_STAGE_COUNT,
  ROUTE_STAGE_SPACING,
  wrapRouteDistance,
} from './heroTimeline'

const MOBILE_BREAKPOINT = 800
const ROAD_WIDTH = 2.8
const ROAD_LENGTH = Math.sqrt(
  (DISC_RADIUS * 2) ** 2 - ROAD_WIDTH ** 2,
)

const colors = {
  sky: '#dfe9e5',
  grass: '#78aa62',
  grassLight: '#9bc879',
  grassDark: '#4e8150',
  soil: '#8d704f',
  road: '#3e4b52',
  roadEdge: '#e6e4d4',
  line: '#f5d86f',
  ink: '#14282d',
  cream: '#f5f2e8',
  white: '#ffffff',
  coral: '#f05c45',
  blue: '#2879b8',
  blueLight: '#74b7d9',
  gold: '#efad3e',
  red: '#d94748',
  hospital: '#e8f0ed',
  glass: '#31596a',
  steel: '#718189',
}

const treeData = [
  [-5.9, -10.7, 0.82, '#4e8150'],
  [5.8, -9.5, 1.08, '#629951'],
  [-6.8, -7.7, 0.94, '#3f7750'],
  [5.6, -5.8, 0.72, '#78aa62'],
  [-6.7, -3.9, 0.9, '#5c9150'],
  [6.5, -1.9, 1.02, '#477c48'],
  [-6.4, 1.6, 0.78, '#78aa62'],
  [5.7, 3.2, 0.88, '#4e8150'],
  [-6.6, 5.4, 1.05, '#629951'],
  [6.4, 7.1, 0.76, '#3f7750'],
  [-5.7, 9.1, 0.94, '#5c9150'],
  [5.9, 10.8, 1.04, '#477c48'],
]

const easeOutBack = (value) => {
  const c = 1.70158
  return 1 + (c + 1) * (value - 1) ** 3 + c * (value - 1) ** 2
}

const visibleScale = (x, z) => {
  const distance = Math.hypot(x, z)
  const progress = THREE.MathUtils.clamp(
    (DISC_RADIUS + 0.35 - distance) / 1.55,
    0,
    1,
  )
  return progress === 0 ? 0 : easeOutBack(progress)
}

function CameraRig() {
  const { camera, pointer, size } = useThree()
  const target = useMemo(() => new THREE.Vector3(0, 0.65, 0), [])
  const desired = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!camera.isPerspectiveCamera) return
    const mobile = size.width <= MOBILE_BREAKPOINT
    const aspect = size.width / Math.max(size.height, 1)
    camera.fov = mobile
      ? THREE.MathUtils.clamp(48 / Math.max(aspect, 0.58), 52, 78)
      : 33
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useFrame((_, delta) => {
    const mobile = size.width <= MOBILE_BREAKPOINT
    desired
      .set(mobile ? 12.5 : 11.5, mobile ? 15.5 : 11.5, mobile ? 19 : 15)
      .addScaledVector(new THREE.Vector3(1, 0.35, 0), pointer.x * 0.22)
      .addScaledVector(new THREE.Vector3(0, 1, 0), pointer.y * 0.12)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 5, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 5, delta)
    camera.lookAt(target)
  })

  return null
}

function WindowPane({ position, size = [0.62, 0.62], color = colors.glass }) {
  return (
    <RoundedBox
      args={[size[0], size[1], 0.07]}
      radius={0.035}
      smoothness={2}
      position={position}
      rotation={[0, Math.PI / 2, 0]}
    >
      <meshStandardMaterial
        color={color}
        metalness={0.18}
        roughness={0.22}
      />
    </RoundedBox>
  )
}

function Tree({ color = colors.grassDark }) {
  return (
    <group>
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 1.25, 9]} />
        <meshStandardMaterial color="#76543c" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.54, 0]} castShadow>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      <mesh position={[-0.38, 1.35, 0.12]} castShadow>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color={colors.grassLight} roughness={0.94} />
      </mesh>
      <mesh position={[0.34, 1.28, -0.1]} castShadow>
        <icosahedronGeometry args={[0.44, 1]} />
        <meshStandardMaterial color={color} roughness={0.94} />
      </mesh>
    </group>
  )
}

function SiteBadge({ accent, type }) {
  return (
    <Billboard position={[0, 3.7, 0]}>
      <RoundedBox args={[1.15, 1.15, 0.16]} radius={0.2} smoothness={4} castShadow>
        <meshStandardMaterial color={colors.ink} roughness={0.68} />
      </RoundedBox>
      {type === 'hospital' ? (
        <group position={[0, 0, 0.1]}>
          <mesh>
            <boxGeometry args={[0.18, 0.7, 0.06]} />
            <meshBasicMaterial color={accent} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.7, 0.18, 0.06]} />
            <meshBasicMaterial color={accent} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0, 0.1]}>
          <circleGeometry args={[0.32, type === 'plant' ? 6 : 24]} />
          <meshBasicMaterial color={accent} />
        </mesh>
      )}
    </Billboard>
  )
}

function Plant() {
  return (
    <group>
      <RoundedBox
        args={[3.5, 2.5, 4.1]}
        radius={0.18}
        smoothness={4}
        position={[0, 1.25, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#d7ddd8" roughness={0.78} />
      </RoundedBox>
      {[-1.18, 0, 1.18].map((z) => (
        <group key={z} position={[1.79, 0.78, z]}>
          <RoundedBox args={[0.08, 1.35, 0.78]} radius={0.05} smoothness={2}>
            <meshStandardMaterial color={colors.steel} roughness={0.65} />
          </RoundedBox>
          {[0.3, 0.62, 0.94, 1.26].map((y) => (
            <mesh key={y} position={[0.05, y - 0.78, 0]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[0.64, 0.035, 0.02]} />
              <meshBasicMaterial color="#b8c3c2" />
            </mesh>
          ))}
        </group>
      ))}
      {[-1.05, 0, 1.05].map((z) => (
        <mesh key={z} position={[-0.75, 2.63, z]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[1.35, 1.35, 1.1]} />
          <meshStandardMaterial color={z === 0 ? '#cbd5d0' : '#e6eae5'} roughness={0.82} />
        </mesh>
      ))}
      <mesh position={[-0.7, 4.15, 0.95]} castShadow>
        <cylinderGeometry args={[0.24, 0.32, 2.8, 16]} />
        <meshStandardMaterial color={colors.coral} roughness={0.56} />
      </mesh>
      <mesh position={[-0.7, 5.58, 0.95]} castShadow>
        <cylinderGeometry args={[0.34, 0.27, 0.18, 16]} />
        <meshStandardMaterial color={colors.ink} />
      </mesh>
      <SiteBadge accent={colors.coral} type="plant" />
    </group>
  )
}

function Restaurant() {
  return (
    <group>
      <RoundedBox args={[3.5, 2.35, 4.2]} radius={0.28} smoothness={4} position={[0, 1.18, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5c66b" roughness={0.76} />
      </RoundedBox>
      <RoundedBox args={[0.8, 1.75, 3.3]} radius={0.12} smoothness={3} position={[1.85, 0.88, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} roughness={0.72} />
      </RoundedBox>
      {[-1.02, 0, 1.02].map((z) => (
        <WindowPane key={z} position={[2.28, 1, z]} size={[0.68, 0.92]} />
      ))}
      <mesh position={[2.29, 1.75, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[3.5, 0.18, 0.12]} />
        <meshStandardMaterial color={colors.coral} />
      </mesh>
      {[-1.4, -0.7, 0, 0.7, 1.4].map((z, index) => (
        <mesh key={z} position={[2.36, 1.57, z]} rotation={[0, Math.PI / 2, -0.13]}>
          <boxGeometry args={[0.6, 0.38, 0.08]} />
          <meshStandardMaterial color={index % 2 ? colors.cream : colors.coral} />
        </mesh>
      ))}
      <SiteBadge accent={colors.gold} type="restaurant" />
    </group>
  )
}

function Hotel() {
  return (
    <group>
      <RoundedBox args={[3.4, 6.15, 4.25]} radius={0.25} smoothness={4} position={[0, 3.08, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#b8d7e7" roughness={0.7} />
      </RoundedBox>
      {[1.15, 2.2, 3.25, 4.3, 5.35].flatMap((y) =>
        [-1.25, -0.42, 0.42, 1.25].map((z) => (
          <WindowPane key={`${y}-${z}`} position={[1.73, y, z]} size={[0.5, 0.56]} />
        )),
      )}
      <RoundedBox args={[0.85, 1.85, 2.8]} radius={0.14} smoothness={3} position={[1.85, 0.93, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} />
      </RoundedBox>
      <mesh position={[2.35, 1.72, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[3.2, 0.18, 0.12]} />
        <meshStandardMaterial color={colors.gold} />
      </mesh>
      <mesh position={[0.45, 6.36, -0.7]} castShadow>
        <boxGeometry args={[0.82, 0.38, 0.82]} />
        <meshStandardMaterial color={colors.steel} />
      </mesh>
      <SiteBadge accent={colors.blueLight} type="hotel" />
    </group>
  )
}

function Hospital() {
  return (
    <group>
      <RoundedBox args={[3.8, 4.2, 5.25]} radius={0.24} smoothness={4} position={[0, 2.1, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={colors.hospital} roughness={0.72} />
      </RoundedBox>
      {[1.15, 2.15, 3.15].flatMap((y) =>
        [-1.75, -0.88, 0, 0.88, 1.75].map((z) => (
          <WindowPane key={`${y}-${z}`} position={[1.93, y, z]} size={[0.48, 0.5]} color="#4586a0" />
        )),
      )}
      <RoundedBox args={[0.9, 1.9, 3.5]} radius={0.14} smoothness={3} position={[2.05, 0.95, 0]} castShadow>
        <meshStandardMaterial color={colors.white} />
      </RoundedBox>
      <mesh position={[2.54, 1.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[3.9, 0.18, 0.12]} />
        <meshStandardMaterial color={colors.red} />
      </mesh>
      <mesh position={[2.55, 3.62, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.22, 0.95, 0.08]} />
        <meshBasicMaterial color={colors.red} />
      </mesh>
      <mesh position={[2.56, 3.62, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.95, 0.22, 0.08]} />
        <meshBasicMaterial color={colors.red} />
      </mesh>
      <SiteBadge accent={colors.red} type="hospital" />
    </group>
  )
}

const siteModels = [Plant, Restaurant, Hotel, Hospital]
const siteData = [
  { x: 4.35, scale: 0.76 },
  { x: -4.3, scale: 0.8 },
  { x: -4.4, scale: 0.64 },
  { x: -4.25, scale: 0.71 },
]

function Truck({ motionSpeed }) {
  const truck = useRef()
  const wheels = useRef([])

  useFrame(({ clock }) => {
    if (!truck.current) return
    const moving = motionSpeed.current > 0.01
    truck.current.position.y = 0.1 + (moving ? Math.sin(clock.elapsedTime * 8) * 0.018 : 0)
    wheels.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x -= motionSpeed.current * 0.065
    })
  })

  return (
    <group ref={truck} position={[0, 0.1, 0]} scale={0.92}>
      <RoundedBox args={[1.5, 1.6, 2.25]} radius={0.18} smoothness={4} position={[0, 1.22, 0.45]} castShadow>
        <meshStandardMaterial color={colors.cream} roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.46, 1.35, 1.15]} radius={0.2} smoothness={4} position={[0, 1.02, -1.22]} castShadow>
        <meshStandardMaterial color={colors.coral} roughness={0.48} />
      </RoundedBox>
      <mesh position={[0, 1.25, -1.82]} rotation={[Math.PI / 2, 0, 0]}>
        <RoundedBox args={[1.08, 0.52, 0.06]} radius={0.07} smoothness={3}>
          <meshStandardMaterial color={colors.glass} metalness={0.18} roughness={0.2} />
        </RoundedBox>
      </mesh>
      <mesh position={[0, 0.56, -1.81]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[1.1, 0.22, 0.08]} />
        <meshStandardMaterial color={colors.ink} roughness={0.62} />
      </mesh>
      <mesh position={[0.76, 1.15, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.58, 0.44, 0.04]} />
        <meshStandardMaterial color={colors.glass} metalness={0.18} roughness={0.2} />
      </mesh>
      <mesh position={[0.761, 1.18, 0.45]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.55, 0.18, 0.04]} />
        <meshBasicMaterial color={colors.blue} />
      </mesh>
      <mesh position={[-0.761, 1.18, 0.45]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.55, 0.18, 0.04]} />
        <meshBasicMaterial color={colors.blue} />
      </mesh>
      {[-0.68, 0.68].flatMap((x) =>
        [-1.16, 0.82].map((z) => (
          <group
            key={`${x}-${z}`}
            ref={(wheel) => {
              if (wheel && !wheels.current.includes(wheel)) wheels.current.push(wheel)
            }}
            position={[x, 0.52, z]}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.24, 24]} />
              <meshStandardMaterial color={colors.ink} roughness={0.88} />
            </mesh>
            <mesh position={[Math.sign(x) * 0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.03, 16]} />
              <meshStandardMaterial color="#b8c2c3" metalness={0.62} roughness={0.28} />
            </mesh>
          </group>
        )),
      )}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.78, -1.84]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 18]} />
          <meshStandardMaterial color={colors.white} emissive={colors.white} emissiveIntensity={1.2} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 1.59]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.34]} />
        <meshBasicMaterial color={colors.ink} />
      </mesh>
    </group>
  )
}

function RouteDisc() {
  return (
    <group>
      <mesh position={[0, -0.42, 0]} receiveShadow>
        <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, 0.72, 96]} />
        <meshStandardMaterial color={colors.soil} roughness={0.96} />
      </mesh>
      <mesh position={[0, -0.035, 0]} receiveShadow>
        <cylinderGeometry args={[DISC_RADIUS - 0.08, DISC_RADIUS - 0.08, 0.08, 96]} />
        <meshStandardMaterial color={colors.grass} roughness={0.97} />
      </mesh>
      <RoundedBox args={[ROAD_WIDTH, 0.12, ROAD_LENGTH]} radius={0.08} smoothness={3} position={[0, 0.055, 0]} receiveShadow>
        <meshStandardMaterial color={colors.road} roughness={0.98} />
      </RoundedBox>
      {[-ROAD_WIDTH / 2 + 0.12, ROAD_WIDTH / 2 - 0.12].map((x) => (
        <mesh key={x} position={[x, 0.125, 0]}>
          <boxGeometry args={[0.09, 0.025, ROAD_LENGTH - 0.18]} />
          <meshBasicMaterial color={colors.roadEdge} />
        </mesh>
      ))}
      <mesh position={[0, -0.81, 0]} receiveShadow>
        <cylinderGeometry args={[DISC_RADIUS + 0.65, DISC_RADIUS + 0.65, 0.08, 96]} />
        <meshStandardMaterial color="#b9cbc4" roughness={0.94} />
      </mesh>
    </group>
  )
}

function MovingRoute({ command, onStageChange, reducedMotion }) {
  const stages = useRef([])
  const trees = useRef([])
  const stripes = useRef([])
  const travel = useRef(0)
  const target = useRef(null)
  const pauseUntil = useRef(0)
  const lastCommand = useRef(0)
  const activeStage = useRef(0)
  const motionSpeed = useRef(0)

  useEffect(() => {
    if (!command.id || command.id === lastCommand.current) return
    lastCommand.current = command.id
    const current = ((travel.current % ROUTE_LENGTH) + ROUTE_LENGTH) % ROUTE_LENGTH
    const destination = command.stage * ROUTE_STAGE_SPACING
    let forwardDistance = (destination - current + ROUTE_LENGTH) % ROUTE_LENGTH
    if (forwardDistance < 0.025) forwardDistance = ROUTE_LENGTH
    target.current = travel.current + forwardDistance
    pauseUntil.current = Number.POSITIVE_INFINITY
  }, [command])

  useFrame((_, delta) => {
    let distanceStep = 0
    if (target.current !== null) {
      const remaining = target.current - travel.current
      if (reducedMotion || remaining < 0.012) {
        travel.current = target.current
        target.current = null
        pauseUntil.current = performance.now() / 1000 + ROUTE_PAUSE_SECONDS
      } else {
        distanceStep = Math.min(remaining, Math.max(5.6, remaining * 3.8) * delta)
        travel.current += distanceStep
      }
    } else if (!reducedMotion && performance.now() / 1000 >= pauseUntil.current) {
      distanceStep = ROUTE_CRUISE_SPEED * delta
      travel.current += distanceStep
    }
    motionSpeed.current = delta > 0 ? distanceStep / delta : 0

    const nextStage =
      Math.floor((travel.current + 0.08) / ROUTE_STAGE_SPACING) %
      ROUTE_STAGE_COUNT
    if (nextStage !== activeStage.current) {
      activeStage.current = nextStage
      onStageChange(nextStage)
    }

    stages.current.forEach((group, index) => {
      if (!group) return
      const { x, scale } = siteData[index]
      const z = wrapRouteDistance(travel.current - index * ROUTE_STAGE_SPACING)
      const pop = visibleScale(x, z)
      group.position.set(x, -0.28 * (1 - Math.min(pop, 1)), z)
      group.scale.setScalar(scale * pop)
      group.visible = pop > 0.001
    })

    treeData.forEach(([x, baseZ, scale], index) => {
      const tree = trees.current[index]
      if (!tree) return
      const z = wrapRouteDistance(baseZ + travel.current)
      const pop = visibleScale(x, z)
      tree.position.set(x, -0.2 * (1 - Math.min(pop, 1)), z)
      tree.scale.setScalar(scale * pop)
      tree.visible = pop > 0.001
    })

    stripes.current.forEach((stripe, index) => {
      if (!stripe) return
      stripe.position.z = wrapRouteDistance(-11 + index * 2 + travel.current)
      stripe.visible = Math.abs(stripe.position.z) < ROAD_LENGTH / 2 - 0.5
    })
  })

  return (
    <>
      {siteModels.map((Model, index) => (
        <group
          key={Model.name}
          ref={(group) => {
            stages.current[index] = group
          }}
        >
          <Model />
        </group>
      ))}
      {treeData.map(([x, z, , color], index) => (
        <group
          key={`${x}-${z}`}
          ref={(tree) => {
            trees.current[index] = tree
          }}
        >
          <Tree color={color} />
        </group>
      ))}
      {Array.from({ length: 12 }, (_, index) => (
        <mesh
          key={index}
          ref={(stripe) => {
            stripes.current[index] = stripe
          }}
          position={[0, 0.132, -11 + index * 2]}
        >
          <boxGeometry args={[0.11, 0.025, 0.95]} />
          <meshBasicMaterial color={colors.line} />
        </mesh>
      ))}
      <Truck motionSpeed={motionSpeed} />
    </>
  )
}

export function RouteWorld({
  command,
  onStageChange,
  reducedMotion = false,
}) {
  return (
    <>
      <color attach="background" args={[colors.sky]} />
      <fog attach="fog" args={[colors.sky, 28, 48]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#f7fbff', '#54724e', 1.2]} />
      <directionalLight
        castShadow
        position={[-8, 18, 10]}
        intensity={2.25}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0003}
      />
      <CameraRig />
      <group position={[0, -0.2, 0]}>
        <RouteDisc />
        <MovingRoute
          command={command}
          onStageChange={onStageChange}
          reducedMotion={reducedMotion}
        />
      </group>
    </>
  )
}
