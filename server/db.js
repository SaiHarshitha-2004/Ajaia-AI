import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');

const INITIAL_DATA = {
  users: [
    { id: "alice", name: "Alice Smith", avatarColor: "#6366f1" },
    { id: "bob", name: "Bob Johnson", avatarColor: "#10b981" },
    { id: "charlie", name: "Charlie Brown", avatarColor: "#f59e0b" }
  ],
  documents: [
    {
      id: "welcome-doc",
      title: "Welcome to Ajaia Docs",
      content: "<h1>Welcome to the Editor!</h1><p>This is a rich-text document editing space. You can use the formatting options above to style your content, import documents, or share them with others.</p><ul><li><b>Bold</b>, <i>Italic</i>, and <u>Underline</u> styles</li><li>Headings and list styles</li><li>Sharing documents with coworkers</li></ul>",
      ownerId: "alice",
      sharedWith: ["bob"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Queue system to prevent file writing race conditions
let writeQueue = Promise.resolve();

export async function readDB() {
  await ensureDir(path.dirname(DB_FILE));
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeDB(INITIAL_DATA);
      return INITIAL_DATA;
    }
    throw err;
  }
}

export async function writeDB(data) {
  await ensureDir(path.dirname(DB_FILE));
  
  // Chain to the write queue
  const nextWrite = new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const tempFile = `${DB_FILE}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tempFile, DB_FILE);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
  
  return nextWrite;
}
