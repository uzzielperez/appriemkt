// Local Storage Module for Apprie Medical Assistant
// This module handles storing user data locally without sending to servers

const ApprieLocalStorage = {
  // Initialize storage
  init: function() {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      console.error("Your browser doesn't support IndexedDB. Some features may not work.");
      return false;
    }
    
    // Create/open the database
    const request = indexedDB.open("apprieDB", 1);
    
    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores (tables)
      if (!db.objectStoreNames.contains("chatHistory")) {
        const chatStore = db.createObjectStore("chatHistory", { keyPath: "id", autoIncrement: true });
        chatStore.createIndex("timestamp", "timestamp", { unique: false });
      }
      
      if (!db.objectStoreNames.contains("medicalData")) {
        const medicalStore = db.createObjectStore("medicalData", { keyPath: "id", autoIncrement: true });
        medicalStore.createIndex("type", "type", { unique: false });
      }
      
      if (!db.objectStoreNames.contains("userSettings")) {
        db.createObjectStore("userSettings", { keyPath: "id" });
      }
    };
    
    return true;
  },
  
  // Save chat message
  saveMessage: function(message) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["chatHistory"], "readwrite");
        const store = transaction.objectStore("chatHistory");
        
        // Format the message object
        const messageObj = {
          content: message.content,
          isUser: message.isUser,
          timestamp: new Date().getTime(),
          task: message.task || 'clinical'
        };
        
        const addRequest = store.add(messageObj);
        
        addRequest.onsuccess = () => {
          resolve(true);
        };
        
        addRequest.onerror = (error) => {
          reject(error);
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Get chat history
  getChatHistory: function(task = null) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["chatHistory"], "readonly");
        const store = transaction.objectStore("chatHistory");
        const index = store.index("timestamp");
        
        const messages = [];
        
        index.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // Filter by task if specified
            if (!task || cursor.value.task === task) {
              messages.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(messages);
          }
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Save medical data
  saveMedicalData: function(data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["medicalData"], "readwrite");
        const store = transaction.objectStore("medicalData");
        
        // Add timestamp to data
        data.timestamp = new Date().getTime();
        
        const addRequest = store.add(data);
        
        addRequest.onsuccess = () => {
          resolve(true);
        };
        
        addRequest.onerror = (error) => {
          reject(error);
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Get medical data by type
  getMedicalData: function(type = null) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["medicalData"], "readonly");
        const store = transaction.objectStore("medicalData");
        
        if (type) {
          const index = store.index("type");
          const request = index.getAll(type);
          
          request.onsuccess = () => {
            resolve(request.result);
          };
        } else {
          const request = store.getAll();
          
          request.onsuccess = () => {
            resolve(request.result);
          };
        }
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Save user settings
  saveSettings: function(settings) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["userSettings"], "readwrite");
        const store = transaction.objectStore("userSettings");
        
        // Use a fixed ID for settings
        settings.id = "userSettings";
        
        const putRequest = store.put(settings);
        
        putRequest.onsuccess = () => {
          resolve(true);
        };
        
        putRequest.onerror = (error) => {
          reject(error);
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Get user settings
  getSettings: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["userSettings"], "readonly");
        const store = transaction.objectStore("userSettings");
        
        const getRequest = store.get("userSettings");
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result || {});
        };
        
        getRequest.onerror = (error) => {
          reject(error);
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Export all user data as a JSON file
  exportData: function() {
    return new Promise(async (resolve, reject) => {
      try {
        const chatHistory = await this.getChatHistory();
        const medicalData = await this.getMedicalData();
        const settings = await this.getSettings();
        
        const exportData = {
          chatHistory,
          medicalData,
          settings,
          exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = 'apprie-data-export-' + new Date().toISOString().split('T')[0] + '.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Import data from a JSON file
  importData: function(jsonData) {
    return new Promise(async (resolve, reject) => {
      try {
        const data = JSON.parse(jsonData);
        
        // Import chat history
        if (data.chatHistory && Array.isArray(data.chatHistory)) {
          for (const message of data.chatHistory) {
            await this.saveMessage(message);
          }
        }
        
        // Import medical data
        if (data.medicalData && Array.isArray(data.medicalData)) {
          for (const item of data.medicalData) {
            await this.saveMedicalData(item);
          }
        }
        
        // Import settings
        if (data.settings) {
          await this.saveSettings(data.settings);
        }
        
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Clear all data (for privacy)
  clearAllData: function() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("apprieDB", 1);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        // Get all object store names
        const storeNames = Array.from(db.objectStoreNames);
        
        // Create transaction for all stores
        const transaction = db.transaction(storeNames, "readwrite");
        
        let completedStores = 0;
        
        // Clear each store
        storeNames.forEach(storeName => {
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();
          
          clearRequest.onsuccess = () => {
            completedStores++;
            if (completedStores === storeNames.length) {
              resolve(true);
            }
          };
          
          clearRequest.onerror = (error) => {
            reject(error);
          };
        });
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Export module
window.ApprieLocalStorage = ApprieLocalStorage; 