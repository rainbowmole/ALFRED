/**
 * Alfred - Habits Feature
 * Handles habit tracking and streak calculations
 */

const HabitsFeature = {
    habits: [],
    checkins: {},

    /**
     * Initialize habits feature
     */
    async initialize() {
        this.setupEventListeners();
        await this.loadHabits();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const form = document.getElementById('habit-form');
        const input = document.getElementById('habit-input');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = input.value.trim();
                if (name) {
                    this.addHabit(name);
                    input.value = '';
                }
            });
        }
    },

    /**
     * Load habits from storage
     */
    async loadHabits() {
        try {
            if (SupabaseDB.isConnected) {
                this.habits = await SupabaseDB.getHabits() || [];
            } else {
                this.habits = Storage.get('alfred_habits', []);
            }
            State.setHabits(this.habits);
            this.render();
        } catch (error) {
            console.error('[Habits] Failed to load:', error);
            State.setError('Failed to load habits');
        }
    },

    /**
     * Add a new habit
     */
    async addHabit(name, description = '', frequency = 'daily', color = '#f59e0b') {
        State.setLoading(true);

        try {
            if (SupabaseDB.isConnected) {
                const habit = await SupabaseDB.createHabit(name, description, frequency, color);
                this.habits.unshift(habit);
            } else {
                const habit = {
                    id: 'local_' + Date.now(),
                    name,
                    description,
                    frequency,
                    color,
                    active: true,
                    created_at: new Date().toISOString()
                };
                this.habits.unshift(habit);
                Storage.set('alfred_habits', this.habits);
            }

            State.setHabits(this.habits);
            this.render();
        } catch (error) {
            console.error('[Habits] Failed to add:', error);
            State.setError('Failed to add habit');
        } finally {
            State.setLoading(false);
        }
    },

    /**
     * Check in for a habit (today)
     */
    async checkin(habitId, count = 1, notes = '') {
        const today = new Date().toISOString().split('T')[0];

        try {
            if (SupabaseDB.isConnected) {
                await SupabaseDB.checkinHabit(habitId, count, notes);
            }

            // Update local checkins cache
            if (!this.checkins[habitId]) {
                this.checkins[habitId] = [];
            }

            const existingIndex = this.checkins[habitId].findIndex(c => c.checkin_date === today);
            if (existingIndex >= 0) {
                this.checkins[habitId][existingIndex].count += count;
            } else {
                this.checkins[habitId].push({
                    checkin_date: today,
                    count
                });
            }

            this.render();
        } catch (error) {
            console.error('[Habits] Failed to check in:', error);
            State.setError('Failed to check in');
        } finally {
            State.setLoading(false);
        }
    },

    /**
     * Toggle habit active state
     */
    async toggleActive(id) {
        const habit = this.habits.find(h => h.id === id);
        if (!habit) return;

        habit.active = !habit.active;

        try {
            if (SupabaseDB.isConnected) {
                await SupabaseDB.updateHabit?.(id, { active: habit.active });
            }
            State.setHabits(this.habits);
            this.render();
        } catch (error) {
            console.error('[Habits] Failed to toggle:', error);
        }
    },

    /**
     * Delete a habit
     */
    async deleteHabit(id) {
        if (!confirm('Delete this habit? All check-in history will be lost.')) return;

        try {
            if (SupabaseDB.isConnected) {
                // Note: You'd need to add deleteHabit to SupabaseDB
                // await SupabaseDB.deleteHabit(id);
            }

            this.habits = this.habits.filter(h => h.id !== id);
            delete this.checkins[id];
            Storage.set('alfred_habits', this.habits);
            State.setHabits(this.habits);
            this.render();
        } catch (error) {
            console.error('[Habits] Failed to delete:', error);
        }
    },

    /**
     * Calculate streak for a habit
     */
    calculateStreak(habitId) {
        const habitCheckins = this.checkins[habitId] || [];
        if (habitCheckins.length === 0) return 0;

        // Sort by date descending
        const sorted = [...habitCheckins].sort((a, b) =>
            new Date(b.checkin_date) - new Date(a.checkin_date)
        );

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        let expectedDate = new Date(today);

        for (const checkin of sorted) {
            const checkinDate = checkin.checkin_date;
            const expectedStr = expectedDate.toISOString().split('T')[0];

            if (checkinDate === expectedStr) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else if (checkinDate < expectedStr) {
                // Gap found, streak ends
                break;
            }
        }

        return streak;
    },

    /**
     * Check if already checked in today
     */
    checkedInToday(habitId) {
        const today = new Date().toISOString().split('T')[0];
        const habitCheckins = this.checkins[habitId] || [];
        return habitCheckins.some(c => c.checkin_date === today);
    },

    /**
     * Render habits list
     */
    render() {
        const container = document.getElementById('habit-list');
        if (!container) return;

        if (this.habits.length === 0) {
            container.innerHTML = `
                <p class="text-gray-400 text-center py-8">
                    No habits tracked yet. Add one above!
                </p>
            `;
            return;
        }

        container.innerHTML = this.habits.map(habit => {
            const streak = this.calculateStreak(habit.id);
            const isCheckedIn = this.checkedInToday(habit.id);
            const opacity = habit.active ? '' : 'opacity-50';

            return `
                <div class="p-4 bg-gray-800 rounded-lg ${opacity}" style="border-left: 4px solid ${habit.color}">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex-1">
                            <h3 class="font-semibold ${!habit.active ? 'line-through text-gray-400' : ''}">
                                ${this.escapeHtml(habit.name)}
                            </h3>
                            ${habit.description ? `<p class="text-sm text-gray-400">${this.escapeHtml(habit.description)}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold" style="color: ${habit.color}">🔥 ${streak}</p>
                            <p class="text-xs text-gray-400">day streak</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            onclick="HabitsFeature.checkin('${habit.id}')"
                            ${isCheckedIn ? 'disabled' : ''}
                            class="px-3 py-1 rounded font-medium transition ${
                                isCheckedIn
                                    ? 'bg-green-600 text-white cursor-default'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }"
                            style="background-color: ${isCheckedIn ? '' : habit.color}"
                        >
                            ${isCheckedIn ? '✓ Done Today' : '+ Check In'}
                        </button>
                        <button
                            onclick="HabitsFeature.toggleActive('${habit.id}')"
                            class="px-3 py-1 rounded border border-gray-600 hover:bg-gray-700 text-sm"
                        >
                            ${habit.active ? 'Pause' : 'Resume'}
                        </button>
                        <button
                            onclick="HabitsFeature.deleteHabit('${habit.id}')"
                            class="px-3 py-1 rounded text-red-400 hover:bg-gray-700 text-sm"
                        >
                            Delete
                        </button>
                    </div>
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
     * Get weekly completion data for a habit
     */
    getWeeklyData(habitId) {
        const habitCheckins = this.checkins[habitId] || [];
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        return habitCheckins.filter(c => {
            const date = new Date(c.checkin_date);
            return date >= weekAgo;
        });
    }
};

// Export for use in other modules
window.HabitsFeature = HabitsFeature;
