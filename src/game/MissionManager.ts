import confetti from 'canvas-confetti';
import Matter from 'matter-js';
import { soundEngine } from '../audio/SoundEngine';
import { ParticleSystem } from '../particles/ParticleSystem';
import { ObjectFactory } from '../physics/ObjectFactory';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export interface Mission {
  id: number;
  title: string;
  description: string;
  instructions: string;
  setup: (world: PhysicsWorld) => void;
  checkCompletion: (world: PhysicsWorld, dt: number) => boolean;
  progressText: () => string;
}

export class MissionManager {
  public currentMissionIndex: number = -1; // -1 means Sandbox Mode
  public missions: Mission[] = [];
  public isMissionCompleted: boolean = false;
  private missionTimer: number = 0;
  private targetBodies: Matter.Body[] = [];
  private goalZone: { x: number; y: number; w: number; h: number } | null = null;
  private trackedRagdollHead: Matter.Body | null = null;

  constructor() {
    this.initMissions();
  }

  private initMissions() {
    // Mission 1: Portal Insertion
    this.missions.push({
      id: 1,
      title: 'Level 1: Quantum Wormhole (웜홀 다이브)',
      description: '래그돌을 포탈 A로 진입시켜 우측 하단 골 존에 안착시키세요!',
      instructions: '마우스로 래그돌을 잡아서 포탈 A(하늘색) 속으로 힘껏 던지세요.',
      setup: (pw: PhysicsWorld) => {
        pw.clearAll();
        pw.setGravity('normal');
        this.goalZone = { x: pw.width - 220, y: pw.height - 140, w: 180, h: 90 };

        // Obstacle barrier
        const barrier = Matter.Bodies.rectangle(pw.width * 0.48, pw.height * 0.5, 30, pw.height * 0.7, {
          isStatic: true,
          render: { fillStyle: '#3a3a60' },
        });
        Matter.Composite.add(pw.world, barrier);

        // Portals
        pw.specialEntities.setPortal('A', 200, 240);
        pw.specialEntities.setPortal('B', pw.width - 200, 180);

        // Ragdoll
        const ragdoll = ObjectFactory.createRagdoll(120, 280);
        Matter.Composite.add(pw.world, ragdoll);

        // Find head
        const head = Matter.Composite.allBodies(ragdoll).find(b => b.label === 'ragdoll_head');
        this.trackedRagdollHead = head || null;
      },
      checkCompletion: () => {
        if (!this.trackedRagdollHead || !this.goalZone) return false;
        const h = this.trackedRagdollHead.position;
        const gz = this.goalZone;
        return (
          h.x > gz.x - gz.w / 2 &&
          h.x < gz.x + gz.w / 2 &&
          h.y > gz.y - gz.h / 2 &&
          h.y < gz.y + gz.h / 2 &&
          Math.hypot(this.trackedRagdollHead.velocity.x, this.trackedRagdollHead.velocity.y) < 2
        );
      },
      progressText: () => '목표: 래그돌을 포탈 A에 던져 우측 하단 골 존에 정지시키기',
    });

    // Mission 2: Domino & Target Demolition
    this.missions.push({
      id: 2,
      title: 'Level 2: Chain Explosion (연쇄 폭파)',
      description: '도미노를 넘어뜨리고 폭탄을 기폭해 붉은 타겟 3개를 모두 파괴하세요!',
      instructions: '무거운 볼을 굴리거나 마우스로 도미노를 밀어 C4 폭탄을 타겟 쪽으로 굴리세요.',
      setup: (pw: PhysicsWorld) => {
        pw.clearAll();
        pw.setGravity('normal');
        this.targetBodies = [];

        // Platforms
        const plat1 = Matter.Bodies.rectangle(260, 420, 360, 20, { isStatic: true, render: { fillStyle: '#2d2d50' } });
        const plat2 = Matter.Bodies.rectangle(pw.width - 250, 480, 320, 20, { isStatic: true, render: { fillStyle: '#2d2d50' } });
        Matter.Composite.add(pw.world, [plat1, plat2]);

        // Dominoes on plat1
        for (let i = 0; i < 7; i++) {
          const dom = ObjectFactory.createDomino(140 + i * 40, 370);
          Matter.Composite.add(pw.world, dom);
        }

        // Bomb right at edge of plat1
        pw.specialEntities.addBomb(pw.world, 390, 370);

        // Heavy ball starter
        const starterBall = ObjectFactory.createSteelBall(110, 300, 26);
        Matter.Composite.add(pw.world, starterBall);

        // Targets on plat2
        for (let i = 0; i < 3; i++) {
          const target = ObjectFactory.createTarget(pw.width - 320 + i * 70, 440, 38);
          Matter.Composite.add(pw.world, target);
          this.targetBodies.push(target);
        }
      },
      checkCompletion: (pw: PhysicsWorld) => {
        // Completed when all targets fall off the platform (y > height - 60 or offscreen)
        if (this.targetBodies.length === 0) return true;
        const fallenCount = this.targetBodies.filter(t => t.position.y > pw.height - 80 || t.position.x > pw.width).length;
        return fallenCount === this.targetBodies.length;
      },
      progressText: () => {
        const fallen = this.targetBodies.filter(t => t.position.y > 600 || t.position.x > 1000).length;
        return `타겟 격추: ${fallen} / ${this.targetBodies.length}`;
      },
    });

    // Mission 3: 10s Air Juggle Challenge
    this.missions.push({
      id: 3,
      title: 'Level 3: Keepy-Uppy Havoc (10초 공중부양)',
      description: '래그돌이 바닥에 닿지 않도록 마우스 충격파 펄스로 10초간 띄우세요!',
      instructions: '래그돌 아래쪽을 마우스로 연타 클릭하여 충격파로 밀어 올리세요!',
      setup: (pw: PhysicsWorld) => {
        pw.clearAll();
        pw.setGravity('normal');
        this.missionTimer = 10.0;

        // Ragdoll
        const ragdoll = ObjectFactory.createRagdoll(pw.width / 2, 200);
        Matter.Composite.add(pw.world, ragdoll);

        // Jump pads at corners for fun
        const pad1 = ObjectFactory.createJumpPad(150, pw.height - 30, 180);
        const pad2 = ObjectFactory.createJumpPad(pw.width - 150, pw.height - 30, 180);
        Matter.Composite.add(pw.world, [pad1, pad2]);

        const bodies = Matter.Composite.allBodies(ragdoll);
        this.trackedRagdollHead = bodies[0] || null;
      },
      checkCompletion: (pw: PhysicsWorld, dt: number) => {
        // If ragdoll touches floor, reset timer
        const bodies = Matter.Composite.allBodies(pw.world).filter(b => b.label?.startsWith('ragdoll'));
        let touchedFloor = false;
        for (const b of bodies) {
          if (b.position.y >= pw.height - 50) {
            touchedFloor = true;
            break;
          }
        }

        if (touchedFloor) {
          this.missionTimer = 10.0; // Reset
        } else {
          this.missionTimer = Math.max(0, this.missionTimer - dt);
        }

        return this.missionTimer <= 0;
      },
      progressText: () => `공중 버티기: ${this.missionTimer.toFixed(1)}초 남음! (바닥 터치 시 리셋)`,
    });

    // Mission 4: Singularity Basketball
    this.missions.push({
      id: 4,
      title: 'Level 4: Black Hole Slingshot (블랙홀 슬링샷)',
      description: '블랙홀의 중력 렌즈를 이용해 고무공을 우측 상단 바스켓에 골인시키세요!',
      instructions: '화면 중앙에 설치된 블랙홀의 인력을 활용해 공을 던져 바스켓에 넣으세요.',
      setup: (pw: PhysicsWorld) => {
        pw.clearAll();
        pw.setGravity('normal');
        this.goalZone = { x: pw.width - 160, y: 220, w: 100, h: 70 };

        // Hoop basket static bars
        const rimLeft = Matter.Bodies.rectangle(pw.width - 215, 230, 10, 60, { isStatic: true, render: { fillStyle: '#ffaa00' } });
        const rimRight = Matter.Bodies.rectangle(pw.width - 105, 230, 10, 60, { isStatic: true, render: { fillStyle: '#ffaa00' } });
        const rimBottom = Matter.Bodies.rectangle(pw.width - 160, 260, 110, 10, { isStatic: true, render: { fillStyle: '#ffaa00' } });
        Matter.Composite.add(pw.world, [rimLeft, rimRight, rimBottom]);

        // Central Black Hole
        pw.specialEntities.addBlackHole(pw.width * 0.48, pw.height * 0.52);

        // Bouncy Ball at bottom-left
        const ball = ObjectFactory.createBouncyBall(160, pw.height - 150, 24);
        Matter.Composite.add(pw.world, ball);
        this.targetBodies = [ball];
      },
      checkCompletion: () => {
        if (this.targetBodies.length === 0 || !this.goalZone) return false;
        const ball = this.targetBodies[0];
        const gz = this.goalZone;
        return (
          ball.position.x > gz.x - gz.w / 2 &&
          ball.position.x < gz.x + gz.w / 2 &&
          ball.position.y > gz.y - gz.h / 2 &&
          ball.position.y < gz.y + gz.h / 2 &&
          Math.hypot(ball.velocity.x, ball.velocity.y) < 3.5
        );
      },
      progressText: () => '목표: 블랙홀의 중력을 이용해 우측 상단 바스켓 안에 공 넣기',
    });

    // Mission 5: Laser Gauntlet
    this.missions.push({
      id: 5,
      title: 'Level 5: Laser Gauntlet (레이저 요새 돌파)',
      description: '회전하는 2중 레이저를 피해 래그돌을 오른쪽 탈출구까지 이동시키세요!',
      instructions: '스페이스바로 슬로우 모션을 걸고 타이밍을 맞춰 안전하게 통과하세요.',
      setup: (pw: PhysicsWorld) => {
        pw.clearAll();
        pw.setGravity('moon'); // low gravity for floating feel
        this.goalZone = { x: pw.width - 130, y: pw.height / 2, w: 120, h: 200 };

        // Rotating Lasers
        pw.specialEntities.addLaser(pw.width * 0.35, pw.height * 0.5, 220, 0.02);
        pw.specialEntities.addLaser(pw.width * 0.65, pw.height * 0.5, 220, -0.025);

        // Ragdoll on left
        const ragdoll = ObjectFactory.createRagdoll(140, pw.height / 2);
        Matter.Composite.add(pw.world, ragdoll);

        const head = Matter.Composite.allBodies(ragdoll).find(b => b.label === 'ragdoll_head');
        this.trackedRagdollHead = head || null;
      },
      checkCompletion: () => {
        if (!this.trackedRagdollHead || !this.goalZone) return false;
        const pos = this.trackedRagdollHead.position;
        const gz = this.goalZone;
        return (
          pos.x > gz.x - gz.w / 2 &&
          pos.x < gz.x + gz.w / 2 &&
          pos.y > gz.y - gz.h / 2 &&
          pos.y < gz.y + gz.h / 2
        );
      },
      progressText: () => '목표: 회전 레이저를 피해 우측 탈출 존에 도달하기',
    });
  }

  public startMission(index: number, world: PhysicsWorld) {
    this.currentMissionIndex = index;
    this.isMissionCompleted = false;
    this.goalZone = null;
    this.targetBodies = [];
    this.trackedRagdollHead = null;

    if (index >= 0 && index < this.missions.length) {
      this.missions[index].setup(world);
    }
  }

  public update(world: PhysicsWorld, dt: number, particles: ParticleSystem): boolean {
    if (this.currentMissionIndex < 0 || this.isMissionCompleted) return false;
    const mission = this.missions[this.currentMissionIndex];

    if (mission.checkCompletion(world, dt)) {
      this.isMissionCompleted = true;
      soundEngine.playVictory();
      particles.createTextPopup(world.width / 2, world.height / 2, '🎉 STAGE CLEAR!', '#00ffcc');

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      return true;
    }

    return false;
  }

  public renderGoalZone(ctx: CanvasRenderingContext2D) {
    if (!this.goalZone) return;
    ctx.save();
    const gz = this.goalZone;

    ctx.strokeStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(gz.x - gz.w / 2, gz.y - gz.h / 2, gz.w, gz.h);

    ctx.fillStyle = 'rgba(0, 255, 204, 0.12)';
    ctx.fillRect(gz.x - gz.w / 2, gz.y - gz.h / 2, gz.w, gz.h);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TARGET ZONE', gz.x, gz.y);
    ctx.restore();
  }

  public getCurrentMission(): Mission | null {
    if (this.currentMissionIndex >= 0 && this.currentMissionIndex < this.missions.length) {
      return this.missions[this.currentMissionIndex];
    }
    return null;
  }
}
