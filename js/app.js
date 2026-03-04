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

/* ── Shared HTML Escape ──────────────────────────────────── */

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ── Tools Page Module ───────────────────────────────────── */

const ToolsPage = {
  allTools: [],
  filteredTools: [],
  filterState: {
    search: '',
    platform: '',
    aiType: '',
    category: ''
  },

  async init() {
    try {
      const data = await DataService.fetch(CONFIG.toolsDataUrl);
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
      'filter-aitype':   { key: 'aiType',     label: 'All Types' },
      'filter-category': { key: 'category',   label: 'All Categories' }
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
    const searchInput = document.getElementById('tool-search');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filterState.search = e.target.value.trim().toLowerCase();
        this.applyFilters();
      }, 200);
    });

    const dropdowns = [
      { id: 'filter-platform', key: 'platform' },
      { id: 'filter-aitype',   key: 'aiType' },
      { id: 'filter-category', key: 'category' }
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
      if (this.filterState.aiType && tool.aiType !== this.filterState.aiType) return false;
      if (this.filterState.category && tool.category !== this.filterState.category) return false;
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
    const hasPromptLink = tool.promptLink && tool.promptLink.trim() !== '';
    const hasToolLink = tool.link && tool.link.trim() !== '';
    const delay = Math.min(index * 0.05, 0.4);

    // Platform icon class & letter
    const platformKey = (tool.aiPlatform || '').toLowerCase().replace(/\s+/g, '');
    const platformMap = {
      chatgpt: { cls: 'chatgpt', letter: 'G' },
      openai:  { cls: 'chatgpt', letter: 'G' },
      claude:  { cls: 'claude', letter: 'C' },
      gemini:  { cls: 'gemini', letter: 'G' },
      midjourney: { cls: 'midjourney', letter: 'M' }
    };
    const pInfo = platformMap[platformKey] || { cls: 'default', letter: (tool.aiPlatform || '?')[0].toUpperCase() };
    const dotCls = 'platform-dot--' + pInfo.cls;

    // Build button HTML
    let buttonsHTML = '';
    if (hasPromptLink || hasToolLink) {
      buttonsHTML = '<div class="tool-card__pop-buttons">';
      if (hasPromptLink) {
        buttonsHTML += `<a href="${escapeHTML(tool.promptLink)}" target="_blank" rel="noopener" class="tool-card__pop-btn tool-card__pop-btn--outline">
          Explore
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </a>`;
      }
      if (hasToolLink) {
        buttonsHTML += `<a href="${escapeHTML(tool.link)}" target="_blank" rel="noopener" class="tool-card__pop-btn">
          Use Tool
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
        </a>`;
      }
      buttonsHTML += '</div>';
    } else {
      buttonsHTML = '<span class="tool-card__pop-btn tool-card__pop-btn--disabled">Coming Soon</span>';
    }

    return `
      <div class="tool-card glass-card fade-in" style="animation-delay: ${delay}s">
        <div class="tool-card__icon tool-card__icon--${pInfo.cls}">${pInfo.letter}</div>
        <div class="tool-card__name">${escapeHTML(tool.name)}</div>
        <div class="tool-card__category">${escapeHTML(tool.category)}</div>
        <div class="tool-card__popover">
          <div class="tool-card__pop-name">${escapeHTML(tool.name)}</div>
          <div class="tool-card__pop-platform">
            <span class="platform-dot ${dotCls}"></span>
            ${escapeHTML(tool.aiPlatform)} &middot; ${escapeHTML(tool.aiType)}
          </div>
          <p class="tool-card__pop-desc">${escapeHTML(tool.primaryUseCase)}</p>
          <div class="tool-card__pop-meta">
            <div>
              <div class="tool-card__pop-meta-label">Owner</div>
              <div class="tool-card__pop-meta-value">${escapeHTML(tool.owner)}</div>
            </div>
            <div>
              <div class="tool-card__pop-meta-label">Builder</div>
              <div class="tool-card__pop-meta-value">${escapeHTML(tool.builder)}</div>
            </div>
          </div>
          ${buttonsHTML}
        </div>
      </div>`;
  },

  renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const activeFilters = [];

    if (this.filterState.platform)
      activeFilters.push({ key: 'platform', value: this.filterState.platform });
    if (this.filterState.aiType)
      activeFilters.push({ key: 'aiType', value: this.filterState.aiType });
    if (this.filterState.category)
      activeFilters.push({ key: 'category', value: this.filterState.category });

    if (activeFilters.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = activeFilters.map(f =>
      `<span class="filter-pill">
        ${escapeHTML(f.value)}
        <button class="filter-pill__remove" data-filter="${f.key}" aria-label="Remove ${f.value} filter">&times;</button>
      </span>`
    ).join('') +
    `<button class="filter-bar__clear btn-outline" onclick="ToolsPage.clearFilters()">Clear All</button>`;

    container.querySelectorAll('.filter-pill__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.filter;
        this.filterState[key] = '';
        const selectMap = {
          platform: 'filter-platform',
          aiType: 'filter-aitype',
          category: 'filter-category'
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
    this.filterState = { search: '', platform: '', aiType: '', category: '' };
    document.getElementById('tool-search').value = '';
    document.getElementById('filter-platform').value = '';
    document.getElementById('filter-aitype').value = '';
    document.getElementById('filter-category').value = '';
    this.applyFilters();
  }
};

/* ── Latest Content Module (Home Page) ───────────────────── */

const LatestContentModule = {
  async init() {
    const container = document.getElementById('latest-content-feed');
    if (!container) return;

    try {
      const data = await DataService.fetch(CONFIG.latestContentDataUrl);
      const items = data.items || [];

      if (items.length === 0) {
        container.innerHTML = `
          <div class="latest-content__empty glass-card fade-in">
            <p>No latest content available yet. Check back soon.</p>
          </div>`;
        return;
      }

      container.innerHTML = items.map((item, i) => this.buildItemHTML(item, i)).join('');
    } catch (err) {
      console.error('Failed to load latest content:', err);
      container.innerHTML = `
        <div class="latest-content__empty glass-card fade-in">
          <p>Unable to load latest content.</p>
        </div>`;
    }
  },

  buildItemHTML(item, index) {
    const delay = Math.min(index * 0.08, 0.4);
    const hasLink = item.link && item.link.trim() !== '';

    return `
      <div class="latest-content-item glass-card glass-card--interactive fade-in" style="animation-delay: ${delay}s">
        <div class="latest-content-item__body">
          <h3 class="latest-content-item__heading">${escapeHTML(item.heading)}</h3>
          <p class="latest-content-item__summary">${escapeHTML(item.summary)}</p>
        </div>
        ${hasLink
          ? `<a href="${escapeHTML(item.link)}" target="_blank" rel="noopener" class="latest-content-item__btn btn-outline">
               Find Out More
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
             </a>`
          : ''
        }
      </div>`;
  }
};

/* ── Prompts Page Module ─────────────────────────────────── */

const PromptsPage = {
  allPrompts: [],
  filteredPrompts: [],
  filterState: {
    search: '',
    model: '',
    category: ''
  },

  async init() {
    try {
      const data = await DataService.fetch(CONFIG.promptsDataUrl);
      this.allPrompts = data.prompts || [];
      this.populateFilterOptions();
      this.bindEvents();
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load prompts:', err);
      document.getElementById('prompt-grid').innerHTML = '';
      document.getElementById('prompt-empty').classList.remove('hidden');
    }
  },

  populateFilterOptions() {
    const dimensions = {
      'filter-model':    { key: 'mainModel', label: 'All Models' },
      'filter-category': { key: 'category',  label: 'All Categories' }
    };

    for (const [selectId, config] of Object.entries(dimensions)) {
      const select = document.getElementById(selectId);
      if (!select) continue;
      const values = [...new Set(
        this.allPrompts.map(p => p[config.key]).filter(Boolean)
      )].sort();
      select.innerHTML =
        `<option value="">${config.label}</option>` +
        values.map(v => `<option value="${v}">${v}</option>`).join('');
    }
  },

  bindEvents() {
    const searchInput = document.getElementById('prompt-search');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filterState.search = e.target.value.trim().toLowerCase();
        this.applyFilters();
      }, 200);
    });

    [
      { id: 'filter-model',    key: 'model' },
      { id: 'filter-category', key: 'category' }
    ].forEach(({ id, key }) => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.filterState[key] = e.target.value;
        this.applyFilters();
      });
    });
  },

  applyFilters() {
    this.filteredPrompts = this.allPrompts.filter(prompt => {
      if (this.filterState.search &&
          !prompt.name.toLowerCase().includes(this.filterState.search)) {
        return false;
      }
      if (this.filterState.model && prompt.mainModel !== this.filterState.model) return false;
      if (this.filterState.category && prompt.category !== this.filterState.category) return false;
      return true;
    });

    this.renderCards();
    this.renderCount();
  },

  renderCards() {
    const grid = document.getElementById('prompt-grid');
    const empty = document.getElementById('prompt-empty');

    if (this.filteredPrompts.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = this.filteredPrompts.map((prompt, i) =>
      this.buildCardHTML(prompt, i)
    ).join('');
  },

  buildCardHTML(prompt, index) {
    const hasLink = prompt.link && prompt.link.trim() !== '';
    const delay = Math.min(index * 0.05, 0.4);

    const modelKey = (prompt.mainModel || '').toLowerCase().replace(/\s+/g, '');
    const modelMap = {
      chatgpt:  { cls: 'chatgpt', letter: 'G' },
      openai:   { cls: 'chatgpt', letter: 'G' },
      claude:   { cls: 'claude',  letter: 'C' },
      gemini:   { cls: 'gemini',  letter: 'G' }
    };
    const mInfo = modelMap[modelKey] || { cls: 'default', letter: (prompt.mainModel || '?')[0].toUpperCase() };
    const dotCls = 'platform-dot--' + mInfo.cls;

    return `
      <div class="tool-card glass-card fade-in" style="animation-delay: ${delay}s">
        <div class="tool-card__icon tool-card__icon--${mInfo.cls}">${mInfo.letter}</div>
        <div class="tool-card__name">${escapeHTML(prompt.name)}</div>
        <div class="tool-card__category">${escapeHTML(prompt.category)}</div>
        <div class="tool-card__popover">
          <div class="tool-card__pop-name">${escapeHTML(prompt.name)}</div>
          <div class="tool-card__pop-platform">
            <span class="platform-dot ${dotCls}"></span>
            ${escapeHTML(prompt.mainModel)}
          </div>
          <p class="tool-card__pop-desc">${escapeHTML(prompt.primaryUseCase)}</p>
          <div class="tool-card__pop-meta">
            <div>
              <div class="tool-card__pop-meta-label">Owner</div>
              <div class="tool-card__pop-meta-value">${escapeHTML(prompt.owner)}</div>
            </div>
            <div>
              <div class="tool-card__pop-meta-label">Builder</div>
              <div class="tool-card__pop-meta-value">${escapeHTML(prompt.builder)}</div>
            </div>
          </div>
          ${hasLink
            ? `<a href="${escapeHTML(prompt.link)}" target="_blank" rel="noopener" class="tool-card__pop-btn">
                 Explore Prompt
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
               </a>`
            : `<span class="tool-card__pop-btn tool-card__pop-btn--disabled">Coming Soon</span>`
          }
        </div>
      </div>`;
  },

  renderCount() {
    const countEl = document.getElementById('prompt-count');
    if (!countEl) return;
    const total = this.allPrompts.length;
    const showing = this.filteredPrompts.length;
    countEl.textContent = `Showing ${showing} of ${total} prompt${total !== 1 ? 's' : ''}`;
  },

  clearFilters() {
    this.filterState = { search: '', model: '', category: '' };
    document.getElementById('prompt-search').value = '';
    document.getElementById('filter-model').value = '';
    document.getElementById('filter-category').value = '';
    this.applyFilters();
  }
};

/* ── Claude Code Page Module ─────────────────────────────── */

const ClaudePage = {
  allItems: [],
  filteredItems: [],
  filterState: {
    search: '',
    itemType: ''
  },

  async init() {
    try {
      const data = await DataService.fetch(CONFIG.claudeDataUrl);
      this.allItems = data.items || [];
      this.populateFilterOptions();
      this.bindEvents();
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load Claude items:', err);
      document.getElementById('claude-grid').innerHTML = '';
      document.getElementById('claude-empty').classList.remove('hidden');
    }
  },

  populateFilterOptions() {
    const select = document.getElementById('filter-itemtype');
    if (!select) return;
    const values = [...new Set(
      this.allItems.map(item => item.itemType).filter(Boolean)
    )].sort();
    select.innerHTML =
      '<option value="">All Types</option>' +
      values.map(v => `<option value="${v}">${v}</option>`).join('');
  },

  bindEvents() {
    const searchInput = document.getElementById('claude-search');
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.filterState.search = e.target.value.trim().toLowerCase();
        this.applyFilters();
      }, 200);
    });

    document.getElementById('filter-itemtype').addEventListener('change', (e) => {
      this.filterState.itemType = e.target.value;
      this.applyFilters();
    });
  },

  applyFilters() {
    this.filteredItems = this.allItems.filter(item => {
      if (this.filterState.search &&
          !item.name.toLowerCase().includes(this.filterState.search)) {
        return false;
      }
      if (this.filterState.itemType && item.itemType !== this.filterState.itemType) return false;
      return true;
    });

    this.renderCards();
    this.renderCount();
  },

  renderCards() {
    const grid = document.getElementById('claude-grid');
    const empty = document.getElementById('claude-empty');

    if (this.filteredItems.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    grid.innerHTML = this.filteredItems.map((item, i) =>
      this.buildCardHTML(item, i)
    ).join('');
  },

  buildCardHTML(item, index) {
    const hasLink = item.link && item.link.trim() !== '';
    const delay = Math.min(index * 0.05, 0.4);

    return `
      <div class="tool-card glass-card fade-in" style="animation-delay: ${delay}s">
        <div class="tool-card__icon tool-card__icon--claude">C</div>
        <div class="tool-card__name">${escapeHTML(item.name)}</div>
        <div class="tool-card__category">${escapeHTML(item.itemType)}</div>
        <div class="tool-card__popover">
          <div class="tool-card__pop-name">${escapeHTML(item.name)}</div>
          <div class="tool-card__pop-platform">
            <span class="platform-dot platform-dot--claude"></span>
            ${escapeHTML(item.itemType)}
          </div>
          <p class="tool-card__pop-desc">${escapeHTML(item.objective)}</p>
          <div class="tool-card__pop-meta">
            <div>
              <div class="tool-card__pop-meta-label">Creator</div>
              <div class="tool-card__pop-meta-value">${escapeHTML(item.creator)}</div>
            </div>
          </div>
          ${hasLink
            ? `<a href="${escapeHTML(item.link)}" target="_blank" rel="noopener" class="tool-card__pop-btn">
                 Link to Asset
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
               </a>`
            : `<span class="tool-card__pop-btn tool-card__pop-btn--disabled">Coming Soon</span>`
          }
        </div>
      </div>`;
  },

  renderCount() {
    const countEl = document.getElementById('claude-count');
    if (!countEl) return;
    const total = this.allItems.length;
    const showing = this.filteredItems.length;
    countEl.textContent = `Showing ${showing} of ${total} item${total !== 1 ? 's' : ''}`;
  },

  clearFilters() {
    this.filterState = { search: '', itemType: '' };
    document.getElementById('claude-search').value = '';
    document.getElementById('filter-itemtype').value = '';
    this.applyFilters();
  }
};

/* ── Page Init ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();

  if (!Auth.isAuthenticated()) return;

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === 'tools.html') {
    ToolsPage.init();
  } else if (currentPage === 'prompts.html') {
    PromptsPage.init();
  } else if (currentPage === 'claude-code.html') {
    ClaudePage.init();
  } else if (currentPage === 'home.html') {
    LatestContentModule.init();
  }
});
