import {
  PingPongBall,
  TableTennisPaddle,
  TABLE_TENNIS_CONFIG,
  createInitialBall,
  createInitialTableTennisPaddles,
} from './physics';
import { audioManager } from '../../audio/AudioManager';
import { PlayerId } from '../../types';

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
  scale: number;
}

export class TableTennisEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public width: number;
  public height: number;

  public ball: PingPongBall;
  public p1Paddle: TableTennisPaddle;
  public p2Paddle: TableTennisPaddle;

  public rallyCount: number = 0;
  public maxRallyInMatch: number = 0;

  private floatingTexts: FloatingText[] = [];
  private lastTime: number = 0;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private resetDelay: number = 0;

  public onScore?: (scorer: PlayerId) => void;
  public onHit?: (player: PlayerId, rally: number) => void;
  public onSmash?: (player: PlayerId) => void;

  public videoElement: HTMLVideoElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;

    this.width = canvas.width;
    this.height = canvas.height;

    this.ball = createInitialBall(this.width, this.height);
    const paddles = createInitialTableTennisPaddles(this.width, this.height);
    this.p1Paddle = paddles.p1;
    this.p2Paddle = paddles.p2;
  }

  public setSize(w: number, h: number) {
    this.width = Math.round(w);
    this.height = Math.round(h);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.p1Paddle.x = 36;
    this.p2Paddle.x = this.width - 36;
  }

  public resetBall(servingPlayer: PlayerId = 'p1') {
    this.ball = createInitialBall(this.width, this.height);
    const dir = servingPlayer === 'p1' ? 1 : -1;
    const angle = (Math.random() - 0.5) * 0.45;
    this.ball.vx = dir * Math.cos(angle) * TABLE_TENNIS_CONFIG.initialSpeed;
    this.ball.vy = Math.sin(angle) * TABLE_TENNIS_CONFIG.initialSpeed;
    this.rallyCount = 0;
    this.resetDelay = 0;
  }

  public triggerSmash(player: PlayerId) {
    const paddle = player === 'p1' ? this.p1Paddle : this.p2Paddle;
    paddle.isSmashing = true;
    setTimeout(() => {
      paddle.isSmashing = false;
    }, 300);

    const isP1 = player === 'p1';
    const distToPaddle = Math.abs(this.ball.x - paddle.x);
    if (distToPaddle < 110 && Math.abs(this.ball.y - paddle.y) < paddle.height) {
      if ((isP1 && this.ball.vx < 0) || (!isP1 && this.ball.vx > 0)) {
        this.ball.isSmash = true;
        this.ball.speed = Math.min(TABLE_TENNIS_CONFIG.maxSpeed, this.ball.speed * 1.35);
        const sign = isP1 ? 1 : -1;
        this.ball.vx = sign * this.ball.speed;
        this.ball.vy *= 1.15;
        audioManager.playSmashEffect();
        this.addFloatingText('SMASH', this.ball.x, this.ball.y - 25, '#D9CCB2', 1.3);
        this.onSmash?.(player);
      }
    }
  }

  public updateTargets(p1Y: number, p2Y: number) {
    const pad = 14;
    const minY = pad + this.p1Paddle.height / 2;
    const maxY = this.height - pad - this.p1Paddle.height / 2;

    this.p1Paddle.targetY = Math.max(minY, Math.min(maxY, p1Y * this.height));
    this.p2Paddle.targetY = Math.max(minY, Math.min(maxY, p2Y * this.height));
  }

  public updateAI(difficulty: 'easy' | 'medium' | 'pro', dt: number) {
    const ball = this.ball;
    const paddle = this.p2Paddle;

    const reactionFactor = difficulty === 'easy' ? 0.08 : difficulty === 'medium' ? 0.16 : 0.28;
    const dy = ball.y - paddle.y;
    paddle.targetY += dy * reactionFactor;

    if (difficulty === 'pro' && ball.x > this.width * 0.75 && ball.vx > 0 && Math.random() < 0.02) {
      this.triggerSmash('p2');
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;
    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(0.033, Math.max(0.001, rawDt));

    // Sub-stepping for smooth 60 FPS physics
    const subSteps = 2;
    const subDt = dt / subSteps;
    for (let step = 0; step < subSteps; step++) {
      this.updatePhysics(subDt);
    }

    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private updatePhysics(dt: number) {
    if (this.resetDelay > 0) {
      this.resetDelay -= dt;
      if (this.resetDelay <= 0) {
        this.resetBall();
      }
      return;
    }

    // 1. Update Paddles
    [this.p1Paddle, this.p2Paddle].forEach(paddle => {
      const prevY = paddle.y;
      paddle.y += (paddle.targetY - paddle.y) * 0.35;
      paddle.vy = (paddle.y - prevY) / dt;
    });

    // 2. Update Ball Physics
    const ball = this.ball;
    const pad = 14;

    ball.y += ball.spin * dt * 0.25;
    ball.spin *= 0.98;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Trail
    ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.5 });
    if (ball.trail.length > 8) ball.trail.shift();
    ball.trail.forEach(t => (t.alpha -= 0.06));

    // Top & Bottom Table Boundaries
    if (ball.y - ball.radius <= pad) {
      ball.y = pad + ball.radius;
      ball.vy = Math.abs(ball.vy);
      audioManager.playWallBounce();
    } else if (ball.y + ball.radius >= this.height - pad) {
      ball.y = this.height - pad - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      audioManager.playWallBounce();
    }

    // P1 Paddle Collision (Left side)
    const p1 = this.p1Paddle;
    if (
      ball.vx < 0 &&
      ball.x - ball.radius <= p1.x + p1.width / 2 &&
      ball.x + ball.radius >= p1.x - p1.width / 2 &&
      ball.y >= p1.y - p1.height / 2 - 6 &&
      ball.y <= p1.y + p1.height / 2 + 6
    ) {
      this.handlePaddleHit(p1, 'p1');
    }

    // P2 Paddle Collision (Right side)
    const p2 = this.p2Paddle;
    if (
      ball.vx > 0 &&
      ball.x + ball.radius >= p2.x - p2.width / 2 &&
      ball.x - ball.radius <= p2.x + p2.width / 2 &&
      ball.y >= p2.y - p2.height / 2 - 6 &&
      ball.y <= p2.y + p2.height / 2 + 6
    ) {
      this.handlePaddleHit(p2, 'p2');
    }

    // Scoring
    if (ball.x < -10) {
      this.handleScore('p2');
    } else if (ball.x > this.width + 10) {
      this.handleScore('p1');
    }

    // Floating text update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 25 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 0.7);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private handlePaddleHit(paddle: TableTennisPaddle, player: PlayerId) {
    const ball = this.ball;
    const isP1 = player === 'p1';

    this.rallyCount++;
    if (this.rallyCount > this.maxRallyInMatch) {
      this.maxRallyInMatch = this.rallyCount;
    }

    const hitOffset = (ball.y - paddle.y) / (paddle.height / 2);
    const bounceAngle = hitOffset * (Math.PI / 3.4);

    ball.speed = Math.min(
      TABLE_TENNIS_CONFIG.maxSpeed,
      TABLE_TENNIS_CONFIG.initialSpeed + this.rallyCount * TABLE_TENNIS_CONFIG.speedIncrementPerHit
    );

    const dir = isP1 ? 1 : -1;
    ball.vx = dir * Math.cos(bounceAngle) * ball.speed;
    ball.vy = Math.sin(bounceAngle) * ball.speed;

    ball.spin = paddle.vy * 0.35;
    ball.isSmash = false;

    ball.x = isP1
      ? paddle.x + paddle.width / 2 + ball.radius + 1
      : paddle.x - paddle.width / 2 - ball.radius - 1;

    audioManager.playPaddleHit(ball.speed / 400);
    this.onHit?.(player, this.rallyCount);

    if (this.rallyCount === 5) {
      this.addFloatingText('5x RALLY', this.width / 2, this.height / 2 - 30, '#168BFF', 1.2);
    } else if (this.rallyCount === 10) {
      this.addFloatingText('10x RALLY', this.width / 2, this.height / 2 - 30, '#D9CCB2', 1.3);
    }
  }

  private handleScore(scorer: PlayerId) {
    audioManager.playScore();
    this.onScore?.(scorer);

    const text = scorer === 'p1' ? 'P1 POINT' : 'P2 POINT';
    const color = scorer === 'p1' ? '#168BFF' : '#E65361';
    this.addFloatingText(text, this.width / 2, this.height / 2, color, 1.4);

    this.resetDelay = 0.9;
  }

  private addFloatingText(text: string, x: number, y: number, color: string, scale: number = 1) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1,
      life: 0.7,
      scale,
    });
  }

  public render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const tablePad = 14;

    // Viewport background: #0B0E0D
    ctx.fillStyle = '#0B0E0D';
    ctx.fillRect(0, 0, w, h);

    // 1. Flat 2D Top-Down Table Tennis Table
    const tx = tablePad;
    const ty = tablePad;
    const tw = w - tablePad * 2;
    const th = h - tablePad * 2;

    // Table surface: #121715
    ctx.fillStyle = '#121715';
    ctx.fillRect(tx, ty, tw, th);

    // Subtle table border: #303833
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tw, th);

    // Center divider (Net): thin crisp dashed line
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w / 2, ty + 2);
    ctx.lineTo(w / 2, ty + th - 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Net Posts
    ctx.fillStyle = '#D9CCB2';
    ctx.fillRect(w / 2 - 3, ty - 4, 6, 8);
    ctx.fillRect(w / 2 - 3, ty + th - 4, 6, 8);

    // 2. Ball Trail (subtle off-white)
    this.ball.trail.forEach(t => {
      ctx.fillStyle = `rgba(234, 231, 222, ${t.alpha * 0.25})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.ball.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Small off-white ball: #EAE7DE
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#EAE7DE';
    ctx.fill();
    ctx.strokeStyle = '#A6AAA2';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Flat 2D Paddles
    // P1 Paddle: Blue #168BFF
    const p1 = this.p1Paddle;
    ctx.fillStyle = '#168BFF';
    ctx.fillRect(
      p1.x - p1.width / 2,
      p1.y - p1.height / 2,
      p1.width,
      p1.height
    );
    // Subtle inner accent line
    ctx.fillStyle = '#EAE7DE';
    ctx.fillRect(p1.x - 1, p1.y - p1.height / 4, 2, p1.height / 2);

    // P2 Paddle: Red #E65361
    const p2 = this.p2Paddle;
    ctx.fillStyle = '#E65361';
    ctx.fillRect(
      p2.x - p2.width / 2,
      p2.y - p2.height / 2,
      p2.width,
      p2.height
    );
    ctx.fillStyle = '#EAE7DE';
    ctx.fillRect(p2.x - 1, p2.y - p2.height / 4, 2, p2.height / 2);

    // 5. Floating text
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `600 ${Math.round(16 * ft.scale)}px Inter, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }
}
