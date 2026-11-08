// 战术突袭 · 战绩上报（Netlify Functions v2）
// 路由：POST /api/submit
// 存储：Netlify Blobs，一人一个 key（p:<id>），写入只碰自己那条，天然无竞态
import { getStore } from '@netlify/blobs';

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
    const key = 'p:' + rec.id;
    let old = null;
    try { old = await store.get(key, { type: 'json' }); } catch (e) { old = null; }
    // 与旧纪录取高值合并：重传不会把战绩改小
    if (old && old.id) {
      rec.xp = Math.max(old.xp | 0, rec.xp);
      rec.xm = Math.max(old.xm | 0, rec.xm);
      rec.w = Math.max(old.w | 0, rec.w);
      rec.l = Math.max(old.l | 0, rec.l);
      rec.k = Math.max(old.k | 0, rec.k);
      rec.cl = Math.max(old.cl | 0, rec.cl);
      rec.sc = Math.max(old.sc | 0, rec.sc);
    }
    await store.setJSON(key, rec);
    return new Response(JSON.stringify({ ok: true, rec }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: CORS });
  }
};
