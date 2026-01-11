// API Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:8081',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
    CHUNK_SIZE: 20 * 1024 * 1024, // 20MB
    SUPPORTED_FORMATS: ['*'],
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
};

// API Error Types
export class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Network Error Types
export class NetworkError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NetworkError';
    }
}

// Timeout Error Types
export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}

// Main API Client Class
export class InfinityAPI {
    constructor(baseURL = CONFIG.API_BASE_URL, apiKey = null) {
        this.baseURL = baseURL;
        this.apiKey = apiKey;
        this.timeout = CONFIG.TIMEOUT;
    }

    // Set API key
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    // Get API key
    getApiKey() {
        return this.apiKey;
    }

    // Get authorization headers
    getAuthHeaders() {
        const headers = {};
        
        if (this.apiKey) {
            // Try both authorization methods
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['X-API-Key'] = this.apiKey;
        }
        
        return headers;
    }

    // Generic request method with timeout and retry logic
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const maxRetries = options.retries || CONFIG.RETRY_ATTEMPTS;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await this._makeRequest(url, options);
                return response;
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) or specific error types
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                // Don't retry on timeout
                if (error instanceof TimeoutError) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    // Make actual HTTP request
    async _makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
                    ...options.headers
                },
                signal: controller.signal
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            clearTimeout(timeoutId);

            // Handle different response statuses
            if (!response.ok) {
                const errorData = await this._parseErrorResponse(response);
                throw new APIError(
                    errorData.message || `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    errorData
                );
            }

            // Parse response based on content type
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                try {
                    return JSON.parse(text);
                } catch (parseError) {
                    console.error('[API] JSON parse error:', parseError, 'Response text:', text);
                    throw new APIError('Invalid JSON response', 500, { originalText: text });
                }
            }
            
            if (contentType && contentType.includes('application/octet-stream')) {
                return await response.blob();
            }
            
            return await response.text();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new TimeoutError(`Request timeout after ${this.timeout}ms`);
            }
            
            if (error instanceof APIError) {
                throw error;
            }
            
            throw new NetworkError(error.message || 'Network error occurred');
        }
    }

    // Parse error response
    async _parseErrorResponse(response) {
        try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return { message: await response.text() };
        } catch {
            return { message: response.statusText };
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await this.request('/', { 
                method: 'GET',
                retries: 1 // Only retry once for health checks
            });
            return { status: 'online', data: response };
        } catch (error) {
            return { status: 'offline', error: error.message };
        }
    }

    // Generate new API key
    async generateApiKey() {
        const response = await this.request('/get_api_key', {
            method: 'GET',
            retries: 1
        });
        return response.key;
    }

    // Upload file with progress tracking
    async uploadFile(file, onProgress = null) {
        if (!this.apiKey) {
            throw new APIError('API key required for file upload', 401);
        }

        // Validate file
        this._validateFile(file);

        const formData = new FormData();
        formData.append('file', file);

        // Create XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const timeoutId = setTimeout(() => {
                xhr.abort();
                reject(new TimeoutError('Upload timeout'));
            }, this.timeout * 10); // Longer timeout for uploads

            // Progress tracking
            if (onProgress && xhr.upload) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        onProgress(progress, event.loaded, event.total);
                    }
                });
            }

            // Load completion
            xhr.addEventListener('load', () => {
                clearTimeout(timeoutId);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        data: xhr.responseText
                    });
                } else {
                    const errorData = this._parseXHRError(xhr);
                    reject(new APIError(
                        errorData.message || `Upload failed: ${xhr.statusText}`,
                        xhr.status,
                        errorData
                    ));
                }
            });

            // Error handling
            xhr.addEventListener('error', () => {
                clearTimeout(timeoutId);
                reject(new NetworkError('Network error during upload'));
            });

            xhr.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new APIError('Upload cancelled', 0));
            });

            // Open and send request
            xhr.open('POST', `${this.baseURL}/upload`);
            
            // Set headers
            const headers = this.getAuthHeaders();
            Object.entries(headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });

            xhr.send(formData);
        });
    }

    // List files
    async listFiles() {
        if (!this.apiKey) {
            throw new APIError('API key required for file listing', 401);
        }

        const response = await this.request('/list', {
            method: 'GET'
        });
        
        return response.files || [];
    }

    // Get file info
    async getFileInfo(fileId) {
        if (!this.apiKey) {
            throw new APIError('API key required for file info', 401);
        }

        const files = await this.listFiles();
        return files.find(file => file.ID === parseInt(fileId));
    }

    // Download file
    async downloadFile(fileId, onProgress = null) {
        if (!this.apiKey) {
            throw new APIError('API key required for file download', 401);
        }

        const url = `${this.baseURL}/get_file?file_id=${fileId}`;
        
        // Use XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const timeoutId = setTimeout(() => {
                xhr.abort();
                reject(new TimeoutError('Download timeout'));
            }, this.timeout * 10); // Longer timeout for downloads

            // Progress tracking
            if (onProgress && xhr.addEventListener) {
                xhr.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        onProgress(progress, event.loaded, event.total);
                    }
                });
            }

            // Load completion
            xhr.addEventListener('load', () => {
                clearTimeout(timeoutId);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Get content type and filename from headers
                    const contentType = xhr.getResponseHeader('content-type') || 'application/octet-stream';
                    const contentDisposition = xhr.getResponseHeader('content-disposition') || '';
                    
                    // Extract filename from content-disposition header
                    let filename = `file_${fileId}`;
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }

                    // Create blob from response
                    const blob = new Blob([xhr.response], { type: contentType });
                    
                    resolve({
                        blob,
                        filename,
                        contentType,
                        size: blob.size
                    });
                } else {
                    const errorData = this._parseXHRError(xhr);
                    reject(new APIError(
                        errorData.message || `Download failed: ${xhr.statusText}`,
                        xhr.status,
                        errorData
                    ));
                }
            });

            // Error handling
            xhr.addEventListener('error', () => {
                clearTimeout(timeoutId);
                reject(new NetworkError('Network error during download'));
            });

            xhr.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new APIError('Download cancelled', 0));
            });

            // Open and send request
            xhr.open('GET', url);
            xhr.responseType = 'blob';
            
            // Set headers
            const headers = this.getAuthHeaders();
            Object.entries(headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });

            xhr.send();
        });
    }

    // Validate file before upload
    _validateFile(file) {
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            throw new APIError(`File size exceeds maximum limit of ${this._formatFileSize(CONFIG.MAX_FILE_SIZE)}`, 413);
        }

        // Check if file is empty
        if (file.size === 0) {
            throw new APIError('Empty files cannot be uploaded', 400);
        }

        // Check file type (if restrictions exist)
        if (CONFIG.SUPPORTED_FORMATS.length > 0 && !CONFIG.SUPPORTED_FORMATS.includes('*')) {
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            if (!CONFIG.SUPPORTED_FORMATS.includes(fileExtension)) {
                throw new APIError(`File type not supported. Supported formats: ${CONFIG.SUPPORTED_FORMATS.join(', ')}`, 415);
            }
        }
    }

    // Parse XHR error response
    _parseXHRError(xhr) {
        try {
            return JSON.parse(xhr.responseText);
        } catch {
            return { message: xhr.statusText || 'Unknown error' };
        }
    }

    // Format file size for display
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Cancel all active requests (cleanup)
    cancelAllRequests() {
        // This would need to be implemented with a request tracking system
        // For now, it's a placeholder for future enhancement
    }
}

// Utility functions for file operations
export const FileUtils = {
    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Get file icon based on type
    getFileIcon(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return 'default';
        }
        
        const extension = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            // Images
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'svg': 'image', 'webp': 'image',
            // Videos
            'mp4': 'video', 'avi': 'video', 'mov': 'video', 'wmv': 'video', 'flv': 'video', 'webm': 'video',
            // Audio
            'mp3': 'audio', 'wav': 'audio', 'flac': 'audio', 'aac': 'audio', 'ogg': 'audio', 'm4a': 'audio',
            // Documents
            'pdf': 'document', 'doc': 'document', 'docx': 'document', 'txt': 'document', 'rtf': 'document',
            // Archives
            'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive', 'gz': 'archive'
        };
        
        return iconMap[extension] || 'default';
    },

    // Validate file name
    validateFileName(fileName) {
        // Check for empty name
        if (!fileName || fileName.trim() === '') {
            return false;
        }
        
        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(fileName)) {
            return false;
        }
        
        // Check length (most filesystems have limits)
        if (fileName.length > 255) {
            return false;
        }
        
        return true;
    },

    // Sanitize file name
    sanitizeFileName(fileName) {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Get file extension
    getFileExtension(fileName) {
        return fileName.split('.').pop().toLowerCase();
    },

    // Check if file is previewable
    isPreviewable(fileName) {
        const previewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'pdf', 'txt'];
        const extension = this.getFileExtension(fileName);
        return previewableExtensions.includes(extension);
    }
};

// Export default API instance
export default InfinityAPI;
