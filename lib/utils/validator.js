'use strict';

function Validator (errors) {	
	if(errors) {
		this.errors = errors;
		this.hasErrors = true;
	} else {
		this.errors = '';
		this.hasErrors = false;
	}
}

function isPositiveInteger(integer) {
	return typeof integer === 'number' && integer % 1 === 0 && integer >= 0;
}

Validator.prototype = {
	nodeId: function(nodeId) {
		var errorMsg = '"nodeId" should be a positive integer.';
		if(isPositiveInteger(nodeId))
			return this;
		return this.addError(errorMsg);
	},
	label: function(label) {
		var errorMsg = '"Label" should be a non-empty string.';
		if(label && typeof label === 'string' && label !== '')
			return this;

		return this.addError(errorMsg);
	},
	// "Labels" should be a non-empty string or an array of non-empty strings.
	labels: function(labels) {
		var errorMsg = '"Labels" should be a non-empty string or an array of non-empty strings.';
		if(labels && ((typeof labels === 'string' && labels !== '') || labels instanceof Array))
			return this;
		return this.addError(errorMsg);		
	},	
	property: function(property) {
		var errorMsg = '"property" should be a non-empty string.';
		if(property && typeof property === 'string' && property !== '')
			return this;

		return this.addError(errorMsg);
	},
	properties: function(properties) {
		var errorMsg = '"properties" should be json.';
		if(properties && typeof properties === 'object')
			return this;

		return this.addError(errorMsg);
	},
	// "labels" must be a non-empty string or a non-empty array of non-empty strings.
	// Stricter than `labels` because a merge always needs at least one real label.
	requiredLabels: function(labels) {
		var errorMsg = '"labels" should be a non-empty string or a non-empty array of non-empty strings.';
		if(typeof labels === 'string') {
			if(labels !== '')
				return this;
			return this.addError(errorMsg);
		}
		if(labels instanceof Array && labels.length >= 1) {
			for(var i = 0; i < labels.length; i++) {
				if(typeof labels[i] !== 'string' || labels[i] === '')
					return this.addError(errorMsg);
			}
			return this;
		}
		return this.addError(errorMsg);
	},
	// Identity properties must be a plain object holding at least one key.
	identityProperties: function(properties) {
		var errorMsg = '"identityProperties" should be a non-empty object.';
		if(properties && typeof properties === 'object' && !(properties instanceof Array) && Object.keys(properties).length >= 1)
			return this;

		return this.addError(errorMsg);
	},
	// Optional property bags (e.g. onCreate / onMatch). When provided they must be
	// a plain object; `undefined`/`null` are allowed and treated as "not provided".
	optionalProperties: function(properties, name) {
		var errorMsg = '"' + (name || 'properties') + '" should be an object.';
		if(typeof properties === 'undefined' || properties === null)
			return this;
		if(typeof properties === 'object' && !(properties instanceof Array))
			return this;

		return this.addError(errorMsg);
	},
	transaction: function(transactionId) {
		var errorMsg = '"transactionId" should be a an integer.';
		if(isPositiveInteger(transactionId))
			return this;

		return this.addError(errorMsg);
	}
};

Validator.prototype.addError = function addError(errorMsg) {
	this.hasErrors = true;
	this.errors += errorMsg + '\n';
	return this;
}

Validator.prototype.error = function error() {	
	return new Error(this.errors);
}

module.exports = Validator;