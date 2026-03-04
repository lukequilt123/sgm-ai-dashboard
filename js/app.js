/* ============================================================
   SGM AI Dashboard — Application JavaScript
   ============================================================ */

/* ── Data Service ────────────────────────────────────────── */

const DataService = {
  async fetch(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load data');
    return response.json();
  }
};

/* ── Nav Utility ─────────────────────────────────────────── */

function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.portal-nav__link').forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage ||
        (currentPage === 'index.html' && linkPage === 'home.html')) {
      link.classList.add('portal-nav__link--active');
    }
  });
}

/* ── Tools Page Module ───────────────────────────────────── */

const ToolsPage = {
  allTools: [],
  filteredTools: [],
  filterState: {
    search: '',
    platform: '',
    layer: '',
    category: '',
    type: ''
  },

  async init() {
    try {
      const data = await DataService.fetch(CONFIG.dataUrl);
      this.allTools = data.tools || [];
      this.populateFilterOptions();
      this.bindEvents();
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load tools:', err);
      document.getElementById('tool-grid').innerHTML = '';
      document.getElementById('tool-empty').classList.remove('hidden');
    }
  },

  populateFilterOptions() {
    const dimensions = {
      'filter-platform': { key: 'aiPlatform', label: 'All Platforms' },
      'filter-layer':    { key: 'aiLayer',    label: 'All Layers' },
      'filter-category': { key: 'category',   label: 'All Categories' },
      'filter-type':     { key: 'type',       label: 'All Types' }
    };

    for (const [selectId, config] of Object.entries(dimensions)) {
      const select = document.getElementById(selectId);
      const values = [...new Set(
        this.allTools.map(t => t[config.key]).filter(Boolean)
      )].sort();
      select.innerHTML =
        `<option value="">${config.label}</option>` +
        values.map(v => `<option value="${v}">${v}</option>`).join('');
    }
  },

  bindEvents() {
    // Search — debounced
    const searchInput = document.getElementById('tool-search');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filterState.search = e.target.value.trim().toLowerCase();
        this.applyFilters();
      }, 200);
    });

    // Dropdowns — immediate
    const dropdowns = [
      { id: 'filter-platform', key: 'platform' },
      { id: 'filter-layer',    key: 'layer' },
      { id: 'filter-category', key: 'category' },
      { id: 'filter-type',     key: 'type' }
    ];

    dropdowns.forEach(({ id, key }) => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.filterState[key] = e.target.value;
        this.applyFilters();
      });
    });
  },

  applyFilters() {
    this.filteredTools = this.allTools.filter(tool => {
      if (this.filterState.search &&
          !tool.name.toLowerCase().includes(this.filterState.search)) {
        return false;
      }
      if (this.filterState.platform && tool.aiPlatform !== this.filterState.platform) return false;
      if (this.filterState.layer && tool.aiLayer !== this.filterState.layer) return false;
      if (this.filterState.category && tool.category !== this.filterState.category) return false;
      if (this.filterState.type && tool.type !== this.filterState.type) return false;
      return true;
    });

    this.renderCards();
    this.renderActiveFilters();
    this.renderCount();
  },

  renderCards() {
    const grid = document.getElementById('tool-grid');
    const empty = document.getElementById('tool-empty');

    if (this.filteredTools.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = this.filteredTools.map((tool, i) =>
      this.buildCardHTML(tool, i)
    ).join('');
  },

  buildCardHTML(tool, index) {
    const hasLink = tool.link && tool.link.trim() !== '';
    const delay = Math.min(index * 0.05, 0.4);

    // Platform icon class & letter
    const platformKey = (tool.aiPlatform || '').toLowerCase().replace(/\s+/g, '');
    const platformMap = {
      chatgpt: { cls: 'chatgpt', letter: 'G' },
      claude: { cls: 'claude', letter: 'C' },
      gemini: { cls: 'gemini', letter: 'G' },
      midjourney: { cls: 'midjourney', letter: 'M' }
    };
    const pInfo = platformMap[platformKey] || { cls: 'default', letter: (tool.aiPlatform || '?')[0].toUpperCase() };
    const dotCls = 'platform-dot--' + pInfo.cls;

    return `
      <div class="tool-card glass-card fade-in" style="animation-delay: ${delay}s">
        <div class="tool-card__icon tool-card__icon--${pInfo.cls}">${pInfo.letter}</div>
        <div class="tool-card__name">${this.escapeHTML(tool.name)}</div>
        <div class="tool-card__category">${this.escapeHTML(tool.category)}</div>
        <div class="tool-card__popover">
          <div class="tool-card__pop-name">${this.escapeHTML(tool.name)}</div>
          <div class="tool-card__pop-platform">
            <span class="platform-dot ${dotCls}"></span>
            ${this.escapeHTML(tool.aiPlatform)} &middot; ${this.escapeHTML(tool.aiLayer)}
          </div>
          <p class="tool-card__pop-desc">${this.escapeHTML(tool.primaryUseCase)}</p>
          <div class="tool-card__pop-meta">
            <div>
              <div class="tool-card__pop-meta-label">Owner</div>
              <div class="tool-card__pop-meta-value">${this.escapeHTML(tool.owner)}</div>
            </div>
            <div>
              <div class="tool-card__pop-meta-label">Used By</div>
              <div class="tool-card__pop-meta-value">${this.escapeHTML(tool.beingUsedBy)}</div>
            </div>
          </div>
          ${hasLink
            ? `<a href="${this.escapeHTML(tool.link)}" target="_blank" rel="noopener" class="tool-card__pop-btn">
                 Open Tool
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
               </a>`
            : `<span class="tool-card__pop-btn tool-card__pop-btn--disabled">Coming Soon</span>`
          }
        </div>
      </div>`;
  },

  renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const activeFilters = [];

    if (this.filterState.platform)
      activeFilters.push({ key: 'platform', value: this.filterState.platform });
    if (this.filterState.layer)
      activeFilters.push({ key: 'layer', value: this.filterState.layer });
    if (this.filterState.category)
      activeFilters.push({ key: 'category', value: this.filterState.category });
    if (this.filterState.type)
      activeFilters.push({ key: 'type', value: this.filterState.type });

    if (activeFilters.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = activeFilters.map(f =>
      `<span class="filter-pill">
        ${this.escapeHTML(f.value)}
        <button class="filter-pill__remove" data-filter="${f.key}" aria-label="Remove ${f.value} filter">&times;</button>
      </span>`
    ).join('') +
    `<button class="filter-bar__clear btn-outline" onclick="ToolsPage.clearFilters()">Clear All</button>`;

    // Bind pill dismiss buttons
    container.querySelectorAll('.filter-pill__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.filter;
        this.filterState[key] = '';
        const selectMap = {
          platform: 'filter-platform',
          layer: 'filter-layer',
          category: 'filter-category',
          type: 'filter-type'
        };
        document.getElementById(selectMap[key]).value = '';
        this.applyFilters();
      });
    });
  },

  renderCount() {
    const countEl = document.getElementById('tool-count');
    const total = this.allTools.length;
    const showing = this.filteredTools.length;
    countEl.textContent = `Showing ${showing} of ${total} tool${total !== 1 ? 's' : ''}`;
  },

  clearFilters() {
    this.filterState = { search: '', platform: '', layer: '', category: '', type: '' };
    document.getElementById('tool-search').value = '';
    document.getElementById('filter-platform').value = '';
    document.getElementById('filter-layer').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-type').value = '';
    this.applyFilters();
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

/* ── Page Init ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();

  // Check auth
  if (!Auth.isAuthenticated()) return;

  // Detect current page and initialise
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === 'tools.html') {
    ToolsPage.init();
  }
});
