import {
  PingPongBall,
  TableTennisPaddle,
  TABLE_TENNIS_CONFIG,
  createInitialBall,
  createInitialTableTennisPaddles,
} from './physics';
import { audioManager } from '../../audio/AudioManager';
import { PlayerId, GameSettings } from '../../types';

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
  public showWebcamBackground: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
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
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.p1Paddle.x = 36;
    this.p2Paddle.x = w - 36;
  }

  public resetBall(servingPlayer: PlayerId = 'p1') {
    this.ball = createInitialBall(this.width, this.height);
    const dir = servingPlayer === 'p1' ? 1 : -1;
    const angle = (Math.random() - 0.5) * 0.5;
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
    }, 400);

    // If ball is nearby, smash it!
    const isP1 = player === 'p1';
    const distToPaddle = Math.abs(this.ball.x - paddle.x);
    if (distToPaddle < 120 && Math.abs(this.ball.y - paddle.y) < paddle.height) {
      if ((isP1 && this.ball.vx < 0) || (!isP1 && this.ball.vx > 0)) {
        this.ball.isSmash = true;
        this.ball.speed = Math.min(TABLE_TENNIS_CONFIG.maxSpeed, this.ball.speed * 1.4);
        const sign = isP1 ? 1 : -1;
        this.ball.vx = sign * this.ball.speed;
        this.ball.vy *= 1.2;
        audioManager.playSmashEffect();
        this.addFloatingText('SMASH!', this.ball.x, this.ball.y - 30, '#f59e0b', 1.8);
        this.onSmash?.(player);
      }
    }
  }

  public updateTargets(p1Y: number, p2Y: number) {
    const minY = this.p1Paddle.height / 2 + 10;
    const maxY = this.height - this.p1Paddle.height / 2 - 10;

    this.p1Paddle.targetY = Math.max(minY, Math.min(maxY, p1Y * this.height));
    this.p2Paddle.targetY = Math.max(minY, Math.min(maxY, p2Y * this.height));
  }

  public updateAI(difficulty: 'easy' | 'medium' | 'pro', dt: number) {
    const ball = this.ball;
    const paddle = this.p2Paddle;

    const reactionFactor = difficulty === 'easy' ? 0.08 : difficulty === 'medium' ? 0.16 : 0.28;
    const targetY = ball.y;

    // AI tracking
    const dy = targetY - paddle.y;
    paddle.targetY += dy * reactionFactor;

    // Pro AI auto smash occasionally
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
    const dt = Math.min(0.05, Math.max(0.001, (time - this.lastTime) / 1000));
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
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

    // Curve drift from spin
    ball.y += ball.spin * dt * 0.3;
    ball.spin *= 0.98;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Trail
    const trailColor = ball.isSmash
      ? 'rgba(245, 158, 11, '
      : ball.speed > 700
      ? 'rgba(6, 182, 212, '
      : 'rgba(255, 255, 255, ';

    ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.7, color: trailColor });
    if (ball.trail.length > (ball.isSmash ? 16 : 8)) ball.trail.shift();
    ball.trail.forEach(t => (t.alpha -= 0.05));

    // Top/Bottom wall bounce
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      audioManager.playWallBounce();
    } else if (ball.y + ball.radius >= this.height) {
      ball.y = this.height - ball.radius;
      ball.vy = -Math.abs(ball.vy);
      audioManager.playWallBounce();
    }

    // P1 Paddle Collision (Left)
    const p1 = this.p1Paddle;
    if (
      ball.vx < 0 &&
      ball.x - ball.radius <= p1.x + p1.width / 2 &&
      ball.x + ball.radius >= p1.x - p1.width / 2 &&
      ball.y >= p1.y - p1.height / 2 - 8 &&
      ball.y <= p1.y + p1.height / 2 + 8
    ) {
      this.handlePaddleHit(p1, 'p1');
    }

    // P2 Paddle Collision (Right)
    const p2 = this.p2Paddle;
    if (
      ball.vx > 0 &&
      ball.x + ball.radius >= p2.x - p2.width / 2 &&
      ball.x - ball.radius <= p2.x + p2.width / 2 &&
      ball.y >= p2.y - p2.height / 2 - 8 &&
      ball.y <= p2.y + p2.height / 2 + 8
    ) {
      this.handlePaddleHit(p2, 'p2');
    }

    // Point scoring
    if (ball.x < -20) {
      // P2 scored!
      this.handleScore('p2');
    } else if (ball.x > this.width + 20) {
      // P1 scored!
      this.handleScore('p1');
    }

    // 3. Update Floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 30 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 0.8);
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

    // Calculate relative hit position on paddle (-1 to 1)
    const hitOffset = (ball.y - paddle.y) / (paddle.height / 2);
    const bounceAngle = hitOffset * (Math.PI / 3.2); // max ~56 degrees

    // Speed up with rally
    ball.speed = Math.min(
      TABLE_TENNIS_CONFIG.maxSpeed,
      TABLE_TENNIS_CONFIG.initialSpeed + this.rallyCount * TABLE_TENNIS_CONFIG.speedIncrementPerHit
    );

    const dir = isP1 ? 1 : -1;
    ball.vx = dir * Math.cos(bounceAngle) * ball.speed;
    ball.vy = Math.sin(bounceAngle) * ball.speed;

    // Apply spin from paddle vertical movement
    ball.spin = paddle.vy * 0.4;
    ball.isSmash = false;

    // Ensure ball moves out of paddle collision box
    ball.x = isP1 ? paddle.x + paddle.width / 2 + ball.radius + 1 : paddle.x - paddle.width / 2 - ball.radius - 1;

    audioManager.playPaddleHit(ball.speed / 400);
    this.onHit?.(player, this.rallyCount);

    // Rally milestones
    if (this.rallyCount === 5) {
      this.addFloatingText('5x RALLY!', this.width / 2, this.height / 2 - 40, '#06b6d4', 1.4);
    } else if (this.rallyCount === 10) {
      this.addFloatingText('10x ULTRA RALLY!', this.width / 2, this.height / 2 - 40, '#f59e0b', 1.8);
    } else if (this.rallyCount === 15) {
      this.addFloatingText('UNSTOPPABLE!', this.width / 2, this.height / 2 - 40, '#ec4899', 2.0);
    }
  }

  private handleScore(scorer: PlayerId) {
    audioManager.playScore();
    this.onScore?.(scorer);

    const text = scorer === 'p1' ? 'P1 POINT' : 'P2 POINT';
    const color = scorer === 'p1' ? '#168BFF' : '#E65361';
    this.addFloatingText(text, this.width / 2, this.height / 2, color, 1.6);

    this.resetDelay = 1.0;
  }

  private addFloatingText(text: string, x: number, y: number, color: string, scale: number = 1) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1,
      life: 0.8,
      scale,
    });
  }

  public render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Table Canvas
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, w, h);

    // Live webcam feed overlay
    if (this.videoElement && this.videoElement.readyState >= 2 && this.showWebcamBackground) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.globalAlpha = 0.35;
      ctx.drawImage(this.videoElement, -w, 0, w, h);
      ctx.restore();
      ctx.globalAlpha = 1.0;
    }

    // Subtle table boundary
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    // Center Net Line
    ctx.strokeStyle = '#38485e';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 6);
    ctx.lineTo(w / 2, h - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // Net Posts
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(w / 2 - 4, 2, 8, 8);
    ctx.fillRect(w / 2 - 4, h - 10, 8, 8);

    // 2. Ball Trail
    this.ball.trail.forEach(t => {
      ctx.fillStyle = `${t.color || 'rgba(255,255,255,'}${t.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.ball.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Ball
    const bColor = this.ball.isSmash ? '#f59e0b' : '#f3f4f6';
    ctx.fillStyle = bColor;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Paddles
    [this.p1Paddle, this.p2Paddle].forEach(paddle => {
      // Glow
      ctx.fillStyle = paddle.glowColor;
      ctx.fillRect(
        paddle.x - paddle.width / 2 - 4,
        paddle.y - paddle.height / 2 - 4,
        paddle.width + 8,
        paddle.height + 8
      );

      // Paddle Body
      ctx.fillStyle = paddle.color;
      ctx.fillRect(
        paddle.x - paddle.width / 2,
        paddle.y - paddle.height / 2,
        paddle.width,
        paddle.height
      );

      // Inner stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        paddle.x - 2,
        paddle.y - paddle.height / 4,
        4,
        paddle.height / 2
      );

      // Smash highlight
      if (paddle.isSmashing) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          paddle.x - paddle.width / 2 - 6,
          paddle.y - paddle.height / 2 - 6,
          paddle.width + 12,
          paddle.height + 12
        );
      }
    });

    // 5. Floating texts
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `bold ${Math.round(20 * ft.scale)}px Inter, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }
}
