"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";

type FluidGlassProps = {
  mode?: "lens" | "bar" | "cube";
  lensProps?: {
    scale?: number;
    ior?: number;
    thickness?: number;
    chromaticAberration?: number;
    anisotropy?: number;
  };
  barProps?: Record<string, unknown>;
  cubeProps?: Record<string, unknown>;
  backgroundColor?: string;
};

const DEFAULT_LENS = {
  scale: 0.26,
  ior: 1.15,
  thickness: 5,
  chromaticAberration: 0.1,
  anisotropy: 0.01,
};

export default function FluidGlass({
  mode = "lens",
  lensProps = {},
  barProps = {},
  cubeProps = {},
  backgroundColor = "#08090c",
}: FluidGlassProps) {
  const modeProps = mode === "bar" ? barProps : mode === "cube" ? cubeProps : lensProps;
  const lensGeometry = useMemo(() => new THREE.SphereGeometry(2.3, 96, 96), []);
  const barGeometry = useMemo(() => new THREE.BoxGeometry(4.5, 1.1, 0.9, 64, 16, 32), []);
  const cubeGeometry = useMemo(() => new THREE.BoxGeometry(2.8, 2.8, 2.8, 64, 64, 64), []);

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 28 }}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }}
      style={{ background: backgroundColor }}
    >
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 8]} intensity={1.1} />
      <pointLight position={[-3, -2, 6]} intensity={2} color="#67e8f9" />
      <Backdrop />
      {mode === "bar" ? (
        <FluidObject
          geometry={barGeometry}
          modeProps={modeProps}
          backgroundColor={backgroundColor}
        />
      ) : mode === "cube" ? (
        <FluidObject
          geometry={cubeGeometry}
          modeProps={modeProps}
          backgroundColor={backgroundColor}
        />
      ) : (
        <FluidObject
          geometry={lensGeometry}
          modeProps={{ ...DEFAULT_LENS, ...modeProps }}
          backgroundColor={backgroundColor}
        />
      )}
    </Canvas>
  );
}

function FluidObject({
  geometry,
  modeProps,
  backgroundColor,
}: {
  geometry: THREE.BufferGeometry;
  modeProps: Record<string, unknown>;
  backgroundColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const { pointer, viewport } = state;
    if (!meshRef.current) return;

    const targetX = pointer.x * 0.35;
    const targetY = pointer.y * 0.2;
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.rotation.x += delta * 0.08;
    meshRef.current.rotation.y += delta * 0.12;

    const scale = typeof modeProps.scale === "number" ? modeProps.scale : 1;
    meshRef.current.scale.setScalar(scale * Math.min(viewport.width / 10, viewport.height / 10));
  });

  const ior = typeof modeProps.ior === "number" ? modeProps.ior : 1.15;
  const thickness = typeof modeProps.thickness === "number" ? modeProps.thickness : 5;
  const chromaticAberration = typeof modeProps.chromaticAberration === "number" ? modeProps.chromaticAberration : 0.1;
  const anisotropy = typeof modeProps.anisotropy === "number" ? modeProps.anisotropy : 0.01;

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]}>
      <MeshTransmissionMaterial
        background={new THREE.Color(backgroundColor)}
        transmission={1}
        roughness={0.08}
        thickness={thickness}
        ior={ior}
        chromaticAberration={chromaticAberration}
        anisotropy={anisotropy}
        distortion={0.25}
        distortionScale={0.55}
        temporalDistortion={0.16}
        clearcoat={1}
        clearcoatRoughness={0.08}
      />
    </mesh>
  );
}

function Backdrop() {
  return (
    <group>
      <mesh position={[0, 0, -6]}>
        <planeGeometry args={[30, 18]} />
        <meshBasicMaterial color="#05070b" />
      </mesh>
      <mesh position={[-3, 1.5, -4]}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} />
      </mesh>
      <mesh position={[3.2, -1.2, -3.5]}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.07} />
      </mesh>
    </group>
  );
}
