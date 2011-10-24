//###################################################################################################
// NEO Neuron Objects
// Class like conept in Node.js
/*
    - Overall:
        - More beautifull foreach
        - Better error handling
        - Write documentation

    - setConf:
        - Refactor
    
    - createTemplate:
        - Check dependencies
        - Inheritance
        - Checking
        - createModule
        
    - createModule:
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
    scope.waiting = [];

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
        
        var config;
        if( scope.config[name] )
            config = scope.config[name];            
        
        scope.createTemplate(name, config, function(obj) {
            if( obj ) {
                scope.registerModule(name, obj);    
                ready(obj);
            }
            else {
                logDbg('loadModule: createTemplate failed!');
            }
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
        
        return template.name;
    };
    
    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies
    scope.registerModule = function(name, module) {
        if( scope.modules[module.name] ) {
            logDbg('Module '+name+' already registered');
            return false;
        }
        
        if( !module ) {
            logDbg('Module '+name+' was not created');
            return false;
        }        
        
        scope.modules[name] = module;
        scope.namespace[name] = module;
        return true;
    };

    
    ////---------------------------------------------------------------------------------------------
    // Take an Template identifier and create an object from it, it'll be returned and NOT added 
    scope.createTemplate = function(what, config, ready) {

        var template = scope.templates[what];
        
        // Template exists?
        if( !template ) {
            logDbg('Template '+what+ 'not found!');
            return false;
        }
        
        // All dependencies statisfied?
        var checked = scope.checkDeps(template);
        if( checked !== true ) {
            var missing = checked.join(',');
            logDbg('Dependencies: '+missing+ 'not found!')
            scope.addWaiting(what, config, ready);
            return false;
        }
        
        // Inherit?
        if( template.inherits && template.inherits.length > 0 )
        {
            // TODO: Implement Inheritance
            
            // Apply all new functions to the old template
            
            // Build call chain for init and exit functions
        }       
        
        scope.logDbg('Loading '+template.name);                
        var obj = scope.createModule(template, config, function() {
            if( obj ) {
                scope.checkWaiting();
                ready(obj);
                return true;
            }
            else {
                logDbg('createModule failed for template '+template.name);
                return false;
            }       
        });
        
        return true;
    };
    
    ////---------------------------------------------------------------------------------------------
    // Create an object with an own context defined by a Template
    scope.createModule = function(template, config, ready) {

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
            self.config = {};
            
            if( template.config ) {
                for( var key in template.config) {
                    if( template.config.hasOwnProperty(key) ) {
                        
                        if( typeof(template.config[key]) === 'string' )
                            self.config[template.config[key]] = null;
                        else
                            self.config[template.config[key].name] = template.config[key].value;                                
                    }
                }
            }
            
            if( config ) {
                for( var key2 in config) {
                    if( config.hasOwnProperty(key2)         &&
                        self.config.hasOwnProperty(key2)    ) {
                    
                    self.config[key2] = config[key2];
                    
                    }
                }
            }
             
            self.config.path = scope.path;   
 
            
            // Call init
            if( self.init )
                self.init.apply(self, [ready]); 

            return returns; 
            
        }
        
        return new Template();
    
    };



    ////-----------------------------------------------------------------------------------------
    //  Check dependencies
    scope.checkDeps = function(template) {
        
        var missing = [];
        
        // Check inherits
        if( template.inherits && template.inherits.length > 0 ) {
            
            // is registered? 
            if( !scope.templates[template.inherits] )
                missing.push(template.inherits);
                
        }

        if( template.depends && template.depends.length > 0) {
            for( var index in template.depends )
                if( template.depends.hasOwnProperty(index) )
                {
                    if( ! scope.modules[template.depends[index]]  )
                        missing.push(template.depends[index]);
                }
            
        }
    
        if( missing.length > 0 )
            return missing;
        else
            return true;        
    };

    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies
    scope.addWaiting = function(what, config, ready) {
        logDbg('Dependencies for '+what+' not statisfied, waiting')
        scope.modulesWaiting.push({
                    what: what,
                    config: config,
                    ready: ready
        });
    };


    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies of waiting list
    scope.checkWaiting = function() {
        // Every element
        if( scope.waiting.length > 0 ) {
            for( var index in scope.waiting ) {
             if( scope.waiting.hasOwnProperty(index) ) {
                 var waiting = scope.waiting[index];
                 
                 createTemplate(waiting.what, waiting.config, waiting.ready);
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
    
    scope.namespace.neo = {};
    scope.namespace.neo.load = scope.loadModule;
    scope.namespace.neo.config = scope.setConf;
    scope.namespace.neo.register = scope.registerTemplate;
    scope.namespace.neo.create = scope.createTemplate;
    scope.namespace.neo.events = scope.eventBus;
    scope.namespace.neo.exit = scope.exit;
    
    return scope.namespace;

})();
