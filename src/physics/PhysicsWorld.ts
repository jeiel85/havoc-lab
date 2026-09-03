import Matter from 'matter-js';
import { soundEngine } from '../audio/SoundEngine';
import { ParticleSystem } from '../particles/ParticleSystem';
import { SpecialEntityManager } from './SpecialEntities';

const { Engine, Bodies, Composite, Events, Mouse, MouseConstraint } = Matter;

export class PhysicsWorld {
  public engine: Matter.Engine;
  public world: Matter.World;
  public width: number = 1200;
  public height: number = 800;
  public walls: Matter.Body[] = [];
  public mouseConstraint: Matter.MouseConstraint;
  public specialEntities: SpecialEntityManager;
  public isSlowMotion: boolean = false;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, particles: ParticleSystem) {
    this.width = width;
    this.height = height;

    // Create Engine with iterations for stable ragdoll physics
    this.engine = Engine.create({
      positionIterations: 8,
      velocityIterations: 8,
      constraintIterations: 4,
    });
    this.world = this.engine.world;
    this.world.gravity.y = 1;
    this.world.gravity.x = 0;

    this.specialEntities = new SpecialEntityManager();

    // Setup walls
    this.setupWalls();

    // Setup Mouse Interaction
    const mouse = Mouse.create(canvas);
    this.mouseConstraint = MouseConstraint.create(this.engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: true,
          lineWidth: 2,
          strokeStyle: '#00ffcc',
        },
      },
    });
    Composite.add(this.world, this.mouseConstraint);

    // Setup Collision Sounds & Sparks
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const relVelX = bodyA.velocity.x - bodyB.velocity.x;
        const relVelY = bodyA.velocity.y - bodyB.velocity.y;
        const speed = Math.hypot(relVelX, relVelY);

        if (speed > 2.5) {
          const intensity = Math.min(speed / 15, 1.0);
          soundEngine.playHit(intensity);

          // Spawn collision sparks at contact point
          const collisionX = (bodyA.position.x + bodyB.position.x) / 2;
          const collisionY = (bodyA.position.y + bodyB.position.y) / 2;
          particles.createCollisionSparks(collisionX, collisionY, intensity);

          // Jump pad special bounce
          if (bodyA.label === 'jump_pad' || bodyB.label === 'jump_pad') {
            const dynamicBody = bodyA.label === 'jump_pad' ? bodyB : bodyA;
            if (!dynamicBody.isStatic) {
              Matter.Body.setVelocity(dynamicBody, {
                x: dynamicBody.velocity.x * 1.2,
                y: -18,
              });
              soundEngine.playBounce();
              particles.createPulse(dynamicBody.position.x, dynamicBody.position.y);
            }
          }
        }
      }
    });
  }

  public setupWalls() {
    // Remove existing walls
    for (const wall of this.walls) {
      Composite.remove(this.world, wall);
    }
    this.walls = [];

    const wallThickness = 60;
    const w = this.width;
    const h = this.height;

    // Floor, Ceiling, Left Wall, Right Wall
    const floor = Bodies.rectangle(w / 2, h + wallThickness / 2 - 10, w * 2, wallThickness, {
      isStatic: true,
      friction: 0.8,
      restitution: 0.2,
      render: { fillStyle: '#14142b', strokeStyle: '#2a2a4e', lineWidth: 2 },
      label: 'ground',
    });

    const ceiling = Bodies.rectangle(w / 2, -wallThickness / 2 + 10, w * 2, wallThickness, {
      isStatic: true,
      render: { fillStyle: '#14142b' },
      label: 'ceiling',
    });

    const leftWall = Bodies.rectangle(-wallThickness / 2 + 10, h / 2, wallThickness, h * 2, {
      isStatic: true,
      render: { fillStyle: '#14142b' },
      label: 'left_wall',
    });

    const rightWall = Bodies.rectangle(w + wallThickness / 2 - 10, h / 2, wallThickness, h * 2, {
      isStatic: true,
      render: { fillStyle: '#14142b' },
      label: 'right_wall',
    });

    this.walls = [floor, ceiling, leftWall, rightWall];
    Composite.add(this.world, this.walls);
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.setupWalls();
  }

  // Set Gravity Mode
  public setGravity(type: 'normal' | 'zero' | 'reverse' | 'moon' | 'heavy' | 'left' | 'right') {
    switch (type) {
      case 'normal':
        this.world.gravity.x = 0;
        this.world.gravity.y = 1;
        break;
      case 'zero':
        this.world.gravity.x = 0;
        this.world.gravity.y = 0;
        break;
      case 'reverse':
        this.world.gravity.x = 0;
        this.world.gravity.y = -1;
        break;
      case 'moon':
        this.world.gravity.x = 0;
        this.world.gravity.y = 0.25;
        break;
      case 'heavy':
        this.world.gravity.x = 0;
        this.world.gravity.y = 2.4;
        break;
      case 'left':
        this.world.gravity.x = -1;
        this.world.gravity.y = 0;
        break;
      case 'right':
        this.world.gravity.x = 1;
        this.world.gravity.y = 0;
        break;
    }
  }

  // Toggle Bullet Time Slow Motion
  public toggleSlowMotion(): boolean {
    this.isSlowMotion = !this.isSlowMotion;
    this.engine.timing.timeScale = this.isSlowMotion ? 0.2 : 1.0;
    soundEngine.setSlowMotion(this.isSlowMotion);
    return this.isSlowMotion;
  }

  // Apply Repulsor Blast
  public applyRepulsorPulse(x: number, y: number, particles: ParticleSystem) {
    const radius = 260;
    const forcePower = 0.12;

    particles.createPulse(x, y);
    soundEngine.playPulse();

    const allBodies = Composite.allBodies(this.world);
    for (const body of allBodies) {
      if (body.isStatic) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.hypot(dx, dy);

      if (dist < radius && dist > 1) {
        const factor = (1 - dist / radius);
        const f = factor * forcePower * body.mass;
        Matter.Body.applyForce(body, body.position, {
          x: (dx / dist) * f,
          y: (dy / dist) * f,
        });
      }
    }
  }

  // Clear all non-static bodies
  public clearAll() {
    const bodies = Composite.allBodies(this.world);
    for (const b of bodies) {
      if (!this.walls.includes(b)) {
        Composite.remove(this.world, b);
      }
    }
    const composites = Composite.allComposites(this.world);
    for (const c of composites) {
      Composite.remove(this.world, c);
    }
    this.specialEntities.clear(this.world);
  }

  // Step physics simulation
  public update(deltaMs: number, particles: ParticleSystem) {
    Engine.update(this.engine, deltaMs);
    const bodies = Composite.allBodies(this.world);
    this.specialEntities.update(this.world, bodies, particles);
  }
}
