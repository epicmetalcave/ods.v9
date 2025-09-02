// ODS v9.1 - Theme System
console.log('Theme module loaded');

// Theme configuration
const theme = {
    colors: {
        background: '#000000',
        text: '#00FF00',
        ui: '#00FF00'
    },
    typography: {
        fontFamily: 'Share Tech Mono',
        baseFontSize: 16
    },
    scale: {
        current: 1,
        min: 0.25,
        max: 2.0,
        step: 0.05
    }
};

// Store current scale in memory (will persist to DB in Batch 5)
let currentScale = 1;

/**
 * Initialize theme system
 */
async function initTheme() {
    console.log('Initializing theme...');
    
    try {
        // Try to load saved theme (will connect to DB in Batch 5)
        await loadTheme();
        
        // Apply theme to document
        applyTheme(theme);
        
        // Apply saved scale
        setScale(currentScale);
        
        console.log('Theme initialized successfully');
    } catch (error) {
        console.error('Theme initialization failed:', error);
        // Apply defaults even if load fails
        applyTheme(theme);
        setScale(1);
    }
}

/**
 * Apply theme object to CSS variables
 */
function applyTheme(themeObject) {
    const root = document.documentElement;
    
    // Apply colors
    root.style.setProperty('--color-background', themeObject.colors.background);
    root.style.setProperty('--color-text', themeObject.colors.text);
    root.style.setProperty('--color-ui', themeObject.colors.ui);
    
    // Apply typography
    root.style.setProperty('--font-family', themeObject.typography.fontFamily);
    root.style.setProperty('--font-size-base', `${themeObject.typography.baseFontSize}px`);
    
    console.log('Theme applied to document');
}

/**
 * Set the scale/zoom level
 */
function setScale(value) {
    // Clamp value between min and max
    const clampedValue = Math.max(theme.scale.min, Math.min(theme.scale.max, value));
    
    // Round to nearest step
    const steppedValue = Math.round(clampedValue / theme.scale.step) * theme.scale.step;
    
    // Store current scale
    currentScale = steppedValue;
    theme.scale.current = steppedValue;
    
    // Apply scale to document
    const root = document.documentElement;
    root.style.setProperty('--scale-factor', steppedValue);
    
    // Apply transform for scaling
    root.style.transform = `scale(${steppedValue})`;
    root.style.transformOrigin = 'top left';
    
    // Adjust body dimensions to prevent overflow
    if (steppedValue !== 1) {
        const inverseScale = 1 / steppedValue;
        document.body.style.width = `${100 * inverseScale}%`;
        document.body.style.height = `${100 * inverseScale}%`;
    } else {
        document.body.style.width = '100%';
        document.body.style.height = '100%';
    }
    
    // Update scale display if it exists
    const scaleDisplay = document.getElementById('scale-display');
    if (scaleDisplay) {
        const percentage = Math.round(steppedValue * 100);
        scaleDisplay.textContent = `${percentage}%`;
    }
    
    console.log(`Scale set to ${steppedValue}`);
    return steppedValue;
}

/**
 * Get current scale value
 */
function getScale() {
    return currentScale;
}

/**
 * Increase scale by one step
 */
function scaleUp() {
    const newScale = setScale(currentScale + theme.scale.step);
    saveTheme(); // Will connect to DB in Batch 5
    return newScale;
}

/**
 * Decrease scale by one step
 */
function scaleDown() {
    const newScale = setScale(currentScale - theme.scale.step);
    saveTheme(); // Will connect to DB in Batch 5
    return newScale;
}

/**
 * Save theme to database (stub - will implement in Batch 5)
 */
async function saveTheme() {
    try {
        // Store theme data for saving
        const themeData = {
            id: 'default',
            colors: theme.colors,
            typography: theme.typography,
            scale: {
                ...theme.scale,
                current: currentScale
            },
            timestamp: Date.now()
        };
        
        // TODO: Save to IndexedDB in Batch 5
        console.log('Theme saved (will persist in Batch 5):', themeData);
        
        // For now, save to localStorage as backup
        localStorage.setItem('ods_theme', JSON.stringify(themeData));
        
        return true;
    } catch (error) {
        console.error('Failed to save theme:', error);
        return false;
    }
}

/**
 * Load theme from database (stub - will implement in Batch 5)
 */
async function loadTheme() {
    try {
        // TODO: Load from IndexedDB in Batch 5
        // For now, try localStorage
        const saved = localStorage.getItem('ods_theme');
        
        if (saved) {
            const themeData = JSON.parse(saved);
            
            // Apply saved theme values
            if (themeData.colors) theme.colors = themeData.colors;
            if (themeData.typography) theme.typography = themeData.typography;
            if (themeData.scale) {
                theme.scale = themeData.scale;
                currentScale = themeData.scale.current || 1;
            }
            
            console.log('Theme loaded from storage');
        } else {
            console.log('No saved theme found, using defaults');
        }
        
        return theme;
    } catch (error) {
        console.error('Failed to load theme:', error);
        return theme;
    }
}

/**
 * Reset theme to defaults
 */
function resetTheme() {
    theme.colors = {
        background: '#000000',
        text: '#00FF00',
        ui: '#00FF00'
    };
    theme.typography = {
        fontFamily: 'Share Tech Mono',
        baseFontSize: 16
    };
    currentScale = 1;
    
    applyTheme(theme);
    setScale(1);
    saveTheme();
    
    console.log('Theme reset to defaults');
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initTheme,
        applyTheme,
        setScale,
        getScale,
        scaleUp,
        scaleDown,
        saveTheme,
        loadTheme,
        resetTheme,
        theme
    };
}