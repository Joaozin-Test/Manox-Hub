// _worker.js
const KV = 'KEYS_KV'; // Nome do KV namespace que você vai criar

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // ====================== GERAR KEY ======================
    if (path === '/generate' && request.method === 'POST') {
      const key = 'KEY-' + Math.random().toString(36).substring(2, 15).toUpperCase();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas

      await env[KV].put(key, JSON.stringify({
        status: 'valid',
        created: Date.now(),
        expiresAt: expiresAt,
        used: false
      }));

      return Response.json({
        success: true,
        key: key,
        expires: new Date(expiresAt).toLocaleString('pt-BR')
      }, { headers: corsHeaders });
    }

    // ====================== VERIFICAR KEY (para Executor) ======================
    if (path === '/verify' && request.method === 'POST') {
      const { key } = await request.json();

      if (!key) return Response.json({ valid: false, reason: 'Key inválida' });

      const data = await env[KV].get(key);
      if (!data) return Response.json({ valid: false, reason: 'Key não existe' });

      const keyData = JSON.parse(data);

      if (keyData.used) return Response.json({ valid: false, reason: 'Key já usada' });
      if (Date.now() > keyData.expiresAt) {
        await env[KV].put(key, JSON.stringify({ ...keyData, status: 'expired' }));
        return Response.json({ valid: false, reason: 'Key expirada' });
      }

      // Marcar como usada
      await env[KV].put(key, JSON.stringify({ ...keyData, used: true, status: 'used' }));

      return Response.json({ valid: true, reason: 'Key válida' });
    }

    return new Response('Not Found', { status: 404 });
  }
};
