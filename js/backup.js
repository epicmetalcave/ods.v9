// ODS v9.1 - Backup Module
console.log('Backup module loaded');

// Backup configuration
const BACKUP_VERSION = '9.1';
const BACKUP_MAGIC = 'ODS_BACKUP_v9';

/**
 * Export all data to JSON file
 */
async function exportData() {
    try {
        console.log('Starting data export...');
        
        // Gather all data from database
        const themes = await getAllItems('themes');
        const operations = await getAllItems('operations');
        const workspaces = await getAllItems('workspaces');
        
        // Get current timestamp
        const timestamp = Date.now();
        const date = new Date(timestamp);
        
        // Create backup object
        const backup = {
            magic: BACKUP_MAGIC,
            version: BACKUP_VERSION,
            timestamp: timestamp,
            date: date.toISOString(),
            data: {
                themes: themes,
                operations: operations,
                workspaces: workspaces
            },
            metadata: {
                themesCount: themes.length,
                operationsCount: operations.length,
                workspacesCount: workspaces.length,
                exportedBy: 'ODS v9.1',
                userAgent: navigator.userAgent
            }
        };
        
        // Convert to JSON
        const jsonString = JSON.stringify(backup, null, 2);
        
        // Create filename with timestamp
        const dateString = date.toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `ods-backup-${dateString}.json`;
        
        // Trigger download
        downloadJSON(jsonString, filename);
        
        // Store backup record in database
        await addItem('backups', {
            timestamp: timestamp,
            version: BACKUP_VERSION,
            filename: filename,
            size: jsonString.length,
            counts: {
                themes: themes.length,
                operations: operations.length,
                workspaces: workspaces.length
            }
        });
        
        console.log(`Export successful: ${filename}`);
        return { success: true, filename: filename };
        
    } catch (error) {
        console.error('Export failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Import data from JSON file
 */
async function importData(file) {
    try {
        console.log('Starting data import...');
        
        // Read file content
        const text = await readFileAsText(file);
        
        // Parse JSON
        const backup = JSON.parse(text);
        
        // Validate backup file
        const validation = validateBackup(backup);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        // Check version compatibility
        if (!isCompatibleVersion(backup.version)) {
            const proceed = confirm(
                `This backup was created with version ${backup.version}. ` +
                `Current version is ${BACKUP_VERSION}. ` +
                `Import may not work correctly. Continue anyway?`
            );
            if (!proceed) {
                throw new Error('Import cancelled by user');
            }
        }
        
        // Show import preview
        const confirmImport = confirm(
            `Import backup from ${new Date(backup.timestamp).toLocaleString()}?\n\n` +
            `This backup contains:\n` +
            `- ${backup.metadata.themesCount} themes\n` +
            `- ${backup.metadata.operationsCount} operations\n` +
            `- ${backup.metadata.workspacesCount} workspaces\n\n` +
            `WARNING: This will replace all existing data!`
        );
        
        if (!confirmImport) {
            throw new Error('Import cancelled by user');
        }
        
        // Create pre-import backup
        console.log('Creating pre-import backup...');
        const preImportBackup = await exportData();
        console.log('Pre-import backup created:', preImportBackup.filename);
        
        // Clear existing data
        console.log('Clearing existing data...');
        await clearStore('themes');
        await clearStore('operations');
        await clearStore('workspaces');
        
        // Import data
        console.log('Importing data...');
        let imported = {
            themes: 0,
            operations: 0,
            workspaces: 0
        };
        
        // Import themes
        if (backup.data.themes && backup.data.themes.length > 0) {
            for (const theme of backup.data.themes) {
                await addItem('themes', theme);
                imported.themes++;
            }
        }
        
        // Import operations
        if (backup.data.operations && backup.data.operations.length > 0) {
            for (const operation of backup.data.operations) {
                // Remove auto-increment ID if present
                const { id, ...operationData } = operation;
                await addItem('operations', operationData);
                imported.operations++;
            }
        }
        
        // Import workspaces
        if (backup.data.workspaces && backup.data.workspaces.length > 0) {
            for (const workspace of backup.data.workspaces) {
                // Remove auto-increment ID if present
                const { id, ...workspaceData } = workspace;
                await addItem('workspaces', workspaceData);
                imported.workspaces++;
            }
        }
        
        // Record import in backups store
        await addItem('backups', {
            timestamp: Date.now(),
            version: backup.version,
            type: 'import',
            filename: file.name,
            imported: imported,
            originalTimestamp: backup.timestamp
        });
        
        console.log('Import successful:', imported);
        
        // Reload theme to apply imported settings
        await loadTheme();
        applyTheme(theme);
        if (typeof currentScale !== 'undefined') {
            setScale(currentScale);
        }
        
        return { 
            success: true, 
            imported: imported,
            message: `Successfully imported ${imported.themes} themes, ${imported.operations} operations, ${imported.workspaces} workspaces`
        };
        
    } catch (error) {
        console.error('Import failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Read file as text
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        
        reader.onerror = (error) => {
            reject(new Error('Failed to read file: ' + error));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Download JSON as file
 */
function downloadJSON(jsonString, filename) {
    // Create blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Validate backup file structure
 */
function validateBackup(backup) {
    // Check magic string
    if (!backup.magic || backup.magic !== BACKUP_MAGIC) {
        return { valid: false, error: 'Invalid backup file format' };
    }
    
    // Check required fields
    if (!backup.version) {
        return { valid: false, error: 'Missing version information' };
    }
    
    if (!backup.timestamp) {
        return { valid: false, error: 'Missing timestamp' };
    }
    
    if (!backup.data) {
        return { valid: false, error: 'Missing data section' };
    }
    
    // Check data structure
    if (typeof backup.data !== 'object') {
        return { valid: false, error: 'Invalid data structure' };
    }
    
    return { valid: true };
}

/**
 * Check version compatibility
 */
function isCompatibleVersion(version) {
    if (!version) return false;
    
    // Parse versions
    const current = BACKUP_VERSION.split('.');
    const backup = version.split('.');
    
    // Check major version compatibility
    if (current[0] !== backup[0]) {
        return false; // Major version mismatch
    }
    
    // Minor version differences are acceptable
    return true;
}

/**
 * Get backup history
 */
async function getBackupHistory() {
    try {
        const backups = await getAllItems('backups');
        
        // Sort by timestamp descending
        backups.sort((a, b) => b.timestamp - a.timestamp);
        
        return backups;
    } catch (error) {
        console.error('Failed to get backup history:', error);
        return [];
    }
}

/**
 * Clear backup history
 */
async function clearBackupHistory() {
    try {
        await clearStore('backups');
        console.log('Backup history cleared');
        return true;
    } catch (error) {
        console.error('Failed to clear backup history:', error);
        return false;
    }
}

/**
 * Auto-backup (for future implementation)
 */
async function autoBackup() {
    try {
        const result = await exportData();
        if (result.success) {
            console.log('Auto-backup completed:', result.filename);
        }
        return result;
    } catch (error) {
        console.error('Auto-backup failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Setup export/import UI handlers
 */
function setupBackupHandlers() {
    // Export button handler
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const result = await exportData();
            if (result.success) {
                console.log('Export completed:', result.filename);
                // Could show success message to user
            } else {
                console.error('Export failed:', result.error);
                alert('Export failed: ' + result.error);
            }
        });
    }
    
    // Import input handler
    const importInput = document.getElementById('import-input');
    if (importInput) {
        importInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const result = await importData(file);
                if (result.success) {
                    alert(result.message + '\n\nPage will reload to apply changes.');
                    location.reload();
                } else {
                    alert('Import failed: ' + result.error);
                }
                // Clear input for next use
                event.target.value = '';
            }
        });
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportData,
        importData,
        getBackupHistory,
        clearBackupHistory,
        autoBackup,
        setupBackupHandlers,
        BACKUP_VERSION
    };
}