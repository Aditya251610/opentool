'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import * as THREE from 'three'

const BRAND = '#0070F3'
const BRAND_DIM = '#003d8a'
const CONNECTION_DISTANCE = 2.2

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

function useParticleCount() {
  const [count, setCount] = useState(80)
  useEffect(() => {
    const w = window.innerWidth
    setCount(w < 768 ? 0 : w < 1024 ? 40 : 80)
  }, [])
  return count
}

/* Floating particle constellation — brand-blue only */
function ParticleField({ count = 80 }: { count?: number }) {
  const PARTICLE_COUNT = count
  const groupRef = useRef<THREE.Group>(null)
  const linesRef = useRef<THREE.LineSegments>(null)

  const { positions, velocities, geometry } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const vel = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2
      vel[i * 3] = (Math.random() - 0.5) * 0.003
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.003
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.002
      sizes[i] = Math.random() * 0.03 + 0.01
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    return { positions: pos, velocities: vel, geometry: geo }
  }, [])

  const lineGeo = useMemo(() => {
    const maxLines = PARTICLE_COUNT * PARTICLE_COUNT
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxLines * 6), 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  useFrame(() => {
    // Drift particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] += velocities[i * 3]
      positions[i * 3 + 1] += velocities[i * 3 + 1]
      positions[i * 3 + 2] += velocities[i * 3 + 2]

      // Soft boundary wrap
      if (Math.abs(positions[i * 3]) > 7) velocities[i * 3] *= -1
      if (Math.abs(positions[i * 3 + 1]) > 5) velocities[i * 3 + 1] *= -1
      if (Math.abs(positions[i * 3 + 2] + 1) > 5) velocities[i * 3 + 2] *= -1
    }

    // Update point positions
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    posAttr.array.set(positions)
    posAttr.needsUpdate = true

    // Draw connections between nearby particles
    const linePos = lineGeo.getAttribute('position') as THREE.BufferAttribute
    const arr = linePos.array as Float32Array
    let idx = 0

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < CONNECTION_DISTANCE) {
          arr[idx++] = positions[i * 3]
          arr[idx++] = positions[i * 3 + 1]
          arr[idx++] = positions[i * 3 + 2]
          arr[idx++] = positions[j * 3]
          arr[idx++] = positions[j * 3 + 1]
          arr[idx++] = positions[j * 3 + 2]
        }
      }
    }

    linePos.needsUpdate = true
    lineGeo.setDrawRange(0, idx / 3)

    // Gentle group rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0004
      groupRef.current.rotation.x += 0.0001
    }
  })

  return (
    <group ref={groupRef}>
      {/* Particles */}
      <points geometry={geometry}>
        <pointsMaterial
          size={0.035}
          color={BRAND}
          transparent
          opacity={0.5}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Connection lines */}
      <lineSegments ref={linesRef} geometry={lineGeo}>
        <lineBasicMaterial
          color={BRAND_DIM}
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

/* Subtle central glow — just a faint sphere */
function CenterGlow() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.08
      ref.current.scale.setScalar(s)
    }
  })

  return (
    <mesh ref={ref} position={[0, 0, -3]}>
      <sphereGeometry args={[2.5, 32, 32]} />
      <meshBasicMaterial
        color={BRAND}
        transparent
        opacity={0.015}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

/* Very gentle camera sway */
function CameraRig() {
  useFrame((state) => {
    const t = state.clock.elapsedTime
    state.camera.position.x = Math.sin(t * 0.04) * 0.15
    state.camera.position.y = Math.cos(t * 0.06) * 0.1
    state.camera.lookAt(0, 0, -2)
  })
  return null
}

function Scene({ particleCount }: { particleCount: number }) {
  return (
    <>
      <CameraRig />
      <CenterGlow />
      <ParticleField count={particleCount} />
    </>
  )
}

export default function Hero3D() {
  const isMobile = useIsMobile()
  const particleCount = useParticleCount()

  // Skip entire WebGL canvas on mobile for performance
  if (isMobile) return null

  return (
    <div className="absolute inset-0 opacity-40" style={{ zIndex: 0 }}>
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0, 7], fov: 50 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
          style={{ background: 'transparent' }}
          frameloop="always"
        >
          <Scene particleCount={particleCount} />
        </Canvas>
      </Suspense>
    </div>
  )
}
