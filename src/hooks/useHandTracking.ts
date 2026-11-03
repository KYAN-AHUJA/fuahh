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
  detectedColor: { r: 128, g: 128, b: 128, hex: '#808080' },
  colorScore: 0,
};

interface UseHandTrackingProps {
  videoElement: HTMLVideoElement | null;
  isEnabled: boolean;
  smoothingFactor?: number; // 0.1 .. 0.5 (lower = faster response)
  p1ColorTarget?: ColorTarget; // Black wrist marker target
  p2ColorTarget?: ColorTarget; // Red target
  colorTolerance?: number;
  onHandsUpdate?: (p1: HandData, p2: HandData) => void;
}

export function useHandTracking({
  videoElement,
  isEnabled,
  smoothingFactor = 0.25,
  p1ColorTarget = { r: 18, g: 18, b: 18, hex: '#121212' },
  p2ColorTarget = { r: 230, g: 83, b: 97, hex: '#E65361' },
  colorTolerance = 120,
  onHandsUpdate,
}: UseHandTrackingProps) {
  const [p1Hand, setP1Hand] = useState<HandData>({ ...DEFAULT_HAND, x: 0.25 });
  const [p2Hand, setP2Hand] = useState<HandData>({ ...DEFAULT_HAND, x: 0.75 });
  const [isModelReady, setIsModelReady] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const handsInstanceRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const videoFrameCallbackIdRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  // Stable tracking references
  const prevP1Ref = useRef<HandData>({ ...DEFAULT_HAND, x: 0.25 });
  const prevP2Ref = useRef<HandData>({ ...DEFAULT_HAND, x: 0.75 });
  const rawP1PositionRef = useRef({ x: 0.25, y: 0.5 });
  const rawP2PositionRef = useRef({ x: 0.75, y: 0.5 });
  const p1VelocityFilterRef = useRef({ x: 0, y: 0 });
  const p2VelocityFilterRef = useRef({ x: 0, y: 0 });
  const lastProcessedTimeRef = useRef(performance.now());

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
        if (attempts < 25) {
          attempts++;
          setTimeout(initMediaPipe, 200);
        } else {
          setDetectionError('MediaPipe Hands library failed to load from CDN.');
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
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.45,
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

  // Sample only around the wrist so natural skin color cannot identify a player.
  const sampleColor = useCallback((
    video: HTMLVideoElement,
    landmarks: any[],
    blackTarget: ColorTarget,
    redTarget: ColorTarget,
    tolerance: number,
  ) => {
    if (!offscreenCanvasRef.current || !video || video.readyState < 2) {
      return { color: { r: 128, g: 128, b: 128, hex: '#808080' }, blackMatches: 0, redMatches: 0 };
    }

    try {
      const ctx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return { color: { r: 128, g: 128, b: 128, hex: '#808080' }, blackMatches: 0, redMatches: 0 };

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const wrist = landmarks[0];
      const palm = landmarks[9];
      const handWidth = Math.hypot((landmarks[5].x - landmarks[17].x) * vw, (landmarks[5].y - landmarks[17].y) * vh);
      const cropSize = Math.max(16, handWidth * 0.8);
      const wristX = wrist.x * vw;
      const wristY = wrist.y * vh;
      const palmX = palm.x * vw;
      const palmY = palm.y * vh;
      const centerX = wristX + (wristX - palmX) * 0.12;
      const centerY = wristY + (wristY - palmY) * 0.12;
      const sx = Math.max(0, Math.floor(centerX - cropSize / 2));
      const sy = Math.max(0, Math.floor(centerY - cropSize / 2));
      const sw = Math.max(1, Math.min(vw - sx, Math.ceil(cropSize)));
      const sh = Math.max(1, Math.min(vh - sy, Math.ceil(cropSize)));

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      let r = 0, g = 0, b = 0, count = 0;
      let blackR = 0, blackG = 0, blackB = 0, blackMatches = 0;
      let redR = 0, redG = 0, redB = 0, redMatches = 0;
      const toleranceSquared = tolerance * tolerance;

      for (let i = 0; i < imgData.data.length; i += 4) {
        const pixelR = imgData.data[i];
        const pixelG = imgData.data[i + 1];
        const pixelB = imgData.data[i + 2];
        r += pixelR;
        g += pixelG;
        b += pixelB;
        count++;

        const blackRDiff = pixelR - blackTarget.r;
        const blackGDiff = pixelG - blackTarget.g;
        const blackBDiff = pixelB - blackTarget.b;
        const luminance = pixelR * 0.299 + pixelG * 0.587 + pixelB * 0.114;
        if (
          luminance <= 90 &&
          blackRDiff * blackRDiff + blackGDiff * blackGDiff + blackBDiff * blackBDiff <= toleranceSquared
        ) {
          blackR += pixelR;
          blackG += pixelG;
          blackB += pixelB;
          blackMatches++;
        }

        const redRDiff = pixelR - redTarget.r;
        const redGDiff = pixelG - redTarget.g;
        const redBDiff = pixelB - redTarget.b;
        const redDominance = pixelR - Math.max(pixelG, pixelB);
        const redSaturation = Math.max(pixelR, pixelG, pixelB) === 0
          ? 0
          : (Math.max(pixelR, pixelG, pixelB) - Math.min(pixelR, pixelG, pixelB)) / Math.max(pixelR, pixelG, pixelB);
        if (
          redDominance >= 40 &&
          redSaturation >= 0.5 &&
          redRDiff * redRDiff + redGDiff * redGDiff + redBDiff * redBDiff <= toleranceSquared
        ) {
          redR += pixelR;
          redG += pixelG;
          redB += pixelB;
          redMatches++;
        }
      }

      const selectedCount = Math.max(blackMatches, redMatches);
      const selectedR = blackMatches >= redMatches ? blackR : redR;
      const selectedG = blackMatches >= redMatches ? blackG : redG;
      const selectedB = blackMatches >= redMatches ? blackB : redB;
      const avgR = Math.round(selectedCount > 0 ? selectedR / selectedCount : r / count);
      const avgG = Math.round(selectedCount > 0 ? selectedG / selectedCount : g / count);
      const avgB = Math.round(selectedCount > 0 ? selectedB / selectedCount : b / count);
      const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
      return { color: { r: avgR, g: avgG, b: avgB, hex }, blackMatches, redMatches };
    } catch {
      // fallback
    }

    return { color: { r: 128, g: 128, b: 128, hex: '#808080' }, blackMatches: 0, redMatches: 0 };
  }, []);

  // Distance between 2 colors in Euclidean RGB
  const colorDist = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) => {
    return Math.hypot(c1.r - c2.r, c1.g - c2.g, c1.b - c2.b);
  };

  // Analyze single hand gesture (fist / pinch)
  const analyzeGesture = (landmarks: { x: number; y: number; z: number }[]) => {
    if (!landmarks || landmarks.length < 21) {
      return { isFist: false, isPinching: false };
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];

    // Distance between thumb and index
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    const isPinching = pinchDist < 0.07;

    // Fist: fingertips close to wrist compared to knuckle joints
    const indexKnuckle = landmarks[5];
    const dTip = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const dKnuckle = Math.hypot(indexKnuckle.x - wrist.x, indexKnuckle.y - wrist.y);
    const isFist = dTip < dKnuckle * 1.15;

    return { isFist, isPinching };
  };

  // Process MediaPipe results
  const processResults = (results: any) => {
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastProcessedTimeRef.current) / 1000);
    lastProcessedTimeRef.current = now;

    const multiHandLandmarks: any[] = results.multiHandLandmarks || [];
    const multiHandedness: any[] = results.multiHandedness || [];

    let nextP1: HandData = { ...prevP1Ref.current, isDetected: false };
    let nextP2: HandData = { ...prevP2Ref.current, isDetected: false };

    if (multiHandLandmarks.length === 0) {
      nextP1.vx *= 0.7;
      nextP1.vy *= 0.7;
      nextP2.vx *= 0.7;
      nextP2.vy *= 0.7;
      prevP1Ref.current = nextP1;
      prevP2Ref.current = nextP2;
      setP1Hand(nextP1);
      setP2Hand(nextP2);
      onHandsUpdate?.(nextP1, nextP2);
      drawPreview(results, []);
      return;
    }

    // Extract candidates with Color Sampling!
    const candidates = multiHandLandmarks.map((lms: any[], idx: number) => {
      const indexTip = lms[8];
      const palmCenter = lms[9];
      const rawX = 1 - (indexTip.x * 0.65 + palmCenter.x * 0.35);
      const rawY = indexTip.y * 0.65 + palmCenter.y * 0.35;
      const confidence = multiHandedness[idx]?.score || 0.8;
      const { isFist, isPinching } = analyzeGesture(lms);

      // Sample color from video
      const sampled = videoElement
        ? sampleColor(videoElement, lms, p1ColorTarget, p2ColorTarget, colorTolerance)
        : { color: { r: 128, g: 128, b: 128, hex: '#808080' }, blackMatches: 0, redMatches: 0 };
      const distBlack = colorDist(sampled.color, p1ColorTarget);
      const distRed = colorDist(sampled.color, p2ColorTarget);

      return {
        x: rawX,
        y: rawY,
        confidence,
        rawLandmarks: lms,
        isFist,
        isPinching,
        sampledColor: sampled.color,
        distBlack,
        distRed,
        blackMatches: sampled.blackMatches,
        redMatches: sampled.redMatches,
        assignedPlayer: null as 'p1' | 'p2' | null,
      };
    });

    const toHandData = (
      candidate: typeof candidates[number],
      previous: HandData,
      previousRaw: { x: number; y: number },
      filteredVelocity: { x: number; y: number },
      targetDistance: number,
    ): HandData => {
      const alphaForCutoff = (cutoff: number) => {
        const tau = 1 / (2 * Math.PI * cutoff);
        return 1 / (1 + tau / dt);
      };
      const minCutoff = 2.4 - smoothingFactor * 3;
      const derivativeAlpha = alphaForCutoff(1);
      const rawVelocityX = (candidate.x - previousRaw.x) / dt;
      const rawVelocityY = (candidate.y - previousRaw.y) / dt;
      const velocityX = filteredVelocity.x + derivativeAlpha * (rawVelocityX - filteredVelocity.x);
      const velocityY = filteredVelocity.y + derivativeAlpha * (rawVelocityY - filteredVelocity.y);
      const alphaX = alphaForCutoff(minCutoff + 4 * Math.abs(velocityX));
      const alphaY = alphaForCutoff(minCutoff + 4 * Math.abs(velocityY));
      const x = previous.x + (candidate.x - previous.x) * alphaX;
      const y = previous.y + (candidate.y - previous.y) * alphaY;

      previousRaw.x = candidate.x;
      previousRaw.y = candidate.y;
      filteredVelocity.x = velocityX;
      filteredVelocity.y = velocityY;

      return {
        isDetected: true,
        x,
        y,
        vx: (x - previous.x) / dt,
        vy: (y - previous.y) / dt,
        confidence: candidate.confidence,
        rawLandmarks: candidate.rawLandmarks,
        isFist: candidate.isFist,
        isPinching: candidate.isPinching,
        lastSeen: now,
        detectedColor: candidate.sampledColor,
        colorScore: Math.max(0, 1 - targetDistance / 255),
      };
    };

    const blackCandidate = candidates
      .filter(candidate => candidate.blackMatches >= 12 && candidate.blackMatches > candidate.redMatches)
      .sort((a, b) => b.blackMatches - a.blackMatches)[0];
    const redCandidate = candidates
      .filter(candidate => candidate.redMatches >= 12 && candidate.redMatches > candidate.blackMatches)
      .sort((a, b) => b.redMatches - a.redMatches)[0];

    if (blackCandidate) {
      blackCandidate.assignedPlayer = 'p1';
      nextP1 = toHandData(
        blackCandidate,
        prevP1Ref.current,
        rawP1PositionRef.current,
        p1VelocityFilterRef.current,
        blackCandidate.distBlack,
      );
    }
    if (redCandidate) {
      redCandidate.assignedPlayer = 'p2';
      nextP2 = toHandData(
        redCandidate,
        prevP2Ref.current,
        rawP2PositionRef.current,
        p2VelocityFilterRef.current,
        redCandidate.distRed,
      );
    }

    prevP1Ref.current = nextP1;
    prevP2Ref.current = nextP2;
    setP1Hand(nextP1);
    setP2Hand(nextP2);
    onHandsUpdate?.(nextP1, nextP2);

    drawPreview(results, candidates);
  };

  // Draw skeleton & landmarks with color swatch onto preview canvas
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
    } else {
      ctx.fillStyle = '#0f141c';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(10, 13, 18, 0.45)';
    ctx.fillRect(0, 0, width, height);

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
      const strokeColor = isP1 ? '#e5e7eb' : isP2 ? '#E65361' : '#94a3b8';

      // Draw bone connections
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      CONNECTIONS.forEach(([i, j]) => {
        const ptA = landmarks[i];
        const ptB = landmarks[j];
        ctx.beginPath();
        ctx.moveTo((1 - ptA.x) * width, ptA.y * height);
        ctx.lineTo((1 - ptB.x) * width, ptB.y * height);
        ctx.stroke();
      });

      // Draw joints
      landmarks.forEach((pt: any, i: number) => {
        const x = (1 - pt.x) * width;
        const y = pt.y * height;
        const isTip = [4, 8, 12, 16, 20].includes(i);

        ctx.fillStyle = isTip ? '#ffffff' : strokeColor;
        ctx.beginPath();
        ctx.arc(x, y, isTip ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (i === 8) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.stroke();

          // Player indicator & detected color swatch
          ctx.fillStyle = strokeColor;
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(isP1 ? 'P1 (BLACK)' : isP2 ? 'P2 (RED)' : 'MARKER MISMATCH', x + 12, y - 6);

          if (candidate?.sampledColor) {
            // Draw small color sample box
            ctx.fillStyle = candidate.sampledColor.hex;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.fillRect(x + 12, y + 2, 14, 14);
            ctx.strokeRect(x + 12, y + 2, 14, 14);
          }
        }
      });
    });
  };

  // Process only newly presented camera frames when the browser supports it.
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
        // drop frame
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
    isTrackingBoth: p1Hand.isDetected && p2Hand.isDetected,
  };
}
