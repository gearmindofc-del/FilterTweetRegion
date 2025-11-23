function askRegion(username) {
  console.log(`[FilterTweetRegion] Solicitando região para @${username} via postMessage...`);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      console.warn(`[FilterTweetRegion] Timeout ao buscar região para @${username}`);
      resolve(null);
    }, 10000);

    function handler(e) {
      if (e.data?.type === "REGION_RESULT" && e.data.username === username) {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        console.log(`[FilterTweetRegion] Região recebida para @${username}:`, e.data.region);
        resolve(e.data.region);
      }
    }
    
    window.addEventListener("message", handler);
    window.postMessage({ type: "GET_REGION", username }, "*");
  });
}

async function getUserRegion(username) {
  return await askRegion(username);
}

