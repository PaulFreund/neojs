//###################################################################################################
// Neuron factory
/*
    
    - Add error handling to module loading
    - Add dependencies
    - Add INHERITACE :D
    - IMPROVE ERROR HANDLING ( like always xD )
    
*/
    
//###################################################################################################
module.exports = (function () {
    /////////////////////////////////////////////////////////////////////////////////////////////////

   
    var 
    ////=============================================================================================
    // Requirements
        
        events = require('events'),
        util = require('util'),
        fs = require('fs'),
    
    ////=============================================================================================
    // Propertys

        self = this,
        eventBus = new events.EventEmitter(),
        config = null,
        neuronList,
        namespace = {},

    ////=============================================================================================
    // Methods
    
        ////-----------------------------------------------------------------------------------------
        // Initialize
        init = function() {
            process.addListener("unhandledException", function (err) {
                console.log(err);
            });

            eventBus.on('onError', onError);    
            
        },
    
        ////-----------------------------------------------------------------------------------------
        // Set config avalible to all newly created templates
        setConfig = function(configfile) {
            if( configfile !== undefined ){
                var localconfig = JSON.parse(fs.readFileSync(configfile));
                
                if( localconfig )
                    self.config = localconfig;
            }            
        },
    
        ////-----------------------------------------------------------------------------------------
        // Create an object with an own context defined by a Template
        create = function(template) {

            function Template(config) {
                var self = {};
                self.events = eventBus;
                
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
                            self[template.modules[module]] = require(template.modules[module]);
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
                            this[template.exports[exportdefine]] = function(){
                                self[template.exports[exportdefine]].apply(self,arguments);
                            };
                            returns[template.exports[exportdefine]] = this[template.exports[exportdefine]];
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
                    self['init'] = template.init;

                }

                // Add config if avalible
                if( config !== null ) {
                    if( config[template.name] !== undefined ) {
                        self['config'] = config[template.name];
                    }
                }
                
                if( self['init'] )
                    self['init']();

                return returns; 
                
            }
            
            return new Template(self.config);
        
        },
    
        ////-----------------------------------------------------------------------------------------
        //  Create module and add it to the list 
        load = function(template) {
            if( !template.name ) {
                console.log('You have to set a module name');
                return;
            }
            
            if( !template.depends || template.depends.length <= 0) {
                var object = create(template);
                if(!object) {
                    neuronList.add({
                        name: template.name,
                        template: template,
                        object: object
                    });
                }
                if( !namespace[template.name] )
                    namespace[template.name] = object;
                else
                    console.log('already loaded module with that name');
                
                return object; 
            }
            else {
                console.log('please implement :) ');
            }
            
        },
        
        ////-----------------------------------------------------------------------------------------
        //  Load from file
        loadFile = function(filename) {
            var object = require(filename);
            load(object);
        },

        ////-----------------------------------------------------------------------------------------
        //  Get access to a module from the list 
        get = function(name) {
            console.log(a);
        },
        
        onError = function(err) {
            console.log('works');
        }
        
        
    ////=============================================================================================
    ;

    /////////////////////////////////////////////////////////////////////////////////////////////////

    ////=============================================================================================
    // Call Constructor
    init();
    
    /////////////////////////////////////////////////////////////////////////////////////////////////
    
    ////=============================================================================================
    // External functions
    namespace.create = create;
    namespace.load = load;
    namespace.loadFile = loadFile;
    namespace.events = eventBus;
    namespace.setConfig = setConfig;
    
    return namespace;

})();
