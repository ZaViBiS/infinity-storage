// File Upload Management
import { authManager } from './auth.js';
import { FileUtils } from './api.js';

// Upload Manager Class
export class UploadManager {
    constructor() {
        this.activeUploads = new Map();
        this.uploadQueue = [];
        this.maxConcurrentUploads = 3;
        this.isProcessing = false;
        this.initializeElements();
        this.bindEvents();
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            browseBtn: document.getElementById('browseBtn'),
            uploadQueue: document.getElementById('uploadQueue'),
            queueList: document.getElementById('queueList')
        };
    }

    // Bind event listeners
    bindEvents() {
        // File input change
        this.elements.fileInput?.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Browse button click
        this.elements.browseBtn?.addEventListener('click', () => {
            this.elements.fileInput?.click();
        });

        // Drag and drop events
        this.elements.uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('dragover');
        });

        this.elements.uploadArea?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
        });

        this.elements.uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });

        // Click to upload
        this.elements.uploadArea?.addEventListener('click', (e) => {
            if (e.target === this.elements.uploadArea || e.target.closest('.upload-content')) {
                this.elements.fileInput?.click();
            }
        });
    }

    // Handle file selection
    async handleFileSelection(files) {
        if (!files || files.length === 0) return;

        // Check authentication
        if (!authManager.isAuthenticated()) {
            window.showToast('Please set an API key first', 'error');
            return;
        }

        // Validate and queue files
        const validFiles = [];
        const invalidFiles = [];

        for (const file of files) {
            if (this.validateFile(file)) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        }

        // Show errors for invalid files
        if (invalidFiles.length > 0) {
            window.showToast(
                `Invalid files: ${invalidFiles.join(', ')}`,
                'warning'
            );
        }

        // Queue valid files
        if (validFiles.length > 0) {
            this.queueFiles(validFiles);
        }
    }

    // Validate file
    validateFile(file) {
        // Check file size
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
        if (file.size > maxSize) {
            window.showToast(
                `File "${file.name}" is too large (max 2GB)`,
                'error'
            );
            return false;
        }

        // Check if file is empty
        if (file.size === 0) {
            window.showToast(
                `File "${file.name}" is empty`,
                'error'
            );
            return false;
        }

        // Check file name
        if (!FileUtils.validateFileName(file.name)) {
            window.showToast(
                `Invalid file name: "${file.name}"`,
                'error'
            );
            return false;
        }

        return true;
    }

    // Queue files for upload
    queueFiles(files) {
        for (const file of files) {
            const uploadItem = this.createUploadItem(file);
            this.uploadQueue.push(uploadItem);
            this.activeUploads.set(uploadItem.id, uploadItem);
        }

        this.updateQueueUI();
        this.processQueue();
    }

    // Create upload item
    createUploadItem(file) {
        const id = this.generateUploadId();
        return {
            id,
            file,
            status: 'queued',
            progress: 0,
            startTime: null,
            endTime: null,
            error: null,
            retryCount: 0
        };
    }

    // Generate unique upload ID
    generateUploadId() {
        return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Process upload queue
    async processQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;

        while (this.uploadQueue.length > 0) {
            const activeCount = Array.from(this.activeUploads.values())
                .filter(item => item.status === 'uploading').length;

            if (activeCount >= this.maxConcurrentUploads) {
                break;
            }

            const uploadItem = this.uploadQueue.shift();
            await this.uploadFile(uploadItem);
        }

        this.isProcessing = false;
    }

    // Upload single file
    async uploadFile(uploadItem) {
        try {
            uploadItem.status = 'uploading';
            uploadItem.startTime = Date.now();
            this.updateUploadItemUI(uploadItem);

            const api = authManager.getAPI();
            
            // Simulate progress since the API doesn't provide it
            const progressSimulator = this.startProgressSimulation(uploadItem);
            
            await api.uploadFile(uploadItem.file, (progress, loaded, total) => {
                // Real progress if available
                this.stopProgressSimulation(progressSimulator);
                uploadItem.progress = progress;
                this.updateUploadItemUI(uploadItem);
            });

            // Upload completed
            uploadItem.status = 'completed';
            uploadItem.progress = 100;
            uploadItem.endTime = Date.now();
            this.updateUploadItemUI(uploadItem);

            // Show success message
            window.showToast(
                `File "${uploadItem.file.name}" uploaded successfully`,
                'success'
            );

            // Remove from active uploads after delay
            setTimeout(() => {
                this.removeUploadItem(uploadItem.id);
            }, 3000);

        } catch (error) {
            uploadItem.status = 'failed';
            uploadItem.error = error.message;
            uploadItem.endTime = Date.now();
            this.updateUploadItemUI(uploadItem);

            window.showToast(
                `Failed to upload "${uploadItem.file.name}": ${error.message}`,
                'error'
            );
        }

        // Continue processing queue
        this.processQueue();
    }

    // Start progress simulation
    startProgressSimulation(uploadItem) {
        const simulator = {
            interval: null,
            stopped: false
        };

        let progress = 0;
        const duration = this.estimateUploadDuration(uploadItem.file);
        const increment = 100 / (duration / 100); // Update every 100ms

        simulator.interval = setInterval(() => {
            if (simulator.stopped || uploadItem.status !== 'uploading') {
                clearInterval(simulator.interval);
                return;
            }

            progress = Math.min(progress + increment, 95); // Max 95% until complete
            uploadItem.progress = progress;
            this.updateUploadItemUI(uploadItem);
        }, 100);

        return simulator;
    }

    // Stop progress simulation
    stopProgressSimulation(simulator) {
        if (simulator) {
            simulator.stopped = true;
            if (simulator.interval) {
                clearInterval(simulator.interval);
            }
        }
    }

    // Estimate upload duration (for simulation)
    estimateUploadDuration(file) {
        // Rough estimate: 1MB per second, minimum 2 seconds
        const sizeMB = file.size / (1024 * 1024);
        return Math.max(2000, sizeMB * 1000);
    }

    // Update queue UI
    updateQueueUI() {
        if (!this.elements.uploadQueue || !this.elements.queueList) return;

        const hasActiveUploads = this.activeUploads.size > 0;
        
        if (hasActiveUploads) {
            this.elements.uploadQueue.style.display = 'block';
            this.renderQueueList();
        } else {
            this.elements.uploadQueue.style.display = 'none';
        }
    }

    // Render queue list
    renderQueueList() {
        if (!this.elements.queueList) return;

        const uploadItems = Array.from(this.activeUploads.values());
        
        this.elements.queueList.innerHTML = uploadItems.map(item => 
            this.renderUploadItem(item)
        ).join('');
    }

    // Render single upload item
    renderUploadItem(uploadItem) {
        const statusClass = uploadItem.status;
        const fileIcon = FileUtils.getFileIcon(uploadItem.file.name);
        const fileSize = FileUtils.formatFileSize(uploadItem.file.size);

        return `
            <div class="upload-item ${statusClass}" data-upload-id="${uploadItem.id}">
                <div class="upload-item-info">
                    <div class="upload-item-name">${uploadItem.file.name}</div>
                    <div class="upload-item-meta">
                        <span>${fileSize}</span>
                        <span class="upload-status">${uploadItem.status}</span>
                    </div>
                </div>
                <div class="upload-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${statusClass}" style="width: ${uploadItem.progress}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(uploadItem.progress)}%</div>
                </div>
                <div class="upload-item-actions">
                    ${uploadItem.status === 'failed' ? `
                        <button class="upload-action-btn retry-btn" data-upload-id="${uploadItem.id}">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 4v6h6M23 20v-6h-6"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                            </svg>
                        </button>
                    ` : ''}
                    ${uploadItem.status === 'uploading' ? `
                        <button class="upload-action-btn cancel-btn" data-upload-id="${uploadItem.id}">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    ` : ''}
                    ${uploadItem.status === 'completed' ? `
                        <button class="upload-action-btn remove-btn" data-upload-id="${uploadItem.id}">
                            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Update upload item UI
    updateUploadItemUI(uploadItem) {
        const element = document.querySelector(`[data-upload-id="${uploadItem.id}"]`);
        if (!element) return;

        // Update status class
        element.className = `upload-item ${uploadItem.status}`;

        // Update progress bar
        const progressFill = element.querySelector('.progress-fill');
        const progressText = element.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${uploadItem.progress}%`;
            progressFill.className = `progress-fill ${uploadItem.status}`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(uploadItem.progress)}%`;
        }

        // Update status text
        const statusElement = element.querySelector('.upload-status');
        if (statusElement) {
            statusElement.textContent = uploadItem.status;
        }

        // Update actions
        const actionsContainer = element.querySelector('.upload-item-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = this.renderUploadActions(uploadItem);
        }
    }

    // Render upload actions
    renderUploadActions(uploadItem) {
        if (uploadItem.status === 'failed') {
            return `
                <button class="upload-action-btn retry-btn" data-upload-id="${uploadItem.id}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6M23 20v-6h-6"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                </button>
            `;
        }

        if (uploadItem.status === 'uploading') {
            return `
                <button class="upload-action-btn cancel-btn" data-upload-id="${uploadItem.id}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
        }

        if (uploadItem.status === 'completed') {
            return `
                <button class="upload-action-btn remove-btn" data-upload-id="${uploadItem.id}">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;
        }

        return '';
    }

    // Handle upload actions
    handleUploadAction(action, uploadId) {
        const uploadItem = this.activeUploads.get(uploadId);
        if (!uploadItem) return;

        switch (action) {
            case 'retry':
                this.retryUpload(uploadItem);
                break;
            case 'cancel':
                this.cancelUpload(uploadItem);
                break;
            case 'remove':
                this.removeUploadItem(uploadId);
                break;
        }
    }

    // Retry upload
    retryUpload(uploadItem) {
        uploadItem.status = 'queued';
        uploadItem.progress = 0;
        uploadItem.error = null;
        uploadItem.retryCount++;
        
        this.uploadQueue.push(uploadItem);
        this.updateQueueUI();
        this.processQueue();
    }

    // Cancel upload
    cancelUpload(uploadItem) {
        uploadItem.status = 'cancelled';
        this.updateUploadItemUI(uploadItem);
        
        setTimeout(() => {
            this.removeUploadItem(uploadItem.id);
        }, 1000);
    }

    // Remove upload item
    removeUploadItem(uploadId) {
        this.activeUploads.delete(uploadId);
        this.updateQueueUI();
    }

    // Get upload statistics
    getUploadStats() {
        const items = Array.from(this.activeUploads.values());
        
        return {
            total: items.length,
            queued: items.filter(item => item.status === 'queued').length,
            uploading: items.filter(item => item.status === 'uploading').length,
            completed: items.filter(item => item.status === 'completed').length,
            failed: items.filter(item => item.status === 'failed').length
        };
    }

    // Clear all uploads
    clearAllUploads() {
        this.activeUploads.clear();
        this.uploadQueue = [];
        this.updateQueueUI();
    }
}

// Initialize upload manager
export const uploadManager = new UploadManager();

// Handle upload action clicks
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.upload-action-btn');
    if (!btn) return;

    const uploadId = btn.dataset.uploadId;
    const action = btn.classList.contains('retry-btn') ? 'retry' :
                  btn.classList.contains('cancel-btn') ? 'cancel' :
                  btn.classList.contains('remove-btn') ? 'remove' : null;

    if (action && uploadId) {
        uploadManager.handleUploadAction(action, uploadId);
    }
});

// Export for global access
window.uploadManager = uploadManager;