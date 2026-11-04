import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Pose?: any;
  }
}

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

  useEffect(() => {
    if (!isEnabled || !videoElement) {
      setPlayers(EMPTY_TRACKING);
      playersRef.current = EMPTY_TRACKING;
      setIsModelReady(false);
      return;
    }

    let active = true;
    let processing = false;
    let retryCount = 0;
    let lastInferenceTime = 0;
    let lastPublishedTime = 0;
    let lastReadiness = '';
    let animationFrameId: number | null = null;
    let videoFrameCallbackId: number | null = null;
    let p1Pose: any = null;
    let p2Pose: any = null;
    const p1Canvas = document.createElement('canvas');
    const p2Canvas = document.createElement('canvas');
    const p1Context = p1Canvas.getContext('2d');
    const p2Context = p2Canvas.getContext('2d');
    const latestPlayers: BoxingTrackingState = {
      p1: { ...EMPTY_PLAYER },
      p2: { ...EMPTY_PLAYER },
    };

    const pointFromLandmark = (landmark: any, sourceX: number): BoxingPoint => {
      const confidence = landmark?.visibility ?? 0;
      return {
        isDetected: confidence >= 0.35,
        x: 1 - (sourceX + (landmark?.x ?? 0) * 0.5),
        y: landmark?.y ?? 0,
        confidence,
      };
    };

    const updatePlayer = (playerId: 'p1' | 'p2', results: any) => {
      if (!active) return;
      const landmarks = results.poseLandmarks;
      const sourceX = playerId === 'p1' ? 0.5 : 0;
      const player = landmarks?.length >= 17
        ? {
            head: pointFromLandmark(landmarks[0], sourceX),
            body: pointFromLandmark({
              x: (landmarks[11].x + landmarks[12].x) / 2,
              y: (landmarks[11].y + landmarks[12].y) / 2,
              visibility: Math.min(landmarks[11].visibility ?? 0, landmarks[12].visibility ?? 0),
            }, sourceX),
            leftHand: pointFromLandmark(landmarks[15], sourceX),
            rightHand: pointFromLandmark(landmarks[16], sourceX),
          }
        : { ...EMPTY_PLAYER };

      latestPlayers[playerId] = player;
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
      if (readiness !== lastReadiness || now - lastPublishedTime >= 100) {
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
      if (!active || !p1Pose || !p2Pose || !p1Context || !p2Context) return;
      const now = performance.now();
      if (videoElement.readyState >= 2 && !videoElement.paused && !processing && now - lastInferenceTime >= 50) {
        processing = true;
        lastInferenceTime = now;
        try {
          const halfWidth = Math.floor(videoElement.videoWidth / 2);
          const videoHeight = videoElement.videoHeight;
          if (halfWidth > 0 && videoHeight > 0) {
            p1Canvas.width = halfWidth;
            p1Canvas.height = videoHeight;
            p2Canvas.width = halfWidth;
            p2Canvas.height = videoHeight;
            p1Context.drawImage(videoElement, halfWidth, 0, halfWidth, videoHeight, 0, 0, halfWidth, videoHeight);
            p2Context.drawImage(videoElement, 0, 0, halfWidth, videoHeight, 0, 0, halfWidth, videoHeight);
            await Promise.all([
              p1Pose.send({ image: p1Canvas }),
              p2Pose.send({ image: p2Canvas }),
            ]);
            drawPreview();
          }
        } catch {
          if (active) setTrackingError('Pose tracking stopped responding. Check the camera and try again.');
        } finally {
          processing = false;
        }
      }
      scheduleFrame();
    };

    const initialize = () => {
      if (!active) return;
      if (!window.Pose) {
        if (retryCount++ < 30) {
          window.setTimeout(initialize, 200);
        } else {
          setTrackingError('MediaPipe Pose could not be loaded. Check your internet connection and reload.');
        }
        return;
      }

      try {
        const createPose = (playerId: 'p1' | 'p2') => {
          const pose = new window.Pose({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          });
          pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.4,
          });
          pose.onResults((results: any) => updatePlayer(playerId, results));
          return pose;
        };

        p1Pose = createPose('p1');
        p2Pose = createPose('p2');
        setTrackingError(null);
        setIsModelReady(true);
        scheduleFrame();
      } catch {
        setTrackingError('Failed to initialize the boxing pose trackers.');
      }
    };

    initialize();
    return () => {
      active = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      if (videoFrameCallbackId !== null) {
        const videoWithFrameCallback = videoElement as HTMLVideoElement & {
          cancelVideoFrameCallback?: (callbackId: number) => void;
        };
        videoWithFrameCallback.cancelVideoFrameCallback?.(videoFrameCallbackId);
      }
      p1Pose?.close();
      p2Pose?.close();
    };
  }, [isEnabled, videoElement]);

  return { players, playersRef, isModelReady, trackingError, previewCanvasRef };
}