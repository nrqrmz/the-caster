// Virtual joystick. Construct with a scene; read `.vector` each update.
// vector is {x, y} in [-1..1]. Renders on its own scene's display list.
const MAX_RADIUS = 60;

export class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.vector = { x: 0, y: 0 };
    this.pointerId = null;

    this.base = scene.add.circle(0, 0, MAX_RADIUS, 0xffffff, 0.12).setVisible(false).setDepth(1000);
    this.thumb = scene.add.circle(0, 0, 26, 0xffffff, 0.30).setVisible(false).setDepth(1001);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
  }

  // Only the left half of the screen drives movement (right half is for skill buttons).
  isMovementZone(pointer) {
    return pointer.x < this.scene.scale.width * 0.55;
  }

  onDown(pointer) {
    if (this.pointerId !== null) return;
    if (!this.isMovementZone(pointer)) return;
    this.pointerId = pointer.id;
    this.origin = { x: pointer.x, y: pointer.y };
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.min(MAX_RADIUS, Math.hypot(dx, dy)) || 0;
    const angle = Math.atan2(dy, dx);
    this.thumb.setPosition(this.origin.x + Math.cos(angle) * dist, this.origin.y + Math.sin(angle) * dist);
    this.vector = { x: (dist / MAX_RADIUS) * Math.cos(angle), y: (dist / MAX_RADIUS) * Math.sin(angle) };
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }
}
