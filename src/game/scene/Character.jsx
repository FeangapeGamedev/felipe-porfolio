import React, { useRef, useState, useEffect } from "react";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { AnimationMixer, LoopRepeat, LoopOnce } from "three";
import { useGame } from "../state/GameContext.jsx";

export const Character = ({ initialPosition, isPaused, teleport = false, onTeleportComplete = () => { }, selectedTrapType, setIsPlacingTrap, isPlacingTrap, onTrapPlaced = () => { } }) => {
  const characterRef = useRef();
  const modelRef = useRef();
  const mixerRef = useRef(null);
  const walkActionRef = useRef(null);
  const idleActionRef = useRef(null);
  const runActionRef = useRef(null);
  const standToCrouchActionRef = useRef(null);
  const crouchIdleActionRef = useRef(null);
  const crouchToStandingActionRef = useRef(null);

  const [justTeleported, setJustTeleported] = useState(false);
  const [trapToPlace, setTrapToPlace] = useState(null);
  const [isWalking, setIsWalking] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [isColliding, setIsColliding] = useState(false);
  const hasStartedPlacingRef = useRef(false);

  const { targetPosition, setTargetPosition, spawnRotationY } = useGame();

  const walkSpeed = 0.014;
  const runSpeed = 0.035;
  const stopThreshold = 0.25;
  const lerpFactor = 1;
  const turnSpeed = 7;

  const { scene: characterModel, animations } = useGLTF(
    "https://pub-b249382bbc784cb189eee9b1d3002799.r2.dev/3dModels/ccCharacterAnimated.glb"
  );

  const restoreMovementWeights = () => {
    idleActionRef.current.weight = isIdle ? 1 : isWalking ? 0.2 : 0;
    walkActionRef.current.weight = isWalking && !isRunning ? 1 : 0;
    runActionRef.current.weight = isWalking && isRunning ? 1 : 0;
  };

  const blendTo = (actionRef, weight = 1) => {
    actionRef.reset();
    actionRef.weight = weight;
    actionRef.fadeIn(0.2).play();
  };

  useEffect(() => {
    if (characterModel && animations.length > 0) {
      mixerRef.current = new AnimationMixer(characterModel);
      idleActionRef.current = mixerRef.current.clipAction(animations[2]); // Idle
      walkActionRef.current = mixerRef.current.clipAction(animations[5]); // Walk
      standToCrouchActionRef.current = mixerRef.current.clipAction(animations[1]); // Stand to Crouch
      crouchIdleActionRef.current = mixerRef.current.clipAction(animations[0]); // Crouch Idle
      crouchToStandingActionRef.current = mixerRef.current.clipAction(animations[4]); // Crouch to Stand
      runActionRef.current = mixerRef.current.clipAction(animations[3]); // Run

      idleActionRef.current.setLoop(LoopRepeat, Infinity);
      walkActionRef.current.setLoop(LoopRepeat, Infinity);
      runActionRef.current.setLoop(LoopRepeat, Infinity);

      standToCrouchActionRef.current.setLoop(LoopOnce, 1);
      crouchIdleActionRef.current.setLoop(LoopOnce, 1);
      crouchToStandingActionRef.current.setLoop(LoopOnce, 1);

      standToCrouchActionRef.current.clampWhenFinished = true;
      crouchIdleActionRef.current.clampWhenFinished = true;
      crouchToStandingActionRef.current.clampWhenFinished = true;

      idleActionRef.current.timeScale = 1;
      walkActionRef.current.timeScale = 1.8;
      runActionRef.current.timeScale = 1;

      idleActionRef.current.play();
      walkActionRef.current.play();
      runActionRef.current.play();

      idleActionRef.current.weight = 1;
      walkActionRef.current.weight = 0;
      runActionRef.current.weight = 0;

      mixerRef.current.update(0);
    } else {
      console.error("❌ Failed to load character model or animations.");
    }
  }, [characterModel, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (justTeleported || isPaused || !targetPosition || !characterRef.current || isColliding || isPlacingTrap) return;

    const characterPos = characterRef.current.translation();
    const posX = characterPos.x;
    const posY = characterPos.y;
    const posZ = characterPos.z;

    let newPosX, newPosZ;

    if (targetPosition?.position) {
      newPosX = targetPosition.position.x;
      newPosZ = targetPosition.position.z;
      if (targetPosition.run && !isRunning) setIsRunning(true);
      else if (!targetPosition.run && isRunning) setIsRunning(false);
    } else if (targetPosition instanceof THREE.Vector3) {
      newPosX = targetPosition.x;
      newPosZ = targetPosition.z;
      if (isRunning) setIsRunning(false);
    } else {
      return;
    }

    const directionX = newPosX - posX;
    const directionZ = newPosZ - posZ;
    const distance = Math.sqrt(directionX * directionX + directionZ * directionZ);

    if (distance < stopThreshold) {
      if (!isIdle) setIsIdle(true);
      if (isWalking) setIsWalking(false);
      if (isRunning) setIsRunning(false);
      return;
    }

    if (!isWalking) setIsWalking(true);
    if (isIdle) setIsIdle(false);

    const speed = isRunning ? runSpeed : walkSpeed;
    const moveDistance = Math.min(speed, distance);

    const targetPos = new THREE.Vector3(
      posX + (directionX / distance) * moveDistance,
      posY,
      posZ + (directionZ / distance) * moveDistance
    );

    const currentPos = new THREE.Vector3(posX, posY, posZ);
    currentPos.lerp(targetPos, lerpFactor);

    characterRef.current.setTranslation(
      { x: currentPos.x, y: currentPos.y, z: currentPos.z },
      true
    );

    const lookAtPos = new THREE.Vector3(newPosX, posY, newPosZ);
    const direction = new THREE.Vector3().subVectors(lookAtPos, currentPos).normalize();
    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(direction.x, 0, direction.z)
    );

    if (!isWalking && !isRunning) {
      return;
    }

    modelRef.current.quaternion.slerp(targetQuaternion, turnSpeed * delta);
  });

  useEffect(() => {
    if (isPlacingTrap) return;
    if (!idleActionRef.current || !walkActionRef.current || !runActionRef.current) return;

    idleActionRef.current.setEffectiveWeight(isIdle ? 1 : isWalking ? 0.2 : 0);
    walkActionRef.current.setEffectiveWeight(isWalking && !isRunning ? 1 : 0);
    runActionRef.current.setEffectiveWeight(isWalking && isRunning ? 1 : 0);
  }, [isIdle, isWalking, isRunning, isPlacingTrap]);

  const onCrouchAnimationFinished = (e) => {
    const finishedAction = e.action;

    if (finishedAction === standToCrouchActionRef.current) {
      standToCrouchActionRef.current.fadeOut(0.2);
      blendTo(crouchIdleActionRef.current);
    } else if (finishedAction === crouchIdleActionRef.current) {
      crouchIdleActionRef.current.fadeOut(0.2);
      blendTo(crouchToStandingActionRef.current);
    } else if (finishedAction === crouchToStandingActionRef.current) {
      crouchToStandingActionRef.current.stop();
      crouchToStandingActionRef.current.reset();
      mixerRef.current.removeEventListener("finished", onCrouchAnimationFinished);

      if (onTrapPlaced && trapToPlace) {
        onTrapPlaced(trapToPlace.type, trapToPlace.position);
      }

      setIsPlacingTrap(false);
      setTrapToPlace(null);
      hasStartedPlacingRef.current = false;

      // ✅ Restart idle animation and ensure proper weights
      idleActionRef.current.reset().play();
      walkActionRef.current.reset().play();
      runActionRef.current.reset().play();

      idleActionRef.current.weight = 1;
      walkActionRef.current.weight = 0;
      runActionRef.current.weight = 0;

      restoreMovementWeights(); // Re-sync to current movement state
    }
  };

  useEffect(() => {
    if (targetPosition) {
      setIsColliding(false);
    }
  }, [targetPosition]);

  useEffect(() => {
    if (
      isPlacingTrap &&
      selectedTrapType &&
      characterRef.current &&
      !hasStartedPlacingRef.current
    ) {
      const pos = characterRef.current.translation();
      const trapPosition = new THREE.Vector3(pos.x, pos.y, pos.z);

      setTargetPosition(trapPosition);
      setTrapToPlace({ type: selectedTrapType, position: trapPosition });
    }
  }, [isPlacingTrap, selectedTrapType]);

  useEffect(() => {
    if (teleport && initialPosition && characterRef.current) {
      characterRef.current.setTranslation(initialPosition, true);

      if (modelRef.current) {
        modelRef.current.quaternion.setFromEuler(
          new THREE.Euler(0, spawnRotationY, 0)
        );
      }

      setTargetPosition(null);
      setIsIdle(true);
      setIsWalking(false);
      setIsRunning(false);

      setJustTeleported(true);
      setTimeout(() => setJustTeleported(false), 50);

      onTeleportComplete?.();
    }
  }, [teleport, initialPosition, spawnRotationY]);

  useEffect(() => {
    if (!trapToPlace || !characterRef.current) return;

    const characterPos = characterRef.current.translation();
    const distance = trapToPlace.position.distanceTo(new THREE.Vector3(
      characterPos.x, characterPos.y, characterPos.z
    ));

    if (distance < stopThreshold && !hasStartedPlacingRef.current) {
      hasStartedPlacingRef.current = true;
      setIsPlacingTrap(true);
      if (standToCrouchActionRef.current) {
        blendTo(standToCrouchActionRef.current);
        idleActionRef.current.weight = 0;
        walkActionRef.current.weight = 0;
        runActionRef.current.weight = 0;
      }
      mixerRef.current.addEventListener("finished", () => {
        onTrapPlaced(selectedTrapType); // Notify trap placement
        setIsPlacingTrap(false);
        setTrapToPlace(null);
        hasStartedPlacingRef.current = false;

        blendTo(idleActionRef.current, 1);
        blendTo(walkActionRef.current, 0.2);
        blendTo(runActionRef.current, 0.2);

        restoreMovementWeights();
      });
    }
  }, [trapToPlace, selectedTrapType, onTrapPlaced]);

  useEffect(() => {
    if (!isPlacingTrap || !selectedTrapType || !characterRef.current) return;

    const currentPos = characterRef.current.translation();
    setTargetPosition(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z));

    setTrapToPlace({
      type: selectedTrapType,
      position: new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z),
    });

    hasStartedPlacingRef.current = true;

    if (standToCrouchActionRef.current) {
      standToCrouchActionRef.current.reset();
      standToCrouchActionRef.current.weight = 1;
      standToCrouchActionRef.current.play();

      idleActionRef.current.weight = 0;
      walkActionRef.current.weight = 0;
      runActionRef.current.weight = 0;

      mixerRef.current.removeEventListener("finished", onCrouchAnimationFinished);
      mixerRef.current.addEventListener("finished", onCrouchAnimationFinished);
    }
  }, [isPlacingTrap, selectedTrapType]);

  return (
    <RigidBody
      ref={characterRef}
      colliders="cuboid"
      position={initialPosition}
      mass={1}
      type="dynamic"
      name="character"
      angularFactor={[0, 1, 0]}
      linearDamping={0.5}
      angularDamping={0.5}
      onCollisionEnter={(event) => {
        const colliderName = event.colliderObject.name;
        if (colliderName === "character" || colliderName === "floor") return;
        setIsColliding(true);
        setIsWalking(false);
        setIsRunning(false);
        setIsIdle(true);
        setTargetPosition(null);
      }}
      onCollisionExit={(event) => {
        if (event.colliderObject.name !== "character") {
          setIsColliding(false);
        }
      }}
    >
      <CuboidCollider args={[0.35, 1, 0.35]} position={[0, 1, 0]} />
      {characterModel ? (
        <primitive
          ref={modelRef}
          object={characterModel}
          scale={1}
        />
      ) : (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      )}
    </RigidBody>
  );
};
