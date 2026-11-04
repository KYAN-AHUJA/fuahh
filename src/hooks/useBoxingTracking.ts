import { useEffect, useRef, useState } from 'react';
import type { HumanWorkerFrame, HumanWorkerResponse } from '../workers/humanTracking.types';

export interface BoxingPoint {
  isDetected: boolean;
  x: number;
  y: number;
  confidence: number;
}

export interface BoxingPlayerTracking {
  head: BoxingPoint;
  body: BoxingPoint;
  leftHand: BoxingPoint;
  rightHand: BoxingPoint;
}

export interface BoxingTrackingState {
  p1: BoxingPlayerTracking;
  p2: BoxingPlayerTracking;
}

const EMPTY_POINT: BoxingPoint = { isDetected: false, x: 0, y: 0, confidence: 0 };
const EMPTY_PLAYER: BoxingPlayerTracking = {
  head: EMPTY_POINT,
  body: EMPTY_POINT,
  leftHand: EMPTY_POINT,
  rightHand: EMPTY_POINT,
};
const EMPTY_TRACKING: BoxingTrackingState = { p1: EMPTY_PLAYER, p2: EMPTY_PLAYER };

interface UseBoxingTrackingOptions {
  videoElement: HTMLVideoElement | null;
  isEnabled: boolean;
}

export function useBoxingTracking({ videoElement, isEnabled }: UseBoxingTrackingOptions) {
  const [players, setPlayers] = useState<BoxingTrackingState>(EMPTY_TRACKING);
  const playersRef = useRef<BoxingTrackingState>(EMPTY_TRACKING);
  const [isModelReady, setIsModelReady] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const humanWorkerRef = useRef<Worker | null>(null);
  const nextRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isEnabled || !videoElement) {
      setPlayers(EMPTY_TRACKING);
      playersRef.current = EMPTY_TRACKING;
      setIsModelReady(false);
      return;
    }

    let active = true;
    let processing = false;
    let lastInferenceTime = 0;
    let lastPublishedTime = 0;
    let lastReadiness = '';
    let animationFrameId: number | null = null;
    let videoFrameCallbackId: number | null = null;
    const latestPlayers: BoxingTrackingState = {
      p1: { ...EMPTY_PLAYER },
      p2: { ...EMPTY_PLAYER },
    };

    const pointFromKeypoint = (landmark: HumanWorkerFrame['bodies'][number]['keypoints'][number] | undefined, sourceX: number): BoxingPoint => {
      const confidence = landmark?.score ?? 0;
      return {
        isDetected: confidence >= 0.35,
        x: 1 - (sourceX + (landmark?.positionRaw[0] ?? 0) * 0.5),
        y: landmark?.positionRaw[1] ?? 0,
        confidence,
      };
    };

    const playerFromResult = (frame: HumanWorkerFrame | undefined, sourceX: number): BoxingPlayerTracking => {
      const body = frame?.bodies[0];
      if (!body) return { ...EMPTY_PLAYER };

      const findKeypoint = (part: string) => body.keypoints.find((keypoint) => keypoint.part === part);
      const head = findKeypoint('nose') ?? findKeypoint('head') ?? findKeypoint('neck');
      const leftShoulder = findKeypoint('leftShoulder');
      const rightShoulder = findKeypoint('rightShoulder');
      const bodyCenter = leftShoulder && rightShoulder
        ? pointFromKeypoint({
            part: 'bodyCenter',
            positionRaw: [
              (leftShoulder.positionRaw[0] + rightShoulder.positionRaw[0]) / 2,
              (leftShoulder.positionRaw[1] + rightShoulder.positionRaw[1]) / 2,
            ],
            score: Math.min(leftShoulder.score, rightShoulder.score),
          }, sourceX)
        : { ...EMPTY_POINT };

      return {
        head: pointFromKeypoint(head, sourceX),
        body: bodyCenter,
        leftHand: pointFromKeypoint(findKeypoint('leftWrist'), sourceX),
        rightHand: pointFromKeypoint(findKeypoint('rightWrist'), sourceX),
      };
    };

    const updatePlayers = (p1: BoxingPlayerTracking, p2: BoxingPlayerTracking) => {
      if (!active) return;
      latestPlayers.p1 = p1;
      latestPlayers.p2 = p2;
      const currentPlayers = { p1: { ...latestPlayers.p1 }, p2: { ...latestPlayers.p2 } };
      playersRef.current = currentPlayers;

      const readiness = [
        currentPlayers.p1.head.isDetected,
        currentPlayers.p1.leftHand.isDetected,
        currentPlayers.p1.rightHand.isDetected,
        currentPlayers.p2.head.isDetected,
        currentPlayers.p2.leftHand.isDetected,
        currentPlayers.p2.rightHand.isDetected,
      ].map(Number).join('');
      const now = performance.now();
      if (readiness !== lastReadiness || now - lastPublishedTime >= 50) {
        lastReadiness = readiness;
        lastPublishedTime = now;
        setPlayers(currentPlayers);
      }
    };

    const drawPreview = () => {
      const canvas = previewCanvasRef.current;
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;

      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
        context.save();
        context.scale(-1, 1);
        context.drawImage(videoElement, -width, 0, width, height);
        context.restore();
      } else {
        context.fillStyle = '#121715';
        context.fillRect(0, 0, width, height);
      }

      context.fillStyle = 'rgba(11, 14, 13, 0.35)';
      context.fillRect(0, 0, width, height);
      context.setLineDash([6, 6]);
      context.strokeStyle = 'rgba(234, 231, 222, 0.55)';
      context.beginPath();
      context.moveTo(width / 2, 0);
      context.lineTo(width / 2, height);
      context.stroke();
      context.setLineDash([]);

      ([['p1', '#168BFF'], ['p2', '#E65361']] as const).forEach(([playerId, color]) => {
        const player = latestPlayers[playerId];
        ([player.head, player.leftHand, player.rightHand] as BoxingPoint[]).forEach((point, index) => {
          if (!point.isDetected) return;
          const x = point.x * width;
          const y = point.y * height;
          context.beginPath();
          context.arc(x, y, index === 0 ? 8 : 6, 0, Math.PI * 2);
          context.fillStyle = color;
          context.fill();
          context.lineWidth = 2;
          context.strokeStyle = '#EAE7DE';
          context.stroke();
        });
      });
    };

    const scheduleFrame = () => {
      if (!active) return;
      const videoWithFrameCallback = videoElement as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: () => void) => number;
      };
      if (videoWithFrameCallback.requestVideoFrameCallback) {
        videoFrameCallbackId = videoWithFrameCallback.requestVideoFrameCallback(() => {
          void processFrame();
        });
      } else {
        animationFrameId = requestAnimationFrame(() => {
          void processFrame();
        });
      }
    };

    const processFrame = async () => {
      if (!active || !humanWorkerRef.current) return;
      const now = performance.now();
      if (videoElement.readyState >= 2 && !videoElement.paused && !processing && now - lastInferenceTime >= 1000 / 30) {
        processing = true;
        lastInferenceTime = now;
        try {
          const bitmap = await createImageBitmap(videoElement);
          const worker = humanWorkerRef.current;
          if (!worker || !active) {
            bitmap.close();
            processing = false;
          } else {
            worker.postMessage({ type: 'detect', id: ++nextRequestIdRef.current, image: bitmap }, [bitmap]);
          }
        } catch {
          processing = false;
          if (active) setTrackingError('Pose tracking stopped responding. Check the camera and try again.');
        } finally {
        }
      }
      if (active) scheduleFrame();
    };

    setTrackingError(null);
    const worker = new Worker(new URL('../workers/humanTracking.worker.ts', import.meta.url), { type: 'module' });
    humanWorkerRef.current = worker;
    worker.onmessage = (event: MessageEvent<HumanWorkerResponse>) => {
      if (!active) return;
      const message = event.data;
      if (message.type === 'ready') {
        setIsModelReady(true);
        scheduleFrame();
      } else if (message.type === 'error') {
        if (message.id !== undefined) processing = false;
        setTrackingError(`Human.js body tracking failed: ${message.message}`);
      } else {
        processing = false;
        updatePlayers(playerFromResult(message.frames[0], 0.5), playerFromResult(message.frames[1], 0));
        drawPreview();
      }
    };
    worker.onerror = (event) => {
      processing = false;
      if (active) setTrackingError(`Human.js body worker failed: ${event.message}`);
    };
    worker.postMessage({ type: 'initialize', mode: 'boxing' });

    return () => {
      active = false;
      if (humanWorkerRef.current === worker) humanWorkerRef.current = null;
      worker.terminate();
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (videoFrameCallbackId !== null) {
        const videoWithFrameCallback = videoElement as HTMLVideoElement & {
          cancelVideoFrameCallback?: (callbackId: number) => void;
        };
        videoWithFrameCallback.cancelVideoFrameCallback?.(videoFrameCallbackId);
      }
    };
  }, [isEnabled, videoElement]);

  return { players, playersRef, isModelReady, trackingError, previewCanvasRef };
}