import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LINEN_TIMELINE, TRUCK_TIMELINE } from './heroTimeline'

const MOBILE_BREAKPOINT = 800
const DESKTOP_FOV = 34

const colors = {
  ink: '#34383a',
  darkInk: '#232628',
  cream: '#ededeb',
  paper: '#dcdddb',
  coral: '#707578',
  blue: '#898e91',
  paleBlue: '#c8cac9',
  gold: '#a9adae',
  green: '#656a6c',
  grass: '#969a98',
  concrete: '#c4c6c5',
  steel: '#7d8284',
  window: '#565c60',
  signalRed: '#c73d36',
  white: '#f5f5f3',
}

const pizzaSliceShape = new THREE.Shape()
pizzaSliceShape.moveTo(-0.34, -0.3)
pizzaSliceShape.lineTo(0.34, -0.3)
pizzaSliceShape.lineTo(0, 0.4)
pizzaSliceShape.closePath()

const smooth = (value, start, end) => THREE.MathUtils.smoothstep(value, start, end)
const smoother = (value, start, end) => THREE.MathUtils.smootherstep(value, start, end)

const middleLinenProgress = (scrollProgress) =>
  LINEN_TIMELINE.initialMiddleProgress +
  scrollProgress / LINEN_TIMELINE.end

const linenProgress = (scrollProgress, index) =>
  THREE.MathUtils.clamp(
    middleLinenProgress(scrollProgress) + (1 - index) * LINEN_TIMELINE.spacing,
    0,
    1,
  )

const truckProgress = (scrollProgress, index) => {
  const loadingSequence = 2 - index
  const departure =
    TRUCK_TIMELINE.middleDeparture +
    (loadingSequence - 1) * TRUCK_TIMELINE.departureSpacing
  return smoother(
    scrollProgress,
    departure,
    TRUCK_TIMELINE.driveEnd + (loadingSequence - 1) * 0.012,
  )
}

const processCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-24.15, 1.08, 0),
    new THREE.Vector3(-21.7, 1.08, 0),
    new THREE.Vector3(-18.55, 1.08, 0),
    new THREE.Vector3(-15.55, 1.08, 0),
    new THREE.Vector3(-12.2, 1.08, 0),
    new THREE.Vector3(-8.55, 1.08, 0),
    new THREE.Vector3(-7.52, 1.08, 0),
  ],
  false,
  'centripetal',
)

const processConveyorStart = -25.35
const processConveyorEnd = -7.52
const loadingLanes = [2.4, 0, -2.4]
// From this camera angle, negative Z is the top loading bay on screen.
const linenTruckOrder = [2, 1, 0]
const truckHeight = 0.92
const truckRearX = -6.02
const roadDeckY = 0.36
const roadDeckHeight = 0.1
const customerBaseY = roadDeckY + roadDeckHeight / 2 + 0.01

const loadingForkCurves = loadingLanes.map((z) => {
  const direction = Math.sign(z)
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-7.5, 1.08, direction * 0.58),
      new THREE.Vector3(-7.02, 1.1, z * 0.35),
      new THREE.Vector3(-6.38, 1.12, z * 0.76),
      new THREE.Vector3(truckRearX, 1.14, z),
    ],
    false,
    'centripetal',
  )
})

const loadingTransferCurves = loadingLanes.map((z) =>
  new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-7.52, 1.33, 0),
      new THREE.Vector3(-7.02, 1.35, z * 0.32),
      new THREE.Vector3(-6.4, 1.38, z * 0.74),
      new THREE.Vector3(truckRearX, 1.4, z),
      new THREE.Vector3(-5.5, 1.43, z),
    ],
    false,
    'centripetal',
  ),
)

const customerSites = [
  {
    id: 'restaurant',
    position: [11.5, customerBaseY, 7.9],
    stop: [8.4, truckHeight, 7.9],
    lane: 7.9,
    color: colors.coral,
    roofY: customerBaseY + 2.1,
  },
  {
    id: 'hotel',
    position: [12.7, customerBaseY, 0],
    stop: [9.4, truckHeight, 0],
    lane: 0,
    color: colors.blue,
    roofY: customerBaseY + 7.12,
  },
  {
    id: 'hospital',
    position: [12.5, customerBaseY, -8.1],
    stop: [8.7, truckHeight, -8.1],
    lane: -8.1,
    color: colors.green,
    roofY: customerBaseY + 5.48,
  },
]

const truckCurves = customerSites.map((site, index) => {
  const startZ = loadingLanes[index]
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-4.35, truckHeight, startZ),
      new THREE.Vector3(-2.8, truckHeight, startZ),
      new THREE.Vector3(-0.8, truckHeight, startZ + (site.lane - startZ) * 0.24),
      new THREE.Vector3(2.3, truckHeight, site.lane),
      new THREE.Vector3(site.stop[0] - 2.2, truckHeight, site.lane),
      new THREE.Vector3(...site.stop),
    ],
    false,
    'centripetal',
  )
})

function CameraRig({ scrollProgress }) {
  const { camera, pointer, size } = useThree()
  const target = useRef(new THREE.Vector3(-21.4, 0.9, 0))
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
    const trackedLinenProgress = Math.min(
      middleLinenProgress(scrollProgress),
      LINEN_TIMELINE.processEnd,
    )
    processCurve.getPointAt(
      trackedLinenProgress / LINEN_TIMELINE.processEnd,
      processPoint,
    )

    truckFocus.set(0, 0, 0)
    truckCurves.forEach((curve, index) =>
      truckFocus.add(curve.getPointAt(truckProgress(scrollProgress, index))),
    )
    truckFocus.divideScalar(truckCurves.length)

    const followBlend = smooth(scrollProgress, 0.34, 0.53)
    desiredTarget.lerpVectors(processPoint, truckFocus, followBlend)

    const reveal = smooth(scrollProgress, 0.58, 0.82)
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
    const loadingAngle = smooth(scrollProgress, 0.3, 0.52) * (1 - reveal)
    desiredPosition.x -= loadingAngle * (mobile ? 1.1 : 1.8)
    desiredPosition.y -= loadingAngle * (mobile ? 1.7 : 3)
    desiredPosition.z += loadingAngle * (mobile ? 0.9 : 1.6)
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
        <meshBasicMaterial color={colors.paleBlue} />
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
}) {
  const rollers = Array.from({ length: Math.ceil(length / 0.48) }, (_, index) => -length / 2 + 0.24 + index * 0.48)

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
      {rollers.map((x) => (
        <group key={x} position={[x, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, width - 0.14, 10]} />
            <meshStandardMaterial color={colors.concrete} metalness={0.65} roughness={0.28} />
          </mesh>
        </group>
      ))}
      {[-width / 2 - 0.05, width / 2 + 0.05].map((z) => (
        <mesh key={z} position={[0, 0.16, z]}>
          <boxGeometry args={[length, 0.1, 0.08]} />
          <meshStandardMaterial color={colors.steel} metalness={0.25} roughness={0.46} />
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

function createRibbonGeometry(curve, width, thickness, segments = 36) {
  const positions = []
  const indices = []
  const up = new THREE.Vector3(0, 1, 0)
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const lateral = new THREE.Vector3()

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    curve.getPointAt(progress, point)
    curve.getTangentAt(progress, tangent).normalize()
    lateral.crossVectors(up, tangent).normalize().multiplyScalar(width / 2)

    positions.push(
      point.x + lateral.x, point.y + thickness / 2, point.z + lateral.z,
      point.x - lateral.x, point.y + thickness / 2, point.z - lateral.z,
      point.x + lateral.x, point.y - thickness / 2, point.z + lateral.z,
      point.x - lateral.x, point.y - thickness / 2, point.z - lateral.z,
    )
  }

  for (let index = 0; index < segments; index += 1) {
    const current = index * 4
    const next = (index + 1) * 4
    indices.push(
      current, next, current + 1,
      current + 1, next, next + 1,
      current + 2, current + 3, next + 2,
      current + 3, next + 3, next + 2,
      current, current + 2, next,
      current + 2, next + 2, next,
      current + 1, next + 1, current + 3,
      current + 3, next + 1, next + 3,
    )
  }

  indices.push(0, 1, 2, 1, 3, 2)
  const last = segments * 4
  indices.push(last, last + 2, last + 1, last + 1, last + 2, last + 3)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function offsetCurve(curve, lateralOffset, verticalOffset = 0) {
  const up = new THREE.Vector3(0, 1, 0)
  const point = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const lateral = new THREE.Vector3()
  const points = Array.from({ length: 37 }, (_, index) => {
    const progress = index / 36
    curve.getPointAt(progress, point)
    curve.getTangentAt(progress, tangent).normalize()
    lateral.crossVectors(up, tangent).normalize()
    return point
      .clone()
      .addScaledVector(lateral, lateralOffset)
      .addScaledVector(up, verticalOffset)
  })
  return new THREE.CatmullRomCurve3(points, false, 'centripetal')
}

function CurvedConveyor({ curve, width = 0.86 }) {
  const bodyGeometry = useMemo(
    () => createRibbonGeometry(curve, width, 0.16),
    [curve, width],
  )
  const beltCurve = useMemo(() => offsetCurve(curve, 0, 0.1), [curve])
  const beltGeometry = useMemo(
    () => createRibbonGeometry(beltCurve, width - 0.16, 0.045),
    [beltCurve, width],
  )
  const railCurves = useMemo(
    () => [
      offsetCurve(curve, width / 2 + 0.045, 0.16),
      offsetCurve(curve, -width / 2 - 0.045, 0.16),
    ],
    [curve, width],
  )
  const rollers = useMemo(() => {
    const count = Math.max(3, Math.floor(curve.getLength() / 0.46))
    const up = new THREE.Vector3(0, 1, 0)
    return Array.from({ length: count }, (_, index) => {
      const progress = (index + 0.5) / count
      const position = curve.getPointAt(progress)
      position.y += 0.145
      const tangent = curve.getTangentAt(progress).normalize()
      const lateral = new THREE.Vector3().crossVectors(up, tangent).normalize()
      return {
        position,
        quaternion: new THREE.Quaternion().setFromUnitVectors(up, lateral),
      }
    })
  }, [curve])

  useEffect(
    () => () => {
      bodyGeometry.dispose()
      beltGeometry.dispose()
    },
    [beltGeometry, bodyGeometry],
  )

  return (
    <group>
      <mesh geometry={bodyGeometry} receiveShadow>
        <meshStandardMaterial color={colors.darkInk} roughness={0.68} />
      </mesh>
      <mesh geometry={beltGeometry}>
        <meshStandardMaterial color={colors.blue} roughness={0.42} metalness={0.22} />
      </mesh>
      {railCurves.map((railCurve, index) => (
        <mesh key={index}>
          <tubeGeometry args={[railCurve, 36, 0.04, 8, false]} />
          <meshStandardMaterial color={colors.steel} metalness={0.3} roughness={0.42} />
        </mesh>
      ))}
      {rollers.map(({ position, quaternion }, index) => (
        <mesh key={index} position={position} quaternion={quaternion}>
          <cylinderGeometry args={[0.045, 0.045, width - 0.14, 10]} />
          <meshStandardMaterial color={colors.concrete} metalness={0.65} roughness={0.28} />
        </mesh>
      ))}
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

function LinenLoads({ scrollProgress }) {
  const loads = useRef([])
  const processPoint = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    loads.current.forEach((load, index) => {
      if (!load) return
      const progress = linenProgress(scrollProgress, index)

      if (progress <= LINEN_TIMELINE.processEnd) {
        processCurve.getPointAt(
          progress / LINEN_TIMELINE.processEnd,
          processPoint,
        )
        load.position.copy(processPoint)
        load.position.y += 0.25
        load.scale.setScalar(1)
      } else {
        const transferProgress = smooth(
          progress,
          LINEN_TIMELINE.processEnd,
          1,
        )
        loadingTransferCurves[linenTruckOrder[index]].getPointAt(
          transferProgress,
          processPoint,
        )
        load.position.copy(processPoint)
        load.scale.setScalar(THREE.MathUtils.lerp(1, 0.54, transferProgress))
      }

      load.visible = progress < 1
    })
  })

  return (
    <>
      {linenTruckOrder.map((truckIndex, index) => {
        const site = customerSites[truckIndex]
        const linenColor =
          site.id === 'restaurant'
            ? colors.concrete
            : site.id === 'hospital'
              ? colors.gold
              : colors.paleBlue

        return (
          <group
            key={site.id}
            ref={(load) => {
              loads.current[index] = load
            }}
          >
            <LinenStack color={linenColor} />
          </group>
        )
      })}
    </>
  )
}

function TunnelWasher() {
  const drum = useRef()

  useFrame((_, delta) => {
    if (drum.current) drum.current.rotation.y += delta * 0.38
  })

  return (
    <group position={[-20.7, 2.05, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.72, 1.72, 3.8, 48, 1, true]} />
          <meshStandardMaterial color="#d7d9d8" metalness={0.16} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={drum}>
          <cylinderGeometry args={[1.35, 1.35, 3.88, 36, 1, true]} />
          <meshStandardMaterial
            color="#686d70"
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
    <group position={[-14.75, 0.3, 0]}>
      <RoundedBox args={[2.9, 2.35, 3.1]} radius={0.22} smoothness={4} position={[0, 2.48, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d4d6d5" roughness={0.6} metalness={0.16} />
      </RoundedBox>
      <mesh position={[0, 2.48, 1.59]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 0.16, 40]} />
        <meshStandardMaterial color={colors.darkInk} metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.48, 1.69]}>
        <circleGeometry args={[0.66, 36]} />
        <meshStandardMaterial color="#7d8285" metalness={0.2} roughness={0.24} transparent opacity={0.74} />
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
    <group position={[-8.65, 0.3, 0]}>
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
        <meshStandardMaterial color="#d3d5d4" roughness={0.58} metalness={0.14} />
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
      <mesh position={[0, 3.32, 0]} castShadow>
        <boxGeometry args={[0.55, 1.1, 11.35]} />
        <meshStandardMaterial color={colors.cream} roughness={0.8} />
      </mesh>
      {[-5.42, 5.42].map((z) => (
        <mesh key={z} position={[0, 1.52, z]} castShadow>
          <boxGeometry args={[0.55, 4.15, 0.52]} />
          <meshStandardMaterial color={colors.cream} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[-0.34, 2.42, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[9.95, 0.12, 0.08]} />
        <meshStandardMaterial color={colors.steel} metalness={0.5} />
      </mesh>
      {[-3.5, 0, 3.5].map((z) => (
        <mesh key={z} position={[-0.37, 1.35, z]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[2.45, 1.95, 0.07]} />
          <meshStandardMaterial color={colors.window} transparent opacity={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.38, 3.58, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.1, 0.42, 0.07]} />
        <meshStandardMaterial color={colors.ink} />
      </mesh>
      <mesh position={[-0.425, 3.58, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.45, 0.045, 0.012]} />
        <meshBasicMaterial color={colors.cream} />
      </mesh>
    </group>
  )
}

function Plant({ scrollProgress }) {
  return (
    <group>
      <RoundedBox args={[23.2, 0.4, 14.2]} radius={0.35} smoothness={4} position={[-14.6, 0, 0]} receiveShadow>
        <meshStandardMaterial color="#b9bcba" roughness={0.96} />
      </RoundedBox>
      <mesh position={[-14.6, 0.25, -6.75]} receiveShadow>
        <boxGeometry args={[22.7, 0.08, 0.2]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[-25.8, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 4.2, 13.5]} />
        <meshStandardMaterial color={colors.cream} roughness={0.84} />
      </mesh>
      <mesh position={[-14.45, 2.1, -6.6]} castShadow receiveShadow>
        <boxGeometry args={[22.7, 4.2, 0.26]} />
        <meshStandardMaterial color="#dedfdd" roughness={0.84} />
      </mesh>
      {[-22.8, -18.3, -13.8, -9.3].map((x) => (
        <Window key={x} position={[x, 2.65, -6.45]} size={[2.05, 0.92]} color="#73787b" />
      ))}
      <Conveyor
        position={[(processConveyorStart + processConveyorEnd) / 2, 1, 0]}
        length={processConveyorEnd - processConveyorStart}
      />
      {loadingForkCurves.map((curve, index) => (
        <CurvedConveyor key={loadingLanes[index]} curve={curve} />
      ))}
      <TunnelWasher />
      <IndustrialDryer />
      <LinenFolder />
      <PlantDoor />
      {[-6.25, -5.15].map((x, index) => (
        <group key={x} position={[x, 0.44, index ? 4.2 : -4.2]}>
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
      <LinenLoads scrollProgress={scrollProgress} />
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
          <meshStandardMaterial color={colors.window} metalness={0.12} roughness={0.2} />
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
      {[-1.02, 0.92].flatMap((x) =>
        [-0.82, 0.82].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0.52, z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.37, 0.37, 0.42, 24]} />
              <meshStandardMaterial color={colors.darkInk} roughness={0.84} />
            </mesh>
            <mesh position={[0, 0, Math.sign(z) * 0.225]}>
              <torusGeometry args={[0.28, 0.085, 10, 24]} />
              <meshStandardMaterial color="#2d3032" roughness={0.88} />
            </mesh>
            <mesh
              position={[0, 0, Math.sign(z) * 0.24]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.12, 0.12, 0.055, 18]} />
              <meshStandardMaterial color="#aeb1af" metalness={0.68} roughness={0.3} />
            </mesh>
          </group>
        )),
      )}
      {[-0.34, 0.34].map((z) => (
        <mesh key={z} position={[1.515, 0.72, z]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.09, 16]} />
          <meshStandardMaterial color={colors.white} emissive={colors.white} emissiveIntensity={0.45} />
        </mesh>
      ))}
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
    const progress = truckProgress(scrollProgress, index)
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
    <group position={[0, roadDeckY, 0]}>
      {customerSites.map((site) => (
        <group key={site.id}>
          <mesh position={[4.4, 0, site.lane]} receiveShadow>
            <boxGeometry args={[19.8, 0.1, 2.75]} />
            <meshStandardMaterial color="#555a5c" roughness={0.98} />
          </mesh>
          {Array.from({ length: 9 }, (_, index) => (
            <mesh key={index} position={[-3.2 + index * 2.05, 0.075, site.lane]}>
              <boxGeometry args={[1.05, 0.025, 0.11]} />
              <meshBasicMaterial color="#c9cbca" />
            </mesh>
          ))}
          {[-1.36, 1.36].map((offset) => (
            <mesh key={offset} position={[4.4, 0.08, site.lane + offset]}>
              <boxGeometry args={[19.8, 0.12, 0.12]} />
              <meshStandardMaterial color="#d2d4d3" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[-1.8, -0.01, 0]} receiveShadow>
        <boxGeometry args={[3.2, 0.1, 18.75]} />
        <meshStandardMaterial color="#555a5c" roughness={0.98} />
      </mesh>
      {customerSites.flatMap((site) =>
        [-0.72, -0.24, 0.24, 0.72].map((offset) => (
          <mesh key={`${site.id}-${offset}`} position={[9.8 + offset, 0.07, site.lane]}>
            <boxGeometry args={[0.22, 0.02, 1.8]} />
            <meshBasicMaterial color="#e1e2e0" />
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
        <meshStandardMaterial color="#c7c9c8" roughness={0.82} />
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
        <meshStandardMaterial color="#c5c7c6" roughness={0.82} />
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
        <meshStandardMaterial color="#d0d2d1" roughness={0.78} />
      </RoundedBox>
      <RoundedBox args={[1.3, 2.4, 4.2]} radius={0.16} smoothness={3} position={[-3.05, 1.2, 0]} castShadow>
        <meshStandardMaterial color={colors.cream} />
      </RoundedBox>
      {[1.25, 2.35, 3.45].flatMap((y) =>
        [-2.5, -1.25, 0, 1.25, 2.5].map((z) => (
          <Window key={`${y}-${z}`} position={[-2.87, y, z]} rotation={[0, -Math.PI / 2, 0]} size={[0.6, 0.55]} color="#5c6265" />
        )),
      )}
      <mesh position={[-3.74, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[1.28, 1.28, 0.16]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[-3.84, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.25, 0.88, 0.06]} />
        <meshStandardMaterial color={colors.signalRed} />
      </mesh>
      <mesh position={[-3.84, 3.65, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[0.88, 0.25, 0.06]} />
        <meshStandardMaterial color={colors.signalRed} />
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
        <meshStandardMaterial color="#626564" />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <dodecahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial color={colors.grass} roughness={0.95} />
      </mesh>
      <mesh position={[-0.34, 1.2, 0.16]} castShadow>
        <dodecahedronGeometry args={[0.46, 1]} />
        <meshStandardMaterial color="#878b89" roughness={0.95} />
      </mesh>
    </group>
  )
}

function SignIcon({ type }) {
  if (type === 'hospital') {
    return (
      <group position={[0, 0, 0.1]}>
        <mesh>
          <boxGeometry args={[0.22, 0.78, 0.04]} />
          <meshBasicMaterial color={colors.signalRed} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.78, 0.22, 0.04]} />
          <meshBasicMaterial color={colors.signalRed} />
        </mesh>
      </group>
    )
  }

  if (type === 'hotel') {
    return (
      <group position={[0, -0.04, 0.1]}>
        <RoundedBox args={[0.78, 0.3, 0.04]} radius={0.07} smoothness={3}>
          <meshBasicMaterial color={colors.white} />
        </RoundedBox>
        <mesh position={[-0.37, 0.14, 0]}>
          <boxGeometry args={[0.12, 0.58, 0.04]} />
          <meshBasicMaterial color={colors.white} />
        </mesh>
        <RoundedBox args={[0.22, 0.12, 0.025]} radius={0.04} smoothness={3} position={[-0.2, 0.04, 0.035]}>
          <meshBasicMaterial color={colors.darkInk} />
        </RoundedBox>
      </group>
    )
  }

  return (
    <group position={[0, 0, 0.1]}>
      <mesh>
        <shapeGeometry args={[pizzaSliceShape]} />
        <meshBasicMaterial color={colors.white} />
      </mesh>
      <mesh position={[0, -0.27, 0.03]}>
        <boxGeometry args={[0.72, 0.11, 0.04]} />
        <meshBasicMaterial color={colors.white} />
      </mesh>
    </group>
  )
}

function CustomerSign({ site }) {
  return (
    <group position={[site.position[0], site.roofY, site.position[2]]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.44, 12]} />
        <meshStandardMaterial color={colors.steel} metalness={0.18} roughness={0.62} />
      </mesh>
      <Billboard position={[0, 1.62, 0]}>
        <RoundedBox args={[1.65, 1.18, 0.14]} radius={0.14} smoothness={4} castShadow>
          <meshStandardMaterial color={colors.darkInk} roughness={0.72} />
        </RoundedBox>
        <SignIcon type={site.id} />
      </Billboard>
    </group>
  )
}

function CustomerWorld() {
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
      {customerSites.map((site) => (
        <CustomerSign
          key={site.id}
          site={site}
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
      <hemisphereLight args={[colors.white, '#8a8e8c', 1.05]} />
      <directionalLight
        castShadow
        position={[-8, 18, 12]}
        intensity={1.85}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={28}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.00035}
      />
      <CameraRig scrollProgress={scrollProgress} />

      <group position={[0, -0.22, 0]}>
        <RoundedBox args={[51, 0.42, 29]} radius={0.6} smoothness={5} position={[-3.4, 0, 0]} receiveShadow>
          <meshStandardMaterial color="#b8bbb9" roughness={0.96} />
        </RoundedBox>
        <RoundedBox args={[50.3, 0.08, 28.3]} radius={0.5} smoothness={4} position={[-3.4, 0.24, 0]} receiveShadow>
          <meshStandardMaterial color="#afb2b0" roughness={0.95} />
        </RoundedBox>
        <Plant scrollProgress={scrollProgress} />
        <CustomerWorld />
        {customerSites.map((site, index) => (
          <MovingTruck key={site.id} index={index} scrollProgress={scrollProgress} />
        ))}
      </group>
    </>
  )
}
