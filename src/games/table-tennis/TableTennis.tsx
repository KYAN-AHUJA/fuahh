import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { TableTennisEngine } from './TableTennisEngine';
import { HandData, ControlMode, PlayerId, GameSettings } from '../../types';

interface TableTennisProps {
  p1Hand: HandData;
  p2Hand: HandData;
  controlMode: ControlMode;
  settings: GameSettings;
  videoElement: HTMLVideoElement | null;
  isPaused: boolean;
  onScore: (scorer: PlayerId) => void;
  onHit: (player: PlayerId, rally: number) => void;
}

export const TableTennis: React.FC<TableTennisProps> = ({
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
  const engineRef = useRef<TableTennisEngine | null>(null);

  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const p1ManualYRef = useRef(0.5);
  const p2ManualYRef = useRef(0.5);
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

    const engine = new TableTennisEngine(canvas);
    engine.onScore = onScore;
    engine.onHit = onHit;
    engine.videoElement = videoElement;
    engineRef.current = engine;

    if (!isPaused) {
      engine.start();
      engine.resetBall('p1');
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
      const targetHeight = Math.min(rect.height - 32, targetWidth * 0.56);

      engine.setSize(targetWidth, targetHeight);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard controls & Smash triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.key.toLowerCase()] = true;

      if (e.key === ' ' || e.key.toLowerCase() === 'f') {
        engineRef.current?.triggerSmash('p1');
      }
      if (e.key === 'Enter' || e.key === '0') {
        engineRef.current?.triggerSmash('p2');
      }
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
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    mousePosRef.current = { x: 0, y };
  }, []);

  // Fist gesture trigger for Smash
  useEffect(() => {
    if (controlMode === 'camera') {
      if (p1Hand.isFist) {
        engineRef.current?.triggerSmash('p1');
      }
      if (p2Hand.isFist) {
        engineRef.current?.triggerSmash('p2');
      }
    }
  }, [controlMode, p1Hand.isFist, p2Hand.isFist]);

  // Input sync loop
  useEffect(() => {
    let animId: number;

    const tickInput = () => {
      const engine = engineRef.current;
      if (engine && !isPaused) {
        let p1Y = 0.5;
        let p2Y = 0.5;

        if (controlMode === 'camera') {
          const currentP1Hand = p1HandRef.current;
          const currentP2Hand = p2HandRef.current;
          p1Y = currentP1Hand.isDetected ? currentP1Hand.y : engine.p1Paddle.targetY / engine.height;
          p2Y = currentP2Hand.isDetected ? currentP2Hand.y : engine.p2Paddle.targetY / engine.height;
          engine.updateTargets(p1Y, p2Y);
        } else if (controlMode === 'vs-ai') {
          if (mousePosRef.current) {
            p1Y = mousePosRef.current.y;
          } else {
            if (keysDownRef.current['w']) p1ManualYRef.current = Math.max(0.1, p1ManualYRef.current - 0.025);
            if (keysDownRef.current['s']) p1ManualYRef.current = Math.min(0.9, p1ManualYRef.current + 0.025);
            p1Y = p1ManualYRef.current;
          }
          engine.updateTargets(p1Y, engine.p2Paddle.targetY / engine.height);
          engine.updateAI(settings.aiDifficulty, 0.016);
        } else {
          if (keysDownRef.current['w']) p1ManualYRef.current = Math.max(0.1, p1ManualYRef.current - 0.025);
          if (keysDownRef.current['s']) p1ManualYRef.current = Math.min(0.9, p1ManualYRef.current + 0.025);
          p1Y = mousePosRef.current ? mousePosRef.current.y : p1ManualYRef.current;

          if (keysDownRef.current['arrowup']) p2ManualYRef.current = Math.max(0.1, p2ManualYRef.current - 0.025);
          if (keysDownRef.current['arrowdown']) p2ManualYRef.current = Math.min(0.9, p2ManualYRef.current + 0.025);
          p2Y = p2ManualYRef.current;

          engine.updateTargets(p1Y, p2Y);
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
          height={520}
          className="block cursor-crosshair"
        />

        {/* Dynamic tracking lost warnings if in camera mode */}
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
