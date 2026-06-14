'use strict';

exports.getNodeId = getNodeId;
exports.getRelationshipId = getRelationshipId;
exports.parseGraphNode = parseGraphNode;
exports.parseGraphRelationship = parseGraphRelationship;

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
   Parse a node from the transaction endpoint's graph format into
   a normalized object with `_id` and `_labels` alongside its properties.

   Example input (graph format node):
   { id: '382', labels: ['Person'], properties: { name: 'Adam', age: 22 } }

   Returns:
   { name: 'Adam', age: 22, _id: 382, _labels: ['Person'] } */

function parseGraphNode (node) {
  var parsed = {};
  if (node.properties) {
    var keys = Object.keys(node.properties);
    for (var i = 0; i < keys.length; i++) {
      parsed[keys[i]] = node.properties[keys[i]];
    }
  }
  parsed._id = parseInt(node.id);
  if (node.labels) {
    parsed._labels = node.labels;
  }
  return parsed;
}


/* Internal method
   Parse a relationship from the transaction endpoint's graph format into
   a normalized object with `_id`, `_start`, `_end` and `_type` alongside
   its properties. Reuses the same naming convention as `addRelationshipId`.

   Example input (graph format relationship):
   { id: '10', type: 'KNOWS', startNode: '1', endNode: '2', properties: { since: 2010 } }

   Returns:
   { since: 2010, _id: 10, _start: 1, _end: 2, _type: 'KNOWS' } */

function parseGraphRelationship (rel) {
  var parsed = {};
  if (rel.properties) {
    var keys = Object.keys(rel.properties);
    for (var i = 0; i < keys.length; i++) {
      parsed[keys[i]] = rel.properties[keys[i]];
    }
  }
  parsed._id = parseInt(rel.id);
  parsed._start = parseInt(rel.startNode);
  parsed._end = parseInt(rel.endNode);
  parsed._type = rel.type;
  return parsed;
}