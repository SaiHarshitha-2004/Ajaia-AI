import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import ShareModal from './components/ShareModal';
import { AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  // Application State
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Design Themes
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ajaia-theme') || 'light';
  });

  // UI Toast Notifications
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }
  const toastTimeoutRef = useRef(null);

  // Debouncing Updates
  const saveTimeoutRef = useRef(null);

  // Show status toasts
  const triggerToast = (type, message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 1. Initial Load: Fetch seeded users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/users`);
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        setUsers(data);

        // Load previously selected user, or default to first user (Alice)
        const savedUserId = localStorage.getItem('ajaia-user');
        const activeUser = data.find(u => u.id === savedUserId) || data[0];
        setCurrentUser(activeUser);
      } catch (err) {
        triggerToast('error', 'Failed to connect to the backend server. Make sure it is running!');
      }
    };
    fetchUsers();
  }, []);

  // 2. Fetch documents when current user changes
  useEffect(() => {
    if (!currentUser) return;

    const fetchDocuments = async () => {
      try {
        const res = await fetch(`${API_BASE}/documents`, {
          headers: { 'X-User-ID': currentUser.id }
        });
        if (!res.ok) throw new Error('Failed to load documents');
        const docs = await res.json();
        setDocuments(docs);

        // Re-evaluate active document (must exist in the user's visible list)
        if (activeDoc) {
          const stillVisible = docs.find(d => d.id === activeDoc.id);
          if (stillVisible) {
            // Re-fetch to get latest shared list or edits
            const docRes = await fetch(`${API_BASE}/documents/${activeDoc.id}`, {
              headers: { 'X-User-ID': currentUser.id }
            });
            if (docRes.ok) {
              const latestDoc = await docRes.json();
              setActiveDoc(latestDoc);
            }
          } else {
            setActiveDoc(null);
          }
        } else if (docs.length > 0 && !activeDoc) {
          // Default to first document on initial user loading
          setActiveDoc(docs[0]);
        }
      } catch (err) {
        triggerToast('error', 'Error syncing documents.');
      }
    };

    fetchDocuments();
    localStorage.setItem('ajaia-user', currentUser.id);
  }, [currentUser]);

  // Apply visual theme to document body
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
    localStorage.setItem('ajaia-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleUserChange = (userId) => {
    const nextUser = users.find(u => u.id === userId);
    if (nextUser) {
      setCurrentUser(nextUser);
      triggerToast('success', `Switched workspace profile to ${nextUser.name}`);
    }
  };

  const selectDocument = async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        headers: { 'X-User-ID': currentUser.id }
      });
      if (!res.ok) throw new Error('Unauthorized or Document not found');
      const data = await res.json();
      setActiveDoc(data);
    } catch (err) {
      triggerToast('error', err.message);
    }
  };

  // 3. Create Document
  const handleCreateDocument = async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id
        },
        body: JSON.stringify({ title: 'Untitled Document', content: '<p><br></p>' })
      });
      if (!res.ok) throw new Error('Failed to create document');
      const newDoc = await res.json();
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      triggerToast('success', 'Document created!');
    } catch (err) {
      triggerToast('error', err.message);
    }
  };

  // 4. Update Document Title and Content with Debouncing
  const handleUpdateDocument = (docId, updates) => {
    // 1. Immediately update active document in UI for snappiness
    setActiveDoc(prev => prev && prev.id === docId ? { ...prev, ...updates } : prev);
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d));
    
    // 2. Set save loading status
    setIsSaving(true);

    // 3. Debounce actual network write by 800ms
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/documents/${docId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': currentUser.id
          },
          body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Auto-save failed');
      } catch (err) {
        triggerToast('error', 'Connection lost. Edits might not be saved.');
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  // 5. Share Document
  const handleSaveShare = async (docId, sharedWith) => {
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': currentUser.id
        },
        body: JSON.stringify({ sharedWith })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to share document');
      }
      
      const updatedDoc = await res.json();
      setActiveDoc(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === docId ? updatedDoc : d));
      setIsShareModalOpen(false);
      triggerToast('success', 'Sharing configurations updated.');
    } catch (err) {
      triggerToast('error', err.message);
    }
  };

  // 6. Delete Document
  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action is irreversible.')) return;
    
    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': currentUser.id }
      });
      if (!res.ok) throw new Error('Only the document owner can delete this document');
      
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setActiveDoc(prev => prev?.id === docId ? null : prev);
      triggerToast('success', 'Document deleted.');
    } catch (err) {
      triggerToast('error', err.message);
    }
  };

  // 7. File Upload: Create new document
  const handleImportDocument = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/documents/import`, {
        method: 'POST',
        headers: { 'X-User-ID': currentUser.id },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Import failed');
      }

      const newDoc = await res.json();
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      triggerToast('success', `Imported "${file.name}" as new document!`);
    } catch (err) {
      triggerToast('error', err.message);
    }
  };

  // 8. File Upload: Append content to active document
  const handleImportIntoDocument = async (docId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentId', docId);

    try {
      const res = await fetch(`${API_BASE}/documents/import`, {
        method: 'POST',
        headers: { 'X-User-ID': currentUser.id },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Import append failed');
      }

      const updatedDoc = await res.json();
      setActiveDoc(updatedDoc);
      setDocuments(prev => prev.map(d => d.id === docId ? updatedDoc : d));
      triggerToast('success', `Appended "${file.name}" contents to document.`);
    } catch (err) {
      triggerToast('error', err.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="empty-state">
        <h2 className="empty-state-title">Loading Workspace...</h2>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        users={users}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        documents={documents}
        activeDoc={activeDoc}
        onSelectDoc={selectDocument}
        onCreateDoc={handleCreateDocument}
        onImportDoc={handleImportDocument}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Editor Main Canvas */}
      <Editor 
        document={activeDoc}
        currentUser={currentUser}
        onUpdateDoc={handleUpdateDocument}
        onDeleteDoc={handleDeleteDocument}
        onShareClick={() => setIsShareModalOpen(true)}
        onImportIntoDoc={handleImportIntoDocument}
        isSaving={isSaving}
      />

      {/* Sharing Dialog */}
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={activeDoc}
        users={users}
        currentUser={currentUser}
        onSaveShare={handleSaveShare}
      />

      {/* Status Toast Popup Banner */}
      {toast && (
        <div className={`notification-toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle size={18} style={{ color: 'var(--accent-color)' }} />
          ) : (
            <AlertCircle size={18} style={{ color: '#ef4444' }} />
          )}
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
