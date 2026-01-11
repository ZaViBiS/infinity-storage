// Authentication and Settings Management
import { InfinityAPI, APIError } from './api.js';

// Storage keys
const STORAGE_KEYS = {
    API_KEY: 'infinity_api_key',
    SERVER_URL: 'infinity_server_url',
    THEME: 'infinity_theme',
    SETTINGS: 'infinity_settings'
};

// Default settings
const DEFAULT_SETTINGS = {
    serverUrl: 'http://localhost:8081',
    apiKey: null,
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    showNotifications: true,
    compactView: false
};

// Authentication Manager Class
export class AuthManager {
    constructor() {
        this.api = null;
        this.settings = { ...DEFAULT_SETTINGS };
        this.loadSettings();
        this.initializeAPI();
    }

    // Load settings from localStorage
    loadSettings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (stored) {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    // Initialize API client
    initializeAPI() {
        this.api = new InfinityAPI(this.settings.serverUrl, this.settings.apiKey);
    }

    // Get API client
    getAPI() {
        return this.api;
    }

    // Set server URL
    setServerUrl(url) {
        this.settings.serverUrl = url;
        this.saveSettings();
        this.initializeAPI();
    }

    // Get server URL
    getServerUrl() {
        return this.settings.serverUrl;
    }

    // Set API key
    setApiKey(apiKey) {
        this.settings.apiKey = apiKey;
        this.saveSettings();
        this.initializeAPI();
    }

    // Get API key
    getApiKey() {
        return this.settings.apiKey;
    }

    // Check if authenticated
    isAuthenticated() {
        return !!this.settings.apiKey;
    }

    // Clear authentication
    clearAuth() {
        this.settings.apiKey = null;
        this.saveSettings();
        this.initializeAPI();
    }

    // Generate new API key
    async generateApiKey() {
        try {
            const tempAPI = new InfinityAPI(this.settings.serverUrl);
            const newKey = await tempAPI.generateApiKey();
            this.setApiKey(newKey);
            return newKey;
        } catch (error) {
            throw new APIError(`Failed to generate API key: ${error.message}`, error.status);
        }
    }

    // Test connection to server
    async testConnection() {
        try {
            const result = await this.api.healthCheck();
            return result;
        } catch (error) {
            return {
                status: 'offline',
                error: error.message
            };
        }
    }

    // Validate API key
    async validateApiKey() {
        if (!this.settings.apiKey) {
            return false;
        }

        try {
            const result = await this.api.listFiles();
            return true;
        } catch (error) {
            if (error.status === 401) {
                return false;
            }
            throw error;
        }
    }

    // Get all settings
    getSettings() {
        return { ...this.settings };
    }

    // Update setting
    updateSetting(key, value) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = value;
            this.saveSettings();
            
            // Special handling for certain settings
            if (key === 'serverUrl') {
                this.initializeAPI();
            } else if (key === 'apiKey') {
                this.initializeAPI();
            }
        }
    }

    // Reset settings to defaults
    resetSettings() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.saveSettings();
        this.initializeAPI();
    }

    // Clear all stored data
    clearAllData() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            this.settings = { ...DEFAULT_SETTINGS };
            this.initializeAPI();
        } catch (error) {
            console.warn('Failed to clear data:', error);
        }
    }
}

// Theme Manager
export class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme();
        this.applyTheme(this.currentTheme);
    }

    // Load theme from localStorage
    loadTheme() {
        try {
            return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
        } catch {
            return 'light';
        }
    }

    // Save theme to localStorage
    saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, theme);
        } catch (error) {
            console.warn('Failed to save theme:', error);
        }
    }

    // Apply theme to document
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.saveTheme(theme);
    }

    // Toggle theme
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Set specific theme
    setTheme(theme) {
        this.applyTheme(theme);
    }
}

// Settings UI Controller
export class SettingsUI {
    constructor(authManager, themeManager) {
        this.auth = authManager;
        this.theme = themeManager;
        this.initializeElements();
        this.bindEvents();
        this.loadUI();
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            // Server settings
            serverUrlInput: document.getElementById('serverUrl'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            generateKeyBtn: document.getElementById('generateKeyBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            testConnectionBtn: document.getElementById('testConnectionBtn'),
            
            // Theme settings
            themeBtns: document.querySelectorAll('.theme-btn'),
            
            // Storage info
            totalFiles: document.getElementById('totalFiles'),
            totalSize: document.getElementById('totalSize'),
            serverStatus: document.getElementById('serverStatus'),
            
            // Actions
            clearDataBtn: document.getElementById('clearDataBtn'),
            
            // Status indicators
            apiKeyStatus: document.getElementById('apiKeyStatus'),
            footerServerStatus: document.getElementById('footerServerStatus')
        };
    }

    // Bind event listeners
    bindEvents() {
        // Server settings
        this.elements.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
        this.elements.generateKeyBtn?.addEventListener('click', () => this.generateApiKey());
        this.elements.testConnectionBtn?.addEventListener('click', () => this.testConnection());
        
        // Theme settings
        this.elements.themeBtns?.forEach(btn => {
            btn.addEventListener('click', () => this.setTheme(btn.dataset.theme));
        });
        
        // Clear data
        this.elements.clearDataBtn?.addEventListener('click', () => this.clearData());
        
        // Real-time validation
        this.elements.serverUrlInput?.addEventListener('input', () => this.validateServerUrl());
        this.elements.apiKeyInput?.addEventListener('input', () => this.validateApiKey());
    }

    // Load UI with current settings
    loadUI() {
        const settings = this.auth.getSettings();
        
        // Load server settings
        if (this.elements.serverUrlInput) {
            this.elements.serverUrlInput.value = settings.serverUrl;
        }
        
        if (this.elements.apiKeyInput) {
            this.elements.apiKeyInput.value = settings.apiKey || '';
        }
        
        // Load theme
        this.updateThemeUI();
        
        // Update status
        this.updateAPIKeyStatus();
        this.updateServerStatus();
    }

    // Save settings
    async saveSettings() {
        try {
            // Get values
            const serverUrl = this.elements.serverUrlInput?.value?.trim();
            const apiKey = this.elements.apiKeyInput?.value?.trim();
            
            // Validate
            if (!serverUrl) {
                this.showError('Server URL is required');
                return;
            }
            
            // Update settings
            this.auth.setServerUrl(serverUrl);
            if (apiKey) {
                this.auth.setApiKey(apiKey);
            }
            
            // Test connection
            const result = await this.auth.testConnection();
            if (result.status === 'online') {
                this.showSuccess('Settings saved successfully');
                this.updateAPIKeyStatus();
                this.updateServerStatus();
            } else {
                this.showWarning('Settings saved but connection failed', result.error);
            }
        } catch (error) {
            this.showError('Failed to save settings', error.message);
        }
    }

    // Generate new API key
    async generateApiKey() {
        try {
            this.elements.generateKeyBtn.disabled = true;
            this.elements.generateKeyBtn.textContent = 'Generating...';
            
            const newKey = await this.auth.generateApiKey();
            
            if (this.elements.apiKeyInput) {
                this.elements.apiKeyInput.value = newKey;
            }
            
            this.showSuccess('API key generated successfully');
            this.updateAPIKeyStatus();
        } catch (error) {
            this.showError('Failed to generate API key', error.message);
        } finally {
            this.elements.generateKeyBtn.disabled = false;
            this.elements.generateKeyBtn.textContent = 'Generate';
        }
    }

    // Test connection
    async testConnection() {
        try {
            this.elements.testConnectionBtn.disabled = true;
            this.elements.testConnectionBtn.textContent = 'Testing...';
            
            const result = await this.auth.testConnection();
            
            if (result.status === 'online') {
                this.showSuccess('Connection successful');
                this.updateServerStatus('online');
            } else {
                this.showError('Connection failed', result.error);
                this.updateServerStatus('offline');
            }
        } catch (error) {
            this.showError('Connection test failed', error.message);
            this.updateServerStatus('offline');
        } finally {
            this.elements.testConnectionBtn.disabled = false;
            this.elements.testConnectionBtn.textContent = 'Test Connection';
        }
    }

    // Set theme
    setTheme(theme) {
        this.theme.setTheme(theme);
        this.updateThemeUI();
    }

    // Update theme UI
    updateThemeUI() {
        const currentTheme = this.theme.getCurrentTheme();
        
        this.elements.themeBtns?.forEach(btn => {
            if (btn.dataset.theme === currentTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Clear all data
    async clearData() {
        if (!confirm('Are you sure you want to clear all stored data? This will remove your API key and all settings.')) {
            return;
        }
        
        try {
            this.auth.clearAllData();
            this.theme.setTheme('light');
            this.loadUI();
            this.showSuccess('All data cleared successfully');
            
            // Redirect to upload tab
            const uploadTab = document.querySelector('[data-tab="upload"]');
            if (uploadTab) {
                uploadTab.click();
            }
        } catch (error) {
            this.showError('Failed to clear data', error.message);
        }
    }

    // Update API key status
    updateAPIKeyStatus() {
        if (!this.elements.apiKeyStatus) return;
        
        const statusIndicator = this.elements.apiKeyStatus.querySelector('.status-indicator');
        const statusText = this.elements.apiKeyStatus.querySelector('.status-text');
        
        if (this.auth.isAuthenticated()) {
            statusIndicator?.classList.remove('offline');
            statusIndicator?.classList.add('online');
            statusText.textContent = 'API Key Set';
        } else {
            statusIndicator?.classList.remove('online');
            statusIndicator?.classList.add('offline');
            statusText.textContent = 'No API Key';
        }
    }

    // Update server status
    async updateServerStatus(status = null) {
        const statusElements = [
            this.elements.serverStatus,
            this.elements.footerServerStatus?.querySelector('.status-text')
        ];
        
        if (status) {
            // Manual status update
            statusElements.forEach(element => {
                if (element) {
                    element.textContent = status === 'online' ? 'Online' : 'Offline';
                    element.className = status === 'online' ? 'value status success' : 'value status offline';
                }
            });
            
            const indicator = this.elements.footerServerStatus?.querySelector('.status-indicator');
            if (indicator) {
                indicator.className = `status-indicator ${status}`;
            }
        } else {
            // Auto-check status
            try {
                const result = await this.auth.testConnection();
                this.updateServerStatus(result.status);
            } catch {
                this.updateServerStatus('offline');
            }
        }
    }

    // Validate server URL
    validateServerUrl() {
        const input = this.elements.serverUrlInput;
        const value = input?.value?.trim();
        
        if (!value) {
            input?.classList.remove('error');
            return true;
        }
        
        try {
            new URL(value);
            input?.classList.remove('error');
            return true;
        } catch {
            input?.classList.add('error');
            return false;
        }
    }

    // Validate API key
    validateApiKey() {
        const input = this.elements.apiKeyInput;
        const value = input?.value?.trim();
        
        if (!value) {
            input?.classList.remove('error');
            return true;
        }
        
        // Basic validation - API keys are typically long strings
        if (value.length < 10) {
            input?.classList.add('error');
            return false;
        }
        
        input?.classList.remove('error');
        return true;
    }

    // Show success message
    showSuccess(message) {
        window.showToast?.(message, 'success');
    }

    // Show error message
    showError(message, details = null) {
        const fullMessage = details ? `${message}: ${details}` : message;
        window.showToast?.(fullMessage, 'error');
    }

    // Show warning message
    showWarning(message, details = null) {
        const fullMessage = details ? `${message}: ${details}` : message;
        window.showToast?.(fullMessage, 'warning');
    }
}

// Export instances
export const authManager = new AuthManager();
export const themeManager = new ThemeManager();

// Initialize settings UI when DOM is ready
let settingsUI = null;
document.addEventListener('DOMContentLoaded', () => {
    settingsUI = new SettingsUI(authManager, themeManager);
});

// Export for global access
window.authManager = authManager;
window.themeManager = themeManager;