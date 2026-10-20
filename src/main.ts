import Matter from 'matter-js';
import { soundEngine } from './audio/SoundEngine';
import { MissionManager } from './game/MissionManager';
import { ParticleSystem } from './particles/ParticleSystem';
import { ObjectFactory } from './physics/ObjectFactory';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { UIManager } from './ui/UIManager';

const canvas = document.getElementById('viewport-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let width = window.innerWidth;
let height = window.innerHeight;

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  if (physicsWorld) {
    physicsWorld.resize(width, height);
  }
}

window.addEventListener('resize', resizeCanvas);
canvas.width = width;
canvas.height = height;

// Initialize Core Systems
const particles = new ParticleSystem();
const physicsWorld = new PhysicsWorld(canvas, width, height, particles);
const missionManager = new MissionManager();
const uiManager = new UIManager(physicsWorld, missionManager);

// Initial spawn in sandbox: Fun greeting setup
function spawnInitialSandbox() {
  const rag1 = ObjectFactory.createRagdoll(width * 0.3, height * 0.4);
  const rag2 = ObjectFactory.createRagdoll(width * 0.7, height * 0.4);
  const jelly = ObjectFactory.createJelly(width * 0.5, height * 0.35);

  const pad = ObjectFactory.createJumpPad(width * 0.5, height - 25, 200);

  // Domino line
  for (let i = 0; i < 6; i++) {
    const dom = ObjectFactory.createDomino(width * 0.15 + i * 35, height - 60);
    Matter.Composite.add(physicsWorld.world, dom);
  }

  Matter.Composite.add(physicsWorld.world, [rag1, rag2, jelly, pad]);
}

spawnInitialSandbox();

// Mouse Event Listeners for Spawning & Weapon firing
let mouseX = width / 2;
let mouseY = height / 2;

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

canvas.addEventListener('pointerdown', (e) => {
  soundEngine.ensureAudio();
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Check if clicking near a bomb in grab mode to detonate it
  if (uiManager.activeTool === 'grab') {
    const detonated = physicsWorld.specialEntities.triggerNearestBomb(
      physicsWorld.world,
      mouseX,
      mouseY,
      Matter.Composite.allBodies(physicsWorld.world),
      particles
    );
    if (detonated) return;
  }

  // Right-click or Repulsor tool always pushes
  if (e.button === 2 || uiManager.activeTool === 'repulsor') {
    physicsWorld.applyRepulsorPulse(mouseX, mouseY, particles);
    return;
  }

  // Left click spawn tools
  if (uiManager.currentMode === 'sandbox') {
    switch (uiManager.activeTool) {
      case 'ragdoll': {
        const rag = ObjectFactory.createRagdoll(mouseX, mouseY);
        Matter.Composite.add(physicsWorld.world, rag);
        particles.createPulse(mouseX, mouseY);
        soundEngine.playSpawn();
        break;
      }
      case 'bomb': {
        physicsWorld.specialEntities.addBomb(physicsWorld.world, mouseX, mouseY);
        break;
      }
      case 'blackhole': {
        physicsWorld.specialEntities.addBlackHole(mouseX, mouseY);
        particles.createPulse(mouseX, mouseY);
        break;
      }
      case 'portal': {
        const type = uiManager.getPortalNextType();
        physicsWorld.specialEntities.setPortal(type, mouseX, mouseY);
        particles.createPortalBurst(mouseX, mouseY, type === 'A' ? '#00d0ff' : '#ff7700');
        break;
      }
      case 'ball': {
        const ball = ObjectFactory.createBouncyBall(mouseX, mouseY);
        Matter.Composite.add(physicsWorld.world, ball);
        soundEngine.playSpawn();
        break;
      }
      case 'box': {
        const box = ObjectFactory.createBox(mouseX, mouseY);
        Matter.Composite.add(physicsWorld.world, box);
        soundEngine.playSpawn();
        break;
      }
      case 'domino': {
        const domino = ObjectFactory.createDomino(mouseX, mouseY);
        Matter.Composite.add(physicsWorld.world, domino);
        soundEngine.playSpawn();
        break;
      }
      case 'jelly': {
        const jelly = ObjectFactory.createJelly(mouseX, mouseY);
        Matter.Composite.add(physicsWorld.world, jelly);
        soundEngine.playSpawn();
        break;
      }
      case 'jumppad': {
        const pad = ObjectFactory.createJumpPad(mouseX, mouseY);
        Matter.Composite.add(physicsWorld.world, pad);
        soundEngine.playSpawn();
        break;
      }
    }
  }
});

// Disable default context menu for right click repulsor
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  physicsWorld.applyRepulsorPulse(mouseX, mouseY, particles);
});

// Main Animation Loop
let lastTime = performance.now();

function renderLoop(currentTime: number) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  // 1. Update Physics and Particles
  physicsWorld.update(16.66, particles);
  particles.update();

  // 2. Update Mission Status
  if (uiManager.currentMode === 'challenges') {
    missionManager.update(physicsWorld, dt, particles);
    uiManager.updateMissionHUD();
  }

  // 3. Clear Screen with motion blur background
  const shake = particles.getShakeOffset();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  ctx.fillStyle = 'rgba(11, 12, 22, 0.45)';
  ctx.fillRect(0, 0, width, height);

  // Draw Subtle Cyberpunk Grid
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.035)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 4. Render Mission Goal Zone
  if (uiManager.currentMode === 'challenges') {
    missionManager.renderGoalZone(ctx);
  }

  // 5. Render Constraints (Ragdoll limbs, springs)
  const constraints = Matter.Composite.allConstraints(physicsWorld.world);
  ctx.save();
  for (const c of constraints) {
    if (!c.render.visible && c.render.visible !== undefined) continue;
    const bodyA = c.bodyA;
    const bodyB = c.bodyB;
    if (!bodyA || !bodyB) continue;

    const pA = {
      x: bodyA.position.x + (c.pointA ? c.pointA.x : 0),
      y: bodyA.position.y + (c.pointA ? c.pointA.y : 0),
    };
    const pB = {
      x: bodyB.position.x + (c.pointB ? c.pointB.x : 0),
      y: bodyB.position.y + (c.pointB ? c.pointB.y : 0),
    };

    ctx.strokeStyle = c.render.strokeStyle || '#00f0ff';
    ctx.lineWidth = c.render.lineWidth || 2;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Render Matter Bodies
  const bodies = Matter.Composite.allBodies(physicsWorld.world);
  for (const body of bodies) {
    if (!body.render.visible && body.render.visible !== undefined) continue;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    const fill = (body.render as { fillStyle?: string }).fillStyle || '#00f0ff';
    const stroke = (body.render as { strokeStyle?: string }).strokeStyle || '#ffffff';
    const lineWidth = (body.render as { lineWidth?: number }).lineWidth || 1;

    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;

    // Head special comic face
    if (body.label === 'ragdoll_head') {
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, 0, (body.circleRadius || 16), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Goofy Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5, -3, 4, 0, Math.PI * 2);
      ctx.arc(5, -3, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-4, -3, 2, 0, Math.PI * 2);
      ctx.arc(6, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Open Mouth
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 4, 4, 0, Math.PI);
      ctx.stroke();

      ctx.restore();
      continue;
    }

    // Bomb special styling with fuse
    if (body.label === 'bomb') {
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, body.circleRadius || 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Skull or 'TNT'
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C4', 0, 0);

      ctx.restore();
      continue;
    }

    // Jump Pad glow
    if (body.label === 'jump_pad') {
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 16;
    }

    // Render Polygons & Circles
    if (body.circleRadius) {
      ctx.beginPath();
      ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      const vertices = body.vertices;
      ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
      for (let j = 1; j < vertices.length; j++) {
        ctx.lineTo(vertices[j].x - body.position.x, vertices[j].y - body.position.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // 7. Render Special Entities (Black Holes, Portals, Lasers, Saw blades)
  physicsWorld.specialEntities.render(ctx);

  // 8. Render Particles & Shockwaves
  particles.render(ctx);

  // 9. Render Mouse Reticle / Aim Assist
  ctx.save();
  if (uiManager.activeTool === 'repulsor') {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Slow motion vignette overlay
  if (physicsWorld.isSlowMotion) {
    ctx.save();
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.3,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, 'rgba(255, 170, 0, 0)');
    grad.addColorStop(1, 'rgba(255, 80, 0, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⏳ BULLET TIME ACTIVE (0.2x)', width - 28, height - 24);
    ctx.restore();
  }

  ctx.restore(); // restore screen shake

  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

// Offline/installable PWA support for the production (GitHub Pages) build only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
