(function() {
  'use strict';

  function getBearerToken() {
    const scripts = document.querySelectorAll("script");
    
    for (const s of scripts) {
      const text = s.textContent || s.innerText || '';
      
      if (text.length > 0) {
        const patterns = [
          /Bearer\s+([A-Za-z0-9\-_~+/=]+)/g,
          /"authorization"\s*:\s*"Bearer\s+([A-Za-z0-9\-_~+/=]+)"/gi,
          /'authorization'\s*:\s*'Bearer\s+([A-Za-z0-9\-_~+/=]+)'/gi,
          /Authorization["']?\s*:\s*["']?Bearer\s+([A-Za-z0-9\-_~+/=]+)/gi,
          /"Bearer"\s*:\s*"([A-Za-z0-9\-_~+/=]+)"/gi,
          /'Bearer'\s*:\s*'([A-Za-z0-9\-_~+/=]+)'/gi,
        ];
        
        for (const pattern of patterns) {
          const matches = [...text.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1] && match[1].length > 20 && match[1].length < 200) {
              const token = match[1];
              if (token.includes('AAAA') || token.length > 50) {
                console.log('[FilterTweetRegion-Page] Bearer token found via script');
                return token;
              }
            }
          }
        }
      }
    }
    
    if (window.__INITIAL_STATE__) {
      try {
        const state = window.__INITIAL_STATE__;
        const stateStr = JSON.stringify(state);
        const matches = [...stateStr.matchAll(/Bearer\s+([A-Za-z0-9\-_~+/=]+)/g)];
        for (const match of matches) {
          if (match && match[1] && match[1].length > 20) {
            console.log('[FilterTweetRegion-Page] Bearer token found via __INITIAL_STATE__');
            return match[1];
          }
        }
      } catch (e) {
        console.warn('[FilterTweetRegion-Page] Error accessing __INITIAL_STATE__:', e);
      }
    }
    
    if (window.__NEXT_DATA__) {
      try {
        const nextData = window.__NEXT_DATA__;
        const dataStr = JSON.stringify(nextData);
        const matches = [...dataStr.matchAll(/Bearer\s+([A-Za-z0-9\-_~+/=]+)/g)];
        for (const match of matches) {
          if (match && match[1] && match[1].length > 20) {
            console.log('[FilterTweetRegion-Page] Bearer token found via __NEXT_DATA__');
            return match[1];
          }
        }
      } catch (e) {
        console.warn('[FilterTweetRegion-Page] Error accessing __NEXT_DATA__:', e);
      }
    }
    
    const defaultToken = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
    console.warn('[FilterTweetRegion-Page] Bearer token not found, using default token');
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
    console.log(`[FilterTweetRegion-Page] Fetching region for @${username}...`);
    
    const token = getBearerToken();
    const csrf = getCSRF();

    if (!csrf) {
      console.warn(`[FilterTweetRegion-Page] CSRF token not found for @${username}`);
      return "error_no_csrf";
    }
    
    if (!token) {
      console.warn(`[FilterTweetRegion-Page] Bearer token not found for @${username}`);
      return "error_no_token";
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
        console.warn(`[FilterTweetRegion-Page] Error response for @${username}:`, res.status);
        if (res.status === 401 || res.status === 403) {
          return "error_auth";
        }
        return "error_request";
      }

      const json = await res.json();
      const region = json?.data?.user_result_by_screen_name?.result?.about_profile?.account_based_in || null;
      
      console.log(`[FilterTweetRegion-Page] Região encontrada para @${username}:`, region || 'null');
      
      return region;
    } catch (error) {
      console.warn(`[FilterTweetRegion-Page] Error fetching region for @${username}:`, error);
      return "error_fetch";
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

