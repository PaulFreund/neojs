//###################################################################################################
/*
    Copyright (c) since 2012 - Paul Freund 
    
    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:
    
    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
*/
//###################################################################################################
    
//###################################################################################################
module.exports = (function () {
    /////////////////////////////////////////////////////////////////////////////////////////////////
   
    var scope = {};
    ////=============================================================================================
    // Requirements
    ////=============================================================================================
       
    scope.events = require('eventemitter2');
    scope.util = require('util');
    scope.path = require('path');
    scope.fs = require('fs');
    
    ////=============================================================================================
    // Propertys
    ////=============================================================================================

    scope.name = 'neo';
    scope.processPath = process.cwd();
    scope.config = {};
    scope.debug = false;
    scope.templates = {};
    scope.modules = {};
    scope.namespace = {};
    scope.waiting = [];
    scope.eventBus = new scope.events.EventEmitter2({wildcard: true, delimiter: '.', maxListeners: 200});

    ////=============================================================================================
    // Methods
    ////=============================================================================================

    ////=============================================================================================
    // General

    ////---------------------------------------------------------------------------------------------
    // Initialize
    scope.init = function() {
        process.addListener("unhandledException", function (err) {
            scope.eventBus.console.log(err);
        });

        scope.eventBus.on('onError', scope.onError);
    };
    
    ////---------------------------------------------------------------------------------------------
    // Set config avalible to all newly created templates
    scope.addConfig = function(what) {
        
        if( what === undefined ) {
            scope.log('debug','Config Empty');
            return false;
        }
        
        var newConfig;
        if( typeof(what) === 'string' )
            newConfig = JSON.parse(scope.fs.readFileSync(what));            
        else
            newConfig = what;
            
            
        if( ! newConfig ) {
            scope.log('debug','Config Invalid');
            return false;
        }

        for( var key in newConfig ) {
            if( newConfig.hasOwnProperty(key) ) {
                scope.config[key] = newConfig[key];    
            }
        }
        if( newConfig.debug !== undefined ) {
                scope.debug = newConfig.debug;
        }
        
        return true;
    };
    

    ////---------------------------------------------------------------------------------------------
    // Add all necessary templates, create object and add it to namespace
    scope.loadModule = function(what, ready) { 
        var self = this;
        var name = scope.registerTemplate(what);
        
        if( name === false ) {
            scope.log('debug','Registering template failed wont retry!');
            ready(undefined);
        }
    
        var config;
        if( scope.config[name] )
            config = scope.config[name];            
        
        scope.createTemplate(name, config, function(obj) {
            if( obj ) {
                scope.registerModule(obj);
                if( ready ) {
                    ready(obj);
                    return true;
                }
                else {
                    return obj;
                }
            }
            else {
                scope.log('debug','loadModule: createTemplate failed!');
                return false;
            }
        });
    };

    ////---------------------------------------------------------------------------------------------
    // Get code for template
    scope.loadTemplate = function(what, internal) {

        // this already is an object
        if( typeof(what) !== 'string')
            return what;

        // try to resolve with module folder
        if( internal === true ) {

            if( what.indexOf('.js') == -1 )
                what += '.js';

            what = scope.path.resolve(__dirname, "modules/"+what);
        }

        var templateCode = undefined;
        try {
            templateCode = require(what);
        }
        catch(err) { }

        if(!templateCode) {
            if( internal !== true )
                return scope.loadTemplate(what, true);
            else
                return undefined;
        }

        return templateCode;
    };

    ////---------------------------------------------------------------------------------------------
    // Register template to be avalible at creation
    scope.registerTemplate = function(what) {
        var self = this;
        var template;
        
        // Filename or object
        template = scope.loadTemplate(what);

        // Template exists
        if( !template ) {
            scope.log('debug','Registering template failed');
            return false;
        }
            
        // Has a name
        if( !template.name ) {
            scope.log('debug','Template has no name');
            return false;
        }
        
        // Template exists?
        if( scope.templates[template.name] ) {
            scope.log('debug','Template '+template.name+'already exists');
            return false;
        }
        
        // Add inheritances
        template = scope.inherit(template);
        if( template === false ) {
            scope.log('debug','Inheriting failed, no retry');
            return false;
        }
        
        // Create template entry
        scope.templates[template.name] = template;
        
        return template.name;
    };
    
    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies
    scope.registerModule = function(module) {
        if( scope.modules[module.name] ) {
            scope.log('debug','Module '+module.name+' already registered');
            return false;
        }
        
        scope.modules[module.name] = module;
        scope.namespace[module.name] = module;
        return true;
    };

    
    ////---------------------------------------------------------------------------------------------
    // Take an Template identifier and create an object from it, it'll be returned and NOT added 
    scope.createTemplate = function(what, config, ready) {

        var template = scope.templates[what];
        
        // Template exists?
        if( !template ) {
            scope.log('debug','Template '+what+ 'not found!');
            return false;
        }
        
        // All dependencies statisfied?
        var checked = scope.checkDeps(template);
        if( checked !== true ) {
            var missing = checked.join(',');
            scope.log('debug','Dependencies: '+missing+ ' not found!');
            scope.addWaiting(what, config, ready);
            ready(false);
            return false;
        }
        
        scope.log('debug','Loading '+template.name);                
        scope.createModule(template, config, function(obj) {
            if( obj ) {
                ready(obj);
                scope.checkWaiting();
                return true;
            }
            else {
                scope.log('debug','createModule failed for template '+template.name);
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
                scope.log('debug','Base template '+template.inherits+' missing!');
                return false;
            }
            
            // Get base class
            var base = scope.templates[template.inherits];
            template.base = {};
            
            for( var categoryIndex in base) {
                if( base.hasOwnProperty(categoryIndex) ) {
                
                    switch(categoryIndex) {
                    case 'init':
                    case 'exit':
                        template.base[categoryIndex] = base[categoryIndex];
                        break;

                    case 'depends':
                    case 'properties':
                    case 'methods':
                    case 'exports':
                    case 'config': 
                    case 'slots': 
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
        
        return template;
        
    };
    
    ////---------------------------------------------------------------------------------------------
    // Create an object with an own context defined by a Template
    scope.createModule = function(template, config, ready) {

        function Template() {
            var self = {};
            
            // Pre initialize values
            self.self = {};
            self.config = {};
            self.log = scope.log;
            self.events = scope.eventBus;
            self.config.path = scope.processPath;
            
            // Add name
            if( template.name ) {
                self.name = template.name;
            }
                
            // Create returns
            var returns = {};
            returns.name = self.name;
            
            // Add depended Modules
            if( template.depends ) {
                for( var depend in template.depends ) {
                    if( template.depends.hasOwnProperty(depend) ) {
                        self[template.depends[depend]] = scope.modules[template.depends[depend]];
                    }
                }
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

            // Add methods to the object
            if( template.methods ) {
                for( var method in template.methods ) {
                    if( template.methods.hasOwnProperty(method) ) {
                        self[template.methods[method].name] = template.methods[method];
                    }
                }
            }
                        
            // Connect slots
            if( template.slots ) {
                for( var slot in template.slots ) {
                    if( template.slots.hasOwnProperty(slot) ) {
                        var name, fkt;
                        if( typeof(template.slots[slot]) === 'function' ) {
                            name = self.name+'.'+template.slots[slot].name;
                            fkt = template.slots[slot];
                        }
                        else {
                            name = template.slots[slot].name;
                            fkt =  template.slots[slot].value;
                        }
                        
                        self[name] = fkt;
                        this[name] = (function(){
                            var me = name;
                            return function(){
                                return self[me].apply(self,arguments);
                            };
                        })();
                        self.events.addListener(name, this[name]);
                        returns[name] = this[name];  
                        
                    }
                }
            }
                        
            // Add config if avalible
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
            
             // Add Init function to object
            if( template.init )
                self.self.init = template.init;
            
            // Add Exit function to object
            if( template.exit )
                self.self.exit = template.exit;

            // Add Init function to object
            if( template.base && template.base.init ) {
                // Hook base template in the chain
                self.init = function(initReady) {  
                    self.base.init.apply(self,[function(){    
                        self.init.apply(self,[initReady]);     
                    }]);
                };
            }
            else if(self.self.init) {
                self.init = function(initReady) {
                    self.self.init.apply(self,[initReady]);
                };
            }

            // Add Exit function to object
            if( template.base && template.base.exit ) {
                // Hook base template in the chain
                self.exit = function(exitReady) {  
                    self.base.exit.apply(self,[function() {    
                        self.exit.apply(self,[exitReady]);     
                    }]);
                };
            }
            else if(self.self.exit) {
                self.exit = function(exitReady) {
                    self.self.exit.apply(self,[exitReady]);
                };
            }
            
            // Add exit to the eventBus
            if( self.exit ) {
                self.events.on('exit',function(exitReady) {
                    self.exit.apply(self,[exitReady]);
                });

            }
 
            // Create external function definitions
            if( template.exports ) {
                for( var exportdefine in template.exports ) {
                    if( template.exports.hasOwnProperty(exportdefine) ) {
                        var exportname = template.exports[exportdefine];
                        if( typeof(self[exportname]) === 'function' ) {
                            this[exportname] = (function(){
                                var me = exportname;
                                return function(){
                                    return self[me].apply(self,arguments);
                                };
                            })();
                            
                            returns[exportname] = this[exportname];
                        }
                        else {
                            returns[exportname] = self[exportname];
                        }
                    }
                }
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
            for( var index in template.depends ) {
                if( template.depends.hasOwnProperty(index) ) {
                    if( ! scope.modules[template.depends[index]]  )
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
        scope.log('debug','Dependencies for '+what+' not statisfied, waiting');
                
        var self = {};
        self.pos = (scope.waiting.push({}) - 1);
        self.ready = ready;
        
        scope.waiting[self.pos].what = what;
        scope.waiting[self.pos].config = config;
        scope.waiting[self.pos].ready = function() {
            scope.waiting.splice(self.pos, 1);
            self.ready.apply(this, arguments);
        };
    };


    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies of waiting list
    scope.checkWaiting = function() {
        // Every element
        if( scope.waiting.length > 0 ) {
            for( var index in scope.waiting ) {
             if( scope.waiting.hasOwnProperty(index) ) {
                 var waiting = scope.waiting[index];
                 
                 scope.createTemplate(waiting.what, waiting.config, waiting.ready);
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
    scope.log = function(type, msg) {
        var showDebug = ( type === 'debug' && scope.debug );
        var showError = ( type === 'error');
        if( showError || showDebug ) {
            console.log('['+this.name+']'+this.util.inspect(msg));
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
    scope.namespace.neo.config = scope.addConfig;
    scope.namespace.neo.register = scope.registerTemplate;
    scope.namespace.neo.create = scope.createTemplate;
    scope.namespace.neo.events = scope.eventBus;
    scope.namespace.neo.exit = scope.exit;
    
    return scope.namespace;

})();
