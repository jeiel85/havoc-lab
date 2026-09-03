import Matter from 'matter-js';

const { Bodies, Body, Composite, Constraint } = Matter;

export class ObjectFactory {
  // Ragdoll Creation with Head, Torso, Arms, and Legs
  public static createRagdoll(x: number, y: number, scale: number = 0.85): Matter.Composite {
    const group = Body.nextGroup(true);
    const ragdoll = Composite.create({ label: 'ragdoll' });

    const headOptions = {
      collisionFilter: { group },
      friction: 0.8,
      restitution: 0.3,
      density: 0.002,
      render: { fillStyle: '#ff007f' },
      label: 'ragdoll_head',
    };

    const bodyOptions = {
      collisionFilter: { group },
      friction: 0.8,
      restitution: 0.3,
      density: 0.003,
      render: { fillStyle: '#00f0ff' },
      label: 'ragdoll_body',
    };

    const limbOptions = {
      collisionFilter: { group },
      friction: 0.8,
      restitution: 0.2,
      density: 0.002,
      render: { fillStyle: '#ffe600' },
      label: 'ragdoll_limb',
    };

    const s = scale;
    // Head & Torso
    const head = Bodies.circle(x, y - 60 * s, 16 * s, headOptions);
    const torso = Bodies.rectangle(x, y - 10 * s, 26 * s, 55 * s, { ...bodyOptions, chamfer: { radius: 6 * s } });

    // Arms
    const leftUpperArm = Bodies.rectangle(x - 25 * s, y - 25 * s, 12 * s, 32 * s, limbOptions);
    const leftLowerArm = Bodies.rectangle(x - 25 * s, y + 10 * s, 10 * s, 30 * s, limbOptions);
    const rightUpperArm = Bodies.rectangle(x + 25 * s, y - 25 * s, 12 * s, 32 * s, limbOptions);
    const rightLowerArm = Bodies.rectangle(x + 25 * s, y + 10 * s, 10 * s, 30 * s, limbOptions);

    // Legs
    const leftUpperLeg = Bodies.rectangle(x - 12 * s, y + 35 * s, 14 * s, 36 * s, limbOptions);
    const leftLowerLeg = Bodies.rectangle(x - 12 * s, y + 75 * s, 12 * s, 34 * s, limbOptions);
    const rightUpperLeg = Bodies.rectangle(x + 12 * s, y + 35 * s, 14 * s, 36 * s, limbOptions);
    const rightLowerLeg = Bodies.rectangle(x + 12 * s, y + 75 * s, 12 * s, 34 * s, limbOptions);

    // Constraints (Joints)
    const neck = Constraint.create({
      bodyA: head,
      bodyB: torso,
      pointA: { x: 0, y: 15 * s },
      pointB: { x: 0, y: -28 * s },
      stiffness: 0.85,
      render: { strokeStyle: '#ff007f', lineWidth: 3 },
    });

    // Left Arm Joints
    const leftShoulder = Constraint.create({
      bodyA: torso,
      bodyB: leftUpperArm,
      pointA: { x: -14 * s, y: -22 * s },
      pointB: { x: 0, y: -14 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#00f0ff', lineWidth: 2 },
    });
    const leftElbow = Constraint.create({
      bodyA: leftUpperArm,
      bodyB: leftLowerArm,
      pointA: { x: 0, y: 14 * s },
      pointB: { x: 0, y: -14 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#ffe600', lineWidth: 2 },
    });

    // Right Arm Joints
    const rightShoulder = Constraint.create({
      bodyA: torso,
      bodyB: rightUpperArm,
      pointA: { x: 14 * s, y: -22 * s },
      pointB: { x: 0, y: -14 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#00f0ff', lineWidth: 2 },
    });
    const rightElbow = Constraint.create({
      bodyA: rightUpperArm,
      bodyB: rightLowerArm,
      pointA: { x: 0, y: 14 * s },
      pointB: { x: 0, y: -14 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#ffe600', lineWidth: 2 },
    });

    // Left Leg Joints
    const leftHip = Constraint.create({
      bodyA: torso,
      bodyB: leftUpperLeg,
      pointA: { x: -10 * s, y: 25 * s },
      pointB: { x: 0, y: -16 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#00f0ff', lineWidth: 2 },
    });
    const leftKnee = Constraint.create({
      bodyA: leftUpperLeg,
      bodyB: leftLowerLeg,
      pointA: { x: 0, y: 16 * s },
      pointB: { x: 0, y: -16 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#ffe600', lineWidth: 2 },
    });

    // Right Leg Joints
    const rightHip = Constraint.create({
      bodyA: torso,
      bodyB: rightUpperLeg,
      pointA: { x: 10 * s, y: 25 * s },
      pointB: { x: 0, y: -16 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#00f0ff', lineWidth: 2 },
    });
    const rightKnee = Constraint.create({
      bodyA: rightUpperLeg,
      bodyB: rightLowerLeg,
      pointA: { x: 0, y: 16 * s },
      pointB: { x: 0, y: -16 * s },
      stiffness: 0.8,
      render: { strokeStyle: '#ffe600', lineWidth: 2 },
    });

    Composite.add(ragdoll, [
      head, torso,
      leftUpperArm, leftLowerArm,
      rightUpperArm, rightLowerArm,
      leftUpperLeg, leftLowerLeg,
      rightUpperLeg, rightLowerLeg,
      neck,
      leftShoulder, leftElbow,
      rightShoulder, rightElbow,
      leftHip, leftKnee,
      rightHip, rightKnee,
    ]);

    return ragdoll;
  }

  // Softbody Jelly Blob
  public static createJelly(x: number, y: number, radius: number = 36): Matter.Composite {
    const jelly = Composite.create({ label: 'jelly' });
    const particleCount = 8;
    const particles: Matter.Body[] = [];
    const pRadius = 8;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      const body = Bodies.circle(px, py, pRadius, {
        friction: 0.2,
        restitution: 0.8,
        density: 0.001,
        render: { fillStyle: '#00ffaa' },
        label: 'jelly_node',
      });
      particles.push(body);
    }

    const center = Bodies.circle(x, y, pRadius * 1.5, {
      friction: 0.2,
      restitution: 0.8,
      density: 0.002,
      render: { fillStyle: '#00ffff' },
      label: 'jelly_core',
    });
    particles.push(center);

    // Link perimeter
    for (let i = 0; i < particleCount; i++) {
      const next = (i + 1) % particleCount;
      const spring = Constraint.create({
        bodyA: particles[i],
        bodyB: particles[next],
        stiffness: 0.5,
        damping: 0.05,
        render: { strokeStyle: '#00ffaa', lineWidth: 2 },
      });
      Composite.add(jelly, spring);

      // Link to center
      const coreSpring = Constraint.create({
        bodyA: particles[i],
        bodyB: center,
        stiffness: 0.35,
        damping: 0.05,
        render: { strokeStyle: '#00ffff', lineWidth: 1.5 },
      });
      Composite.add(jelly, coreSpring);
    }

    Composite.add(jelly, particles);
    return jelly;
  }

  // Neon Dynamic Box
  public static createBox(x: number, y: number, size: number = 42): Matter.Body {
    const colors = ['#ff3366', '#33ccff', '#ffcc00', '#9933ff', '#33ff99'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return Bodies.rectangle(x, y, size, size, {
      restitution: 0.4,
      friction: 0.5,
      density: 0.003,
      render: {
        fillStyle: color,
        strokeStyle: '#ffffff',
        lineWidth: 1.5,
      },
      label: 'box',
    });
  }

  // Bouncy Ball
  public static createBouncyBall(x: number, y: number, radius: number = 22): Matter.Body {
    return Bodies.circle(x, y, radius, {
      restitution: 0.96,
      friction: 0.05,
      density: 0.002,
      render: {
        fillStyle: '#00ffcc',
        strokeStyle: '#ffffff',
        lineWidth: 2,
      },
      label: 'bouncy_ball',
    });
  }

  // Heavy Wrecking Ball
  public static createSteelBall(x: number, y: number, radius: number = 34): Matter.Body {
    return Bodies.circle(x, y, radius, {
      restitution: 0.2,
      friction: 0.4,
      density: 0.05, // Heavy
      render: {
        fillStyle: '#e0e0e0',
        strokeStyle: '#ff0055',
        lineWidth: 3,
      },
      label: 'steel_ball',
    });
  }

  // Domino
  public static createDomino(x: number, y: number): Matter.Body {
    return Bodies.rectangle(x, y, 12, 60, {
      restitution: 0.2,
      friction: 0.6,
      density: 0.0025,
      render: {
        fillStyle: '#ff9900',
        strokeStyle: '#ffffff',
        lineWidth: 1,
      },
      label: 'domino',
    });
  }

  // Spring Trampoline / Jump Pad
  public static createJumpPad(x: number, y: number, width: number = 100): Matter.Body {
    return Bodies.rectangle(x, y, width, 18, {
      isStatic: true,
      restitution: 1.8, // Super bouncy
      friction: 0.1,
      render: {
        fillStyle: '#ffff00',
        strokeStyle: '#ff00aa',
        lineWidth: 3,
      },
      label: 'jump_pad',
    });
  }

  // Target Block for Missions
  public static createTarget(x: number, y: number, size: number = 40): Matter.Body {
    return Bodies.rectangle(x, y, size, size, {
      restitution: 0.3,
      friction: 0.5,
      density: 0.003,
      render: {
        fillStyle: '#ff0033',
        strokeStyle: '#ffffff',
        lineWidth: 3,
      },
      label: 'target_box',
    });
  }
}
