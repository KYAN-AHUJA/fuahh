import { PlayerId, BoxingPunchType } from '../../types';

export interface FighterHitbox {
  head: { x: number; y: number; radius: number };
  body: { x: number; y: number; width: number; height: number };
}

export interface FighterPose {
  x: number;
  y: number;
  facing: 1 | -1; // 1 = facing right, -1 = facing left
  swayX: number;
  duckY: number;
  headX: number;
  headY: number;
  torsoX: number;
  torsoY: number;
  leftGloveX: number;
  leftGloveY: number;
  rightGloveX: number;
  rightGloveY: number;
  isGuarding: boolean;
  activePunch: BoxingPunchType;
  punchProgress: number; // 0..1
  isHitStun: boolean;
  hitStunTimer: number;
  isKnockedDown: boolean;
  knockdownProgress: number; // 0..1
}

export interface FighterData {
  id: PlayerId;
  name: string;
  color: string;
  accentColor: string;
  hp: number;
  maxHp: number;
  roundsWon: number;
  pose: FighterPose;
  targetX: number;
  targetDuck: boolean;
  targetSway: number; // -1..1
  targetGuard: boolean;
  comboCount: number;
}

export interface TekkenSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'star' | 'ring';
  rotation: number;
  rotSpeed: number;
}

export const BOXING_CONFIG = {
  stageFloorY: 420,
  stageLeft: 90,
  stageRight: 810,
  maxHp: 100,
  jabDamage: 9,
  crossDamage: 16,
  uppercutDamage: 22,
  chipDamageMultiplier: 0.18, // when blocked
  jabReach: 130,
  crossReach: 155,
  uppercutReach: 125,
};

export function createInitialFighter(id: PlayerId, stageWidth: number): FighterData {
  const isP1 = id === 'p1';
  const startX = isP1 ? stageWidth * 0.32 : stageWidth * 0.68;
  const facing = isP1 ? 1 : -1;
  const color = isP1 ? '#168BFF' : '#E65361';
  const accentColor = isP1 ? '#60A5FA' : '#F87171';
  const name = isP1 ? 'NEON KING' : 'CRIMSON FANG';

  return {
    id,
    name,
    color,
    accentColor,
    hp: BOXING_CONFIG.maxHp,
    maxHp: BOXING_CONFIG.maxHp,
    roundsWon: 0,
    targetX: startX,
    targetDuck: false,
    targetSway: 0,
    targetGuard: false,
    comboCount: 0,
    pose: {
      x: startX,
      y: BOXING_CONFIG.stageFloorY,
      facing,
      swayX: 0,
      duckY: 0,
      headX: startX,
      headY: BOXING_CONFIG.stageFloorY - 140,
      torsoX: startX,
      torsoY: BOXING_CONFIG.stageFloorY - 80,
      leftGloveX: startX + facing * 35,
      leftGloveY: BOXING_CONFIG.stageFloorY - 120,
      rightGloveX: startX + facing * 18,
      rightGloveY: BOXING_CONFIG.stageFloorY - 110,
      isGuarding: false,
      activePunch: 'none',
      punchProgress: 0,
      isHitStun: false,
      hitStunTimer: 0,
      isKnockedDown: false,
      knockdownProgress: 0,
    },
  };
}
