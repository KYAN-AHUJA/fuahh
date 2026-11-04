import {
  FighterData,
  TekkenSpark,
  BOXING_CONFIG,
  createInitialFighter,
} from './physics';
import { PlayerId, BoxingPunchType } from '../../types';
import { audioManager } from '../../audio/AudioManager';

interface HitAnnouncement {
  text: string;
  subtext?: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  scale: number;
  life: number;
}

export class BoxingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public width: number;
  public height: number;

  public p1: FighterData;
  public p2: FighterData;
  public sparks: TekkenSpark[] = [];
  public announcements: HitAnnouncement[] = [];

  public currentRound: number = 1;
  public roundTimer: number = 60;
  public roundState: 'intro' | 'fight' | 'ko' | 'round-over' = 'intro';
  public introTimer: number = 2.0;
  public koTimer: number = 0;
  public winner: PlayerId | null = null;

  public screenShake: number = 0;
  public flashAlpha: number = 0;
  public flashColor: string = '#EAE7DE';

  private lastTime: number = 0;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  private roundFinalized: boolean = false;

  public onRoundEnd?: (winner: PlayerId, p1Wins: number, p2Wins: number) => void;
  public onMatchEnd?: (winner: PlayerId) => void;
  public onHit?: (attacker: PlayerId, damage: number, isBlocked: boolean) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;

    this.width = canvas.width;
    this.height = canvas.height;

    this.p1 = createInitialFighter('p1', this.width);
    this.p2 = createInitialFighter('p2', this.width);
    this.startRound(1);
  }

  public setSize(w: number, h: number) {
    this.width = Math.round(w);
    this.height = Math.round(h);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  public startRound(roundNum: number = 1) {
    this.roundFinalized = false;
    this.currentRound = roundNum;
    this.roundTimer = 60;
    this.roundState = 'intro';
    this.introTimer = 2.0;
    this.koTimer = 0;

    // Reset fighters to starting corners
    this.p1.hp = BOXING_CONFIG.maxHp;
    this.p2.hp = BOXING_CONFIG.maxHp;
    this.p1.targetX = this.width * 0.32;
    this.p2.targetX = this.width * 0.68;
    this.p1.pose.x = this.p1.targetX;
    this.p2.pose.x = this.p2.targetX;
    this.p1.pose.isKnockedDown = false;
    this.p2.pose.isKnockedDown = false;
    this.p1.pose.knockdownProgress = 0;
    this.p2.pose.knockdownProgress = 0;
    this.p1.pose.activePunch = 'none';
    this.p2.pose.activePunch = 'none';

    audioManager.playBoxingBell();
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

  // Trigger attack from player
  public executePunch(attackerId: PlayerId, punch: BoxingPunchType) {
    if (this.roundState !== 'fight') return;
    const fighter = attackerId === 'p1' ? this.p1 : this.p2;
    if (fighter.pose.isHitStun || fighter.pose.isKnockedDown) return;
    if (fighter.pose.activePunch !== 'none') return;

    fighter.pose.activePunch = punch;
    fighter.pose.punchProgress = 0;
    audioManager.playPunchWhoosh();
  }

  // Set fighter target movements (head duck, sway, guard, and horizontal position)
  public updateFighterInput(
    id: PlayerId,
    input: {
      moveX?: number; // delta or target X
      duck?: boolean;
      sway?: number; // -1 to 1
      guard?: boolean;
    }
  ) {
    const f = id === 'p1' ? this.p1 : this.p2;
    if (input.moveX !== undefined) {
      f.targetX = Math.max(BOXING_CONFIG.stageLeft, Math.min(BOXING_CONFIG.stageRight, input.moveX));
    }
    if (input.duck !== undefined) f.targetDuck = input.duck;
    if (input.sway !== undefined) f.targetSway = input.sway;
    if (input.guard !== undefined) f.targetGuard = input.guard;
  }

  // Tekken 2 style CPU AI for Player 2
  public updateAI(difficulty: 'easy' | 'medium' | 'pro', dt: number) {
    if (this.roundState !== 'fight') return;
    const cpu = this.p2;
    const player = this.p1;
    const dist = cpu.pose.x - player.pose.x;

    const aggression = difficulty === 'easy' ? 0.35 : difficulty === 'medium' ? 0.65 : 0.9;
    const reactionSpeed = difficulty === 'easy' ? 0.4 : difficulty === 'medium' ? 0.75 : 0.95;

    // React to player's incoming punch
    if (player.pose.activePunch !== 'none' && dist < 180) {
      if (Math.random() < reactionSpeed * 0.8) {
        if (player.pose.activePunch === 'uppercut') {
          // Sway back or guard
          cpu.targetSway = 0.8;
          cpu.targetGuard = true;
        } else if (player.pose.activePunch === 'jab') {
          // Duck or guard
          cpu.targetDuck = Math.random() < 0.6;
          cpu.targetGuard = !cpu.targetDuck;
        } else {
          cpu.targetGuard = true;
        }
      }
    } else {
      cpu.targetGuard = Math.random() < 0.15;
      cpu.targetDuck = false;
      cpu.targetSway = Math.sin(performance.now() * 0.003) * 0.3;
    }

    // Spacing: ideal boxing distance ~140px
    const idealDist = 135;
    if (dist > idealDist + 20) {
      cpu.targetX -= (dist - idealDist) * 3 * dt;
    } else if (dist < idealDist - 30) {
      cpu.targetX += (idealDist - dist) * 4 * dt;
    } else {
      cpu.targetX += Math.sin(performance.now() * 0.004) * 15 * dt;
    }

    // Attack opportunity
    if (dist < 165 && cpu.pose.activePunch === 'none' && !cpu.pose.isHitStun) {
      if (Math.random() < aggression * 0.04) {
        const roll = Math.random();
        if (roll < 0.5) {
          this.executePunch('p2', 'jab');
        } else if (roll < 0.85) {
          this.executePunch('p2', 'cross');
        } else {
          this.executePunch('p2', 'uppercut');
        }
      }
    }
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;
    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 25 * dt);
    }
    // Flash decay
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - 3.5 * dt);
    }

    // Intro announcement ("ROUND 1 - FIGHT!")
    if (this.roundState === 'intro') {
      this.introTimer -= dt;
      if (this.introTimer <= 0) {
        this.roundState = 'fight';
        this.addAnnouncement('FIGHT!', undefined, this.width / 2, this.height * 0.38, '#D9CCB2', 1.8, 0.8);
      }
    } else if (this.roundState === 'fight') {
      this.roundTimer = Math.max(0, this.roundTimer - dt);
      if (this.roundTimer <= 0) {
        this.handleTimeout();
      }
    } else if (this.roundState === 'ko') {
      this.koTimer += dt;
      if (this.koTimer > 2.8) {
        this.finishRound();
      }
    }

    // Update both fighters
    this.updateFighter(this.p1, this.p2, dt);
    this.updateFighter(this.p2, this.p1, dt);

    // Keep fighters from overlapping
    const minDist = 85;
    if (this.p2.pose.x - this.p1.pose.x < minDist && !this.p1.pose.isKnockedDown && !this.p2.pose.isKnockedDown) {
      const mid = (this.p1.pose.x + this.p2.pose.x) / 2;
      this.p1.pose.x = mid - minDist / 2;
      this.p2.pose.x = mid + minDist / 2;
    }

    // Check punch collisions
    if (this.roundState === 'fight') {
      this.checkPunchHit(this.p1, this.p2);
      this.checkPunchHit(this.p2, this.p1);
    }

    // Update Tekken Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rotation += s.rotSpeed * dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Update Announcements
    for (let i = this.announcements.length - 1; i >= 0; i--) {
      const a = this.announcements[i];
      a.y -= 22 * dt;
      a.life -= dt;
      a.alpha = Math.max(0, a.life / 0.8);
      if (a.life <= 0) {
        this.announcements.splice(i, 1);
      }
    }
  }

  private updateFighter(f: FighterData, opp: FighterData, dt: number) {
    const p = f.pose;

    // Movement interpolation
    const moveSmooth = 0.22;
    p.x += (f.targetX - p.x) * (1 - moveSmooth);
    p.facing = p.x < opp.pose.x ? 1 : -1;

    // Duck & Sway interpolation
    const duckTarget = f.targetDuck ? 35 : 0;
    p.duckY += (duckTarget - p.duckY) * 15 * dt;

    const swayTarget = f.targetSway * 28;
    p.swayX += (swayTarget - p.swayX) * 12 * dt;

    p.isGuarding = f.targetGuard && p.activePunch === 'none' && !p.isHitStun;

    // Hit Stun decay
    if (p.isHitStun) {
      p.hitStunTimer -= dt;
      if (p.hitStunTimer <= 0) {
        p.isHitStun = false;
      }
    }

    // Knockdown animation
    if (p.isKnockedDown) {
      p.knockdownProgress = Math.min(1, p.knockdownProgress + 1.2 * dt);
    }

    // Punch animation progress
    if (p.activePunch !== 'none') {
      const punchSpeed = p.activePunch === 'jab' ? 7.5 : p.activePunch === 'cross' ? 5.5 : 4.5;
      p.punchProgress += punchSpeed * dt;
      if (p.punchProgress >= 1) {
        p.activePunch = 'none';
        p.punchProgress = 0;
      }
    }

    // Anatomical body anchors
    const breathOffset = Math.sin(performance.now() * 0.005) * 3;
    const baseFloorY = BOXING_CONFIG.stageFloorY;

    p.torsoX = p.x - p.swayX * 0.5;
    p.torsoY = baseFloorY - 80 + p.duckY * 0.7 + breathOffset;

    p.headX = p.x - p.swayX;
    p.headY = baseFloorY - 145 + p.duckY + breathOffset * 1.2;

    // Glove positions based on guard and punches
    const fDir = p.facing;
    let lGx = p.torsoX + fDir * (p.isGuarding ? 20 : 38);
    let lGy = p.headY + (p.isGuarding ? 10 : 25);
    let rGx = p.torsoX + fDir * (p.isGuarding ? 14 : 18);
    let rGy = p.headY + (p.isGuarding ? 12 : 32);

    if (p.activePunch === 'jab') {
      // Snappy lead punch extension
      const ext = Math.sin(p.punchProgress * Math.PI);
      lGx += fDir * ext * BOXING_CONFIG.jabReach;
      lGy -= ext * 12;
    } else if (p.activePunch === 'cross') {
      // Heavy rear straight cross extension
      const ext = Math.sin(p.punchProgress * Math.PI);
      rGx += fDir * ext * BOXING_CONFIG.crossReach;
      rGy -= ext * 8;
      p.torsoX += fDir * ext * 18;
    } else if (p.activePunch === 'uppercut') {
      // Rising arc uppercut
      const ext = Math.sin(p.punchProgress * Math.PI);
      rGx += fDir * ext * BOXING_CONFIG.uppercutReach;
      rGy -= ext * 65;
      p.torsoY -= ext * 15;
    }

    p.leftGloveX = lGx;
    p.leftGloveY = lGy;
    p.rightGloveX = rGx;
    p.rightGloveY = rGy;
  }

  private checkPunchHit(attacker: FighterData, defender: FighterData) {
    const aP = attacker.pose;
    const dP = defender.pose;

    if (aP.activePunch === 'none') return;
    // Check hit window (apex of punch stroke, ~0.35 to 0.65 progress)
    if (aP.punchProgress < 0.38 || aP.punchProgress > 0.62) return;

    // Active glove position
    const isLead = aP.activePunch === 'jab';
    const gloveX = isLead ? aP.leftGloveX : aP.rightGloveX;
    const gloveY = isLead ? aP.leftGloveY : aP.rightGloveY;

    // Defender head & body hitboxes
    const headHit = Math.hypot(gloveX - dP.headX, gloveY - dP.headY) < 42;
    const bodyHit = Math.hypot(gloveX - dP.torsoX, gloveY - dP.torsoY) < 55;

    if (headHit || bodyHit) {
      // Check ducking whiff: if defender is ducking low and punch is high jab/cross
      if (dP.duckY > 24 && aP.activePunch !== 'uppercut' && gloveY < dP.headY + 10) {
        // Whiffed over head!
        return;
      }

      this.resolveHit(attacker, defender, gloveX, gloveY, headHit);
      // Consume punch hit so it doesn't multi-hit in the same frame window
      aP.punchProgress = 0.68;
    }
  }

  private resolveHit(
    attacker: FighterData,
    defender: FighterData,
    hitX: number,
    hitY: number,
    isHeadShot: boolean
  ) {
    const dP = defender.pose;
    const isBlocked = dP.isGuarding && !dP.isHitStun;
    const punch = attacker.pose.activePunch;

    let baseDamage = punch === 'jab' ? BOXING_CONFIG.jabDamage : punch === 'cross' ? BOXING_CONFIG.crossDamage : BOXING_CONFIG.uppercutDamage;
    const isCounter = defender.pose.activePunch !== 'none';
    if (isCounter && !isBlocked) {
      baseDamage = Math.round(baseDamage * 1.35);
    }

    const actualDamage = isBlocked ? Math.max(2, Math.round(baseDamage * BOXING_CONFIG.chipDamageMultiplier)) : baseDamage;
    defender.hp = Math.max(0, defender.hp - actualDamage);

    // Sound & Effects
    if (isBlocked) {
      audioManager.playBlockThud();
      this.createTekkenBlockSparks(hitX, hitY);
      this.addAnnouncement('BLOCK!', undefined, hitX, hitY - 30, '#60A5FA', 1.0, 0.45);
    } else {
      const isHeavy = punch === 'cross' || punch === 'uppercut' || isCounter;
      audioManager.playPunchHit(isHeavy);
      this.createTekkenHitSparks(hitX, hitY, attacker.color, isHeavy);
      this.screenShake = isHeavy ? 10 : 5;
      this.flashAlpha = isHeavy ? 0.35 : 0.18;
      this.flashColor = attacker.color;

      // Hit Stun and Pushback
      dP.isHitStun = true;
      dP.hitStunTimer = isHeavy ? 0.32 : 0.18;
      defender.targetX += attacker.pose.facing * (isHeavy ? 45 : 24);

      if (isCounter) {
        this.addAnnouncement('COUNTER HIT!', `+${actualDamage} DMG`, hitX, hitY - 45, '#D9CCB2', 1.3, 0.65);
      } else {
        attacker.comboCount++;
        const sub = attacker.comboCount > 1 ? `${attacker.comboCount} HITS` : `-${actualDamage} HP`;
        this.addAnnouncement(isHeadShot ? 'CLEAN HIT!' : 'BODY BLOW', sub, hitX, hitY - 35, attacker.color, 1.1, 0.55);
      }
    }

    this.onHit?.(attacker.id, actualDamage, isBlocked);

    // Check KO
    if (defender.hp <= 0 && this.roundState === 'fight') {
      this.triggerKO(attacker.id, defender.id);
    }
  }

  private triggerKO(winnerId: PlayerId, loserId: PlayerId) {
    this.roundState = 'ko';
    this.koTimer = 0;
    this.winner = winnerId;
    const loser = loserId === 'p1' ? this.p1 : this.p2;
    loser.pose.isKnockedDown = true;
    loser.pose.knockdownProgress = 0;

    audioManager.playKO();
    this.screenShake = 18;
    this.flashAlpha = 0.6;
    this.flashColor = '#EAE7DE';

    this.addAnnouncement('K.O.!', 'KNOCKOUT VICTORY', this.width / 2, this.height * 0.36, '#D9CCB2', 2.2, 2.5);
  }

  private handleTimeout() {
    this.roundState = 'round-over';
    const winnerId = this.p1.hp >= this.p2.hp ? 'p1' : 'p2';
    this.winner = winnerId;
    this.addAnnouncement('TIME OUT', undefined, this.width / 2, this.height * 0.36, '#D9CCB2', 1.8, 1.5);
    setTimeout(() => this.finishRound(), 1500);
  }

  private finishRound() {
    if (this.roundFinalized) return;
    this.roundFinalized = true;
    this.roundState = 'round-over';

    if (this.winner === 'p1') this.p1.roundsWon++;
    if (this.winner === 'p2') this.p2.roundsWon++;

    this.onRoundEnd?.(this.winner!, this.p1.roundsWon, this.p2.roundsWon);

    // Best of 3 rounds
    if (this.p1.roundsWon >= 2 || this.p2.roundsWon >= 2) {
      this.onMatchEnd?.(this.winner!);
    } else {
      this.startRound(this.currentRound + 1);
    }
  }

  private createTekkenHitSparks(x: number, y: number, color: string, isHeavy: boolean) {
    const count = isHeavy ? 28 : 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * (isHeavy ? 380 : 240);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        color: i % 2 === 0 ? '#FFE066' : color,
        size: 2.5 + Math.random() * (isHeavy ? 3.5 : 2),
        type: i % 3 === 0 ? 'star' : 'spark',
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 12,
      });
    }
  }

  private createTekkenBlockSparks(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.18 + Math.random() * 0.15,
        maxLife: 0.35,
        color: '#60A5FA',
        size: 2 + Math.random() * 1.5,
        type: 'spark',
        rotation: 0,
        rotSpeed: 0,
      });
    }
  }

  private addAnnouncement(text: string, subtext: string | undefined, x: number, y: number, color: string, scale: number = 1, life: number = 0.8) {
    this.announcements.push({
      text,
      subtext,
      x,
      y,
      color,
      alpha: 1,
      scale,
      life,
    });
  }

  public render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Tekken 2 Style Retro Arcade Stage
    ctx.fillStyle = '#0B0E0D';
    ctx.fillRect(0, 0, w, h);

    // Distant Neon Grid Horizon
    const horizonY = BOXING_CONFIG.stageFloorY - 110;
    const floorY = BOXING_CONFIG.stageFloorY;

    // Distant dark skyline silhouette
    ctx.fillStyle = '#121715';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x < w; x += 40) {
      const hBlock = 25 + Math.sin(x * 0.05) * 15;
      ctx.rect(x, horizonY - hBlock, 38, hBlock);
    }
    ctx.fill();

    // Floor Perspective Grid
    ctx.fillStyle = '#171D1A';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Horizontal grid lines
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 1;
    for (let y = horizonY; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Perspective floor lines converging to center horizon
    const vX = w / 2;
    for (let x = -w * 0.2; x <= w * 1.2; x += 75) {
      ctx.beginPath();
      ctx.moveTo(vX, horizonY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Boxing Ring Ropes (2D Retro Ring)
    const ropeColors = ['#168BFF', '#EAE7DE', '#E65361'];
    [horizonY + 30, horizonY + 65, horizonY + 98].forEach((ry, idx) => {
      ctx.strokeStyle = ropeColors[idx % 3];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, ry);
      ctx.lineTo(w - 40, ry);
      ctx.stroke();
    });

    // Ring Corner Turnbuckles
    ctx.fillStyle = '#168BFF';
    ctx.fillRect(36, horizonY + 20, 8, 90);
    ctx.fillStyle = '#E65361';
    ctx.fillRect(w - 44, horizonY + 20, 8, 90);

    // 2. Fighter Drop Shadows
    [this.p1, this.p2].forEach(f => {
      ctx.fillStyle = 'rgba(11, 14, 13, 0.65)';
      ctx.beginPath();
      ctx.ellipse(f.pose.x, floorY + 4, 38, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Render Fighters
    this.renderFighter(this.p1);
    this.renderFighter(this.p2);

    // 4. Render Tekken Hit Sparks
    this.sparks.forEach(s => {
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.fillStyle = s.color;

      if (s.type === 'star') {
        // Geometric 4-point star burst (Tekken hit spark)
        const size = s.size * 2;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.3, -size * 0.3);
        ctx.lineTo(size, 0);
        ctx.lineTo(size * 0.3, size * 0.3);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.3, size * 0.3);
        ctx.lineTo(-size, 0);
        ctx.lineTo(-size * 0.3, -size * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 5. Impact Flash Vignette
    if (this.flashAlpha > 0.02) {
      ctx.save();
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha * 0.45;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 6. Tekken 2 Style Arcade Fight HUD (Top Health Bars)
    this.renderTekkenHUD();

    // 7. Floating Announcements ("COUNTER HIT", "K.O.", "ROUND 1")
    this.announcements.forEach(a => {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.translate(a.x, a.y);
      ctx.scale(a.scale, a.scale);

      // Dark shadow / outline for high legibility
      ctx.font = '900 24px "Inter", sans-serif';
      ctx.fillStyle = '#0B0E0D';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.text, 2, 2);

      ctx.fillStyle = a.color;
      ctx.fillText(a.text, 0, 0);

      if (a.subtext) {
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#EAE7DE';
        ctx.fillText(a.subtext, 0, 18);
      }
      ctx.restore();
    });

    // Intro Round Callout Overlay
    if (this.roundState === 'intro') {
      ctx.save();
      ctx.fillStyle = 'rgba(11, 14, 13, 0.45)';
      ctx.fillRect(0, h * 0.3, w, 110);

      ctx.font = '900 36px "Inter", sans-serif';
      ctx.fillStyle = '#D9CCB2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ROUND ${this.currentRound}`, w / 2, h * 0.35 + 20);

      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#A6AAA2';
      ctx.fillText('GET READY', w / 2, h * 0.35 + 50);
      ctx.restore();
    }

    ctx.restore();
  }

  // Render individual 2D procedural boxer
  private renderFighter(f: FighterData) {
    const ctx = this.ctx;
    const p = f.pose;
    const isP1 = f.id === 'p1';
    const mainColor = f.color;
    const darkSkin = '#202723';
    const shortsColor = isP1 ? '#121715' : '#171D1A';

    ctx.save();

    if (p.isKnockedDown) {
      // Knockdown tumble rotation
      ctx.translate(p.x, p.y);
      ctx.rotate(p.facing * p.knockdownProgress * (Math.PI / 2.2));
      ctx.translate(-p.x, -p.y);
    }

    // A. Legs & Boxing Boots
    const legW = 12;
    const legH = 48;
    const floorY = BOXING_CONFIG.stageFloorY;

    // Left leg
    ctx.fillStyle = shortsColor;
    ctx.fillRect(p.x - 18, floorY - 52, legW, 26);
    ctx.fillStyle = darkSkin;
    ctx.fillRect(p.x - 18, floorY - 26, legW, 16);
    ctx.fillStyle = mainColor;
    ctx.fillRect(p.x - 20, floorY - 10, legW + 4, 10);

    // Right leg
    ctx.fillStyle = shortsColor;
    ctx.fillRect(p.x + 6, floorY - 52, legW, 26);
    ctx.fillStyle = darkSkin;
    ctx.fillRect(p.x + 6, floorY - 26, legW, 16);
    ctx.fillStyle = mainColor;
    ctx.fillRect(p.x + 4, floorY - 10, legW + 4, 10);

    // B. Torso & Boxing Shorts
    // Shorts
    ctx.fillStyle = shortsColor;
    ctx.fillRect(p.torsoX - 22, p.torsoY - 12, 44, 28);
    // Belt band in fighter accent
    ctx.fillStyle = f.accentColor;
    ctx.fillRect(p.torsoX - 22, p.torsoY - 12, 44, 6);

    // Upper muscular torso
    ctx.fillStyle = darkSkin;
    ctx.beginPath();
    ctx.moveTo(p.torsoX - 22, p.torsoY - 12);
    ctx.lineTo(p.torsoX + 22, p.torsoY - 12);
    ctx.lineTo(p.torsoX + 26, p.torsoY - 50);
    ctx.lineTo(p.torsoX - 26, p.torsoY - 50);
    ctx.closePath();
    ctx.fill();

    // Muscle contour lines
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.torsoX, p.torsoY - 48);
    ctx.lineTo(p.torsoX, p.torsoY - 15);
    ctx.stroke();

    // C. Head & Boxing Headgear
    ctx.save();
    ctx.translate(p.headX, p.headY);

    // Neck
    ctx.fillStyle = darkSkin;
    ctx.fillRect(-7, 10, 14, 18);

    // Head base
    ctx.fillStyle = darkSkin;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Boxing Headgear in fighter color
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.arc(0, -2, 19, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Cheek guard pads
    ctx.fillRect(p.facing === 1 ? 4 : -14, -2, 10, 14);

    // Eyes / Visor slit
    ctx.fillStyle = '#EAE7DE';
    const eyeX = p.facing === 1 ? 4 : -10;
    ctx.fillRect(eyeX, -3, 8, 3.5);

    // Headgear chin strap
    ctx.strokeStyle = f.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, 16, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();

    // D. Arms & Boxing Gloves
    const renderGlove = (gx: number, gy: number, isLead: boolean) => {
      // Forearm line from shoulder to glove
      const shoulderX = p.torsoX + (isLead ? p.facing * 18 : -p.facing * 10);
      const shoulderY = p.torsoY - 44;

      ctx.strokeStyle = darkSkin;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(gx, gy);
      ctx.stroke();

      // Rounded Boxing Glove
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.arc(gx, gy, 15, 0, Math.PI * 2);
      ctx.fill();

      // Glove cuff wrap
      ctx.strokeStyle = '#EAE7DE';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glove thumb
      ctx.fillStyle = f.accentColor;
      ctx.beginPath();
      ctx.arc(gx + p.facing * 8, gy + 4, 6, 0, Math.PI * 2);
      ctx.fill();
    };

    // Draw rear arm first, then lead arm
    if (p.facing === 1) {
      renderGlove(p.rightGloveX, p.rightGloveY, false);
      renderGlove(p.leftGloveX, p.leftGloveY, true);
    } else {
      renderGlove(p.leftGloveX, p.leftGloveY, true);
      renderGlove(p.rightGloveX, p.rightGloveY, false);
    }

    ctx.restore();
  }

  // Tekken 2 Style Retro HUD (Twin Health Bars + Round Indicator + Clock)
  private renderTekkenHUD() {
    const ctx = this.ctx;
    const w = this.width;

    const barW = Math.min(320, w * 0.36);
    const barH = 18;
    const topY = 22;

    // 1. Center Timer (60s fight clock)
    const timerText = `${Math.ceil(this.roundTimer)}`;
    ctx.font = '900 32px "JetBrains Mono", monospace';
    ctx.fillStyle = this.roundTimer <= 10 ? '#E65361' : '#EAE7DE';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timerText, w / 2, topY + barH / 2);

    // Round subtitle
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#A6AAA2';
    ctx.fillText(`R${this.currentRound}`, w / 2, topY + barH + 12);

    // 2. Player 1 Health Bar (Left side, fills right-to-left towards center)
    const p1HpRatio = Math.max(0, this.p1.hp / this.p1.maxHp);
    const p1X = w / 2 - 45 - barW;

    // P1 Name & Win Badges
    ctx.font = '800 12px "Inter", sans-serif';
    ctx.fillStyle = '#168BFF';
    ctx.textAlign = 'left';
    ctx.fillText(this.p1.name, p1X, topY - 7);

    // P1 Round Win Markers (V icons)
    for (let i = 0; i < 2; i++) {
      const won = i < this.p1.roundsWon;
      ctx.fillStyle = won ? '#168BFF' : '#303833';
      ctx.fillRect(p1X + 90 + i * 16, topY - 14, 11, 7);
    }

    // P1 Health Bar Frame
    ctx.fillStyle = '#121715';
    ctx.fillRect(p1X, topY, barW, barH);
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p1X, topY, barW, barH);

    // P1 Health Fill (Yellow/Red gradient)
    const p1FillW = barW * p1HpRatio;
    ctx.fillStyle = p1HpRatio < 0.25 ? '#E65361' : '#FFE066';
    ctx.fillRect(p1X + (barW - p1FillW), topY + 2, p1FillW, barH - 4);

    // 3. Player 2 Health Bar (Right side, fills left-to-right from center)
    const p2HpRatio = Math.max(0, this.p2.hp / this.p2.maxHp);
    const p2X = w / 2 + 45;

    // P2 Name & Win Badges
    ctx.font = '800 12px "Inter", sans-serif';
    ctx.fillStyle = '#E65361';
    ctx.textAlign = 'right';
    ctx.fillText(this.p2.name, p2X + barW, topY - 7);

    // P2 Round Win Markers
    for (let i = 0; i < 2; i++) {
      const won = i < this.p2.roundsWon;
      ctx.fillStyle = won ? '#E65361' : '#303833';
      ctx.fillRect(p2X + barW - 120 - i * 16, topY - 14, 11, 7);
    }

    // P2 Health Bar Frame
    ctx.fillStyle = '#121715';
    ctx.fillRect(p2X, topY, barW, barH);
    ctx.strokeStyle = '#303833';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p2X, topY, barW, barH);

    // P2 Health Fill
    const p2FillW = barW * p2HpRatio;
    ctx.fillStyle = p2HpRatio < 0.25 ? '#E65361' : '#FFE066';
    ctx.fillRect(p2X, topY + 2, p2FillW, barH - 4);
  }
}
