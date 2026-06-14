'use strict';

// Graph utils for cypher queries
exports.where = where;
exports.set = set;
exports.remove = remove;
exports.whereSetProperties = whereSetProperties;
exports.mergeProperties = mergeProperties;
exports.labels = labels;
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

// Build the inner part of a MERGE pattern (the `key: {placeholder}` pairs that
// go between the curly braces) together with the optional `ON CREATE SET` and
// `ON MATCH SET` clauses. Every value gets a unique placeholder (mp_1, mp_2, ...)
// using a single shared counter, so identity, create-only and update-on-match
// properties never collide even when they share a key name.
// Example:
//   mergeProperties('data', { uid: 1 }, { created: true }, { lastSeen: 2 })
//   returns {
//     pattern: "uid: {mp_1}",
//     onCreate: "data.created={mp_2}",
//     onMatch: "data.lastSeen={mp_3}",
//     properties: { mp_1: 1, mp_2: true, mp_3: 2 }
//   }

function mergeProperties (fieldName, identity, onCreate, onMatch) {
  var prefix = 'mp_',
    counter = 0,
    props = {};

  // `key: {placeholder}` pairs used inside the MERGE braces.
  function buildPattern (obj) {
    var clause = '',
      notFirst = false;
    for (var key in obj) {
      if (notFirst)
        clause += ', ';
      else
        notFirst = true;
      clause += key + ': {' + prefix + (++counter) + '}';
      props[prefix + counter] = obj[key];
    }
    return clause;
  }

  // `field.key={placeholder}` assignments used inside a SET clause.
  function buildSet (obj) {
    var clause = '',
      notFirst = false;
    for (var key in obj) {
      if (notFirst)
        clause += ',';
      else
        notFirst = true;
      clause += fieldName + '.' + key + '={' + prefix + (++counter) + '}';
      props[prefix + counter] = obj[key];
    }
    return clause;
  }

  return {
    pattern: buildPattern(identity),
    onCreate: onCreate ? buildSet(onCreate) : '',
    onMatch: onMatch ? buildSet(onMatch) : '',
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

function jsonToURL (jsonData) {
  var result = '';
  var notFirst = false;
  for(var key in jsonData){
    if(notFirst) result += '&'; else notFirst = true;
    result += encodeURIComponent(key) + '=' + encodeURIComponent(JSON.stringify(jsonData[key]));    
  }
  return result;
}