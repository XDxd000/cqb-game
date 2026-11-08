// 战术突袭 · 排行榜读取（Netlify Functions v2）
// 路由：GET /api/board   存储：Netlify Blobs（无需额外账号或数据库）
import { getStore } from '@netlify/blobs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json; charset=utf-8'
};

export const config = { path: '/api/board' };

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const store = getStore('cqb-board');
    const list = (await store.get('board', { type: 'json' })) || [];
    const arr = Array.isArray(list) ? list.filter((x) => x && x.id) : [];
    arr.sort((x, y) => (y.xp | 0) - (x.xp | 0) || (y.xm | 0) - (x.xm | 0));
    return new Response(JSON.stringify({ list: arr, n: arr.length }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: CORS });
  }
};
