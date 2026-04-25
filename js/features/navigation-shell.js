/**
 * Alfred - Navigation Shell Feature
 * Handles top bar, burger drawer, and desktop sidebar collapse.
 */

const NavigationShell = {
    isMenuOpen: false,

    initialize() {
        this.bindTopbarActions();
        this.bindDrawerActions();
        this.bindSidebarCollapse();
        this.bindGlobalListeners();
        this.bindStateSubscriptions();

        this.syncTopbarModel();
        this.renderDrawerTodos(State.todos || []);
        this.renderDrawerHabits(State.habits || []);

        return Promise.resolve();
    },

    bindTopbarActions() {
        const burger = document.getElementById('topbar-burger');
        const settings = document.getElementById('topbar-settings');

        if (burger) {
            burger.addEventListener('click', () => {
                this.toggleMenu();
            });
        }

        if (settings) {
            settings.addEventListener('click', () => {
                this.handleSettingsShortcut(false);
            });
        }
    },

    bindDrawerActions() {
        const closeButton = document.getElementById('burger-close');
        const backdrop = document.getElementById('burger-backdrop');
        const settings = document.getElementById('drawer-settings-btn');
        const todoForm = document.getElementById('drawer-todo-form');
        const todoInput = document.getElementById('drawer-todo-input');
        const habitForm = document.getElementById('drawer-habit-form');
        const habitInput = document.getElementById('drawer-habit-input');

        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeMenu());
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeMenu());
        }

        if (settings) {
            settings.addEventListener('click', () => {
                this.handleSettingsShortcut(true);
            });
        }

        document.querySelectorAll('.drawer-link[data-tab]').forEach((button) => {
            button.addEventListener('click', () => {
                const target = button.getAttribute('data-tab');
                if (!target) return;
                Alfred.activateTab(target);
                this.closeMenu();
            });
        });

        if (todoForm && todoInput) {
            todoForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const title = todoInput.value.trim();
                if (!title) return;

                await TodosFeature.addTodo(title);
                todoInput.value = '';
            });
        }

        if (habitForm && habitInput) {
            habitForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const name = habitInput.value.trim();
                if (!name) return;

                await HabitsFeature.addHabit(name);
                habitInput.value = '';
            });
        }
    },

    bindSidebarCollapse() {
        const toggle = document.getElementById('sidebar-collapse-toggle');
        if (!toggle) return;

        const collapsed = Storage.get('alfred_sidebar_collapsed', false);
        document.body.classList.toggle('sidebar-collapsed', !!collapsed);
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

        toggle.addEventListener('click', () => {
            const next = !document.body.classList.contains('sidebar-collapsed');
            document.body.classList.toggle('sidebar-collapsed', next);
            Storage.set('alfred_sidebar_collapsed', next);
            toggle.setAttribute('aria-expanded', next ? 'false' : 'true');
        });
    },

    bindGlobalListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isMenuOpen) {
                this.closeMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.matchMedia('(min-width: 1121px)').matches) {
                this.closeMenu();
            }
        });
    },

    bindStateSubscriptions() {
        State.subscribe('aiProvider', () => this.syncTopbarModel());
        State.subscribe('aiModel', () => this.syncTopbarModel());
        State.subscribe('todos', (todos) => this.renderDrawerTodos(todos || []));
        State.subscribe('habits', (habits) => this.renderDrawerHabits(habits || []));
    },

    syncTopbarModel() {
        const label = document.getElementById('topbar-model');
        if (!label) return;

        const providerName = this.getProviderName(State.aiProvider);
        const modelName = State.aiModel || 'No model';
        label.textContent = `${providerName} • ${modelName}`;
    },

    getProviderName(provider) {
        const names = {
            'ollama-cloud': 'Ollama Cloud',
            'ollama-local': 'Ollama Local',
            groq: 'Groq',
            cloudflare: 'Cloudflare'
        };
        return names[provider] || 'AI';
    },

    handleSettingsShortcut(closeAfter = false) {
        const hashTab = window.location.hash.replace('#', '') || 'chat';
        const currentTab = State.currentTab || hashTab || 'chat';
        const targetTab = currentTab === 'settings' ? 'chat' : 'settings';

        Alfred.activateTab(targetTab);

        if (closeAfter) {
            this.closeMenu();
        }
    },

    toggleMenu(forceOpen) {
        const next = typeof forceOpen === 'boolean' ? forceOpen : !this.isMenuOpen;
        if (next) {
            this.openMenu();
            return;
        }
        this.closeMenu();
    },

    openMenu() {
        this.isMenuOpen = true;
        document.body.classList.add('burger-menu-open');

        const burger = document.getElementById('topbar-burger');
        const drawer = document.getElementById('burger-drawer');
        if (burger) burger.setAttribute('aria-expanded', 'true');
        if (drawer) drawer.setAttribute('aria-hidden', 'false');

        if (ChatFeature?.closeDrawer) {
            ChatFeature.closeDrawer();
        }
    },

    closeMenu() {
        this.isMenuOpen = false;
        document.body.classList.remove('burger-menu-open');

        const burger = document.getElementById('topbar-burger');
        const drawer = document.getElementById('burger-drawer');
        if (burger) burger.setAttribute('aria-expanded', 'false');
        if (drawer) drawer.setAttribute('aria-hidden', 'true');
    },

    renderDrawerTodos(todos) {
        const container = document.getElementById('drawer-todo-list');
        if (!container) return;

        if (!todos.length) {
            container.innerHTML = '<p class="empty-state">No tasks yet.</p>';
            return;
        }

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const sorted = [...todos].sort((a, b) => {
            if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        container.innerHTML = sorted.map((todo) => {
            const completed = todo.status === 'completed';
            const title = this.escapeHtml(todo.title || 'Untitled task');
            return `
                <div class="drawer-item ${completed ? 'completed' : ''}">
                    <button class="drawer-toggle" type="button" onclick="NavigationShell.toggleTodoFromDrawer('${todo.id}')">${completed ? '✓' : '○'}</button>
                    <div>
                        <div>${title}</div>
                        <div class="drawer-meta">${todo.priority || 'medium'} priority</div>
                    </div>
                    <select class="stack-input drawer-priority" onchange="NavigationShell.setTodoPriorityFromDrawer('${todo.id}', this.value)">
                        <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>Med</option>
                        <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>High</option>
                    </select>
                    <button class="drawer-delete" type="button" onclick="NavigationShell.deleteTodoFromDrawer('${todo.id}')">✕</button>
                </div>
            `;
        }).join('');
    },

    renderDrawerHabits(habits) {
        const container = document.getElementById('drawer-habit-list');
        if (!container) return;

        if (!habits.length) {
            container.innerHTML = '<p class="empty-state">No habits yet.</p>';
            return;
        }

        container.innerHTML = habits.map((habit) => {
            const streak = HabitsFeature.calculateStreak(habit.id);
            const checkedIn = HabitsFeature.checkedInToday(habit.id);
            const name = this.escapeHtml(habit.name || 'Unnamed habit');
            return `
                <div class="drawer-item ${habit.active ? '' : 'completed'}">
                    <button class="drawer-checkin" type="button" ${checkedIn ? 'disabled' : ''} onclick="NavigationShell.checkinHabitFromDrawer('${habit.id}')">${checkedIn ? '✓' : '+1'}</button>
                    <div>
                        <div>${name}</div>
                        <div class="drawer-meta">🔥 ${streak} day streak</div>
                    </div>
                    <button class="drawer-pause" type="button" onclick="NavigationShell.toggleHabitFromDrawer('${habit.id}')">${habit.active ? 'Pause' : 'Resume'}</button>
                    <button class="drawer-delete" type="button" onclick="NavigationShell.deleteHabitFromDrawer('${habit.id}')">✕</button>
                </div>
            `;
        }).join('');
    },

    async toggleTodoFromDrawer(id) {
        await TodosFeature.toggleTodo(id);
    },

    async setTodoPriorityFromDrawer(id, priority) {
        await TodosFeature.setPriority(id, priority);
    },

    async deleteTodoFromDrawer(id) {
        await TodosFeature.deleteTodo(id);
    },

    async checkinHabitFromDrawer(id) {
        await HabitsFeature.checkin(id);
    },

    async toggleHabitFromDrawer(id) {
        await HabitsFeature.toggleActive(id);
    },

    async deleteHabitFromDrawer(id) {
        await HabitsFeature.deleteHabit(id);
    },

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }
};

window.NavigationShell = NavigationShell;
