/// <reference lib="webworker" />

import type { HumanWorkerFrame, HumanWorkerRequest, HumanWorkerResponse, HumanTrackingMode } from './humanTracking.types';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import type { Human as HumanModel } from '@vladmandic/human';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let human: HumanModel | null = null;
let handLandmarker: HandLandmarker | null = null;
let mode: HumanTrackingMode = 'hands';
let busy = false;

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const serializeFrame = async (image: ImageBitmap, sourceX: number): Promise<HumanWorkerFrame> => {
  if (mode === 'hands') {
    if (!handLandmarker) throw new Error('Hand Landmarker has not been initialized.');
    const result = handLandmarker.detectForVideo(image, performance.now());
    return {
      width: image.width,
      height: image.height,
      sourceX,
      hands: result.landmarks.map((landmarks, index) => ({
        score: result.handedness[index]?.[0]?.score ?? 0.85,
        keypoints: landmarks.map(({ x, y, z }) => [
          x * image.width,
          y * image.height,
          z * image.width,
        ] as [number, number, number]),
      })),
      bodies: [],
    };
  }

  if (!human) throw new Error('Human.js pose tracking has not been initialized.');
  const result = await human.detect(image);
  return {
    width: image.width,
    height: image.height,
    sourceX,
    hands: result.hand.map((hand) => ({
      score: hand.score,
      keypoints: hand.keypoints,
    })),
    bodies: result.body.map((body) => ({
      keypoints: body.keypoints.map(({ part, positionRaw, score }) => ({ part, positionRaw, score })),
    })),
  };
};

const initialize = async (nextMode: HumanTrackingMode) => {
  mode = nextMode;
  human = null;
  handLandmarker = null;
  if (mode === 'hands') {
    const { FilesetResolver, HandLandmarker: HandLandmarkerModel } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm', true);
    const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
    const options = {
      baseOptions: { modelAssetPath, delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numHands: 2,
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.45,
      minTrackingConfidence: 0.45,
    };
    try {
      handLandmarker = await HandLandmarkerModel.createFromOptions(vision, options);
    } catch {
      handLandmarker = await HandLandmarkerModel.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath, delegate: 'CPU' },
      });
    }
    return;
  }

  const { Human } = await import('@vladmandic/human');
  human = new Human({
    backend: 'webgl',
    modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/',
    warmup: 'full',
    debug: false,
    face: { enabled: false },
    body: {
      enabled: true,
      maxDetected: 1,
      minConfidence: 0.45,
      skipFrames: 0,
      skipTime: 0,
    },
    hand: {
      enabled: false,
    },
    object: { enabled: false },
    segmentation: { enabled: false },
    gesture: { enabled: false },
  });
  await human.load();
  await human.warmup();
};

const handleMessage = async (request: HumanWorkerRequest) => {
  if (request.type === 'initialize') {
    try {
      await initialize(request.mode);
      workerScope.postMessage({ type: 'ready' } satisfies HumanWorkerResponse);
    } catch (error) {
      workerScope.postMessage({ type: 'error', message: errorMessage(error) } satisfies HumanWorkerResponse);
    }
    return;
  }

  if ((mode === 'hands' && !handLandmarker) || (mode === 'boxing' && !human) || busy) {
    request.image.close();
    workerScope.postMessage({ type: 'error', id: request.id, message: 'Tracking worker is busy or not ready.' } satisfies HumanWorkerResponse);
    return;
  }

  busy = true;
  try {
    let frames: HumanWorkerFrame[];
    if (mode === 'hands') {
      frames = [await serializeFrame(request.image, 0)];
    } else {
      const halfWidth = Math.floor(request.image.width / 2);
      const rightHalf = await createImageBitmap(request.image, halfWidth, 0, request.image.width - halfWidth, request.image.height);
      const leftHalf = await createImageBitmap(request.image, 0, 0, halfWidth, request.image.height);
      try {
        frames = [await serializeFrame(rightHalf, 0.5), await serializeFrame(leftHalf, 0)];
      } finally {
        rightHalf.close();
        leftHalf.close();
      }
    }
    workerScope.postMessage({ type: 'result', id: request.id, frames } satisfies HumanWorkerResponse);
  } catch (error) {
    workerScope.postMessage({ type: 'error', id: request.id, message: errorMessage(error) } satisfies HumanWorkerResponse);
  } finally {
    request.image.close();
    busy = false;
  }
};

workerScope.addEventListener('message', (event: MessageEvent<HumanWorkerRequest>) => {
  void handleMessage(event.data);
});