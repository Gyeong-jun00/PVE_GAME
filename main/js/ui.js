// 모서리가 둥근 사각형 그리기 헬퍼
function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 1. 상단 중앙: 보스 체력바
function drawBossBar(ctx, boss, canvasWidth) {
  const panelW = 460;
  const panelH = 48;
  const x = (canvasWidth - panelW) / 2;
  const y = 14;
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const phase2 = boss.hp <= boss.maxHp * 0.5;

  ctx.save();

  // 반투명 어두운 배경 카드
  roundRectPath(ctx, x, y, panelW, panelH, 10);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fill();
  ctx.strokeStyle = phase2 ? 'rgba(217, 70, 239, 0.6)' : 'rgba(100, 116, 139, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 이름 & 페이즈 뱃지
  const padX = 14;
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('BOSS', x + padX, y + 16);

  if (phase2) {
    roundRectPath(ctx, x + padX + 46, y + 7, 64, 17, 4);
    ctx.fillStyle = 'rgba(217, 70, 239, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f5d0fe';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PHASE 2', x + padX + 46 + 32, y + 16);
  }

  // 수치 표시 (우측 정렬)
  ctx.font = '600 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${boss.hp} / ${boss.maxHp}`, x + panelW - padX, y + 16);

  // 체력바 트랙
  const barX = x + padX;
  const barY = y + 29;
  const barW = panelW - padX * 2;
  const barH = 10;

  roundRectPath(ctx, barX, barY, barW, barH, 5);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  // 체력바 채우기
  if (ratio > 0) {
    ctx.save();
    roundRectPath(ctx, barX, barY, barW, barH, 5);
    ctx.clip();

    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (phase2) {
      grad.addColorStop(0, '#be123c');
      grad.addColorStop(1, '#d946ef');
    } else {
      grad.addColorStop(0, '#dc2626');
      grad.addColorStop(1, '#f97316');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.restore();
  }

  // 50% (2페이즈 경계선) 눈금
  ctx.beginPath();
  ctx.moveTo(barX + barW * 0.5, barY - 1);
  ctx.lineTo(barX + barW * 0.5, barY + barH + 1);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// 2. 좌측 하단: 플레이어 상태 패널 (체력 + 스킬 쿨타임 바)
function drawPlayerPanel(ctx, player, canvasHeight) {
  const panelW = 228;
  const panelH = 74;
  const x = 16;
  const y = canvasHeight - panelH - 16;
  const padX = 14;
  const hpRatio = Math.max(0, player.hp / player.maxHp);

  ctx.save();

  // 패널 배경 카드
  roundRectPath(ctx, x, y, panelW, panelH, 10);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // HP 텍스트
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('HP', x + padX, y + 16);

  ctx.font = '600 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`${player.hp} / ${player.maxHp}`, x + panelW - padX, y + 16);

  // HP 바
  const barX = x + padX;
  const barY = y + 26;
  const barW = panelW - padX * 2;
  const barH = 10;

  roundRectPath(ctx, barX, barY, barW, barH, 5);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  if (hpRatio > 0) {
    let hpColor = '#38bdf8';
    if (hpRatio <= 0.25) hpColor = '#ef4444';
    else if (hpRatio <= 0.5) hpColor = '#facc15';

    roundRectPath(ctx, barX, barY, Math.max(barH, barW * hpRatio), barH, 5);
    ctx.fillStyle = hpColor;
    ctx.fill();
  }

  // 하단 쿨타임 칩 2개 (대시 / 공격)
  const chipY = y + 45;
  const chipW = (barW - 8) / 2;
  const chipH = 18;

  // 대시 게이지
  const dashRatio = 1 - Math.min(1, player.cooldownTimer / player.dashCooldown);
  drawCooldownChip(ctx, barX, chipY, chipW, chipH, 'SPACE 대시', dashRatio, '#38bdf8');

  // 공격 게이지
  const atkRatio = 1 - Math.min(1, player.attackCooldownTimer / player.attackCooldown);
  drawCooldownChip(ctx, barX + chipW + 8, chipY, chipW, chipH, '좌클릭/J 공격', atkRatio, '#fbbf24');

  ctx.restore();
}

function drawCooldownChip(ctx, x, y, w, h, label, ratio, activeColor) {
  const ready = ratio >= 0.999;

  roundRectPath(ctx, x, y, w, h, 4);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  if (ratio > 0) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, 4);
    ctx.clip();
    ctx.fillStyle = ready ? activeColor : 'rgba(148, 163, 184, 0.35)';
    ctx.globalAlpha = ready ? 0.28 : 0.7;
    ctx.fillRect(x, y, w * ratio, h);
    ctx.restore();
  }

  roundRectPath(ctx, x, y, w, h, 4);
  ctx.strokeStyle = ready ? activeColor : 'rgba(100, 116, 139, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ready ? '#f8fafc' : '#94a3b8';
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
}

// 3. 우측 하단: 조작 안내 뱃지
function drawControlsHint(ctx, canvasWidth, canvasHeight) {
  const text = 'WASD 이동  ·  좌클릭 / J 공격  ·  Space 대시';
  const w = 266;
  const h = 28;
  const x = canvasWidth - w - 16;
  const y = canvasHeight - h - 16;

  ctx.save();
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}

// 4. 보스가 화면 밖에 있을 때 방향 표시 화살표
export function drawBossIndicator(ctx, boss, camera, canvasWidth, canvasHeight) {
  if (boss.hp <= 0) return;

  const sx = boss.x - camera.x;
  const sy = boss.y - camera.y;
  const margin = 20;

  const isOnScreen =
    sx >= -boss.radius &&
    sx <= canvasWidth + boss.radius &&
    sy >= -boss.radius &&
    sy <= canvasHeight + boss.radius;

  if (isOnScreen) return;

  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const angle = Math.atan2(sy - cy, sx - cx);

  const ix = Math.max(margin + 16, Math.min(canvasWidth - margin - 16, sx));
  const iy = Math.max(76, Math.min(canvasHeight - margin - 16, sy));

  ctx.save();
  ctx.translate(ix, iy);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 8);
  ctx.closePath();

  ctx.fillStyle = '#ef4444';
  ctx.fill();
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// 전체 HUD 통합 그리기
export function drawHUD(ctx, player, boss, canvasWidth, canvasHeight) {
  drawBossBar(ctx, boss, canvasWidth);
  drawPlayerPanel(ctx, player, canvasHeight);
  drawControlsHint(ctx, canvasWidth, canvasHeight);
}

// 5. 승리 / 게임오버 중앙 모달 카드
export function drawEndOverlay(ctx, player, boss, canvasWidth, canvasHeight) {
  const isWin = boss.hp <= 0;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const cardW = 340;
  const cardH = 166;
  const x = (canvasWidth - cardW) / 2;
  const y = (canvasHeight - cardH) / 2;

  roundRectPath(ctx, x, y, cardW, cardH, 14);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = isWin ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = isWin ? '#4ade80' : '#f87171';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(isWin ? 'VICTORY!' : 'GAME OVER', canvasWidth / 2, y + 48);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  const summary = isWin
    ? `남은 플레이어 체력: ${player.hp} / ${player.maxHp}`
    : `보스 남은 체력: ${boss.hp} / ${boss.maxHp}`;
  ctx.fillText(summary, canvasWidth / 2, y + 88);

  // R 재시작 배지
  roundRectPath(ctx, canvasWidth / 2 - 96, y + 112, 192, 32, 8);
  ctx.fillStyle = 'rgba(51, 65, 85, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('R 키를 눌러 다시 시작', canvasWidth / 2, y + 128);

  ctx.restore();
}