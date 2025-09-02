// ODS v9.1 - Database Module
console.log('Database module loaded');

// Database configuration
const DB_NAME = 'ODS_v9';
const DB_VERSION = 1;

// Store definitions
const STORES = {
    themes: { 
        name: 'themes',
        keyPath: 'id', 
        autoIncrement: false,
        indexes: [
            { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
    },
    operations: { 
        name: 'operations',
        keyPath: 'id', 
        autoIncrement: true,
        indexes: [
            { name: 'type', keyPath: 'type', unique: false },
            { name: 'created', keyPath: 'created', unique: false },
            { name: 'modified', keyPath: 'modified', unique: false }
        ]
    },
    workspaces: { 
        name: 'workspaces',
        keyPath: 'id', 
        autoIncrement: true,
        indexes: [
            { name: 'name', keyPath: 'name', unique: false },
            { name: 'created', keyPath: 'created', unique: false }
        ]
    },
    backups: { 
        name: 'backups',
        keyPath: 'timestamp', 
        autoIncrement: false,
        indexes: [
            { name: 'version', keyPath: 'version', unique: false }
        ]
    }
};

// Database instance
let db = null;

/**
 * Initialize the database
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        console.log('Initializing database...');
        
        // Check for IndexedDB support
        if (!window.indexedDB) {
            reject(new Error('IndexedDB is not supported in this browser'));
            return;
        }
        
        // Open database
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        // Handle database upgrade
        request.onupgradeneeded = (event) => {
            console.log('Database upgrade needed');
            const database = event.target.result;
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion;
            
            console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
            
            // Create stores if they don't exist
            Object.values(STORES).forEach(storeConfig => {
                if (!database.objectStoreNames.contains(storeConfig.name)) {
                    console.log(`Creating store: ${storeConfig.name}`);
                    
                    // Create object store
                    const store = database.createObjectStore(storeConfig.name, {
                        keyPath: storeConfig.keyPath,
                        autoIncrement: storeConfig.autoIncrement
                    });
                    
                    // Create indexes
                    if (storeConfig.indexes) {
                        storeConfig.indexes.forEach(index => {
                            store.createIndex(index.name, index.keyPath, { unique: index.unique });
                            console.log(`Created index: ${index.name} on ${storeConfig.name}`);
                        });
                    }
                }
            });
        };
        
        // Handle success
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database initialized successfully');
            
            // Log available stores
            const storeNames = Array.from(db.objectStoreNames);
            console.log('Available stores:', storeNames);
            
            resolve(db);
        };
        
        // Handle errors
        request.onerror = (event) => {
            console.error('Database initialization failed:', event.target.error);
            reject(event.target.error);
        };
        
        // Handle blocked
        request.onblocked = () => {
            console.warn('Database blocked - please close other tabs');
            reject(new Error('Database blocked by another connection'));
        };
    });
}

/**
 * Get database instance
 */
async function getDB() {
    if (!db) {
        await initDB();
    }
    return db;
}

/**
 * Add item to store
 */
async function addItem(storeName, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await getDB();
            const transaction = database.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Add timestamp if not present
            if (!data.timestamp) {
                data.timestamp = Date.now();
            }
            
            const request = store.add(data);
            
            request.onsuccess = () => {
                console.log(`Item added to ${storeName}:`, data);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error(`Failed to add item to ${storeName}:`, request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error('Add item error:', error);
            reject(error);
        }
    });
}

/**
 * Get item from store
 */
async function getItem(storeName, id) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await getDB();
            const transaction = database.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => {
                if (request.result) {
                    console.log(`Item retrieved from ${storeName}:`, request.result);
                } else {
                    console.log(`No item found in ${storeName} with id:`, id);
                }
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error(`Failed to get item from ${storeName}:`, request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error('Get item error:', error);
            reject(error);
        }
    });
}

/**
 * Get all items from store
 */
async function getAllItems(storeName) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await getDB();
            const transaction = database.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                console.log(`Retrieved ${request.result.length} items from ${storeName}`);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error(`Failed to get all items from ${storeName}:`, request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error('Get all items error:', error);
            reject(error);
        }
    });
}

/**
 * Update item in store
 */
async function updateItem(storeName, id, data) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await getDB();
            const transaction = database.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Get existing item first
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                if (!getRequest.result) {
                    reject(new Error(`Item with id ${id} not found in ${storeName}`));
                    return;
                }
                
                // Merge with existing data
                const updatedData = {
                    ...getRequest.result,
                    ...data,
                    modified: Date.now()
                };
                
                // Ensure id is preserved
                if (store.keyPath && updatedData[store.keyPath] !== id) {
                    updatedData[store.keyPath] = id;
                }
                
                const putRequest = store.put(updatedData);
                
                putRequest.onsuccess = () => {
                    console.log(`Item updated in ${storeName}:`, updatedData);
                    resolve(updatedData);
                };
                
                putRequest.onerror = () => {
                    console.error(`Failed to update item in ${storeName}:`, putRequest.error);
                    reject(putRequest.error);
                };
            };
            
            getRequest.onerror = () => {
                console.error(`Failed to get item for update from ${storeName}:`, getRequest.error);
                reject(getRequest.error);
            };
        } catch (error) {
            console.error('Update item error:', error);
            reject(error);
        }
    });
}

/**
 * Delete item from store
 */
async function deleteItem(storeName, id) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await getDB();
            const transaction = database.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log(`Item deleted from ${storeName} with id:`, id);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error(`Failed to delete item from ${storeName}:`, request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error('Delete item error:', error);
            reject(error);
        }
    });
}

/**
 * Clear all items from store
 */
async function clearStore(storeName) {
    return new Promise(async (resolve, reject) => {
        try {
            const database = await getDB();
            const transaction = database.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log(`Store ${storeName} cleared`);
                resolve(true);
            };
            
            request.onerror = () => {
                console.error(`Failed to clear store ${storeName}:`, request.error);
                reject(request.error);
            };
        } catch (error) {
            console.error('Clear store error:', error);
            reject(error);
        }
    });
}

/**
 * Delete the entire database
 */
async function deleteDB() {
    return new Promise((resolve, reject) => {
        // Close existing connection
        if (db) {
            db.close();
            db = null;
        }
        
        const request = indexedDB.deleteDatabase(DB_NAME);
        
        request.onsuccess = () => {
            console.log('Database deleted successfully');
            resolve(true);
        };
        
        request.onerror = () => {
            console.error('Failed to delete database:', request.error);
            reject(request.error);
        };
        
        request.onblocked = () => {
            console.warn('Database deletion blocked - close all connections');
            reject(new Error('Database deletion blocked'));
        };
    });
}

/**
 * Get database size (approximate)
 */
async function getDBSize() {
    try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const size = estimate.usage || 0;
            const quota = estimate.quota || 0;
            
            return {
                usage: size,
                quota: quota,
                usageInMB: (size / 1024 / 1024).toFixed(2),
                quotaInMB: (quota / 1024 / 1024).toFixed(2),
                percentUsed: quota > 0 ? ((size / quota) * 100).toFixed(2) : 0
            };
        } else {
            console.warn('Storage estimation not supported');
            return null;
        }
    } catch (error) {
        console.error('Failed to get database size:', error);
        return null;
    }
}

/**
 * Check if database exists
 */
async function databaseExists() {
    try {
        const databases = await indexedDB.databases();
        return databases.some(db => db.name === DB_NAME);
    } catch (error) {
        // Fallback for browsers that don't support databases()
        try {
            const testOpen = indexedDB.open(DB_NAME);
            return new Promise((resolve) => {
                testOpen.onsuccess = () => {
                    testOpen.result.close();
                    resolve(true);
                };
                testOpen.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDB,
        getDB,
        addItem,
        getItem,
        getAllItems,
        updateItem,
        deleteItem,
        clearStore,
        deleteDB,
        getDBSize,
        databaseExists,
        DB_NAME,
        DB_VERSION,
        STORES
    };
}