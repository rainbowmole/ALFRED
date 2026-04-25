/**
 * Alfred - Chat Feature
 * Handles conversation UI and AI communication
 */

const ChatFeature = {
    currentConversationId: null,
    messageHistory: [],
    isDrawerOpen: false,
    speechRecognition: null,
    isListening: false,

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
        const newConversationButton = document.getElementById('new-conversation-button');
        const drawerToggle = document.getElementById('mobile-conversations-toggle');
        const drawerBackdrop = document.getElementById('conversation-drawer-backdrop');
        const plusButton = document.getElementById('chat-plus-button');
        const micButton = document.getElementById('chat-mic-button');

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

        if (newConversationButton) {
            newConversationButton.addEventListener('click', async () => {
                await this.createNewConversation();
                await this.loadConversations();
                this.closeDrawer();
            });
        }

        if (drawerToggle) {
            drawerToggle.addEventListener('click', () => {
                this.toggleDrawer();
            });
        }

        if (drawerBackdrop) {
            drawerBackdrop.addEventListener('click', () => {
                this.closeDrawer();
            });
        }

        if (plusButton) {
            plusButton.addEventListener('click', () => {
                State.setNotification('Attachment options coming soon');
            });
        }

        if (micButton) {
            micButton.addEventListener('click', () => {
                this.handleMicInput();
            });
        }

        window.addEventListener('resize', () => {
            if (!this.isMobileViewport()) {
                this.closeDrawer();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDrawerOpen) {
                this.closeDrawer();
            }
        });
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

        if (!conversations.length) {
            container.innerHTML = '<p class="empty-state">No conversations yet. Start one above.</p>';
            return;
        }

        container.innerHTML = conversations.map(convo => `
            <button
                class="conversation-item ${convo.id === this.currentConversationId ? 'active' : ''}"
                onclick="ChatFeature.switchConversation('${convo.id}')"
            >
                <p class="conversation-item-title">${this.escapeHtml(convo.title)}</p>
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
            this.renderWelcomeState();
            await this.loadConversations();
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
            await this.loadConversations();
            this.closeDrawer();
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

        const greeting = container.querySelector('.chat-greeting');
        if (greeting) {
            greeting.remove();
        }

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

        if (!this.messageHistory.length) {
            this.renderWelcomeState();
            return;
        }

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
     * Build a time-aware greeting payload
     */
    getTimeBasedGreeting() {
        const hour = new Date().getHours();
        const accountName = (Storage.get('alfred_account_name', '') || '').trim();

        if (hour < 12) {
            return {
                title: accountName ? `Good morning, ${accountName}.` : 'Good morning.',
                subtitle: 'How can I help you this morning?'
            };
        }

        if (hour < 18) {
            return {
                title: accountName ? `Good afternoon, ${accountName}.` : 'Good afternoon.',
                subtitle: 'How can I help you this afternoon?'
            };
        }

        return {
            title: accountName ? `Good evening, ${accountName}.` : 'Good evening.',
            subtitle: 'How can I help you this evening?'
        };
    },

    /**
     * Render Claude-style centered greeting for empty chat
     */
    renderWelcomeState() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const greeting = this.getTimeBasedGreeting();
        container.innerHTML = `
            <div class="chat-greeting" role="status" aria-live="polite">
                <h2 class="chat-greeting-title">${this.escapeHtml(greeting.title)}</h2>
                <p class="chat-greeting-subtitle">${this.escapeHtml(greeting.subtitle)}</p>
            </div>
        `;
    },

    /**
     * Whether mobile drawer behavior should be active
     */
    isMobileViewport() {
        return window.matchMedia('(max-width: 720px)').matches;
    },

    /**
     * Open or close the mobile conversation drawer
     */
    toggleDrawer(forceOpen) {
        const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !this.isDrawerOpen;
        this.isDrawerOpen = shouldOpen;

        document.body.classList.toggle('chat-drawer-open', shouldOpen);

        const drawerToggle = document.getElementById('mobile-conversations-toggle');
        if (drawerToggle) {
            drawerToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        }
    },

    /**
     * Close the mobile drawer if it is open
     */
    closeDrawer() {
        this.toggleDrawer(false);
    },

    /**
     * Start or stop speech-to-text and place transcript in chat input
     */
    handleMicInput() {
        const micButton = document.getElementById('chat-mic-button');
        const input = document.getElementById('chat-input');
        if (!input) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            State.setNotification('Microphone input is not supported on this browser');
            return;
        }

        if (!this.speechRecognition) {
            this.speechRecognition = new SpeechRecognition();
            this.speechRecognition.lang = navigator.language || 'en-US';
            this.speechRecognition.interimResults = false;
            this.speechRecognition.continuous = false;
            this.speechRecognition.maxAlternatives = 1;

            this.speechRecognition.onresult = (event) => {
                const transcript = event.results?.[0]?.[0]?.transcript?.trim();
                if (!transcript) return;

                input.value = input.value ? `${input.value} ${transcript}` : transcript;
                input.focus();
            };

            this.speechRecognition.onstart = () => {
                this.isListening = true;
                micButton?.classList.add('active');
            };

            this.speechRecognition.onend = () => {
                this.isListening = false;
                micButton?.classList.remove('active');
            };

            this.speechRecognition.onerror = () => {
                this.isListening = false;
                micButton?.classList.remove('active');
                State.setError('Microphone input failed');
            };
        }

        if (this.isListening) {
            this.speechRecognition.stop();
            return;
        }

        this.speechRecognition.start();
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
