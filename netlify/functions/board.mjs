// 战术突袭 · 排行榜读取（Netlify Functions v2）
// 路由：GET /api/board
// 存储：Netlify Blobs，一人一个 key（p:<id>），避免并发覆盖
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
    const list = [];
    const { blobs } = await store.list({ prefix: 'p:' });
    for (const b of blobs) {
      try {
        const rec = await store.get(b.key, { type: 'json' });
        if (rec && rec.id) list.push(rec);
      } catch (e) { /* 单条读失败不影响整体 */ }
    }
    list.sort((x, y) => (y.xp | 0) - (x.xp | 0) || (y.xm | 0) - (x.xm | 0));
    return new Response(JSON.stringify({ list, n: list.length }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: CORS });
  }
};
