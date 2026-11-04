export type HumanTrackingMode = 'hands' | 'boxing';

export interface HumanWorkerHand {
  score: number;
  keypoints: [number, number, number?][];
}

export interface HumanWorkerBody {
  keypoints: {
    part: string;
    positionRaw: [number, number, number?];
    score: number;
  }[];
}

export interface HumanWorkerFrame {
  width: number;
  height: number;
  sourceX: number;
  hands: HumanWorkerHand[];
  bodies: HumanWorkerBody[];
}

export type HumanWorkerRequest =
  | { type: 'initialize'; mode: HumanTrackingMode }
  | { type: 'detect'; id: number; image: ImageBitmap };

export type HumanWorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; frames: HumanWorkerFrame[] }
  | { type: 'error'; id?: number; message: string };