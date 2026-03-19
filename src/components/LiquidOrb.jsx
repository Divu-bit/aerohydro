import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float, Text } from '@react-three/drei';
import * as THREE from 'three';

/* ── Inner Orb Mesh ──────────────────────────────────────── */
function WaterOrb({ progress, onRipple }) {
  const meshRef = useRef();
  const [ripple, setRipple] = useState(0);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.rotation.x += delta * 0.08;
    }
    if (ripple > 0) setRipple(r => Math.max(0, r - delta * 3));
  });

  const handleClick = useCallback(() => {
    setRipple(1);
    onRipple?.();
  }, [onRipple]);

  const fillColor = useMemo(() => {
    if (progress >= 1) return '#22d3ee';
    if (progress >= 0.6) return '#38bdf8';
    return '#0ea5e9';
  }, [progress]);

  const distort = 0.25 + ripple * 0.4;
  const scale = 1.2 + progress * 0.3 + ripple * 0.15;

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group onClick={handleClick} style={{ cursor: 'pointer' }}>
        {/* Outer glow ring */}
        <mesh scale={[scale * 1.25, scale * 1.25, scale * 1.25]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={fillColor}
            transparent
            opacity={0.05 + ripple * 0.1}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Main orb */}
        <Sphere ref={meshRef} args={[1, 64, 64]} scale={scale}>
          <MeshDistortMaterial
            color={fillColor}
            distort={distort}
            speed={3}
            roughness={0.15}
            metalness={0.6}
            transparent
            opacity={0.7 + progress * 0.25}
            envMapIntensity={1.5}
          />
        </Sphere>

        {/* Inner bright core */}
        <Sphere args={[0.5, 32, 32]} scale={scale * 0.6}>
          <meshBasicMaterial
            color="#e0f2fe"
            transparent
            opacity={0.15 + progress * 0.2}
          />
        </Sphere>
      </group>
    </Float>
  );
}

/* ── Percent Label ───────────────────────────────────────── */
function PercentLabel({ progress }) {
  const pct = Math.min(100, Math.round(progress * 100));
  return (
    <Text
      position={[0, -2.2, 0]}
      fontSize={0.35}
      color="#e0f2fe"
      anchorX="center"
      anchorY="middle"
      font="https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2"
    >
      {pct}% Hydrated
    </Text>
  );
}

/* ── Exported component ──────────────────────────────────── */
export default function LiquidOrb({ progress = 0, onRipple }) {
  return (
    <div style={{ width: '100%', height: '320px', cursor: 'pointer' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-3, 2, 4]} intensity={0.8} color="#38bdf8" />
        <pointLight position={[3, -2, -4]} intensity={0.4} color="#06b6d4" />

        <WaterOrb progress={progress} onRipple={onRipple} />
        <PercentLabel progress={progress} />
      </Canvas>
    </div>
  );
}
