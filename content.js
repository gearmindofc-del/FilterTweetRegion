const processedTweets = new Set();
const pendingRequests = new Map();
let selectedCountries = [];
let filterEnabled = false;

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['selectedCountries', 'filterEnabled'], (result) => {
      selectedCountries = result.selectedCountries || [];
      filterEnabled = result.filterEnabled || false;
      console.log('[FilterTweetRegion] Configurações carregadas:', { selectedCountries, filterEnabled });
      resolve();
    });
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.selectedCountries) {
      selectedCountries = changes.selectedCountries.newValue || [];
      console.log('[FilterTweetRegion] Países atualizados:', selectedCountries);
      updateVisibleTweets();
    }
    if (changes.filterEnabled) {
      filterEnabled = changes.filterEnabled.newValue || false;
      console.log('[FilterTweetRegion] Filtro atualizado:', filterEnabled);
      updateVisibleTweets();
    }
  }
});

function updateVisibleTweets() {
  console.log('[FilterTweetRegion] Atualizando visibilidade dos tweets...');
  const allTweets = document.querySelectorAll('[data-testid="cellInnerDiv"]');
  console.log('[FilterTweetRegion] Total de tweets encontrados:', allTweets.length);
  
  allTweets.forEach(tweetContainer => {
    const regionContainer = tweetContainer.querySelector('.tweet-region-container');
    if (regionContainer) {
      const regionsStr = regionContainer.getAttribute('data-tweet-regions');
      const regions = regionsStr ? regionsStr.split(',').filter(r => r) : [];
      
      if (filterEnabled && selectedCountries.length > 0) {
        if (!shouldShowTweet(regions)) {
          tweetContainer.style.display = 'none';
          console.log('[FilterTweetRegion] Tweet ocultado:', regions);
        } else {
          tweetContainer.style.display = '';
          console.log('[FilterTweetRegion] Tweet visível:', regions);
        }
      } else {
        tweetContainer.style.display = '';
        console.log('[FilterTweetRegion] Filtro desativado, tweet visível');
      }
    } else {
      if (filterEnabled && selectedCountries.length > 0) {
        tweetContainer.style.display = 'none';
      } else {
        tweetContainer.style.display = '';
      }
    }
  });
}

function extractUsernames(tweetElement) {
  console.log('[FilterTweetRegion] Extraindo usernames do tweet...');
  const usernames = new Set();
  const excludedPaths = new Set(['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose', 'bookmarks', 'lists', 'communities', 'status', 'hashtag']);
  
  const tweetTextElement = tweetElement.querySelector('[data-testid="tweetText"]') || tweetElement;
  console.log('[FilterTweetRegion] Elemento de texto encontrado:', !!tweetTextElement);
  
  const allSpans = tweetElement.querySelectorAll('span');
  console.log('[FilterTweetRegion] Total de spans encontrados:', allSpans.length);
  
  allSpans.forEach(span => {
    const text = span.textContent || span.innerText || '';
    const trimmedText = text.trim();
    
    if (trimmedText.startsWith('@') && trimmedText.length > 1) {
      const username = trimmedText.substring(1).split(/\s/)[0].split('\n')[0];
      if (username && username.length > 0 && username.length < 16 && /^[a-zA-Z0-9_]+$/.test(username)) {
        usernames.add(username);
        console.log('[FilterTweetRegion] Username encontrado via span:', username, 'Texto completo:', trimmedText);
      }
    }
  });
  
  const allLinks = tweetElement.querySelectorAll('a[href^="/"]');
  console.log('[FilterTweetRegion] Links encontrados:', allLinks.length);
  
  allLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('/')) {
      const pathParts = href.split('/').filter(p => p && !p.includes('?') && !p.includes('#'));
      if (pathParts.length > 0) {
        const firstPart = pathParts[0];
        if (!excludedPaths.has(firstPart) && 
            firstPart.length > 0 && 
            firstPart.length < 16 &&
            /^[a-zA-Z0-9_]+$/.test(firstPart)) {
          const linkText = link.textContent || link.innerText || '';
          const linkSpans = link.querySelectorAll('span');
          let hasAtSymbol = false;
          
          linkSpans.forEach(span => {
            const spanText = span.textContent || span.innerText || '';
            if (spanText.trim().startsWith('@')) {
              hasAtSymbol = true;
            }
          });
          
          if (linkText.trim().startsWith('@') || hasAtSymbol || link.closest('[data-testid="tweetText"]')) {
            usernames.add(firstPart);
            console.log('[FilterTweetRegion] Username encontrado via link:', firstPart, 'Link text:', linkText);
          }
        }
      }
    }
  });
  
  const allText = tweetElement.textContent || tweetElement.innerText || '';
  const mentionRegex = /@([a-zA-Z0-9_]{1,15})\b/g;
  let match;
  while ((match = mentionRegex.exec(allText)) !== null) {
    usernames.add(match[1]);
    console.log('[FilterTweetRegion] Username encontrado via regex:', match[1]);
  }
  
  console.log('[FilterTweetRegion] Total de usernames encontrados:', usernames.size, Array.from(usernames));
  return Array.from(usernames);
}

function createRegionElement(region) {
  const regionBadge = document.createElement('span');
  regionBadge.className = 'tweet-region-badge';
  
  if (region && (region.startsWith('error_') || region === 'error_timeout')) {
    regionBadge.classList.add('error');
    const errorType = region.replace('error_', '');
    const errorMessages = {
      'no_csrf': '⚠️ Auth Error',
      'no_token': '⚠️ Token Error',
      'auth': '⚠️ Auth Failed',
      'request': '⚠️ Request Error',
      'fetch': '⚠️ Network Error',
      'timeout': '⚠️ Timeout'
    };
    regionBadge.textContent = errorMessages[errorType] || '⚠️ Error';
    return regionBadge;
  }
  
  const regionText = region ? region : 'Unknown';
  regionBadge.textContent = region ? `📍 ${regionText}` : '📍 Unknown';
  if (!region) {
    regionBadge.classList.add('unknown');
  }
  return regionBadge;
}

function findTweetContainer(element) {
  let current = element;
  while (current && current !== document.body) {
    if (current.getAttribute('data-testid') === 'tweet' || 
        current.querySelector('[data-testid="tweet"]')) {
      return current.getAttribute('data-testid') === 'tweet' 
        ? current 
        : current.querySelector('[data-testid="tweet"]');
    }
    current = current.parentElement;
  }
  return null;
}

function shouldShowTweet(regions) {
  if (!filterEnabled || selectedCountries.length === 0) {
    return true;
  }
  
  if (!regions || regions.length === 0) {
    return false;
  }
  
  const validRegions = regions.filter(r => r && r !== "rate_limited" && !r.startsWith('error_') && r !== "error_timeout");
  
  if (validRegions.length === 0) {
    return false;
  }

  return validRegions.some(region => {
    const regionLower = region.toLowerCase().trim();
    return selectedCountries.some(country => {
      const countryLower = country.toLowerCase().trim();
      return regionLower === countryLower || 
             regionLower.includes(countryLower) || 
             countryLower.includes(regionLower);
    });
  });
}

async function processTweet(tweetElement) {
  console.log('[FilterTweetRegion] Processando tweet...');
  
  const article = tweetElement.querySelector('article[role="article"]') || tweetElement.closest('article[role="article"]') || tweetElement;
  const tweetId = article.getAttribute('data-tweet-id') || 
                  tweetElement.getAttribute('data-tweet-id') || 
                  tweetElement.querySelector('[data-testid="tweet"]')?.getAttribute('data-tweet-id') ||
                  Array.from(article.querySelectorAll('*')).map(el => el.getAttribute('data-tweet-id')).find(id => id);
  
  let uniqueId;
  if (!tweetId) {
    const statusLink = article.querySelector('a[href*="/status/"]');
    if (statusLink) {
      const href = statusLink.getAttribute('href');
      const statusMatch = href.match(/\/status\/(\d+)/);
      if (statusMatch) {
        uniqueId = statusMatch[1];
      }
    }
    if (!uniqueId) {
      uniqueId = article.innerHTML.substring(0, 200).replace(/\s/g, '');
    }
  } else {
    uniqueId = tweetId;
  }
  
  console.log('[FilterTweetRegion] Tweet ID:', uniqueId);
  
  if (processedTweets.has(uniqueId)) {
    console.log('[FilterTweetRegion] Tweet já processado:', uniqueId);
    return;
  }
  processedTweets.add(uniqueId);

  const usernames = extractUsernames(article);
  if (usernames.length === 0) {
    console.log('[FilterTweetRegion] Nenhum username encontrado no tweet');
    return;
  }

  const regionContainer = document.createElement('div');
  regionContainer.className = 'tweet-region-container';
  regionContainer.setAttribute('data-tweet-regions', '');

  const regions = [];
  const regionPromises = [];
  const uniqueRegions = new Set();

  for (const username of usernames) {
    // Verifica se já está sendo processado ou já foi processado
    if (pendingRequests.has(username)) {
      const existingRegion = pendingRequests.get(username);
      if (existingRegion && existingRegion !== "rate_limited" && existingRegion !== null) {
        if (!existingRegion.startsWith('error_') && existingRegion !== "error_timeout") {
          uniqueRegions.add(existingRegion);
          regions.push(existingRegion);
        }
      }
      continue;
    }

    // Marca como pendente
    pendingRequests.set(username, null);
    
    const regionPromise = getUserRegion(username).then(region => {
      // Atualiza o cache de requisições pendentes
      pendingRequests.set(username, region || "error_timeout");
      
      if (region && region !== "rate_limited" && !region.startsWith('error_') && region !== "error_timeout") {
        uniqueRegions.add(region);
        regions.push(region);
      } else if (region && (region.startsWith('error_') || region === "error_timeout")) {
        regions.push(region || "error_timeout");
      }
      
      // Atualiza UI quando todas as requisições terminarem
      const validRegions = Array.from(uniqueRegions);
      const errorRegions = regions.filter(r => r && (r.startsWith('error_') || r === "error_timeout"));
      
      regionContainer.setAttribute('data-tweet-regions', validRegions.join(','));
      
      if (errorRegions.length > 0 && errorRegions.length === regions.length) {
        // Só mostra erro se todas falharem
        regionContainer.innerHTML = '';
        const errorType = errorRegions.find(r => r === "error_timeout") ? "error_timeout" : errorRegions[0];
        const badge = createRegionElement(errorType);
        regionContainer.appendChild(badge);
      } else if (validRegions.length > 0) {
        regionContainer.innerHTML = '';
        validRegions.forEach(reg => {
          const badge = createRegionElement(reg);
          regionContainer.appendChild(badge);
        });
      } else if (regions.length === usernames.length && uniqueRegions.size === 0 && errorRegions.length === 0) {
        // Todas as requisições retornaram null (sem região)
        regionContainer.innerHTML = '';
        const badge = createRegionElement(null);
        regionContainer.appendChild(badge);
      }
      
      return region;
    }).catch((error) => {
      console.warn(`[FilterTweetRegion] Error fetching region for @${username}:`, error);
      pendingRequests.set(username, "error_fetch");
      regions.push("error_fetch");
      
      if (regions.length === usernames.length && uniqueRegions.size === 0) {
        regionContainer.innerHTML = '';
        const badge = createRegionElement("error_fetch");
        regionContainer.appendChild(badge);
      }
      return "error_fetch";
    });
    
    regionPromises.push(regionPromise);
  }
  
  if (usernames.length > 0) {
    const loadingBadge = createRegionElement(null);
    loadingBadge.textContent = '📍 Loading...';
    loadingBadge.classList.add('loading');
    regionContainer.appendChild(loadingBadge);
  }

  if (regionContainer.children.length > 0) {
    const tweetText = article.querySelector('[data-testid="tweetText"]');
    let insertTarget = null;
    
    if (tweetText) {
      const tweetTextParent = tweetText.parentElement;
      const existingContainer = tweetTextParent.querySelector('.tweet-region-container');
      if (!existingContainer) {
        tweetTextParent.appendChild(regionContainer);
        console.log('[FilterTweetRegion] Container de região inserido após tweetText');
      } else {
        console.log('[FilterTweetRegion] Container de região já existe');
      }
      return;
    }
    
    const textDiv = article.querySelector('div[dir="auto"][lang]');
    if (textDiv) {
      const existingContainer = textDiv.parentElement.querySelector('.tweet-region-container');
      if (!existingContainer) {
        textDiv.parentElement.appendChild(regionContainer);
        console.log('[FilterTweetRegion] Container de região inserido após div[lang]');
      } else {
        console.log('[FilterTweetRegion] Container de região já existe');
      }
      return;
    }
    
    const existingContainer = article.querySelector('.tweet-region-container');
    if (!existingContainer) {
      article.appendChild(regionContainer);
      console.log('[FilterTweetRegion] Container de região inserido no article');
    } else {
      console.log('[FilterTweetRegion] Container de região já existe');
    }
  }
  
  Promise.all(regionPromises).then(() => {
    const validRegions = Array.from(uniqueRegions);
    console.log('[FilterTweetRegion] All regions loaded:', validRegions);
    
    if (filterEnabled && selectedCountries.length > 0) {
      const cellInnerDiv = article.closest('[data-testid="cellInnerDiv"]');
      if (cellInnerDiv) {
        if (!shouldShowTweet(validRegions)) {
          cellInnerDiv.style.display = 'none';
          console.log('[FilterTweetRegion] Tweet hidden (region not selected):', validRegions, 'Selected countries:', selectedCountries);
        } else {
          cellInnerDiv.style.display = '';
          console.log('[FilterTweetRegion] Tweet visible (region selected):', validRegions);
        }
      }
    } else {
      const cellInnerDiv = article.closest('[data-testid="cellInnerDiv"]');
      if (cellInnerDiv) {
        cellInnerDiv.style.display = '';
      }
    }
  });
}

function findTweetArticle(element) {
  if (!element) return null;
  
  if (element.getAttribute?.('role') === 'article' && 
      (element.getAttribute('data-testid') === 'tweet' || element.querySelector('[data-testid="tweetText"]'))) {
    return element;
  }
  
  const article = element.querySelector?.('article[role="article"]');
  if (article) return article;
  
  const tweetByTestId = element.querySelector?.('[data-testid="tweet"]');
  if (tweetByTestId) return tweetByTestId;
  
  return null;
}

function observeTweets() {
  console.log('[FilterTweetRegion] Iniciando observador de tweets...');
  
  const observer = new MutationObserver((mutations) => {
    const tweetElements = new Set();
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const article = findTweetArticle(node);
          
          if (article) {
            tweetElements.add(article);
            console.log('[FilterTweetRegion] Novo tweet detectado via MutationObserver');
          }
          
          if (node.getAttribute?.('data-testid') === 'cellInnerDiv') {
            const articleInside = findTweetArticle(node);
            if (articleInside) {
              tweetElements.add(articleInside);
              console.log('[FilterTweetRegion] Novo tweet detectado dentro de cellInnerDiv');
            }
          }
        }
      });
    });

    tweetElements.forEach(tweet => {
      setTimeout(() => processTweet(tweet), 100);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  const existingTweets = document.querySelectorAll('article[role="article"]');
  console.log('[FilterTweetRegion] Tweets existentes encontrados:', existingTweets.length);
  existingTweets.forEach(tweet => {
    setTimeout(() => processTweet(tweet), 500);
  });
  
  const cellInnerDivs = document.querySelectorAll('[data-testid="cellInnerDiv"]');
  console.log('[FilterTweetRegion] Containers cellInnerDiv encontrados:', cellInnerDivs.length);
  cellInnerDivs.forEach(container => {
    const article = findTweetArticle(container);
    if (article) {
      setTimeout(() => processTweet(article), 500);
    }
  });
}

function injectPageScript() {
  if (document.getElementById('filter-tweet-region-page-script')) {
    console.log('[FilterTweetRegion] Script page_context.js já foi injetado');
    return;
  }
  
  const script = document.createElement('script');
  script.id = 'filter-tweet-region-page-script';
  script.src = chrome.runtime.getURL('page_context.js');
  script.onload = function() {
    console.log('[FilterTweetRegion] Script page_context.js injetado com sucesso');
    this.remove();
  };
  script.onerror = function() {
    console.error('[FilterTweetRegion] Erro ao injetar page_context.js');
  };
  
  if (document.head) {
    document.head.appendChild(script);
  } else if (document.documentElement) {
    document.documentElement.appendChild(script);
  } else {
    setTimeout(() => injectPageScript(), 100);
  }
}

async function init() {
  await loadSettings();
  injectPageScript();
  
  setTimeout(() => {
    observeTweets();
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

