// ODS v9.1 - Main Application Entry
console.log('ODS v9.1 Initializing...');

/**
 * Set up scale control buttons
 */
function setupScaleControls() {
    const scaleDownBtn = document.getElementById('scale-down');
    const scaleUpBtn = document.getElementById('scale-up');
    
    if (!scaleDownBtn || !scaleUpBtn) {
        console.warn('Scale controls not found in DOM');
        return;
    }
    
    /**
     * Handle scale down button
     */
    scaleDownBtn.addEventListener('click', () => {
        console.log('Scale down clicked');
        scaleDown();
    });
    
    /**
     * Handle scale up button
     */
    scaleUpBtn.addEventListener('click', () => {
        console.log('Scale up clicked');
        scaleUp();
    });
    
    /**
     * Handle keyboard shortcuts
     */
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Plus to scale up
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            scaleUp();
        }
        // Ctrl/Cmd + Minus to scale down
        else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            scaleDown();
        }
        // Ctrl/Cmd + 0 to reset scale
        else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            setScale(1);
            saveTheme();
        }
    });
    
    console.log('Scale controls initialized');
}

/**
 * Main application initialization
 */
async function initApp() {
    try {
        console.log('Application starting...');
        
        // Initialize theme system
        await initTheme();
        
        // Set up scale controls
        setupScaleControls();
        
        // Database will be initialized in Batch 4
        // Backup system will be initialized in Batch 6
        
        console.log('ODS v9.1 Ready');
        
        // Add ready indicator to body
        document.body.classList.add('app-ready');
        
    } catch (error) {
        console.error('Initialization failed:', error);
        // Show user-friendly error
        document.body.innerHTML += `
            <div style="color: red; padding: 20px; border: 1px solid red; margin: 20px;">
                Initialization Error: ${error.message}
            </div>
        `;
    }
}

/**
 * Handle visibility change (tab switching)
 */
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('App regained focus');
        // Could reload theme here if needed
    }
});

/**
 * Handle before unload
 */
window.addEventListener('beforeunload', () => {
    // Save any pending changes
    saveTheme();
});

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}