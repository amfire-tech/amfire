"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import * as THREE from "three";
import { BAR, DIM, barGeometry, facedRoughnessMap, flangeGeometry, hubGeometry, turnedRoughnessMap } from "./part-geometry";

// One scene, two uses:
//  - "hero": the finished part turning slowly, leaning toward the cursor, with callouts.
//  - "story": the same part being made as the visitor scrolls. `progress` runs 0 → 5,
//    one unit per stage: 0 raw bar · 1 turning · 2 milling · 3 heat treatment · 4 inspection.

type Props = {
  variant: "hero" | "story";
  accent: string;
  /** Story only: a ref the page writes scroll progress (0–5) into, read every frame. */
  progress?: RefObject<number>;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const bell = (a: number, peak: number, b: number, x: number) => (x < peak ? smooth(a, peak, x) : 1 - smooth(peak, b, x));

const STEEL = new THREE.Color("#d4d9df");
const HARDENED = new THREE.Color("#aab2bc");
const GLOW = new THREE.Color("#ff4a00");
const HOT_BASE = new THREE.Color("#2b1d16");
const CUT_NORMAL = new THREE.Vector3(0, -1, 0);

/** Measurement callouts: a point on the part (in the tilted frame) and its label. */
const CALLOUTS: { at: [number, number, number]; side: "left" | "right"; text: string }[] = [
  { at: [-DIM.flangeR - 0.06, DIM.flangeTop * 0.5, 0], side: "left", text: "Ø 150.00 h8" },
  { at: [DIM.pcdR * 0.94, DIM.flangeTop + 0.035, DIM.pcdR * 0.35], side: "right", text: "PCD 108.00 ±0.02" },
  { at: [0.63, 1.0, 0], side: "right", text: "Ø 46.00 H7 · Ra 0.8 µm" },
];

function Part({ variant, accent, progress, labels }: Props & { labels: RefObject<(HTMLDivElement | null)[]> }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();

  const geo = useMemo(() => ({ flangePlain: flangeGeometry(false), flangeHoles: flangeGeometry(true), hub: hubGeometry(), bar: barGeometry() }), []);
  const maps = useMemo(() => ({ turned: turnedRoughnessMap(), faced: facedRoughnessMap() }), []);

  const steel = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: STEEL,
        metalness: 0.92,
        roughness: 0.3,
        roughnessMap: maps.turned,
        clearcoat: 0.2,
        clearcoatRoughness: 0.35,
        envMapIntensity: 1.5,
      }),
    [maps],
  );
  const face = useMemo(() => {
    const m = steel.clone();
    m.roughnessMap = maps.faced;
    return m;
  }, [steel, maps]);

  // Story-only pieces: the bar being cut away, the cutting ring, the drills and the inspection rings.
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), BAR.top + 0.05), []);
  const barMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3e434a", metalness: 0.85, roughness: 0.62, roughnessMap: maps.turned, clippingPlanes: [clip], side: THREE.DoubleSide, envMapIntensity: 1 }),
    [clip, maps],
  );
  const ring = useRef<THREE.Mesh>(null);
  const drills = useRef<THREE.Group>(null);
  const flangePlain = useRef<THREE.Mesh>(null);
  const flangeHoles = useRef<THREE.Mesh>(null);
  const inspect = useRef<THREE.Group>(null);
  const bar = useRef<THREE.Mesh>(null);
  const v = useMemo(() => new THREE.Vector3(), []);

  const accentColor = useMemo(() => new THREE.Color(accent), [accent]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(maps).forEach((t) => t.dispose());
      steel.dispose();
      face.dispose();
      barMat.dispose();
    },
    [geo, maps, steel, face, barMat],
  );

  // Three.js objects are mutated in the frame loop by design (react-three-fiber); nothing here is React state.
  useFrame(({ camera, size, pointer }, delta) => {
    const d = Math.min(delta, 0.05);
    if (spin.current && !reduced) spin.current.rotation.y += d * (variant === "hero" ? 0.22 : 0.3);
    // On narrow screens the hero camera steps back so the part and its callouts fit the width.
    if (variant === "hero") {
      const z = 6.6 * (size.width < 760 ? Math.min(1.45, (760 / size.width) * 0.72) : 1);
      camera.position.z += (z - camera.position.z) * 0.2;
    }
    if (group.current) {
      const tx = variant === "hero" ? 0.55 + pointer.y * 0.1 : 0.5;
      const tz = variant === "hero" ? -pointer.x * 0.08 : 0;
      group.current.rotation.x += (tx - group.current.rotation.x) * 0.06;
      group.current.rotation.z += (tz - group.current.rotation.z) * 0.06;
    }

    let labelAlpha = 1;
    if (variant === "story" && progress) {
      const p = progress.current ?? 0;

      // Turning: the bar is cut away from the top down, with a hot ring at the cut.
      const cut = smooth(1.0, 1.75, p);
      // The plane starts just above the bar and ends just below it, so the bar is whole at rest.
      const h = BAR.top + 0.05 + (BAR.bottom - 0.1 - BAR.top) * cut;
      // The cut is set along the part's own axis, then moved into world space (the part is tilted).
      if (group.current) {
        group.current.updateMatrixWorld();
        clip.set(CUT_NORMAL, h).applyMatrix4(group.current.matrixWorld);
      }
      if (bar.current) bar.current.visible = cut < 0.999;
      if (ring.current) {
        ring.current.visible = cut > 0.001 && cut < 0.999;
        ring.current.position.y = h;
      }

      // Milling: six drills come down onto the bolt circle, then the holes appear.
      const drillIn = smooth(2.0, 2.4, p);
      const drillOut = smooth(2.5, 2.85, p);
      if (drills.current) {
        drills.current.visible = drillIn > 0 && drillOut < 1;
        drills.current.position.y = 1.5 - drillIn * 1.05 + drillOut * 1.6;
      }
      const holes = p >= 2.45;
      if (flangePlain.current) flangePlain.current.visible = !holes;
      if (flangeHoles.current) flangeHoles.current.visible = holes;

      // Heat treatment: a glow, then a slightly darker hardened finish.
      const heat = bell(3.0, 3.4, 3.85, p);
      const hardened = smooth(3.45, 3.9, p);
      // Red-hot steel: the reflections dim and the glow takes over, instead of a pink tint.
      for (const m of [steel, face]) {
        m.color.copy(STEEL).lerp(HARDENED, hardened).lerp(HOT_BASE, heat * 0.85);
        m.envMapIntensity = 1.5 - heat * 1.1;
        m.emissive.copy(GLOW);
        m.emissiveIntensity = heat * 1.5;
      }

      // Inspection: measuring rings and callouts.
      const insp = smooth(4.0, 4.4, p);
      if (inspect.current) {
        inspect.current.visible = insp > 0.01;
        inspect.current.children.forEach((c) => {
          const mat = (c as THREE.Line).material as THREE.LineBasicMaterial;
          mat.opacity = insp * 0.95;
        });
      }
      labelAlpha = smooth(4.2, 4.5, p);
    }

    // Pin each DOM callout to its point on the part.
    if (group.current && labels.current) {
      group.current.updateMatrixWorld();
      CALLOUTS.forEach((c, i) => {
        const el = labels.current[i];
        if (!el) return;
        v.set(...c.at).applyMatrix4(group.current!.matrixWorld).project(camera);
        const x = (v.x * 0.5 + 0.5) * size.width;
        const y = (-v.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = String(labelAlpha);
      });
    }
  });

  const holeAngles = Array.from({ length: DIM.holes }, (_, i) => (i / DIM.holes) * Math.PI * 2 + Math.PI / 6);

  return (
    <group ref={group} rotation={[0.55, 0, 0]} position={[0, variant === "hero" ? -0.05 : -0.3, 0]}>
      <group ref={spin}>
        <mesh geometry={geo.hub} material={steel} />
        <mesh ref={flangePlain} geometry={geo.flangePlain} material={face} visible={variant === "story"} />
        <mesh ref={flangeHoles} geometry={geo.flangeHoles} material={face} visible={variant === "hero"} />

        {variant === "story" && (
          <>
            <mesh ref={bar} geometry={geo.bar} material={barMat} />
            <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[BAR.r + 0.01, 0.02, 12, 160]} />
              <meshBasicMaterial color={GLOW} toneMapped={false} />
            </mesh>
            <group ref={drills} visible={false}>
              {holeAngles.map((a) => (
                <group key={a} position={[Math.cos(a) * DIM.pcdR, 0, -Math.sin(a) * DIM.pcdR]}>
                  <mesh position={[0, 0.5, 0]}>
                    <cylinderGeometry args={[DIM.holeR * 0.92, DIM.holeR * 0.92, 1, 24]} />
                    <meshStandardMaterial color="#59616b" metalness={0.9} roughness={0.3} />
                  </mesh>
                  <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[DIM.holeR * 0.92, 0.1, 24]} />
                    <meshBasicMaterial color={accentColor} toneMapped={false} />
                  </mesh>
                </group>
              ))}
            </group>
          </>
        )}
      </group>

      {/* Measurement rings stay still while the part turns inside them, like a gauge. */}
      <group ref={inspect} visible={variant === "hero"}>
        <MeasureRing r={DIM.flangeR + 0.07} y={DIM.flangeTop * 0.5} color={accentColor} />
        <MeasureRing r={DIM.pcdR} y={DIM.flangeTop + 0.04} color={accentColor} dashed />
        <MeasureRing r={0.68} y={1.0} color={accentColor} />
      </group>
    </group>
  );
}

function MeasureRing({ r, y, color, dashed }: { r: number; y: number; color: THREE.Color; dashed?: boolean }) {
  const line = useMemo(() => {
    const pts = Array.from({ length: 181 }, (_, i) => {
      const a = (i / 180) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    });
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.07, gapSize: 0.05, transparent: true, opacity: 0.95, toneMapped: false })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, toneMapped: false });
    const l = new THREE.Line(g, m);
    if (dashed) l.computeLineDistances();
    return l;
  }, [r, y, color, dashed]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  return <primitive object={line} />;
}

function Studio() {
  // Soft-box reflections built in the scene, so the steel looks lit without loading an HDR file.
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={7} color="#ffffff" position={[0, 6, 0]} scale={[12, 4, 1]} rotation={[Math.PI / 2, 0, 0]} />
      <Lightformer form="rect" intensity={3.2} color="#e3e9f0" position={[-6, 1.5, 1]} scale={[3, 8, 1]} rotation={[0, Math.PI / 2, 0]} />
      <Lightformer form="rect" intensity={2.6} color="#fff1d9" position={[6, 1, 1.5]} scale={[3, 7, 1]} rotation={[0, -Math.PI / 2, 0]} />
      <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 1.5, 7]} scale={[8, 2.5, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[0, -4, 3]} scale={5} rotation={[-Math.PI / 2.5, 0, 0]} />
      {/* Low front strip, so the flange's rim catches light instead of going black. */}
      <Lightformer form="rect" intensity={2.4} color="#f2f5f8" position={[0, -2.2, 6]} scale={[10, 1.6, 1]} rotation={[0.35, 0, 0]} />
    </Environment>
  );
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (on) => {
      const q = window.matchMedia(REDUCED);
      q.addEventListener("change", on);
      return () => q.removeEventListener("change", on);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/** The canvas plus its DOM callouts. It stops drawing whenever it is off screen. */
export default function PartScene(props: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="mfg-canvas">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: props.variant === "hero" ? [0, 0.3, 6.6] : [0, 0.3, 7.4], fov: 30 }}
        onCreated={({ gl, camera }) => {
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
          camera.lookAt(0, 0.05, 0);
        }}
      >
        <Studio />
        <directionalLight position={[3, 6, 4]} intensity={1.4} />
        <ambientLight intensity={0.25} />
        <Part {...props} labels={labels} />
      </Canvas>
      <div className="mfg-callouts" aria-hidden>
        {CALLOUTS.map((c, i) => (
          <div key={c.text} ref={(el) => void (labels.current[i] = el)} className="mfg-callout-pin" style={{ opacity: props.variant === "hero" ? 1 : 0 }}>
            <div className={`mfg-callout mfg-callout--${c.side}`}>
              <span className="mfg-callout__dot" />
              <span className="mfg-callout__rule" />
              <span className="mfg-callout__text">{c.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
