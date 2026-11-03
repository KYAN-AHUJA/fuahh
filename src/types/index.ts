export type GameType = 'air-hockey' | 'table-tennis';

export type ControlMode = 'camera' | 'keyboard-mouse' | 'vs-ai';

export type PlayerId = 'p1' | 'p2';

export type NavigationScreen = 
  | 'landing'
  | 'game-selection'
  | 'input-setup'
  | 'camera-setup'
  | 'calibration'
  | 'gameplay';

export type MatchState = 
  | 'countdown'
  | 'playing'
  | 'goal-scored'
  | 'paused'
  | 'match-complete';

export interface HandData {
  isDetected: boolean;
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  vx: number;
  vy: number;
  confidence: number;
  rawLandmarks: { x: number; y: number; z: number }[];
  isFist: boolean;
  isPinching: boolean;
  lastSeen: number;
  detectedColor?: { r: number; g: number; b: number; hex: string };
  colorScore?: number; // 0..1 match to target
}

export interface PlayerScore {
  p1: number;
  p2: number;
}

export interface ColorTarget {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface GameSettings {
  targetScore: number;
  matchDuration: number; // in seconds, e.g. 120 or 180 (0 for no time limit)
  aiDifficulty: 'easy' | 'medium' | 'pro';
  soundEnabled: boolean;
  sfxVolume: number; // 0..1
  showHandPreview: boolean;
  smoothingFactor: number; // 0.1 .. 0.5
  p1ColorTarget: ColorTarget; // Black marker target
  p2ColorTarget: ColorTarget; // Red target
  colorTolerance: number; // 0..200
  colorTrackingMode: 'color-priority' | 'spatial-priority';
}

export interface MatchStats {
  winner: PlayerId | null;
  duration: number; // seconds elapsed
  p1Score: number;
  p2Score: number;
  totalHits: number;
  p1Hits: number;
  p2Hits: number;
  maxRally: number;
  goalsScored: number;
  gameType: GameType;
}

export interface Vector2 {
  x: number;
  y: number;
}
