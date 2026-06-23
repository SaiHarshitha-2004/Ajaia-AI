import React, { useState, useEffect } from 'react';
import { X, Users, UserCheck } from 'lucide-react';

export default function ShareModal({ 
  isOpen, 
  onClose, 
  document, 
  users, 
  currentUser, 
  onSaveShare 
}) {
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Reset selected users list when document/modal changes
  useEffect(() => {
    if (document && document.sharedWith) {
      setSelectedUsers(document.sharedWith);
    } else {
      setSelectedUsers([]);
    }
  }, [document, isOpen]);

  if (!isOpen || !document) return null;

  // Filter out the owner of the document
  const shareableUsers = users.filter(user => user.id !== document.ownerId);

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSave = () => {
    onSaveShare(document.id, selectedUsers);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} className="toolbar-btn active" style={{ backgroundColor: 'transparent' }} />
            <h3 style={{ margin: 0, fontSize: '18px' }}>Share Document</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Share <strong style={{ color: 'var(--text-main)' }}>"{document.title}"</strong> with other users. Shared users can view and collaborate on edits.
          </p>

          <div className="share-user-list">
            {shareableUsers.map(user => {
              const isSelected = selectedUsers.includes(user.id);
              return (
                <div 
                  key={user.id} 
                  className={`share-user-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleUser(user.id)}
                >
                  <div 
                    className="avatar" 
                    style={{ 
                      backgroundColor: user.avatarColor || '#6366f1', 
                      width: '32px', 
                      height: '32px',
                      fontSize: '13px'
                    }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{user.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.id}@ajaia.ai</div>
                  </div>
                  <div className="share-checkbox">
                    {isSelected && <UserCheck size={12} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px' }}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} style={{ padding: '8px 16px' }}>
            Save Share Settings
          </button>
        </div>
      </div>
    </div>
  );
}
