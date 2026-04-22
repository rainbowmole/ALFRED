/**
 * Alfred - Cloudflare Workers AI Integration
 * Fallback provider for when Groq is rate limited
 */

const CloudflareAPI = {
    // Cloudflare Workers AI endpoint
    // You'll need to deploy a simple worker or use the direct API
    ACCOUNT_ID: '', // Set in settings
    API_KEY: '',

    /**
     * Check if Cloudflare AI is available
     */
    async isAvailable() {
        const apiKey = Storage.getCloudflareKey();
        const accountId = Storage.get('alfred_cloudflare_account');
        return !!(apiKey && accountId);
    },

    /**
     * Send chat message to Cloudflare Workers AI
     */
    async chat(message, history = []) {
        const apiKey = Storage.getCloudflareKey();
        const accountId = Storage.get('alfred_cloudflare_account');

        if (!apiKey || !accountId) {
            throw new Error('Cloudflare AI not configured. Add credentials in Settings.');
        }

        const model = '@cf/meta/llama-3-8b-instruct';

        // Format messages
        const messages = this.formatHistory(history, message);

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.errors?.[0]?.message || `Cloudflare AI error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        return {
            content: data.result?.response || data.result?.messages?.[0]?.content || '',
            model
        };
    },

    /**
     * Format conversation history for Cloudflare AI
     */
    formatHistory(history, newMessage) {
        const messages = [];

        // Add system message
        messages.push({
            role: 'system',
            content: `You are Alfred, a helpful personal AI assistant.`
        });

        // Add conversation history
        history.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        });

        // Add new message
        messages.push({
            role: 'user',
            content: newMessage
        });

        return messages;
    }
};

// Export for use in other modules
window.CloudflareAPI = CloudflareAPI;
