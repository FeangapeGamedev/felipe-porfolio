// Scene.jsx
import React, { useEffect, useRef } from "react";
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
}) => {
  const { currentRoom, targetPosition, doorDirection } = useGame();

  const { TrapPreview } = useTrapPlacement({
    placementMode,
    onPlaced: (trapType, position) => {
      setTrapCharges(prev => ({ ...prev, [trapType]: 0 }));
      setPlacementMode(null);
    }
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
        />
      )}

      <CharacterController isPaused={isPaused} />

      {TrapPreview}
    </>
  );
};

export default Scene;
