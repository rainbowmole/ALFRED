/**
 * Alfred - Chat Feature
 * Handles conversation UI and AI communication
 */

const ChatFeature = {
    currentConversationId: null,
    messageHistory: [],

    /**
     * Initialize chat feature
     */
    async initialize() {
        this.setupEventListeners();
        await this.loadConversations();
        await this.createNewConversation();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('chat-form');
        const input = document.getElementById('chat-input');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const message = input.value.trim();
                if (message) {
                    this.sendMessage(message);
                    input.value = '';
                }
            });
        }

        // Handle Enter key
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    form.dispatchEvent(new Event('submit'));
                }
            });
        }
    },

    /**
     * Load conversations list
     */
    async loadConversations() {
        if (!SupabaseDB.isConnected) {
            // Load from localStorage if offline
            const saved = Storage.get('alfred_conversations', []);
            this.renderConversationList(saved);
            return;
        }

        try {
            const conversations = await SupabaseDB.getConversations();
            Storage.set('alfred_conversations', conversations || []);
            this.renderConversationList(conversations || []);
        } catch (error) {
            console.error('[Chat] Failed to load conversations:', error);
        }
    },

    /**
     * Render conversation list in sidebar
     */
    renderConversationList(conversations) {
        const container = document.getElementById('conversation-list');
        if (!container) return;

        container.innerHTML = conversations.map(convo => `
            <button
                class="w-full text-left px-3 py-2 hover:bg-gray-700 rounded ${convo.id === this.currentConversationId ? 'bg-gray-700' : ''}"
                onclick="ChatFeature.switchConversation('${convo.id}')"
            >
                <span class="text-sm truncate">${this.escapeHtml(convo.title)}</span>
            </button>
        `).join('');
    },

    /**
     * Create new conversation
     */
    async createNewConversation(title = 'New Conversation') {
        State.setLoading(true);

        try {
            if (SupabaseDB.isConnected) {
                const convo = await SupabaseDB.createConversation(title);
                this.currentConversationId = convo.id;
                this.messageHistory = [];
                Storage.set('alfred_current_conversation', convo.id);
            } else {
                // Offline mode - use localStorage
                this.currentConversationId = 'local_' + Date.now();
                this.messageHistory = [];
            }

            this.clearChatUI();
            this.addMessageToUI('assistant', "Hello! I'm Alfred. How can I help you today?");
        } catch (error) {
            console.error('[Chat] Failed to create conversation:', error);
            State.setError('Failed to start conversation');
        } finally {
            State.setLoading(false);
        }
    },

    /**
     * Switch to a different conversation
     */
    async switchConversation(conversationId) {
        State.setLoading(true);

        try {
            this.currentConversationId = conversationId;
            Storage.set('alfred_current_conversation', conversationId);

            // Load messages
            if (SupabaseDB.isConnected) {
                const messages = await SupabaseDB.getMessages(conversationId);
                this.messageHistory = messages || [];
            } else {
                const saved = Storage.get(`alfred_messages_${conversationId}`, []);
                this.messageHistory = saved;
            }

            this.renderMessageHistory();
        } catch (error) {
            console.error('[Chat] Failed to switch conversation:', error);
        } finally {
            State.setLoading(false);
        }
    },

    /**
     * Send a message
     */
    async sendMessage(content) {
        State.setLoading(true);

        // Add user message to UI immediately
        this.addMessageToUI('user', content);

        // Save message
        if (SupabaseDB.isConnected && this.currentConversationId) {
            await SupabaseDB.addMessage(this.currentConversationId, 'user', content);
        }

        // Add to history
        this.messageHistory.push({ role: 'user', content });

        // Get AI response
        try {
            const response = await AIProvider.chat(content, this.messageHistory);

            if (response.success) {
                this.addMessageToUI('assistant', response.content);

                // Save assistant message
                if (SupabaseDB.isConnected && this.currentConversationId) {
                    await SupabaseDB.addMessage(
                        this.currentConversationId,
                        'assistant',
                        response.content,
                        response.model
                    );
                }

                // Update history
                this.messageHistory.push({
                    role: 'assistant',
                    content: response.content
                });
            } else {
                this.addMessageToUI('assistant', `I apologize, but I encountered an error: ${response.error}`);
            }
        } catch (error) {
            console.error('[Chat] AI request failed:', error);
            this.addMessageToUI('assistant', 'I apologize, but I encountered an error. Please try again.');
        } finally {
            State.setLoading(false);
        }
    },

    /**
     * Add message to UI
     */
    addMessageToUI(role, content) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex items-start gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`;

        const avatar = role === 'assistant' ? '🤖' : '👤';
        const bgColor = role === 'assistant' ? 'bg-gray-800' : 'bg-amber-600';

        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-sm flex-shrink-0">
                ${avatar}
            </div>
            <div class="${bgColor} rounded-lg p-3 max-w-[80%] break-words">
                <p class="whitespace-pre-wrap">${this.escapeHtml(content)}</p>
            </div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    },

    /**
     * Render full message history
     */
    renderMessageHistory() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = '';
        this.messageHistory.forEach(msg => {
            this.addMessageToUI(msg.role, msg.content);
        });
    },

    /**
     * Clear chat UI
     */
    clearChatUI() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = '';
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Update status indicator
     */
    updateStatus() {
        const statusText = document.getElementById('status-text');
        const indicator = document.getElementById('status-indicator');

        if (!statusText) return;

        const provider = AIProvider.getStatus();
        const statusMap = {
            'ollama-cloud': 'Cloud AI',
            'ollama-local': 'Local AI',
            'groq': 'Groq AI',
            'cloudflare': 'Cloudflare AI'
        };

        const icon = provider.isOnline ? '🟢' : '🟡';
        const text = `${statusMap[provider.provider] || 'AI'} ${provider.isLocal ? '(Local)' : ''}`;

        statusText.textContent = text;
        indicator.title = `Provider: ${provider.provider}\nModel: ${provider.model}\nOnline: ${provider.isOnline}`;
    }
};

// Export for use in other modules
window.ChatFeature = ChatFeature;
