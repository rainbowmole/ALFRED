/**
 * Alfred - AI Provider Router
 * Handles cloud-first routing with automatic fallback to local models
 */

const AIProvider = {
    // Provider constants
    PROVIDERS: {
        OLLAMA_CLOUD: 'ollama-cloud',
        OLLAMA_LOCAL: 'ollama-local',
        GROQ: 'groq',
        CLOUDFLARE: 'cloudflare'
    },

    // Rate limit tracking
    rateLimits: {
        'ollama-cloud': { hits: 0, resetTime: null, maxHits: 100 },
        'groq': { hits: 0, resetTime: null, maxHits: 30 } // per minute
    },

    /**
     * Get the appropriate provider based on device and availability
     */
    async getProvider() {
        const isLocal = Storage.isLocal();
        const isIOS = Storage.isIOS();
        const localMode = Storage.getPreferences().localMode || false;

        // Force local mode if user requested
        if (localMode && isLocal) {
            console.log('[AIProvider] Using local mode by user request');
            return this.PROVIDERS.OLLAMA_LOCAL;
        }

        // iOS devices use Groq
        if (isIOS) {
            if (await GroqAPI.isAvailable()) {
                return this.PROVIDERS.GROQ;
            }
            return this.PROVIDERS.CLOUDFLARE;
        }

        // Laptop/Desktop: Cloud-first with local fallback
        if (isLocal) {
            // Check if cloud provider has hit limits
            if (State.cloudLimitReached) {
                console.log('[AIProvider] Cloud limit reached, using local');
                return this.PROVIDERS.OLLAMA_LOCAL;
            }

            // Try cloud first
            if (await OllamaAPI.isCloudAvailable()) {
                return this.PROVIDERS.OLLAMA_CLOUD;
            }

            // Fallback to local
            console.log('[AIProvider] Cloud unavailable, using local');
            return this.PROVIDERS.OLLAMA_LOCAL;
        }

        // Default to Groq for other cases
        return this.PROVIDERS.GROQ;
    },

    /**
     * Send a message to the AI and get a response
     */
    async chat(message, conversationHistory = []) {
        const provider = await this.getProvider();
        State.setAIProvider(provider);

        try {
            let response;

            switch (provider) {
                case this.PROVIDERS.OLLAMA_CLOUD:
                    response = await OllamaAPI.chatCloud(message, conversationHistory);
                    break;
                case this.PROVIDERS.OLLAMA_LOCAL:
                    response = await OllamaAPI.chatLocal(message, conversationHistory);
                    break;
                case this.PROVIDERS.GROQ:
                    response = await GroqAPI.chat(message, conversationHistory);
                    break;
                case this.PROVIDERS.CLOUDFLARE:
                    response = await CloudflareAPI.chat(message, conversationHistory);
                    break;
                default:
                    throw new Error(`Unknown provider: ${provider}`);
            }

            // Reset rate limit on success
            this.rateLimits[provider].hits = 0;

            return {
                success: true,
                content: response.content,
                provider,
                model: response.model
            };
        } catch (error) {
            console.error(`[AIProvider] ${provider} failed:`, error);

            // Handle rate limit errors
            if (error.status === 429 || error.message.includes('rate limit')) {
                this.handleRateLimit(provider);

                // Auto-retry with fallback provider
                if (provider === this.PROVIDERS.OLLAMA_CLOUD) {
                    State.setCloudLimitReached(true);
                    State.setNotification('Cloud limit reached - switched to local Phi-3');
                    return this.chat(message, conversationHistory); // Retry with local
                }

                if (provider === this.PROVIDERS.GROQ) {
                    State.setNotification('Groq rate limited - try again in a moment');
                }
            }

            // Handle offline
            if (!navigator.onLine && provider !== this.PROVIDERS.OLLAMA_LOCAL) {
                State.setNotification('Offline - using local AI');
                return this.chat(message, conversationHistory); // Retry with local
            }

            return {
                success: false,
                error: error.message,
                provider
            };
        }
    },

    /**
     * Handle rate limit for a provider
     */
    handleRateLimit(provider) {
        const limit = this.rateLimits[provider];
        limit.hits = limit.maxHits;
        limit.resetTime = Date.now() + 60000; // 1 minute

        console.log(`[AIProvider] ${provider} rate limited until ${new Date(limit.resetTime).toLocaleTimeString()}`);
    },

    /**
     * Check if provider is rate limited
     */
    isRateLimited(provider) {
        const limit = this.rateLimits[provider];
        if (!limit.resetTime) return false;

        if (Date.now() > limit.resetTime) {
            // Reset
            limit.hits = 0;
            limit.resetTime = null;
            return false;
        }

        return limit.hits >= limit.maxHits;
    },

    /**
     * Get current provider status
     */
    getStatus() {
        return {
            provider: State.aiProvider,
            model: State.aiModel,
            isLocal: State.isLocalMode,
            cloudLimitReached: State.cloudLimitReached,
            isOnline: State.isOnline
        };
    },

    /**
     * Toggle local mode
     */
    toggleLocalMode() {
        const prefs = Storage.getPreferences();
        prefs.localMode = !prefs.localMode;
        Storage.setPreferences(prefs);
        State.setLocalMode(prefs.localMode);

        if (prefs.localMode) {
            State.setCloudLimitReached(true); // Force local
        } else {
            State.setCloudLimitReached(false);
        }

        return prefs.localMode;
    }
};

// Export for use in other modules
window.AIProvider = AIProvider;
