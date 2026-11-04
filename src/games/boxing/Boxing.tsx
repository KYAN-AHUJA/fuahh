import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { BoxingEngine } from './BoxingEngine';
import { BoxingPlayerTracking, BoxingTrackingState } from '../../hooks/useBoxingTracking';
import { ControlMode, GameSettings, PlayerId } from '../../types';

interface BoxingProps {
  tracking: BoxingTrackingState;
  trackingRef: React.MutableRefObject<BoxingTrackingState>;
  controlMode: ControlMode;
  settings: GameSettings;
  isPaused: boolean;
  restartKey: number;
  showTrackingPreview: boolean;
  onCloseTrackingPreview: () => void;
  onRoundEnd: (winner: PlayerId, p1Wins: number, p2Wins: number) => void;
  onMatchEnd: (winner: PlayerId) => void;
  onHit: (player: PlayerId) => void;
  previewCanvasRef: React.RefObject<HTMLCanvasElement>;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const keyAxis = (positive?: boolean, negative?: boolean) => Number(positive === true) - Number(negative === true);

const isPlayerTracked = (player: BoxingPlayerTracking) =>
  player.head.isDetected && player.leftHand.isDetected && player.rightHand.isDetected;

export const Boxing: React.FC<BoxingProps> = ({
  tracking,
  trackingRef,
  controlMode,
  settings,
  isPaused,
  restartKey,
  showTrackingPreview,
  onCloseTrackingPreview,
  onRoundEnd,
  onMatchEnd,
  onHit,
  previewCanvasRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BoxingEngine | null>(null);
  const keysDownRef = useRef<Record<string, boolean>>({});
  const previousHandsRef = useRef<Record<string, { x: number; y: number; time: number }>>({});
  const lastPunchTimeRef = useRef<Record<PlayerId, number>>({ p1: 0, p2: 0 });
  const pausedRef = useRef(isPaused);
  const modeRef = useRef(controlMode);
  const settingsRef = useRef(settings);

  useLayoutEffect(() => {
    pausedRef.current = isPaused;
    modeRef.current = controlMode;
    settingsRef.current = settings;
  }, [isPaused, controlMode, settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new BoxingEngine(canvas);
    engine.onRoundEnd = onRoundEnd;
    engine.onMatchEnd = onMatchEnd;
    engine.onHit = onHit;
    engineRef.current = engine;
    if (!pausedRef.current) engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [onHit, onMatchEnd, onRoundEnd, restartKey]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isPaused) engine.stop();
    else engine.start();
  }, [isPaused, restartKey]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault();
      if (event.repeat) return;
      keysDownRef.current[key] = true;

      if (pausedRef.current || modeRef.current === 'camera') return;
      const engine = engineRef.current;
      if (!engine) return;

      if (modeRef.current === 'vs-ai') {
        if (key === 'f') engine.executePunch('p1', 'jab');
        if (key === 'g') engine.executePunch('p1', 'cross');
        if (key === 'v') engine.executePunch('p1', 'uppercut');
        return;
      }

      if (key === 'f') engine.executePunch('p1', 'jab');
      if (key === 'g') engine.executePunch('p1', 'cross');
      if (key === 'v') engine.executePunch('p1', 'uppercut');
      if (key === 'u') engine.executePunch('p2', 'jab');
      if (key === 'o') engine.executePunch('p2', 'cross');
      if (key === 'm') engine.executePunch('p2', 'uppercut');
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysDownRef.current[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId = 0;
    let lastFrameTime = performance.now();

    const update = (time: number) => {
      const engine = engineRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (time - lastFrameTime) / 1000));
      lastFrameTime = time;

      if (engine && !pausedRef.current) {
        if (modeRef.current === 'vs-ai') {
          engine.updateAI(settingsRef.current.aiDifficulty, dt);
          const keys = keysDownRef.current;
          engine.updateFighterInput('p1', {
            moveX: engine.p1.targetX + keyAxis(keys.d, keys.a) * 240 * dt,
            duck: !!keys.w,
            guard: !!keys.s,
          });
        } else if (modeRef.current === 'keyboard-mouse') {
          const keys = keysDownRef.current;
          engine.updateFighterInput('p1', {
            moveX: engine.p1.targetX + keyAxis(keys.d, keys.a) * 240 * dt,
            duck: !!keys.w,
            guard: !!keys.s,
          });
          engine.updateFighterInput('p2', {
            moveX: engine.p2.targetX + keyAxis(keys.l, keys.j) * 240 * dt,
            duck: !!keys.i,
            guard: !!keys.k,
          });
        } else {
          const currentTracking = trackingRef.current;
          ([['p1', currentTracking.p1], ['p2', currentTracking.p2]] as const).forEach(([playerId, player]) => {
            if (!player.head.isDetected) {
              engine.updateFighterInput(playerId, { guard: false, duck: false, sway: 0 });
              return;
            }

            const anchorX = player.body.isDetected ? player.body.x : player.head.x;
            const moveX = playerId === 'p1'
              ? 90 + anchorX * 680
              : 410 + (anchorX - 0.5) * 680;
            const shoulderDelta = player.head.y - player.body.y;
            const sway = player.body.isDetected ? clamp((player.head.x - player.body.x) / 0.07, -1, 1) : 0;
            const handRaised = (hand: BoxingPlayerTracking['leftHand']) =>
              hand.isDetected && (player.body.isDetected
                ? hand.y < player.body.y - 0.035
                : Math.abs(hand.x - player.head.x) < 0.16 && Math.abs(hand.y - player.head.y) < 0.2);
            engine.updateFighterInput(playerId, {
              moveX,
              duck: player.body.isDetected && shoulderDelta > -0.14,
              sway,
              guard: handRaised(player.leftHand) || handRaised(player.rightHand),
            });

            ([['left', player.leftHand], ['right', player.rightHand]] as const).forEach(([handName, hand]) => {
              if (!hand.isDetected) return;
              const handKey = `${playerId}-${handName}`;
              const previous = previousHandsRef.current[handKey];
              previousHandsRef.current[handKey] = { x: hand.x, y: hand.y, time };
              if (!previous || time - previous.time > 160 || time - lastPunchTimeRef.current[playerId] < 320) return;

              const forwardDelta = (hand.x - previous.x) * (playerId === 'p1' ? 1 : -1);
              const elapsedSeconds = Math.max(0.001, (time - previous.time) / 1000);
              if (forwardDelta < 0.045 || forwardDelta / elapsedSeconds < 0.65) return;

              const punch = hand.y < previous.y - 0.08
                ? 'uppercut'
                : handName === 'left' ? 'jab' : 'cross';
              engine.executePunch(playerId, punch);
              lastPunchTimeRef.current[playerId] = time;
            });
          });
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const p1Ready = isPlayerTracked(tracking.p1);
  const p2Ready = isPlayerTracked(tracking.p2);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 px-3 py-2">
      <div className="flex w-full max-w-[1080px] items-center justify-between gap-3 text-[11px] font-mono uppercase">
        <div className="flex min-w-0 items-center gap-2 text-[#168BFF]">
          <span className={`h-2 w-2 shrink-0 rounded-full ${p1Ready || controlMode !== 'camera' ? 'bg-[#168BFF]' : 'bg-[#303833]'}`} />
          <span className="truncate">P1 {controlMode === 'camera' ? (p1Ready ? '3 / 3 TRACKED' : 'FIND HEAD + BOTH HANDS') : 'READY'}</span>
        </div>
        <span className="shrink-0 text-[#A6AAA2]">ROUND FIGHT</span>
        <div className="flex min-w-0 items-center justify-end gap-2 text-[#E65361]">
          <span className="truncate">P2 {controlMode === 'camera' ? (p2Ready ? '3 / 3 TRACKED' : 'FIND HEAD + BOTH HANDS') : controlMode === 'vs-ai' ? 'AI OPPONENT' : 'READY'}</span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${p2Ready || controlMode !== 'camera' ? 'bg-[#E65361]' : 'bg-[#303833]'}`} />
        </div>
      </div>

      <div className="relative aspect-[5/3] w-full max-w-[1080px] max-h-full overflow-hidden border border-[#303833] bg-[#0B0E0D] shadow-2xl">
        <canvas ref={canvasRef} width={900} height={540} className="block h-full w-full object-contain" />

        {controlMode === 'camera' && !p1Ready && !isPaused && (
          <div className="absolute bottom-3 left-3 border border-[#168BFF]/40 bg-[#0B0E0D]/90 px-2.5 py-1.5 text-[10px] font-mono text-[#168BFF]">
            P1: HEAD + LEFT / RIGHT WRIST REQUIRED
          </div>
        )}
        {controlMode === 'camera' && !p2Ready && !isPaused && (
          <div className="absolute bottom-3 right-3 border border-[#E65361]/40 bg-[#0B0E0D]/90 px-2.5 py-1.5 text-[10px] font-mono text-[#E65361]">
            P2: HEAD + LEFT / RIGHT WRIST REQUIRED
          </div>
        )}

        {controlMode === 'camera' && showTrackingPreview && (
          <div className="absolute right-3 top-3 w-[min(30%,220px)] overflow-hidden border border-[#A6AAA2]/50 bg-[#0B0E0D]">
            <div className="flex items-center justify-between bg-[#121715]/95 px-2 py-1 text-[9px] font-mono uppercase text-[#EAE7DE]">
              <span>Pose inputs</span>
              <button type="button" onClick={onCloseTrackingPreview} aria-label="Close pose preview" className="p-1 text-[#A6AAA2] hover:text-white">
                <X size={12} />
              </button>
            </div>
            <canvas ref={previewCanvasRef} width={640} height={360} className="block aspect-video w-full" />
          </div>
        )}
      </div>

      <p className="text-center text-[10px] font-mono uppercase text-[#A6AAA2]">
        {controlMode === 'camera'
          ? 'P1 stays left · P2 stays right · thrust either wrist to punch · raise a hand to guard'
          : controlMode === 'vs-ai'
            ? 'A / D move · W duck · S guard · F jab · G cross · V uppercut'
            : 'P1: A / D move · W duck · S guard · F / G / V punch  |  P2: J / L move · I duck · K guard · U / O / M punch'}
      </p>
    </div>
  );
};