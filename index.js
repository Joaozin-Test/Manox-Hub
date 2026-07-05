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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ====================== GERAR KEY ======================
    if (path === "/api/generate" && request.method === "POST") {
      const key = generateRandomKey();
      const expires = Date.now() + 24 * 60 * 60 * 1000; // 24h

      await env.KEY_SYSTEM.put(`key:${key}`, JSON.stringify({
        used: false,
        expires: expires,
        created: Date.now()
      }), { expirationTtl: 24 * 60 * 60 });

      return Response.json({ key }, { headers: corsHeaders });
    }

    // ====================== VERIFICAR KEY (para Roblox Executor) ======================
    if (path === "/api/verify" && request.method === "POST") {
      const { key } = await request.json();

      if (!key) return Response.json({ valid: false, msg: "Key inválida" }, { headers: corsHeaders });

      const data = await env.KEY_SYSTEM.get(`key:${key}`, "json");

      if (!data) {
        return Response.json({ valid: false, msg: "Key não existe" }, { headers: corsHeaders });
      }

      if (data.used) {
        return Response.json({ valid: false, msg: "Key já usada" }, { headers: corsHeaders });
      }

      if (Date.now() > data.expires) {
        return Response.json({ valid: false, msg: "Key expirada" }, { headers: corsHeaders });
      }

      // Marcar como usada
      data.used = true;
      await env.KEY_SYSTEM.put(`key:${key}`, JSON.stringify(data));

      return Response.json({ valid: true, msg: "Key válida!" }, { headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  }
};

function generateRandomKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 5; i++) { // Ex: XXXX-XXXX-XXXX
    for (let j = 0; j < 4; j++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 4) key += "-";
  }
  return key;
}
