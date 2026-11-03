import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { AirHockeyEngine } from './AirHockeyEngine';
import { HandData, ControlMode, PlayerId, GameSettings } from '../../types';

interface AirHockeyProps {
  p1Hand: HandData;
  p2Hand: HandData;
  controlMode: ControlMode;
  settings: GameSettings;
  videoElement: HTMLVideoElement | null;
  isPaused: boolean;
  onScore: (scorer: PlayerId) => void;
  onHit: (player: PlayerId) => void;
}

export const AirHockey: React.FC<AirHockeyProps> = ({
  p1Hand,
  p2Hand,
  controlMode,
  settings,
  videoElement,
  isPaused,
  onScore,
  onHit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AirHockeyEngine | null>(null);

  // Keyboard state for manual play
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const p1ManualPosRef = useRef({ x: 0.18, y: 0.5 });
  const p2ManualPosRef = useRef({ x: 0.82, y: 0.5 });
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const p1HandRef = useRef(p1Hand);
  const p2HandRef = useRef(p2Hand);

  useLayoutEffect(() => {
    p1HandRef.current = p1Hand;
    p2HandRef.current = p2Hand;
  }, [p1Hand, p2Hand]);

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new AirHockeyEngine(canvas);
    engine.onScore = onScore;
    engine.onHit = onHit;
    engine.videoElement = videoElement;
    engineRef.current = engine;

    if (!isPaused) {
      engine.start();
      engine.resetPuck('p1');
    }

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  // Handle pause/resume
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isPaused) {
      engine.stop();
    } else {
      engine.start();
    }
  }, [isPaused]);

  // Handle resizing so the table occupies most of the gameplay viewport
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!container || !canvas || !engine) return;

      const rect = container.getBoundingClientRect();
      const targetWidth = Math.min(rect.width - 32, 1120);
      const targetHeight = Math.min(rect.height - 32, targetWidth * 0.58);

      engine.setSize(targetWidth, targetHeight);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard listeners for keyboard-mouse mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse move listener
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    mousePosRef.current = { x, y };
  }, []);

  // Synchronize inputs smoothly
  useEffect(() => {
    let animId: number;

    const tickInput = () => {
      const engine = engineRef.current;
      if (engine && !isPaused) {
        let p1Target = { x: 0.18, y: 0.5 };
        let p2Target = { x: 0.82, y: 0.5 };

        if (controlMode === 'camera') {
          const currentP1Hand = p1HandRef.current;
          const currentP2Hand = p2HandRef.current;
          if (currentP1Hand.isDetected) {
            p1Target = { x: currentP1Hand.x, y: currentP1Hand.y };
          } else {
            p1Target = { x: engine.p1Paddle.targetX / engine.width, y: engine.p1Paddle.targetY / engine.height };
          }

          if (currentP2Hand.isDetected) {
            p2Target = { x: currentP2Hand.x, y: currentP2Hand.y };
          } else {
            p2Target = { x: engine.p2Paddle.targetX / engine.width, y: engine.p2Paddle.targetY / engine.height };
          }
        } else if (controlMode === 'vs-ai') {
          if (mousePosRef.current) {
            p1Target = mousePosRef.current;
          } else {
            const step = 0.02;
            if (keysDownRef.current['w']) p1ManualPosRef.current.y = Math.max(0.08, p1ManualPosRef.current.y - step);
            if (keysDownRef.current['s']) p1ManualPosRef.current.y = Math.min(0.92, p1ManualPosRef.current.y + step);
            if (keysDownRef.current['a']) p1ManualPosRef.current.x = Math.max(0.05, p1ManualPosRef.current.x - step);
            if (keysDownRef.current['d']) p1ManualPosRef.current.x = Math.min(0.45, p1ManualPosRef.current.x + step);
            p1Target = p1ManualPosRef.current;
          }
          engine.updateAI(settings.aiDifficulty, 0.016);
        } else {
          // Local 2-Player Keyboard / Mouse
          if (keysDownRef.current['w']) p1ManualPosRef.current.y = Math.max(0.08, p1ManualPosRef.current.y - 0.02);
          if (keysDownRef.current['s']) p1ManualPosRef.current.y = Math.min(0.92, p1ManualPosRef.current.y + 0.02);
          if (keysDownRef.current['a']) p1ManualPosRef.current.x = Math.max(0.05, p1ManualPosRef.current.x - 0.02);
          if (keysDownRef.current['d']) p1ManualPosRef.current.x = Math.min(0.45, p1ManualPosRef.current.x + 0.02);
          p1Target = mousePosRef.current && mousePosRef.current.x < 0.5 ? mousePosRef.current : p1ManualPosRef.current;

          if (keysDownRef.current['arrowup']) p2ManualPosRef.current.y = Math.max(0.08, p2ManualPosRef.current.y - 0.02);
          if (keysDownRef.current['arrowdown']) p2ManualPosRef.current.y = Math.min(0.92, p2ManualPosRef.current.y + 0.02);
          if (keysDownRef.current['arrowleft']) p2ManualPosRef.current.x = Math.max(0.55, p2ManualPosRef.current.x - 0.02);
          if (keysDownRef.current['arrowright']) p2ManualPosRef.current.x = Math.min(0.95, p2ManualPosRef.current.x + 0.02);
          p2Target = p2ManualPosRef.current;
        }

        if (controlMode !== 'vs-ai') {
          engine.updateTargets(p1Target, p2Target);
        } else {
          engine.updateTargets(p1Target, { x: engine.p2Paddle.targetX / engine.width, y: engine.p2Paddle.targetY / engine.height });
        }
      }

      animId = requestAnimationFrame(tickInput);
    };

    animId = requestAnimationFrame(tickInput);
    return () => cancelAnimationFrame(animId);
  }, [controlMode, isPaused, settings.aiDifficulty]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center p-3 bg-[#0B0E0D]"
    >
      <div className="relative rounded-2xl overflow-hidden border border-[#303833]">
        <canvas
          ref={canvasRef}
          width={900}
          height={540}
          className="block cursor-crosshair"
        />

        {/* Restrained Hand Status Warnings */}
        {controlMode === 'camera' && !p1Hand.isDetected && !isPaused && (
          <div className="absolute top-4 left-6 bg-[#121715]/90 border border-[#168BFF]/40 text-[#168BFF] px-2.5 py-1 rounded-md text-[11px] font-sans font-medium backdrop-blur-sm">
            P1 Blue Hand Waiting
          </div>
        )}
        {controlMode === 'camera' && !p2Hand.isDetected && !isPaused && (
          <div className="absolute top-4 right-6 bg-[#121715]/90 border border-[#E65361]/40 text-[#E65361] px-2.5 py-1 rounded-md text-[11px] font-sans font-medium backdrop-blur-sm">
            P2 Red Hand Waiting
          </div>
        )}
      </div>
    </div>
  );
};
