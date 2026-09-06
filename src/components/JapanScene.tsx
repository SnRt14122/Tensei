"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { ArrowLeft } from "lucide-react";
import * as THREE from "three";

type Point = [number, number, number];
type Phase = "ready" | "flight" | "explosion";
type Shot = { id: number; point: Point };

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="japan-scene-status" role="alert">三维场景加载失败，请返回后重试。</div> : this.props.children; }
}

function Camera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const view = camera as THREE.OrthographicCamera;
    view.position.set(0, 34, 16);
    view.lookAt(0, 0, 0);
    // R3F owns the camera object, but Three.js requires this imperative resize update.
    // eslint-disable-next-line react-hooks/immutability
    view.zoom = Math.min(size.width / 24, size.height / 25);
    view.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Land({ onStrike }: { onStrike: (point: Point) => void }) {
  const raw = useLoader(THREE.FileLoader, "/assets/japan/land.json") as string;
  const texture = useTexture("/assets/japan/satellite.webp");
  const geometries = useMemo(() => {
    const polygons = JSON.parse(raw) as number[][][][];
    return polygons.map(rings => {
      const points = (ring: number[][]) => ring.map(([lon, lat]) => new THREE.Vector2((lon - 134.5) * 0.82, lat - 35));
      const shape = new THREE.Shape(points(rings[0]));
      shape.holes = rings.slice(1).map(ring => new THREE.Path(points(ring)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: false, steps: 1 });
      const positions = geometry.getAttribute("position");
      const uv = geometry.getAttribute("uv");
      for (let i = 0; i < positions.count; i++) uv.setXY(i, (positions.getX(i) / 0.82 + 12.5) / 25, (positions.getY(i) + 11) / 22);
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    });
  }, [raw]);
  useEffect(() => () => geometries.forEach(geometry => geometry.dispose()), [geometries]);
  return <group>{geometries.map((geometry, index) => <mesh key={index} geometry={geometry}
    onClick={event => { event.stopPropagation(); onStrike([event.point.x, 0.28, event.point.z]); }}>
    <meshStandardMaterial attach="material-0" map={texture} roughness={0.9} />
    <meshStandardMaterial attach="material-1" color="#65816b" roughness={1} />
  </mesh>)}</group>;
}

function Strike({ shot, onPhase, onComplete }: { shot: Shot; onPhase: (phase: Phase) => void; onComplete: () => void }) {
  const projectile = useRef<THREE.Group>(null);
  const burst = useRef<THREE.Group>(null);
  const fire = useRef<THREE.Mesh>(null);
  const shock = useRef<THREE.Mesh>(null);
  const smoke = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const exploded = useRef(false);
  const finished = useRef(false);
  const flight = useMemo(() => {
    const end = new THREE.Vector3(...shot.point);
    const start = end.clone().add(new THREE.Vector3(-7, 10, 4));
    return { end, start, rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()) };
  }, [shot]);

  useFrame(({ clock }) => {
    started.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - started.current;
    if (projectile.current) {
      projectile.current.visible = elapsed < 0.65;
      projectile.current.position.lerpVectors(flight.start, flight.end, Math.min(1, elapsed / 0.65));
      projectile.current.quaternion.copy(flight.rotation);
    }
    if (!burst.current || elapsed < 0.65) return;
    if (!exploded.current) { exploded.current = true; onPhase("explosion"); }
    burst.current.visible = true;
    const t = elapsed - 0.65;
    if (fire.current) {
      fire.current.scale.setScalar(0.08 + Math.sin(Math.min(1, t / 1.15) * Math.PI) * 1.2);
      (fire.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - t / 1.2);
    }
    if (shock.current) {
      shock.current.scale.setScalar(0.1 + t * 3.2);
      (shock.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - t / 3);
    }
    if (smoke.current) {
      smoke.current.scale.setScalar(Math.min(1.2, t * 1.3));
      smoke.current.position.y = t * 0.5;
      smoke.current.children.forEach(child => { ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = Math.max(0, Math.min(0.85, t * 2) * (1 - t / 3.2)); });
    }
    sparks.current?.children.forEach((child, index) => {
      const angle = index * 2.39996;
      const speed = 1.6 + index % 4 * 0.45;
      child.position.set(Math.cos(angle) * speed * t, Math.max(0, 0.3 + (2 + index % 3) * t - 2.4 * t * t), Math.sin(angle) * speed * t);
      child.scale.setScalar(Math.max(0, 1 - t / 1.5));
    });
    if (t > 3.2 && !finished.current) { finished.current = true; onComplete(); }
  });

  return <>
    <group ref={projectile}>
      <mesh><capsuleGeometry args={[0.16, 0.48, 4, 12]} /><meshStandardMaterial color="#dadfe1" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, -0.28, 0]}><boxGeometry args={[0.55, 0.12, 0.06]} /><meshStandardMaterial color="#788990" /></mesh>
      <mesh position={[0, -0.28, 0]}><boxGeometry args={[0.06, 0.12, 0.55]} /><meshStandardMaterial color="#788990" /></mesh>
      <mesh position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.09, 1, 8]} /><meshBasicMaterial color="#ffe6b5" transparent opacity={0.7} /></mesh>
    </group>
    <group ref={burst} position={shot.point} visible={false}>
      <mesh ref={fire} position={[0, 0.4, 0]}><sphereGeometry args={[1, 24, 16]} /><meshBasicMaterial color="#ffd073" transparent depthWrite={false} /></mesh>
      <mesh ref={shock} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[0.91, 1, 64]} /><meshBasicMaterial color="#d6edee" transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <group ref={smoke}>
        {Array.from({ length: 15 }, (_, index) => {
          const cap = index > 4;
          const angle = index * 2.39996;
          return <mesh key={index} position={cap ? [Math.cos(angle) * 0.95, 2.2 + (index % 3) * 0.15, Math.sin(angle) * 0.95] : [Math.sin(angle) * 0.16, index * 0.45, Math.cos(angle) * 0.16]} scale={cap ? [0.85, 0.5, 0.8] : [0.36, 0.5, 0.36]}>
            <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={cap ? "#a5a39e" : "#746e64"} transparent opacity={0} depthWrite={false} roughness={1} />
          </mesh>;
        })}
      </group>
      <group ref={sparks}>{Array.from({ length: 28 }, (_, index) => <mesh key={index}><sphereGeometry args={[0.055, 6, 4]} /><meshBasicMaterial color="#ffb54e" /></mesh>)}</group>
    </group>
  </>;
}

export default function JapanScene({ onReturn }: { onReturn: () => void }) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const returnButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    returnButton.current?.focus();
    function keyDown(event: KeyboardEvent) { if (event.key === "Escape") onReturn(); }
    window.addEventListener("keydown", keyDown);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keyDown); };
  }, [onReturn]);
  function strike(point: Point) {
    if (shot) return;
    setShot({ id: Date.now(), point });
    setPhase("flight");
  }
  return createPortal(<section className="japan-scene" role="dialog" aria-modal="true" aria-label="日本三维场景" data-phase={phase}>
    <button ref={returnButton} className="japan-scene-return" onClick={onReturn}><ArrowLeft size={18} />返回</button>
    <SceneBoundary>
      <Canvas orthographic dpr={[1, 1.5]} camera={{ position: [0, 34, 16], near: 0.1, far: 150 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }} role="button" tabIndex={0} aria-label="日本地图"
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); strike([2, 0.28, -1]); } }}
        fallback={<div className="japan-scene-status">此浏览器不支持三维图形。</div>}>
        <color attach="background" args={["#174653"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[-8, 18, 5]} intensity={2} />
        <Camera />
        <Suspense fallback={<Html center><span>加载中...</span></Html>}><Land onStrike={strike} /></Suspense>
        {shot && <Strike key={shot.id} shot={shot} onPhase={setPhase} onComplete={() => { setShot(null); setPhase("ready"); }} />}
      </Canvas>
    </SceneBoundary>
    <p className="japan-scene-credit">NASA Earth Observatory · Natural Earth</p>
  </section>, document.body);
}
