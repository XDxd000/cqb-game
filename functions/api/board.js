/**
 * 战术突袭 · 排行榜读取（Cloudflare Pages Functions）
 * 路由 GET /api/board     绑定：KV 命名空间 → 变量名 BOARD
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8'
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS });

async function read(env) {
  try {
    const s = await env.BOARD.get('board');
    const a = s ? JSON.parse(s) : [];
    return Array.isArray(a) ? a.filter((x) => x && x.id) : [];
  } catch (e) { return []; }
}

export async function onRequestOptions() { return new Response(null, { headers: CORS }); }

export async function onRequestGet({ env }) {
  if (!env.BOARD) return json({ error: 'kv_binding_missing', hint: '在 Pages 设置里绑定 KV 变量 BOARD' }, 500);
  const list = await read(env);
  list.sort((x, y) => (y.xp | 0) - (x.xp | 0) || (y.xm | 0) - (x.xm | 0));
  return json({ list, n: list.length });
}
