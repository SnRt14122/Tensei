"use client";

// Adapted from React Bits FluidGlass. See docs/vendor/react-bits-LICENSE.md.
import { Component, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import "./FluidGlass.css";

function Lens() {
  const { nodes } = useGLTF("/assets/3d/lens.glb", "/assets/3d/draco/");
  return (
    <>
      <Environment resolution={64}>
        <Lightformer position={[-2, 3, 5]} scale={[6, 1, 1]} intensity={4} />
        <Lightformer position={[3, -2, 4]} scale={[1, 5, 1]} color="#67e8f9" intensity={3} />
      </Environment>
      <mesh geometry={nodes.Cylinder.geometry} rotation-x={Math.PI / 2} scale={0.25}>
        <MeshTransmissionMaterial
          ior={1.15}
          thickness={5}
          chromaticAberration={0.1}
          anisotropy={0.01}
          roughness={0.05}
          samples={4}
          resolution={128}
          transparent
          opacity={0.38}
          envMapIntensity={1.5}
        />
      </mesh>
    </>
  );
}

class LensBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function FluidGlass() {
  const lensRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const lens = lensRef.current;
    let frame = 0;
    let x = 0;
    let y = 0;
    // The overlay never intercepts clicks. Coordinates come from the window,
    // not R3F's canvas-local pointer, so portals and nested panels work too.
    function move(event) {
      if (event.pointerType === "touch") { hide(); return; }
      x = event.clientX;
      y = event.clientY;
      lens.dataset.visible = "true";
      setVisible(true);
      if (!frame) frame = requestAnimationFrame(() => {
        lens.style.transform = `translate3d(${x - 56}px, ${y - 56}px, 0)`;
        frame = 0;
      });
    }
    function hide() {
      lens.dataset.visible = "false";
      lens.dataset.pressed = "false";
      setVisible(false);
    }
    function press(event) { if (event.pointerType !== "touch") lens.dataset.pressed = "true"; }
    function release() { lens.dataset.pressed = "false"; }
    function visibility() { if (document.hidden) hide(); }
    window.addEventListener("pointermove", move, { passive: true, capture: true });
    window.addEventListener("pointerdown", press, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", hide, true);
    window.addEventListener("blur", hide);
    document.documentElement.addEventListener("pointerleave", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerdown", press, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", hide, true);
      window.removeEventListener("blur", hide);
      document.documentElement.removeEventListener("pointerleave", hide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return createPortal(
    <div ref={lensRef} className="fluid-glass-cursor" aria-hidden="true" data-visible="false" data-fluid-glass="global-v1">
      <div className="fluid-glass-surface" />
      <div className="fluid-glass-model">
        <LensBoundary>
          <Canvas
            camera={{ position: [0, 0, 2], fov: 20 }}
            dpr={[1, 1.5]}
            frameloop={visible ? "always" : "never"}
            gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }}
            fallback={null}
          >
            <Suspense fallback={null}><Lens /></Suspense>
          </Canvas>
        </LensBoundary>
      </div>
    </div>,
    document.body,
  );
}
