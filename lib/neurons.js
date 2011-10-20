//###################################################################################################
// Neuron factory
/*

    - Add programm path
    - Add dependencies
    - Add INHERITACE :D


    - Add error handling to module loading
    - IMPROVE ERROR HANDLING ( like always xD )
    
*/
    
//###################################################################################################
module.exports = (function () {
    /////////////////////////////////////////////////////////////////////////////////////////////////

   
    var scope = {};
    ////=============================================================================================
    // Requirements
        
    scope.events = require('events');
    scope.util = require('util');
    scope.fs = require('fs');
    
    ////=============================================================================================
    // Propertys

    scope.eventBus = new scope.events.EventEmitter();
    scope.config = null;
    scope.neuronList = [];
    scope.namespace = {};

    ////=============================================================================================
    // Methods
    
    ////-----------------------------------------------------------------------------------------
    // Initialize
    scope.init = function() {
        process.addListener("unhandledException", function (err) {
            console.log(err);
        });

        scope.eventBus.on('onError', scope.onError);
    };
    ////-----------------------------------------------------------------------------------------
    // Set config avalible to all newly created templates
    scope.setConfig = function(configfile) {
        if( configfile !== undefined ){
            var localconfig = JSON.parse(scope.fs.readFileSync(configfile));
            
            if( localconfig )
                scope.config = localconfig;
        }            
    };

    ////-----------------------------------------------------------------------------------------
    // Create an object with an own context defined by a Template
    scope.create = function(template) {

        function Template(config) {
            var self = {};
            self.events = scope.eventBus;
            
            // Add name
            if( template.name ) {
                self.name = template.name;
            }
    
            // Add defined properties to the object
            if( template.properties ) {
                for( var property in template.properties ) {
                    if( template.properties.hasOwnProperty(property) ) {
                        if( typeof(template.properties[property]) === 'string' )
                            self[template.properties[property]] = null;
                        else
                            self[template.properties[property].name] = template.properties[property].value;                                
                    }
                }
            }
            
            // Add required modules to the object
            if( template.modules ) {
                for( var module in template.modules ) {
                    if( template.modules.hasOwnProperty(module) ) {
                        if( typeof(template.modules[module]) === 'string' )
                            self[template.modules[module]] = require(template.modules[module]);
                        else
                            self[template.modules[module].name] = require(template.modules[module].value);
                    }
                }
            }
            
            // Add methods to the object
            if( template.methods ) {
                for( var method in template.methods ) {
                    if( template.methods.hasOwnProperty(method) ) {
                        self[template.methods[method].name] = template.methods[method];

                    }
                }
            }
            
            
            var returns = {};
            
            // Create external function definitions
            if( template.exports ) {
                for( var exportdefine in template.exports ) {
                    if( template.exports.hasOwnProperty(exportdefine) ) {
                        if( typeof(self[template.exports[exportdefine]]) === 'function' ) {
                            this[template.exports[exportdefine]] = function(){
                                return self[template.exports[exportdefine]].apply(self,arguments);
                            };
                            returns[template.exports[exportdefine]] = this[template.exports[exportdefine]];
                        }
                        else {
                            returns[template.exports[exportdefine]] = self[template.exports[exportdefine]];
                        }
                    }
                }
                               
            }            
            
            // Connect slots
            if( template.slots ) {
                for( var slot in template.slots ) {
                    if( template.slots.hasOwnProperty(slot) ) {
                        self[template.slots[slot].name] = template.slots[slot];
                        this[template.slots[slot].name] = function(){
                            self[template.slots[slot].name].apply(self,arguments);
                        };
                        self.events.addListener(template.slots[slot].name, this[template.slots[slot].name]);
                        returns[template.slots[slot].name] = this[template.slots[slot].name];
                        
                    }
                }
            }
            
            // Add Init function to object
            if( template.init ) {
                self.init = template.init;
            }

            // Add Exit function to object
            if( template.exit ) {
                self.exit = template.exit;
            }
            
            if( self.exit )
                self.events.on('exit', function() {
                    self.exit.apply(self,arguments);
                });

            // Add config if avalible
            if( config !== null ) {
                if( config[template.name] !== undefined ) {
                    self.config = config[template.name];
                }
            }
            
            if( self.init )
                self.init();

            return returns; 
            
        }
        
        return new Template(scope.config);
    
    };

    ////-----------------------------------------------------------------------------------------
    //  Create module and add it to the list 
    scope.load = function(template) {
        if( !template.name ) {
            console.log('You have to set a module name');
            return;
        }
        
        if( !template.depends || template.depends.length <= 0) {
            var object = scope.create(template);
            if(object) {
                scope.neuronList.push({
                    name: template.name,
                    template: template,
                    object: object
                });
            }
            if( !scope.namespace[template.name] )
                scope.namespace[template.name] = object;
            else
                console.log('already loaded module with that name');
            
            return object; 
        }
        else {
            console.log('please implement :) ');
        }
        
    };
    
    ////-----------------------------------------------------------------------------------------
    //  Load from file
    scope.loadFile = function(filename) {
        var object = require(filename);
        scope.load(object);
    };

    ////-----------------------------------------------------------------------------------------
    //  Get access to a module from the list 
    scope.get = function(name) {
        console.log(a);
    };
    
    scope.onError = function(err) {
        console.log('works');
    };
        
        
    ////=============================================================================================

    process.on('exit', function(){
        scope.eventBus.emit('exit');
    });

    ////=============================================================================================
    // Call Constructor
    scope.init();
    
    
    /////////////////////////////////////////////////////////////////////////////////////////////////
    
    ////=============================================================================================
    // External functions
    scope.namespace.create = scope.create;
    scope.namespace.exit = scope.exit;
    scope.namespace.load = scope.load;
    scope.namespace.loadFile = scope.loadFile;
    scope.namespace.events = scope.eventBus;
    scope.namespace.setConfig = scope.setConfig;
    
    return scope.namespace;

})();
