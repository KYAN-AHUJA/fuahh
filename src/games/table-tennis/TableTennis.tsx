import React, { useRef, useEffect, useCallback } from 'react';
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

  // Handle resizing
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!container || !canvas || !engine) return;

      const rect = container.getBoundingClientRect();
      const targetWidth = Math.min(rect.width - 24, 1000);
      const targetHeight = Math.min(rect.height - 24, targetWidth * 0.58);

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

      // Space or F key triggers smash for P1
      if (e.key === ' ' || e.key.toLowerCase() === 'f') {
        engineRef.current?.triggerSmash('p1');
      }
      // Enter or Num0 triggers smash for P2
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

  // Hand gesture trigger for Smash
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

  // Input loop
  useEffect(() => {
    let animId: number;

    const tickInput = () => {
      const engine = engineRef.current;
      if (engine && !isPaused) {
        let p1Y = 0.5;
        let p2Y = 0.5;

        if (controlMode === 'camera') {
          p1Y = p1Hand.isDetected ? p1Hand.y : engine.p1Paddle.targetY / engine.height;
          p2Y = p2Hand.isDetected ? p2Hand.y : engine.p2Paddle.targetY / engine.height;
          engine.updateTargets(p1Y, p2Y);
        } else if (controlMode === 'vs-ai') {
          // P1: Mouse or W/S
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
          // 2-Player Local
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
  }, [controlMode, p1Hand, p2Hand, isPaused, settings.aiDifficulty]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center p-4 bg-[#0a0d12]"
    >
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#1e293b]">
        <canvas
          ref={canvasRef}
          width={900}
          height={520}
          className="block cursor-crosshair"
        />

        {/* Smash helper banner */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-1.5 rounded-full bg-[#141a24]/80 border border-[#263346] text-xs text-[#94a3b8] backdrop-blur-md">
          <span>⚡ <strong>P1 Smash:</strong> {controlMode === 'camera' ? 'Make Fist Gesture' : 'Spacebar'}</span>
          <span className="text-[#38485e]">|</span>
          <span>⚡ <strong>P2 Smash:</strong> {controlMode === 'camera' ? 'Make Fist Gesture' : 'Enter Key'}</span>
        </div>

        {/* Dynamic tracking lost warnings if in camera mode */}
        {controlMode === 'camera' && !p1Hand.isDetected && !isPaused && (
          <div className="absolute top-4 left-6 bg-[#168BFF]/20 border border-[#168BFF] text-[#168BFF] px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md animate-pulse">
            ⚠️ P1 (BLUE) Hand Lost
          </div>
        )}
        {controlMode === 'camera' && !p2Hand.isDetected && !isPaused && (
          <div className="absolute top-4 right-6 bg-[#E65361]/20 border border-[#E65361] text-[#E65361] px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md animate-pulse">
            ⚠️ P2 (RED) Hand Lost
          </div>
        )}
      </div>
    </div>
  );
};
