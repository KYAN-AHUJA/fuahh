import { useState, useRef, useEffect, useCallback } from 'react';
import { HandData, ColorTarget } from '../types';

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

const DEFAULT_HAND: HandData = {
  isDetected: false,
  x: 0.5,
  y: 0.5,
  vx: 0,
  vy: 0,
  confidence: 0,
  rawLandmarks: [],
  isFist: false,
  isPinching: false,
  lastSeen: 0,
  detectedColor: { r: 22, g: 139, b: 255, hex: '#168BFF' },
  colorScore: 0,
};

interface UseHandTrackingProps {
  videoElement: HTMLVideoElement | null;
  isEnabled: boolean;
  smoothingFactor?: number;
  p1ColorTarget?: ColorTarget;
  p2ColorTarget?: ColorTarget;
  colorTolerance?: number;
  onHandsUpdate?: (p1: HandData, p2: HandData) => void;
}

export function useHandTracking({
  videoElement,
  isEnabled,
  smoothingFactor = 0.15,
  p1ColorTarget = { r: 22, g: 139, b: 255, hex: '#168BFF' },
  p2ColorTarget = { r: 230, g: 83, b: 97, hex: '#E65361' },
  colorTolerance = 120,
  onHandsUpdate,
}: UseHandTrackingProps) {
  const [p1Hand, setP1Hand] = useState<HandData>({ ...DEFAULT_HAND, x: 0.22 });
  const [p2Hand, setP2Hand] = useState<HandData>({ ...DEFAULT_HAND, x: 0.78 });
  const [isModelReady, setIsModelReady] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [trackingFps, setTrackingFps] = useState<number>(60);
  const [handsDetectedCount, setHandsDetectedCount] = useState<number>(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const videoFrameCallbackIdRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Stable tracking references
  const prevP1Ref = useRef<HandData>({ ...DEFAULT_HAND, x: 0.22 });
  const prevP2Ref = useRef<HandData>({ ...DEFAULT_HAND, x: 0.78 });
  const rawP1PositionRef = useRef({ x: 0.22, y: 0.5 });
  const rawP2PositionRef = useRef({ x: 0.78, y: 0.5 });
  const p1VelocityFilterRef = useRef({ x: 0, y: 0 });
  const p2VelocityFilterRef = useRef({ x: 0, y: 0 });
  const lastProcessedTimeRef = useRef(performance.now());

  // FPS calculation
  const frameTimesRef = useRef<number[]>([]);

  // Setup offscreen canvas for color sampling
  useEffect(() => {
    if (typeof document !== 'undefined' && !offscreenCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      offscreenCanvasRef.current = c;
    }
  }, []);

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!isEnabled) return;

    let isMounted = true;
    let attempts = 0;

    const initMediaPipe = () => {
      if (typeof window === 'undefined') return;

      if (!window.Hands) {
        if (attempts < 30) {
          attempts++;
          setTimeout(initMediaPipe, 200);
        } else {
          setDetectionError('MediaPipe Hands library could not be loaded.');
        }
        return;
      }

      try {
        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0,
          minDetectionConfidence: 0.45,
          minTrackingConfidence: 0.4,
        });

        hands.onResults((results: any) => {
          if (!isMounted) return;
          processResults(results);
        });

        handsInstanceRef.current = hands;
        setIsModelReady(true);
      } catch (err: any) {
        console.error('[HandTracking] Failed to initialize Hands:', err);
        setDetectionError('Failed to initialize hand detection model.');
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (handsInstanceRef.current) {
        try {
          handsInstanceRef.current.close();
        } catch {
          // ignore
        }
        handsInstanceRef.current = null;
      }
    };
  }, [isEnabled]);

  // Color distance helper
  const colorDist = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) => {
    return Math.hypot(c1.r - c2.r, c1.g - c2.g, c1.b - c2.b);
  };

  // Sample wrist color
  const sampleColor = useCallback((
    video: HTMLVideoElement,
    landmarks: any[],
  ) => {
    if (!offscreenCanvasRef.current || !video || video.readyState < 2) {
      return { r: 128, g: 128, b: 128, hex: '#808080' };
    }

    try {
      const ctx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return { r: 128, g: 128, b: 128, hex: '#808080' };

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const wrist = landmarks[0];
      const cropSize = 28;
      const sx = Math.max(0, Math.min(vw - cropSize, Math.floor(wrist.x * vw - cropSize / 2)));
      const sy = Math.max(0, Math.min(vh - cropSize, Math.floor(wrist.y * vh - cropSize / 2)));

      ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        r += imgData.data[i];
        g += imgData.data[i + 1];
        b += imgData.data[i + 2];
        count++;
      }
      const avgR = Math.round(r / count);
      const avgG = Math.round(g / count);
      const avgB = Math.round(b / count);
      const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
      return { r: avgR, g: avgG, b: avgB, hex };
    } catch {
      return { r: 128, g: 128, b: 128, hex: '#808080' };
    }
  }, []);

  // Gesture analysis: detect fist or pinch
  const analyzeGesture = (landmarks: { x: number; y: number; z: number }[]) => {
    if (!landmarks || landmarks.length < 21) {
      return { isFist: false, isPinching: false };
    }
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];

    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < 0.08;

    const indexKnuckle = landmarks[5];
    const dTip = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const dKnuckle = Math.hypot(indexKnuckle.x - wrist.x, indexKnuckle.y - wrist.y);
    const isFist = dTip < dKnuckle * 1.18;

    return { isFist, isPinching };
  };

  // Process MediaPipe results
  const processResults = (results: any) => {
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastProcessedTimeRef.current) / 1000);
    lastProcessedTimeRef.current = now;

    // Rolling FPS update
    frameTimesRef.current.push(now);
    if (frameTimesRef.current.length > 20) frameTimesRef.current.shift();
    if (frameTimesRef.current.length > 2) {
      const duration = (frameTimesRef.current[frameTimesRef.current.length - 1] - frameTimesRef.current[0]) / 1000;
      if (duration > 0) {
        setTrackingFps(Math.round((frameTimesRef.current.length - 1) / duration));
      }
    }

    const multiHandLandmarks: any[] = results.multiHandLandmarks || [];
    const multiHandedness: any[] = results.multiHandedness || [];
    setHandsDetectedCount(multiHandLandmarks.length);

    let nextP1: HandData = { ...prevP1Ref.current, isDetected: false };
    let nextP2: HandData = { ...prevP2Ref.current, isDetected: false };

    if (multiHandLandmarks.length === 0) {
      nextP1.vx *= 0.6;
      nextP1.vy *= 0.6;
      nextP2.vx *= 0.6;
      nextP2.vy *= 0.6;
      prevP1Ref.current = nextP1;
      prevP2Ref.current = nextP2;
      setP1Hand(nextP1);
      setP2Hand(nextP2);
      onHandsUpdate?.(nextP1, nextP2);
      drawPreview(results, []);
      return;
    }

    // Extract candidates (mirroring x for webcam)
    const candidates = multiHandLandmarks.map((lms: any[], idx: number) => {
      const indexTip = lms[8];
      const palmCenter = lms[9];
      // Mirrored horizontal coordinates so user's physical left moves screen left
      const rawX = 1 - (indexTip.x * 0.65 + palmCenter.x * 0.35);
      const rawY = indexTip.y * 0.65 + palmCenter.y * 0.35;
      const confidence = multiHandedness[idx]?.score || 0.85;
      const { isFist, isPinching } = analyzeGesture(lms);
      const sampledColor = videoElement ? sampleColor(videoElement, lms) : { r: 128, g: 128, b: 128, hex: '#808080' };

      return {
        x: rawX,
        y: rawY,
        confidence,
        rawLandmarks: lms,
        isFist,
        isPinching,
        sampledColor,
        assignedPlayer: null as 'p1' | 'p2' | null,
      };
    });

    // Stable Player Assignment:
    // P1 (Blue) is left side (x < 0.5), P2 (Red) is right side (x >= 0.5).
    // If two hands are present, the one with smaller x is P1, the one with larger x is P2.
    if (candidates.length === 2) {
      const sortedByX = [...candidates].sort((a, b) => a.x - b.x);
      sortedByX[0].assignedPlayer = 'p1';
      sortedByX[1].assignedPlayer = 'p2';
    } else if (candidates.length === 1) {
      const c = candidates[0];
      // Check distance to previous positions for temporal stability
      const distToP1 = Math.hypot(c.x - prevP1Ref.current.x, c.y - prevP1Ref.current.y);
      const distToP2 = Math.hypot(c.x - prevP2Ref.current.x, c.y - prevP2Ref.current.y);

      if (prevP1Ref.current.isDetected && !prevP2Ref.current.isDetected && distToP1 < 0.35) {
        c.assignedPlayer = 'p1';
      } else if (prevP2Ref.current.isDetected && !prevP1Ref.current.isDetected && distToP2 < 0.35) {
        c.assignedPlayer = 'p2';
      } else {
        // Fall back to screen hemisphere
        c.assignedPlayer = c.x < 0.5 ? 'p1' : 'p2';
      }
    }

    const toHandData = (
      candidate: typeof candidates[number],
      previous: HandData,
      previousRaw: { x: number; y: number },
      filteredVelocity: { x: number; y: number },
      assignedColor: string
    ): HandData => {
      // Responsive smoothing filter
      const lerp = Math.min(1, Math.max(0.15, 1 - smoothingFactor));
      const smoothX = previous.x + (candidate.x - previous.x) * lerp;
      const smoothY = previous.y + (candidate.y - previous.y) * lerp;

      const vx = (smoothX - previous.x) / dt;
      const vy = (smoothY - previous.y) / dt;

      previousRaw.x = candidate.x;
      previousRaw.y = candidate.y;
      filteredVelocity.x = vx;
      filteredVelocity.y = vy;

      return {
        isDetected: true,
        x: smoothX,
        y: smoothY,
        vx,
        vy,
        confidence: candidate.confidence,
        rawLandmarks: candidate.rawLandmarks,
        isFist: candidate.isFist,
        isPinching: candidate.isPinching,
        lastSeen: now,
        detectedColor: { r: 0, g: 0, b: 0, hex: assignedColor },
        colorScore: 1.0,
      };
    };

    const p1Candidate = candidates.find(c => c.assignedPlayer === 'p1');
    const p2Candidate = candidates.find(c => c.assignedPlayer === 'p2');

    if (p1Candidate) {
      nextP1 = toHandData(p1Candidate, prevP1Ref.current, rawP1PositionRef.current, p1VelocityFilterRef.current, '#168BFF');
    }
    if (p2Candidate) {
      nextP2 = toHandData(p2Candidate, prevP2Ref.current, rawP2PositionRef.current, p2VelocityFilterRef.current, '#E65361');
    }

    prevP1Ref.current = nextP1;
    prevP2Ref.current = nextP2;
    setP1Hand(nextP1);
    setP2Hand(nextP2);
    onHandsUpdate?.(nextP1, nextP2);

    drawPreview(results, candidates);
  };

  // Draw flat 2D skeleton & landmarks onto preview canvas
  const drawPreview = (results: any, candidates: any[]) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (results.image) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, -width, 0, width, height);
      ctx.restore();
      // Clean dark scrim to match #0B0E0D / #121715 aesthetic
      ctx.fillStyle = 'rgba(11, 14, 13, 0.65)';
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#121715';
      ctx.fillRect(0, 0, width, height);
    }

    const landmarksList = results.multiHandLandmarks || [];
    const CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17],
    ];

    landmarksList.forEach((landmarks: any[], idx: number) => {
      const candidate = candidates[idx];
      const isP1 = candidate?.assignedPlayer === 'p1';
      const isP2 = candidate?.assignedPlayer === 'p2';
      const strokeColor = isP1 ? '#168BFF' : isP2 ? '#E65361' : '#A6AAA2';

      // Crisp 2D bones
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      CONNECTIONS.forEach(([i, j]) => {
        const ptA = landmarks[i];
        const ptB = landmarks[j];
        ctx.beginPath();
        ctx.moveTo((1 - ptA.x) * width, ptA.y * height);
        ctx.lineTo((1 - ptB.x) * width, ptB.y * height);
        ctx.stroke();
      });

      // Crisp 2D joints
      landmarks.forEach((pt: any, i: number) => {
        const x = (1 - pt.x) * width;
        const y = pt.y * height;
        const isTip = [4, 8, 12, 16, 20].includes(i);

        ctx.fillStyle = isTip ? '#EAE7DE' : strokeColor;
        ctx.beginPath();
        ctx.arc(x, y, isTip ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (i === 8) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.stroke();

          // Clean small flat badge
          ctx.fillStyle = strokeColor;
          ctx.font = '600 10px Inter, sans-serif';
          ctx.fillText(isP1 ? 'P1 · BLUE' : isP2 ? 'P2 · RED' : 'HAND', x + 10, y - 4);
        }
      });
    });
  };

  // Video frame scheduler
  const sendVideoFrame = useCallback(async () => {
    if (!isEnabled || !handsInstanceRef.current || !videoElement) {
      return;
    }

    if (
      videoElement.readyState >= 2 &&
      !videoElement.paused &&
      !isProcessingRef.current
    ) {
      isProcessingRef.current = true;
      try {
        await handsInstanceRef.current.send({ image: videoElement });
      } catch {
        // drop frame gracefully
      } finally {
        isProcessingRef.current = false;
      }
    }

    const videoWithFrameCallback = videoElement as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
    };
    if (videoWithFrameCallback.requestVideoFrameCallback) {
      videoFrameCallbackIdRef.current = videoWithFrameCallback.requestVideoFrameCallback(() => {
        void sendVideoFrame();
      });
    } else {
      animationFrameIdRef.current = requestAnimationFrame(() => {
        void sendVideoFrame();
      });
    }
  }, [isEnabled, videoElement]);

  useEffect(() => {
    if (isEnabled && isModelReady && videoElement) {
      void sendVideoFrame();
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (videoFrameCallbackIdRef.current !== null && videoElement) {
        const videoWithFrameCallback = videoElement as HTMLVideoElement & {
          cancelVideoFrameCallback?: (callbackId: number) => void;
        };
        videoWithFrameCallback.cancelVideoFrameCallback?.(videoFrameCallbackIdRef.current);
        videoFrameCallbackIdRef.current = null;
      }
    };
  }, [isEnabled, isModelReady, videoElement, sendVideoFrame]);

  return {
    p1Hand,
    p2Hand,
    isModelReady,
    detectionError,
    previewCanvasRef,
    trackingFps,
    handsDetectedCount,
    isTrackingBoth: p1Hand.isDetected && p2Hand.isDetected,
  };
}
