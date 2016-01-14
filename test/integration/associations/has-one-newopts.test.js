'use strict';

/* jshint -W030 */
var chai = require('chai')
  , expect = chai.expect
	, Association = require('../../../lib/associations/index');

describe('describe test', function() {
	it('it test', function() {
		var User = this.sequelize.define('User', {})
			, Addr = this.sequelize.define('Address', {});

		var assoc = User.hasOne(Addr, {foreignKey: 'test_key'});

		return this.sequelize.sync({force: true}).then(function(){
			//expect(User.sourceKey).to.equal('id');
			//expect(User.targetKey).to.equal('test_key');
			
			expect(assoc).to.be.an.instanceOf(Association);
			expect(assoc.sourceKey).to.equal('id');
			expect(assoc.targetKey).to.equal('test_key');
		});
	});
});

describe('describe test', function() {
	it('it test', function() {
		var User = this.sequelize.define('User', {})
			, Addr = this.sequelize.define('Group', {});

		var assoc = User.hasOne( Addr, {sourceKey: 'name', targetKey: 'user_name'} );

		return this.sequelize.sync({force: true}).then(function(){
			expect(assoc).to.be.an.instanceOf(Association);
			expect(assoc.sourceKey).to.equal('name');
			expect(assoc.targetKey).to.equal('user_name');
		});


		//expect(Object.keys(Group.associations)).to.deep.equal(['User', 'primaryUsers', 'secondaryUsers']);
	});
});

