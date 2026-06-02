const GAS_URL = "https://script.google.com/macros/s/AKfycbzNvLPpUpUWwDrQSCrDIdDMOyPg9Nx9wDNE2X4Bz23JlkBz30mr8RBIcAm6LQUDPhhO/exec";
const SENHA = "goncalo2025";

// Converte data ISO ou objeto Date para dd/MM/yyyy
function formatarData(valor) {
  if (!valor) return "";
  const s = valor.toString();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (s.includes("T") || s.includes("-")) {
    const d = new Date(s);
    if (!isNaN(d)) {
      const dia = String(d.getUTCDate()).padStart(2, "0");
      const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
      const ano = d.getUTCFullYear();
      return `${dia}/${mes}/${ano}`;
    }
  }
  return s;
}

// Converte hora ISO ou objeto Date para HH:mm no horário de Brasília
function formatarHora(valor) {
  if (!valor) return "";
  const s = valor.toString();
  // Já está no formato HH:mm
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  // Formato ISO: 1899-12-30T15:31:28.000Z ou 2026-05-16T15:31:28.000Z
  if (s.includes("T")) {
    const d = new Date(s);
    if (!isNaN(d)) {
      // Converte para horário de Brasília (UTC-3)
      const br = new Date(d.getTime() - 3 * 60 * 60 * 1000);
      const hh = String(br.getUTCHours()).padStart(2, "0");
      const mm = String(br.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return s;
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    // ── GET: buscar pedidos para o dashboard ──────────────────────────
    if (event.httpMethod === "GET") {
      const params = new URLSearchParams({ senha: SENHA });
      const resp = await fetch(`${GAS_URL}?${params}`);
      const texto = await resp.text();

      let dados;
      try {
        dados = JSON.parse(texto);
      } catch {
        dados = { erro: "Resposta inválida do GAS", raw: texto };
      }

      // Normaliza datas e horas dos pedidos
      if (dados.ok && Array.isArray(dados.pedidos)) {
        dados.pedidos = dados.pedidos.map(p => ({
          ...p,
          Data: formatarData(p["Data"]),
          Hora: formatarHora(p["Hora"]),
        }));
      }
      if (dados.ok && Array.isArray(dados.itens)) {
        dados.itens = dados.itens.map(i => ({
          ...i,
          Data: formatarData(i["Data"]),
        }));
      }

      return { statusCode: 200, headers, body: JSON.stringify(dados) };
    }

    // ── POST: registrar novo pedido ───────────────────────────────────
    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body);
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ erro: "Body inválido" }),
        };
      }

      body.senha = SENHA;

      const resp = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const texto = await resp.text();

      let dados;
      try {
        dados = JSON.parse(texto);
      } catch {
        dados = { erro: "Resposta inválida do GAS", raw: texto };
      }

      return { statusCode: 200, headers, body: JSON.stringify(dados) };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ erro: "Método não permitido" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ erro: "Erro interno", detalhe: err.message }),
    };
  }
};
