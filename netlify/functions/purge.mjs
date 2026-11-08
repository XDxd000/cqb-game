// 临时维护接口：按 id 删除指定记录，用完即删
import { getStore } from '@netlify/blobs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

export const config = { path: '/api/purge' };

export default async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get('k') !== 'cqb-purge-2026') {
    return new Response(JSON.stringify({ error: 'denied' }), { status: 403, headers: CORS });
  }
  const ids = (u.searchParams.get('ids') || '').split(',').filter(Boolean);
  const store = getStore('cqb-board');
  const done = [];
  for (const id of ids) {
    try { await store.delete('p:' + id); done.push(id); } catch (e) { }
  }
  return new Response(JSON.stringify({ deleted: done }), { headers: CORS });
};
