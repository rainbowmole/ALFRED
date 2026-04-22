/**
 * Alfred - Local Storage Manager
 * Handles localStorage for settings, API keys, and offline queue
 */

const Storage = {
    KEYS: {
        SUPABASE_URL: 'alfred_supabase_url',
        SUPABASE_KEY: 'alfred_supabase_key',
        USER_ID: 'alfred_user_id',
        GROQ_KEY: 'alfred_groq_key',
        CLOUDFLARE_KEY: 'alfred_cloudflare_key',
        NOTION_TOKEN: 'alfred_notion_token',
        AI_PROVIDER: 'alfred_ai_provider',
        AI_MODEL: 'alfred_ai_model',
        OFFLINE_QUEUE: 'alfred_offline_queue',
        PREFERENCES: 'alfred_preferences'
    },

    /**
     * Get value from localStorage
     */
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return JSON.parse(value);
        } catch (e) {
            console.error(`Storage.get error for ${key}:`, e);
            return defaultValue;
        }
    },

    /**
     * Set value in localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Storage.set error for ${key}:`, e);
            return false;
        }
    },

    /**
     * Remove value from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Storage.remove error for ${key}:`, e);
            return false;
        }
    },

    // ========== Configuration Getters/Setters ==========

    getSupabaseConfig() {
        return {
            url: this.get(this.KEYS.SUPABASE_URL),
            key: this.get(this.KEYS.SUPABASE_KEY)
        };
    },

    setSupabaseConfig(url, key) {
        this.set(this.KEYS.SUPABASE_URL, url);
        this.set(this.KEYS.SUPABASE_KEY, key);
    },

    getUserId() {
        let id = this.get(this.KEYS.USER_ID);
        if (!id) {
            // Generate a new user ID
            id = 'user_' + Math.random().toString(36).substr(2, 9);
            this.set(this.KEYS.USER_ID, id);
        }
        return id;
    },

    getGroqKey() {
        return this.get(this.KEYS.GROQ_KEY);
    },

    setGroqKey(key) {
        this.set(this.KEYS.GROQ_KEY, key);
    },

    getCloudflareKey() {
        return this.get(this.KEYS.CLOUDFLARE_KEY);
    },

    setCloudflareKey(key) {
        this.set(this.KEYS.CLOUDFLARE_KEY, key);
    },

    getNotionToken() {
        return this.get(this.KEYS.NOTION_TOKEN);
    },

    setNotionToken(token) {
        this.set(this.KEYS.NOTION_TOKEN, token);
    },

    getAIProvider() {
        return this.get(this.KEYS.AI_PROVIDER, 'ollama-cloud');
    },

    setAIProvider(provider) {
        this.set(this.KEYS.AI_PROVIDER, provider);
    },

    getAIModel() {
        return this.get(this.KEYS.AI_MODEL, 'phi3');
    },

    setAIModel(model) {
        this.set(this.KEYS.AI_MODEL, model);
    },

    // ========== Offline Queue Management ==========

    getOfflineQueue() {
        return this.get(this.KEYS.OFFLINE_QUEUE, []);
    },

    addToQueue(operation) {
        const queue = this.getOfflineQueue();
        queue.push({
            ...operation,
            queued_at: new Date().toISOString()
        });
        this.set(this.KEYS.OFFLINE_QUEUE, queue);
    },

    removeFromQueue(index) {
        const queue = this.getOfflineQueue();
        queue.splice(index, 1);
        this.set(this.KEYS.OFFLINE_QUEUE, queue);
    },

    clearOfflineQueue() {
        this.set(this.KEYS.OFFLINE_QUEUE, []);
    },

    // ========== Preferences ==========

    getPreferences() {
        return this.get(this.KEYS.PREFERENCES, {
            theme: 'dark',
            notifications: true,
            localMode: false
        });
    },

    setPreferences(prefs) {
        const current = this.getPreferences();
        this.set(this.KEYS.PREFERENCES, { ...current, ...prefs });
    },

    // ========== Utility ==========

    /**
     * Check if we're running locally (localhost or file://)
     */
    isLocal() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },

    /**
     * Check if we're on iOS
     */
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    },

    /**
     * Clear all Alfred data (reset)
     */
    clearAll() {
        if (confirm('This will delete all local Alfred data. Continue?')) {
            Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
            location.reload();
        }
    }
};

// Export for use in other modules
window.Storage = Storage;
