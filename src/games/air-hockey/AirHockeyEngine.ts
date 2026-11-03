import {
  Puck,
  Paddle,
  SparkParticle,
  AIR_HOCKEY_CONFIG,
  createInitialPuck,
  createInitialPaddles,
  resolvePaddlePuckCollision,
} from './physics';
import { audioManager } from '../../audio/AudioManager';
import { PlayerId } from '../../types';

export class AirHockeyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public width: number;
  public height: number;

  public puck: Puck;
  public p1Paddle: Paddle;
  public p2Paddle: Paddle;
  public sparks: SparkParticle[] = [];

  private lastTime: number = 0;
  private animationId: number | null = null;
  private isRunning: boolean = false;

  public onScore?: (scoringPlayer: PlayerId) => void;
  public onHit?: (player: PlayerId) => void;

  private goalTop: number;
  private goalBottom: number;
  private resetTimer: number = 0;

  public videoElement: HTMLVideoElement | null = null;
  public showWebcamBackground: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;

    this.width = canvas.width;
    this.height = canvas.height;

    this.puck = createInitialPuck(this.width, this.height);
    const paddles = createInitialPaddles(this.width, this.height);
    this.p1Paddle = paddles.p1;
    this.p2Paddle = paddles.p2;

    this.goalTop = (this.height - AIR_HOCKEY_CONFIG.goalWidth) / 2;
    this.goalBottom = (this.height + AIR_HOCKEY_CONFIG.goalWidth) / 2;
  }

  public setSize(w: number, h: number) {
    this.width = Math.round(w);
    this.height = Math.round(h);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.goalTop = (this.height - AIR_HOCKEY_CONFIG.goalWidth) / 2;
    this.goalBottom = (this.height + AIR_HOCKEY_CONFIG.goalWidth) / 2;
  }

  public resetPuck(servingPlayer: PlayerId = 'p1') {
    this.puck.x = this.width / 2;
    this.puck.y = this.height / 2;
    const dir = servingPlayer === 'p1' ? 1 : -1;
    const speed = 280;
    const angle = (Math.random() - 0.5) * 0.6;
    this.puck.vx = dir * Math.cos(angle) * speed;
    this.puck.vy = Math.sin(angle) * speed;
    this.puck.trail = [];
    this.puck.isGoalAnim = false;
    this.resetTimer = 0;
  }

  public updateTargets(
    p1Target: { x: number; y: number },
    p2Target: { x: number; y: number }
  ) {
    const tablePad = 14;
    // Constrain P1 to left half
    const p1MinX = tablePad + this.p1Paddle.radius;
    const p1MaxX = this.width / 2 - this.p1Paddle.radius - 8;
    const p1MinY = tablePad + this.p1Paddle.radius;
    const p1MaxY = this.height - tablePad - this.p1Paddle.radius;

    this.p1Paddle.targetX = Math.max(p1MinX, Math.min(p1MaxX, p1Target.x * this.width));
    this.p1Paddle.targetY = Math.max(p1MinY, Math.min(p1MaxY, p1Target.y * this.height));

    // Constrain P2 to right half
    const p2MinX = this.width / 2 + this.p2Paddle.radius + 8;
    const p2MaxX = this.width - tablePad - this.p2Paddle.radius;
    const p2MinY = tablePad + this.p2Paddle.radius;
    const p2MaxY = this.height - tablePad - this.p2Paddle.radius;

    this.p2Paddle.targetX = Math.max(p2MinX, Math.min(p2MaxX, p2Target.x * this.width));
    this.p2Paddle.targetY = Math.max(p2MinY, Math.min(p2MaxY, p2Target.y * this.height));
  }

  // AI logic for Player 2
  public updateAI(difficulty: 'easy' | 'medium' | 'pro', dt: number) {
    const puck = this.puck;
    const paddle = this.p2Paddle;

    const homeX = this.width * 0.82;
    const homeY = this.height / 2;

    let targetX = homeX;
    let targetY = homeY;

    const speedMultiplier = difficulty === 'easy' ? 0.48 : difficulty === 'medium' ? 0.75 : 0.96;

    if (puck.x > this.width * 0.45 && puck.vx > -100) {
      const timeToArrive = Math.max(0.01, (paddle.x - puck.x) / (puck.vx || 1));
      let predictedY = puck.y + puck.vy * Math.min(0.9, timeToArrive);

      if (predictedY < puck.radius + 14) predictedY = puck.radius + 14 + Math.abs(predictedY);
      if (predictedY > this.height - puck.radius - 14) {
        predictedY = this.height - puck.radius - 14 - (predictedY - (this.height - puck.radius - 14));
      }

      if (puck.x > this.width * 0.58 && Math.hypot(puck.vx, puck.vy) < 450) {
        targetX = Math.min(this.width * 0.88, puck.x + 20);
        targetY = predictedY;
      } else {
        targetX = homeX;
        targetY = (predictedY + homeY) / 2;
      }
    } else {
      targetX = homeX;
      targetY = homeY + Math.sin(performance.now() * 0.002) * 35;
    }

    const lerpSpeed = 12 * speedMultiplier * dt;
    paddle.targetX += (targetX - paddle.targetX) * Math.min(1, lerpSpeed);
    paddle.targetY += (targetY - paddle.targetY) * Math.min(1, lerpSpeed);
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

    // Sub-stepping for rock-solid 60 FPS physics without tunneling
    const subSteps = 2;
    const subDt = dt / subSteps;
    for (let step = 0; step < subSteps; step++) {
      this.updatePhysics(subDt);
    }

    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private updatePhysics(dt: number) {
    if (this.resetTimer > 0) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.resetPuck();
      }
    }

    // 1. Paddle interpolation
    [this.p1Paddle, this.p2Paddle].forEach(paddle => {
      const prevX = paddle.x;
      const prevY = paddle.y;

      const smooth = 0.28;
      paddle.x += (paddle.targetX - paddle.x) * (1 - smooth);
      paddle.y += (paddle.targetY - paddle.y) * (1 - smooth);

      paddle.vx = (paddle.x - prevX) / dt;
      paddle.vy = (paddle.y - prevY) / dt;
    });

    // 2. Puck Physics
    if (!this.puck.isGoalAnim) {
      this.puck.x += this.puck.vx * dt;
      this.puck.y += this.puck.vy * dt;

      this.puck.vx *= Math.pow(AIR_HOCKEY_CONFIG.puckFriction, dt * 60);
      this.puck.vy *= Math.pow(AIR_HOCKEY_CONFIG.puckFriction, dt * 60);

      // Trail
      this.puck.trail.push({ x: this.puck.x, y: this.puck.y, alpha: 0.4 });
      if (this.puck.trail.length > 8) this.puck.trail.shift();
      this.puck.trail.forEach(t => (t.alpha -= 0.05));

      const tablePad = 14;
      const topWall = tablePad + this.puck.radius;
      const bottomWall = this.height - tablePad - this.puck.radius;

      // Top and Bottom walls
      if (this.puck.y <= topWall) {
        this.puck.y = topWall;
        this.puck.vy = Math.abs(this.puck.vy) * AIR_HOCKEY_CONFIG.restitution;
        this.createSparks(this.puck.x, this.puck.y, '#EAE7DE', 6);
        audioManager.playWallBounce();
      } else if (this.puck.y >= bottomWall) {
        this.puck.y = bottomWall;
        this.puck.vy = -Math.abs(this.puck.vy) * AIR_HOCKEY_CONFIG.restitution;
        this.createSparks(this.puck.x, this.puck.y, '#EAE7DE', 6);
        audioManager.playWallBounce();
      }

      const inGoalSlot = this.puck.y >= this.goalTop && this.puck.y <= this.goalBottom;

      // Left Wall / Left Goal
      if (this.puck.x - this.puck.radius <= tablePad) {
        if (inGoalSlot) {
          if (this.puck.x <= -10) {
            this.handleGoal('p2');
          }
        } else {
          this.puck.x = tablePad + this.puck.radius;
          this.puck.vx = Math.abs(this.puck.vx) * AIR_HOCKEY_CONFIG.restitution;
          this.createSparks(this.puck.x, this.puck.y, '#168BFF', 8);
          audioManager.playWallBounce();
        }
      }

      // Right Wall / Right Goal
      if (this.puck.x + this.puck.radius >= this.width - tablePad) {
        if (inGoalSlot) {
          if (this.puck.x >= this.width + 10) {
            this.handleGoal('p1');
          }
        } else {
          this.puck.x = this.width - tablePad - this.puck.radius;
          this.puck.vx = -Math.abs(this.puck.vx) * AIR_HOCKEY_CONFIG.restitution;
          this.createSparks(this.puck.x, this.puck.y, '#E65361', 8);
          audioManager.playWallBounce();
        }
      }

      // Paddle Collisions
      resolvePaddlePuckCollision(this.p1Paddle, this.puck, (ratio) => {
        audioManager.playPaddleHit(ratio);
        this.createSparks(this.puck.x, this.puck.y, '#168BFF', 8);
        this.onHit?.('p1');
      });

      resolvePaddlePuckCollision(this.p2Paddle, this.puck, (ratio) => {
        audioManager.playPaddleHit(ratio);
        this.createSparks(this.puck.x, this.puck.y, '#E65361', 8);
        this.onHit?.('p2');
      });
    }

    // 3. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  private handleGoal(scorer: PlayerId) {
    if (this.puck.isGoalAnim) return;
    this.puck.isGoalAnim = true;
    this.createGoalExplosion(scorer);
    audioManager.playGoal();
    this.onScore?.(scorer);
    this.resetTimer = 1.1;
  }

  private createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 220;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        color,
        size: 1.5 + Math.random() * 1.5,
      });
    }
  }

  private createGoalExplosion(scorer: PlayerId) {
    const color = scorer === 'p1' ? '#168BFF' : '#E65361';
    const x = scorer === 'p1' ? this.width - 20 : 20;
    const y = this.height / 2;

    for (let i = 0; i < 30; i++) {
      const angle = (scorer === 'p1' ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
      const speed = 180 + Math.random() * 380;
      this.sparks.push({
        x,
        y: y + (Math.random() - 0.5) * AIR_HOCKEY_CONFIG.goalWidth,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  public render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const tablePad = 14;
    const tableR = 24;

    // Viewport background: #0B0E0D
    ctx.fillStyle = '#0B0E0D';
    ctx.fillRect(0, 0, w, h);

    // 1. Genuinely Flat 2D Top-Down Air Hockey Arena
    // Table boundary (Wide horizontal rounded rectangle)
    const tx = tablePad;
    const ty = tablePad;
    const tw = w - tablePad * 2;
    const th = h - tablePad * 2;

    // Table surface: #121715
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, tableR);
    ctx.fillStyle = '#121715';
    ctx.fill();

    // Table outline: crisp thin line #303833
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Table Markings (Restrained, crisp lines)
    // Thin centre line
    ctx.beginPath();
    ctx.moveTo(w / 2, ty + 2);
    ctx.lineTo(w / 2, ty + th - 2);
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Simple centre circle
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 64, 0, Math.PI * 2);
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Subtle centre dot
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#303833';
    ctx.fill();

    // Left Goal Crease & Opening (P1 Side)
    ctx.beginPath();
    ctx.arc(tx, h / 2, 75, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#168BFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Goal Opening Slot (Centered on left short end)
    ctx.fillStyle = '#0B0E0D';
    ctx.fillRect(tx - 4, this.goalTop, 8, AIR_HOCKEY_CONFIG.goalWidth);
    ctx.strokeStyle = '#168BFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx - 4, this.goalTop, 8, AIR_HOCKEY_CONFIG.goalWidth);

    // Right Goal Crease & Opening (P2 Side)
    ctx.beginPath();
    ctx.arc(tx + tw, h / 2, 75, Math.PI / 2, 3 * Math.PI / 2);
    ctx.strokeStyle = '#E65361';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Goal Opening Slot (Centered on right short end)
    ctx.fillStyle = '#0B0E0D';
    ctx.fillRect(tx + tw - 4, this.goalTop, 8, AIR_HOCKEY_CONFIG.goalWidth);
    ctx.strokeStyle = '#E65361';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx + tw - 4, this.goalTop, 8, AIR_HOCKEY_CONFIG.goalWidth);

    // 3. Puck Trail (Subtle off-white)
    this.puck.trail.forEach(t => {
      if (t.alpha > 0.05) {
        ctx.fillStyle = `rgba(234, 231, 222, ${t.alpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.puck.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. Small Off-White Circular Puck: #EAE7DE
    if (!this.puck.isGoalAnim) {
      // Main flat disc
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#EAE7DE';
      ctx.fill();
      ctx.strokeStyle = '#A6AAA2';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner subtle ring
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#D9CCB2';
      ctx.fill();
    }

    // 5. Flat 2D Paddles
    // Player 1: Flat blue circular paddle #168BFF
    const p1 = this.p1Paddle;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#168BFF';
    ctx.fill();
    ctx.strokeStyle = '#121715';
    ctx.lineWidth = 2;
    ctx.stroke();

    // P1 Inner grip ring
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, p1.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#121715';
    ctx.fill();
    ctx.strokeStyle = '#168BFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Player 2: Flat red circular paddle #E65361
    const p2 = this.p2Paddle;
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, p2.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#E65361';
    ctx.fill();
    ctx.strokeStyle = '#121715';
    ctx.lineWidth = 2;
    ctx.stroke();

    // P2 Inner grip ring
    ctx.beginPath();
    ctx.arc(p2.x, p2.y, p2.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#121715';
    ctx.fill();
    ctx.strokeStyle = '#E65361';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Sparks
    this.sparks.forEach(s => {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  }
}
