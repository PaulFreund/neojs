//###################################################################################################
// NEO Neuron Objects
// Class like conept in Node.js
/*
    - Inheritance in object creation
    - Write documentation
    - Events for loading etc

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
    scope.addConfig = function(what) {
        
        if( file === undefined ) {
            scope.logDbg('Config Empty');
            return false;
        }
        
        var newConfig;
        if( typeof(template.modules[module]) === 'string' )
            newConfig = JSON.parse(scope.fs.readFileSync(what));            
        else
            newConfig = what;
            
            
        if( ! newConfig ) {
            scope.logDbg('Config Invalid');
            return false;

        for( key in newConfig ) {
            if( newConfig.hasOwnProperty(key) ) {
                scope.config[key] = newConfig[key];    
            }
        }
        if( newConfig.debug !== undefined )
                scope.debug = newConfig.debug;
        }
        
        return true;
    };
    

    ////---------------------------------------------------------------------------------------------
    // Add all neccesary templates, create object and add it to namespace    
    scope.loadModule = function(what, ready) { 
        var self = this;
        var name = scope.registerTemplate(what);
        
        if( name === false ) {
            logDbg('Registering template failed wont retry!');
            ready(undefined);
        }
    
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
        
        // Template exists?
        if( scope.templates[template.name] ) {
            scope.logDbg('Template '+template.name+'already exists');
            return false;
        }
        
        // Add inheritances
        template = scope.inherit(template);
        if( template === false ) {
            scope.logDbg('Inheriting failed, no retry');
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
        
        scope.logDbg('Loading '+template.name);                
        scope.createModule(template, config, function(obj) {
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
    // Recursively build template from inherits
    
    scope.inherit = function(template) {
        // Check inherits
        if( template.inherits && template.inherits.length > 0 ) {
            
            // is registered? 
            if( !scope.templates[template.inherits] ) {
                logDbg('Base template '+template.inherits+' missing!');
                return false;
            }
            
            // Get base class
            var base = scope.templates[template.inherits];
            template.base = {};
            
            for( var categoryIndex in base) {
                if( base.hasOwnProperty(categoryIndex) ) {
                
                    switch(categoryIndex) {
    
                        case 'init':
                        case 'exit': {
                            template.base[categoryIndex] = base[categoryIndex];
                            break;
                        }
    
                        case 'properties':
                        case 'modules':
                        case 'methods':
                        case 'exports':
                        case 'config': 
                        case 'slots': {
                            for( var key in base[categoryIndex] ) {
                                if( base[categoryIndex].hasOwnProperty(key) ) {
                                    
                                    if(! template[categoryIndex] )
                                        template[categoryIndex] = {};
                                        
                                    template[categoryIndex][key] = base[categoryIndex][key];
                                }
                            }
                            break;
                        } 
                    }
                }
            }
        }
        
        return template;
        
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
            
            // Add methods to the object
            if( template.methods ) {
                for( var method in template.methods ) {
                    if( template.methods.hasOwnProperty(method) ) {
                        self[template.methods[method].name] = template.methods[method];

                    }
                }
            }
            
            // Create external function definitions
            var returns = {};
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
            
            // Overwrite default config with external configuration values
            if( config ) {
                for( var key2 in config) {
                    if( config.hasOwnProperty(key2)         &&
                        self.config.hasOwnProperty(key2)    ) {
                    
                    self.config[key2] = config[key2];
                    
                    }
                }
            }
            
            // Set Path 
            self.config.path = scope.path;   
 
            // create object for real own constructor
            self.self = {};
            
             // Add Init function to object
            if( template.init )
                self.self.init = template.init;
            
            // Add Exit function to object
            if( template.exit ) {
                self.self.exit = template.exit;

            // Add Init function to object
            if( template.base.init ) {
                // Hook base template in the chain
                self.init = function(initReady) {  
                    self.base.init(function(){    
                        self.init(initReady);     
                    });
                }
            }
            else if(self.self.init) {
                self.init = function(initReady) {
                    self.self.init(initReady);
                }
            }

            // Add Exit function to object
            if( template.base.exit ) {
                // Hook base template in the chain
                self.exit = function(exitReady) {  
                    self.base.exit(function(){    
                        self.exit(exitReady);     
                    });
                }
            }
            else if(self.self.exit) {
                self.exit = function(exitReady) {
                    self.self.exit(exitReady);
                }
            }
            
            // Add exit to the eventBus
            if( self.exit ) {
                self.events.on('exit',function(exitReady) {
                    self.exit.apply(self,[exitReady]);
                });

            }
 
            // Call init
            if( self.init ) {
                self.init.apply(self, [
                    function() {
                        ready(returns);    
                    }
                ]);
            }
        }
        
        new Template();
    
    };

    ////-----------------------------------------------------------------------------------------
    //  Check dependencies
    scope.checkDeps = function(template) {
        
        var missing = [];

        if( template.depends && template.depends.length > 0) {
<<<<<<< HEAD
            for( var index in template.depends ) {
                if( template.depends.hasOwnProperty(index) ) {
                    if( ! scope.templates[template.depends[index]]  )
=======
            for( var index in template.depends )
                if( template.depends.hasOwnProperty(index) )
                {
                    if( ! scope.modules[template.depends[index]]  )
>>>>>>> 078139515db8aa9b31206baf151f421175cc0240
                        missing.push(template.depends[index]);
                }
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
<<<<<<< HEAD
    scope.namespace.neo.config = scope.addConfig;
=======
    scope.namespace.neo.config = scope.setConf;
>>>>>>> 078139515db8aa9b31206baf151f421175cc0240
    scope.namespace.neo.register = scope.registerTemplate;
    scope.namespace.neo.create = scope.createTemplate;
    scope.namespace.neo.events = scope.eventBus;
    scope.namespace.neo.exit = scope.exit;
    
    return scope.namespace;

})();
