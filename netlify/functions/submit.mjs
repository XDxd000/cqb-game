// 战术突袭 · 战绩上报（Netlify Functions v2）
// 路由：POST /api/submit  存储：Netlify Blobs
import { getStore } from '@netlify/blobs';

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

const int = (v, max) => {
  const n = (typeof v === 'number' && isFinite(v)) ? Math.round(v) : 0;
  return Math.max(0, Math.min(max, n));
};

function san(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '');
  if (!/^[a-z0-9]{6,20}$/.test(id)) return null;
  const nm = (String(raw.nm || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12)) || '新兵';
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

export const config = { path: '/api/submit' };

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'use_post' }), { status: 405, headers: CORS });

  const txt = await req.text();
  if (txt.length > MAXB) return new Response(JSON.stringify({ error: 'too_large' }), { status: 413, headers: CORS });

  let rec = null;
  try { rec = san(JSON.parse(txt)); } catch (e) { rec = null; }
  if (!rec) return new Response(JSON.stringify({ error: 'bad_record' }), { status: 400, headers: CORS });

  try {
    const store = getStore('cqb-board');
    const cur = (await store.get('board', { type: 'json' })) || [];
    const list = Array.isArray(cur) ? cur.filter((x) => x && x.id) : [];
    const changed = merge(list, rec);
    list.sort((x, y) => (y.xp | 0) - (x.xp | 0) || (y.xm | 0) - (x.xm | 0));
    const cut = list.slice(0, MAXP);
    if (changed) await store.setJSON('board', cut);
    return new Response(JSON.stringify({ list: cut, n: cut.length }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: CORS });
  }
};
