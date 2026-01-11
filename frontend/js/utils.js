// Utility Functions and Global Components

// Toast Notification System
export class ToastManager {
    constructor() {
        this.container = document.getElementById('toastContainer');
        this.toasts = new Map();
        this.defaultDuration = 5000;
        this.maxToasts = 5;
    }

    // Show toast notification
    show(message, type = 'info', duration = null) {
        if (!this.container) return;

        const id = this.generateId();
        const toast = this.createToast(id, message, type);
        
        // Limit number of toasts
        if (this.toasts.size >= this.maxToasts) {
            const firstId = this.toasts.keys().next().value;
            this.remove(firstId);
        }

        // Add to container and tracking
        this.container.appendChild(toast);
        this.toasts.set(id, { element: toast, timer: null });

        // Auto remove after duration
        const autoDuration = duration || this.defaultDuration;
        const timer = setTimeout(() => {
            this.remove(id);
        }, autoDuration);

        this.toasts.get(id).timer = timer;

        return id;
    }

    // Create toast element
    createToast(id, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type} fade-in`;
        toast.dataset.toastId = id;

        const icons = {
            success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.remove(id);
        });

        return toast;
    }

    // Remove toast
    remove(id) {
        const toastData = this.toasts.get(id);
        if (!toastData) return;

        const { element, timer } = toastData;

        // Clear timer
        if (timer) {
            clearTimeout(timer);
        }

        // Add fade out animation
        element.classList.add('fade-out');

        // Remove after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.toasts.delete(id);
        }, 300);
    }

    // Generate unique ID
    generateId() {
        return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Clear all toasts
    clear() {
        this.toasts.forEach((_, id) => {
            this.remove(id);
        });
    }
}

// Modal Manager
export class ModalManager {
    constructor() {
        this.activeModal = null;
        this.boundHandlers = null;
    }

    // Open modal
    open(modalElement) {
        if (!modalElement) return;

        // Close any existing modal
        if (this.activeModal) {
            this.close();
        }

        this.activeModal = modalElement;
        modalElement.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Bind event handlers
        this.bindHandlers();

        // Focus management
        this.trapFocus(modalElement);
    }

    // Close modal
    close() {
        if (!this.activeModal) return;

        this.activeModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Unbind handlers
        this.unbindHandlers();

        // Return focus
        this.returnFocus();

        this.activeModal = null;
    }

    // Bind event handlers
    bindHandlers() {
        if (this.boundHandlers) return;

        this.boundHandlers = {
            handleKeydown: (e) => {
                if (e.key === 'Escape') {
                    this.close();
                }
                if (e.key === 'Tab') {
                    this.handleTabKey(e);
                }
            },
            handleClick: (e) => {
                if (e.target === this.activeModal) {
                    this.close();
                }
            }
        };

        document.addEventListener('keydown', this.boundHandlers.handleKeydown);
        document.addEventListener('click', this.boundHandlers.handleClick);
    }

    // Unbind event handlers
    unbindHandlers() {
        if (!this.boundHandlers) return;

        document.removeEventListener('keydown', this.boundHandlers.handleKeydown);
        document.removeEventListener('click', this.boundHandlers.handleClick);
        this.boundHandlers = null;
    }

    // Trap focus within modal
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    // Handle tab key for focus trapping
    handleTabKey(e) {
        if (!this.activeModal) return;

        const focusableElements = this.activeModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    // Return focus to previous element
    returnFocus() {
        // Store focused element before modal opens for restoration
        if (this.previousFocus) {
            this.previousFocus.focus();
        }
    }
}

// Tab Manager
export class TabManager {
    constructor() {
        this.activeTab = null;
        this.tabPanels = new Map();
        this.bindEvents();
    }

    // Bind events
    bindEvents() {
        document.addEventListener('click', (e) => {
            const tab = e.target.closest('.nav-tab');
            if (tab) {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            }
        });
    }

    // Switch to specific tab
    switchTab(tabName) {
        // Hide all panels
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // Deactivate all tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Activate selected tab
        const targetTab = document.querySelector(`[data-tab="${tabName}"]`);
        const targetPanel = document.getElementById(`${tabName}Tab`);

        if (targetTab && targetPanel) {
            targetTab.classList.add('active');
            targetPanel.classList.add('active');
            this.activeTab = tabName;

            // Trigger custom event
            this.onTabSwitch(tabName);
        }
    }

    // Tab switch callback
    onTabSwitch(tabName) {
        // Custom logic for tab switches
        if (tabName === 'files') {
            window.filesManager?.refreshFiles();
        }
    }

    // Get current active tab
    getActiveTab() {
        return this.activeTab;
    }
}

// Form Validation Utilities
export class FormValidator {
    constructor(form) {
        this.form = form;
        this.rules = new Map();
        this.errors = new Map();
        this.bindEvents();
    }

    // Add validation rule
    addRule(fieldName, rules) {
        this.rules.set(fieldName, rules);
    }

    // Validate entire form
    validate() {
        this.errors.clear();
        
        for (const [fieldName, rules] of this.rules) {
            const field = this.form.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) continue;

            for (const rule of rules) {
                const error = this.validateField(field, rule);
                if (error) {
                    this.errors.set(fieldName, error);
                    this.showFieldError(field, error);
                    break; // Stop at first error for each field
                }
            }

            if (!this.errors.has(fieldName)) {
                this.clearFieldError(field);
            }
        }

        return this.errors.size === 0;
    }

    // Validate single field
    validateField(field, rule) {
        const value = field.value?.trim() || '';

        switch (rule.type) {
            case 'required':
                return value.length === 0 ? 'This field is required' : null;
            
            case 'url':
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            
            case 'minLength':
                return value.length < rule.value ? `Minimum ${rule.value} characters required` : null;
            
            case 'maxLength':
                return value.length > rule.value ? `Maximum ${rule.value} characters allowed` : null;
            
            case 'pattern':
                return rule.value.test(value) ? null : rule.message || 'Invalid format';
            
            default:
                return null;
        }
    }

    // Show field error
    showFieldError(field, error) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = error;
    }

    // Clear field error
    clearFieldError(field) {
        field.classList.remove('error');
        
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // Bind events
    bindEvents() {
        this.form?.addEventListener('submit', (e) => {
            if (!this.validate()) {
                e.preventDefault();
            }
        });

        // Real-time validation
        this.form?.addEventListener('input', (e) => {
            const field = e.target;
            const fieldName = field.name || field.id;
            
            if (this.rules.has(fieldName)) {
                const rules = this.rules.get(fieldName);
                let hasError = false;
                
                for (const rule of rules) {
                    const error = this.validateField(field, rule);
                    if (error) {
                        this.showFieldError(field, error);
                        hasError = true;
                        break;
                    }
                }
                
                if (!hasError) {
                    this.clearFieldError(field);
                }
            }
        });
    }
}

// Storage Utilities
export class StorageManager {
    constructor(prefix = 'app_') {
        this.prefix = prefix;
    }

    // Set item with prefix
    set(key, value) {
        try {
            const prefixedKey = this.prefix + key;
            const serialized = JSON.stringify(value);
            localStorage.setItem(prefixedKey, serialized);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }

    // Get item with prefix
    get(key, defaultValue = null) {
        try {
            const prefixedKey = this.prefix + key;
            const serialized = localStorage.getItem(prefixedKey);
            return serialized ? JSON.parse(serialized) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    }

    // Remove item
    remove(key) {
        try {
            const prefixedKey = this.prefix + key;
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }

    // Clear all prefixed items
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
}

// Date/Time Utilities
export class DateUtils {
    // Format date relative to now
    static formatRelative(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return target.toLocaleDateString();
    }

    // Format duration
    static formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Initialize managers
export const toastManager = new ToastManager();
export const modalManager = new ModalManager();
export const tabManager = new TabManager();
export const storageManager = new StorageManager('infinity_');

// Global utility functions
window.showToast = (message, type, duration) => {
    return toastManager.show(message, type, duration);
};

window.switchToUploadTab = () => {
    tabManager.switchTab('upload');
};

// Export for global access
window.toastManager = toastManager;
window.modalManager = modalManager;
window.tabManager = tabManager;
window.storageManager = storageManager;