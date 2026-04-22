/**
 * Alfred - Groq API Integration
 * Fast inference for iOS and cloud fallback
 */

const GroqAPI = {
    API_URL: 'https://api.groq.com/openai/v1/chat/completions',

    /**
     * Check if Groq is available (has API key)
     */
    async isAvailable() {
        const apiKey = Storage.getGroqKey();
        return !!apiKey;
    },

    /**
     * Send chat message to Groq
     */
    async chat(message, history = []) {
        const apiKey = Storage.getGroqKey();

        if (!apiKey) {
            throw new Error('Groq API key not configured. Add it in Settings.');
        }

        const model = 'llama-3.1-70b-versatile'; // Best model on Groq free tier

        // Format messages for Groq/OpenAI format
        const messages = this.formatHistory(history, message);

        const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 1024,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error?.message || `Groq API error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            model: data.model || model,
            usage: data.usage
        };
    },

    /**
     * Format conversation history for Groq API
     */
    formatHistory(history, newMessage) {
        const messages = [];

        // Add system message
        messages.push({
            role: 'system',
            content: `You are Alfred, a helpful personal AI assistant. You are friendly, concise, and helpful. You remember context from the conversation and provide consistent responses.`
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
    },

    /**
     * Get available Groq models
     */
    async listModels() {
        const apiKey = Storage.getGroqKey();

        if (!apiKey) return [];

        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.data?.map(m => m.id) || [];
        } catch (e) {
            return [];
        }
    }
};

// Export for use in other modules
window.GroqAPI = GroqAPI;
