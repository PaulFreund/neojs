//###################################################################################################
// NEO Neuron Objects
// Class like conept in Node.js
/*
    - Overall:
        - More beautifull foreach
        - Better error handling
        - Write documentation

    - setConf:
        - Overthink and path
    
    - createTemplate:
        - Check dependencies
        - Inheritance
        - Checking
        - createObject
        
    - createObject:
        - Refactor
        
    - recheck:
        - Refactor
    
    - Misc:
        - Events for loading etc
        - Debug everywhere
        - trycatch...
    

*/
    
//###################################################################################################
module.exports = (function () {
    /////////////////////////////////////////////////////////////////////////////////////////////////
   
    var scope = {};
    ////=============================================================================================
    // Requirements
    ////=============================================================================================
       
    scope.events = require('events');
    scope.util = require('util');
    scope.fs = require('fs');
    
    ////=============================================================================================
    // Propertys
    ////=============================================================================================

    scope.eventBus = new scope.events.EventEmitter();
    scope.path = process.cwd();
    scope.config = undefined;
    scope.debug = false;
    scope.templates = {};
    scope.modules = {};
    scope.namespace = {};

    ////=============================================================================================
    // Methods
    ////=============================================================================================

    ////=============================================================================================
    // General

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
    scope.setConf = function(file) {
        if( file !== undefined ){
            
            var localconfig = JSON.parse(scope.fs.readFileSync(file));
            
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
    // Add all neccesary templates, create object and add it to namespace    
    scope.loadModule = function(what, ready) { 
        var self = this;
        var name = scope.registerTemplate(what);
        var obj  = scope.createTemplate(name, function() {
            if( obj )
                scope.registerObject(obj);
                
            ready();
        });
    };
    
    ////---------------------------------------------------------------------------------------------
    // Register template to be avalible at creation
    scope.registerTemplate = function(what) {
        var self = this;
        var template;
        
        // Filename or object
        if( typeof(what) === 'string' )
            template = require(what);
        else
            template = what;
        
        // Template exists
        if( !template ) {
            scope.logDbg('Registering template failed');
            return false;
        }
            
        // Has a name
        if( !template.name ) {
            scope.logDbg('Template has no name');
            return false;
        }
        
        // Module exists?
        if( scope.templates[template.name] ) {
            scope.logDbg('Template '+template.name+'already exists');
            return false;
        }        
        
        // Create template entry
        scope.templates[template.name] = template;
    };
    
    ////---------------------------------------------------------------------------------------------
    // Take an Template identifier and create an object from it, it'll be returned and NOT added 
    scope.createTemplate = function(what, ready, config) {
        
        
        scope.modules
        
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
        
        // Recheck dependencies
        scope.recheck();
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
    //  Recheck dependencies
    scope.recheck = function() {
        // Every element
        for( var index in scope.templates ) {
            if( scope.templates.hasOwnProperty(index) ) {
                var template = scope.templates[index];
                
                // When loaded deps dont matter
                if( template.loaded )
                    continue;
                    
                var allDeps = [];
                if( template.template.inherits )
                    allDeps.concat(template.template.inherits);

                if( template.template.depends )
                    allDeps.concat(template.template.depends);
                
                // there are deps
                if( allDeps.length > 0 )
                    template.missing.splice(0);
                else
                    continue;
                    
                // Check all dependencies
                for( var dep in allDeps ) {
                    if( allDeps.hasOwnProperty(dep) ) {
                        var depname = allDeps[dep];
                        // Look if dependencie is loaded
                        if( !scope.neurons[depname] || scope.neurons[depname].loaded !== true ) {
                            scope.logDbg(template.template.name+' misses '+depname);
                        }
                    }
                }
            }
        }
        
        for( var ele2 in scope.templates ) {
            if( scope.templates.hasOwnProperty(ele2) ) {
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
    
    ////=============================================================================================
    // Helper and Handlers

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
    ////=============================================================================================

    scope.init();
    
    /////////////////////////////////////////////////////////////////////////////////////////////////
    
    ////=============================================================================================
    // External functions
    //scope.namespace.create = scope.create;
    
    scope.namespace.util = {};
    scope.namespace.util.load = scope.loadModule;
    scope.namespace.util.config = scope.setConfig;
    scope.namespace.util.register = scope.registerTemplate;
    scope.namespace.util.create = scope.createTemplate;
    scope.namespace.util.events = scope.eventBus;
    scope.namespace.util.exit = scope.exit;
    
    return scope.namespace;

})();
