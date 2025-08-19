// Popup script for managing settings and display
document.addEventListener('DOMContentLoaded', async function () {
    const highlightToggle = document.getElementById('highlightToggle');
    const definitionToggle = document.getElementById('definitionToggle');
    const notesToggle = document.getElementById('notesToggle');
    const colorOptions = document.querySelectorAll('.color-option');
    const clearAllBtn = document.getElementById('clearAll');
    const highlightCount = document.getElementById('highlightCount');
    const noteCount = document.getElementById('noteCount');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;
    const url = new URL(tab.url).hostname;

    // Load saved settings
    const settings = await chrome.storage.sync.get({
        highlightingEnabled: true,
        definitionsEnabled: true,
        notesEnabled: true,
        highlightColor: '#ffeb3b'
    });

    // Load page-specific data
    const pageData = await chrome.storage.local.get([`highlights_${url}`, `notes_${url}`]);
    const highlights = pageData[`highlights_${url}`] || [];
    const notes = pageData[`notes_${url}`] || [];

    // Update UI with current settings
    updateToggle(highlightToggle, settings.highlightingEnabled);
    updateToggle(definitionToggle, settings.definitionsEnabled);
    updateToggle(notesToggle, settings.notesEnabled);
    updateColorSelection(settings.highlightColor);

    // Update stats
    highlightCount.textContent = highlights.length;
    noteCount.textContent = notes.length;

    // Load storage stats
    loadStorageStats();

    // Toggle event listeners
    highlightToggle.addEventListener('click', () => {
        const isActive = !highlightToggle.classList.contains('active');
        updateToggle(highlightToggle, isActive);
        chrome.storage.sync.set({ highlightingEnabled: isActive });
        sendMessage({ action: 'toggleHighlighting', enabled: isActive });
    });

    definitionToggle.addEventListener('click', () => {
        const isActive = !definitionToggle.classList.contains('active');
        updateToggle(definitionToggle, isActive);
        chrome.storage.sync.set({ definitionsEnabled: isActive });
        sendMessage({ action: 'toggleDefinitions', enabled: isActive });
    });

    notesToggle.addEventListener('click', () => {
        const isActive = !notesToggle.classList.contains('active');
        updateToggle(notesToggle, isActive);
        chrome.storage.sync.set({ notesEnabled: isActive });
        sendMessage({ action: 'toggleNotes', enabled: isActive });
    });

    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.dataset.color;
            updateColorSelection(color);
            chrome.storage.sync.set({ highlightColor: color });
            sendMessage({ action: 'changeHighlightColor', color: color });
        });
    });

    // Clear all data
    clearAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all highlights and notes for this page?')) {
            await chrome.storage.local.remove([`highlights_${url}`, `notes_${url}`]);
            sendMessage({ action: 'clearAllData' });
            highlightCount.textContent = '0';
            noteCount.textContent = '0';
            loadStorageStats(); // Refresh storage stats
        }
    });

    // Cleanup old data
    const cleanupOldBtn = document.getElementById('cleanupOld');
    cleanupOldBtn.addEventListener('click', async () => {
        if (confirm('This will remove highlights and notes older than 30 days. Continue?')) {
            try {
                await chrome.runtime.sendMessage({ action: 'cleanupOldData', daysOld: 30 });
                showNotification('Old data cleaned up successfully!');
                loadStorageStats(); // Refresh storage stats
            } catch (error) {
                showNotification('Error during cleanup', 'error');
            }
        }
    });

    function updateToggle(toggle, isActive) {
        if (isActive) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }

    function updateColorSelection(selectedColor) {
        colorOptions.forEach(option => {
            if (option.dataset.color === selectedColor) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    function sendMessage(message) {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
            // Ignore errors if content script isn't ready
        });
    }

    // Load and display storage statistics
    async function loadStorageStats() {
        try {
            const stats = await chrome.runtime.sendMessage({ action: 'getStorageStats' });
            const storageUsed = document.getElementById('storageUsed');
            const storageFill = document.getElementById('storageFill');

            storageUsed.textContent = `${stats.mbUsed}/5.0`;
            storageFill.style.width = `${Math.min(stats.percentUsed, 100)}%`;

            // Change color based on usage
            if (stats.percentUsed > 80) {
                storageFill.style.background = '#e74c3c';
            } else if (stats.percentUsed > 60) {
                storageFill.style.background = '#f39c12';
            } else {
                storageFill.style.background = '#27ae60';
            }

            // Show warning if storage is getting full
            if (stats.percentUsed > 90) {
                showNotification('Storage almost full! Consider cleaning up old data.', 'warning');
            }
        } catch (error) {
            console.error('Error loading storage stats:', error);
            document.getElementById('storageUsed').textContent = 'Error';
        }
    }

    // Show notification in popup
    function showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('popup-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'popup-notification';
            notification.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set notification style based on type
        const colors = {
            info: { bg: '#3498db', text: 'white' },
            success: { bg: '#27ae60', text: 'white' },
            warning: { bg: '#f39c12', text: 'white' },
            error: { bg: '#e74c3c', text: 'white' }
        };

        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.color = color.text;
        notification.textContent = message;
        notification.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
});
