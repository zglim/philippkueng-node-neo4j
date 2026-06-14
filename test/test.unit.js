'use strict';

/*jshint expr: true*/

var should = require('should'),
    neo4j = require('../index'),
    parser = require('../lib/utils/parser');

// These tests do not require a running Neo4j server.
// They cover parser helpers, the _parseGraphResult internal method,
// and backward-compatible argument handling of cypherQuery.

var url = 'http://localhost:7474';
var db = new neo4j(url);

describe('Parser utilities (unit tests, no server required)', function () {

    describe('parseGraphNode', function () {
        it('should normalize a graph format node into an object with _id and _labels', function () {
            var raw = { id: '382', labels: ['Person'], properties: { name: 'Adam', age: 22 } };
            var parsed = parser.parseGraphNode(raw);
            parsed.should.have.property('_id', 382);
            parsed._id.should.be.a.Number;
            parsed.should.have.property('_labels');
            parsed._labels.should.be.an.instanceOf(Array);
            parsed._labels.should.containEql('Person');
            parsed.should.have.property('name', 'Adam');
            parsed.should.have.property('age', 22);
        });

        it('should handle a node with no properties', function () {
            var raw = { id: '7', labels: ['Empty'] };
            var parsed = parser.parseGraphNode(raw);
            parsed.should.have.property('_id', 7);
            parsed.should.have.property('_labels');
            parsed._labels.should.containEql('Empty');
        });

        it('should handle a node with empty labels', function () {
            var raw = { id: '1', labels: [], properties: { x: 1 } };
            var parsed = parser.parseGraphNode(raw);
            parsed.should.have.property('_id', 1);
            parsed._labels.should.have.lengthOf(0);
            parsed.should.have.property('x', 1);
        });

        it('should handle multiple labels', function () {
            var raw = { id: '5', labels: ['User', 'Admin', 'Active'], properties: {} };
            var parsed = parser.parseGraphNode(raw);
            parsed._labels.should.have.lengthOf(3);
            parsed._labels.should.containEql('User');
            parsed._labels.should.containEql('Admin');
            parsed._labels.should.containEql('Active');
        });
    });

    describe('parseGraphRelationship', function () {
        it('should normalize a graph format relationship with _id, _start, _end, _type', function () {
            var raw = { id: '10', type: 'KNOWS', startNode: '1', endNode: '2', properties: { since: 2015 } };
            var parsed = parser.parseGraphRelationship(raw);
            parsed.should.have.property('_id', 10);
            parsed._id.should.be.a.Number;
            parsed.should.have.property('_start', 1);
            parsed._start.should.be.a.Number;
            parsed.should.have.property('_end', 2);
            parsed._end.should.be.a.Number;
            parsed.should.have.property('_type', 'KNOWS');
            parsed.should.have.property('since', 2015);
        });

        it('should handle a relationship with no properties', function () {
            var raw = { id: '5', type: 'RELATED_TO', startNode: '10', endNode: '20' };
            var parsed = parser.parseGraphRelationship(raw);
            parsed.should.have.property('_id', 5);
            parsed.should.have.property('_start', 10);
            parsed.should.have.property('_end', 20);
            parsed.should.have.property('_type', 'RELATED_TO');
        });

        it('should preserve relationship property values of different types', function () {
            var raw = {
                id: '99', type: 'LIKES', startNode: '1', endNode: '2',
                properties: { weight: 0.5, active: true, tags: ['a', 'b'], note: null }
            };
            var parsed = parser.parseGraphRelationship(raw);
            parsed.should.have.property('weight', 0.5);
            parsed.should.have.property('active', true);
            parsed.tags.should.be.an.instanceOf(Array);
            parsed.tags.should.have.lengthOf(2);
            parsed.should.have.property('note', null);
        });
    });
});

describe('_parseGraphResult (unit tests, no server required)', function () {

    it('should return columns, data and a normalized graph', function () {
        var txResult = {
            columns: ['p'],
            data: [{
                row: [{ name: 'Adam', age: 22 }],
                graph: {
                    nodes: [
                        { id: '1', labels: ['Person'], properties: { name: 'Adam', age: 22 } }
                    ],
                    relationships: []
                }
            }]
        };
        var parsed = db._parseGraphResult(txResult);
        parsed.should.have.property('columns');
        parsed.columns.should.have.lengthOf(1);
        parsed.columns[0].should.equal('p');
        parsed.should.have.property('data');
        parsed.data.should.have.lengthOf(1);
        parsed.data[0].should.have.property('name', 'Adam');
        parsed.should.have.property('graph');
        parsed.graph.should.have.property('nodes');
        parsed.graph.nodes.should.have.lengthOf(1);
        parsed.graph.nodes[0].should.have.property('_id', 1);
        parsed.graph.nodes[0].should.have.property('name', 'Adam');
        parsed.graph.should.have.property('relationships');
        parsed.graph.relationships.should.have.lengthOf(0);
    });

    it('should keep data as nested arrays for multiple columns (not flattened)', function () {
        var txResult = {
            columns: ['a', 'b'],
            data: [
                { row: ['x', 'y'], graph: { nodes: [], relationships: [] } },
                { row: ['x2', 'y2'], graph: { nodes: [], relationships: [] } }
            ]
        };
        var parsed = db._parseGraphResult(txResult);
        parsed.data.should.have.lengthOf(2);
        parsed.data[0].should.have.lengthOf(2);
        parsed.data[0][0].should.equal('x');
        parsed.data[0][1].should.equal('y');
        parsed.data[1][0].should.equal('x2');
        parsed.data[1][1].should.equal('y2');
    });

    it('should deduplicate entities that appear in multiple result rows', function () {
        var txResult = {
            columns: ['r'],
            data: [
                {
                    row: [{ _type: 'KNOWS' }],
                    graph: {
                        nodes: [
                            { id: '1', labels: ['User'], properties: { name: 'Alice' } },
                            { id: '2', labels: ['User'], properties: { name: 'Bob' } }
                        ],
                        relationships: [
                            { id: '10', type: 'KNOWS', startNode: '1', endNode: '2', properties: { since: 2015 } }
                        ]
                    }
                },
                {
                    row: [{ _type: 'KNOWS' }],
                    graph: {
                        nodes: [
                            { id: '2', labels: ['User'], properties: { name: 'Bob' } },
                            { id: '3', labels: ['User'], properties: { name: 'Carol' } }
                        ],
                        relationships: [
                            { id: '10', type: 'KNOWS', startNode: '1', endNode: '2', properties: { since: 2015 } },
                            { id: '11', type: 'KNOWS', startNode: '2', endNode: '3', properties: {} }
                        ]
                    }
                }
            ]
        };
        var parsed = db._parseGraphResult(txResult);
        // 3 unique nodes (Bob appears twice but should be merged)
        parsed.graph.nodes.should.have.lengthOf(3);
        // 2 unique relationships (rel 10 appears twice but should be merged)
        parsed.graph.relationships.should.have.lengthOf(2);

        // Check relationship normalization
        var rel10 = parsed.graph.relationships.filter(function(r) { return r._id === 10; })[0];
        should.exist(rel10);
        rel10.should.have.property('_start', 1);
        rel10.should.have.property('_end', 2);
        rel10.should.have.property('_type', 'KNOWS');
        rel10.should.have.property('since', 2015);
    });

    it('should return empty arrays for an empty result set', function () {
        var txResult = { columns: ['n'], data: [] };
        var parsed = db._parseGraphResult(txResult);
        parsed.data.should.have.lengthOf(0);
        parsed.graph.nodes.should.have.lengthOf(0);
        parsed.graph.relationships.should.have.lengthOf(0);
    });

    it('should expose all nodes and relationships from a path result', function () {
        var txResult = {
            columns: ['p'],
            data: [{
                row: [{ nodes: 3, relationships: 2 }],
                graph: {
                    nodes: [
                        { id: '1', labels: ['A'], properties: { name: 'a' } },
                        { id: '2', labels: ['B'], properties: { name: 'b' } },
                        { id: '3', labels: ['C'], properties: { name: 'c' } }
                    ],
                    relationships: [
                        { id: '10', type: 'NEXT', startNode: '1', endNode: '2', properties: {} },
                        { id: '11', type: 'NEXT', startNode: '2', endNode: '3', properties: {} }
                    ]
                }
            }]
        };
        var parsed = db._parseGraphResult(txResult);
        parsed.graph.nodes.should.have.lengthOf(3);
        parsed.graph.relationships.should.have.lengthOf(2);
        var r0 = parsed.graph.relationships[0];
        r0.should.have.property('_start', 1);
        r0.should.have.property('_end', 2);
        var r1 = parsed.graph.relationships[1];
        r1.should.have.property('_start', 2);
        r1.should.have.property('_end', 3);
    });

    it('should handle a result with only nodes (no relationships)', function () {
        var txResult = {
            columns: ['n'],
            data: [
                { row: [{ name: 'A' }], graph: { nodes: [{ id: '1', labels: ['X'], properties: { name: 'A' } }], relationships: [] } },
                { row: [{ name: 'B' }], graph: { nodes: [{ id: '2', labels: ['Y'], properties: { name: 'B' } }], relationships: [] } }
            ]
        };
        var parsed = db._parseGraphResult(txResult);
        parsed.graph.nodes.should.have.lengthOf(2);
        parsed.graph.relationships.should.have.lengthOf(0);
    });

    it('should handle a result where graph is missing from a row', function () {
        var txResult = {
            columns: ['n'],
            data: [
                { row: [42] }  // no graph key at all
            ]
        };
        var parsed = db._parseGraphResult(txResult);
        parsed.data.should.have.lengthOf(1);
        parsed.data[0].should.equal(42);
        parsed.graph.nodes.should.have.lengthOf(0);
        parsed.graph.relationships.should.have.lengthOf(0);
    });
});

describe('cypherQuery argument compatibility (unit tests)', function () {

    it('should not throw when called with query and callback only', function () {
        (function () {
            db.cypherQuery('RETURN 1', function () {});
        }).should.not.throw();
    });

    it('should not throw when called with query, params object and callback', function () {
        (function () {
            db.cypherQuery('RETURN {x}', { x: 1 }, function () {});
        }).should.not.throw();
    });

    it('should not throw when called with include_stats boolean (legacy)', function () {
        (function () {
            db.cypherQuery('CREATE (n) RETURN n', {}, true, function () {});
        }).should.not.throw();
    });

    it('should not throw when called with options object (graph mode)', function () {
        (function () {
            db.cypherQuery('RETURN 1', null, { graph: true }, function () {});
        }).should.not.throw();
    });

    it('should not throw when called with options object containing includeStats', function () {
        (function () {
            db.cypherQuery('RETURN 1', null, { graph: true, includeStats: true }, function () {});
        }).should.not.throw();
    });

    it('should invoke callback even when query is null (error path)', function (done) {
        db.cypherQuery(null, function (err, result) {
            // Either an error or a null/empty result is acceptable
            done();
        });
    });
});
