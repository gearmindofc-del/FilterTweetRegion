(function() {
  'use strict';

  let cachedBearerToken = null;
  let cachedHeaders = null;
  const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
  const TOKEN_CACHE_KEY = 'filter_tweet_region_bearer_token';
  const TOKEN_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

  // Carrega token do localStorage ao iniciar
  function loadCachedToken() {
    try {
      const stored = localStorage.getItem(TOKEN_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.timestamp && (Date.now() - parsed.timestamp) < TOKEN_CACHE_EXPIRY) {
          cachedBearerToken = parsed.token;
          console.log('[FilterTweetRegion-Page] ✅ Bearer token carregado do cache');
          return true;
        } else {
          // Token expirado, remove do cache
          localStorage.removeItem(TOKEN_CACHE_KEY);
        }
      }
    } catch (e) {
      console.warn('[FilterTweetRegion-Page] Erro ao carregar token do cache:', e);
    }
    return false;
  }

  // Salva token no localStorage
  function saveCachedToken(token) {
    try {
      const tokenData = {
        token: token,
        timestamp: Date.now()
      };
      localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(tokenData));
      console.log('[FilterTweetRegion-Page] ✅ Bearer token salvo no cache');
    } catch (e) {
      console.warn('[FilterTweetRegion-Page] Erro ao salvar token no cache:', e);
    }
  }

  // Carrega token ao iniciar
  loadCachedToken();
  const REQUEST_INTERVAL = 500; // Reduzido de 1000ms para 500ms
  const MAX_REQUESTS_PER_MINUTE = 20; // Aumentado de 15 para 20
  const DEBOUNCE_MIN = 100; // Reduzido de 500ms
  const DEBOUNCE_MAX = 300; // Reduzido de 1500ms
  const FETCH_TIMEOUT = 8000; // Timeout de 8 segundos para requisições

  // Interceptação melhorada de fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, opts] = args;
    
    // Captura Bearer token de qualquer requisição para x.com/i/api
    if (url && typeof url === 'string' && url.includes('x.com/i/api')) {
      if (opts?.headers) {
        const headers = opts.headers;
        let authHeader = null;
        let csrfHeader = null;
        
        // Suporta Headers object e plain object
        if (headers instanceof Headers) {
          authHeader = headers.get('authorization') || headers.get('Authorization');
          csrfHeader = headers.get('x-csrf-token') || headers.get('X-Csrf-Token');
        } else if (typeof headers === 'object') {
          authHeader = headers['authorization'] || headers['Authorization'] || headers['authorization'];
          csrfHeader = headers['x-csrf-token'] || headers['X-Csrf-Token'] || headers['x-csrf-token'];
        }
        
        // Captura Bearer token
        if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer '))) {
          const token = authHeader.substring(7).trim();
          if (token.length > 50 && token.length < 200) {
            if (!cachedBearerToken || cachedBearerToken.length < 50) {
              cachedBearerToken = token;
              saveCachedToken(token); // Salva no localStorage
              console.log('[FilterTweetRegion-Page] ✅ Bearer token captured from fetch:', token.substring(0, 30) + '...');
            }
          }
        }
        
        // Captura headers completos na primeira vez
        if (!cachedHeaders && (authHeader || cachedBearerToken)) {
          const csrf = csrfHeader || getCSRF();
          
          cachedHeaders = {
            'authorization': authHeader || `Bearer ${cachedBearerToken || ''}`,
            'x-csrf-token': csrf,
            'x-twitter-active-user': headers instanceof Headers ? headers.get('x-twitter-active-user') : (headers['x-twitter-active-user'] || 'yes'),
            'x-twitter-auth-type': headers instanceof Headers ? headers.get('x-twitter-auth-type') : (headers['x-twitter-auth-type'] || 'OAuth2Session'),
            'x-twitter-client-language': headers instanceof Headers ? headers.get('x-twitter-client-language') : (headers['x-twitter-client-language'] || 'pt'),
            'content-type': headers instanceof Headers ? headers.get('content-type') : (headers['content-type'] || 'application/json'),
            'accept': headers instanceof Headers ? headers.get('accept') : (headers['accept'] || '*/*'),
            'Referer': headers instanceof Headers ? headers.get('Referer') : (headers['Referer'] || 'https://x.com/'),
          };
          
          console.log('[FilterTweetRegion-Page] ✅ Headers captured from fetch');
        }
      }
    }
    
    return originalFetch.apply(this, args);
  };

  // Interceptação de XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._url && typeof this._url === 'string' && this._url.includes('x.com/i/api')) {
      this.addEventListener('readystatechange', function() {
        if (this.readyState === 1) { // OPENED
          try {
            const auth = this.getRequestHeader ? this.getRequestHeader('Authorization') : null;
            if (auth && (auth.startsWith('Bearer ') || auth.startsWith('bearer '))) {
              const token = auth.substring(7).trim();
              if (token.length > 50 && token.length < 200) {
            if (!cachedBearerToken || cachedBearerToken.length < 50) {
              cachedBearerToken = token;
              saveCachedToken(token); // Salva no localStorage
              console.log('[FilterTweetRegion-Page] ✅ Bearer token captured from XHR:', token.substring(0, 30) + '...');
            }
              }
            }
          } catch (e) {
            // Alguns navegadores não permitem acesso aos headers
          }
        }
      }, { once: true });
    }
    return originalXHRSend.apply(this, arguments);
  };

  function getBearerToken() {
    if (cachedBearerToken) {
      return cachedBearerToken;
    }
    
    const tokenPatterns = [
      /Bearer\s+([A-Za-z0-9\-_~+/=]+)/g,
      /"authorization"\s*:\s*"Bearer\s+([A-Za-z0-9\-_~+/=]+)"/gi,
      /'authorization'\s*:\s*'Bearer\s+([A-Za-z0-9\-_~+/=]+)'/gi,
      /Authorization["']?\s*:\s*["']?Bearer\s+([A-Za-z0-9\-_~+/=]+)/gi,
    ];
    
    function extractTokenFromText(text) {
      if (!text || text.length < 50) return null;
      for (const pattern of tokenPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          if (match && match[1] && match[1].length > 50 && match[1].length < 200) {
            return match[1];
          }
        }
      }
      return null;
    }
    
    const scripts = document.querySelectorAll("script");
    for (const s of scripts) {
      const token = extractTokenFromText(s.textContent || s.innerText || '');
      if (token) {
        cachedBearerToken = token;
        saveCachedToken(token); // Salva no localStorage
        console.log('[FilterTweetRegion-Page] ✅ Bearer token found via script');
        return token;
      }
    }
    
    const defaultToken = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
    console.warn('[FilterTweetRegion-Page] Bearer token not found, using default');
    return defaultToken;
  }

  function getCSRF() {
    const cookie = document.cookie.split("; ").find(x => x.startsWith("ct0="));
    if (cookie) {
      return cookie.split("=")[1];
    }
    return "";
  }

  function getHeaders() {
    const csrf = getCSRF();
    
    if (cachedHeaders && cachedBearerToken) {
      const headers = { ...cachedHeaders };
      headers['x-csrf-token'] = csrf;
      headers['authorization'] = `Bearer ${cachedBearerToken}`;
      return headers;
    }
    
    const token = getBearerToken();
    return {
      'authorization': `Bearer ${token}`,
      'x-csrf-token': csrf,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'pt',
      'content-type': 'application/json',
      'accept': '*/*',
      'Referer': 'https://x.com/',
    };
  }

  let tokenCaptureAttempts = 0;
  const MAX_TOKEN_CAPTURE_ATTEMPTS = 10; // Reduzido de 30 para 10 segundos
  
  async function waitForTokenCapture() {
    if (cachedBearerToken && cachedBearerToken.length > 50) {
      return true;
    }
    
    return new Promise((resolve) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (cachedBearerToken && cachedBearerToken.length > 50) {
          clearInterval(checkInterval);
          console.log('[FilterTweetRegion-Page] ✅ Bearer token captured after waiting');
          resolve(true);
        } else if (attempts >= MAX_TOKEN_CAPTURE_ATTEMPTS) {
          clearInterval(checkInterval);
          console.warn('[FilterTweetRegion-Page] ⚠️ Bearer token not captured, will use default (may have rate limits)');
          resolve(false);
        }
      }, 1000);
    });
  }

  const regionCache = new Map();

  async function getCachedRegion(username) {
    const cacheKey = `region_${username}`;
    const cached = regionCache.get(cacheKey);
    
    if (cached && cached.timestamp && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      console.log(`[FilterTweetRegion-Page] Cache hit for @${username}:`, cached.region);
      return cached.region;
    }
    
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_EXPIRY) {
          regionCache.set(cacheKey, parsed);
          console.log(`[FilterTweetRegion-Page] Cache hit from localStorage for @${username}:`, parsed.region);
          return parsed.region;
        }
      }
    } catch (e) {
      console.warn(`[FilterTweetRegion-Page] Error reading cache for @${username}:`, e);
    }
    
    return null;
  }

  async function setCachedRegion(username, region) {
    const cacheKey = `region_${username}`;
    const cacheData = {
      region: region,
      timestamp: Date.now()
    };
    
    regionCache.set(cacheKey, cacheData);
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (e) {
      console.warn(`[FilterTweetRegion-Page] Error saving cache for @${username}:`, e);
    }
  }

  let requestQueue = [];
  let isProcessingQueue = false;
  let lastRequestTime = 0;
  let requestCount = 0;
  let minuteStartTime = Date.now();
  let debounceTimers = new Map();

  function resetMinuteCounter() {
    const now = Date.now();
    if (now - minuteStartTime >= 60000) {
      requestCount = 0;
      minuteStartTime = now;
    }
  }

  async function processRequestQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    console.log(`[FilterTweetRegion-Page] Processing queue with ${requestQueue.length} requests`);
    
    while (requestQueue.length > 0) {
      resetMinuteCounter();
      
      if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
        const waitTime = 60000 - (Date.now() - minuteStartTime);
        if (waitTime > 0) {
          console.log(`[FilterTweetRegion-Page] Rate limit reached (${requestCount}/${MAX_REQUESTS_PER_MINUTE}), waiting ${Math.ceil(waitTime/1000)}s`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          requestCount = 0;
          minuteStartTime = Date.now();
        }
      }
      
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (timeSinceLastRequest < REQUEST_INTERVAL) {
        const waitTime = REQUEST_INTERVAL - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const { username, resolve, reject } = requestQueue.shift();
      lastRequestTime = Date.now();
      requestCount++;
      
      console.log(`[FilterTweetRegion-Page] Processing @${username} (${requestCount}/${MAX_REQUESTS_PER_MINUTE} this minute)`);
      
      try {
        const region = await fetchRegion(username);
        resolve(region);
      } catch (error) {
        console.error(`[FilterTweetRegion-Page] Error processing @${username}:`, error);
        reject(error);
      }
    }
    
    isProcessingQueue = false;
    console.log('[FilterTweetRegion-Page] Queue processing complete');
  }

  async function fetchRegion(username) {
    const cached = await getCachedRegion(username);
    if (cached !== null) {
      return cached;
    }

    // Aguarda token apenas se não tiver (com timeout menor)
    if (!cachedBearerToken || cachedBearerToken.length < 50) {
      const tokenCaptured = await Promise.race([
        waitForTokenCapture(),
        new Promise(resolve => setTimeout(() => resolve(false), 3000)) // Timeout de 3s
      ]);
      if (!tokenCaptured && !cachedBearerToken) {
        console.warn(`[FilterTweetRegion-Page] Token not captured in time for @${username}`);
      }
    }

    const csrf = getCSRF();
    if (!csrf) {
      console.warn(`[FilterTweetRegion-Page] CSRF token not found for @${username}`);
      return "error_no_csrf";
    }

    const token = cachedBearerToken || getBearerToken();
    const isDefaultToken = token.includes('AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs');
    
    if (isDefaultToken) {
      console.warn(`[FilterTweetRegion-Page] Using default token for @${username} - rate limits may apply`);
    }

    const headers = getHeaders();
    const url = `https://x.com/i/api/graphql/XRqGa7EeokUU5kppkh13EA/AboutAccountQuery?variables=${encodeURIComponent(JSON.stringify({ screenName: username }))}`;
    
    console.log(`[FilterTweetRegion-Page] Fetching region for @${username}...`);

    try {
      // Adiciona timeout à requisição
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const res = await originalFetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log(`[FilterTweetRegion-Page] Response for @${username}:`, res.status, res.statusText);

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after') || res.headers.get('x-rate-limit-reset');
        const rateLimitRemaining = res.headers.get('x-rate-limit-remaining');
        const rateLimitReset = res.headers.get('x-rate-limit-reset');
        
        console.warn(`[FilterTweetRegion-Page] Rate limit (429) for @${username}, remaining: ${rateLimitRemaining}, reset: ${rateLimitReset}`);
        
        if (rateLimitReset) {
          const resetTime = parseInt(rateLimitReset) * 1000;
          const now = Date.now();
          const waitTime = Math.max(0, resetTime - now);
          
          if (waitTime > 0 && waitTime < 300000) {
            console.log(`[FilterTweetRegion-Page] Rate limit reset in ${Math.ceil(waitTime/1000)}s, waiting...`);
            requestCount = MAX_REQUESTS_PER_MINUTE;
            minuteStartTime = now;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            requestCount = 0;
            minuteStartTime = Date.now();
          }
        } else if (retryAfter) {
          const waitTime = parseInt(retryAfter) * 1000;
          console.log(`[FilterTweetRegion-Page] Retry after ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)));
        }
        
        return "rate_limited";
      }

      if (!res.ok) {
        console.warn(`[FilterTweetRegion-Page] Error response for @${username}:`, res.status);
        if (res.status === 401 || res.status === 403) {
          cachedBearerToken = null;
          cachedHeaders = null;
          // Remove token inválido do cache
          try {
            localStorage.removeItem(TOKEN_CACHE_KEY);
          } catch (e) {}
          console.warn(`[FilterTweetRegion-Page] Auth error, clearing cached tokens`);
          return "error_auth";
        }
        return "error_request";
      }

      const json = await res.json();
      const region = json?.data?.user_result_by_screen_name?.result?.about_profile?.account_based_in || null;
      
      await setCachedRegion(username, region);
      console.log(`[FilterTweetRegion-Page] Region found for @${username}:`, region || 'null');
      
      return region;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`[FilterTweetRegion-Page] Request timeout for @${username}`);
        return "error_timeout";
      }
      console.error(`[FilterTweetRegion-Page] Fetch error for @${username}:`, error);
      return "error_fetch";
    }
  }

  async function getRegion(username) {
    // Verifica cache primeiro antes de adicionar à fila
    const cached = await getCachedRegion(username);
    if (cached !== null) {
      return cached;
    }
    
    return new Promise((resolve, reject) => {
      // Remove debounce antigo se existir
      if (debounceTimers.has(username)) {
        clearTimeout(debounceTimers.get(username));
      }
      
      // Debounce reduzido para melhor performance
      const debounceTime = DEBOUNCE_MIN + Math.random() * (DEBOUNCE_MAX - DEBOUNCE_MIN);
      const timer = setTimeout(() => {
        debounceTimers.delete(username);
        requestQueue.push({ username, resolve, reject });
        processRequestQueue();
      }, debounceTime);
      
      debounceTimers.set(username, timer);
    });
  }

  window.addEventListener("message", async (e) => {
    if (e.data?.type === "GET_REGION") {
      const region = await getRegion(e.data.username);
      window.postMessage({ 
        type: "REGION_RESULT", 
        username: e.data.username, 
        region 
      }, "*");
    }
  });

  console.log('[FilterTweetRegion-Page] Script injected and ready');
})();
