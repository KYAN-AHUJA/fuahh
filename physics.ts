// src/games/table-tennis/physics.ts
// Physics utilities for Table Tennis game.

export interface Vector2 {
  x: number;
  y: number;
}

export const vec2 = (x: number, y: number): Vector2 => ({ x, y });

export const add = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vector2, b: Vector2): Vector2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (v: Vector2, scalar: number): Vector2 => ({ x: v.x * scalar, y: v.y * scalar });
export const dot = (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y;
export const length = (v: Vector2): number => Math.hypot(v.x, v.y);
export const normalize = (v: Vector2): Vector2 => {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

// Ball constants
export const BALL_RADIUS = 8; // px
export const INITIAL_SPEED = 300; // pixels per second
export const SPEED_INCREMENT_PER_HIT = 20; // increase per paddle hit
export const MAX_SPEED = 800;
export const FRICTION = 0.99; // per second damping
export const SPIN_FACTOR = 200; // how much spin changes ball trajectory

// Paddle constants
export const PADDLE_WIDTH = 12;
export const PADDLE_HEIGHT = 80;
export const PADDLE_SPEED = 500; // max hand‑derived paddle speed (px/s)

export interface BallState {
  position: Vector2;
  velocity: Vector2;
  spin: number; // angular velocity, positive = clockwise
}

export interface PaddleState {
  x: number; // constant (left or right edge)
  y: number; // centre y position
  lastY: number; // previous frame centre for velocity calc
}

/**
 * Create a new ball at the centre with an initial random direction.
 */
export const createBall = (canvasWidth: number, canvasHeight: number): BallState => {
  const angle = (Math.random() * Math.PI) / 2 - Math.PI / 4; // -45° .. +45°
  const dir = vec2(Math.cos(angle), Math.sin(angle));
  const velocity = mul(dir, INITIAL_SPEED);
  return {
    position: vec2(canvasWidth / 2, canvasHeight / 2),
    velocity,
    spin: 0,
  };
};

/**
 * Apply friction and spin‑induced drift to the ball.
 */
export const updateBall = (ball: BallState, dt: number): BallState => {
  // Apply friction (exponential decay)
  const speed = length(ball.velocity);
  const newSpeed = speed * Math.pow(FRICTION, dt);
  const velNorm = normalize(ball.velocity);
  const newVelocity = mul(velNorm, newSpeed);

  // Apply spin drift perpendicular to velocity
  const perpendicular = { x: -velNorm.y, y: velNorm.x };
  const spinDrift = mul(perpendicular, ball.spin * dt * 0.5);

  const newPos = add(ball.position, mul(newVelocity, dt));
  return {
    position: add(newPos, spinDrift),
    velocity: newVelocity,
    spin: ball.spin, // spin decays slowly
  };
};
