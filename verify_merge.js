'use strict';

/**
 * Standalone verification for mergeNode that does NOT require a running Neo4j instance.
 * It stubs cypherQuery to capture the generated query and params, then verifies:
 *   - Query construction for single-label, multi-label scenarios
 *   - createProperties / updateProperties placement in ON CREATE / ON MATCH
 *   - Flexible arity (omitting createProperties/updateProperties)
 *   - Validation error paths
 */

var assert = require('assert');
var Neo4j = require('./index');

// Stub cypherQuery to capture what would be sent to Neo4j
var lastQuery = null;
var lastParams = null;
var stubResponse = null;

Neo4j.prototype.cypherQuery = function(query, params, include_stats, callback) {
    lastQuery = query;
    lastParams = params;
    if (typeof include_stats === 'function') {
        callback = include_stats;
    }
    // Simulate a successful response
    if (stubResponse) {
        callback(null, stubResponse);
    } else {
        callback(null, { columns: ['data'], data: [{ _id: 42, _merge_marker: '__created__' }] });
    }
};

var db = new Neo4j('http://localhost:7474');
var passed = 0;
var failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        console.log('  ✗ ' + name);
        console.log('    ' + e.message);
    }
}

function testAsync(name, fn) {
    // We use synchronous stubs so callbacks fire synchronously
    try {
        fn();
        passed++;
        console.log('  ✓ ' + name);
    } catch (e) {
        failed++;
        console.log('  ✗ ' + name);
        console.log('    ' + e.message);
    }
}

console.log('\n=== mergeNode Verification ===\n');

// ------------------------------------------------------------------
console.log('Query construction:');

test('single label + identity + createProperties', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 1, _merge_marker: '__created__', email: 'a@b.com', name: 'A' }] };
    db.mergeNode('User', { email: 'a@b.com' }, { name: 'A' }, function(err, result) {
        assert.ifError(err);
        assert.strictEqual(result.created, true);
        assert.ok(lastQuery.indexOf('MERGE (data:User {email: {_m_1}})') !== -1,
            'MERGE clause mismatch. Query: ' + lastQuery);
        assert.ok(lastQuery.indexOf('ON CREATE SET') !== -1, 'Missing ON CREATE SET');
        assert.ok(lastQuery.indexOf('data.name = {_m_2}') !== -1, 'Missing name in ON CREATE SET. Query: ' + lastQuery);
        assert.ok(lastQuery.indexOf('data._merge_marker = {_m_3}') !== -1, 'Missing marker. Query: ' + lastQuery);
        assert.ok(lastQuery.indexOf('ON MATCH') === -1, 'Should have no ON MATCH when no updateProperties');
        assert.strictEqual(lastParams._m_1, 'a@b.com');
        assert.strictEqual(lastParams._m_2, 'A');
        assert.strictEqual(lastParams._m_3, '__created__');
    });
});

test('single label + identity + createProperties + updateProperties', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 2, email: 'a@b.com', score: 50 }] };
    db.mergeNode('User', { email: 'a@b.com' }, { name: 'A' }, { score: 50 }, function(err, result) {
        assert.ifError(err);
        assert.strictEqual(result.created, false); // no _merge_marker in response
        assert.ok(lastQuery.indexOf('ON CREATE SET') !== -1, 'Missing ON CREATE SET');
        assert.ok(lastQuery.indexOf('ON MATCH SET') !== -1, 'Missing ON MATCH SET');
        assert.ok(lastQuery.indexOf('data.name = {_m_2}') !== -1, 'Missing name in ON CREATE SET');
        assert.ok(lastQuery.indexOf('data.score = {_m_4}') !== -1, 'Missing score in ON MATCH SET. Query: ' + lastQuery);
    });
});

test('multi-label scenario', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 3, _merge_marker: '__created__', uid: 'x' }] };
    db.mergeNode(['User', 'Admin'], { uid: 'x' }, { role: 'super' }, function(err, result) {
        assert.ifError(err);
        assert.strictEqual(result.created, true);
        assert.ok(lastQuery.indexOf('MERGE (data:User:Admin {uid: {_m_1}})') !== -1,
            'Multi-label MERGE clause mismatch. Query: ' + lastQuery);
    });
});

test('bare merge (no createProperties, no updateProperties)', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 4, _merge_marker: '__created__', email: 'b@c.com' }] };
    db.mergeNode('Session', { email: 'b@c.com' }, function(err, result) {
        assert.ifError(err);
        assert.strictEqual(result.created, true);
        assert.ok(lastQuery.indexOf('MERGE (data:Session {email: {_m_1}})') !== -1,
            'MERGE clause mismatch. Query: ' + lastQuery);
        assert.ok(lastQuery.indexOf('ON CREATE SET data._merge_marker = {_m_2}') !== -1,
            'Missing marker-only ON CREATE SET. Query: ' + lastQuery);
        assert.ok(lastQuery.indexOf('ON MATCH') === -1, 'Should have no ON MATCH clause');
    });
});

test('createProperties key overlapping identity is skipped in ON CREATE', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 5, _merge_marker: '__created__', email: 'a@b.com' }] };
    db.mergeNode('User', { email: 'a@b.com' }, { email: 'duplicate', name: 'A' }, function(err, result) {
        assert.ifError(err);
        // email should NOT appear in ON CREATE SET since it's an identity key
        var onCreateIdx = lastQuery.indexOf('ON CREATE SET');
        var onCreatePart = lastQuery.slice(onCreateIdx);
        assert.ok(onCreatePart.indexOf('data.email') === -1,
            'Identity key "email" should not appear in ON CREATE SET. Query: ' + lastQuery);
        assert.ok(onCreatePart.indexOf('data.name') !== -1,
            '"name" should appear in ON CREATE SET');
    });
});

test('result.created is false when _merge_marker is absent (matched node)', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 10, email: 'a@b.com', name: 'A' }] };
    db.mergeNode('User', { email: 'a@b.com' }, { name: 'A' }, function(err, result) {
        assert.ifError(err);
        assert.strictEqual(result.created, false);
        assert.ok(!result.node.hasOwnProperty('_merge_marker'), 'Marker should be cleaned up');
    });
});

test('result.created is true when _merge_marker equals __created__', function() {
    stubResponse = { columns: ['data'], data: [{ _id: 11, _merge_marker: '__created__', email: 'a@b.com' }] };
    db.mergeNode('User', { email: 'a@b.com' }, function(err, result) {
        assert.ifError(err);
        assert.strictEqual(result.created, true);
        assert.ok(!result.node.hasOwnProperty('_merge_marker'), 'Marker should be cleaned up');
    });
});

// ------------------------------------------------------------------
console.log('\nValidation errors:');

test('empty string labels', function() {
    db.mergeNode('', { email: 'a@b.com' }, function(err, result) {
        assert.ok(err, 'Should return error for empty string label');
        assert.strictEqual(result, null);
    });
});

test('empty array labels', function() {
    db.mergeNode([], { email: 'a@b.com' }, function(err, result) {
        assert.ok(err, 'Should return error for empty array labels');
        assert.strictEqual(result, null);
    });
});

test('null labels', function() {
    db.mergeNode(null, { email: 'a@b.com' }, function(err, result) {
        assert.ok(err, 'Should return error for null labels');
        assert.strictEqual(result, null);
    });
});

test('empty identity properties', function() {
    db.mergeNode('User', {}, function(err, result) {
        assert.ok(err, 'Should return error for empty identity properties');
        assert.strictEqual(result, null);
    });
});

test('null identity properties', function() {
    db.mergeNode('User', null, function(err, result) {
        assert.ok(err, 'Should return error for null identity properties');
        assert.strictEqual(result, null);
    });
});

test('identity properties is a string (not an object)', function() {
    db.mergeNode('User', 'bad', function(err, result) {
        assert.ok(err, 'Should return error when identity properties is a string');
        assert.strictEqual(result, null);
    });
});

test('createProperties is not an object', function() {
    db.mergeNode('User', { email: 'a@b.com' }, 'bad', function(err, result) {
        assert.ok(err, 'Should return error when createProperties is not an object');
        assert.strictEqual(result, null);
    });
});

test('updateProperties is not an object', function() {
    db.mergeNode('User', { email: 'a@b.com' }, {}, 'bad', function(err, result) {
        assert.ok(err, 'Should return error when updateProperties is not an object');
        assert.strictEqual(result, null);
    });
});

// ------------------------------------------------------------------
console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');

process.exit(failed > 0 ? 1 : 0);
