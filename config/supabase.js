/* Río Rosa
   Cole aqui os dados públicos do seu projeto Supabase.
   Use a Project URL e a chave anon ou publishable.
   Nunca cole a chave service_role nem uma chave secret. */
window.RIO_ROSA = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  imagesBucket: "product-images"
};

/* Não é preciso alterar o resto deste arquivo. */

(function () {
  "use strict";

  function clean(value) {
    return String(value || "").trim();
  }

  function normalizedUrl() {
    return clean(window.RIO_ROSA.supabaseUrl).replace(/\/+$/, "");
  }

  function normalizedKey() {
    return clean(window.RIO_ROSA.supabaseAnonKey)
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, "");
  }

  function decodeJwtPayload(token) {
    var part = String(token || "").split(".")[1];
    if (!part) return null;
    var padded = part.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    try {
      return JSON.parse(atob(padded));
    } catch (error) {
      return null;
    }
  }

  window.rioRosaKeyProblem = function () {
    var key = normalizedKey();
    if (!key || key.indexOf("YOUR_ANON") !== -1) return "";
    if (key.indexOf("sb_secret_") === 0) {
      return "Você colou uma chave secreta. No site entra só a chave anon ou publishable.";
    }
    var payload = decodeJwtPayload(key);
    if (payload && payload.role === "service_role") {
      return "Você colou a chave service_role. Tire ela de config/supabase.js e use a chave anon ou publishable.";
    }
    return "";
  };

  window.rioRosaConfigured = function () {
    var url = normalizedUrl();
    var key = normalizedKey();
    if (!/^https:\/\/.+/i.test(url)) return false;
    if (url.indexOf("YOUR_PROJECT") !== -1) return false;
    if (!key || key.indexOf("YOUR_ANON") !== -1) return false;
    if (window.rioRosaKeyProblem()) return false;
    return true;
  };

  window.rioRosaClient = function () {
    if (!window.rioRosaConfigured()) return null;
    if (window.__rioRosaClient) return window.__rioRosaClient;
    var library = window.supabase;
    var createClient = library && (library.createClient || (library.default && library.default.createClient));
    if (typeof createClient !== "function") {
      throw new Error("Não foi possível carregar o Supabase. Confira a internet e abra a página de novo.");
    }
    window.__rioRosaClient = createClient(normalizedUrl(), normalizedKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    return window.__rioRosaClient;
  };

  window.rioRosaMessage = function (error) {
    var message = (error && (error.message || error.error_description)) || "";
    var code = error && error.code;
    if (/invalid login credentials/i.test(message)) return "O e-mail ou a senha não conferem.";
    if (/email not confirmed/i.test(message)) {
      return "Este e-mail ainda não foi confirmado. No Supabase, crie o usuário com confirmação automática.";
    }
    if (/row-level security/i.test(message) || code === "42501") {
      return "Você não tem permissão para isso. O usuário precisa estar na tabela de administradores.";
    }
    if (/could not find the table|schema cache|does not exist|PGRST205/i.test(message)) {
      return "Faltam as tabelas. No Supabase, abra o SQL Editor, cole supabase/schema.sql e execute.";
    }
    if (code === "PGRST116") {
      return "Falta a configuração inicial. Execute supabase/schema.sql no SQL Editor do Supabase.";
    }
    if (/Bucket not found/i.test(message)) {
      return "Não encontrei o espaço das fotografias. Execute supabase/schema.sql de novo.";
    }
    if (/payload too large|exceeded the maximum|entity too large/i.test(message)) {
      return "A fotografia ainda está pesada demais. Tente outra imagem.";
    }
    if (/Failed to fetch|NetworkError|network|Load failed/i.test(message)) {
      return "Sem conexão com o Supabase. Confira a internet e se o projeto não está pausado.";
    }
    if (!message) return "Não foi possível concluir.";
    return "Não foi possível concluir. " + message;
  };
})();
