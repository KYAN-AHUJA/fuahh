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
import { PlayerId, GameSettings } from '../../types';

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
  public showWebcamBackground: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
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
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.goalTop = (this.height - AIR_HOCKEY_CONFIG.goalWidth) / 2;
    this.goalBottom = (this.height + AIR_HOCKEY_CONFIG.goalWidth) / 2;
  }

  public resetPuck(servingPlayer: PlayerId = 'p1') {
    this.puck.x = this.width / 2;
    this.puck.y = this.height / 2;
    // Serve towards player who conceded or random slight angle
    const dir = servingPlayer === 'p1' ? 1 : -1;
    const speed = 260;
    const angle = (Math.random() - 0.5) * 0.7; // slight vertical angle
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
    // Map normalized target coords to table pixel coordinates
    // Constrain P1 to left half with margin
    const p1MinX = this.p1Paddle.radius + 10;
    const p1MaxX = this.width / 2 - this.p1Paddle.radius - 12;
    const p1MinY = this.p1Paddle.radius + 10;
    const p1MaxY = this.height - this.p1Paddle.radius - 10;

    this.p1Paddle.targetX = Math.max(p1MinX, Math.min(p1MaxX, p1Target.x * this.width));
    this.p1Paddle.targetY = Math.max(p1MinY, Math.min(p1MaxY, p1Target.y * this.height));

    // Constrain P2 to right half with margin
    const p2MinX = this.width / 2 + this.p2Paddle.radius + 12;
    const p2MaxX = this.width - this.p2Paddle.radius - 10;
    const p2MinY = this.p2Paddle.radius + 10;
    const p2MaxY = this.height - this.p2Paddle.radius - 10;

    this.p2Paddle.targetX = Math.max(p2MinX, Math.min(p2MaxX, p2Target.x * this.width));
    this.p2Paddle.targetY = Math.max(p2MinY, Math.min(p2MaxY, p2Target.y * this.height));
  }

  // AI logic for Player 2
  public updateAI(difficulty: 'easy' | 'medium' | 'pro', dt: number) {
    const puck = this.puck;
    const paddle = this.p2Paddle;

    // AI defense line
    const homeX = this.width * 0.82;
    const homeY = this.height / 2;

    let targetX = homeX;
    let targetY = homeY;

    // Speed tracking factors based on difficulty
    const speedMultiplier = difficulty === 'easy' ? 0.45 : difficulty === 'medium' ? 0.72 : 0.95;
    const reactionDelay = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.15 : 0.05;

    // If puck is on AI side or heading towards AI
    if (puck.x > this.width * 0.45 && puck.vx > -100) {
      // Predict puck arrival Y
      const timeToArrive = Math.max(0.01, (paddle.x - puck.x) / (puck.vx || 1));
      let predictedY = puck.y + puck.vy * Math.min(1.0, timeToArrive);

      // Bounce prediction off top/bottom walls
      if (predictedY < puck.radius) predictedY = puck.radius + Math.abs(predictedY);
      if (predictedY > this.height - puck.radius) {
        predictedY = this.height - puck.radius - (predictedY - (this.height - puck.radius));
      }

      // Attack if puck is near and moving slowly, otherwise defend
      if (puck.x > this.width * 0.58 && Math.hypot(puck.vx, puck.vy) < 400) {
        // Strike towards puck!
        targetX = Math.min(this.width * 0.88, puck.x + 25);
        targetY = predictedY;
      } else {
        // Defensive positioning between puck and goal
        targetX = homeX;
        targetY = (predictedY + homeY) / 2;
      }
    } else {
      // Return to home position
      targetX = homeX;
      targetY = homeY + Math.sin(performance.now() * 0.002) * 40;
    }

    // Apply smooth interpolation
    const lerpSpeed = 10 * speedMultiplier * dt;
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
    const dt = Math.min(0.05, Math.max(0.001, (time - this.lastTime) / 1000));
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.resetTimer > 0) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) {
        this.resetPuck();
      }
    }

    // 1. Update Paddles with smooth velocity calculation
    [this.p1Paddle, this.p2Paddle].forEach((paddle) => {
      const prevX = paddle.x;
      const prevY = paddle.y;

      // High-responsive spring/lerp
      const smoothing = 0.32;
      paddle.x += (paddle.targetX - paddle.x) * (1 - smoothing);
      paddle.y += (paddle.targetY - paddle.y) * (1 - smoothing);

      paddle.vx = (paddle.x - prevX) / dt;
      paddle.vy = (paddle.y - prevY) / dt;
    });

    // 2. Update Puck Physics
    if (!this.puck.isGoalAnim) {
      // Movement
      this.puck.x += this.puck.vx * dt;
      this.puck.y += this.puck.vy * dt;

      // Friction
      this.puck.vx *= Math.pow(AIR_HOCKEY_CONFIG.puckFriction, dt * 60);
      this.puck.vy *= Math.pow(AIR_HOCKEY_CONFIG.puckFriction, dt * 60);

      // Trail recording
      this.puck.trail.push({ x: this.puck.x, y: this.puck.y, alpha: 0.6 });
      if (this.puck.trail.length > 12) this.puck.trail.shift();
      this.puck.trail.forEach(t => (t.alpha -= 0.04));

      // Wall Collisions - Top and Bottom
      if (this.puck.y - this.puck.radius <= 0) {
        this.puck.y = this.puck.radius;
        this.puck.vy = -this.puck.vy * AIR_HOCKEY_CONFIG.restitution;
        this.createSparks(this.puck.x, this.puck.y, '#ffffff', 8);
        audioManager.playWallBounce();
      } else if (this.puck.y + this.puck.radius >= this.height) {
        this.puck.y = this.height - this.puck.radius;
        this.puck.vy = -this.puck.vy * AIR_HOCKEY_CONFIG.restitution;
        this.createSparks(this.puck.x, this.puck.y, '#ffffff', 8);
        audioManager.playWallBounce();
      }

      // Left Wall & Left Goal (P1's side)
      const inGoalSlot = this.puck.y >= this.goalTop && this.puck.y <= this.goalBottom;

      if (this.puck.x - this.puck.radius <= 0) {
        if (inGoalSlot) {
          // GOAL for P2!
          if (this.puck.x <= -AIR_HOCKEY_CONFIG.puckRadius) {
            this.handleGoal('p2');
          }
        } else {
          // Bounce off left wall
          this.puck.x = this.puck.radius;
          this.puck.vx = -this.puck.vx * AIR_HOCKEY_CONFIG.restitution;
          this.createSparks(this.puck.x, this.puck.y, '#168BFF', 10);
          audioManager.playWallBounce();
        }
      }

      // Right Wall & Right Goal (P2's side)
      if (this.puck.x + this.puck.radius >= this.width) {
        if (inGoalSlot) {
          // GOAL for P1!
          if (this.puck.x >= this.width + AIR_HOCKEY_CONFIG.puckRadius) {
            this.handleGoal('p1');
          }
        } else {
          // Bounce off right wall
          this.puck.x = this.width - this.puck.radius;
          this.puck.vx = -this.puck.vx * AIR_HOCKEY_CONFIG.restitution;
          this.createSparks(this.puck.x, this.puck.y, '#E65361', 10);
          audioManager.playWallBounce();
        }
      }

      // Paddle Collisions
      const hitP1 = resolvePaddlePuckCollision(this.p1Paddle, this.puck, (ratio) => {
        audioManager.playPaddleHit(ratio);
        this.createSparks(this.puck.x, this.puck.y, '#168BFF', 12);
        this.onHit?.('p1');
      });

      const hitP2 = resolvePaddlePuckCollision(this.p2Paddle, this.puck, (ratio) => {
        audioManager.playPaddleHit(ratio);
        this.createSparks(this.puck.x, this.puck.y, '#E65361', 12);
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
    this.resetTimer = 1.2; // 1.2 second pause before respawn
  }

  private createSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 260;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  private createGoalExplosion(scorer: PlayerId) {
    const color = scorer === 'p1' ? '#168BFF' : '#E65361';
    const x = scorer === 'p1' ? this.width : 0;
    const y = this.height / 2;

    for (let i = 0; i < 45; i++) {
      const angle = (scorer === 'p1' ? Math.PI : 0) + (Math.random() - 0.5) * 1.8;
      const speed = 200 + Math.random() * 500;
      this.sparks.push({
        x,
        y: y + (Math.random() - 0.5) * AIR_HOCKEY_CONFIG.goalWidth,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 1.1,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  public render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Table Background - Understated charcoal
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

    // Subtle table inner border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    // 2. Table Markings
    // Center divider
    ctx.strokeStyle = '#263346';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 8);
    ctx.lineTo(w / 2, h - 8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = '#263346';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#38485e';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // P1 Crease & Goal (Left)
    ctx.strokeStyle = '#168BFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, h / 2, 90, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Left Goal slot
    ctx.fillStyle = 'rgba(22, 139, 255, 0.15)';
    ctx.fillRect(0, this.goalTop, 16, AIR_HOCKEY_CONFIG.goalWidth);
    ctx.strokeStyle = '#168BFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, this.goalTop, 16, AIR_HOCKEY_CONFIG.goalWidth);

    // P2 Crease & Goal (Right)
    ctx.strokeStyle = '#E65361';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w, h / 2, 90, Math.PI / 2, 3 * Math.PI / 2);
    ctx.stroke();

    // Right Goal slot
    ctx.fillStyle = 'rgba(230, 83, 97, 0.15)';
    ctx.fillRect(w - 16, this.goalTop, 16, AIR_HOCKEY_CONFIG.goalWidth);
    ctx.strokeStyle = '#E65361';
    ctx.lineWidth = 3;
    ctx.strokeRect(w - 16, this.goalTop, 16, AIR_HOCKEY_CONFIG.goalWidth);

    // 3. Puck Trail
    this.puck.trail.forEach(t => {
      if (t.alpha > 0.05) {
        ctx.fillStyle = `rgba(245, 158, 11, ${t.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.puck.radius * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. Puck
    if (!this.puck.isGoalAnim) {
      // Outer subtle glow
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.radius + 6, 0, Math.PI * 2);
      ctx.fill();

      // Main puck body
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
      ctx.fill();

      // Inner disc
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Paddles
    [this.p1Paddle, this.p2Paddle].forEach(paddle => {
      // Glow base
      ctx.fillStyle = paddle.glowColor;
      ctx.beginPath();
      ctx.arc(paddle.x, paddle.y, paddle.radius + 8, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = paddle.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(paddle.x, paddle.y, paddle.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner solid body
      ctx.fillStyle = '#141a24';
      ctx.beginPath();
      ctx.arc(paddle.x, paddle.y, paddle.radius - 2, 0, Math.PI * 2);
      ctx.fill();

      // Center knob / grip
      ctx.fillStyle = paddle.color;
      ctx.beginPath();
      ctx.arc(paddle.x, paddle.y, paddle.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    });

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
