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
let availableFilter = '';
let selectedFilter = '';

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

function createCountryItem(country, isSelected) {
  const item = document.createElement('div');
  item.className = 'country-item';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'country-checkbox';
  checkbox.checked = isSelected;
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      if (!selectedCountries.includes(country)) {
        selectedCountries.push(country);
      }
    } else {
      selectedCountries = selectedCountries.filter(c => c !== country);
    }
    saveSettings();
    renderCountries();
  });
  
  const name = document.createElement('span');
  name.className = 'country-name';
  name.textContent = country;
  
  item.appendChild(checkbox);
  item.appendChild(name);
  
  return item;
}

function renderCountries() {
  const availableList = document.getElementById('availableList');
  const selectedList = document.getElementById('selectedList');
  const availableCount = document.getElementById('availableCount');
  const selectedCount = document.getElementById('selectedCount');
  
  availableList.innerHTML = '';
  selectedList.innerHTML = '';
  
  const available = countries.filter(country => 
    !selectedCountries.includes(country) &&
    country.toLowerCase().includes(availableFilter.toLowerCase())
  );
  
  const selected = selectedCountries
    .filter(country => country.toLowerCase().includes(selectedFilter.toLowerCase()))
    .sort();
  
  availableCount.textContent = available.length;
  selectedCount.textContent = selected.length;
  
  if (available.length === 0 && availableFilter) {
    availableList.innerHTML = '<div class="empty-state">No countries found</div>';
  } else if (available.length === 0) {
    availableList.innerHTML = '<div class="empty-state">All countries selected</div>';
  } else {
    available.forEach(country => {
      availableList.appendChild(createCountryItem(country, false));
    });
  }
  
  if (selected.length === 0 && selectedFilter) {
    selectedList.innerHTML = '<div class="empty-state">No countries found</div>';
  } else if (selected.length === 0) {
    selectedList.innerHTML = '<div class="empty-state">No countries selected</div>';
  } else {
    selected.forEach(country => {
      selectedList.appendChild(createCountryItem(country, true));
    });
  }
}

function saveSettings() {
  chrome.storage.sync.set({
    selectedCountries: selectedCountries,
    filterEnabled: filterEnabled
  }, () => {
    console.log('Settings saved:', { selectedCountries, filterEnabled });
  });
}

document.getElementById('filterToggle').addEventListener('click', () => {
  filterEnabled = !filterEnabled;
  updateToggle();
  saveSettings();
});

document.getElementById('searchBox').addEventListener('input', (e) => {
  availableFilter = e.target.value;
  renderCountries();
});

document.getElementById('searchSelectedBox').addEventListener('input', (e) => {
  selectedFilter = e.target.value;
  renderCountries();
});

document.getElementById('selectAllBtn').addEventListener('click', () => {
  const available = countries.filter(country => 
    !selectedCountries.includes(country) &&
    country.toLowerCase().includes(availableFilter.toLowerCase())
  );
  selectedCountries = [...new Set([...selectedCountries, ...available])];
  saveSettings();
  renderCountries();
});

document.getElementById('deselectAllBtn').addEventListener('click', () => {
  if (selectedFilter) {
    const toRemove = selectedCountries.filter(country => 
      country.toLowerCase().includes(selectedFilter.toLowerCase())
    );
    selectedCountries = selectedCountries.filter(c => !toRemove.includes(c));
  } else {
    selectedCountries = [];
  }
  saveSettings();
  renderCountries();
});

loadSettings();
