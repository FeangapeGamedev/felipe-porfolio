// Scene.jsx
import React, { useEffect, useRef, useState } from "react";
import { OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useGame } from "../state/GameContext.jsx";
import { CharacterController } from "./CharacterController.jsx";
import { Character } from "./Character.jsx";
import SpotLightManager from "../state/SpotLightManager.jsx";
import Room from './Room.jsx';
import useTrapPlacement from "../survivor/useTrapPlacement.jsx";
import * as THREE from 'three';

// 📐 Responsive zoom adjustment for orthographic camera
const ResponsiveOrthoZoom = () => {
  const { camera, size } = useThree();
  const lastAspect = useRef(null);

  useEffect(() => {
    if (camera.isOrthographicCamera) {
      const DESIGN_WIDTH = 1920;
      const DESIGN_HEIGHT = 1080;
      const designAspect = DESIGN_WIDTH / DESIGN_HEIGHT;
      const currentAspect = size.width / size.height;

      if (lastAspect.current && Math.abs(lastAspect.current - currentAspect) < 0.01) {
        return;
      }

      // 🔁 Adjust zoom based on resolution as well
      const screenArea = size.width * size.height;
      let baseZoom = 80;

      if (screenArea < 1000000) baseZoom = 75; // smaller screens
      if (screenArea < 700000) baseZoom = 70; // even smaller
      if (screenArea < 500000) baseZoom = 65; // mobile-tier screens

      const zoomFactor = currentAspect / designAspect;
      camera.zoom = baseZoom * zoomFactor;
      camera.updateProjectionMatrix();

      lastAspect.current = currentAspect;
    }
  }, [camera, size]);

  return null;
};

const Scene = ({
  isPaused,
  onProjectSelect,
  onShowCodeFrame,
  placementMode,
  setTrapCharges,
  initialPosition,
  setInitialPosition,
  forceTeleport,
  setForceTeleport,
  selectedTrapType, 
  setSelectedTrapType, 
  isPlacingTrap, 
  setIsPlacingTrap,
}) => {
  const { currentRoom, targetPosition, doorDirection } = useGame();

  // Trap-related state
  const [placedTraps, setPlacedTraps] = useState([]); // Keep only this local state

  const { TrapPreview } = useTrapPlacement({ placementMode });

  useEffect(() => {
    if (!currentRoom || !targetPosition) return;
    setInitialPosition(targetPosition.clone());
    setForceTeleport(true);
  }, [currentRoom]);

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[7.55, 5, 10]}
        rotation={[-Math.PI / 10, Math.PI / 5, 0.2]}
        zoom={80}
      />

      <ResponsiveOrthoZoom />

      <ambientLight intensity={0.7} color="#ffffff" />

      <directionalLight
        position={[7.55, 5, 10]}
        intensity={0.3}
        color="#ffffff"
        castShadow
      />

      {currentRoom.lights.map((light, index) => (
        <SpotLightManager
          key={index}
          position={light.position}
          targetPosition={light.targetPosition}
          intensity={light.intensity}
          color={light.color}
        />
      ))}

      <Room
        key={`room-${currentRoom.id}`}
        isPaused={isPaused}
        onProjectSelect={onProjectSelect}
        onShowCodeFrame={onShowCodeFrame}
      />

      {initialPosition && (
        <Character
          key={`character-${currentRoom.id}-${doorDirection}`}
          initialPosition={initialPosition}
          teleport={forceTeleport}
          onTeleportComplete={() => {
            console.log("🚀 Teleport complete. Force teleport reset.");
            setForceTeleport(false);
          }}
          isPaused={isPaused}
          selectedTrapType={selectedTrapType}
          isPlacingTrap={isPlacingTrap}
          setIsPlacingTrap={setIsPlacingTrap}
          onTrapPlaced={(trapType, position) => {
            console.log("🧩 Scene received trap placement:", trapType, position);

            // Log trap charges before and after update
            setTrapCharges((prev) => {
              console.log("⚡ Trap charge before:", prev[trapType]);
              const updated = {
                ...prev,
                [trapType]: Math.max(0, prev[trapType] - 1),
              };
              console.log("📉 Trap charge after:", updated[trapType]);
              return updated;
            });

            // Log placed traps before and after update
            setPlacedTraps((prev) => {
              console.log("🔄 Previous traps:", prev);
              const updated = [...prev, { type: trapType, position }];
              console.log("🆕 New trap list:", updated);
              return updated;
            });

            // Log state changes for trap placement
            console.log("✅ Trap placement complete. Resetting placement state.");
            setIsPlacingTrap(false);
            setSelectedTrapType(null);
          }}
        />
      )}

      <CharacterController isPaused={isPaused || isPlacingTrap} />

      {TrapPreview}

      {placedTraps.map((trap, i) => (
        <mesh key={i} position={new THREE.Vector3(trap.position.x, trap.position.y, trap.position.z)}>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshStandardMaterial
            color={{
              unity: "#224b55",
              unreal: "#3f2a47",
              react: "#1e3a5f",
              blender: "#5a2c16",
              vr: "#3d1f1f",
            }[trap.type] || "white"}
          />
        </mesh>
      ))}
    </>
  );
};

export default Scene;
