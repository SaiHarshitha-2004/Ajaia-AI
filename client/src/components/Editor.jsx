import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Heading1, Heading2, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Share2, Trash2, CheckCircle, RefreshCw, Upload, Sparkles 
} from 'lucide-react';

export default function Editor({ 
  document: doc, 
  currentUser, 
  onUpdateDoc, 
  onDeleteDoc, 
  onShareClick, 
  onImportIntoDoc,
  isSaving 
}) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [editorStates, setEditorStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false
  });

  // Track if we need to sync editor content (only on load, not during user typing to prevent cursor jump)
  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      if (editorRef.current && editorRef.current.innerHTML !== doc.content) {
        editorRef.current.innerHTML = doc.content;
      }
    }
  }, [doc?.id]); // Re-sync only when document changes

  if (!doc) {
    return (
      <div className="empty-state">
        <Sparkles size={64} className="empty-state-icon" />
        <h2 className="empty-state-title">No Document Selected</h2>
        <p style={{ maxWidth: '400px' }}>
          Create a new document, import a file, or select an existing draft from the sidebar to start writing.
        </p>
      </div>
    );
  }

  const isOwner = doc.ownerId === currentUser.id;

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onUpdateDoc(doc.id, { title: newTitle, content: editorRef.current.innerHTML });
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      onUpdateDoc(doc.id, { title, content: editorRef.current.innerHTML });
    }
  };

  const executeCommand = (command, value = null) => {
    editorRef.current?.focus();
    // Using standard execCommand
    window.document.execCommand(command, false, value);
    updateCommandStates();
    handleEditorInput();
  };

  const updateCommandStates = () => {
    setEditorStates({
      bold: window.document.queryCommandState('bold'),
      italic: window.document.queryCommandState('italic'),
      underline: window.document.queryCommandState('underline'),
      ul: window.document.queryCommandState('insertUnorderedList'),
      ol: window.document.queryCommandState('insertOrderedList')
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImportIntoDoc(doc.id, file);
      e.target.value = null; // Reset input
    }
  };

  return (
    <main className="main-workspace">
      {/* Workspace Header */}
      <header className="workspace-header">
        <div className="title-container">
          <input 
            type="text" 
            className="title-input" 
            value={title} 
            onChange={handleTitleChange} 
            placeholder="Untitled Document"
          />
          <div className="save-badge">
            {isSaving ? (
              <>
                <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle size={14} style={{ color: 'var(--accent-color)' }} />
                <span>Saved</span>
              </>
            )}
          </div>
        </div>

        <div className="workspace-actions">
          {/* File Append Action */}
          <button 
            className="btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            title="Import content from a file and append it here"
            style={{ padding: '8px 12px', fontSize: '13px' }}
          >
            <Upload size={14} />
            Append File
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".txt,.md" 
            onChange={handleFileChange} 
          />

          {/* Share Action */}
          {isOwner ? (
            <button 
              className="btn-secondary" 
              onClick={onShareClick}
              style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
            >
              <Share2 size={14} />
              Share
            </button>
          ) : (
            <span className="document-tag owned" style={{ fontSize: '12px', padding: '6px 10px' }}>
              Shared View
            </span>
          )}

          {/* Delete Action (Owner only) */}
          {isOwner && (
            <button 
              className="btn-secondary" 
              onClick={() => onDeleteDoc(doc.id)}
              title="Delete document"
              style={{ padding: '8px', color: '#ef4444', borderColor: '#fee2e2' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Editor Toolbar */}
      <section className="toolbar">
        {/* Paragraph Formats */}
        <button 
          className="toolbar-btn" 
          onClick={() => executeCommand('formatBlock', '<p>')}
          title="Normal Text"
        >
          Normal
        </button>
        <button 
          className="toolbar-btn" 
          onClick={() => executeCommand('formatBlock', '<h1>')}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </button>
        <button 
          className="toolbar-btn" 
          onClick={() => executeCommand('formatBlock', '<h2>')}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </button>

        <div className="toolbar-divider"></div>

        {/* Text Styles */}
        <button 
          className={`toolbar-btn ${editorStates.bold ? 'active' : ''}`}
          onClick={() => executeCommand('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button 
          className={`toolbar-btn ${editorStates.italic ? 'active' : ''}`}
          onClick={() => executeCommand('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        <button 
          className={`toolbar-btn ${editorStates.underline ? 'active' : ''}`}
          onClick={() => executeCommand('underline')}
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} />
        </button>

        <div className="toolbar-divider"></div>

        {/* Lists */}
        <button 
          className={`toolbar-btn ${editorStates.ul ? 'active' : ''}`}
          onClick={() => executeCommand('insertUnorderedList')}
          title="Bulleted List"
        >
          <List size={16} />
        </button>
        <button 
          className={`toolbar-btn ${editorStates.ol ? 'active' : ''}`}
          onClick={() => executeCommand('insertOrderedList')}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>

        <div className="toolbar-divider"></div>

        {/* Alignment */}
        <button 
          className="toolbar-btn" 
          onClick={() => executeCommand('justifyLeft')}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        <button 
          className="toolbar-btn" 
          onClick={() => executeCommand('justifyCenter')}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        <button 
          className="toolbar-btn" 
          onClick={() => executeCommand('justifyRight')}
          title="Align Right"
        >
          <AlignRight size={16} />
        </button>
      </section>

      {/* Editor Viewport & Paper */}
      <section className="editor-viewport">
        <div 
          ref={editorRef}
          className="editor-sheet"
          contentEditable={true}
          onInput={handleEditorInput}
          onKeyUp={updateCommandStates}
          onMouseUp={updateCommandStates}
          onBlur={handleEditorInput}
          suppressContentEditableWarning={true}
        />
      </section>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
