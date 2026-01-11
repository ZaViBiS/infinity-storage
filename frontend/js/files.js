// File Management Interface
import { authManager } from './auth.js';
import { FileUtils } from './api.js';

// Files Manager Class
export class FilesManager {
    constructor() {
        this.files = [];
        this.filteredFiles = [];
        this.currentView = 'grid';
        this.searchQuery = '';
        this.sortBy = 'CreatedAt';
        this.sortOrder = 'desc';
        this.selectedFiles = new Set();
        this.isLoading = false;
        
        this.initializeElements();
        this.bindEvents();
        // Don't auto-load files here - wait for auth
        this.loadFilesIfAuthenticated();
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            // Files container
            filesGrid: document.getElementById('filesGrid'),
            emptyState: document.getElementById('emptyState'),
            
            // Search and controls
            searchInput: document.getElementById('searchInput'),
            viewBtns: document.querySelectorAll('.view-btn'),
            filesStats: document.getElementById('filesStats'),
            
            // Modal
            fileModal: document.getElementById('fileModal'),
            modalBody: document.getElementById('modalBody'),
            modalClose: document.getElementById('modalClose'),
            downloadBtn: document.getElementById('downloadBtn'),
            deleteBtn: document.getElementById('deleteBtn')
        };
    }

    // Bind event listeners
    bindEvents() {
        // Search
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterFiles();
        });

        // View toggle
        this.elements.viewBtns?.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        // Modal events
        this.elements.modalClose?.addEventListener('click', () => {
            this.closeModal();
        });

        this.elements.fileModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.fileModal) {
                this.closeModal();
            }
        });

        // Modal actions
        this.elements.downloadBtn?.addEventListener('click', () => {
            this.downloadCurrentFile();
        });

        this.elements.deleteBtn?.addEventListener('click', () => {
            this.deleteCurrentFile();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Load files only if authenticated
    loadFilesIfAuthenticated() {
        if (authManager.isAuthenticated()) {
            this.loadFiles();
        } else {
            // Show empty state with login prompt
            this.showAuthRequiredState();
        }
    }

    // Load files from API
    async loadFiles() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.setLoadingState(true);

const api = authManager.getAPI();
            this.files = await api.listFiles();
            
            // Sort files
            this.sortFiles();
            
            // Apply filters
            this.filterFiles();
            
            // Update UI
            this.renderFiles();
            this.updateStats();

        } catch (error) {
            console.error('Failed to load files:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.status,
                data: error.data
            });
            window.showToast(`Failed to load files: ${error.message}`, 'error');
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.setLoadingState(false);
        }
    }

    // Refresh files
    async refreshFiles() {
        await this.loadFiles();
    }

    // Sort files
    sortFiles() {
        this.files.sort((a, b) => {
            let aValue = a[this.sortBy];
            let bValue = b[this.sortBy];

            // Handle date sorting
            if (this.sortBy === 'CreatedAt' || this.sortBy === 'UpdatedAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            // Handle string sorting
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;

            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    // Filter files based on search query
    filterFiles() {
        if (!this.searchQuery) {
            this.filteredFiles = [...this.files];
        } else {
            const query = this.searchQuery.toLowerCase();
            this.filteredFiles = this.files.filter(file => 
                file.filename.toLowerCase().includes(query)
            );
        }

        this.renderFiles();
        this.updateStats();
    }

    // Set view mode
    setView(view) {
        this.currentView = view;
        
        // Update button states
        this.elements.viewBtns?.forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Re-render files
        this.renderFiles();
    }

    // Render files
    renderFiles() {
        if (!this.elements.filesGrid) return;

        if (this.filteredFiles.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        const filesHTML = this.filteredFiles.map(file => 
            this.currentView === 'grid' ? 
                this.renderFileCard(file) : 
                this.renderFileListItem(file)
        ).join('');

        this.elements.filesGrid.innerHTML = filesHTML;
        this.elements.filesGrid.className = this.currentView === 'grid' ? 'files-grid' : 'files-list';
    }

    // Render file card (grid view)
    renderFileCard(file) {
        const fileIcon = FileUtils.getFileIcon(file.filename);
        const fileSize = FileUtils.formatFileSize(file.size);
        const uploadDate = new Date(file.CreatedAt).toLocaleDateString();
        const isSelected = this.selectedFiles.has(file.ID);

        return `
            <div class="file-card ${isSelected ? 'selected' : ''}" data-file-id="${file.ID}">
                <div class="file-card-header">
                    <div class="file-icon ${fileIcon}">
                        ${this.renderFileIcon(fileIcon)}
                    </div>
                    <div class="file-info">
                        <div class="file-name" title="${file.filename}">${file.filename}</div>
                        <div class="file-meta">
                            <div class="file-size">${fileSize}</div>
                            <div class="file-date">${uploadDate}</div>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn download-btn" data-file-id="${file.ID}" title="Download">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="file-action-btn info-btn" data-file-id="${file.ID}" title="Details">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    // Render file list item (list view)
    renderFileListItem(file) {
        const fileIcon = FileUtils.getFileIcon(file.filename);
        const fileSize = FileUtils.formatFileSize(file.size);
        const uploadDate = new Date(file.CreatedAt).toLocaleDateString();
        const isSelected = this.selectedFiles.has(file.ID);

        return `
            <div class="file-list-item ${isSelected ? 'selected' : ''}" data-file-id="${file.ID}">
                <div class="file-list-icon ${fileIcon}">
                    ${this.renderFileIcon(fileIcon)}
                </div>
                <div class="file-list-content">
                    <div class="file-list-name" title="${file.filename}">${file.filename}</div>
                    <div class="file-list-meta">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-date">${uploadDate}</span>
                        <span class="file-status status-badge ${file.Status.toLowerCase()}">${file.Status}</span>
                    </div>
                </div>
                <div class="file-list-actions">
                    <button class="file-action-btn download-btn" data-file-id="${file.ID}" title="Download">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button class="file-action-btn info-btn" data-file-id="${file.ID}" title="Details">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    // Render file icon SVG
    renderFileIcon(iconType) {
        const icons = {
            image: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            video: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
            audio: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
            document: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
            archive: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
            default: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
        };

        return icons[iconType] || icons.default;
    }

    // Show file details modal
    async showFileDetails(fileId) {
        try {
            const file = this.files.find(f => f.ID === parseInt(fileId));
            if (!file) return;

            this.currentFile = file;
            this.renderFileModal(file);
            this.openModal();

        } catch (error) {
            console.error('Failed to load file details:', error);
            window.showToast('Failed to load file details', 'error');
        }
    }

    // Render file modal content
    renderFileModal(file) {
        const fileIcon = FileUtils.getFileIcon(file.filename);
        const fileSize = FileUtils.formatFileSize(file.size);
        const uploadDate = new Date(file.CreatedAt).toLocaleString();
        const updateDate = new Date(file.UpdatedAt).toLocaleString();
        const isPreviewable = FileUtils.isPreviewable(file.filename);

        const modalHTML = `
            <div class="file-details">
                <div class="file-detail-preview">
                    ${isPreviewable && fileIcon === 'image' ? 
                        `<img src="${authManager.getServerUrl()}/get_file?file_id=${file.ID}" alt="${file.filename}" class="file-detail-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="file-detail-icon ${fileIcon}" style="display:none;">${this.renderFileIcon(fileIcon)}</div>` :
                        `<div class="file-detail-icon ${fileIcon}">${this.renderFileIcon(fileIcon)}</div>`
                    }
                </div>
                <div class="file-detail-info">
                    <div class="file-detail-item">
                        <span class="file-detail-label">File Name</span>
                        <span class="file-detail-value">${file.filename}</span>
                    </div>
                    <div class="file-detail-item">
                        <span class="file-detail-label">Size</span>
                        <span class="file-detail-value">${fileSize}</span>
                    </div>
                    <div class="file-detail-item">
                        <span class="file-detail-label">Status</span>
                        <span class="file-detail-value">
                            <span class="status-badge ${file.Status.toLowerCase()}">${file.Status}</span>
                        </span>
                    </div>
                    <div class="file-detail-item">
                        <span class="file-detail-label">Chunks</span>
                        <span class="file-detail-value">${file.TotalChunks}</span>
                    </div>
                    <div class="file-detail-item">
                        <span class="file-detail-label">Uploaded</span>
                        <span class="file-detail-value">${uploadDate}</span>
                    </div>
                    <div class="file-detail-item">
                        <span class="file-detail-label">Last Updated</span>
                        <span class="file-detail-value">${updateDate}</span>
                    </div>
                    <div class="file-detail-item">
                        <span class="file-detail-label">File ID</span>
                        <span class="file-detail-value">#${file.ID}</span>
                    </div>
                </div>
            </div>
        `;

        if (this.elements.modalBody) {
            this.elements.modalBody.innerHTML = modalHTML;
        }
    }

    // Download file
    async downloadFile(fileId) {
        try {
            const file = this.files.find(f => f.ID === parseInt(fileId));
            if (!file) return;

            window.showToast(`Downloading "${file.FileName}"...`, 'info');

            const api = authManager.getAPI();
            const result = await api.downloadFile(fileId);

            // Create download link
            const url = URL.createObjectURL(result.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            window.showToast(`Downloaded "${file.FileName}"`, 'success');

        } catch (error) {
            console.error('Download failed:', error);
            window.showToast('Download failed', 'error');
        }
    }

    // Download current file (from modal)
    async downloadCurrentFile() {
        if (!this.currentFile) return;
        await this.downloadFile(this.currentFile.ID);
        this.closeModal();
    }

    // Delete file (placeholder - not implemented in API yet)
    async deleteFile(fileId) {
        // This would need to be implemented in the API
        window.showToast('File deletion not yet implemented', 'warning');
    }

    // Delete current file (from modal)
    async deleteCurrentFile() {
        if (!this.currentFile) return;
        
        if (confirm(`Are you sure you want to delete "${this.currentFile.FileName}"?`)) {
            await this.deleteFile(this.currentFile.ID);
            this.closeModal();
            await this.loadFiles();
        }
    }

    // Modal controls
    openModal() {
        if (this.elements.fileModal) {
            this.elements.fileModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        if (this.elements.fileModal) {
            this.elements.fileModal.classList.remove('active');
            document.body.style.overflow = '';
            this.currentFile = null;
        }
    }

    // Show authentication required state
    showAuthRequiredState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                </svg>
                <h3>Authentication Required</h3>
                <p>Please set an API key in Settings to view your files</p>
                <button class="btn btn-primary" onclick="window.tabManager.switchTab('settings')">Go to Settings</button>
            `;
            this.elements.emptyState.style.display = 'flex';
        }
        if (this.elements.filesGrid) {
            this.elements.filesGrid.style.display = 'none';
        }
    }

    // UI state management
    showEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <h3>No files yet</h3>
                <p>Upload your first file to get started</p>
                <button class="btn btn-primary" onclick="window.switchToUploadTab()">Upload Files</button>
            `;
            this.elements.emptyState.style.display = 'flex';
        }
        if (this.elements.filesGrid) {
            this.elements.filesGrid.style.display = 'none';
        }
    }

    hideEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
        if (this.elements.filesGrid) {
            this.elements.filesGrid.style.display = this.currentView === 'grid' ? 'grid' : 'block';
        }
    }

    showErrorState() {
        if (this.elements.filesGrid) {
            this.elements.filesGrid.innerHTML = `
                <div class="error-state">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>Failed to load files</h3>
                    <p>Please check your connection and try again</p>
                    <button class="btn btn-primary" onclick="window.filesManager.refreshFiles()">Retry</button>
                </div>
            `;
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.elements.filesGrid?.classList.add('loading');
        } else {
            this.elements.filesGrid?.classList.remove('loading');
        }
    }

    // Update statistics
    updateStats() {
        if (!this.elements.filesStats) return;

        const totalFiles = this.filteredFiles.length;
        const totalSize = this.filteredFiles.reduce((sum, file) => sum + file.Size, 0);
        const formattedSize = FileUtils.formatFileSize(totalSize);

        this.elements.filesStats.innerHTML = `
            <span class="stat-item">${totalFiles} files</span>
            <span class="stat-item">${formattedSize}</span>
        `;
    }
}

// Handle file action clicks
document.addEventListener('click', (e) => {
    const fileCard = e.target.closest('.file-card, .file-list-item');
    if (!fileCard) return;

    const fileId = fileCard.dataset.fileId;
    const actionBtn = e.target.closest('.file-action-btn');

    if (actionBtn) {
        e.stopPropagation();
        
        if (actionBtn.classList.contains('download-btn')) {
            window.filesManager?.downloadFile(fileId);
        } else if (actionBtn.classList.contains('info-btn')) {
            window.filesManager?.showFileDetails(fileId);
        }
    } else if (!e.target.closest('.file-actions, .file-list-actions')) {
        // Click on card itself (not on actions)
        window.filesManager?.showFileDetails(fileId);
    }
});

// Initialize files manager
export const filesManager = new FilesManager();

// Export for global access
window.filesManager = filesManager;