export interface PingPongBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  spin: number; // angular spin causing trajectory curve
  speed: number;
  isSmash: boolean;
  trail: { x: number; y: number; alpha: number; color?: string }[];
}

export interface TableTennisPaddle {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  powerCharge: number; // 0..100
  isSmashing: boolean;
}

export interface TableTennisConfig {
  tableWidth: number;
  tableHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  initialSpeed: number;
  speedIncrementPerHit: number;
  maxSpeed: number;
  spinFactor: number;
}

export const TABLE_TENNIS_CONFIG: TableTennisConfig = {
  tableWidth: 900,
  tableHeight: 520,
  paddleWidth: 14,
  paddleHeight: 90,
  ballRadius: 9,
  initialSpeed: 420, // px/s
  speedIncrementPerHit: 28,
  maxSpeed: 1050,
  spinFactor: 160,
};

export function createInitialBall(width: number, height: number): PingPongBall {
  const angle = (Math.random() - 0.5) * 0.6;
  const dir = Math.random() > 0.5 ? 1 : -1;
  const speed = TABLE_TENNIS_CONFIG.initialSpeed;
  return {
    x: width / 2,
    y: height / 2,
    vx: dir * Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: TABLE_TENNIS_CONFIG.ballRadius,
    spin: 0,
    speed,
    isSmash: false,
    trail: [],
  };
}

export function createInitialTableTennisPaddles(
  width: number,
  height: number
): { p1: TableTennisPaddle; p2: TableTennisPaddle } {
  return {
    p1: {
      x: 36,
      y: height / 2,
      vy: 0,
      targetY: height / 2,
      width: TABLE_TENNIS_CONFIG.paddleWidth,
      height: TABLE_TENNIS_CONFIG.paddleHeight,
      color: '#168BFF',
      glowColor: 'rgba(22, 139, 255, 0.45)',
      powerCharge: 0,
      isSmashing: false,
    },
    p2: {
      x: width - 36,
      y: height / 2,
      vy: 0,
      targetY: height / 2,
      width: TABLE_TENNIS_CONFIG.paddleWidth,
      height: TABLE_TENNIS_CONFIG.paddleHeight,
      color: '#E65361',
      glowColor: 'rgba(230, 83, 97, 0.45)',
      powerCharge: 0,
      isSmashing: false,
    },
  };
}
