import test from 'node:test';
import assert from 'node:assert';
// Set PORT to 0 to use an ephemeral port, preventing collisions with any running dev server
process.env.PORT = '0';

const { serverInstance } = await import('../index.js');
const port = serverInstance.address().port;
const API_URL = `http://localhost:${port}/api`;

test('Ajaia Docs API Integration Tests', async (t) => {
  // Test 1: Fetch Users
  await t.test('GET /api/users should return list of seeded users', async () => {
    const res = await fetch(`${API_URL}/users`);
    assert.strictEqual(res.status, 200);
    const users = await res.json();
    assert.ok(Array.isArray(users));
    assert.strictEqual(users.length, 3);
    assert.strictEqual(users[0].id, 'alice');
  });

  // Test 2: Fetch Documents (Authentication check)
  await t.test('GET /api/documents should fail without X-User-ID header', async () => {
    const res = await fetch(`${API_URL}/documents`);
    assert.strictEqual(res.status, 401);
  });

  // Test 3: Fetch Documents (Success)
  await t.test('GET /api/documents should succeed with valid X-User-ID', async () => {
    const res = await fetch(`${API_URL}/documents`, {
      headers: { 'X-User-ID': 'alice' }
    });
    assert.strictEqual(res.status, 200);
    const docs = await res.json();
    assert.ok(Array.isArray(docs));
    assert.ok(docs.find(d => d.id === 'welcome-doc'));
  });

  // Test 4: Create Document
  let createdDocId = null;
  await t.test('POST /api/documents should create a new document', async () => {
    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'alice'
      },
      body: JSON.stringify({
        title: 'Test Document',
        content: '<p>Test content</p>'
      })
    });

    assert.strictEqual(res.status, 201);
    const doc = await res.json();
    assert.strictEqual(doc.title, 'Test Document');
    assert.strictEqual(doc.content, '<p>Test content</p>');
    assert.strictEqual(doc.ownerId, 'alice');
    assert.ok(doc.id);
    createdDocId = doc.id;
  });

  // Test 5: Access Control - Bob cannot access Alice's unshared document
  await t.test('GET /api/documents/:id should deny access if document is not owned or shared', async () => {
    const res = await fetch(`${API_URL}/documents/${createdDocId}`, {
      headers: { 'X-User-ID': 'bob' }
    });
    assert.strictEqual(res.status, 403);
  });

  // Test 6: Share Document with Bob
  await t.test('POST /api/documents/:id/share should share document with Bob', async () => {
    const res = await fetch(`${API_URL}/documents/${createdDocId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'alice'
      },
      body: JSON.stringify({
        sharedWith: ['bob']
      })
    });

    assert.strictEqual(res.status, 200);
    const doc = await res.json();
    assert.ok(doc.sharedWith.includes('bob'));
  });

  // Test 7: Bob can now view and edit the document
  await t.test('GET /api/documents/:id should now allow Bob to read', async () => {
    const res = await fetch(`${API_URL}/documents/${createdDocId}`, {
      headers: { 'X-User-ID': 'bob' }
    });
    assert.strictEqual(res.status, 200);
    const doc = await res.json();
    assert.strictEqual(doc.id, createdDocId);
  });

  await t.test('PUT /api/documents/:id should allow Bob to edit shared document', async () => {
    const res = await fetch(`${API_URL}/documents/${createdDocId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': 'bob'
      },
      body: JSON.stringify({
        content: '<p>Updated content by Bob</p>'
      })
    });
    assert.strictEqual(res.status, 200);
    const doc = await res.json();
    assert.strictEqual(doc.content, '<p>Updated content by Bob</p>');
  });

  // Test 8: Clean up by deleting document
  await t.test('DELETE /api/documents/:id should delete document by Alice', async () => {
    const res = await fetch(`${API_URL}/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: { 'X-User-ID': 'alice' }
    });
    assert.strictEqual(res.status, 200);
  });

  // Close the server at the end of tests
  serverInstance.close();
});
