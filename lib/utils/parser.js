'use strict';

exports.getNodeId = getNodeId;
exports.getRelationshipId = getRelationshipId;
exports.parseGraphNode = parseGraphNode;
exports.parseGraphRelationship = parseGraphRelationship;
exports.parseGraphResult = parseGraphResult;

/* Internal method
   Example:
   http://db5.sb01.stations.graphenedb.com:24789/db/data/node/7
   will return 7 as an integer */

function getNodeId (url) {
  return parseInt(url.match(/\/db\/data\/node\/([0-9]+)(\/[0-9a-z\/]+)?$/)[1]);
}


/* Internal method
   Example:
   http://db5.sb01.stations.graphenedb.com:24789/db/data/relationship/7
   will return 7 as an integer */

function getRelationshipId (url) {
  return parseInt(url.match(/\/db\/data\/relationship\/([0-9]+)(\/[0-9a-z\/]+)?$/)[1]);
}


/* Internal method
   Merge a `properties` object onto a target object without overwriting the
   reserved `_id / _start / _end / _type / labels` keys we add ourselves. */

function mergeProperties (target, properties) {
  if (!properties) {
    return target;
  }
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      target[key] = properties[key];
    }
  }
  return target;
}


/* Normalize a node coming from the transaction 'graph' result format.
   Example input:
     { id: '382', labels: [ 'Person' ], properties: { name: 'Adam', age: 22 } }
   returns:
     { _id: 382, labels: [ 'Person' ], name: 'Adam', age: 22 } */

function parseGraphNode (node) {
  var result = {
    _id: parseInt(node.id, 10),
    labels: node.labels || []
  };
  return mergeProperties(result, node.properties);
}


/* Normalize a relationship (edge) coming from the transaction 'graph' result
   format. It fills `_id`, `_start`, `_end` and `_type` so the returned object
   matches the shape produced by `addRelationshipId` for the REST format.
   Example input:
     { id: '1', type: 'HAS', startNode: '382', endNode: '383',
       properties: { position: 1 } }
   returns:
     { _id: 1, _start: 382, _end: 383, _type: 'HAS', position: 1 } */

function parseGraphRelationship (relationship) {
  var result = {
    _id: parseInt(relationship.id, 10),
    _start: parseInt(relationship.startNode, 10),
    _end: parseInt(relationship.endNode, 10),
    _type: relationship.type
  };
  return mergeProperties(result, relationship.properties);
}


/* Internal method
   Collect the values of a map (keyed by id) into an array. */

function valuesOf (map) {
  var values = [];
  for (var key in map) {
    if (map.hasOwnProperty(key)) {
      values.push(map[key]);
    }
  }
  return values;
}


/* Turn the raw response of a `resultDataContents: ['row', 'graph']` statement
   (sent to /db/data/transaction/commit) into a convenient structure:
     {
       columns: [ ... ],          // the returned columns
       data: [ [ ... ], ... ],    // the raw `row` arrays, one per result row
       nodes: [ ... ],            // every node, flattened, de-duplicated by _id
       relationships: [ ... ]     // every relationship, flattened, de-duplicated
     }
   The `nodes` and `relationships` arrays collate everything from all columns and
   all rows (including the contents of paths), which is exactly what a caller
   needs to feed a graph visualisation or do further processing without having
   to walk the raw Neo4j response. */

function parseGraphResult (body) {
  var resultSet = (body && body.results && body.results[0]) || { columns: [], data: [] };
  var rows = resultSet.data || [];
  var nodesById = {};
  var relationshipsById = {};
  var data = [];

  rows.forEach(function (entry) {
    if (entry && typeof entry.row !== 'undefined') {
      data.push(entry.row);
    }
    if (entry && entry.graph) {
      (entry.graph.nodes || []).forEach(function (node) {
        var parsedNode = parseGraphNode(node);
        nodesById[parsedNode._id] = parsedNode;
      });
      (entry.graph.relationships || []).forEach(function (relationship) {
        var parsedRelationship = parseGraphRelationship(relationship);
        relationshipsById[parsedRelationship._id] = parsedRelationship;
      });
    }
  });

  return {
    columns: resultSet.columns || [],
    data: data,
    nodes: valuesOf(nodesById),
    relationships: valuesOf(relationshipsById)
  };
}