export function createPlayer(x, y) {
  return {
    x,
    y,
    radius: 18,
    maxHp: 100,
    hp: 100,
    invincibleTimer: 0, // 피격 후 무적 시간(초)

    speed: 240,
    dashSpeed: 720,
    dashDuration: 0.15,
    dashCooldown: 1.0,
    dashTimer: 0,
    cooldownTimer: 0,
    dashDirX: 1,
    dashDirY: 0,
    facingX: 1,
    facingY: 0,
    color: '#38bdf8',

    attackRange: 78,
    attackArc: Math.PI * 0.75,
    attackDuration: 0.16,
    attackCooldown: 0.32,
    attackTimer: 0,
    attackCooldownTimer: 0,
    attackAngle: 0,
    swingDirection: -1,
    attackDamage: 20,
    hasHitInCurrentSwing: false
  };
}

export function damagePlayer(player, amount) {
  // 대시 중이거나 피격 무적 시간 중에는 피해를 입지 않음
  if (player.dashTimer > 0 || player.invincibleTimer > 0 || player.hp <= 0) {
    return false;
  }
  player.hp = Math.max(0, player.hp - amount);
  player.invincibleTimer = 0.8;
  return true;
}

export function updatePlayer(player, keys, mouse, canvasWidth, canvasHeight, dt = 1 / 60) {
  if (player.invincibleTimer > 0) {
    player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
  }
  if (player.cooldownTimer > 0) {
    player.cooldownTimer = Math.max(0, player.cooldownTimer - dt);
  }
  if (player.attackCooldownTimer > 0) {
    player.attackCooldownTimer = Math.max(0, player.attackCooldownTimer - dt);
  }
  if (player.attackTimer > 0) {
    player.attackTimer = Math.max(0, player.attackTimer - dt);
  }

  let dx = 0;
  let dy = 0;

  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  if (dx !== 0 || dy !== 0) {
    player.facingX = dx;
    player.facingY = dy;
  }

  if (keys['Space'] && player.cooldownTimer <= 0 && player.dashTimer <= 0) {
    player.dashTimer = player.dashDuration;
    player.cooldownTimer = player.dashCooldown;

    if (dx !== 0 || dy !== 0) {
      player.dashDirX = dx;
      player.dashDirY = dy;
    } else {
      player.dashDirX = player.facingX;
      player.dashDirY = player.facingY;
    }
  }

  const wantAttackMouse = mouse && mouse.isDown;
  const wantAttackKey = keys['KeyJ'];

  if ((wantAttackMouse || wantAttackKey) && player.attackCooldownTimer <= 0 && player.attackTimer <= 0) {
    player.attackTimer = player.attackDuration;
    player.attackCooldownTimer = player.attackCooldown;
    player.hasHitInCurrentSwing = false;
    player.swingDirection *= -1;

    if (wantAttackMouse) {
      player.attackAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      player.facingX = Math.cos(player.attackAngle);
      player.facingY = Math.sin(player.attackAngle);
    } else {
      player.attackAngle = Math.atan2(player.facingY, player.facingX);
    }
  }

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.x += player.dashDirX * player.dashSpeed * dt;
    player.y += player.dashDirY * player.dashSpeed * dt;
  } else {
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
  }

  player.x = Math.max(player.radius, Math.min(canvasWidth - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvasHeight - player.radius, player.y));
}

export function drawPlayer(ctx, player) {
  if (player.attackTimer > 0) {
    const t = 1 - player.attackTimer / player.attackDuration;
    const headProgress = 1 - Math.pow(1 - t, 3);
    const tailProgress = Math.pow(t, 1.8);

    const halfArc = player.attackArc / 2;
    const startAngle = player.attackAngle - halfArc * player.swingDirection;
    const endAngle = player.attackAngle + halfArc * player.swingDirection;

    const headAngle = startAngle + (endAngle - startAngle) * headProgress;
    const tailAngle = startAngle + (endAngle - startAngle) * tailProgress;

    const anticlockwise = player.swingDirection < 0;
    const fade = 1 - t * 0.5;
    const outerR = player.attackRange;
    const innerR = player.radius + 10;

    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, outerR, tailAngle, headAngle, anticlockwise);
    ctx.arc(player.x, player.y, innerR, headAngle, tailAngle, !anticlockwise);
    ctx.closePath();
    ctx.fillStyle = `rgba(186, 230, 253, ${0.4 * fade})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, player.y, outerR, tailAngle, headAngle, anticlockwise);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * fade})`;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  // 피격 무적 시간 동안 깜빡임 효과
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 16) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = player.dashTimer > 0 ? '#bae6fd' : player.color;
  ctx.fill();

  const facingAngle = Math.atan2(player.facingY, player.facingX);
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(facingAngle) * (player.radius - 5),
    player.y + Math.sin(facingAngle) * (player.radius - 5),
    3.5,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.restore();
}

export function checkMeleeHit(player, target) {
  if (player.attackTimer <= 0) return false;

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy);

  if (dist > player.attackRange + target.radius) return false;
  if (dist <= target.radius) return true;

  const angleToTarget = Math.atan2(dy, dx);
  let angleDiff = angleToTarget - player.attackAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  return Math.abs(angleDiff) <= player.attackArc / 2;
}