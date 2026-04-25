/**
 * Alfred - Main Application Entry Point
 * Initializes all features and handles global state
 */

const Alfred = {
    tabMeta: {
        chat: {
            title: 'Chat',
            kicker: 'Assistant workspace',
            description: 'A focused conversation surface for Alfred.'
        },
        todos: {
            title: 'To-Do',
            kicker: 'Task management',
            description: 'Plan and sort work in a dedicated task view.'
        },
        habits: {
            title: 'Habits',
            kicker: 'Progress tracker',
            description: 'Track streaks in a cleaner, more legible dashboard.'
        },
        settings: {
            title: 'Settings',
            kicker: 'Configuration',
            description: 'Manage AI, sync, and integrations from one place.'
        }
    },

    /**
     * Initialize the application
     */
    async initialize() {
        console.log('[Alfred] Starting...');

        // Initialize state
        await State.initialize();
        this.applyTheme();

        // Setup UI
        this.setupNavigation();
        this.setupGlobalListeners();

        // Initialize database
        await SupabaseDB.initialize();

        // Initialize features
        await ChatFeature.initialize();
        await TodosFeature.initialize();
        await HabitsFeature.initialize();
        await SettingsFeature.initialize();
        await NavigationShell.initialize();

        // Update status indicator
        // Activate the current hash tab and update the header
        this.syncTabFromHash();
        ChatFeature.updateStatus();

        // Mark as ready
        State.isInitialized = true;
        console.log('[Alfred] Ready!');

        // Show welcome message if first run
        if (!Storage.get('alfred_initialized')) {
            this.showWelcome();
            Storage.set('alfred_initialized', true);
        }
    },

    /**
     * Setup tab navigation
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                const tabId = item.dataset.tab;
                if (!tabId) return;

                window.location.hash = tabId;
            });
        });

        window.addEventListener('hashchange', () => {
            this.syncTabFromHash();
        });
    },

    /**
     * Read the active tab from the URL hash
     */
    getTabFromHash() {
        const hash = window.location.hash.replace('#', '');
        return this.tabMeta[hash] ? hash : 'chat';
    },

    /**
     * Activate a tab and update the view chrome
     */
    activateTab(tabId, updateHash = true) {
        const validTab = this.tabMeta[tabId] ? tabId : 'chat';
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(navItem => {
            const isActive = navItem.dataset.tab === validTab;
            navItem.classList.toggle('active', isActive);
            navItem.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === validTab);
        });

        const meta = this.tabMeta[validTab];
        const title = document.getElementById('active-tab-title');
        const kicker = document.getElementById('active-tab-kicker');
        const description = document.getElementById('active-tab-description');

        if (title) title.textContent = meta.title;
        if (kicker) kicker.textContent = meta.kicker;
        if (description) description.textContent = meta.description;

        document.title = `Alfred - ${meta.title}`;
        State.setCurrentTab(validTab);

        if (updateHash && window.location.hash.replace('#', '') !== validTab) {
            window.location.hash = validTab;
        }

        this.refreshTabData(validTab);
    },

    /**
     * Sync the active tab from the hash
     */
    syncTabFromHash() {
        this.activateTab(this.getTabFromHash(), false);
    },

    /**
     * Refresh data when switching tabs
     */
    async refreshTabData(tabId) {
        switch (tabId) {
            case 'chat':
                ChatFeature.loadConversations();
                break;
            case 'todos':
                TodosFeature.loadTodos();
                break;
            case 'habits':
                HabitsFeature.loadHabits();
                break;
            case 'settings':
                SettingsFeature.loadSettings();
                break;
        }
    },

    /**
     * Setup global listeners
     */
    setupGlobalListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            State.setOnlineStatus(true);
            SupabaseDB.syncQueue();
            ChatFeature.updateStatus();
        });

        window.addEventListener('offline', () => {
            State.setOnlineStatus(false);
            ChatFeature.updateStatus();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K: Focus chat input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    this.activateTab('chat');
                    setTimeout(() => chatInput.focus(), 100);
                }
            }

            // Escape: Clear notifications
            if (e.key === 'Escape') {
                State.setNotification(null);
                State.setError(null);
            }
        });

        // Handle visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.applyTheme();
                // Tab became visible - refresh data
                this.activateTab(State.currentTab || this.getTabFromHash(), false);
            }
        });
    },

    /**
     * Resolve active theme from user mode and local time
     */
    resolveTheme(mode = State.themeMode || 'auto') {
        if (mode === 'light' || mode === 'dark') return mode;

        const hour = new Date().getHours();
        return hour >= 7 && hour < 19 ? 'light' : 'dark';
    },

    /**
     * Apply theme attributes to document
     */
    applyTheme(mode = State.themeMode || Storage.getThemeMode()) {
        const root = document.documentElement;
        const resolvedTheme = this.resolveTheme(mode);

        root.setAttribute('data-theme-mode', mode);
        root.setAttribute('data-theme', resolvedTheme);
    },

    /**
     * Show welcome message for first-time users
     */
    async showWelcome() {
        State.setNotification('Welcome to Alfred');
    },

    /**
     * Show notification toast
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Get app status summary
     */
    getStatus() {
        return {
            version: '1.0.0',
            initialized: State.isInitialized,
            online: State.isOnline,
            supabase: SupabaseDB.isConnected,
            provider: State.aiProvider,
            model: State.aiModel,
            localMode: State.isLocalMode,
            currentTab: State.currentTab
        };
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Alfred.initialize());
} else {
    Alfred.initialize();
}

// Export for debugging
window.Alfred = Alfred;
