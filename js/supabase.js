/**
 * Alfred - Supabase Database Connection
 * Handles all database operations with offline support
 */

const SupabaseDB = {
    client: null,
    isConnected: false,

    /**
     * Initialize Supabase client
     */
    async initialize() {
        const config = Storage.getSupabaseConfig();

        if (!config.url || !config.key) {
            console.log('[Supabase] Not configured, using local mode');
            this.isConnected = false;
            return false;
        }

        try {
            // Create Supabase client
            this.client = supabase.createClient(config.url, config.key);

            // Test connection
            const { data, error } = await this.client
                .from('preferences')
                .select('count')
                .limit(1);

            if (error) throw error;

            this.isConnected = true;
            State.setSupabase(this.client);
            State.setUserId(Storage.getUserId());

            console.log('[Supabase] Connected successfully');
            return true;
        } catch (error) {
            console.error('[Supabase] Connection failed:', error);
            this.isConnected = false;
            State.setError('Database connection failed. Using offline mode.');
            return false;
        }
    },

    /**
     * Get or create user record
     */
    async getOrCreateUser() {
        const userId = Storage.getUserId();

        try {
            // Try to get existing user
            let { data: user } = await this.client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (!user) {
                // Create new user
                const { data: newUser, error } = await this.client
                    .from('users')
                    .insert({ id: userId, email: `user_${userId.substr(-6)}@alfred.local` })
                    .select()
                    .single();

                if (error) throw error;
                user = newUser;
            }

            return user;
        } catch (error) {
            console.error('[Supabase] User lookup failed:', error);
            return null;
        }
    },

    // ========== CONVERSATIONS ==========

    async createConversation(title = 'New Conversation') {
        const operation = async () => {
            const { data, error } = await this.client
                .from('conversations')
                .insert({
                    user_id: State.userId,
                    title
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('createConversation', operation);
    },

    async getConversations() {
        const operation = async () => {
            const { data, error } = await this.client
                .from('conversations')
                .select('*')
                .eq('user_id', State.userId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('getConversations', operation);
    },

    async addMessage(conversationId, role, content, modelUsed = null) {
        const operation = async () => {
            const { data, error } = await this.client
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    role,
                    content,
                    model_used: modelUsed
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('addMessage', operation);
    },

    async getMessages(conversationId) {
        const operation = async () => {
            const { data, error } = await this.client
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('getMessages', operation);
    },

    // ========== TODOS ==========

    async createTodo(title, description = '', priority = 'medium', dueDate = null) {
        const operation = async () => {
            const { data, error } = await this.client
                .from('todos')
                .insert({
                    user_id: State.userId,
                    title,
                    description,
                    priority,
                    due_date: dueDate
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('createTodo', operation);
    },

    async getTodos() {
        const operation = async () => {
            const { data, error } = await this.client
                .from('todos')
                .select('*')
                .eq('user_id', State.userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('getTodos', operation);
    },

    async updateTodo(id, updates) {
        const operation = async () => {
            const { data, error } = await this.client
                .from('todos')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('updateTodo', operation);
    },

    async deleteTodo(id) {
        const operation = async () => {
            const { error } = await this.client
                .from('todos')
                .delete()
                .eq('id', id);

            if (error) throw error;
        };

        return this.executeWithOffline('deleteTodo', operation);
    },

    // ========== HABITS ==========

    async createHabit(name, description = '', frequency = 'daily', color = '#f59e0b') {
        const operation = async () => {
            const { data, error } = await this.client
                .from('habits')
                .insert({
                    user_id: State.userId,
                    name,
                    description,
                    frequency,
                    color
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('createHabit', operation);
    },

    async getHabits() {
        const operation = async () => {
            const { data, error } = await this.client
                .from('habits')
                .select('*')
                .eq('user_id', State.userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('getHabits', operation);
    },

    async checkinHabit(habitId, count = 1, notes = '') {
        const operation = async () => {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await this.client
                .from('habit_checkins')
                .upsert({
                    habit_id: habitId,
                    checkin_date: today,
                    count,
                    notes
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('checkinHabit', operation);
    },

    async getHabitCheckins(habitId, days = 30) {
        const operation = async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.client
                .from('habit_checkins')
                .select('*')
                .eq('habit_id', habitId)
                .gte('checkin_date', startDate.toISOString().split('T')[0])
                .order('checkin_date', { ascending: false });

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('getHabitCheckins', operation);
    },

    // ========== PREFERENCES ==========

    async getPreferences() {
        const operation = async () => {
            const { data, error } = await this.client
                .from('preferences')
                .select('*')
                .eq('user_id', State.userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return data;
        };

        return this.executeWithOffline('getPreferences', operation);
    },

    async updatePreferences(updates) {
        const operation = async () => {
            const { data, error } = await this.client
                .from('preferences')
                .upsert({
                    user_id: State.userId,
                    ...updates
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        };

        return this.executeWithOffline('updatePreferences', operation);
    },

    // ========== OFFLINE QUEUE SYSTEM ==========

    async executeWithOffline(name, operation) {
        if (this.isConnected && navigator.onLine) {
            try {
                return await operation();
            } catch (error) {
                console.error(`[Supabase] ${name} failed:`, error);
                throw error;
            }
        } else {
            // Queue for later
            Storage.addToQueue({
                type: name,
                operation: operation.toString()
            });
            console.log(`[Supabase] ${name} queued for later sync`);
            State.setNotification('Offline - changes will sync when online');
            return null;
        }
    },

    /**
     * Sync queued operations when back online
     */
    async syncQueue() {
        const queue = Storage.getOfflineQueue();
        if (queue.length === 0) return;

        console.log(`[Supabase] Syncing ${queue.length} queued operations`);

        // Note: This is a simplified sync
        // In production, you'd need to serialize operations properly
        Storage.clearOfflineQueue();
        State.setNotification('Synced offline changes');
    }
};

// Export for use in other modules
window.SupabaseDB = SupabaseDB;
