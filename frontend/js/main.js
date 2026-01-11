// Main Application Entry Point
import './auth.js';
import './upload.js';
import './files.js';
import './utils.js';

// Application Class
class InfinityStorageApp {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = this.initialize();
    }

    // Initialize application
    async initialize() {
        try {
            console.log('Initializing Infinity Storage Frontend...');

            // Wait for DOM to be ready
            await this.waitForDOM();

            // Initialize services
            await this.initializeServices();

            // Setup event listeners
            this.setupEventListeners();

            // Check initial auth state
            await this.checkAuthState();

            // Start background tasks
            this.startBackgroundTasks();

            this.isInitialized = true;
            console.log('Infinity Storage Frontend initialized successfully');

            // Show welcome message
            if (!window.authManager.isAuthenticated()) {
                window.showToast('Welcome! Please configure your API settings to get started.', 'info', 8000);
            } else {
                window.showToast('Welcome back!', 'success', 3000);
            }

        } catch (error) {
            console.error('Failed to initialize application:', error);
            window.showToast('Failed to initialize application', 'error');
        }
    }

    // Wait for DOM to be ready
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // Initialize services
    async initializeServices() {
        // Settings button handler
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                window.tabManager.switchTab('settings');
            });
        }

        // Initialize tooltips, popovers, etc.
        this.initializeTooltips();
    }

    // Setup global event listeners
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Online/offline detection
        window.addEventListener('online', () => {
            window.showToast('Connection restored', 'success');
            this.checkServerStatus();
        });

        window.addEventListener('offline', () => {
            window.showToast('Connection lost', 'error');
        });

        // Before unload - warn about active uploads
        window.addEventListener('beforeunload', (e) => {
            const uploadStats = window.uploadManager?.getUploadStats();
            if (uploadStats && (uploadStats.uploading > 0 || uploadStats.queued > 0)) {
                e.preventDefault();
                e.returnValue = 'You have active uploads. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Visibility change - pause/resume uploads when tab is not visible
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ignore when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + U - Focus upload area
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            const uploadArea = document.getElementById('uploadArea');
            uploadArea?.click();
        }

        // Ctrl/Cmd + F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            const filesTab = document.querySelector('[data-tab="files"]');
            
            // Switch to files tab and focus search
            if (filesTab && searchInput) {
                window.tabManager.switchTab('files');
                searchInput.focus();
            }
        }

        // Ctrl/Cmd + , - Open settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            window.tabManager.switchTab('settings');
        }

        // Escape - Close modal or clear upload queue
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal.active');
            if (modal) {
                window.modalManager.close();
            } else {
                const uploadStats = window.uploadManager?.getUploadStats();
                if (uploadStats && uploadStats.completed > 0) {
                    if (confirm('Clear completed uploads?')) {
                        // Clear completed uploads
                        const completedUploads = Array.from(window.uploadManager.activeUploads.values())
                            .filter(item => item.status === 'completed');
                        completedUploads.forEach(item => {
                            window.uploadManager.removeUploadItem(item.id);
                        });
                    }
                }
            }
        }
    }

    // Handle visibility change
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, could pause intensive operations
            console.log('Page hidden - pausing background operations');
        } else {
            // Page is visible again
            console.log('Page visible - resuming operations');
            this.checkServerStatus();
            window.filesManager?.refreshFiles();
        }
    }

    // Check authentication state
    async checkAuthState() {
        const isAuth = window.authManager.isAuthenticated();
        const serverStatus = await this.checkServerStatus();

        if (!isAuth) {
            // Focus on settings tab if no API key
            setTimeout(() => {
                window.tabManager.switchTab('settings');
            }, 1000);
        } else if (serverStatus === 'online') {
            // Refresh files if authenticated and server is online
            window.filesManager?.refreshFiles();
        }
    }

    // Check server status
    async checkServerStatus() {
        try {
            const result = await window.authManager.testConnection();
            window.settingsUI?.updateServerStatus(result.status);
            return result.status;
        } catch (error) {
            window.settingsUI?.updateServerStatus('offline');
            return 'offline';
        }
    }

    // Start background tasks
    startBackgroundTasks() {
        // Periodic server status check
        setInterval(() => {
            if (!document.hidden) {
                this.checkServerStatus();
            }
        }, 30000); // Every 30 seconds

        // Periodic files refresh (only on files tab)
        setInterval(() => {
            if (!document.hidden && window.tabManager.getActiveTab() === 'files') {
                window.filesManager?.refreshFiles();
            }
        }, 60000); // Every minute

        // Cleanup old toasts
        setInterval(() => {
            const oldToasts = document.querySelectorAll('.toast');
            oldToasts.forEach(toast => {
                if (toast.dataset.age && Date.now() - parseInt(toast.dataset.age) > 10000) {
                    toast.remove();
                }
            });
        }, 5000); // Every 5 seconds
    }

    // Initialize tooltips
    initializeTooltips() {
        // Simple tooltip implementation
        const tooltipElements = document.querySelectorAll('[title]');
        
        tooltipElements.forEach(element => {
            const title = element.getAttribute('title');
            if (!title) return;

            // Remove title to prevent default tooltip
            element.removeAttribute('title');
            
            // Add data attribute
            element.dataset.tooltip = title;

            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = title;
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            `;

            // Add hover events
            element.addEventListener('mouseenter', (e) => {
                document.body.appendChild(tooltip);
                
                const rect = element.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
                
                requestAnimationFrame(() => {
                    tooltip.style.opacity = '1';
                });
            });

            element.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
            });
        });
    }

    // Get application info
    getAppInfo() {
        return {
            name: 'Infinity Storage',
            version: '1.0.0',
            description: 'Unlimited file storage with Telegram backend',
            initialized: this.isInitialized,
            features: [
                'File upload & download',
                'API key management',
                'Real-time progress tracking',
                'Mobile responsive design',
                'Dark/light themes',
                'Keyboard shortcuts'
            ]
        };
    }

    // Show help dialog
    showHelp() {
        const shortcuts = [
            { keys: 'Ctrl+U', description: 'Focus upload area' },
            { keys: 'Ctrl+F', description: 'Search files' },
            { keys: 'Ctrl+,', description: 'Open settings' },
            { keys: 'Escape', description: 'Close modal / Clear uploads' }
        ];

        const helpHTML = `
            <div class="help-content">
                <h3>Keyboard Shortcuts</h3>
                <div class="shortcuts-list">
                    ${shortcuts.map(shortcut => `
                        <div class="shortcut-item">
                            <kbd>${shortcut.keys}</kbd>
                            <span>${shortcut.description}</span>
                        </div>
                    `).join('')}
                </div>
                <h3>Tips</h3>
                <ul class="tips-list">
                    <li>Drag and drop files directly onto the upload area</li>
                    <li>Click on any file to view details</li>
                    <li>Use the search box to filter files quickly</li>
                    <li>Switch between grid and list views for different layouts</li>
                    <li>API keys are stored locally in your browser</li>
                </ul>
            </div>
        `;

        // Create modal or show as toast
        window.showToast('Help: Press Ctrl+, for settings, Ctrl+F for search', 'info', 6000);
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            uploads: { total: 0, successful: 0, failed: 0 },
            downloads: { total: 0, successful: 0, failed: 0 },
            errors: []
        };
    }

    // Track upload
    trackUpload(status) {
        this.metrics.uploads.total++;
        if (status === 'completed') {
            this.metrics.uploads.successful++;
        } else if (status === 'failed') {
            this.metrics.uploads.failed++;
        }
    }

    // Track download
    trackDownload(status) {
        this.metrics.downloads.total++;
        if (status === 'completed') {
            this.metrics.downloads.successful++;
        } else if (status === 'failed') {
            this.metrics.downloads.failed++;
        }
    }

    // Track error
    trackError(error, context) {
        this.metrics.errors.push({
            timestamp: Date.now(),
            error: error.message,
            context,
            userAgent: navigator.userAgent
        });

        // Keep only last 50 errors
        if (this.metrics.errors.length > 50) {
            this.metrics.errors.shift();
        }
    }

    // Get metrics
    getMetrics() {
        return { ...this.metrics };
    }
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    window.performanceMonitor?.trackError(e.error, 'global');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    window.performanceMonitor?.trackError(e.reason, 'promise');
});

// Initialize application
window.app = new InfinityStorageApp();
window.performanceMonitor = new PerformanceMonitor();

// Service Worker registration (for future PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for debugging
export default InfinityStorageApp;