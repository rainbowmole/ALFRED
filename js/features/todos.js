/**
 * Alfred - To-Do Feature
 * Handles task management CRUD operations
 */

const TodosFeature = {
    todos: [],

    /**
     * Initialize todos feature
     */
    async initialize() {
        this.setupEventListeners();
        await this.loadTodos();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('todo-form');
        const input = document.getElementById('todo-input');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = input.value.trim();
                if (title) {
                    this.addTodo(title);
                    input.value = '';
                }
            });
        }
    },

    /**
     * Load todos from storage
     */
    async loadTodos() {
        try {
            if (SupabaseDB.isConnected) {
                this.todos = await SupabaseDB.getTodos() || [];
            } else {
                this.todos = Storage.get('alfred_todos', []);
            }
            State.setTodos(this.todos);
            this.render();
        } catch (error) {
            console.error('[Todos] Failed to load:', error);
            State.setError('Failed to load todos');
        }
    },

    /**
     * Add a new todo
     */
    async addTodo(title, description = '') {
        State.setLoading(true);

        try {
            if (SupabaseDB.isConnected) {
                const todo = await SupabaseDB.createTodo(title, description);
                this.todos.unshift(todo);
            } else {
                const todo = {
                    id: 'local_' + Date.now(),
                    title,
                    description,
                    status: 'pending',
                    priority: 'medium',
                    created_at: new Date().toISOString()
                };
                this.todos.unshift(todo);
                Storage.set('alfred_todos', this.todos);
            }

            State.setTodos(this.todos);
            this.render();
        } catch (error) {
            console.error('[Todos] Failed to add:', error);
            State.setError('Failed to add todo');
        } finally {
            State.setLoading(false);
        }
    },

    /**
     * Toggle todo completion
     */
    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const newStatus = todo.status === 'completed' ? 'pending' : 'completed';

        try {
            if (SupabaseDB.isConnected) {
                await SupabaseDB.updateTodo(id, {
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                });
            }

            todo.status = newStatus;
            if (newStatus === 'completed') {
                todo.completed_at = new Date().toISOString();
            } else {
                todo.completed_at = null;
            }

            State.setTodos(this.todos);
            this.render();
        } catch (error) {
            console.error('[Todos] Failed to update:', error);
        }
    },

    /**
     * Delete a todo
     */
    async deleteTodo(id) {
        try {
            if (SupabaseDB.isConnected) {
                await SupabaseDB.deleteTodo(id);
            }

            this.todos = this.todos.filter(t => t.id !== id);
            Storage.set('alfred_todos', this.todos);
            State.setTodos(this.todos);
            this.render();
        } catch (error) {
            console.error('[Todos] Failed to delete:', error);
        }
    },

    /**
     * Set todo priority
     */
    async setPriority(id, priority) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        try {
            if (SupabaseDB.isConnected) {
                await SupabaseDB.updateTodo(id, { priority });
            }
            todo.priority = priority;
            State.setTodos(this.todos);
            this.render();
        } catch (error) {
            console.error('[Todos] Failed to set priority:', error);
        }
    },

    /**
     * Render todos list
     */
    render() {
        const container = document.getElementById('todo-list');
        if (!container) return;

        if (this.todos.length === 0) {
            container.innerHTML = `
                <p class="text-gray-400 text-center py-8">
                    No tasks yet. Add one above!
                </p>
            `;
            return;
        }

        // Sort: pending first, then by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const sorted = [...this.todos].sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'pending' ? -1 : 1;
            }
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        container.innerHTML = sorted.map(todo => {
            const isCompleted = todo.status === 'completed';
            const priorityColors = {
                high: 'border-red-500',
                medium: 'border-amber-500',
                low: 'border-green-500'
            };

            return `
                <div class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border-l-4 ${priorityColors[todo.priority]} ${isCompleted ? 'opacity-60' : ''}">
                    <button
                        onclick="TodosFeature.toggleTodo('${todo.id}')"
                        class="w-5 h-5 rounded border-2 ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500'} flex items-center justify-center flex-shrink-0"
                    >
                        ${isCompleted ? '✓' : ''}
                    </button>
                    <div class="flex-1 min-w-0">
                        <p class="${isCompleted ? 'line-through text-gray-400' : ''}">${this.escapeHtml(todo.title)}</p>
                        ${todo.description ? `<p class="text-sm text-gray-400 truncate">${this.escapeHtml(todo.description)}</p>` : ''}
                        ${todo.due_date ? `<p class="text-xs text-gray-500">Due: ${new Date(todo.due_date).toLocaleDateString()}</p>` : ''}
                    </div>
                    <select
                        onchange="TodosFeature.setPriority('${todo.id}', this.value)"
                        class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs"
                    >
                        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Med</option>
                        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    <button
                        onclick="TodosFeature.deleteTodo('${todo.id}')"
                        class="text-gray-400 hover:text-red-500 p-1"
                    >
                        ✕
                    </button>
                </div>
            `;
        }).join('');
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
     * Get stats
     */
    getStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.status === 'completed').length;
        const pending = total - completed;

        return { total, completed, pending };
    }
};

// Export for use in other modules
window.TodosFeature = TodosFeature;
