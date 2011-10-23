//###################################################################################################
// NEO Neuron Objects
// Class like conept in Node.js
/*
    - Test dependencies
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

    scope.path = process.cwd();
    scope.eventBus = new scope.events.EventEmitter();
    scope.config = null;
    scope.debug = false;
    scope.neurons = {};
    scope.namespace = {};

    ////=============================================================================================
    // Methods

    ////---------------------------------------------------------------------------------------------
    // Initialize
    scope.init = function() {
        process.addListener("unhandledException", function (err) {
            console.log(err);
        });

        scope.eventBus.on('onError', scope.onError);
    };
    ////---------------------------------------------------------------------------------------------
    // Set config avalible to all newly created templates
    scope.conf = function(configfile) {
        if( configfile !== undefined ){
            
            var localconfig = JSON.parse(scope.fs.readFileSync(configfile));
            
            if( localconfig ){
                scope.config = localconfig;
                if( localconfig.debug !== undefined )
                    scope.debug = localconfig.debug;
            }            
        }
        
        if( !scope.config )
            scope.logDbg('Loading config failed');
        else
            scope.logDbg('Config loaded');
    };

    ////---------------------------------------------------------------------------------------------
    // Create an object with an own context defined by a Template
    scope.createObject = function(template, ready) {

        function Template() {
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

//            // Add methods to the object
//            if( template.methods ) {
//                template.methods.forEach(function (val, index, array) {
//                    self[template.methods[method].name] = template.methods[method];
//                });
//            }
            
            
            
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
                
                self.events.on('exit',function(exitReady) {
                    self.exit.apply(self,[exitReady]);
                });

            }
            
                
            // Add config if avalible
            if( scope.config !== null ) {
                if( scope.config[template.name] !== undefined ) {
                    self.config = scope.config[template.name];
                    self.config.path = scope.path;
                }
                else {
                    scope.logDbg('No config for '+template.name);
                }
            }
            
            // Call init
            if( self.init )
                self.init.apply(self, [ready]);

            return returns; 
            
        }
        
        return new Template();
    
    };

    ////-----------------------------------------------------------------------------------------
    //  Add module to the list 
    scope.add = function(what, ready) {
        var self = this;
        var template = undefined;
        
        // Filename or object
        if( typeof(what) === 'string' )
            template = require(what);
        else
            template = what;

        // Has a name
        if( !template.name ) {
            scope.logDbg('You have to set a module name');
            ready();
            return;
        }

        // Module exists?
        if( scope.neurons[template.name] ) {
            scope.logDbg('Cannot add, exists');
            ready();
            return;
        }

        // Create module entry
        scope.neurons[template.name] = {
            name: template.name,
            template: template,
            loaded: false,
            loading: false,
            ready: ready, 
            missing: [],
            object: undefined
        };
        
        // Recheck dependencies
        scope.recheck();
    };
    
    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies
    scope.recheck = function() {
        // Every element
        for( var ele in scope.neurons ) {
            if( scope.neurons.hasOwnProperty(ele) ) {
                var neuron = scope.neurons[ele];
                
                // When loaded deps dont matter
                if( neuron.loaded )
                    continue;
                    
                var allDeps = [];
                if( neuron.template.inherits )
                    allDeps.concat(neuron.template.inherits);

                if( neuron.template.depends )
                    allDeps.concat(neuron.template.depends);
                
                // there are deps
                if( allDeps.length > 0 )
                    neuron.missing.splice(0);
                else
                    continue;
                    
                // Check all dependencies
                for( var dep in allDeps ) {
                    if( allDeps.hasOwnProperty(dep) ) {
                        var depname = allDeps[dep];
                        // Look if dependencie is loaded
                        if( !scope.neurons[depname] || scope.neurons[depname].loaded !== true ) {
                            scope.logDbg(neuron.template.name+' misses '+depname);                        
                            neuron.missing.push(depname);
                        }
                    }
                }
            }
        }
        
        for( var ele2 in scope.neurons ) {
            if( scope.neurons.hasOwnProperty(ele2) ) {
                var neuron2 = scope.neurons[ele2];
                
                if( !neuron2.loaded                  && 
                    !neuron2.loading                 &&
                    neuron2.missing.length === 0     ) {
                    neuron2.loading = true;
                    scope.load(neuron2);
                    return;
                }
            }
        }                                      
    };
    
    ////-----------------------------------------------------------------------------------------
    //  Load and create module
    scope.load = function(neuron) {
        scope.logDbg('Loading '+neuron.template.name);
        var tmpObject = scope.createObject(neuron.template, function() {
            if( tmpObject ) {
                neuron.object = tmpObject;
                neuron.loaded = true;
                neuron.loading = false;
                scope.namespace[neuron.template.name] = neuron.object;
                neuron.ready();
            }
        });
    };

    ////-----------------------------------------------------------------------------------------
    //  Get access to a module from the list 
    scope.onError = function(err) {
        console.log('Bad error occured');
    };
        
    ////-----------------------------------------------------------------------------------------
    //  Destruction
    scope.exit = function(ready) {
        var refcounter = 0;
        
        for( var neuron in scope.neurons ) {
            if( scope.neurons.hasOwnProperty(neuron) ) {
                if( scope.neurons[neuron].template.exit )
                    refcounter++;
            }
        }
        
        scope.eventBus.emit('exit', function() {
            if( refcounter === 0 )
                ready();    
            else
                refcounter--;
        });
    };
    
    ////-----------------------------------------------------------------------------------------
    //  Destruction
    scope.logDbg = function(msg) {
        if( scope.debug ) {
            console.log('[neo]'+msg);
        }
    };
            
    


    ////=============================================================================================

    ////=============================================================================================
    // Call Constructor
    scope.init();
    
    
    /////////////////////////////////////////////////////////////////////////////////////////////////
    
    ////=============================================================================================
    // External functions
    //scope.namespace.create = scope.create;
    scope.namespace.add = scope.add;
    scope.namespace.create = scope.create;
    scope.namespace.load = scope.load;
    scope.namespace.conf = scope.conf;
    scope.namespace.events = scope.eventBus;
    scope.namespace.exit = scope.exit;
    
    return scope.namespace;

})();