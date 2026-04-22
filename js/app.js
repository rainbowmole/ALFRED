/**
 * Alfred - Main Application Entry Point
 * Initializes all features and handles global state
 */

const Alfred = {
    /**
     * Initialize the application
     */
    async initialize() {
        console.log('[Alfred] Starting...');

        // Initialize state
        await State.initialize();

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

        // Update status indicator
        ChatFeature.updateStatus();

        // Mark as ready
        State.setInitialized = true;
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

                // Update active nav
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // Show tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    tabContent.classList.add('active');
                }

                // Update state
                State.setCurrentTab(tabId);

                // Refresh data when switching tabs
                this.refreshTabData(tabId);
            });
        });
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
                    document.getElementById('chat').click();
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
                // Tab became visible - refresh data
                this.refreshTabData(State.currentTab);
            }
        });
    },

    /**
     * Show welcome message for first-time users
     */
    async showWelcome() {
        const welcomeMessage = `👋 Welcome to Alfred!

I'm your personal AI assistant. Here's what I can help you with:

💬 **Chat** - Talk to me anytime. I remember everything!
✅ **To-Do** - Track your tasks and goals
📊 **Habits** - Build streaks and track progress
⚙️ **Settings** - Configure AI providers and integrations

**Quick Start:**
1. Go to Settings and add your Supabase credentials for sync
2. Add a Groq API key for iOS access (free at console.groq.com)
3. Start chatting! I use cloud AI by default, with local fallback

Press Ctrl+K to quickly focus the chat from anywhere.`;

        // Add welcome to chat
        setTimeout(() => {
            ChatFeature.addMessageToUI('assistant', welcomeMessage);
        }, 500);
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
