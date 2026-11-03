import { Vector2 } from '../../types';

export interface Puck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
  isGoalAnim: boolean;
}

export interface Paddle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  glowColor: string;
}

export interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const AIR_HOCKEY_CONFIG = {
  tableWidth: 900,
  tableHeight: 560,
  puckRadius: 18,
  paddleRadius: 36,
  puckFriction: 0.993, // slight air table glide
  maxPuckSpeed: 1100, // px/s
  minPuckSpeed: 10,
  goalWidth: 160, // vertical height of goal opening
  goalDepth: 30,
  restitution: 0.88, // bounciness against walls
  paddleImpulseFactor: 1.35, // velocity transferred from paddle swing
};

export function createInitialPuck(width: number, height: number): Puck {
  return {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    radius: AIR_HOCKEY_CONFIG.puckRadius,
    trail: [],
    isGoalAnim: false,
  };
}

export function createInitialPaddles(width: number, height: number): { p1: Paddle; p2: Paddle } {
  return {
    p1: {
      x: width * 0.18,
      y: height / 2,
      vx: 0,
      vy: 0,
      targetX: width * 0.18,
      targetY: height / 2,
      radius: AIR_HOCKEY_CONFIG.paddleRadius,
      color: '#168BFF',
      glowColor: 'rgba(22, 139, 255, 0.45)',
    },
    p2: {
      x: width * 0.82,
      y: height / 2,
      vx: 0,
      vy: 0,
      targetX: width * 0.82,
      targetY: height / 2,
      radius: AIR_HOCKEY_CONFIG.paddleRadius,
      color: '#E65361',
      glowColor: 'rgba(230, 83, 97, 0.45)',
    },
  };
}

// Distance helper
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Collision resolution between circular paddle and puck
export function resolvePaddlePuckCollision(
  paddle: Paddle,
  puck: Puck,
  onHit?: (impactSpeed: number) => void
): boolean {
  const dx = puck.x - paddle.x;
  const dy = puck.y - paddle.y;
  const dist = Math.hypot(dx, dy);
  const minDist = paddle.radius + puck.radius;

  if (dist < minDist && dist > 0.0001) {
    // Normal vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate overlapping shapes
    const overlap = minDist - dist;
    puck.x += nx * overlap;
    puck.y += ny * overlap;

    // Relative velocity
    const rvx = puck.vx - paddle.vx;
    const rvy = puck.vy - paddle.vy;

    // Normal velocity component
    const normalVel = rvx * nx + rvy * ny;

    // Only bounce if objects are moving towards each other
    if (normalVel < 0) {
      const impulse = -(1 + AIR_HOCKEY_CONFIG.restitution) * normalVel;
      
      // Update puck velocity with both bounce and paddle swing momentum
      puck.vx += nx * impulse + paddle.vx * AIR_HOCKEY_CONFIG.paddleImpulseFactor * 0.4;
      puck.vy += ny * impulse + paddle.vy * AIR_HOCKEY_CONFIG.paddleImpulseFactor * 0.4;

      // Cap speed
      const currentSpeed = Math.hypot(puck.vx, puck.vy);
      if (currentSpeed > AIR_HOCKEY_CONFIG.maxPuckSpeed) {
        const factor = AIR_HOCKEY_CONFIG.maxPuckSpeed / currentSpeed;
        puck.vx *= factor;
        puck.vy *= factor;
      }

      onHit?.(Math.min(3, Math.max(1, currentSpeed / 300)));
      return true;
    }
  }

  return false;
}
