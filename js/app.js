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
  // Normalize: strip .html so we match regardless of CF Pages canonicalization
  const norm = (p) => (p || '').split('/').pop().replace(/\.html$/, '');
  let current = norm(window.location.pathname);
  if (current === '' || current === 'index') current = 'home';
  document.querySelectorAll('.portal-nav__link').forEach(link => {
    if (norm(link.getAttribute('href')) === current) {
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

/* ── Feedback Modal ──────────────────────────────────────── */

const FeedbackModal = {
  _root: null,
  _tool: null,

  ensureMounted() {
    if (this._root) return;
    const root = document.createElement('div');
    root.className = 'feedback-modal hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'fb-title');
    root.innerHTML = `
      <div class="feedback-modal__backdrop" data-close="1"></div>
      <div class="feedback-modal__card glass-card">
        <button type="button" class="feedback-modal__close" data-close="1" aria-label="Close">&times;</button>
        <div class="feedback-modal__eyebrow">Leave feedback</div>
        <h2 class="feedback-modal__title" id="fb-title"></h2>
        <p class="feedback-modal__sub">How did this tool work for you?</p>

        <div class="feedback-modal__rating" role="radiogroup" aria-label="Rating">
          <button type="button" class="feedback-modal__thumb" data-rating="up" aria-label="Thumbs up">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M7 22V11"/><path d="M5 11h12.6a2.4 2.4 0 0 1 2.4 2.4l-1.5 6A2.4 2.4 0 0 1 16.1 21H7"/><path d="M11 11V5a3 3 0 0 1 3-3l3 7"/></svg>
            <span>Helpful</span>
          </button>
          <button type="button" class="feedback-modal__thumb" data-rating="down" aria-label="Thumbs down">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M17 2v11"/><path d="M19 13H6.4A2.4 2.4 0 0 1 4 10.6L5.5 4.6A2.4 2.4 0 0 1 7.9 3H17"/><path d="M13 13v6a3 3 0 0 1-3 3l-3-7"/></svg>
            <span>Needs work</span>
          </button>
        </div>

        <textarea class="feedback-modal__textarea" id="fb-text" placeholder="Optional — what worked, what didn't, or how it could be better." maxlength="2000"></textarea>
        <div class="feedback-modal__counter"><span id="fb-count">0</span> / 2000</div>

        <p class="feedback-modal__error hidden" id="fb-error"></p>

        <div class="feedback-modal__actions">
          <button type="button" class="btn-outline" data-close="1">Cancel</button>
          <button type="button" class="btn-gradient" id="fb-submit">Send feedback</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    this._root = root;

    // Close on backdrop / × / Cancel
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !root.classList.contains('hidden')) this.close();
    });

    // Rating selection
    root.querySelectorAll('.feedback-modal__thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.feedback-modal__thumb').forEach(b =>
          b.classList.toggle('feedback-modal__thumb--active', b === btn)
        );
        const err = document.getElementById('fb-error');
        if (err) err.classList.add('hidden');
      });
    });

    // Char counter
    const textarea = document.getElementById('fb-text');
    const counter = document.getElementById('fb-count');
    textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });

    // Submit
    document.getElementById('fb-submit').addEventListener('click', () => this.submit());
  },

  open(tool) {
    this.ensureMounted();
    this._tool = tool;
    document.getElementById('fb-title').textContent = tool.name || 'this tool';
    // Reset state
    this._root.querySelectorAll('.feedback-modal__thumb').forEach(b =>
      b.classList.remove('feedback-modal__thumb--active'));
    document.getElementById('fb-text').value = '';
    document.getElementById('fb-count').textContent = '0';
    const err = document.getElementById('fb-error');
    err.classList.add('hidden');
    err.textContent = '';
    document.getElementById('fb-submit').disabled = false;
    document.getElementById('fb-submit').textContent = 'Send feedback';

    this._root.classList.remove('hidden');
    document.body.classList.add('modal-open');
  },

  close() {
    if (!this._root) return;
    this._root.classList.add('hidden');
    document.body.classList.remove('modal-open');
    this._tool = null;
  },

  async submit() {
    const root = this._root;
    const tool = this._tool;
    if (!tool) return;

    const ratingBtn = root.querySelector('.feedback-modal__thumb--active');
    const err = document.getElementById('fb-error');
    err.classList.add('hidden');
    err.textContent = '';

    if (!ratingBtn) {
      err.textContent = 'Pick 👍 or 👎 first.';
      err.classList.remove('hidden');
      return;
    }

    const rating = ratingBtn.getAttribute('data-rating');
    const feedback = document.getElementById('fb-text').value.trim();

    const submitBtn = document.getElementById('fb-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          toolName: tool.name,
          builderEmail: tool.builder || '',
          rating,
          feedback
        })
      });

      if (!res.ok) {
        let msg = 'Something went wrong — try again.';
        try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
        err.textContent = msg;
        err.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send feedback';
        return;
      }

      this.close();
      Toast.show('Thanks — feedback sent to the builder.');
    } catch {
      err.textContent = 'Network error — try again.';
      err.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send feedback';
    }
  }
};

/* ── Toast (small top-right notification) ────────────────── */

const Toast = {
  show(message, ms = 3500) {
    let el = document.getElementById('sgm-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sgm-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('toast--visible');
    clearTimeout(this._t);
    this._t = setTimeout(() => el.classList.remove('toast--visible'), ms);
  }
};

/* ── Tool Detail Helpers ─────────────────────────────────── */

// Accept both naming conventions so the dashboard tolerates field-name drift
// in the Apps Script (e.g. screenshotUrl vs screenGrab, systemsUsed vs techUsed).
const TOOL_DETAIL_KEYS = [
  'description',
  'howItWorks',
  'systemsUsed', 'techUsed',
  'screenshotUrl', 'screenGrab'
];

function hasDetailContent(tool) {
  return TOOL_DETAIL_KEYS.some(k =>
    typeof tool[k] === 'string' && tool[k].trim().length > 0
  );
}

// Read a detail field, accepting either canonical or alt name.
function detailField(tool, ...keys) {
  for (const k of keys) {
    const v = tool[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

// Rewrite Google Drive share URLs to a directly-embeddable form.
// drive.google.com/file/d/<id>/view  ─┐
// drive.google.com/open?id=<id>       ├─►  lh3.googleusercontent.com/d/<id>=w2000
// drive.google.com/uc?id=<id>&...     ─┘
// Other URLs (Imgur, raw GitHub, etc.) are returned unchanged.
function normalizeImageUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  let id = null;

  const fileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileD) id = fileD[1];

  if (!id && /(?:drive|docs)\.google\.com/.test(trimmed)) {
    const idParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParam) id = idParam[1];
  }

  if (id) return `https://lh3.googleusercontent.com/d/${id}=w2000`;
  return trimmed;
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

    // Delegated card-click navigation: cards with data-href open the link.
    // Clicks on inner anchors (popover buttons) bubble first but `closest('a')`
    // detects them so we skip card-level navigation in that case.
    const grid = document.getElementById('tool-grid');
    const navigateFromCard = (card) => {
      const href = card.getAttribute('data-href');
      const target = card.getAttribute('data-target') || '_self';
      if (!href) return;
      if (target === '_blank') {
        window.open(href, '_blank', 'noopener');
      } else {
        window.location.href = href;
      }
    };
    grid.addEventListener('click', (e) => {
      // Feedback button (in popover) — open modal, stop card-level navigation
      const fbBtn = e.target.closest('[data-feedback-id]');
      if (fbBtn) {
        e.stopPropagation();
        const id = fbBtn.getAttribute('data-feedback-id');
        const tool = this.allTools.find(t => t.id === id);
        if (tool) FeedbackModal.open(tool);
        return;
      }
      if (e.target.closest('a')) return;
      const card = e.target.closest('.tool-card[data-href]');
      if (card) navigateFromCard(card);
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.tool-card[data-href]');
      if (!card) return;
      e.preventDefault();
      navigateFromCard(card);
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
    const hasDetail = hasDetailContent(tool);

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

    // Card-level link target: detail page if write-up exists, else direct to tool
    const cardHref = hasDetail
      ? `tool.html?id=${encodeURIComponent(tool.id)}`
      : (hasToolLink ? tool.link : '#');
    const cardTarget = hasDetail ? '_self' : '_blank';
    const cardRel = hasDetail ? '' : 'rel="noopener"';

    // Popover buttons — keep direct-link behaviour, stop card-level navigation.
    // Feedback button always renders; the others are conditional on link/detail availability.
    const noActionButtons = !hasPromptLink && !hasToolLink && !hasDetail;
    let buttonsHTML = '<div class="tool-card__pop-buttons">';
    if (hasPromptLink) {
      buttonsHTML += `<a href="${escapeHTML(tool.promptLink)}" target="_blank" rel="noopener" class="tool-card__pop-btn tool-card__pop-btn--outline" onclick="event.stopPropagation()">
        Explore
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      </a>`;
    }
    if (hasToolLink) {
      buttonsHTML += `<a href="${escapeHTML(tool.link)}" target="_blank" rel="noopener" class="tool-card__pop-btn" onclick="event.stopPropagation()">
        Use Tool
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
      </a>`;
    }
    if (hasDetail) {
      buttonsHTML += `<a href="tool.html?id=${encodeURIComponent(tool.id)}" class="tool-card__pop-btn tool-card__pop-btn--outline" onclick="event.stopPropagation()">
        Details
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      </a>`;
    }
    buttonsHTML += `<button type="button" class="tool-card__pop-btn tool-card__pop-btn--outline" data-feedback-id="${escapeHTML(tool.id)}">
      Feedback
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>`;
    buttonsHTML += '</div>';
    if (noActionButtons) {
      buttonsHTML = '<span class="tool-card__pop-coming">Coming soon</span>' + buttonsHTML;
    }

    const detailBadge = hasDetail
      ? '<span class="tool-card__detail-badge" aria-label="Has detail page">Details</span>'
      : '';

    const isClickable = cardHref !== '#';
    const cardAttrs = isClickable
      ? `role="link" tabindex="0" data-href="${escapeHTML(cardHref)}" data-target="${cardTarget}"`
      : '';

    return `
      <div class="tool-card glass-card fade-in${isClickable ? ' tool-card--clickable' : ''}" ${cardAttrs} style="animation-delay: ${delay}s">
        <div class="tool-card__icon tool-card__icon--${pInfo.cls}">${pInfo.letter}</div>
        <div class="tool-card__name">${escapeHTML(tool.name)}</div>
        <div class="tool-card__category">${escapeHTML(tool.category)}</div>
        ${detailBadge}
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

/* ── Tool Detail Page Module ─────────────────────────────── */

const ToolDetailPage = {
  async init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const root = document.getElementById('tool-detail-root');
    const empty = document.getElementById('tool-detail-empty');

    if (!id) {
      this.showEmpty();
      return;
    }

    try {
      const data = await DataService.fetch(CONFIG.toolsDataUrl);
      const tool = (data.tools || []).find(t => t.id === id);

      if (!tool) {
        this.showEmpty();
        return;
      }

      // No detail content for this tool → send straight to the external link.
      if (!hasDetailContent(tool)) {
        if (tool.link && tool.link.trim() !== '') {
          window.location.replace(tool.link);
          return;
        }
        this.showEmpty();
        return;
      }

      this.render(tool);
    } catch (err) {
      console.error('Failed to load tool detail:', err);
      this.showEmpty();
    }
  },

  showEmpty() {
    const root = document.getElementById('tool-detail-root');
    const empty = document.getElementById('tool-detail-empty');
    if (root) root.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
  },

  render(tool) {
    document.title = `SGM AI Dashboard — ${tool.name}`;

    const platformKey = (tool.aiPlatform || '').toLowerCase().replace(/\s+/g, '');
    const platformMap = {
      chatgpt: { cls: 'chatgpt', letter: 'G' },
      openai:  { cls: 'chatgpt', letter: 'G' },
      claude:  { cls: 'claude', letter: 'C' },
      gemini:  { cls: 'gemini', letter: 'G' },
      midjourney: { cls: 'midjourney', letter: 'M' }
    };
    const pInfo = platformMap[platformKey] || { cls: 'default', letter: (tool.aiPlatform || '?')[0].toUpperCase() };

    const hasToolLink = tool.link && tool.link.trim() !== '';
    const hasPromptLink = tool.promptLink && tool.promptLink.trim() !== '';

    // Read detail fields tolerantly — Apps Script may emit either naming
    const description = detailField(tool, 'description');
    const howItWorks  = detailField(tool, 'howItWorks');
    const systemsUsed = detailField(tool, 'systemsUsed', 'techUsed');
    const screenshot  = detailField(tool, 'screenshotUrl', 'screenGrab');

    const hasDescription = description !== '';
    const hasHowItWorks  = howItWorks !== '';
    const hasSystems     = systemsUsed !== '';
    const hasScreenshot  = screenshot !== '';

    // Hero
    document.getElementById('td-icon').className = `tool-detail__icon tool-card__icon--${pInfo.cls}`;
    document.getElementById('td-icon').textContent = pInfo.letter;
    document.getElementById('td-name').textContent = tool.name || '';
    document.getElementById('td-platform').textContent = `${tool.aiPlatform || ''} · ${tool.aiType || ''}`;
    document.getElementById('td-platform-dot').className = `platform-dot platform-dot--${pInfo.cls}`;
    document.getElementById('td-category').textContent = tool.category || '';
    document.getElementById('td-usecase').textContent = tool.primaryUseCase || '';

    // CTAs
    const ctaWrap = document.getElementById('td-ctas');
    ctaWrap.innerHTML = '';
    if (hasToolLink) {
      ctaWrap.insertAdjacentHTML('beforeend',
        `<a href="${escapeHTML(tool.link)}" target="_blank" rel="noopener" class="btn-gradient">
           Use Tool
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
         </a>`);
    }
    if (hasPromptLink) {
      ctaWrap.insertAdjacentHTML('beforeend',
        `<a href="${escapeHTML(tool.promptLink)}" target="_blank" rel="noopener" class="btn-outline">
           View Prompt
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
         </a>`);
    }

    // Meta
    document.getElementById('td-owner').textContent = tool.owner || '—';
    document.getElementById('td-builder').textContent = tool.builder || '—';

    // Description
    const descSection = document.getElementById('td-description-section');
    if (hasDescription) {
      const descBody = document.getElementById('td-description');
      descBody.innerHTML = '';
      description.split(/\n\s*\n/).forEach(para => {
        const trimmed = para.trim();
        if (!trimmed) return;
        const p = document.createElement('p');
        p.textContent = trimmed;
        descBody.appendChild(p);
      });
      descSection.classList.remove('hidden');
    }

    // How it works
    const stepsSection = document.getElementById('td-steps-section');
    if (hasHowItWorks) {
      const list = document.getElementById('td-steps');
      list.innerHTML = '';
      const steps = howItWorks
        .split(/\||\n/)
        .map(s => s.trim())
        .filter(Boolean);
      steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        list.appendChild(li);
      });
      stepsSection.classList.remove('hidden');
    }

    // Systems used
    const systemsSection = document.getElementById('td-systems-section');
    if (hasSystems) {
      const wrap = document.getElementById('td-systems');
      wrap.innerHTML = '';
      systemsUsed.split(',').map(s => s.trim()).filter(Boolean).forEach(name => {
        const span = document.createElement('span');
        span.className = 'tool-detail__system-pill';
        span.textContent = name;
        wrap.appendChild(span);
      });
      systemsSection.classList.remove('hidden');
    }

    // Screenshot
    const screenshotSection = document.getElementById('td-screenshot-section');
    if (hasScreenshot) {
      const img = document.getElementById('td-screenshot');
      img.src = normalizeImageUrl(screenshot);
      img.alt = `${tool.name} screenshot`;
      img.loading = 'lazy';
      screenshotSection.classList.remove('hidden');
    }

    // Feedback button — always shown on the detail page
    const fbBtn = document.getElementById('td-feedback-btn');
    if (fbBtn) {
      fbBtn.addEventListener('click', () => FeedbackModal.open(tool));
    }
  }
};

/* ── Page Init ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();

  // Cloudflare Pages canonicalizes /tools.html -> /tools, so accept both forms.
  // Strip any trailing .html and any trailing slash before matching.
  let currentPage = window.location.pathname.split('/').pop() || 'index';
  currentPage = currentPage.replace(/\.html$/, '');
  if (currentPage === '' || currentPage === 'index') currentPage = 'home';

  if (currentPage === 'tools') {
    ToolsPage.init();
  } else if (currentPage === 'prompts') {
    PromptsPage.init();
  } else if (currentPage === 'claude-code') {
    ClaudePage.init();
  } else if (currentPage === 'home') {
    LatestContentModule.init();
  } else if (currentPage === 'tool') {
    ToolDetailPage.init();
  }
});
