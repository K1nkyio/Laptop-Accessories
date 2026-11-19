import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows, RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

interface Laptop3DProps {
  size?: number;
  isDark?: boolean;
}

function LaptopModel({ isDark = true }: { isDark?: boolean }) {
  const group = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.35;
    }
  });

  // Material palette — minimal, tasteful
  const bodyColor = isDark ? "#2a2a2e" : "#d8d8dc";
  const screenBezel = "#0a0a0c";
  const screenGlow = isDark ? "#3a4a5c" : "#5a6a7c";
  const keyColor = isDark ? "#1a1a1c" : "#3a3a3e";
  const accent = "#88898f";

  // Screen tilted open ~110°
  const screenAngle = -Math.PI * 0.6; // open

  return (
    <group ref={group} position={[0, -0.15, 0]} rotation={[0.15, 0.3, 0]}>
      {/* Base (keyboard deck) */}
      <RoundedBox args={[3.2, 0.12, 2.2]} radius={0.05} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.35} />
      </RoundedBox>

      {/* Keyboard recess */}
      <mesh position={[0, 0.061, 0.15]} receiveShadow>
        <boxGeometry args={[2.7, 0.005, 1.4]} />
        <meshStandardMaterial color={keyColor} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Trackpad */}
      <mesh position={[0, 0.062, -0.7]} receiveShadow>
        <boxGeometry args={[1.1, 0.005, 0.65]} />
        <meshStandardMaterial color={accent} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Key grid (subtle) */}
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 14 }).map((_, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[
              -1.25 + col * 0.19,
              0.07,
              -0.35 + row * 0.18,
            ]}
            castShadow
          >
            <boxGeometry args={[0.16, 0.018, 0.15]} />
            <meshStandardMaterial color={isDark ? "#222226" : "#404044"} roughness={0.7} />
          </mesh>
        ))
      )}

      {/* Hinge (visual) */}
      <mesh position={[0, 0.06, 1.05]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3.0, 16]} />
        <meshStandardMaterial color={accent} metalness={0.8} roughness={0.3} />
        <group rotation={[0, 0, Math.PI / 2]} />
      </mesh>

      {/* Screen lid — pivots from rear edge */}
      <group position={[0, 0.06, 1.1]} rotation={[screenAngle, 0, 0]}>
        <group position={[0, 1.0, 0]}>
          {/* Lid back */}
          <RoundedBox args={[3.2, 2.0, 0.08]} radius={0.05} smoothness={4} castShadow>
            <meshStandardMaterial color={bodyColor} metalness={0.7} roughness={0.35} />
          </RoundedBox>

          {/* Bezel */}
          <mesh position={[0, 0, 0.045]}>
            <boxGeometry args={[3.0, 1.85, 0.005]} />
            <meshStandardMaterial color={screenBezel} roughness={0.9} />
          </mesh>

          {/* Screen panel (emissive glow) */}
          <mesh position={[0, 0.02, 0.05]}>
            <boxGeometry args={[2.85, 1.7, 0.005]} />
            <meshStandardMaterial
              color={screenGlow}
              emissive={screenGlow}
              emissiveIntensity={isDark ? 0.6 : 0.25}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>

          {/* Camera dot */}
          <mesh position={[0, 0.92, 0.052]}>
            <sphereGeometry args={[0.018, 12, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function Laptop3D({ size = 600, isDark = true }: Laptop3DProps) {
  return (
    <div style={{ width: size, height: size }} className="shrink-0">
      <Canvas
        shadows
        dpr={[1.5, 2]}
        camera={{ position: [4, 2.6, 5], fov: 32 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={isDark ? 0.45 : 0.8} />
        <directionalLight
          position={[5, 6, 5]}
          intensity={isDark ? 1.1 : 1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 3, -3]} intensity={0.4} />

        <LaptopModel isDark={isDark} />

        <ContactShadows
          position={[0, -0.55, 0]}
          opacity={isDark ? 0.45 : 0.3}
          scale={8}
          blur={2.5}
          far={2}
        />
        <Environment preset={isDark ? "night" : "city"} />
      </Canvas>
    </div>
  );
}
