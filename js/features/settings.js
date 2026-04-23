/**
 * Alfred - Settings Feature
 * Handles configuration for Supabase, AI providers, and integrations
 */

const SettingsFeature = {
    /**
     * Initialize settings feature
     */
    async initialize() {
        this.setupEventListeners();
        this.loadSettings();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Supabase config
        const saveSupabaseBtn = document.getElementById('save-supabase');
        if (saveSupabaseBtn) {
            saveSupabaseBtn.addEventListener('click', () => this.saveSupabaseConfig());
        }

        // AI provider change
        const aiProviderSelect = document.getElementById('ai-provider');
        if (aiProviderSelect) {
            aiProviderSelect.addEventListener('change', (e) => {
                this.toggleProviderFields(e.target.value);
            });
        }

        // Save AI settings
        const saveAiBtn = document.getElementById('save-ai');
        if (saveAiBtn) {
            saveAiBtn.addEventListener('click', () => this.saveAiSettings());
        }

        // Save appearance settings
        const saveThemeBtn = document.getElementById('save-theme');
        if (saveThemeBtn) {
            saveThemeBtn.addEventListener('click', () => this.saveThemeSettings());
        }

        // Toggle local mode
        const localModeToggle = document.getElementById('local-mode-toggle');
        if (localModeToggle) {
            localModeToggle.addEventListener('change', (e) => {
                AIProvider.toggleLocalMode();
                ChatFeature.updateStatus();
            });
        }

        // Groq key
        const groqKeyInput = document.getElementById('groq-key');
        if (groqKeyInput) {
            groqKeyInput.addEventListener('change', () => {
                Storage.setGroqKey(groqKeyInput.value.trim());
            });
        }

        // Cloudflare key
        const cloudflareKeyInput = document.getElementById('cloudflare-key');
        if (cloudflareKeyInput) {
            cloudflareKeyInput.addEventListener('change', () => {
                Storage.setCloudflareKey(cloudflareKeyInput.value.trim());
            });
        }

        const cloudflareAccountInput = document.getElementById('cloudflare-account');
        if (cloudflareAccountInput) {
            cloudflareAccountInput.addEventListener('change', () => {
                Storage.set('alfred_cloudflare_account', cloudflareAccountInput.value.trim());
            });
        }

        // Notion token
        const saveNotionBtn = document.getElementById('save-notion');
        if (saveNotionBtn) {
            saveNotionBtn.addEventListener('click', () => this.saveNotionToken());
        }

        // Clear all data
        const clearDataBtn = document.getElementById('clear-data');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => Storage.clearAll());
        }

        // Export data
        const exportDataBtn = document.getElementById('export-data');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportData());
        }
    },

    /**
     * Load current settings into form fields
     */
    loadSettings() {
        // Supabase config
        const supabaseConfig = Storage.getSupabaseConfig();
        const supabaseUrlInput = document.getElementById('supabase-url');
        const supabaseKeyInput = document.getElementById('supabase-key');
        const userIdInput = document.getElementById('user-id');

        if (supabaseUrlInput) supabaseUrlInput.value = supabaseConfig.url || '';
        if (supabaseKeyInput) supabaseKeyInput.value = supabaseConfig.key || '';
        if (userIdInput) userIdInput.value = Storage.getUserId() || '';

        // AI settings
        const aiProviderSelect = document.getElementById('ai-provider');
        const aiModelInput = document.getElementById('ai-model');
        const themeModeSelect = document.getElementById('theme-mode');
        const groqKeyInput = document.getElementById('groq-key');
        const cloudflareKeyInput = document.getElementById('cloudflare-key');
        const cloudflareAccountInput = document.getElementById('cloudflare-account');
        const localModeToggle = document.getElementById('local-mode-toggle');

        if (aiProviderSelect) aiProviderSelect.value = Storage.getAIProvider();
        if (aiModelInput) aiModelInput.value = Storage.getAIModel();
        if (themeModeSelect) themeModeSelect.value = Storage.getThemeMode();
        if (groqKeyInput) groqKeyInput.value = Storage.getGroqKey() || '';
        if (cloudflareKeyInput) cloudflareKeyInput.value = Storage.getCloudflareKey() || '';
        if (cloudflareAccountInput) cloudflareAccountInput.value = Storage.get('alfred_cloudflare_account') || '';

        if (localModeToggle) {
            localModeToggle.checked = Storage.getPreferences().localMode || false;
        }

        // Notion
        const notionTokenInput = document.getElementById('notion-token');
        if (notionTokenInput) {
            notionTokenInput.value = Storage.getNotionToken() || '';
        }

        // Toggle provider fields
        this.toggleProviderFields(aiProviderSelect?.value || 'ollama-cloud');
    },

    /**
     * Toggle visibility of provider-specific fields
     */
    toggleProviderFields(provider) {
        const groqField = document.getElementById('groq-key-field');
        const cloudflareField = document.getElementById('cloudflare-field');

        if (groqField) {
            groqField.classList.toggle('hidden', provider !== 'groq');
        }
        if (cloudflareField) {
            cloudflareField.classList.toggle('hidden', provider !== 'cloudflare');
        }
    },

    /**
     * Save Supabase configuration
     */
    async saveSupabaseConfig() {
        const url = document.getElementById('supabase-url')?.value.trim();
        const key = document.getElementById('supabase-key')?.value.trim();
        const userId = document.getElementById('user-id')?.value.trim();

        if (!url || !key) {
            State.setError('Supabase URL and Key are required');
            return;
        }

        Storage.setSupabaseConfig(url, key);
        if (userId) Storage.set('alfred_user_id', userId);

        State.setNotification('Supabase configuration saved');

        // Reinitialize database connection
        await SupabaseDB.initialize();
        if (SupabaseDB.isConnected) {
            State.setNotification('Connected to Supabase!');
        } else {
            State.setNotification('Saved (offline mode)');
        }

        // Reload data
        ChatFeature.loadConversations();
        TodosFeature.loadTodos();
        HabitsFeature.loadHabits();
    },

    /**
     * Save AI settings
     */
    saveAiSettings() {
        const provider = document.getElementById('ai-provider')?.value;
        const model = document.getElementById('ai-model')?.value.trim();
        const groqKey = document.getElementById('groq-key')?.value.trim();
        const cloudflareKey = document.getElementById('cloudflare-key')?.value.trim();
        const cloudflareAccount = document.getElementById('cloudflare-account')?.value.trim();

        if (provider) Storage.setAIProvider(provider);
        if (model) Storage.setAIModel(model);
        if (groqKey) Storage.setGroqKey(groqKey);
        if (cloudflareKey) Storage.setCloudflareKey(cloudflareKey);
        if (cloudflareAccount) Storage.set('alfred_cloudflare_account', cloudflareAccount);

        State.setNotification('AI settings saved');
        ChatFeature.updateStatus();
    },

    /**
     * Save appearance settings
     */
    saveThemeSettings() {
        const mode = document.getElementById('theme-mode')?.value || 'auto';

        Storage.setThemeMode(mode);
        State.setThemeMode(mode);
        Alfred.applyTheme(mode);

        State.setNotification(`Theme set to ${mode}`);
    },

    /**
     * Save Notion integration token
     */
    saveNotionToken() {
        const token = document.getElementById('notion-token')?.value.trim();

        if (!token) {
            State.setError('Notion token is required');
            return;
        }

        Storage.setNotionToken(token);
        State.setNotification('Notion integration saved');
    },

    /**
     * Export all Alfred data
     */
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            conversations: Storage.get('alfred_conversations', []),
            todos: Storage.get('alfred_todos', []),
            habits: Storage.get('alfred_habits', []),
            preferences: Storage.getPreferences()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alfred-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        State.setNotification('Data exported');
    },

    /**
     * Get settings summary
     */
    getSummary() {
        const prefs = Storage.getPreferences();
        const supabaseConfig = Storage.getSupabaseConfig();

        return {
            provider: Storage.getAIProvider(),
            model: Storage.getAIModel(),
            localMode: prefs.localMode || false,
            supabaseConnected: !!supabaseConfig.url && SupabaseDB.isConnected,
            groqConfigured: !!Storage.getGroqKey(),
            cloudflareConfigured: !!(Storage.getCloudflareKey() && Storage.get('alfred_cloudflare_account')),
            notionConfigured: !!Storage.getNotionToken()
        };
    }
};

// Export for use in other modules
window.SettingsFeature = SettingsFeature;
