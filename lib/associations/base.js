'use strict';

var _ = require('lodash');

var Association = function() {};

// Normalize input - may be array or single obj, instance or primary key - convert it to an array of built objects
Association.prototype.toInstanceArray = function (objs) {
  if (!Array.isArray(objs)) {
    objs = [objs];
  }
  return objs.map(function(obj) {
    if (!(obj instanceof this.target.Instance)) {
      var tmpInstance = {};
      tmpInstance[this.target.primaryKeyAttribute] = obj;
      return this.target.build(tmpInstance, {
        isNewRecord: false
      });
    }
    return obj;
  }, this);
};

Association.prototype.inspect = function() {
  return this.as;
};

Association.prototype.handleKeyOption = function(options,model,defaultname,defaulttype) {
	var name = ( _.isObject(options) ? ( options.name || options.fieldName ) : options ) || defaultname;
	var attribute = {};

	if (model.rawAttributes[name]) {
		attribute = model.rawAttributes[name];
		if (_.isObject(options)) {
			_.merge(attribute,options);
		}
	}
	else {
		var defaultattr = {
			name: name,
			type: defaulttype || model.rawAttributes[model.primaryKeyAttribute].type,
			field: name,
			allowNull: true
		};

		//attribute is empty object, use options if it's an object, default to above settings
		_.defaults(attribute, ( _.isObject(options) ? options : {} ), defaultattr);
		model.rawAttributes[name] = attribute;
	}


	return attribute;
};

module.exports = Association;
