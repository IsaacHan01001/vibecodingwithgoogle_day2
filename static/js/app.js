// ==========================================================================
// APPLICATION STATE
// ==========================================================================
let state = {
    updates: [],
    filteredUpdates: [],
    activeCategory: 'all',
    searchQuery: '',
    sortOrder: 'newest',
    selectedUpdate: null,
    selectedTweetStyle: 'hype'
};

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const DOM = {
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    syncStatus: document.getElementById('sync-status'),
    
    // Stats elements
    countTotal: document.getElementById('count-total'),
    countFeatures: document.getElementById('count-features'),
    countIssues: document.getElementById('count-issues'),
    countOther: document.getElementById('count-other'),
    
    // Filters and Search
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    categoryFilters: document.getElementById('category-filters'),
    sortSelect: document.getElementById('sort-select'),
    
    // Containers
    feedContainer: document.getElementById('feed-container'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    
    // Tweet Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCountNumber: document.getElementById('char-count-number'),
    charCountProgress: document.getElementById('char-count-progress'),
    templateSelector: document.getElementById('template-selector'),
    xTweetContent: document.getElementById('x-tweet-content'),
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    copyBtnText: document.getElementById('copy-btn-text'),
    btnTweetCancel: document.getElementById('btn-tweet-cancel'),
    btnTweetShare: document.getElementById('btn-tweet-share')
};

// ==========================================================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Fetch initial data
    fetchUpdates(false);
    
    // Bind global search & filter events
    DOM.refreshBtn.addEventListener('click', () => fetchUpdates(true));
    
    DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        toggleClearSearchButton();
        applyFiltersAndRender();
    });
    
    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        applyFiltersAndRender();
        DOM.searchInput.focus();
    });
    
    DOM.categoryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            // Remove active class from all pills
            document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            // Add active class to clicked pill
            e.target.classList.add('active');
            
            state.activeCategory = e.target.dataset.category;
            applyFiltersAndRender();
        }
    });
    
    DOM.sortSelect.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        applyFiltersAndRender();
    });
    
    // Bind Tweet Modal events
    DOM.modalCloseBtn.addEventListener('click', hideTweetModal);
    DOM.btnTweetCancel.addEventListener('click', hideTweetModal);
    
    // Click outside modal card to close
    DOM.tweetModal.addEventListener('click', (e) => {
        if (e.target === DOM.tweetModal) {
            hideTweetModal();
        }
    });
    
    // Handle template style changes
    DOM.templateSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('template-pill')) {
            document.querySelectorAll('.template-pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            
            state.selectedTweetStyle = e.target.dataset.style;
            loadTweetTemplate();
        }
    });
    
    // Handle manual typing in Tweet Textarea
    DOM.tweetTextarea.addEventListener('input', () => {
        updateTweetMetrics(DOM.tweetTextarea.value);
    });
    
    // Copy Tweet Draft button
    DOM.btnCopyTweet.addEventListener('click', copyTweetToClipboard);
}

// ==========================================================================
// DATA ACQUISITION & PROCESSING
// ==========================================================================
async function fetchUpdates(forceRefresh = false) {
    showLoadingState();
    
    try {
        const url = forceRefresh ? '/api/refresh' : '/api/updates';
        const method = forceRefresh ? 'POST' : 'GET';
        
        const response = await fetch(url, { method });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update App State
        state.updates = data.updates || [];
        
        // Update Metadata
        DOM.lastUpdatedText.textContent = `Last synced: ${data.last_updated || 'Just now'}`;
        DOM.syncStatus.className = 'dot-indicator pulse';
        
        // Calculate Metrics
        calculateStats();
        
        // Apply search, filters and render lists
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        DOM.lastUpdatedText.textContent = 'Sync failed. Try refreshing.';
        DOM.syncStatus.className = 'dot-indicator';
        DOM.syncStatus.style.backgroundColor = 'var(--color-google-red)';
        renderErrorState();
    } finally {
        hideLoadingState();
    }
}

// Show/Hide loading overlays
function showLoadingState() {
    DOM.refreshBtn.classList.add('loading');
    DOM.refreshBtn.disabled = true;
    DOM.skeletonLoader.style.display = 'flex';
    // Clear feed
    const dividers = document.querySelectorAll('.feed-date-divider');
    const cards = document.querySelectorAll('.update-card');
    dividers.forEach(d => d.remove());
    cards.forEach(c => c.remove());
    
    const emptyStates = document.querySelectorAll('.empty-state');
    emptyStates.forEach(es => es.remove());
}

function hideLoadingState() {
    DOM.refreshBtn.classList.remove('loading');
    DOM.refreshBtn.disabled = false;
    DOM.skeletonLoader.style.display = 'none';
}

// Calculate summary numbers for the stats row
function calculateStats() {
    const total = state.updates.length;
    
    let features = 0;
    let issues = 0;
    let other = 0;
    
    state.updates.forEach(up => {
        const cat = up.category.toLowerCase();
        if (cat === 'feature') {
            features++;
        } else if (cat === 'issue' || cat === 'fixed' || cat.includes('bug') || cat.includes('fix')) {
            issues++;
        } else {
            other++;
        }
    });
    
    animateCounter(DOM.countTotal, total);
    animateCounter(DOM.countFeatures, features);
    animateCounter(DOM.countIssues, issues);
    animateCounter(DOM.countOther, other);
}

// Smooth counters animation
function animateCounter(element, targetValue) {
    if (isNaN(targetValue)) {
        element.textContent = '-';
        return;
    }
    
    let start = 0;
    const duration = 800; // ms
    const stepTime = 15;
    const steps = duration / stepTime;
    const increment = targetValue / steps;
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= targetValue) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, stepTime);
}

// Helper to show/hide search clear button
function toggleClearSearchButton() {
    if (state.searchQuery.length > 0) {
        DOM.clearSearchBtn.style.display = 'flex';
    } else {
        DOM.clearSearchBtn.style.display = 'none';
    }
}

// ==========================================================================
// FILTERING, SEARCHING & SORTING LOGIC
// ==========================================================================
function applyFiltersAndRender() {
    // 1. Filter by category
    let result = state.updates.filter(up => {
        if (state.activeCategory === 'all') return true;
        
        const cat = up.category.toLowerCase();
        if (state.activeCategory === 'feature') {
            return cat === 'feature';
        } else if (state.activeCategory === 'issue') {
            return cat === 'issue';
        } else if (state.activeCategory === 'changed') {
            return cat === 'changed';
        } else if (state.activeCategory === 'fixed') {
            return cat === 'fixed';
        } else if (state.activeCategory === 'other') {
            return cat !== 'feature' && cat !== 'issue' && cat !== 'changed' && cat !== 'fixed';
        }
        return true;
    });
    
    // 2. Filter by search query
    if (state.searchQuery) {
        result = result.filter(up => {
            const dateMatch = up.date.toLowerCase().includes(state.searchQuery);
            const catMatch = up.category.toLowerCase().includes(state.searchQuery);
            const textMatch = up.text.toLowerCase().includes(state.searchQuery);
            return dateMatch || catMatch || textMatch;
        });
    }
    
    // 3. Sort by Date
    result.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        
        if (state.sortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    state.filteredUpdates = result;
    renderFeed();
}

// ==========================================================================
// RENDERERS
// ==========================================================================
function renderFeed() {
    // Clear feed container (except skeleton)
    const dividers = document.querySelectorAll('.feed-date-divider');
    const cards = document.querySelectorAll('.update-card');
    dividers.forEach(d => d.remove());
    cards.forEach(c => c.remove());
    
    const emptyStates = document.querySelectorAll('.empty-state');
    emptyStates.forEach(es => es.remove());
    
    if (state.filteredUpdates.length === 0) {
        renderEmptyState();
        return;
    }
    
    // To present release notes clearly, group updates by Date.
    // However, since they are already sorted, we can loop through them
    // and dynamically output a Date divider whenever the date changes.
    let lastRenderedDate = null;
    
    state.filteredUpdates.forEach(update => {
        // Render Date Divider if date changed
        if (update.date !== lastRenderedDate) {
            const divider = document.createElement('div');
            divider.className = 'feed-date-divider';
            divider.textContent = update.date;
            DOM.feedContainer.appendChild(divider);
            lastRenderedDate = update.date;
        }
        
        // Render Update Card
        const card = createUpdateCard(update);
        DOM.feedContainer.appendChild(card);
    });
}

function createUpdateCard(update) {
    const card = document.createElement('article');
    card.className = 'update-card';
    card.id = `card-${update.id}`;
    
    // Badge Class
    const catLower = update.category.toLowerCase();
    let badgeClass = 'badge-general';
    if (catLower === 'feature') badgeClass = 'badge-feature';
    else if (catLower === 'issue') badgeClass = 'badge-issue';
    else if (catLower === 'changed') badgeClass = 'badge-changed';
    else if (catLower === 'fixed') badgeClass = 'badge-fixed';
    else if (catLower === 'deprecated') badgeClass = 'badge-deprecated';
    
    card.innerHTML = `
        <div class="update-card-header">
            <div class="update-badges">
                <span class="badge-cat ${badgeClass}">${update.category}</span>
            </div>
            <span class="update-date" aria-label="Updated on">${update.date}</span>
        </div>
        <div class="update-card-body">
            ${update.html}
        </div>
        <div class="update-card-footer">
            <button class="btn btn-card-tweet" data-id="${update.id}">
                <!-- Twitter/X SVG Logo -->
                <svg viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
                Draft Tweet
            </button>
        </div>
    `;
    
    // Bind individual tweet click handler
    const tweetBtn = card.querySelector('.btn-card-tweet');
    tweetBtn.addEventListener('click', () => {
        showTweetModal(update);
    });
    
    return card;
}

function renderEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <h3 class="empty-title">No Updates Found</h3>
        <p class="empty-description">We couldn't find any release notes matching your filters or search keywords. Try adjusting your parameters.</p>
        <button class="btn btn-secondary" id="reset-filters-btn">Clear Search &amp; Filters</button>
    `;
    
    DOM.feedContainer.appendChild(emptyState);
    
    document.getElementById('reset-filters-btn').addEventListener('click', () => {
        // Reset Search Input
        DOM.searchInput.value = '';
        state.searchQuery = '';
        toggleClearSearchButton();
        
        // Reset Category Pill
        document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
        document.querySelector('.filter-pill[data-category="all"]').classList.add('active');
        state.activeCategory = 'all';
        
        applyFiltersAndRender();
    });
}

function renderErrorState() {
    const errorState = document.createElement('div');
    errorState.className = 'empty-state';
    errorState.style.borderColor = 'rgba(234, 67, 53, 0.2)';
    errorState.innerHTML = `
        <svg class="empty-icon" style="color: var(--color-google-red);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3 class="empty-title">Connection Failed</h3>
        <p class="empty-description">We had trouble fetching the BigQuery feed from Google Cloud. Please check your internet connection and try again.</p>
        <button class="btn btn-primary" id="error-retry-btn">Retry Connection</button>
    `;
    DOM.feedContainer.appendChild(errorState);
    
    document.getElementById('error-retry-btn').addEventListener('click', () => {
        fetchUpdates(true);
    });
}

// ==========================================================================
// TWEET COMPOSER WINDOW CONTROLLER
// ==========================================================================
function showTweetModal(update) {
    state.selectedUpdate = update;
    
    // Set default style active in template selector
    document.querySelectorAll('.template-pill').forEach(pill => {
        if (pill.dataset.style === 'hype') pill.classList.add('active');
        else pill.classList.remove('active');
    });
    state.selectedTweetStyle = 'hype';
    
    // Show Modal
    DOM.tweetModal.style.display = 'flex';
    // Force browser reflow to trigger CSS transitions
    DOM.tweetModal.offsetHeight; 
    DOM.tweetModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock scrolling
    
    // Load initial draft
    loadTweetTemplate();
}

function hideTweetModal() {
    DOM.tweetModal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
    
    // Reset copy button state
    resetCopyBtnState();
    
    // Delay setting display none to let transitions finish
    setTimeout(() => {
        if (!DOM.tweetModal.classList.contains('active')) {
            DOM.tweetModal.style.display = 'none';
        }
    }, 300);
}

// Generate templates dynamically based on character limits
function loadTweetTemplate() {
    if (!state.selectedUpdate) return;
    
    const update = state.selectedUpdate;
    const style = state.selectedTweetStyle;
    
    const draftText = generateTweetDraft(update, style);
    DOM.tweetTextarea.value = draftText;
    
    updateTweetMetrics(draftText);
}

// Smart Tweet Draft Generator with safe truncation
function generateTweetDraft(update, style) {
    const category = update.category;
    const date = update.date;
    const link = update.link;
    const rawText = update.text;
    
    // Clean up multiple spaces, lines breaks, and brackets for better tweet format
    const cleanedText = rawText
        .replace(/\s+/g, ' ')
        .replace(/\[\s*Preview\s*\]/gi, '(Preview)')
        .replace(/\[\s*Generally\s*Available\s*\]/gi, '(GA)')
        .trim();
        
    if (style === 'hype') {
        const prefix = `🚀 BigQuery Update (${date}): [${category}] `;
        const suffix = `\n\n🔗 ${link} #GCP #BigQuery #CloudComputing`;
        const allowedLength = 280 - prefix.length - suffix.length;
        
        let summary = cleanedText;
        if (summary.length > allowedLength) {
            summary = summary.substring(0, allowedLength - 3) + "...";
        }
        return `${prefix}${summary}${suffix}`;
        
    } else if (style === 'news') {
        const prefix = `Google Cloud BigQuery Update (${date}):\n\n[${category}] `;
        const suffix = `\n\nDetails: ${link}`;
        const allowedLength = 280 - prefix.length - suffix.length;
        
        let summary = cleanedText;
        if (summary.length > allowedLength) {
            summary = summary.substring(0, allowedLength - 3) + "...";
        }
        return `${prefix}${summary}${suffix}`;
        
    } else { // short
        const prefix = `BigQuery [${category}]: `;
        const suffix = ` ${link} #GoogleCloud`;
        const allowedLength = 280 - prefix.length - suffix.length;
        
        let summary = cleanedText;
        if (summary.length > allowedLength) {
            summary = summary.substring(0, allowedLength - 3) + "...";
        }
        return `${prefix}${summary}${suffix}`;
    }
}

// Update live character count and visual progress indicators
function updateTweetMetrics(text) {
    const len = text.length;
    DOM.charCountNumber.textContent = `${len} / 280`;
    
    // Calculate progress percentage (max 100%)
    const pct = Math.min((len / 280) * 100, 100);
    DOM.charCountProgress.style.width = `${pct}%`;
    
    // Style bar based on character safety
    DOM.charCountProgress.className = 'char-count-progress-bar';
    DOM.charCountNumber.style.color = '';
    
    if (len > 280) {
        DOM.charCountProgress.classList.add('danger');
        DOM.charCountNumber.style.color = 'var(--color-google-red)';
    } else if (len > 240) {
        DOM.charCountProgress.classList.add('warning');
        DOM.charCountNumber.style.color = 'var(--color-google-yellow)';
    }
    
    // Update live simulated X preview body text
    renderSimulatedTweet(text);
    
    // Update X Share Link Action
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    DOM.btnTweetShare.setAttribute('href', shareUrl);
}

// Highlights links and tags in the preview container
function renderSimulatedTweet(text) {
    // Escape standard HTML tags
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
        
    // Match URLs and wrap them in X blue link styling
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlPattern, '<span class="x-link">$1</span>');
    
    // Match Hashtags and wrap them in X blue link styling
    const hashtagPattern = /(#[a-zA-Z0-9_]+)/g;
    escaped = escaped.replace(hashtagPattern, '<span class="x-link">$1</span>');
    
    DOM.xTweetContent.innerHTML = escaped;
}

// Copy draft text to clipboard
async function copyTweetToClipboard() {
    const text = DOM.tweetTextarea.value;
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual Success Feedback
        DOM.btnCopyTweet.classList.add('copied');
        DOM.copyBtnText.textContent = 'Copied!';
        
        // Revert feedback after delay
        setTimeout(resetCopyBtnState, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
    }
}

function resetCopyBtnState() {
    DOM.btnCopyTweet.classList.remove('copied');
    DOM.copyBtnText.textContent = 'Copy Draft';
}
