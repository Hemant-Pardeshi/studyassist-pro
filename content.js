// Content script - Main functionality for highlighting, definitions, and notes
(function () {
    'use strict';

    let settings = {
        highlightingEnabled: true,
        definitionsEnabled: true,
        notesEnabled: true,
        highlightColor: '#ffeb3b'
    };

    let notesPanel = null;
    let definitionTooltip = null;
    let highlightCounter = 0;

    // Performance optimization: Throttle and debounce
    let highlightTimeout = null;
    let definitionCache = new Map();
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

    // Initialize the extension
    init();

    async function init() {
        // Load settings
        const savedSettings = await chrome.storage.sync.get({
            highlightingEnabled: true,
            definitionsEnabled: true,
            notesEnabled: true,
            highlightColor: '#ffeb3b'
        });

        settings = { ...settings, ...savedSettings };

        // Load existing highlights and notes
        await loadExistingData();

        // Set up event listeners
        setupEventListeners();

        // Create notes panel if enabled
        if (settings.notesEnabled) {
            createNotesPanel();
        }

        console.log('StudyAssist Pro loaded');

        // Add test function to global scope for debugging
        window.testDefinition = function (word) {
            console.log('Testing definition for:', word);
            showDefinition(word || 'example', 100, 100);
        };

        console.log('Test function added: window.testDefinition("word")');
    }

    function setupEventListeners() {
        // Text selection for highlighting
        document.addEventListener('mouseup', handleTextSelection);

        // Improved double-click handler for definitions (primary method)
        document.addEventListener('dblclick', handleDoubleClick, true);

        // Single-click for highlight removal and secondary definition trigger
        document.addEventListener('click', handleClick);

        // Listen for messages from popup and background
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            handleMessage(request, sender, sendResponse);
        });

        // Close tooltip when clicking elsewhere
        document.addEventListener('click', (e) => {
            // Don't close if clicking on tooltip itself
            if (definitionTooltip && definitionTooltip.contains(e.target)) {
                return;
            }
            // Close tooltip for other clicks
            if (definitionTooltip && !e.target.closest('.study-helper-tooltip')) {
                hideDefinitionTooltip();
            }
        }, true);

        // Add keyboard shortcut for definition (Ctrl/Cmd + D)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && settings.definitionsEnabled) {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                if (selectedText && /^[a-zA-Z]{2,}$/.test(selectedText)) {
                    e.preventDefault();
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

                    // Position tooltip at the center-bottom of the selection
                    const x = rect.left + (rect.width / 2);
                    const y = rect.bottom + 5;

                    console.log('Keyboard shortcut positioning:', { x, y, rect }); // Debug log
                    showDefinition(selectedText, x, y);
                }
            }
        });
    }

    function handleTextSelection(e) {
        if (!settings.highlightingEnabled) return;

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length === 0) return;

        // Performance optimization: Clear previous timeout
        if (highlightTimeout) {
            clearTimeout(highlightTimeout);
        }

        // Limit text length for performance
        if (selectedText.length > 0 && selectedText.length <= 1000) {
            // Debounce highlighting to prevent excessive calls
            highlightTimeout = setTimeout(() => {
                const currentSelection = window.getSelection();
                if (currentSelection.toString().trim() === selectedText) {
                    highlightSelection(currentSelection);
                }
            }, 200);
        }
    }

    function handleDoubleClick(e) {
        if (!settings.definitionsEnabled) return;

        console.log('Double-click detected'); // Debug log

        // Prevent default text selection behavior when we handle the word
        e.preventDefault();
        e.stopPropagation();

        let selectedWord = null;

        // Method 1: Check if there's already selected text
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText && /^[a-zA-Z]{2,}$/.test(selectedText)) {
            selectedWord = selectedText;
            console.log('Using selected text:', selectedWord); // Debug log
        } else {
            // Method 2: Get word from click position
            selectedWord = getWordFromDoubleClick(e);
            console.log('Extracted word from click:', selectedWord); // Debug log
        }

        if (selectedWord) {
            // Clear any selection to avoid visual confusion
            selection.removeAllRanges();

            // Get more precise positioning
            let x = e.clientX;
            let y = e.clientY;

            // Fallback positioning if client coordinates are not available
            if (!x || !y) {
                const rect = e.target.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.bottom;
            }

            console.log('Click coordinates:', { x, y, clientX: e.clientX, clientY: e.clientY }); // Debug log
            console.log('Showing definition for:', selectedWord); // Debug log
            showDefinition(selectedWord, x, y);
        } else {
            console.log('No valid word found for definition'); // Debug log
        }
    }

    function getWordFromDoubleClick(e) {
        let word = null;

        try {
            // Method 1: Use caret position for precise word detection
            let range = null;
            let textNode = null;
            let offset = 0;

            // Try different browser APIs
            if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(e.clientX, e.clientY);
                if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                    textNode = range.startContainer;
                    offset = range.startOffset;
                }
            } else if (document.caretPositionFromPoint) {
                const caretPos = document.caretPositionFromPoint(e.clientX, e.clientY);
                if (caretPos && caretPos.offsetNode.nodeType === Node.TEXT_NODE) {
                    textNode = caretPos.offsetNode;
                    offset = caretPos.offset;
                }
            }

            if (textNode) {
                word = extractWordFromTextNode(textNode, offset);
                if (word) return word;
            }

            // Method 2: Fallback to target element text analysis
            const target = e.target;
            if (target && target.textContent) {
                word = extractWordFromElement(target, e);
                if (word) return word;
            }

            // Method 3: Search in parent elements
            let parent = target.parentNode;
            while (parent && parent.nodeType === Node.ELEMENT_NODE && !word) {
                if (parent.textContent) {
                    word = extractFirstValidWord(parent.textContent);
                    if (word) return word;
                }
                parent = parent.parentNode;
            }

        } catch (error) {
            console.log('Error in word extraction:', error);
        }

        return null;
    }

    function extractWordFromTextNode(textNode, offset) {
        const text = textNode.textContent;
        if (!text) return null;

        // Find word boundaries around the offset
        let start = offset;
        let end = offset;

        // Move start backwards to find word beginning
        while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) {
            start--;
        }

        // Move end forwards to find word ending
        while (end < text.length && /[a-zA-Z]/.test(text[end])) {
            end++;
        }

        const word = text.substring(start, end);
        return (word.length >= 2 && /^[a-zA-Z]+$/.test(word)) ? word : null;
    }

    function extractWordFromElement(element, event) {
        const text = element.textContent || element.innerText;
        if (!text) return null;

        // Split into words and find the best match
        const words = text.match(/\b[a-zA-Z]{2,}\b/g);
        if (words && words.length > 0) {
            // For now, return the first valid word
            // In the future, we could improve this with better positioning
            return words[0];
        }

        return null;
    }

    function extractFirstValidWord(text) {
        if (!text) return null;
        const match = text.match(/\b[a-zA-Z]{2,}\b/);
        return match ? match[0] : null;
    }

    function handleClick(e) {
        // Prevent event if clicking on extension UI elements
        if (e.target.closest('.study-helper-tooltip') ||
            e.target.closest('.study-helper-notes-panel')) {
            return;
        }

        // Handle highlighted text clicks (for unhighlighting)
        if (e.target.classList.contains('study-helper-highlight')) {
            e.preventDefault();
            e.stopPropagation();
            removeHighlight(e.target);
            return;
        }
    }

    function highlightSelection(selection) {
        try {
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();

            // Create highlight element
            const highlight = document.createElement('span');
            highlight.className = 'study-helper-highlight';
            highlight.style.backgroundColor = settings.highlightColor;
            highlight.setAttribute('data-highlight-id', generateId());
            highlight.title = 'Click to remove highlight';
            highlight.style.cursor = 'pointer';

            // Wrap the selection
            try {
                range.surroundContents(highlight);
            } catch (error) {
                // If surroundContents fails, try extractContents and appendChild
                const contents = range.extractContents();
                highlight.appendChild(contents);
                range.insertNode(highlight);
            }

            // Save to storage
            saveHighlight({
                id: highlight.getAttribute('data-highlight-id'),
                text: selectedText,
                color: settings.highlightColor,
                timestamp: Date.now(),
                xpath: getXPath(highlight)
            });

            // Clear selection
            selection.removeAllRanges();

            // Show brief confirmation
            showBriefNotification('Text highlighted!');

        } catch (error) {
            console.error('Error highlighting text:', error);
            showBriefNotification('Could not highlight this text', 'error');
        }
    }

    function removeHighlight(highlightElement) {
        const highlightId = highlightElement.getAttribute('data-highlight-id');

        // Remove from storage
        removeHighlightFromStorage(highlightId);

        // Remove from DOM
        const parent = highlightElement.parentNode;
        while (highlightElement.firstChild) {
            parent.insertBefore(highlightElement.firstChild, highlightElement);
        }
        parent.removeChild(highlightElement);

        // Normalize the text nodes
        parent.normalize();

        showBriefNotification('Highlight removed');
    }

    async function showDefinition(word, x, y) {
        console.log('showDefinition called with:', word); // Debug log

        if (!word || word.length < 2) {
            console.log('Invalid word provided:', word);
            return;
        }

        // Sanitize the word
        word = word.trim().toLowerCase().replace(/[^a-zA-Z]/g, '');
        if (!word) {
            console.log('No valid word after sanitization');
            return;
        }

        // Check cache first for performance
        const cacheKey = word.toLowerCase();
        const cachedResult = definitionCache.get(cacheKey);

        if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRY) {
            console.log('Using cached definition for:', word); // Debug log
            showDefinitionTooltip(cachedResult.definition, x, y);
            return;
        }

        // Show loading tooltip
        showLoadingTooltip(x, y);

        try {
            console.log('Requesting definition for:', word); // Debug log

            // Add timeout for the request
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
            });

            const requestPromise = chrome.runtime.sendMessage({
                action: 'getDefinition',
                word: word
            });

            const response = await Promise.race([requestPromise, timeoutPromise]);

            console.log('Definition response:', response); // Debug log
            hideDefinitionTooltip();

            if (response && response.definition && !response.definition.error) {
                // Cache the result
                definitionCache.set(cacheKey, {
                    definition: response.definition,
                    timestamp: Date.now()
                });

                // Limit cache size for performance
                if (definitionCache.size > 100) {
                    const firstKey = definitionCache.keys().next().value;
                    definitionCache.delete(firstKey);
                }

                showDefinitionTooltip(response.definition, x, y);
            } else {
                console.warn('No definition received for:', word);
                showErrorTooltip(`No definition found for "${word}"`, x, y);
            }
        } catch (error) {
            hideDefinitionTooltip();
            console.error('Error getting definition:', error);
            showErrorTooltip('Error loading definition. Please try again.', x, y);
        }
    }

    function showLoadingTooltip(x, y) {
        hideDefinitionTooltip();

        definitionTooltip = document.createElement('div');
        definitionTooltip.className = 'study-helper-tooltip loading-tooltip';
        definitionTooltip.innerHTML = `
            <div style="text-align: center; padding: 15px;">
                <div class="loading-spinner"></div>
                <div style="margin-top: 8px;">Loading definition...</div>
            </div>
        `;

        document.body.appendChild(definitionTooltip);
        positionTooltip(definitionTooltip, x, y);

        setTimeout(() => {
            if (definitionTooltip) {
                definitionTooltip.classList.add('show');
            }
        }, 10);
    }

    function showErrorTooltip(message, x, y) {
        hideDefinitionTooltip();

        definitionTooltip = document.createElement('div');
        definitionTooltip.className = 'study-helper-tooltip error-tooltip';
        definitionTooltip.innerHTML = `
            <button class="tooltip-close">×</button>
            <div style="text-align: center; padding: 15px; color: #d32f2f;">
                <div style="font-size: 18px; margin-bottom: 8px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;

        // Add close button handler
        definitionTooltip.querySelector('.tooltip-close').addEventListener('click', hideDefinitionTooltip);

        document.body.appendChild(definitionTooltip);
        positionTooltip(definitionTooltip, x, y);

        setTimeout(() => {
            if (definitionTooltip) {
                definitionTooltip.classList.add('show');
            }
        }, 10);

        // Auto-hide error tooltip after 3 seconds
        setTimeout(() => {
            if (definitionTooltip && definitionTooltip.classList.contains('error-tooltip')) {
                hideDefinitionTooltip();
            }
        }, 3000);
    }

    function showDefinitionTooltip(definition, x, y) {
        hideDefinitionTooltip();

        definitionTooltip = document.createElement('div');
        definitionTooltip.className = 'study-helper-tooltip definition-tooltip';

        let synonymsText = '';
        if (definition.synonyms && definition.synonyms.length > 0) {
            synonymsText = `<div class="tooltip-synonyms"><strong>Synonyms:</strong> ${definition.synonyms.slice(0, 3).join(', ')}</div>`;
        }

        // Handle error cases
        if (definition.error) {
            definitionTooltip.innerHTML = `
                <button class="tooltip-close">×</button>
                <div class="tooltip-word">${definition.word}</div>
                <div class="tooltip-error">${definition.definition || definition.error}</div>
            `;
        } else {
            definitionTooltip.innerHTML = `
                <button class="tooltip-close">×</button>
                <div class="tooltip-word">${definition.word || 'Unknown'}</div>
                ${definition.phonetic ? `<div class="tooltip-phonetic">${definition.phonetic}</div>` : ''}
                ${definition.partOfSpeech ? `<div class="tooltip-pos">${definition.partOfSpeech}</div>` : ''}
                <div class="tooltip-definition">${definition.definition || 'No definition available'}</div>
                ${definition.example ? `<div class="tooltip-example">"${definition.example}"</div>` : ''}
                ${synonymsText}
                <div class="tooltip-footer">Double-click any word for definition</div>
            `;
        }

        // Add close button handler
        const closeBtn = definitionTooltip.querySelector('.tooltip-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideDefinitionTooltip);
        }

        document.body.appendChild(definitionTooltip);
        positionTooltip(definitionTooltip, x, y);

        // Add click outside to close
        setTimeout(() => {
            if (definitionTooltip) {
                definitionTooltip.classList.add('show');
            }
        }, 10);
    }

    function hideDefinitionTooltip() {
        if (definitionTooltip) {
            definitionTooltip.remove();
            definitionTooltip = null;
        }
    }

    function positionTooltip(tooltip, x, y) {
        // First, position tooltip off-screen to get accurate dimensions
        tooltip.style.position = 'fixed';
        tooltip.style.left = '-9999px';
        tooltip.style.top = '-9999px';
        tooltip.style.visibility = 'hidden';

        // Force a reflow to get accurate measurements
        tooltip.offsetHeight;

        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Convert screen coordinates to page coordinates
        let left = x;
        let top = y + 15; // Small offset below the click point

        console.log('Positioning tooltip:', { x, y, left, top, rect }); // Debug log

        // Adjust horizontal position if tooltip would go off-screen
        if (left + rect.width > viewportWidth - 20) {
            left = viewportWidth - rect.width - 20;
        }

        // Make sure tooltip doesn't go off the left edge
        if (left < 10) {
            left = 10;
        }

        // Adjust vertical position if tooltip would go off-screen
        if (top + rect.height > viewportHeight - 20) {
            top = y - rect.height - 15; // Position above the click point
            tooltip.classList.add('top');
        } else {
            tooltip.classList.remove('top');
        }

        // Make sure tooltip doesn't go off the top edge
        if (top < 10) {
            top = 10;
        }

        // Set final position and make visible
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.visibility = 'visible';

        console.log('Final tooltip position:', { left, top }); // Debug log
    }

    function createNotesPanel() {
        if (notesPanel) return;

        notesPanel = document.createElement('div');
        notesPanel.className = 'study-helper-notes-panel';
        notesPanel.innerHTML = `
      <div class="notes-header">
        <div class="notes-title">
          📝 Notes
        </div>
        <div class="notes-controls">
          <button class="notes-btn" id="minimizeBtn" title="Minimize">−</button>
          <button class="notes-btn" id="closeBtn" title="Close">×</button>
        </div>
      </div>
      <div class="notes-content">
        <div class="notes-input-area">
          <textarea class="notes-textarea" placeholder="Add a note about this page..."></textarea>
          <button class="notes-add-btn">Add Note</button>
        </div>
        <div class="notes-list"></div>
      </div>
    `;

        document.body.appendChild(notesPanel);
        setupNotesPanel();
        loadNotes();
    }

    function setupNotesPanel() {
        const minimizeBtn = notesPanel.querySelector('#minimizeBtn');
        const closeBtn = notesPanel.querySelector('#closeBtn');
        const addBtn = notesPanel.querySelector('.notes-add-btn');
        const textarea = notesPanel.querySelector('.notes-textarea');
        const header = notesPanel.querySelector('.notes-header');

        // Minimize/maximize functionality
        minimizeBtn.addEventListener('click', () => {
            notesPanel.classList.toggle('minimized');
            minimizeBtn.textContent = notesPanel.classList.contains('minimized') ? '+' : '−';
            minimizeBtn.title = notesPanel.classList.contains('minimized') ? 'Maximize' : 'Minimize';
        });

        // Close functionality
        closeBtn.addEventListener('click', () => {
            notesPanel.remove();
            notesPanel = null;
            chrome.storage.sync.set({ notesEnabled: false });
        });

        // Add note functionality
        addBtn.addEventListener('click', addNote);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                addNote();
            }
        });

        // Header click to toggle minimize
        header.addEventListener('click', (e) => {
            if (e.target === header || e.target.classList.contains('notes-title')) {
                minimizeBtn.click();
            }
        });

        // Make panel draggable
        makePanelDraggable();
    }

    function makePanelDraggable() {
        const header = notesPanel.querySelector('.notes-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('notes-btn') || e.target.classList.contains('notes-title')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = notesPanel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            notesPanel.style.left = (startLeft + deltaX) + 'px';
            notesPanel.style.top = (startTop + deltaY) + 'px';
            notesPanel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'pointer';
            }
        });
    }

    function addNote() {
        const textarea = notesPanel.querySelector('.notes-textarea');
        const text = textarea.value.trim();

        if (!text) return;

        const note = {
            id: generateId(),
            text: text,
            timestamp: Date.now(),
            url: window.location.href
        };

        saveNote(note);
        renderNote(note);
        textarea.value = '';

        showBriefNotification('Note added!');
    }

    function renderNote(note) {
        const notesList = notesPanel.querySelector('.notes-list');
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.setAttribute('data-note-id', note.id);

        const timestamp = new Date(note.timestamp).toLocaleDateString();

        noteElement.innerHTML = `
      <div class="note-text">${escapeHtml(note.text)}</div>
      <div class="note-meta">
        <span class="note-timestamp">${timestamp}</span>
        <button class="note-delete" title="Delete note">×</button>
      </div>
    `;

        // Add delete functionality
        noteElement.querySelector('.note-delete').addEventListener('click', () => {
            removeNoteFromStorage(note.id);
            noteElement.remove();
            showBriefNotification('Note deleted');
        });

        notesList.insertBefore(noteElement, notesList.firstChild);
    }

    async function loadNotes() {
        if (!notesPanel) return;

        const url = window.location.hostname;
        const result = await chrome.storage.local.get([`notes_${url}`]);
        const notes = result[`notes_${url}`] || [];

        const notesList = notesPanel.querySelector('.notes-list');
        notesList.innerHTML = '';

        if (notes.length === 0) {
            notesList.innerHTML = '<div class="notes-empty">No notes yet. Add your first note above!</div>';
        } else {
            notes.reverse().forEach(note => renderNote(note));
        }
    }

    async function loadExistingData() {
        const url = window.location.hostname;
        const result = await chrome.storage.local.get([`highlights_${url}`]);
        const highlights = result[`highlights_${url}`] || [];

        // Restore highlights
        highlights.forEach(highlight => {
            try {
                restoreHighlight(highlight);
            } catch (error) {
                console.warn('Could not restore highlight:', error);
            }
        });
    }

    function restoreHighlight(highlightData) {
        const element = getElementByXPath(highlightData.xpath);
        if (!element) return;

        // Find text nodes and highlight the matching text
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        for (let textNode of textNodes) {
            const text = textNode.textContent;
            const index = text.indexOf(highlightData.text);

            if (index !== -1) {
                const range = document.createRange();
                range.setStart(textNode, index);
                range.setEnd(textNode, index + highlightData.text.length);

                const highlight = document.createElement('span');
                highlight.className = 'study-helper-highlight';
                highlight.style.backgroundColor = highlightData.color;
                highlight.setAttribute('data-highlight-id', highlightData.id);
                highlight.title = 'Click to remove highlight';
                highlight.style.cursor = 'pointer';

                try {
                    range.surroundContents(highlight);
                } catch (error) {
                    const contents = range.extractContents();
                    highlight.appendChild(contents);
                    range.insertNode(highlight);
                }

                break;
            }
        }
    }

    // Message handling
    function handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'toggleHighlighting':
                settings.highlightingEnabled = request.enabled;
                break;
            case 'toggleDefinitions':
                settings.definitionsEnabled = request.enabled;
                if (!request.enabled) {
                    hideDefinitionTooltip();
                }
                break;
            case 'toggleNotes':
                settings.notesEnabled = request.enabled;
                if (request.enabled && !notesPanel) {
                    createNotesPanel();
                } else if (!request.enabled && notesPanel) {
                    notesPanel.remove();
                    notesPanel = null;
                }
                break;
            case 'changeHighlightColor':
                settings.highlightColor = request.color;
                break;
            case 'clearAllData':
                clearAllHighlights();
                if (notesPanel) {
                    loadNotes();
                }
                showBriefNotification('All data cleared');
                break;
            case 'highlightText':
                // Handle context menu highlight
                if (request.selectionText) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        highlightSelection(selection);
                    }
                }
                break;
            case 'getDefinition':
                // Handle context menu definition lookup
                if (request.selectionText && /^[a-zA-Z]+$/.test(request.selectionText.trim())) {
                    // Get cursor position for tooltip (approximate center of screen)
                    const x = window.innerWidth / 2;
                    const y = window.innerHeight / 2;
                    showDefinition(request.selectionText.trim(), x, y);
                }
                break;
            case 'addNote':
                if (request.selectionText && notesPanel) {
                    const textarea = notesPanel.querySelector('.notes-textarea');
                    textarea.value = `"${request.selectionText}"\n\n`;
                    textarea.focus();
                } else if (request.selectionText && settings.notesEnabled) {
                    // Create notes panel if it doesn't exist
                    createNotesPanel();
                    setTimeout(() => {
                        const textarea = notesPanel.querySelector('.notes-textarea');
                        textarea.value = `"${request.selectionText}"\n\n`;
                        textarea.focus();
                    }, 100);
                }
                break;
        }
    }

    // Utility functions
    function generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    function getXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }

        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;

            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }

            const tagName = element.tagName.toLowerCase();
            const pathIndex = index ? `[${index + 1}]` : '';
            parts.unshift(`${tagName}${pathIndex}`);

            element = element.parentNode;
        }

        return parts.length ? `/${parts.join('/')}` : null;
    }

    function getElementByXPath(xpath) {
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showBriefNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 10001;
      opacity: 0;
      transition: opacity 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => notification.style.opacity = '1', 10);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    function saveHighlight(highlight) {
        chrome.runtime.sendMessage({
            action: 'saveData',
            type: 'highlights',
            data: highlight
        });
    }

    function saveNote(note) {
        chrome.runtime.sendMessage({
            action: 'saveData',
            type: 'notes',
            data: note
        });
    }

    function removeHighlightFromStorage(id) {
        chrome.runtime.sendMessage({
            action: 'removeData',
            type: 'highlights',
            id: id
        });
    }

    function removeNoteFromStorage(id) {
        chrome.runtime.sendMessage({
            action: 'removeData',
            type: 'notes',
            id: id
        });
    }

    function clearAllHighlights() {
        const highlights = document.querySelectorAll('.study-helper-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            while (highlight.firstChild) {
                parent.insertBefore(highlight.firstChild, highlight);
            }
            parent.removeChild(highlight);
            parent.normalize();
        });
    }

})();
