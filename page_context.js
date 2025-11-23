(function() {
  'use strict';

  function getBearerToken() {
    const scripts = document.querySelectorAll("script");
    
    for (const s of scripts) {
      const text = s.textContent || s.innerText || '';
      
      if (text.includes("Bearer ") || text.includes('"authorization"') || text.includes("'authorization'")) {
        const patterns = [
          /Bearer\s+([a-zA-Z0-9%-._~+/=]+)/,
          /"authorization"\s*:\s*"Bearer\s+([a-zA-Z0-9%-._~+/=]+)"/,
          /'authorization'\s*:\s*'Bearer\s+([a-zA-Z0-9%-._~+/=]+)'/,
          /Authorization["']?\s*:\s*["']?Bearer\s+([a-zA-Z0-9%-._~+/=]+)/i,
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match && match[1] && match[1].length > 20) {
            console.log('[FilterTweetRegion-Page] Bearer token encontrado via script');
            return match[1];
          }
        }
      }
    }
    
    if (window.__INITIAL_STATE__) {
      const state = window.__INITIAL_STATE__;
      const stateStr = JSON.stringify(state);
      const match = stateStr.match(/Bearer\s+([a-zA-Z0-9%-._~+/=]+)/);
      if (match && match[1] && match[1].length > 20) {
        console.log('[FilterTweetRegion-Page] Bearer token encontrado via __INITIAL_STATE__');
        return match[1];
      }
    }
    
    const defaultToken = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
    console.warn('[FilterTweetRegion-Page] Bearer token não encontrado, usando token padrão');
    return defaultToken;
  }

  function getCSRF() {
    const cookie = document.cookie
      .split("; ")
      .find(x => x.startsWith("ct0="));
    
    if (cookie) {
      const csrf = cookie.split("=")[1];
      console.log('[FilterTweetRegion-Page] CSRF token encontrado');
      return csrf;
    }
    
    console.warn('[FilterTweetRegion-Page] CSRF token não encontrado');
    return "";
  }

  async function getRegion(username) {
    console.log(`[FilterTweetRegion-Page] Buscando região para @${username}...`);
    
    const token = getBearerToken();
    const csrf = getCSRF();

    if (!token || !csrf) {
      console.warn(`[FilterTweetRegion-Page] Token ou CSRF não encontrado para @${username}`);
      return null;
    }

    try {
      const url = `https://x.com/i/api/graphql/XRqGa7EeokUU5kppkh13EA/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({ screenName: username }))}`;
      
      console.log(`[FilterTweetRegion-Page] Fazendo requisição para @${username}...`);

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "authorization": `Bearer ${token}`,
          "x-csrf-token": csrf,
          "x-twitter-active-user": "yes",
          "x-twitter-auth-type": "OAuth2Session",
          "content-type": "application/json",
          "accept": "*/*",
          "Referer": "https://x.com/",
        }
      });

      console.log(`[FilterTweetRegion-Page] Resposta para @${username}:`, res.status, res.statusText);

      if (res.status === 429) {
        console.warn(`[FilterTweetRegion-Page] Rate limit (429) para @${username}`);
        return "rate_limited";
      }

      if (!res.ok) {
        console.warn(`[FilterTweetRegion-Page] Erro na resposta para @${username}:`, res.status);
        return null;
      }

      const json = await res.json();
      const region = json?.data?.user_result_by_screen_name?.result?.about_profile?.account_based_in || null;
      
      console.log(`[FilterTweetRegion-Page] Região encontrada para @${username}:`, region || 'null');
      
      return region;
    } catch (error) {
      console.warn(`[FilterTweetRegion-Page] Erro ao buscar região para @${username}:`, error);
      return null;
    }
  }

  window.addEventListener("message", async (e) => {
    if (e.data?.type === "GET_REGION") {
      console.log(`[FilterTweetRegion-Page] Recebida requisição para @${e.data.username}`);
      const region = await getRegion(e.data.username);
      window.postMessage({ 
        type: "REGION_RESULT", 
        username: e.data.username, 
        region 
      }, "*");
      console.log(`[FilterTweetRegion-Page] Resposta enviada para @${e.data.username}:`, region);
    }
  });

  console.log('[FilterTweetRegion-Page] Script injetado e pronto');
})();

