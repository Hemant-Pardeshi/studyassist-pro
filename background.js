// Background script for handling extension lifecycle and API calls
chrome.runtime.onInstalled.addListener(() => {
    // Set default settings
    chrome.storage.sync.set({
        highlightingEnabled: true,
        definitionsEnabled: true,
        notesEnabled: true,
        highlightColor: '#ffeb3b'
    });

    // Create context menu for functionality
    chrome.contextMenus.create({
        id: 'highlightText',
        title: 'Highlight selected text',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'getDefinition',
        title: 'Get definition of selected word',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'addNote',
        title: 'Add note about this selection',
        contexts: ['selection']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    chrome.tabs.sendMessage(tab.id, {
        action: info.menuItemId,
        selectionText: info.selectionText
    });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getDefinition') {
        getWordDefinition(request.word).then(definition => {
            sendResponse({ definition: definition });
        });
        return true; // Will respond asynchronously
    }

    if (request.action === 'saveData') {
        const url = new URL(sender.tab.url).hostname;
        const key = `${request.type}_${url}`;

        chrome.storage.local.get([key]).then(result => {
            const existingData = result[key] || [];
            existingData.push(request.data);

            // Performance optimization: Limit data size per domain
            const maxItems = request.type === 'highlights' ? 1000 : 500;
            if (existingData.length > maxItems) {
                // Remove oldest items (FIFO)
                existingData.splice(0, existingData.length - maxItems);
            }

            chrome.storage.local.set({ [key]: existingData });
        }).catch(error => {
            console.error('Storage error:', error);
        });
    }

    if (request.action === 'removeData') {
        const url = new URL(sender.tab.url).hostname;
        const key = `${request.type}_${url}`;

        chrome.storage.local.get([key]).then(result => {
            const existingData = result[key] || [];
            const filteredData = existingData.filter(item => item.id !== request.id);
            chrome.storage.local.set({ [key]: filteredData });
        }).catch(error => {
            console.error('Storage error:', error);
        });
    }

    // New: Storage cleanup and monitoring
    if (request.action === 'getStorageStats') {
        chrome.storage.local.getBytesInUse(null).then(bytesInUse => {
            const mbUsed = (bytesInUse / (1024 * 1024)).toFixed(2);
            sendResponse({
                bytesInUse,
                mbUsed,
                maxMB: 5,
                percentUsed: ((bytesInUse / (5 * 1024 * 1024)) * 100).toFixed(1)
            });
        });
        return true;
    }

    if (request.action === 'cleanupOldData') {
        cleanupOldData(request.daysOld || 30);
        sendResponse({ success: true });
    }
});

// Function to get word definition using a free dictionary API
async function getWordDefinition(word) {
    try {
        // Clean and validate the word
        const cleanWord = word.trim().toLowerCase().replace(/[^a-zA-Z]/g, '');
        if (!cleanWord || cleanWord.length < 2) {
            throw new Error('Invalid word');
        }

        console.log('Fetching definition for:', cleanWord);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Word not found');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const entry = data[0];

        if (entry && entry.meanings && entry.meanings.length > 0) {
            const meaning = entry.meanings[0];
            const definition = meaning.definitions[0];

            return {
                word: entry.word || cleanWord,
                phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
                partOfSpeech: meaning.partOfSpeech || '',
                definition: definition.definition || '',
                example: definition.example || '',
                synonyms: meaning.synonyms?.slice(0, 5) || []
            };
        }

        throw new Error('No definition found');
    } catch (error) {
        console.error('Definition fetch error:', error);

        if (error.name === 'AbortError') {
            return {
                word: word,
                error: 'Request timeout',
                definition: 'The request took too long. Please try again.'
            };
        }

        return {
            word: word,
            error: 'Definition not available',
            definition: error.message === 'Word not found'
                ? `No definition found for "${word}". Please check the spelling.`
                : 'Could not fetch definition. Please try again later.'
        };
    }
}

// Performance optimization functions
async function cleanupOldData(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    try {
        const allData = await chrome.storage.local.get(null);
        const keysToUpdate = [];

        for (const [key, value] of Object.entries(allData)) {
            if (key.startsWith('highlights_') || key.startsWith('notes_')) {
                const filteredData = value.filter(item =>
                    item.timestamp && item.timestamp > cutoffTime
                );

                if (filteredData.length !== value.length) {
                    keysToUpdate.push({ key, data: filteredData });
                }
            }
        }

        // Update storage with cleaned data
        const updateObj = {};
        keysToUpdate.forEach(({ key, data }) => {
            updateObj[key] = data;
        });

        if (Object.keys(updateObj).length > 0) {
            await chrome.storage.local.set(updateObj);
            console.log(`Cleaned up ${keysToUpdate.length} storage keys`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Auto-cleanup on extension startup
chrome.runtime.onStartup.addListener(() => {
    // Clean up data older than 60 days on startup
    cleanupOldData(60);
});

// Periodic cleanup (runs when extension loads)
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        cleanupOldData(30);
    }
});
