/**
 * Alfred - Ollama Integration
 * Handles both cloud gateway and local Ollama instances
 */

const OllamaAPI = {
    // Cloud gateway endpoint (adjust if you have a specific gateway)
    CLOUD_ENDPOINT: 'https://ollama.cloud/api/generate',

    // Local endpoint
    LOCAL_ENDPOINT: 'http://localhost:11434',

    /**
     * Check if local Ollama is available
     */
    async isLocalAvailable() {
        try {
            const response = await fetch(`${this.LOCAL_ENDPOINT}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    },

    /**
     * Check if cloud Ollama is available (not rate limited)
     */
    async isCloudAvailable() {
        // For now, assume cloud is available
        // In production, you'd check against actual gateway
        return !State.cloudLimitReached;
    },

    /**
     * Check overall Ollama availability
     */
    async isAvailable() {
        return await this.isCloudAvailable() || await this.isLocalAvailable();
    },

    /**
     * Chat using cloud Ollama
     */
    async chatCloud(message, history = []) {
        const model = Storage.getAIModel() || 'qwen3.5:cloud';

        // Format conversation history for Ollama
        const messages = this.formatHistory(history, message);

        const response = await fetch(this.CLOUD_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false
            })
        });

        if (!response.ok) {
            const error = new Error(`Cloud Ollama error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        return {
            content: data.message?.content || data.response || '',
            model: data.model || model
        };
    },

    /**
     * Chat using local Ollama
     */
    async chatLocal(message, history = []) {
        const model = Storage.getAIModel() || 'phi3';

        // Verify local Ollama is running
        if (!await this.isLocalAvailable()) {
            throw new Error('Local Ollama not running. Start with: ollama serve');
        }

        // Format conversation history
        const messages = this.formatHistory(history, message);

        const response = await fetch(`${this.LOCAL_ENDPOINT}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false
            })
        });

        if (!response.ok) {
            const error = new Error(`Local Ollama error: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        return {
            content: data.message?.content || '',
            model: data.model || model
        };
    },

    /**
     * Format conversation history for Ollama API
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
     * List available local models
     */
    async listLocalModels() {
        try {
            const response = await fetch(`${this.LOCAL_ENDPOINT}/api/tags`);
            if (!response.ok) return [];

            const data = await response.json();
            return data.models?.map(m => m.name) || [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Pull a model (triggers ollama pull)
     */
    async pullModel(modelName) {
        // This would need to be done via CLI
        // Web can't directly pull models
        return {
            success: false,
            message: `Please run: ollama pull ${modelName}`
        };
    }
};

// Export for use in other modules
window.OllamaAPI = OllamaAPI;
