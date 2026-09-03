// High-performance Canvas Particle System & Screen Shake
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  shape: 'circle' | 'spark' | 'ring' | 'text';
  text?: string;
  glow?: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  public shakeDuration: number = 0;
  public shakeIntensity: number = 0;

  constructor() {}

  public addScreenShake(intensity: number = 10, duration: number = 15) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  public getShakeOffset(): { x: number; y: number } {
    if (this.shakeDuration <= 0) return { x: 0, y: 0 };
    this.shakeDuration--;
    const decay = this.shakeDuration / 20;
    const factor = this.shakeIntensity * Math.min(decay, 1.0);
    return {
      x: (Math.random() * 2 - 1) * factor,
      y: (Math.random() * 2 - 1) * factor,
    };
  }

  // Explosion burst
  public createExplosion(x: number, y: number, primaryColor: string = '#ff0055') {
    this.addScreenShake(18, 22);

    // Shockwave Ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      size: 10,
      alpha: 1,
      maxLife: 28,
      life: 28,
      shape: 'ring',
      glow: true,
    });

    // Debris & sparks
    const count = 45;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 2;
      const palette = [primaryColor, '#ffaa00', '#ffff00', '#00f0ff', '#ffffff'];
      const pColor = palette[Math.floor(Math.random() * palette.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: pColor,
        size: Math.random() * 5 + 2,
        alpha: 1,
        maxLife: Math.random() * 25 + 20,
        life: Math.random() * 25 + 20,
        shape: 'spark',
        glow: true,
      });
    }

    // Floating text
    this.createTextPopup(x, y - 20, '💥 BOOM!', primaryColor);
  }

  // Pulse wave
  public createPulse(x: number, y: number) {
    this.addScreenShake(8, 12);
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: '#00ffff',
      size: 5,
      alpha: 0.9,
      maxLife: 20,
      life: 20,
      shape: 'ring',
      glow: true,
    });

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#00ffff',
        size: 3,
        alpha: 0.8,
        maxLife: 15,
        life: 15,
        shape: 'spark',
        glow: true,
      });
    }
  }

  // Portal warp swirl
  public createPortalBurst(x: number, y: number, color: string) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        alpha: 1,
        maxLife: 20,
        life: 20,
        shape: 'circle',
        glow: true,
      });
    }
  }

  // Sparks on collision
  public createCollisionSparks(x: number, y: number, intensity: number) {
    const count = Math.min(Math.floor(intensity * 10), 15);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * intensity * 5 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#ffdd44',
        size: 2,
        alpha: 0.9,
        maxLife: 12,
        life: 12,
        shape: 'spark',
      });
    }
  }

  // Floating score or feedback text
  public createTextPopup(x: number, y: number, text: string, color: string = '#00ffcc') {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -2.5,
      color,
      size: 16,
      alpha: 1,
      maxLife: 40,
      life: 40,
      shape: 'text',
      text,
      glow: true,
    });
  }

  public update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.shape === 'ring') {
        p.size += 5; // Expand ring
      } else if (p.shape === 'spark') {
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.vy += 0.15; // light gravity on debris
      } else if (p.shape === 'text') {
        p.vy *= 0.96;
      }

      p.alpha = p.life / p.maxLife;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      if (p.shape === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'text' && p.text) {
        ctx.fillStyle = p.color;
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.restore();
  }

  public clear() {
    this.particles = [];
  }
}
