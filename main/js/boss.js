export function createBoss(x, y) {
  return {
    x,
    y,
    radius: 38,
    maxHp: 650,
    hp: 650,
    speed: 175,
    dashSpeed: 720,
    contactDamage: 25,
    projectileDamage: 22,
    hazardDamage: 30,

    // AI 상태: 'chase' | 'windup_dash' | 'dash' | 'windup_burst' | 'windup_spiral' | 'spiral' | 'windup_slam' | 'recover'
    state: 'chase',
    stateTimer: 1.0,
    patterns: ['dash', 'burst', 'slam', 'spiral'],
    patternIndex: 0,

    dashRemaining: 0,
    dashDirX: 0,
    dashDirY: 1,
    burstCount: 0,
    spiralTimer: 0,
    spiralAngle: 0,

    hitFlashTimer: 0,
    projectiles: [],
    hazards: [] // 폭발 장판 및 충격파
  };
}

function isPhase2(boss) {
  return boss.hp <= boss.maxHp * 0.5;
}

function spawnRadialProjectiles(boss, count, speed, angleOffset = 0, radius = 7) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + angleOffset;
    boss.projectiles.push({
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage: boss.projectileDamage
    });
  }
}

export function updateBoss(boss, player, worldWidth, worldHeight, dt) {
  if (boss.hitFlashTimer > 0) {
    boss.hitFlashTimer = Math.max(0, boss.hitFlashTimer - dt);
  }

  // 탄막 업데이트
  for (let i = boss.projectiles.length - 1; i >= 0; i--) {
    const p = boss.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < -60 || p.x > worldWidth + 60 || p.y < -60 || p.y > worldHeight + 60) {
      boss.projectiles.splice(i, 1);
    }
  }

  // 폭발 장판/충격파 업데이트
  for (let i = boss.hazards.length - 1; i >= 0; i--) {
    const h = boss.hazards[i];
    if (h.timer > 0) {
      h.timer = Math.max(0, h.timer - dt);
    } else {
      h.activeTimer -= dt;
      if (h.activeTimer <= 0) {
        boss.hazards.splice(i, 1);
      }
    }
  }

  if (boss.hp <= 0) return;

  const phase2 = isPhase2(boss);
  const currentSpeed = phase2 ? boss.speed * 1.25 : boss.speed;

  boss.stateTimer -= dt;

  const dx = player.x - boss.x;
  const dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (boss.state === 'chase') {
    boss.x += (dx / dist) * currentSpeed * dt;
    boss.y += (dy / dist) * currentSpeed * dt;

    if (boss.stateTimer <= 0) {
      const pattern = boss.patterns[boss.patternIndex];
      boss.patternIndex = (boss.patternIndex + 1) % boss.patterns.length;

      if (pattern === 'dash') {
        boss.state = 'windup_dash';
        boss.dashRemaining = phase2 ? 3 : 2; // 2연속 / 3연속 돌진
        boss.stateTimer = 0.5;
        boss.dashDirX = dx / dist;
        boss.dashDirY = dy / dist;
      } else if (pattern === 'burst') {
        boss.state = 'windup_burst';
        boss.stateTimer = phase2 ? 0.35 : 0.45;
      } else if (pattern === 'slam') {
        boss.state = 'windup_slam';
        boss.stateTimer = phase2 ? 0.35 : 0.45;
      } else if (pattern === 'spiral') {
        boss.state = 'windup_spiral';
        boss.stateTimer = 0.35;
      }
    }
  } else if (boss.state === 'windup_dash') {
    if (boss.stateTimer > 0.16) {
      boss.dashDirX = dx / dist;
      boss.dashDirY = dy / dist;
    }

    if (boss.stateTimer <= 0) {
      boss.state = 'dash';
      boss.stateTimer = 0.34;
      boss.dashRemaining--;
    }
  } else if (boss.state === 'dash') {
    boss.x += boss.dashDirX * boss.dashSpeed * dt;
    boss.y += boss.dashDirY * boss.dashSpeed * dt;

    if (boss.stateTimer <= 0) {
      // 돌진이 끝날 때마다 사방으로 견제 탄환 4발 발사
      spawnRadialProjectiles(boss, 4, 240, Math.PI / 4, 6);

      if (boss.dashRemaining > 0) {
        boss.state = 'windup_dash';
        boss.stateTimer = phase2 ? 0.22 : 0.28; // 다음 돌진까지 짧은 재조준
        boss.dashDirX = dx / dist;
        boss.dashDirY = dy / dist;
      } else {
        boss.state = 'recover';
        boss.stateTimer = phase2 ? 0.15 : 0.24;
      }
    }
  } else if (boss.state === 'windup_burst') {
    if (boss.stateTimer <= 0) {
      // 1. 16발 원형 탄막
      const angleOffset = (boss.burstCount % 2) * (Math.PI / 16);
      spawnRadialProjectiles(boss, 16, phase2 ? 330 : 290, angleOffset, 7);

      // 2. 플레이어 방향 빠른 5갈래 조준 탄막 추가
      const baseAngle = Math.atan2(dy, dx);
      const spread = 0.18;
      for (let i = -2; i <= 2; i++) {
        const a = baseAngle + i * spread;
        boss.projectiles.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(a) * 410,
          vy: Math.sin(a) * 410,
          radius: 7.5,
          damage: boss.projectileDamage
        });
      }

      boss.burstCount++;
      boss.state = 'recover';
      boss.stateTimer = phase2 ? 0.16 : 0.25;
    }
  } else if (boss.state === 'windup_spiral') {
    if (boss.stateTimer <= 0) {
      boss.state = 'spiral';
      boss.stateTimer = phase2 ? 1.05 : 0.9;
      boss.spiralTimer = 0;
      boss.spiralAngle = Math.atan2(dy, dx);
    }
  } else if (boss.state === 'spiral') {
    // 나선 탄막을 쏘면서 천천히 플레이어 쪽으로 압박
    boss.x += (dx / dist) * (currentSpeed * 0.35) * dt;
    boss.y += (dy / dist) * (currentSpeed * 0.35) * dt;

    boss.spiralTimer -= dt;
    const interval = phase2 ? 0.1 : 0.13;
    while (boss.spiralTimer <= 0) {
      boss.spiralTimer += interval;
      spawnRadialProjectiles(boss, 4, 290, boss.spiralAngle, 6.5);
      boss.spiralAngle += 0.32;
    }

    if (boss.stateTimer <= 0) {
      boss.state = 'recover';
      boss.stateTimer = phase2 ? 0.15 : 0.24;
    }
  } else if (boss.state === 'windup_slam') {
    if (boss.stateTimer <= 0) {
      // 1. 보스 주변 근접 충격파 (욕심 부려 붙어있으면 맞음)
      boss.hazards.push({
        x: boss.x,
        y: boss.y,
        radius: 135,
        delay: 0.35,
        timer: 0.35,
        activeTimer: 0.15,
        damage: boss.hazardDamage
      });

      // 2. 플레이어 위치 및 주변에 3개의 폭발 장판 생성
      const count = phase2 ? 4 : 3;
      for (let i = 0; i < count; i++) {
        let hx = player.x;
        let hy = player.y;
        if (i > 0) {
          const offsetAngle = (Math.PI * 2 * i) / (count - 1) + Math.random() * 0.6;
          const offsetDist = 105 + Math.random() * 45;
          hx += Math.cos(offsetAngle) * offsetDist;
          hy += Math.sin(offsetAngle) * offsetDist;
        }
        hx = Math.max(70, Math.min(worldWidth - 70, hx));
        hy = Math.max(70, Math.min(worldHeight - 70, hy));

        const delay = i === 0 ? 0.78 : 0.92;
        boss.hazards.push({
          x: hx,
          y: hy,
          radius: 72,
          delay,
          timer: delay,
          activeTimer: 0.15,
          damage: boss.hazardDamage
        });
      }

      boss.state = 'recover';
      boss.stateTimer = phase2 ? 0.15 : 0.22;
    }
  } else if (boss.state === 'recover') {
    if (boss.stateTimer <= 0) {
      boss.state = 'chase';
      boss.stateTimer = phase2 ? 0.55 : 0.9; // 패턴 간 쿨타임 대폭 단축
    }
  }

  boss.x = Math.max(boss.radius, Math.min(worldWidth - boss.radius, boss.x));
  boss.y = Math.max(boss.radius, Math.min(worldHeight - boss.radius, boss.y));
}

export function drawBoss(ctx, boss, player) {
  // 1. 바닥 폭발 장판 / 충격파 그리기 (가장 아래 레이어)
  for (const h of boss.hazards) {
    ctx.save();
    if (h.timer > 0) {
      const progress = 1 - h.timer / h.delay;

      // 바깥쪽 위험 범위 테두리
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 안에서 바깥으로 차오르는 폭발 타이머 원
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius * progress, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
      ctx.fill();
    } else {
      // 실제 폭발 이펙트
      const fade = h.activeTimer / 0.15;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(254, 215, 170, ${0.85 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(239, 68, 68, ${fade})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.restore();
  }

  if (boss.hp > 0) {
    const phase2 = isPhase2(boss);

    // 2. 패턴 전조(경고) 표시
    if (boss.state === 'windup_dash') {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([12, 8]);
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + boss.dashDirX * 360, boss.y + boss.dashDirY * 360);
      ctx.strokeStyle = boss.stateTimer <= 0.16 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(251, 146, 60, 0.65)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    } else if (boss.state === 'windup_burst' || boss.state === 'windup_spiral') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius + 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else if (boss.state === 'windup_slam') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // 3. 2페이즈 각성 오라
    if (phase2) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.65)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    // 4. 보스 본체
    ctx.save();
    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);

    if (boss.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
    } else if (boss.state === 'windup_dash' || boss.state === 'dash') {
      ctx.fillStyle = '#f97316';
    } else if (phase2) {
      ctx.fillStyle = '#be123c';
    } else {
      ctx.fillStyle = '#dc2626';
    }
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = phase2 ? '#f0abfc' : '#7f1d1d';
    ctx.stroke();

    // 눈
    const lookAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    const eyeDist = boss.radius * 0.55;
    for (const sign of [-1, 1]) {
      const a = lookAngle + sign * 0.45;
      ctx.beginPath();
      ctx.arc(boss.x + Math.cos(a) * eyeDist, boss.y + Math.sin(a) * eyeDist, 5, 0, Math.PI * 2);
      ctx.fillStyle = phase2 ? '#f0abfc' : '#fef08a';
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. 보스 탄막 그리기 (가장 위 레이어)
  for (const p of boss.projectiles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fb923c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fef08a';
    ctx.stroke();
  }
}

export function drawBossHpBar(ctx, boss, canvasWidth) {
  const barWidth = 440;
  const barHeight = 16;
  const x = (canvasWidth - barWidth) / 2;
  const y = 24;
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const phase2 = isPhase2(boss);

  ctx.save();
  ctx.fillStyle = phase2 ? '#f0abfc' : '#e2e8f0';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    phase2 ? `BOSS [PHASE 2]  (${boss.hp} / ${boss.maxHp})` : `BOSS  (${boss.hp} / ${boss.maxHp})`,
    canvasWidth / 2,
    y - 6
  );

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(x, y, barWidth, barHeight);

  ctx.fillStyle = phase2 ? '#e11d48' : '#ef4444';
  ctx.fillRect(x, y, barWidth * ratio, barHeight);

  ctx.strokeStyle = phase2 ? '#d946ef' : '#64748b';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);
  ctx.restore();
}