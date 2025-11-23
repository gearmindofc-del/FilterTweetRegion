function askRegion(username) {
  console.log(`[FilterTweetRegion] Solicitando região para @${username} via postMessage...`);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      console.warn(`[FilterTweetRegion] ⚠️ Timeout ao buscar região para @${username} (5s) - usando fallback`);
      // Nunca retorna null, sempre usa fallback
      // O page_context já deve ter retornado um país aleatório, mas se não retornou, vamos pedir novamente
      resolve({ region: null, isRandom: false, needsFallback: true });
    }, 5000); // Reduzido de 10s para 5s

    function handler(e) {
      if (e.data?.type === "REGION_RESULT" && e.data.username === username) {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        // Se a região for null, marca como precisa de fallback
        if (!e.data.region || e.data.region === null) {
          console.log(`[FilterTweetRegion] ⚠️ Região null recebida para @${username} - usando fallback`);
          resolve({ region: null, isRandom: false, needsFallback: true });
        } else {
          console.log(`[FilterTweetRegion] ✅ Região recebida para @${username}:`, e.data.region, e.data.isRandom ? '(aleatório)' : '(real)');
          resolve({ 
            region: e.data.region, 
            isRandom: e.data.isRandom || false 
          });
        }
      }
    }
    
    window.addEventListener("message", handler);
    window.postMessage({ type: "GET_REGION", username }, "*");
  });
}

async function getUserRegion(username) {
  return await askRegion(username);
}

