import Matter from 'matter-js';
import { soundEngine } from '../audio/SoundEngine';
import { ParticleSystem } from '../particles/ParticleSystem';

const { Bodies, Body, Composite } = Matter;

export interface BlackHole {
  x: number;
  y: number;
  radius: number;
  strength: number;
  angle: number;
}

export interface Portal {
  x: number;
  y: number;
  color: string;
  name: 'A' | 'B';
}

export interface PortalPair {
  portalA: Portal;
  portalB: Portal;
  cooldowns: Map<number, number>; // body id -> remaining cooldown frames
}

export interface BombEntity {
  body: Matter.Body;
  timer: number; // in frames, 0 means exploded
  exploded: boolean;
}

export interface LaserBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  rotationSpeed: number;
  length: number;
}

export class SpecialEntityManager {
  public blackHoles: BlackHole[] = [];
  public portalPair: PortalPair | null = null;
  public bombs: BombEntity[] = [];
  public lasers: LaserBeam[] = [];
  public sawBlades: Matter.Body[] = [];

  constructor() {}

  // Spawn Black Hole
  public addBlackHole(x: number, y: number): BlackHole {
    const bh: BlackHole = {
      x,
      y,
      radius: 180,
      strength: 0.0035,
      angle: 0,
    };
    this.blackHoles.push(bh);
    soundEngine.playPulse();
    return bh;
  }

  // Set or update Portal Pair
  public setPortal(name: 'A' | 'B', x: number, y: number) {
    if (!this.portalPair) {
      this.portalPair = {
        portalA: { x: name === 'A' ? x : 150, y: name === 'A' ? y : 200, color: '#00d0ff', name: 'A' },
        portalB: { x: name === 'B' ? x : 650, y: name === 'B' ? y : 500, color: '#ff7700', name: 'B' },
        cooldowns: new Map(),
      };
    } else {
      if (name === 'A') {
        this.portalPair.portalA.x = x;
        this.portalPair.portalA.y = y;
      } else {
        this.portalPair.portalB.x = x;
        this.portalPair.portalB.y = y;
      }
    }
    soundEngine.playPortalWarp();
  }

  // Create Bomb
  public addBomb(world: Matter.World, x: number, y: number): Matter.Body {
    const bombBody = Bodies.circle(x, y, 20, {
      restitution: 0.4,
      friction: 0.5,
      density: 0.004,
      render: {
        fillStyle: '#ff0033',
        strokeStyle: '#ffcc00',
        lineWidth: 3,
      },
      label: 'bomb',
    });

    Composite.add(world, bombBody);
    this.bombs.push({
      body: bombBody,
      timer: 180, // 3 seconds at 60fps
      exploded: false,
    });
    soundEngine.playSpawn();
    return bombBody;
  }

  // Add Laser Beam
  public addLaser(x: number, y: number, length: number = 280, rotationSpeed: number = 0.015) {
    this.lasers.push({
      x1: x,
      y1: y,
      x2: x + length,
      y2: y,
      angle: 0,
      rotationSpeed,
      length,
    });
  }

  // Add Spinning Saw Blade
  public addSawBlade(world: Matter.World, x: number, y: number, radius: number = 38): Matter.Body {
    const saw = Bodies.circle(x, y, radius, {
      isStatic: true,
      restitution: 1.5,
      friction: 0,
      render: {
        fillStyle: '#222233',
        strokeStyle: '#ff0044',
        lineWidth: 4,
      },
      label: 'saw_blade',
    });
    Composite.add(world, saw);
    this.sawBlades.push(saw);
    return saw;
  }

  // Update physics effects for special entities
  public update(world: Matter.World, bodies: Matter.Body[], particles: ParticleSystem) {
    // 1. Black Holes Pull
    for (const bh of this.blackHoles) {
      bh.angle += 0.06;
      for (const body of bodies) {
        if (body.isStatic) continue;

        const dx = bh.x - body.position.x;
        const dy = bh.y - body.position.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < bh.radius && dist > 10) {
          const forceMag = (bh.strength * body.mass) / Math.max(dist * 0.08, 1);
          // Swirl component
          const tangentX = -dy / dist;
          const tangentY = dx / dist;

          Matter.Body.applyForce(body, body.position, {
            x: (dx / dist) * forceMag + tangentX * forceMag * 0.4,
            y: (dy / dist) * forceMag + tangentY * forceMag * 0.4,
          });

          // Spin the body
          body.torque += 0.0003 * body.mass;
        }
      }
    }

    // 2. Portals Teleportation
    if (this.portalPair) {
      const { portalA, portalB, cooldowns } = this.portalPair;
      // Decay cooldowns
      for (const [id, cd] of cooldowns.entries()) {
        if (cd <= 1) cooldowns.delete(id);
        else cooldowns.set(id, cd - 1);
      }

      const portalRadius = 38;
      for (const body of bodies) {
        if (body.isStatic || cooldowns.has(body.id)) continue;

        // Check Portal A
        const distA = Math.hypot(portalA.x - body.position.x, portalA.y - body.position.y);
        if (distA < portalRadius) {
          Body.setPosition(body, { x: portalB.x, y: portalB.y });
          cooldowns.set(body.id, 45);
          particles.createPortalBurst(portalA.x, portalA.y, portalA.color);
          particles.createPortalBurst(portalB.x, portalB.y, portalB.color);
          soundEngine.playPortalWarp();
          continue;
        }

        // Check Portal B
        const distB = Math.hypot(portalB.x - body.position.x, portalB.y - body.position.y);
        if (distB < portalRadius) {
          Body.setPosition(body, { x: portalA.x, y: portalA.y });
          cooldowns.set(body.id, 45);
          particles.createPortalBurst(portalB.x, portalB.y, portalB.color);
          particles.createPortalBurst(portalA.x, portalA.y, portalA.color);
          soundEngine.playPortalWarp();
        }
      }
    }

    // 3. Bombs ticking & detonation
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      if (bomb.exploded) continue;

      bomb.timer--;
      // Fuse smoke/spark
      if (Math.random() < 0.3) {
        particles.createCollisionSparks(bomb.body.position.x, bomb.body.position.y - 15, 0.4);
      }

      if (bomb.timer <= 0) {
        this.detonateBomb(world, bomb, bodies, particles);
        this.bombs.splice(i, 1);
      }
    }

    // 4. Lasers
    for (const laser of this.lasers) {
      laser.angle += laser.rotationSpeed;
      laser.x2 = laser.x1 + Math.cos(laser.angle) * laser.length;
      laser.y2 = laser.y1 + Math.sin(laser.angle) * laser.length;

      // Check intersection with bodies
      for (const body of bodies) {
        if (body.isStatic) continue;
        const distToLaser = this.distToSegment(
          body.position.x, body.position.y,
          laser.x1, laser.y1,
          laser.x2, laser.y2
        );

        if (distToLaser < 22) {
          // Push away
          const pushAngle = laser.angle + Math.PI / 2;
          Body.applyForce(body, body.position, {
            x: Math.cos(pushAngle) * 0.03 * body.mass,
            y: Math.sin(pushAngle) * 0.03 * body.mass,
          });
          particles.createCollisionSparks(body.position.x, body.position.y, 0.8);
          soundEngine.playLaser();
        }
      }
    }

    // 5. Saw Blades rotation
    for (const saw of this.sawBlades) {
      Body.setAngle(saw, saw.angle + 0.12);
    }
  }

  // Manually or automatically detonate bomb
  public detonateBomb(world: Matter.World, bomb: BombEntity, bodies: Matter.Body[], particles: ParticleSystem) {
    if (bomb.exploded) return;
    bomb.exploded = true;

    const bx = bomb.body.position.x;
    const by = bomb.body.position.y;
    const blastRadius = 240;
    const blastForce = 0.14;

    particles.createExplosion(bx, by, '#ff3300');
    soundEngine.playExplosion();

    for (const body of bodies) {
      if (body === bomb.body || body.isStatic) continue;

      const dx = body.position.x - bx;
      const dy = body.position.y - by;
      const dist = Math.hypot(dx, dy);

      if (dist < blastRadius && dist > 1) {
        const factor = (1 - dist / blastRadius);
        const force = factor * blastForce * body.mass;
        Body.applyForce(body, body.position, {
          x: (dx / dist) * force,
          y: (dy / dist) * force - 0.05 * body.mass, // pop upwards
        });
      }
    }

    Composite.remove(world, bomb.body);
  }

  // Detonate nearest bomb on user click
  public triggerNearestBomb(world: Matter.World, x: number, y: number, bodies: Matter.Body[], particles: ParticleSystem): boolean {
    for (let i = 0; i < this.bombs.length; i++) {
      const b = this.bombs[i];
      const dist = Math.hypot(b.body.position.x - x, b.body.position.y - y);
      if (dist < 40) {
        this.detonateBomb(world, b, bodies, particles);
        this.bombs.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  // Render overlay graphics for special entities
  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Black Holes
    for (const bh of this.blackHoles) {
      ctx.save();
      ctx.translate(bh.x, bh.y);
      ctx.rotate(bh.angle);

      // Event horizon glow
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, bh.radius);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.3, 'rgba(128, 0, 255, 0.4)');
      grad.addColorStop(0.7, 'rgba(0, 255, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
      ctx.fill();

      // Core singularity
      ctx.fillStyle = '#050010';
      ctx.shadowColor = '#cc00ff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      // Swirling arms
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2;
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        const baseAngle = (arm * Math.PI * 2) / 3;
        for (let r = 24; r < bh.radius; r += 5) {
          const a = baseAngle + r * 0.05;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (r === 24) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Portals
    if (this.portalPair) {
      const renderPortal = (p: Portal) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20;

        // Outer ring
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 46, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner swirl
        ctx.fillStyle = '#080812';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 42, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name, 0, 0);

        ctx.restore();
      };

      renderPortal(this.portalPair.portalA);
      renderPortal(this.portalPair.portalB);
    }

    // 3. Lasers
    for (const laser of this.lasers) {
      ctx.save();
      ctx.strokeStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      // Core white laser
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(laser.x1, laser.y1);
      ctx.lineTo(laser.x2, laser.y2);
      ctx.stroke();

      // Base emitter
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(laser.x1, laser.y1, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Saw blade teeth
    for (const saw of this.sawBlades) {
      ctx.save();
      ctx.translate(saw.position.x, saw.position.y);
      ctx.rotate(saw.angle);
      ctx.fillStyle = '#ff0055';
      const teeth = 8;
      const rOuter = 44;
      const rInner = 36;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (i / teeth) * Math.PI * 2;
        const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
        ctx.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
        ctx.lineTo(Math.cos(a2) * rInner, Math.sin(a2) * rInner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // Clear all special entities
  public clear(world: Matter.World) {
    for (const b of this.bombs) {
      Composite.remove(world, b.body);
    }
    for (const s of this.sawBlades) {
      Composite.remove(world, s);
    }
    this.bombs = [];
    this.blackHoles = [];
    this.portalPair = null;
    this.lasers = [];
    this.sawBlades = [];
  }

  // Math helper
  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }
}
