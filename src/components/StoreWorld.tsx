import { useEffect, useRef, useState } from 'react';
import { useGameStore, branchOrdinal, businessTypeOf } from '../store/gameStore';
import { formatNumber } from '../utils/format';
import './StoreWorld.css';

type Point = { x: number; y: number };

type Customer = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  phase: 'enter' | 'seat' | 'serve' | 'leave';
  speed: number;
  seat: number;
  bob: number;
};

type Coin = {
  id: number;
  x: number;
  y: number;
  value: number;
  life: number;
};

const WORLD_W = 900;
const WORLD_H = 650;

const STAGE_THEME = [
  { wall: '#f6e3c4', floor: '#d8a86d', accent: '#8a4f2d', roof: '#6e3f28', light: '#ffd78a' },
  { wall: '#f4dfc8', floor: '#c99a6b', accent: '#8f5b35', roof: '#6f442b', light: '#ffe0a8' },
  { wall: '#f2c6a2', floor: '#b96f48', accent: '#8b2f23', roof: '#5d241d', light: '#ffcc80' },
  { wall: '#e9ddd0', floor: '#a98b76', accent: '#543f38', roof: '#352b29', light: '#fff0c7' },
  { wall: '#d9eef4', floor: '#8ec8d6', accent: '#5c8fc0', roof: '#46728e', light: '#d7fbff' },
  { wall: '#f4d0b6', floor: '#c47a4d', accent: '#a83e24', roof: '#6b2b20', light: '#ffd59e' },
];

function iso(x: number, y: number): Point {
  return {
    x: WORLD_W / 2 + (x - y) * 0.78,
    y: 120 + (x + y) * 0.39,
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function poly(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function drawCustomer(ctx: CanvasRenderingContext2D, c: Customer, t: number) {
  const p = iso(c.x, c.y);
  const bob = Math.sin(t * 0.008 + c.bob) * 2.2;
  const skin = c.id % 3 === 0 ? '#d99a72' : c.id % 3 === 1 ? '#efb48b' : '#c98261';
  const shirt = c.id % 2 ? '#57789d' : '#d36f57';

  ctx.save();
  ctx.translate(p.x, p.y + bob);

  ctx.fillStyle = 'rgba(48,35,28,.18)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 17, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2e2928';
  ctx.fillRect(-8, 5, 6, 14);
  ctx.fillRect(2, 5, 6, 14);

  ctx.fillStyle = shirt;
  roundedRect(ctx, -13, -13, 26, 25, 7);
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -23, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#46332c';
  ctx.beginPath();
  ctx.arc(0, -27, 9, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStaff(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const p = iso(x, y);
  const bob = Math.sin(t * 0.006) * 1.5;

  ctx.save();
  ctx.translate(p.x, p.y + bob);

  ctx.fillStyle = 'rgba(40,30,24,.2)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#302d38';
  ctx.fillRect(-8, 5, 6, 14);
  ctx.fillRect(2, 5, 6, 14);

  ctx.fillStyle = '#f5f2e9';
  roundedRect(ctx, -14, -13, 28, 28, 7);
  ctx.fill();

  ctx.fillStyle = '#6d4a35';
  ctx.beginPath();
  ctx.arc(0, -23, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2c2522';
  ctx.beginPath();
  ctx.arc(0, -27, 10, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#caa46a';
  ctx.fillRect(-2, -8, 4, 12);

  ctx.restore();
}

function drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, occupied: boolean) {
  const p = iso(x, y);

  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.fillStyle = 'rgba(44,31,23,.16)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#765038';
  ctx.fillRect(-3, 5, 6, 30);

  ctx.fillStyle = '#b77a4b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (occupied) {
    ctx.fillStyle = '#f2e7d3';
    roundedRect(ctx, -7, -5, 14, 8, 3);
    ctx.fill();
    ctx.fillStyle = '#6b4933';
    ctx.beginPath();
    ctx.arc(0, -1, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const p = iso(x, y);
  ctx.save();
  ctx.translate(p.x, p.y);

  ctx.fillStyle = '#9b633f';
  ctx.fillRect(-9, -1, 18, 14);

  ctx.fillStyle = '#4f8b55';
  for (const a of [-0.7, 0, 0.7]) {
    ctx.beginPath();
    ctx.ellipse(a * 15, -14 - Math.abs(a) * 3, 9, 18, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  stage: number,
  branch: any,
  customers: Customer[],
  coins: Coin[],
  t: number
) {
  const theme = STAGE_THEME[Math.max(0, Math.min(5, stage - 1))];

  ctx.clearRect(0, 0, WORLD_W, WORLD_H);

  // Sky / ambient backdrop.
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  gradient.addColorStop(0, theme.light);
  gradient.addColorStop(1, '#f7f0e7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Back wall.
  ctx.fillStyle = theme.wall;
  ctx.fillRect(80, 55, 740, 215);

  ctx.fillStyle = 'rgba(255,255,255,.2)';
  for (let x = 100; x < 800; x += 52) ctx.fillRect(x, 60, 1, 200);

  // Store sign.
  ctx.fillStyle = theme.roof;
  roundedRect(ctx, 280, 72, 340, 68, 16);
  ctx.fill();

  ctx.fillStyle = '#fff7e9';
  ctx.font = '800 27px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${businessTypeOf(branch).icon}  ${branch.name}`, 450, 113);

  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`${businessTypeOf(branch).name} · AREA ${stage}`, 450, 132);

  // Window / door.
  ctx.fillStyle = '#8fc0c7';
  roundedRect(ctx, 105, 150, 150, 92, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 5;
  ctx.strokeRect(180, 153, 1, 86);

  ctx.fillStyle = '#7b4e36';
  roundedRect(ctx, 680, 146, 105, 128, 12);
  ctx.fill();
  ctx.fillStyle = '#c7e5e2';
  roundedRect(ctx, 690, 157, 85, 106, 9);
  ctx.fill();

  // Isometric floor.
  const floor = [iso(0, 0), iso(100, 0), iso(100, 80), iso(0, 80)];
  poly(ctx, floor);
  ctx.fillStyle = theme.floor;
  ctx.fill();

  ctx.strokeStyle = 'rgba(88,53,34,.16)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 100; x += 10) {
    const a = iso(x, 0), b = iso(x, 80);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let y = 0; y <= 80; y += 10) {
    const a = iso(0, y), b = iso(100, y);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // Counter.
  const c1 = iso(14, 18), c2 = iso(48, 18), c3 = iso(48, 31), c4 = iso(14, 31);
  poly(ctx, [c1, c2, c3, c4]);
  ctx.fillStyle = theme.accent;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.stroke();

  const cp = iso(31, 18);
  ctx.fillStyle = '#f3d39b';
  roundedRect(ctx, cp.x - 24, cp.y - 21, 48, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#6b4430';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText('SERVICE', cp.x, cp.y - 6);

  // Tables adapt to table count.
  const tableCount = Math.min(8, Math.max(2, branch.tables));
  const spots: [number, number][] = [
    [62, 15], [80, 24], [58, 38], [78, 48],
    [45, 54], [63, 62], [85, 63], [34, 67],
  ];
  for (let i = 0; i < tableCount; i++) {
    drawTable(ctx, spots[i][0], spots[i][1], i < customers.filter(c => c.phase === 'serve').length);
  }

  drawPlant(ctx, 7, 70);
  drawPlant(ctx, 94, 10);

  // Decorative wall lights.
  for (const x of [290, 610]) {
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.arc(x, 190, 12 + Math.sin(t * 0.004 + x) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,110,.18)';
    ctx.beginPath();
    ctx.arc(x, 190, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Staff.
  const staffCount = Math.min(4, Math.max(1, branch.staffCount));
  for (let i = 0; i < staffCount; i++) {
    drawStaff(ctx, 39 + i * 7, 33 + (i % 2) * 7, t + i * 500);
  }

  // Customers.
  customers.forEach((c) => drawCustomer(ctx, c, t));

  // Floating money.
  for (const coin of coins) {
    const p = { x: coin.x, y: coin.y - (1 - coin.life) * 55 };
    ctx.globalAlpha = Math.max(0, coin.life);
    ctx.fillStyle = '#fff7c8';
    roundedRect(ctx, p.x - 38, p.y - 15, 76, 30, 15);
    ctx.fill();
    ctx.globalAlpha = Math.max(0, coin.life);
    ctx.fillStyle = '#7a4b20';
    ctx.font = '800 14px system-ui, sans-serif';
    ctx.fillText(`+${formatNumber(coin.value)}원`, p.x, p.y + 5);
    ctx.globalAlpha = 1;
  }

  // World labels.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(44,33,27,.72)';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('고객이 들어오고 → 주문하고 → 결제합니다', 105, 595);

  const queueText = branch.queueCount > 0 ? `대기 ${branch.queueCount}명` : '대기 없음';
  ctx.textAlign = 'right';
  ctx.fillStyle = branch.queueCount > 0 ? '#9d3d2f' : '#47664b';
  ctx.fillText(queueText, 795, 595);

  ctx.textAlign = 'center';
}

function makeCustomer(id: number, tables: number): Customer {
  const spot = [
    [62, 15], [80, 24], [58, 38], [78, 48],
    [45, 54], [63, 62], [85, 63], [34, 67],
  ][id % Math.max(2, Math.min(8, tables))];

  return {
    id,
    x: -3 - (id % 4) * 5,
    y: 69 + (id % 3) * 3,
    targetX: spot[0],
    targetY: spot[1],
    phase: 'enter',
    speed: 0.018 + (id % 3) * 0.003,
    seat: id,
    bob: id * 1.7,
  };
}

export default function StoreWorld() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const customersRef = useRef<Customer[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const lastServedRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const [toast, setToast] = useState('손님이 가게로 들어오고 있어요');
  const [flash, setFlash] = useState(0);

  const branch = useGameStore((s) => s.branches[s.branches.length - 1]);
  const money = useGameStore((s) => s.money);
  const upgradeTables = useGameStore((s) => s.upgradeTables);
  const hireStaff = useGameStore((s) => s.hireStaff);
  const upgradeMenu = useGameStore((s) => s.upgradeMenu);
  const tablesCost = useGameStore((s) => s.upgradeTablesCost);
  const staffCost = useGameStore((s) => s.hireStaffCost);
  const menuCost = useGameStore((s) => s.upgradeMenuCost);

  useEffect(() => {
    if (!branch) return;
    if (customersRef.current.length === 0) {
      customersRef.current = Array.from({ length: 7 }, (_, i) => makeCustomer(i, branch.tables));
    }
  }, [branch?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !branch) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(
        (rect.width * dpr) / WORLD_W,
        0,
        0,
        (rect.height * dpr) / WORLD_H,
        0,
        0
      );
    };

    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;

      const customers = customersRef.current;
      const coins = coinsRef.current;

      for (const c of customers) {
        if (c.phase === 'enter') {
          c.x += c.speed * dt;
          if (c.x >= 30) {
            c.phase = 'seat';
            c.x = 30;
          }
        } else if (c.phase === 'seat') {
          const dx = c.targetX - c.x;
          const dy = c.targetY - c.y;
          const d = Math.hypot(dx, dy);
          if (d < 1.5) {
            c.phase = 'serve';
            c.x = c.targetX;
            c.y = c.targetY;
          } else {
            c.x += (dx / d) * c.speed * dt * 1.8;
            c.y += (dy / d) * c.speed * dt * 1.8;
          }
        } else if (c.phase === 'serve') {
          c.bob += dt * 0.002;
          if (Math.sin(now * 0.0008 + c.id) > 0.997) {
            c.phase = 'leave';
          }
        } else {
          c.x += c.speed * dt * 2.1;
          c.y += c.speed * dt * 0.25;
          if (c.x > 108) {
            const idx = c.id;
            customers[idx] = makeCustomer(c.id + 8 + Math.floor(now / 1000), branch.tables);
          }
        }
      }

      const served = branch.totalServed;
      if (served > lastServedRef.current) {
        const delta = served - lastServedRef.current;
        for (let i = 0; i < Math.min(delta, 3); i++) {
          coins.push({
            id: now + i,
            x: 470 + i * 20,
            y: 285 - i * 10,
            value: Math.max(1, Math.round(branch ? (money / Math.max(1, served)) : 1)),
            life: 1,
          });
        }
        setToast(`✨ 손님 응대 완료! +${delta}명`);
        setFlash(1);
        window.setTimeout(() => setFlash(0), 220);
      }
      lastServedRef.current = served;

      for (const coin of coins) coin.life -= dt / 850;
      coinsRef.current = coins.filter((coin) => coin.life > 0);

      drawWorld(ctx, branchOrdinal(branch), branch, customers, coinsRef.current, now);
      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [branch, money]);

  if (!branch) return null;

  const stage = branchOrdinal(branch);
  const business = businessTypeOf(branch);

  const action = (
    label: string,
    cost: number,
    onClick: () => boolean,
    icon: string
  ) => {
    const ok = onClick();
    if (ok) {
      setToast(`${icon} ${label} 업그레이드 완료!`);
    } else {
      setToast(`🔒 ${formatNumber(cost)}원이 필요해요`);
    }
  };

  return (
    <section className="store-world" aria-label="실시간 가게 화면">
      <div className={`store-world__canvas-wrap ${flash ? 'is-flash' : ''}`}>
        <canvas ref={canvasRef} className="store-world__canvas" />
        <div className="store-world__live">
          <span className="live-dot" />
          LIVE
        </div>
        <div className="store-world__status">
          <strong>{toast}</strong>
          <span>{business.icon} {business.name} · 손님 {branch.totalServed.toLocaleString()}명</span>
        </div>
        <div className="store-world__stage">
          <span>AREA {stage}</span>
          <b>{business.name}</b>
        </div>
      </div>

      <div className="world-actions">
        <button
          onClick={() => action('좌석', tablesCost(branch), () => upgradeTables(branch.id), '🪑')}
          disabled={money < tablesCost(branch)}
        >
          <span>🪑</span>
          <b>좌석 +</b>
          <small>{formatNumber(tablesCost(branch))}원</small>
        </button>

        <button
          onClick={() => action('직원', staffCost(branch), () => hireStaff(branch.id), '👨‍🍳')}
          disabled={money < staffCost(branch)}
        >
          <span>👨‍🍳</span>
          <b>직원 +</b>
          <small>{formatNumber(staffCost(branch))}원</small>
        </button>

        <button
          onClick={() => action('메뉴', menuCost(branch), () => upgradeMenu(branch.id), '🍽️')}
          disabled={money < menuCost(branch)}
        >
          <span>🍽️</span>
          <b>메뉴 ↑</b>
          <small>{formatNumber(menuCost(branch))}원</small>
        </button>
      </div>

      <div className="world-hint">
        <span>👆</span>
        <div>
          <b>가게가 스스로 운영됩니다</b>
          <p>고객 → 자리 → 서비스 → 결제 → 퇴장 순서로 실제 흐름이 보입니다.</p>
        </div>
      </div>
    </section>
  );
}
