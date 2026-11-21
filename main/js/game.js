import { createPlayer, updatePlayer, drawPlayer, checkMeleeHit, damagePlayer } from './player.js';
import { createBoss, updateBoss, drawBoss } from './boss.js';
import { drawHUD, drawBossIndicator, drawEndOverlay } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const world = {
  width: 1600,
  height: 1200
};

let player;
let boss;
const camera = { x: 0, y: 0 };

function resetGame() {
  player = createPlayer(world.width / 2, world.height / 2 + 160);
  boss = createBoss(world.width / 2, world.height / 2 - 160);
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
}

resetGame();

const keys = {};
const mouse = {
  screenX: canvas.width / 2,
  screenY: canvas.height / 2,
  x: player.x,
  y: player.y,
  isDown: false
};

let lastTime = performance.now();

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  keys[e.code] = true;

  // 게임 종료 시 R 키로 재시작
  if (e.code === 'KeyR' && (player.hp <= 0 || boss.hp <= 0)) {
    resetGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function updateMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouse.screenX = (e.clientX - rect.left) * scaleX;
  mouse.screenY = (e.clientY - rect.top) * scaleY;
}

canvas.addEventListener('mousemove', updateMousePos);

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    updateMousePos(e);
    mouse.isDown = true;
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    mouse.isDown = false;
  }
});

window.addEventListener('blur', () => {
  for (const key in keys) {
    keys[key] = false;
  }
  mouse.isDown = false;
});

function drawArena(ctx, world) {
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, world.width, world.height);

  const gridSize = 80;
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = gridSize; x < world.width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
  }
  for (let y = gridSize; y < world.height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#383838';
  for (let x = gridSize; x < world.width; x += gridSize) {
    for (let y = gridSize; y < world.height; y += gridSize) {
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  }

  ctx.beginPath();
  ctx.arc(world.width / 2, world.height / 2, 90, 0, Math.PI * 2);
  ctx.strokeStyle = '#2e2e2e';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, world.width, world.height);
}

function update(dt) {
  if (player.hp <= 0 || boss.hp <= 0) return;

  mouse.x = mouse.screenX + camera.x;
  mouse.y = mouse.screenY + camera.y;

  updatePlayer(player, keys, mouse, world.width, world.height, dt);
  updateBoss(boss, player, world.width, world.height, dt);

  // 1. 플레이어 근접 공격 -> 보스 피격 판정
  if (!player.hasHitInCurrentSwing && checkMeleeHit(player, boss)) {
    boss.hp = Math.max(0, boss.hp - player.attackDamage);
    boss.hitFlashTimer = 0.1;
    player.hasHitInCurrentSwing = true;
  }

  // 2. 보스 몸통 접촉 -> 플레이어 피격 판정
  const distToBoss = Math.hypot(player.x - boss.x, player.y - boss.y);
  if (distToBoss < player.radius + boss.radius) {
    damagePlayer(player, boss.contactDamage);
  }

  // 3. 보스 탄막 -> 플레이어 피격 판정
  for (let i = boss.projectiles.length - 1; i >= 0; i--) {
    const p = boss.projectiles[i];
    const dist = Math.hypot(player.x - p.x, player.y - p.y);
    if (dist < player.radius + p.radius) {
      if (damagePlayer(player, p.damage)) {
        boss.projectiles.splice(i, 1);
      }
    }
  }

  // 4. 보스 장판/충격파 폭발 -> 플레이어 피격 판정
  for (const h of boss.hazards) {
    if (h.timer <= 0 && h.activeTimer > 0) {
      const dist = Math.hypot(player.x - h.x, player.y - h.y);
      if (dist < player.radius + h.radius) {
        damagePlayer(player, h.damage);
      }
    }
  }

  // 카메라를 플레이어 중심으로 고정
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
}

function render() {
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- 월드 좌표계 ---
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawArena(ctx, world);
  drawBoss(ctx, boss, player);
  drawPlayer(ctx, player);

  ctx.restore();

  // --- 화면 고정 UI ---
  drawBossIndicator(ctx, boss, camera, canvas.width, canvas.height);
  drawHUD(ctx, player, boss, canvas.width, canvas.height);

  if (boss.hp <= 0 || player.hp <= 0) {
    drawEndOverlay(ctx, player, boss, canvas.width, canvas.height);
  }
}

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);