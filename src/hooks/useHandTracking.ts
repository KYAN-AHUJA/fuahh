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
  smoothingFactor?: number; // 0.1 .. 0.5 (lower = smoother)
  p1ColorTarget?: ColorTarget; // Blue target
  p2ColorTarget?: ColorTarget; // Red target
  colorTolerance?: number;
  onHandsUpdate?: (p1: HandData, p2: HandData) => void;
}

export function useHandTracking({
  videoElement,
  isEnabled,
  smoothingFactor = 0.25,
  p1ColorTarget = { r: 22, g: 139, b: 255, hex: '#168BFF' },
  p2ColorTarget = { r: 230, g: 83, b: 97, hex: '#E65361' },
  colorTolerance = 80,
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
  const isProcessingRef = useRef(false);

  // Stable tracking references
  const prevP1Ref = useRef<HandData>({ ...DEFAULT_HAND, x: 0.25 });
  const prevP2Ref = useRef<HandData>({ ...DEFAULT_HAND, x: 0.75 });
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
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
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

  // Color sampling from video stream inside hand/wrist bounding area
  const sampleColor = useCallback((video: HTMLVideoElement, landmarks: any[]) => {
    if (!offscreenCanvasRef.current || !video || video.readyState < 2) {
      return { r: 128, g: 128, b: 128, hex: '#808080' };
    }

    try {
      const ctx = offscreenCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return { r: 128, g: 128, b: 128, hex: '#808080' };

      // Landmarks 0 (wrist), 1 (thumb base), 5 (index knuckle), 9 (middle knuckle), 13 (ring), 17 (pinky base)
      const sampleIndices = [0, 1, 2, 5, 9, 13, 17];
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      sampleIndices.forEach(idx => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });

      // Expand slightly to capture glove / wristband
      minX = Math.max(0, minX - 0.02);
      minY = Math.max(0, minY - 0.02);
      maxX = Math.min(1, maxX + 0.02);
      maxY = Math.min(1, maxY + 0.02);

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      const sx = Math.floor(minX * vw);
      const sy = Math.floor(minY * vh);
      const sw = Math.max(4, Math.floor((maxX - minX) * vw));
      const sh = Math.max(4, Math.floor((maxY - minY) * vh));

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 32, 32);
      const imgData = ctx.getImageData(0, 0, 32, 32);
      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < imgData.data.length; i += 4) {
        r += imgData.data[i];
        g += imgData.data[i + 1];
        b += imgData.data[i + 2];
        count++;
      }

      if (count > 0) {
        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);
        const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
        return { r: avgR, g: avgG, b: avgB, hex };
      }
    } catch {
      // fallback
    }

    return { r: 128, g: 128, b: 128, hex: '#808080' };
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

    const multiHandLandmarks = results.multiHandLandmarks || [];
    const multiHandedness = results.multiHandedness || [];

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
      const sampled = videoElement ? sampleColor(videoElement, lms) : { r: 128, g: 128, b: 128, hex: '#808080' };
      const distBlue = colorDist(sampled, p1ColorTarget);
      const distRed = colorDist(sampled, p2ColorTarget);

      return {
        x: rawX,
        y: rawY,
        confidence,
        rawLandmarks: lms,
        isFist,
        isPinching,
        sampledColor: sampled,
        distBlue,
        distRed,
        assignedPlayer: null as 'p1' | 'p2' | null,
      };
    });

    // Detect player identity by Color Matching (Blue glove/target vs Red glove/target)
    if (candidates.length === 1) {
      const c = candidates[0];
      // Color affinity
      const colorDiff = c.distRed - c.distBlue; // positive => closer to blue (P1), negative => closer to red (P2)
      const colorThreshold = 15; // significant color difference

      let assignToP1 = true;
      if (Math.abs(colorDiff) > colorThreshold) {
        // Strong color match
        assignToP1 = colorDiff > 0;
      } else {
        // Fallback to spatial position and temporal distance
        const distP1 = Math.hypot(c.x - prevP1Ref.current.x, c.y - prevP1Ref.current.y);
        const distP2 = Math.hypot(c.x - prevP2Ref.current.x, c.y - prevP2Ref.current.y);
        const biasP1 = c.x < 0.5 ? 0.2 : 0;
        const biasP2 = c.x >= 0.5 ? 0.2 : 0;
        assignToP1 = (distP1 - biasP1) < (distP2 - biasP2);
      }

      c.assignedPlayer = assignToP1 ? 'p1' : 'p2';

      if (assignToP1) {
        const smoothedX = prevP1Ref.current.x + (c.x - prevP1Ref.current.x) * (1 - smoothingFactor);
        const smoothedY = prevP1Ref.current.y + (c.y - prevP1Ref.current.y) * (1 - smoothingFactor);
        nextP1 = {
          isDetected: true,
          x: smoothedX,
          y: smoothedY,
          vx: (smoothedX - prevP1Ref.current.x) / dt,
          vy: (smoothedY - prevP1Ref.current.y) / dt,
          confidence: c.confidence,
          rawLandmarks: c.rawLandmarks,
          isFist: c.isFist,
          isPinching: c.isPinching,
          lastSeen: now,
          detectedColor: c.sampledColor,
          colorScore: Math.max(0, 1 - c.distBlue / 255),
        };
      } else {
        const smoothedX = prevP2Ref.current.x + (c.x - prevP2Ref.current.x) * (1 - smoothingFactor);
        const smoothedY = prevP2Ref.current.y + (c.y - prevP2Ref.current.y) * (1 - smoothingFactor);
        nextP2 = {
          isDetected: true,
          x: smoothedX,
          y: smoothedY,
          vx: (smoothedX - prevP2Ref.current.x) / dt,
          vy: (smoothedY - prevP2Ref.current.y) / dt,
          confidence: c.confidence,
          rawLandmarks: c.rawLandmarks,
          isFist: c.isFist,
          isPinching: c.isPinching,
          lastSeen: now,
          detectedColor: c.sampledColor,
          colorScore: Math.max(0, 1 - c.distRed / 255),
        };
      }
    } else if (candidates.length >= 2) {
      const [c0, c1] = [candidates[0], candidates[1]];

      // Compare pair matching:
      // Option A: c0 is Blue (P1), c1 is Red (P2)
      const costA = c0.distBlue + c1.distRed;
      // Option B: c1 is Blue (P1), c0 is Red (P2)
      const costB = c1.distBlue + c0.distRed;

      let cBlue = c0;
      let cRed = c1;

      // If color difference is noticeable, assign by color!
      if (Math.abs(costA - costB) > 20) {
        if (costA <= costB) {
          cBlue = c0;
          cRed = c1;
        } else {
          cBlue = c1;
          cRed = c0;
        }
      } else {
        // Fallback: spatial order (leftmost is P1, rightmost is P2)
        if (c0.x <= c1.x) {
          cBlue = c0;
          cRed = c1;
        } else {
          cBlue = c1;
          cRed = c0;
        }
      }

      cBlue.assignedPlayer = 'p1';
      cRed.assignedPlayer = 'p2';

      // Smooth P1
      const p1X = prevP1Ref.current.x + (cBlue.x - prevP1Ref.current.x) * (1 - smoothingFactor);
      const p1Y = prevP1Ref.current.y + (cBlue.y - prevP1Ref.current.y) * (1 - smoothingFactor);
      nextP1 = {
        isDetected: true,
        x: p1X,
        y: p1Y,
        vx: (p1X - prevP1Ref.current.x) / dt,
        vy: (p1Y - prevP1Ref.current.y) / dt,
        confidence: cBlue.confidence,
        rawLandmarks: cBlue.rawLandmarks,
        isFist: cBlue.isFist,
        isPinching: cBlue.isPinching,
        lastSeen: now,
        detectedColor: cBlue.sampledColor,
        colorScore: Math.max(0, 1 - cBlue.distBlue / 255),
      };

      // Smooth P2
      const p2X = prevP2Ref.current.x + (cRed.x - prevP2Ref.current.x) * (1 - smoothingFactor);
      const p2Y = prevP2Ref.current.y + (cRed.y - prevP2Ref.current.y) * (1 - smoothingFactor);
      nextP2 = {
        isDetected: true,
        x: p2X,
        y: p2Y,
        vx: (p2X - prevP2Ref.current.x) / dt,
        vy: (p2Y - prevP2Ref.current.y) / dt,
        confidence: cRed.confidence,
        rawLandmarks: cRed.rawLandmarks,
        isFist: cRed.isFist,
        isPinching: cRed.isPinching,
        lastSeen: now,
        detectedColor: cRed.sampledColor,
        colorScore: Math.max(0, 1 - cRed.distRed / 255),
      };
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
      const isP1 = candidate?.assignedPlayer === 'p1' || ((1 - landmarks[8].x) * width < width / 2);
      const strokeColor = isP1 ? '#168BFF' : '#E65361';

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
          ctx.fillText(isP1 ? 'P1 (BLUE)' : 'P2 (RED)', x + 12, y - 6);

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

  // Video frame loop
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

    animationFrameIdRef.current = requestAnimationFrame(sendVideoFrame);
  }, [isEnabled, videoElement]);

  useEffect(() => {
    if (isEnabled && isModelReady && videoElement) {
      animationFrameIdRef.current = requestAnimationFrame(sendVideoFrame);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
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
