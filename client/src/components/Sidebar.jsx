import React, { useRef } from 'react';
import { Plus, Upload, FileText, Share2, Sun, Moon, LogIn } from 'lucide-react';

export default function Sidebar({ 
  users, 
  currentUser, 
  onUserChange, 
  documents, 
  activeDoc, 
  onSelectDoc, 
  onCreateDoc, 
  onImportDoc, 
  theme, 
  toggleTheme 
}) {
  const fileInputRef = useRef(null);

  const myDocs = documents.filter(doc => doc.ownerId === currentUser.id);
  const sharedDocs = documents.filter(doc => doc.ownerId !== currentUser.id);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImportDoc(file);
      e.target.value = null; // Reset input
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <aside className="sidebar">
      {/* Profile Section & Switcher */}
      <div className="profile-section">
        <div 
          className="avatar" 
          style={{ backgroundColor: currentUser.avatarColor || '#6366f1' }}
        >
          {currentUser.name.charAt(0)}
        </div>
        <div className="profile-details">
          <div className="profile-name">{currentUser.name}</div>
          <div className="profile-role">Active Mock User</div>
          <select 
            className="user-selector" 
            value={currentUser.id} 
            onChange={(e) => onUserChange(e.target.value)}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                Switch to {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Actions */}
      <div className="sidebar-actions">
        <button className="btn-primary" onClick={onCreateDoc}>
          <Plus size={18} />
          New Document
        </button>
        <button className="btn-secondary" onClick={triggerFileSelect}>
          <Upload size={18} />
          Import .txt / .md
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".txt,.md" 
          onChange={handleFileChange} 
        />
      </div>

      {/* Document Lists */}
      <div className="document-list-container">
        {/* My Documents */}
        <div className="list-section-title">My Documents ({myDocs.length})</div>
        {myDocs.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            No documents owned.
          </div>
        ) : (
          myDocs.map(doc => (
            <div 
              key={doc.id} 
              className={`document-item ${activeDoc?.id === doc.id ? 'active' : ''}`}
              onClick={() => onSelectDoc(doc.id)}
            >
              <FileText size={16} />
              <span className="document-item-title">{doc.title}</span>
              {doc.sharedWith && doc.sharedWith.length > 0 && (
                <span className="document-tag shared" title={`Shared with ${doc.sharedWith.join(', ')}`}>
                  Shared
                </span>
              )}
            </div>
          ))
        )}

        {/* Shared With Me */}
        <div className="list-section-title">Shared With Me ({sharedDocs.length})</div>
        {sharedDocs.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            None shared with you.
          </div>
        ) : (
          sharedDocs.map(doc => {
            const owner = users.find(u => u.id === doc.ownerId);
            return (
              <div 
                key={doc.id} 
                className={`document-item ${activeDoc?.id === doc.id ? 'active' : ''}`}
                onClick={() => onSelectDoc(doc.id)}
              >
                <Share2 size={16} />
                <span className="document-item-title">{doc.title}</span>
                <span className="document-tag owned" title={`Owned by ${owner?.name || doc.ownerId}`}>
                  By {owner?.name.split(' ')[0] || doc.ownerId}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
          Ajaia Docs v1.0
        </span>
        <button 
          className="theme-toggle" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </aside>
  );
}
