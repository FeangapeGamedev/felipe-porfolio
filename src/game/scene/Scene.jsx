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
  onRoomChange,
  placementMode,
  setPlacementMode,
  trapCharges,
  setTrapCharges,
  initialPosition,
  setInitialPosition,
  forceTeleport,
  setForceTeleport,
  selectedTrapType, // Remove duplicate state declaration
  setSelectedTrapType, // Remove duplicate state declaration
  isPlacingTrap, // Remove duplicate state declaration
  setIsPlacingTrap, // Remove duplicate state declaration
}) => {
  const { currentRoom, targetPosition, doorDirection } = useGame();

  // Trap-related state
  const [placedTraps, setPlacedTraps] = useState([]); // Keep only this local state

  const handleArmTrap = () => {
    if (!selectedTrapType || isPlacingTrap) return;
    setIsPlacingTrap(true);
  };

  const { TrapPreview } = useTrapPlacement({
    placementMode,
    onPlaced: (trapType, position) => {
      setTrapCharges((prev) => ({ ...prev, [trapType]: 0 }));
      setPlacementMode(null);
    },
  });

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
          onTeleportComplete={() => setForceTeleport(false)}
          isPaused={isPaused}
          selectedTrapType={selectedTrapType}
          isPlacingTrap={isPlacingTrap}
          setIsPlacingTrap={setIsPlacingTrap} // ✅ Add this line
          onTrapPlaced={(trapType, position) => {
            setTrapCharges((prev) => ({
              ...prev,
              [trapType]: Math.max(0, prev[trapType] - 1),
            }));
            setPlacedTraps((prev) => [...prev, { type: trapType, position }]);
            setIsPlacingTrap(false);
            setSelectedTrapType(null);
          }}
        />
      )}

      <CharacterController isPaused={isPaused || isPlacingTrap} />

      {TrapPreview}

      {placedTraps.map((trap, i) => (
        <mesh key={i} position={trap.position}>
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
