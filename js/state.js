/**
 * Alfred - State Management
 * Simple reactive state store for the application
 */

const State = {
    // Application state
    currentTab: 'chat',
    isOnline: navigator.onLine,
    isInitialized: false,

    // Supabase
    supabase: null,
    userId: null,

    // AI Provider state
    aiProvider: 'ollama-cloud',
    aiModel: 'phi3',
    themeMode: 'auto',
    isLocalMode: false,
    cloudLimitReached: false,

    // Data caches
    conversations: [],
    currentConversationId: null,
    todos: [],
    habits: [],
    preferences: {},

    // UI state
    isLoading: false,
    error: null,
    notification: null,

    // ========== Subscription System ==========

    subscribers: {},

    /**
     * Subscribe to state changes
     * @param {string} key - State key to watch
     * @param {function} callback - Function to call on change
     */
    subscribe(key, callback) {
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers[key] = this.subscribers[key].filter(cb => cb !== callback);
        };
    },

    /**
     * Notify subscribers of state change
     */
    notify(key, value) {
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => {
                try {
                    callback(value, key);
                } catch (e) {
                    console.error(`Subscriber error for ${key}:`, e);
                }
            });
        }
    },

    // ========== State Setters ==========

    setCurrentTab(tab) {
        this.currentTab = tab;
        this.notify('currentTab', tab);
    },

    setOnlineStatus(online) {
        this.isOnline = online;
        this.notify('isOnline', online);
        this.notify('connectionStatus', online ? 'online' : 'offline');
    },

    setSupabase(client) {
        this.supabase = client;
        this.notify('supabase', client);
    },

    setUserId(id) {
        this.userId = id;
        this.notify('userId', id);
    },

    setAIProvider(provider) {
        this.aiProvider = provider;
        this.notify('aiProvider', provider);
    },

    setAIModel(model) {
        this.aiModel = model;
        this.notify('aiModel', model);
    },

    setThemeMode(mode) {
        this.themeMode = mode;
        this.notify('themeMode', mode);
    },

    setLocalMode(enabled) {
        this.isLocalMode = enabled;
        this.notify('isLocalMode', enabled);
    },

    setCloudLimitReached(reached) {
        this.cloudLimitReached = reached;
        this.notify('cloudLimitReached', reached);
    },

    setConversations(convos) {
        this.conversations = convos;
        this.notify('conversations', convos);
    },

    setCurrentConversationId(id) {
        this.currentConversationId = id;
        this.notify('currentConversationId', id);
    },

    setTodos(todos) {
        this.todos = todos;
        this.notify('todos', todos);
    },

    setHabits(habits) {
        this.habits = habits;
        this.notify('habits', habits);
    },

    setLoading(loading) {
        this.isLoading = loading;
        this.notify('isLoading', loading);
    },

    setError(error) {
        this.error = error;
        this.notify('error', error);
        if (error) {
            setTimeout(() => this.setError(null), 5000);
        }
    },

    setNotification(notification) {
        this.notification = notification;
        this.notify('notification', notification);
        if (notification) {
            setTimeout(() => this.setNotification(null), 3000);
        }
    },

    // ========== Initialization ==========

    async initialize() {
        if (this.isInitialized) return;

        // Load settings from storage
        this.userId = Storage.getUserId();
        this.aiProvider = Storage.getAIProvider();
        this.aiModel = Storage.getAIModel();
        this.themeMode = Storage.getThemeMode();

        // Set up online/offline listeners
        window.addEventListener('online', () => this.setOnlineStatus(true));
        window.addEventListener('offline', () => this.setOnlineStatus(false));

        this.isInitialized = true;
        this.notify('initialized', true);

        console.log('[State] Alfred initialized');
    }
};

// Export for use in other modules
window.State = State;
