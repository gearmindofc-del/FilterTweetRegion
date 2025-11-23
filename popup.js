const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Finland',
  'France', 'Germany', 'Greece', 'Hungary', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya', 'Malaysia',
  'Mexico', 'Morocco', 'Netherlands', 'Nigeria', 'Norway', 'Pakistan',
  'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia', 'Saudi Arabia',
  'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
  'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Venezuela', 'Vietnam'
].sort();

let selectedCountries = [];
let filterEnabled = false;

function loadSettings() {
  chrome.storage.sync.get(['selectedCountries', 'filterEnabled'], (result) => {
    selectedCountries = result.selectedCountries || [];
    filterEnabled = result.filterEnabled || false;
    
    updateToggle();
    renderCountries();
  });
}

function updateToggle() {
  const toggle = document.getElementById('filterToggle');
  if (filterEnabled) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

function renderCountries(filter = '') {
  const list = document.getElementById('countriesList');
  list.innerHTML = '';
  
  const filtered = countries.filter(country => 
    country.toLowerCase().includes(filter.toLowerCase())
  );
  
  filtered.forEach(country => {
    const item = document.createElement('div');
    item.className = 'country-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'country-checkbox';
    checkbox.checked = selectedCountries.includes(country);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!selectedCountries.includes(country)) {
          selectedCountries.push(country);
        }
      } else {
        selectedCountries = selectedCountries.filter(c => c !== country);
      }
      saveSettings();
    });
    
    const name = document.createElement('span');
    name.className = 'country-name';
    name.textContent = country;
    
    item.appendChild(checkbox);
    item.appendChild(name);
    list.appendChild(item);
  });
}

function saveSettings() {
  chrome.storage.sync.set({
    selectedCountries: selectedCountries,
    filterEnabled: filterEnabled
  }, () => {
    console.log('Configurações salvas:', { selectedCountries, filterEnabled });
  });
}

document.getElementById('filterToggle').addEventListener('click', () => {
  filterEnabled = !filterEnabled;
  updateToggle();
  saveSettings();
});

document.getElementById('searchBox').addEventListener('input', (e) => {
  renderCountries(e.target.value);
});

loadSettings();

