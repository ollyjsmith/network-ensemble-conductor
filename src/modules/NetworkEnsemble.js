var NetworkConnectionConfiguration = require( './NetworkConnectionConfiguration.js' );
var PacketDistributor = require( './PacketDistributor.js' );
var NetworkDevices = require( './NetworkDevices.js' );
var AudioOut = require( './AudioOut.js' );
var OSCOut = require( './OSCOut.js' );

var NetworkEnsemble = function(){
	var that = this;

	this.modes = [];

	this.interfaces = [];
	this.interface = null;
	this.oscPort = 12099;

	this.filterCategories = [];

	this.maxPacketPulseSpeed = 50;

	NetworkDevices.list( function( list ){
		console.log( list );
		that.interfaces = list;
		that.onReady();
	});
}

NetworkEnsemble.prototype = {
	onReady: function(){ /* ... override ... */ },
	_onReady: function(){
		if( typeof this.onReady === 'function' ){
			this.onReady();
		}
	},
	setInterface: function( _interface ){
		console.log( typeof _interface, this.interfaces );
		if( typeof _interface === 'string' ){
			if( this.interfaces.indexOf( _interface ) !== -1 ){
				this.interface = _interface;
				return this.interface;
			} 
			return false;
		} 
		if (typeof _interface === 'number' ){
			if( _interface < 0 || _interface > this.interfaces.length - 1){
				return false;
			}
			this.interface = this.interfaces[ _interface ]; 
			return this.interface;
		}
		return false;
	},
	setFilter: function( _categories ){
		if( _categories.length === 0 ){
			this.filterCategories = [];
		} else {
			for( var i = 0; i < _categories.length; i++ ){
				var cat = _categories[i].split('');
				cat[0] = cat[0].toUpperCase();
				_categories[i] = cat.join('');
			}
			this.filterCategories = [].concat( _categories );
		}
	},
	setMode: function( _modes ){
		this.modes = [];
		if( _modes.indexOf( 'raw' ) === -1 && _modes.indexOf( 'packets' ) === -1 ){
			this.audioOut.setMode( 'mute' )
		} else {			
			if( _modes.indexOf( 'packets' ) !== -1 ){
				this.audioOut.setMode( 'packet' )
				this.modes.push('packet');
			}
			if( _modes.indexOf( 'raw' ) !== -1 ){
				this.audioOut.setMode( 'raw' )
				this.modes.push('raw');
			}
		}
		if( _modes.indexOf( 'osc' ) !== -1 ){
			this.OSCOut.start();
			this.modes.push('osc');
		} else {
			this.OSCOut.stop();
		}

	},
	setRawSpeed: function( _speed ){
		if( _speed < 0 ) _speed = 0;
		if( _speed > 1 ) _speed = 1;
		var repeat = Math.ceil((_speed * 1023) + 1);
		this.audioOut.setSampleRepeat( repeat );
	},
	run: function( callback ){
		var that = this;
		if( !!this.interface === false ){ 
			if( typeof callback === 'function' ) callback( 'Cannot run. No Interface Set?' ); 
			return false;
		}
		this.audioOut = new AudioOut();
		this.OSCOut = new OSCOut( this.oscPort );
		this.netConf = new NetworkConnectionConfiguration( this.interface );
		this.packetDistributor = new PacketDistributor(  this.interface, 1000 );
		this.packetDistributor.setMode( 'EQUALLY' );
		
		this.audioOut.run();

		this.netConf.up( function(){
			console.log( 'netconf up' );
			that.packetDistributor.run();	
			if( typeof callback === 'function' ) callback( null );
		});
		
		this.packetDistributor.onPacket = function( packet ){
			if( that.modes.indexOf( 'raw' ) !== -1 ){
				that.audioOut.addPacket( packet );
			} else if( that.filterCategories.indexOf( packet.type.category ) !== -1 ){
				that.audioOut.addPacket( packet );
			}

			if( that.filterCategories.indexOf( packet.type.category ) !== -1 ){
				that.OSCOut.addPacket( packet );
			}
		}
	},
	stop: function(){
		this.packetDistributor.stop();
		console.log( 'NetworkEnsemble.stop() May not be fully Implemented.' );
	},
};


module.exports = NetworkEnsemble;