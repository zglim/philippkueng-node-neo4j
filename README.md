# Neo4j REST API wrapper for Node.js

master branch: [![Build Status](https://travis-ci.org/philippkueng/node-neo4j.png?branch=master)](https://travis-ci.org/philippkueng/node-neo4j) [![Dependency Status](https://gemnasium.com/philippkueng/node-neo4j.svg)](https://gemnasium.com/philippkueng/node-neo4j) [![Coverage Status](https://coveralls.io/repos/philippkueng/node-neo4j/badge.svg?branch=coveralls)](https://coveralls.io/r/philippkueng/node-neo4j?branch=coveralls)  
develop branch: [![Build Status](https://travis-ci.org/philippkueng/node-neo4j.png?branch=develop)](https://travis-ci.org/philippkueng/node-neo4j)  

---

## Installation

```bash
npm install node-neo4j --save
```

## Usage

In order to use the library you either have to create a [heroku](http://www.heroku.com/) app and add the [GrapheneDB Neo4j Addon](https://addons.heroku.com/graphenedb) or install it locally.  
If you're using OS X I highly recommend installing Neo4j via [Homebrew](http://mxcl.github.com/homebrew/).

```bash
brew install neo4j
neo4j start
```

**Instantiate a wrapper instance**

```javascript
var neo4j = require('node-neo4j');
db = new neo4j('http://username:password@domain:port');

// when using token based authentication introduced in Neo4j v2.2
db = new neo4j('http://:your-authentication-token@domain:port');
```

**Run a cypher query**

```javascript
db.cypherQuery("START user = node(123) MATCH user-[:RELATED_TO]->friends RETURN friends", function(err, result){
    if(err) throw err;

    console.log(result.data); // delivers an array of query results
    console.log(result.columns); // delivers an array of names of objects getting returned
});
```

**NOTE**
New features like labels, contraints and transactions are only supported by Neo4j 2.0.0.

**Disclaimer**
We try to update the module as fast as possible to adapt to any new version of Neo4j.
Don't be shy to give remarks, report bugs or send in pull requests.
You can contact use on Twitter [https://twitter.com/Stofkn](@Stofkn), [https://twitter.com/philippkueng](@philippkueng) or send us some email via the address defined in the `package.json`.


## New features

**Note**

Take a look at the test.main.js file in the test folder for many examples.

### Labels and indexes

**insertNode** Now supports labels.

**readLabels** Get the labels of a node given the node id. It returns an array of strings.

**insertLabelIndex** Create a label index on ONE property.

**deleteLabelIndex** Delete a label index for a property.

**listLabelIndexes** List indexes for a label.

**addLabelsToNode** Adding one or multiple labels to a node.

**replaceLabelsFromNode** Replacing all labels on a node by new labels.

**deleteLabelFromNode** Removing a label from a node.

**readNodesWithLabel** Get all nodes with a label.

**readNodesWithLabelsAndProperties** Get nodes by labels and properties.

**listAllLabels** List all labels.

**updateNodesWithLabelsAndProperties** Update all nodes with labels and properties and update/remove properties.

**deleteNodesWithLabelsAndProperties** Delete all nodes with labels and properties.

**mergeNode** Merge (find-or-create) a node: find by labels and identity properties, create if not found, optionally set create-only or update-on-match properties.

### Constraints

**createUniquenessContstraint** Create a uniqueness constraint on a property.

**readUniquenessConstraint** Get a specific uniqueness constraint for a label and a property.

**listAllUniquenessConstraintsForLabel** Get all uniqueness constraints for a label.

**listContraintsForLabel** Get all constraints for a label.

**listAllConstraints** List all constraints.

**dropUniquenessContstraint** Drop uniqueness constraint for a label and a property.

### Transactions

**beginTransaction** Begin a new transaction.

**addStatementsToTransaction** Execute statements in an open transaction.

**resetTimeoutTransaction** Reset transaction timeout of an open transaction.

**commitTransaction** Commit an open transaction.

**rollbackTransaction** Rollback an open transaction.

**beginAndCommitTransaction** Begin and commit a transaction in one request.

### Changes

**Node id** is now an **integer** not a string.
**cypherQuery** Now supports parameters, Neo4j will cache query and reuse it with different parameters.

### Node operations

**Insert a Node**

    db.insertNode({
        name: 'Darth Vader',
        sex: 'male'
    },function(err, node){
        if(err) throw err;

        // Output node properties.
        console.log(node.data);

        // Output node id.
        console.log(node._id);
    });

**Read a Node**

    db.readNode(12, function(err, node){
        if(err) throw err;

        // Output node properties.
        console.log(node.data);

        // Output node id.
        console.log(node._id);
    });

**Update a Node**

Will remove any assigned properties and replace them with the ones given below.

    db.updateNode(12, {name:'foobar2'}, function(err, node){
        if(err) throw err;

        if(node === true){
            // node updated
        } else {
            // node not found, hence not updated
        }
    });

**Update all nodes with `labels` and `oldProperties`, set the `newProperties` and remove `removeProperties`**
Return nothing if `returnUpdatedNodes` is `false`. Default will return all updated nodes.

* `labels`              String|Array[String]    e.g.: '' or [] or 'User' or ['User', 'Student']
* 'oldProperties'       Object                  e.g.: { userid: '124' }
* `newProperties`       Object                  e.g.: { email: 'fred@example.com' }
* `removeProperties`    Object                  e.g.: ['old_email', 'old_address'] (Optional)
* `returnUpdatedNodes`  Boolean                 e.g.: `false` (Optional, default: `true`)

Will change only the name and remove the old_address of user with userid '123'. The node will be returned in an array because `returnUpdatedNodes` is `true`. You can drop `returnUpdatedNodes` because it's optional and the default is `true`.

    db.updateNodesWithLabelsAndProperties(['User'], { userid: '123' }, { name:'new_name' }, ['old_address'], true, function (err, updatedNodes){
        if(err) throw err;

        if(updatedNodes.length === 1){
            // one node updated
        } else {
            // zero or multiple nodes were updated
        }
    });

**Delete a Node**

    db.deleteNode(12, function(err, node){
        if(err) throw err;

        if(node === true){
            // node deleted
        } else {
            // node not deleted because not found or because of existing relationships
        }
    });

**Delete all nodes with `labels` and `properties`.**
* `labels`          String|Array[String]    e.g.: '', [], 'User', ['User', 'Student']
* 'properties'      Object                  e.g.: { userid: '124' }
Returns the number of deleted nodes e.g.: 1.

  db.deleteNodesWithLabelsAndProperties('User',{ firstname: 'Sam', male: true }, function(err, deletedNodesCount){});
  db.deleteNodesWithLabelsAndProperties(['User','Admin'], { 'name': 'Sam'}, function(err, deletedNodesCount){});


**Merge (find-or-create) a Node**

Finds a node by labels and identity properties. If no matching node exists, creates one. Returns an object `{ node, created }` where `node` contains the node data (including `_id`) and `created` is `true` when a new node was created or `false` when an existing node was matched.

* `labels`               String|Array[String]    One or more labels for the node
* `identityProperties`   Object                  Properties used to find/match the node (part of the MERGE condition)
* `createProperties`     Object (optional)       Properties set only when creating a new node (ON CREATE SET)
* `updateProperties`     Object (optional)       Properties set only when matching an existing node (ON MATCH SET)
* `callback`             Function                `callback(err, { node, created })`

**create-only vs update-on-match:**

Properties in `createProperties` are written to the node only when it is first created. If a matching node already exists these properties are ignored, so they will not overwrite existing values. Properties in `updateProperties` are written only when a matching node is found; they are not applied when a new node is created.

*Single label example:*

    db.mergeNode('User', { email: 'alice@example.com' }, { name: 'Alice', age: 30 }, function(err, result){
        if(err) throw err;

        console.log(result.created); // true on first call, false on subsequent calls
        console.log(result.node);    // { _id: 42, email: 'alice@example.com', name: 'Alice', age: 30 }
    });

    // Second call with same identity: matches existing node, createProperties are ignored
    db.mergeNode('User', { email: 'alice@example.com' }, { name: 'Ignored', age: 99 }, function(err, result){
        console.log(result.created); // false
        console.log(result.node.name); // 'Alice' — not overwritten
    });

*Single label with update-on-match:*

    db.mergeNode('User', { email: 'alice@example.com' }, { name: 'Alice' }, { lastLogin: '2024-01-15' }, function(err, result){
        if(err) throw err;

        // If the node already existed, lastLogin is updated; name is NOT overwritten.
        // If the node was just created, name is set but lastLogin is NOT set.
        console.log(result.created);
        console.log(result.node);
    });

*Multiple labels example:*

    db.mergeNode(['User', 'Admin'], { email: 'admin@example.com' }, { name: 'Admin User', role: 'superuser' }, function(err, result){
        if(err) throw err;

        console.log(result.created); // true if new, false if matched
        console.log(result.node);    // { _id: ..., email: 'admin@example.com', name: 'Admin User', role: 'superuser' }
    });

*Bare merge (no extra properties):*

    db.mergeNode('Session', { sessionId: 'abc123' }, function(err, result){
        if(err) throw err;

        console.log(result.created); // true or false
        console.log(result.node);    // { _id: ..., sessionId: 'abc123' }
    });


### Relationship operations

**Insert a Relationship**

    db.insertRelationship(root_node_id, other_node_id, 'RELATIONSHIP_TYPE', {
        age: '5 years',
        sideeffects: {
            positive: 'happier',
            negative: 'less time'
        }}, function(err, relationship){
            if(err) throw err;

            // Output relationship properties.
            console.log(relationship.data);

            // Output relationship id.
            console.log(relationship._id);

            // Output relationship start_node_id.
            console.log(relationship._start);

            // Output relationship end_node_id.
            console.log(relationship._end);
    });

**Read a Relationship**

    db.readRelationship(relationship_id, function(err, relationship){
        if(err) throw err;

        // Same properties for relationship object as with InsertRelationship
    });

**Update a Relationship**

Will remove any assigned properties and replace them with the ones given below.

    db.updateRelationship(relationship_id, {
            age: '6 years'
        }, function(err, relationship){
            if(err) throw err;

            if(relationship === true){
                // relationship updated
            } else {
                relationship not found, hence not updated.
            }
    });

**Delete a Relationship**

    db.deleteRelationship(relationship_id, function(err, relationship){
        if(err) throw err;

        if(relationship === true){
            // relationship deleted
        } else {
            // relationship not deleted because not found.
        }
    });


### Index operations

This documentation only contains calls to Node specific index functions however to call those functions for Relationships, just replace `Node` with `Relationship`.

**Insert an Index**

    db.insertNodeIndex('the_index_name', function(err, result){
        if (err) throw err;

        console.log(result); // return the index template and configuration
    });

    // insert an index with a custom configuration
    db.insertNodeIndex({
        index: 'the_index_name',
        config: {
            type: 'fulltext',
            provider: 'lucene'
        }
    }, function(err, result){
        if (err) throw err;

        console.log(result); // return the index template with its custom configuration
    });

**Delete an Index**

    db.deleteNodeIndex('the_index_name', function(err, result){
        if (err) throw err;

        console.log(result) // will be true, if the deletion is successful
    });

**List all Indexes**

    db.listNodeIndexes(function(err, result){
        if (err) throw err;

        console.log(result); // an object with all indexes and their templates and configurations
    });

**Add a node to an index**

    db.addNodeToIndex(node_id, 'the_index_name', 'an_indexed_key', 'an_indexed_value', function(err, result){
        if (err) throw err;

        console.log(result); // will return the index
    });

### Advanced relationship operations

**Get all relationship types used within the Neo4j database**

Will also return types of those relationships that have been deleted.

    db.readRelationshipTypes(function(err, result){
        if(err) throw err;

        console.log(result); // eg. ['RELATED_TO', 'LOVES', 'KNOWNS']
    });

**Get relationships of a node**

Get all (incoming and outgoing) relationships of a node, or use the options object to filter for specifc types and directions.

    db.readRelationshipsOfNode(node_id, {
        types: ['RELATED_TO', ...] // optional
        direction: 'in' // optional, alternative 'out', defaults to 'all'
        }, function(err, relationships) {
            if (err) throw err;

            console.log(relationships); // delivers an array of relationship objects.
    });

**Run a cypher query against Neo4j**

    db.cypherQuery("START user = node(123) MATCH user-[:RELATED_TO]->friends RETURN friends", function(err, result){
        if(err) throw err;

        console.log(result.data); // delivers an array of query results
        console.log(result.columns); // delivers an array of names of objects getting returned
    });

**Run a batch query against Neo4j**

For more information about what queries are possible checkout the [Neo4j REST API documentation](http://docs.neo4j.org/chunked/stable/rest-api-batch-ops.html).

    db.batchQuery([
        {
            method: "GET",
            to: "/node/100",
            id: 0
        },{
            method: "GET",
            to: "/node/102",
            id: 1
        }
    ], function(err, result){
        if(err) throw err;

        console.log(result); // delivers an array of query results
    });

## Tests

This API wrapper relies on [mocha](https://github.com/visionmedia/mocha) for testing, therefore when you want to run the tests follow the steps below.

    $ git clone git://github.com/philippkueng/node-neo4j.git
    $ cd node-neo4j/
    $ npm install
    $ npm test

## Issues or Feature Requests?

In case you run into an issue while using the wrapper or you have a feature request please let me know by [creating a new issue](https://github.com/philippkueng/node-neo4j/issues) or contacting me via [twitter](https://twitter.com/philippkueng).

## Development

When making a pull request, please make sure to make it against the develop branch and make sure to install the git pre-commit hook which enforces a shared coding style.

    ln -s ../../pre-commit.sh .git/hooks/pre-commit
