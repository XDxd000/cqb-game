/**
 * 战术突袭 · 战绩上报（Cloudflare Pages Functions）
 * 路由 POST /api/submit    绑定：KV 命名空间 → 变量名 BOARD
 */
const MAXP = 400;
const MAXB = 2048;
const MAX_XP = 60000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8'
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS });
const int = (v, max) => {
  const n = (typeof v === 'number' && isFinite(v)) ? Math.round(v) : 0;
  return Math.max(0, Math.min(max, n));
};

function san(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '');
  if (!/^[a-z0-9]{6,20}$/.test(id)) return null;
  let nm = String(raw.nm || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12);
  if (!nm) nm = '新兵';
  return {
    id, nm,
    xp: int(raw.xp, MAX_XP), xm: int(raw.xm, MAX_XP),
    w: int(raw.w, 99999), l: int(raw.l, 99999), k: int(raw.k, 999999),
    cl: int(raw.cl, 99), sc: int(raw.sc, 9999999), t: Date.now()
  };
}

function merge(list, rec) {
  const i = list.findIndex((x) => x && x.id === rec.id);
  if (i < 0) { list.push(rec); return true; }
  const o = list[i];
  const n = {
    id: rec.id, nm: rec.nm,
    xp: Math.max(o.xp | 0, rec.xp), xm: Math.max(o.xm | 0, rec.xm),
    w: Math.max(o.w | 0, rec.w), l: Math.max(o.l | 0, rec.l),
    k: Math.max(o.k | 0, rec.k), cl: Math.max(o.cl | 0, rec.cl),
    sc: Math.max(o.sc | 0, rec.sc), t: rec.t
  };
  const same = o.nm === n.nm && (o.xp | 0) === n.xp && (o.xm | 0) === n.xm &&
    (o.w | 0) === n.w && (o.l | 0) === n.l && (o.k | 0) === n.k &&
    (o.cl | 0) === n.cl && (o.sc | 0) === n.sc;
  list[i] = n;
  return !same;
}

async function read(env) {
  try {
    const s = await env.BOARD.get('board');
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.filter((x) => x && x.id) : [];
  } catch (e) { return []; }
}

export async function onRequestOptions() { return new Response(null, { headers: CORS }); }

export async function onRequestPost({ request, env }) {
  if (!env.BOARD) return json({ error: 'kv_binding_missing', hint: '在 Pages 设置里绑定 KV 变量 BOARD' }, 500);
  const txt = await request.text();
  if (txt.length > MAXB) return json({ error: 'too_large' }, 413);
  let rec = null;
  try { rec = san(JSON.parse(txt)); } catch (e) { rec = null; }
  if (!rec) return json({ error: 'bad_record' }, 400);

  const list = await read(env);
  const changed = merge(list, rec);
  list.sort((x, y) => (y.xp | 0) - (x.xp | 0) || (y.xm | 0) - (x.xm | 0));
  const cut = list.slice(0, MAXP);
  if (changed) await env.BOARD.put('board', JSON.stringify(cut));
  return json({ list: cut, n: cut.length });
}
