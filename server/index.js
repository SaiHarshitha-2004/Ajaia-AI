import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { readDB, writeDB } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS dynamically to support local development and Vercel domains
app.use(cors({
  origin: (origin, callback) => {
    // Reflect origin back to satisfy credentials: true
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Multer storage in memory to easily read text files directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Standard validation: accept text and markdown
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext === 'txt' || ext === 'md' || file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .md files are supported!'), false);
    }
  }
});

// Middleware to extract and validate X-User-ID header
async function authenticateUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. X-User-ID header is missing.' });
  }

  const db = await readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid user ID.' });
  }

  req.user = user;
  next();
}

const apiRouter = express.Router();

// 1. Get all users (useful for user switching and sharing menu)
apiRouter.get('/users', async (req, res, next) => {
  try {
    const db = await readDB();
    res.json(db.users);
  } catch (err) {
    next(err);
  }
});

// 2. Get all documents visible to the current user (owned or shared with them)
apiRouter.get('/documents', authenticateUser, async (req, res, next) => {
  try {
    const db = await readDB();
    const userDocs = db.documents.filter(doc => 
      doc.ownerId === req.user.id || (doc.sharedWith && doc.sharedWith.includes(req.user.id))
    );
    res.json(userDocs);
  } catch (err) {
    next(err);
  }
});

// 3. Get details of a specific document
apiRouter.get('/documents/:id', authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await readDB();
    const doc = db.documents.find(d => d.id === id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Access control
    const isOwner = doc.ownerId === req.user.id;
    const isShared = doc.sharedWith && doc.sharedWith.includes(req.user.id);

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: 'You do not have permission to access this document' });
    }

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// 4. Create a new document
apiRouter.post('/documents', authenticateUser, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const db = await readDB();

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'Untitled Document',
      content: content || '<p><br></p>',
      ownerId: req.user.id,
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.documents.push(newDoc);
    await writeDB(db);

    res.status(201).json(newDoc);
  } catch (err) {
    next(err);
  }
});

// 5. Update an existing document (title and/or content)
apiRouter.put('/documents/:id', authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const db = await readDB();

    const docIndex = db.documents.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = db.documents[docIndex];
    // Check permission
    const isOwner = doc.ownerId === req.user.id;
    const isShared = doc.sharedWith && doc.sharedWith.includes(req.user.id);

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: 'You do not have permission to edit this document' });
    }

    // Apply updates
    if (title !== undefined) doc.title = title;
    if (content !== undefined) doc.content = content;
    doc.updatedAt = new Date().toISOString();

    db.documents[docIndex] = doc;
    await writeDB(db);

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// 6. Share document with other users
apiRouter.post('/documents/:id/share', authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sharedWith } = req.body; // Array of user IDs

    if (!Array.isArray(sharedWith)) {
      return res.status(400).json({ error: 'sharedWith must be an array of user IDs' });
    }

    const db = await readDB();
    const docIndex = db.documents.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = db.documents[docIndex];
    
    // Only the owner can manage sharing settings
    if (doc.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the document owner can share this document' });
    }

    // Filter shared list to ensure sharing with valid seeded users, excluding owner
    const validUserIds = db.users.map(u => u.id).filter(uid => uid !== req.user.id);
    const updatedSharedWith = sharedWith.filter(uid => validUserIds.includes(uid));

    doc.sharedWith = updatedSharedWith;
    doc.updatedAt = new Date().toISOString();

    db.documents[docIndex] = doc;
    await writeDB(db);

    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// 7. Delete document
apiRouter.delete('/documents/:id', authenticateUser, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await readDB();

    const docIndex = db.documents.findIndex(d => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = db.documents[docIndex];

    // Only owner can delete
    if (doc.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the document owner can delete this document' });
    }

    db.documents.splice(docIndex, 1);
    await writeDB(db);

    res.json({ message: 'Document deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

// 8. Upload file and import content
apiRouter.post('/documents/import', authenticateUser, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file format. Only .txt and .md are allowed.' });
    }

    // Convert file contents from Buffer to String
    const fileContent = req.file.buffer.toString('utf-8');
    
    // Simple text-to-html conversion for contentEditable compatibility
    // Preserve linebreaks as paragraph tags
    const paragraphs = fileContent
      .split(/\r?\n/)
      .map(line => line.trim() ? `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<p><br></p>')
      .join('');

    const targetDocId = req.body.documentId;
    const db = await readDB();

    if (targetDocId) {
      // Append content to existing document
      const docIndex = db.documents.findIndex(d => d.id === targetDocId);
      if (docIndex === -1) {
        return res.status(404).json({ error: 'Target document not found' });
      }

      const doc = db.documents[docIndex];
      // Check edit permissions
      const isOwner = doc.ownerId === req.user.id;
      const isShared = doc.sharedWith && doc.sharedWith.includes(req.user.id);
      if (!isOwner && !isShared) {
        return res.status(403).json({ error: 'You do not have permission to modify this document' });
      }

      doc.content = (doc.content || '') + paragraphs;
      doc.updatedAt = new Date().toISOString();
      db.documents[docIndex] = doc;
      await writeDB(db);
      return res.json(doc);
    } else {
      // Create new document from uploaded file
      const originalName = req.file.originalname;
      const cleanTitle = originalName.replace(/\.[^/.]+$/, ""); // Strip file extension
      
      const newDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: cleanTitle || 'Imported Document',
        content: paragraphs || '<p><br></p>',
        ownerId: req.user.id,
        sharedWith: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.documents.push(newDoc);
      await writeDB(db);
      return res.status(201).json(newDoc);
    }
  } catch (err) {
    next(err);
  }
});

// Root status landing page
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Ajaia Docs Backend API is running successfully!',
    endpoints: {
      users: '/api/users',
      documents: '/api/documents'
    }
  });
});

// Mount the API router under both /api and / to handle Vercel path resolution variations
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start listening
const serverInstance = app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

export { app, serverInstance };
export default app;
