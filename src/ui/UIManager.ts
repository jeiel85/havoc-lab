import { soundEngine } from '../audio/SoundEngine';
import { MissionManager } from '../game/MissionManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { icons } from './icons';

export type ToolType =
  | 'grab'
  | 'repulsor'
  | 'ragdoll'
  | 'bomb'
  | 'blackhole'
  | 'portal'
  | 'ball'
  | 'box'
  | 'domino'
  | 'jelly'
  | 'jumppad';

export class UIManager {
  public activeTool: ToolType = 'grab';
  public currentMode: 'sandbox' | 'challenges' = 'sandbox';
  private portalNextType: 'A' | 'B' = 'A';
  private physicsWorld: PhysicsWorld;
  private missionManager: MissionManager;

  constructor(
    physicsWorld: PhysicsWorld,
    missionManager: MissionManager
  ) {
    this.physicsWorld = physicsWorld;
    this.missionManager = missionManager;
    this.initIcons();
    this.bindEvents();
  }

  private initIcons() {
    // Inject icons to left toolbox
    document.querySelectorAll('.tool-item').forEach((item) => {
      const tool = item.getAttribute('data-tool') as ToolType;
      const iconSpan = item.querySelector('.tool-icon');
      if (iconSpan && icons[tool as keyof typeof icons]) {
        iconSpan.innerHTML = icons[tool as keyof typeof icons];
      }
    });

    // Action buttons
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) btnSound.innerHTML = icons.volume;

    const btnBgm = document.getElementById('btn-bgm');
    if (btnBgm) btnBgm.innerHTML = icons.music;

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) btnClear.innerHTML = icons.trash;
  }

  private bindEvents() {
    // Mode Switch
    const btnSandbox = document.getElementById('mode-sandbox');
    const btnChallenges = document.getElementById('mode-challenges');
    const leftToolbox = document.getElementById('left-toolbox');
    const missionPanel = document.getElementById('mission-panel');
    const gravityBar = document.getElementById('bottom-gravity-bar');

    btnSandbox?.addEventListener('click', () => {
      this.currentMode = 'sandbox';
      btnSandbox.classList.add('active');
      btnChallenges?.classList.remove('active');
      if (leftToolbox) leftToolbox.style.display = 'flex';
      if (missionPanel) missionPanel.style.display = 'none';
      if (gravityBar) gravityBar.style.display = 'flex';
      this.missionManager.startMission(-1, this.physicsWorld);
      this.physicsWorld.clearAll();
      soundEngine.playSpawn();
    });

    btnChallenges?.addEventListener('click', () => {
      this.currentMode = 'challenges';
      btnChallenges.classList.add('active');
      btnSandbox?.classList.remove('active');
      if (leftToolbox) leftToolbox.style.display = 'none';
      if (missionPanel) missionPanel.style.display = 'flex';
      if (gravityBar) gravityBar.style.display = 'none';
      this.startChallengeLevel(0);
    });

    // Tool item selection
    document.querySelectorAll('.tool-item').forEach((item) => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.tool-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        this.activeTool = item.getAttribute('data-tool') as ToolType;
        soundEngine.playSpawn();
      });
    });

    // Gravity buttons
    document.querySelectorAll('.gravity-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gravity-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const grav = btn.getAttribute('data-gravity') as
          | 'normal'
          | 'zero'
          | 'reverse'
          | 'moon'
          | 'heavy'
          | 'left'
          | 'right';
        this.physicsWorld.setGravity(grav);
        soundEngine.playBounce();
      });
    });

    // Bullet Time Slow Motion
    const btnSlowmo = document.getElementById('btn-slowmo');
    const toggleSlow = () => {
      const isSlow = this.physicsWorld.toggleSlowMotion();
      btnSlowmo?.classList.toggle('active', isSlow);
    };
    btnSlowmo?.addEventListener('click', toggleSlow);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleSlow();
      }
    });

    // Sound Mute Toggle
    const btnSound = document.getElementById('btn-sound');
    btnSound?.addEventListener('click', () => {
      const isMuted = soundEngine.toggleMute();
      if (btnSound) {
        btnSound.innerHTML = isMuted ? icons.mute : icons.volume;
      }
    });

    // BGM Toggle
    const btnBgm = document.getElementById('btn-bgm');
    btnBgm?.addEventListener('click', () => {
      const isPlaying = soundEngine.toggleBgm();
      btnBgm?.classList.toggle('active', isPlaying);
    });

    // Clear Screen
    const btnClear = document.getElementById('btn-clear');
    btnClear?.addEventListener('click', () => {
      this.physicsWorld.clearAll();
      soundEngine.playPulse();
    });

    // Mission Reset & Next
    document.getElementById('btn-mission-reset')?.addEventListener('click', () => {
      this.startChallengeLevel(this.missionManager.currentMissionIndex);
    });

    document.getElementById('btn-mission-next')?.addEventListener('click', () => {
      this.nextChallengeLevel();
    });

    document.getElementById('btn-modal-next')?.addEventListener('click', () => {
      const modal = document.getElementById('victory-modal');
      modal?.classList.remove('show');
      this.nextChallengeLevel();
    });
  }

  public startChallengeLevel(index: number) {
    this.missionManager.startMission(index, this.physicsWorld);
    const modal = document.getElementById('victory-modal');
    modal?.classList.remove('show');
    this.updateMissionHUD();
  }

  public nextChallengeLevel() {
    let nextIdx = this.missionManager.currentMissionIndex + 1;
    if (nextIdx >= this.missionManager.missions.length) {
      nextIdx = 0; // Loop back or finish
    }
    this.startChallengeLevel(nextIdx);
  }

  public updateMissionHUD() {
    const mission = this.missionManager.getCurrentMission();
    if (!mission) return;

    const badge = document.getElementById('mission-badge');
    const title = document.getElementById('mission-title');
    const desc = document.getElementById('mission-desc');
    const hint = document.getElementById('mission-hint');
    const progress = document.getElementById('mission-progress');

    if (badge) badge.innerText = `LEVEL ${mission.id} / ${this.missionManager.missions.length}`;
    if (title) title.innerText = mission.title;
    if (desc) desc.innerText = mission.description;
    if (hint) hint.innerText = `💡 힌트: ${mission.instructions}`;
    if (progress) progress.innerText = mission.progressText();

    if (this.missionManager.isMissionCompleted) {
      const modal = document.getElementById('victory-modal');
      modal?.classList.add('show');
    }
  }

  public getPortalNextType(): 'A' | 'B' {
    const type = this.portalNextType;
    this.portalNextType = this.portalNextType === 'A' ? 'B' : 'A';
    return type;
  }
}
