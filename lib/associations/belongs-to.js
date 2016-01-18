'use strict';

var Utils = require('./../utils')
  , Helpers = require('./helpers')
  , _ = require('lodash')
  , Transaction = require('../transaction')
  , Association = require('./base')
  , util = require('util');

//var setForeignKeys = function(options) {
  //this.sourceKeyAttribute = {};

  //if (_.isObject(options.foreignKey)) {
    //this.sourceKeyAttribute = options.foreignKey;
    //this.sourceKey = this.sourceKeyAttribute.name || this.sourceKeyAttribute.fieldName;
		//this.sourceField = this.sourceKeyAttribute.field;
  //} else if (options.foreignKey) {
    //this.sourceKey = options.foreignKey;
  //}

  //if (!this.sourceKey) {
    //this.sourceKey = Utils.camelizeIf(
      //[
        //Utils.underscoredIf(this.as, this.source.options.underscored),
        //this.target.primaryKeyAttribute
      //].join('_'),
      //!this.source.options.underscored
    //);
  //}

	//if (!this.sourceField) {
		//if (this.source.rawAttributes[this.sourceKey]) {
			//this.sourceField = this.source.rawAttributes[this.sourceKey].field || this.sourceKey;
		//} else {
			//this.sourceField = this.sourceKey;
		//}
	//}

  //this.targetKey = options.targetKey || this.target.primaryKeyAttribute;
  //this.targetField = this.target.rawAttributes[this.targetKey].field || this.targetKey;
//};

/**
 * One-to-one association
 *
 * In the API reference below, replace `Assocation` with the actual name of your association, e.g. for `User.belongsTo(Project)` the getter will be `user.getProject()`.
 *
 * @mixin BelongsTo
 */
var BelongsTo = function(source, target, options) {
  Association.call(this);

  this.associationType = 'BelongsTo';
  this.source = source;
  this.target = target;
  this.options = options;
  this.scope = options.scope;
  this.isSingleAssociation = true;
  this.isSelfAssociation = (this.source === this.target);
  this.as = this.options.as;

  if (this.as) {
    this.isAliased = true;
    this.options.name = {
      singular: this.as
    };
  } else {
    this.as = this.target.options.name.singular;
    this.options.name = this.target.options.name;
  }

	var default_source = Utils.camelizeIf(
		Utils.underscoredIf(this.options.as || Utils.singularize(this.target.name), this.source.options.underscored)
			+ '_' + this.target.primaryKeyAttribute,
		!this.target.options.underscored
	);

	var default_target = this.target.primaryKeyAttribute;
	var default_source_type = this.options.keyType || this.target.rawAttributes[this.target.primaryKeyAttribute || options.targetKey].type;

	this.targetAttribute = this.handleKeyOption( options.targetKey, this.target, default_target);
		this.targetKey = this.targetAttribute.name || this.targetAttribute.fieldName || this.targetAttribute.field;
		this.targetField = this.targetAttribute.field || this.targetKey;

	this.sourceAttribute = this.handleKeyOption( options.sourceKey || options.foreignKey, this.source, default_source, default_source_type );
		this.sourceKey = this.sourceAttribute.name || this.sourceAttribute.fieldName || this.sourceAttribute.field;
		this.sourceField = this.sourceAttribute.field || this.sourceKey;

  this.associationAccessor = this.as;
  this.options.useHooks = options.useHooks;

  // Get singular name, trying to uppercase the first letter, unless the model forbids it
  var singular = Utils.uppercaseFirst(this.options.name.singular);

  this.accessors = {
    /**
     * Get the associated instance.
     *
     * @param {Object} [options]
     * @param {String|Boolean} [options.scope] Apply a scope on the related model, or remove its default scope by passing false.
     * @param {String} [options.schema] Apply a schema on the related model
     * @return {Promise<Instance>}
     * @method getAssociation
     */
    get: 'get' + singular,
    /**
     * Set the associated model.
     *
     * @param {Instance|String|Number} [newAssociation] An instance or the primary key of an instance to associate with this. Pass `null` or `undefined` to remove the association.
     * @param {Object} [options] Options passed to `this.save`
     * @param {Boolean} [options.save=true] Skip saving this after setting the foreign key if false.
     * @return {Promise}
     * @method setAssociation
     */
    set: 'set' + singular,
    /**
     * Create a new instance of the associated model and associate it with this.
     *
     * @param {Object} [values]
     * @param {Object} [options] Options passed to `target.create` and setAssociation.
     * @return {Promise}
     * @method createAssociation
     */
    create: 'create' + singular
  };
};

util.inherits(BelongsTo, Association);

// the id is in the source table
BelongsTo.prototype.injectAttributes = function() {

  if (this.options.constraints !== false) {
    this.options.onDelete = this.options.onDelete || ( this.source.rawAttributes[this.sourceKey].allowNull ? 'SET NULL' : 'NO ACTION');
    this.options.onUpdate = this.options.onUpdate || 'CASCADE';
  }

  Helpers.addForeignKeyConstraints(this.source.rawAttributes[this.sourceKey], this.target, this.source, this.options, this.targetField);

  this.source.refreshAttributes();
	this.target.refreshAttributes();

  Helpers.checkNamingCollision(this);

  return this;
};

// Add getAssociation method to the prototype of the model instance
BelongsTo.prototype.injectGetter = function(instancePrototype) {
  var association = this;

  instancePrototype[this.accessors.get] = function(options) {
    var where = {};
    where[association.targetKey] = this.get(association.sourceKey);

    options = association.target.$optClone(options) || {};

    options.where = {
      $and: [
        options.where,
        where
      ]
    };

    if (options.limit === undefined) options.limit = null;

    var model = association.target;
    if (options.hasOwnProperty('scope')) {
      if (!options.scope) {
        model = model.unscoped();
      } else {
        model = model.scope(options.scope);
      }
    }

    if (options.hasOwnProperty('schema')) {
      model = model.schema(options.schema, options.schemaDelimiter);
    }

    return model.find(options);
  };

  return this;
};

// Add setAssociaton method to the prototype of the model instance
BelongsTo.prototype.injectSetter = function(instancePrototype) {
  var association = this;

  instancePrototype[this.accessors.set] = function(associatedInstance, options) {
    options = options || {};

    var value = associatedInstance;
    if (associatedInstance instanceof association.target.Instance) {
      value = associatedInstance[association.targetKey];
    }

    this.set(association.sourceKey, value);

    if (options.save === false) return;

    options = _.extend({
      fields: [association.sourceKey],
      allowNull: [association.sourceKey],
      association: true
    }, options);


    // passes the changed field to save, so only that field get updated.
    return this.save(options);
  };

  return this;
};

// Add createAssociation method to the prototype of the model instance
BelongsTo.prototype.injectCreator = function(instancePrototype) {
  var association = this;

  instancePrototype[this.accessors.create] = function(values, fieldsOrOptions) {
    var instance = this
      , options = {};

    if ((fieldsOrOptions || {}).transaction instanceof Transaction) {
      options.transaction = fieldsOrOptions.transaction;
    }
    options.logging = (fieldsOrOptions || {}).logging;

    return association.target.create(values, fieldsOrOptions).then(function(newAssociatedObject) {
      return instance[association.accessors.set](newAssociatedObject, options);
    });
  };

  return this;
};

module.exports = BelongsTo;
