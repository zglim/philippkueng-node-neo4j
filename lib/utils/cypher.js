'use strict';

// Graph utils for cypher queries
exports.where = where;
exports.set = set;
exports.remove = remove;
exports.whereSetProperties = whereSetProperties;
exports.labels = labels;
exports.relationshipPattern = relationshipPattern;
exports.jsonToURL = jsonToURL;

/*  Internal method
    Example:
    params('city', {name: 'Aalst', postalcode: 9300})
    returns city.name={name} appendToken city.postalcode={postalcode} */

function append (fieldName, props, appendToken) {
  var params = '';
  var notFirst = false;
  fieldName += '.';
  for (var key in props) {
    var obj = props[key];
    if(notFirst)
      params += appendToken;
    else
      notFirst = true;
    params += fieldName + key + '={'+ key + '}';
  }
  return params;
}

/*  Example:
    where('city', {name: 'Aalst', postalcode: 9300})
    returns city.name={name} AND city.postalcode={postalcode} */

function where (fieldName, props) {
  return append(fieldName, props, ' AND ');
}
/*  Example:
    set('city', {name: 'Aalst', postalcode: 9300})
    returns city.name={name},city.postalcode={postalcode} */

function set (fieldName, props) {
  return append(fieldName, props, ',');
}

/*  Example:
    remove('city', ['name', 'postalcode'])
    returns city.name, city.postalcode */

function remove (fieldName, props) {
  var removes = '',
    notFirst = false,
    i = props.length;

  fieldName += '.';

  while (i--) {    
     if (notFirst) {
      removes += ',';
    } else {
      notFirst = true;
    }
    removes += fieldName + props[i];
  }

  return removes;
}


// Create a `where` and `set` string and a new object with unique propertynames
// Example:
// whereSetProperties('user', {userid: 123, firstname: 'foo'}, { firstname: 'bar' })
// returns {
//   where: "user.userid={xQ_1} AND user.firstname={xQ_2}",
//   set: "user.firstname={xQ_3}",
//   props { xQ_1: 123, xQ_2: 'foo', xQ_2: 'bar'}
// }

function whereSetProperties (fieldName, oldProps, newProps) {
  var prefix = 'xQ_',
    whereClause = '',
    setClause = '',
    notFirst = false,
    props = {},
    i = 0,
    obj;
  fieldName += '.';

  // Build WHERE
  for (var k in oldProps) {
    obj = oldProps[k];
    if(notFirst)
      whereClause += ' AND ';
    else
      notFirst = true;
    whereClause += fieldName + k + '={' + prefix + (++i) + '}';

    props[prefix + i] = obj;
  }

  notFirst = false;

  // Build SET
  for (var key in newProps) {
    obj = newProps[key];
    if(notFirst)
      setClause += ',';
    else
      notFirst = true;
    // Create unique placeholder {xx1} {xx2} ...
    setClause += fieldName + key + '={' + prefix + (++i) + '}';
    // Build new properties object
    props[prefix + i] = obj;
  }

  // Return stringified `where` and `set` clause and a new object with unique property names
  // So there are no name collisions
  return {
    where: whereClause,
    set: setClause,
    properties: props
  };
}

// Example:  
//   labels(['User','Student'])
//   returns ':User:Student'

function labels (array) {
  var res = '';
  if(typeof array === 'string') {
    return ':' + array;
  }    
  for (var i = 0; i < array.length; i++) {
    res += ':' + array[i];
  }    
  return res;
}

// Build a relationship pattern fragment for path queries.
// Reused by readShortestPath / readPaths so the type list, direction and the
// (optional) maximum depth are assembled in a single place instead of being
// duplicated across every hand written path string.
//
// Examples:
//   relationshipPattern({ direction: 'all', variableLength: true })
//     returns '-[*]-'
//   relationshipPattern({ direction: 'out', types: 'KNOWS', variableLength: true })
//     returns '-[:KNOWS*]->'
//   relationshipPattern({ direction: 'in', types: ['KNOWS', 'LIKES'], variableLength: true, maxDepth: 4 })
//     returns '<-[:KNOWS|:LIKES*..4]-'

function relationshipPattern (options) {
  options = options || {};
  var inner = '';

  // Relationship type(s): a single string or an array of strings.
  // Multiple types are OR-ed together using the `|:` separator.
  if (options.types) {
    var types = typeof options.types === 'string' ? [options.types] : options.types;
    if (types.length) {
      inner += ':' + types.join('|:');
    }
  }

  // Variable length / maximum depth, e.g. `*` or `*..4`.
  if (options.variableLength || options.maxDepth != null) {
    inner += '*';
    if (options.maxDepth != null) {
      inner += '..' + options.maxDepth;
    }
  }

  var relationship = '[' + inner + ']';

  switch (options.direction) {
    case 'in':
      return '<-' + relationship + '-';
    case 'out':
      return '-' + relationship + '->';
    default:
      return '-' + relationship + '-';
  }
}

function jsonToURL (jsonData) {
  var result = '';
  var notFirst = false;
  for(var key in jsonData){
    if(notFirst) result += '&'; else notFirst = true;
    result += encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(jsonData[key]));    
  }
  return result;
}