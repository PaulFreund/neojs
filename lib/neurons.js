//###################################################################################################
// Neuron factory
/*
    implements add function for creation of Module pattern objects like this
    implements unified configuration 
    implements unified messaging bus
    implements dependencies
    
    
    - Add error handling to module loading
    - Add dependencies
    - Add slots
    
*/
    
//###################################################################################################
// Create Function

module.exports = (function () {
    /////////////////////////////////////////////////////////////////////////////////////////////////
   
    var 
    ////=============================================================================================
    // Requirements
        
        events = require('events'),
        util = require('util'),
    
    ////=============================================================================================
    // Propertys

        self = this,
        eventBus = new events.EventEmitter(),
        config,
        neuronList,

    ////=============================================================================================
    // Methods
    
        ////-----------------------------------------------------------------------------------------
        // Initialize
        init = function() {
            process.addListener("unhandledException", function (err) {
                console.log(err);
            });

            eventBus.on('error', onError);

        },

        ////-----------------------------------------------------------------------------------------
        //  Create a module from the given parameters
        create = function(template) {

            var object = (function() {
                // Create object to access all vars from defined functions
                var self = {};
                this.self = self;

                // Add name
                if( template.name ) {
                    self['name'] = template.name;
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
                
                // Create external function definitions
                if( template.exports ) {
                    var returns = {};
                    for( var exportdefine in template.exports ) {
                        if( template.exports.hasOwnProperty(exportdefine) ) {
                            returns[template.exports[exportdefine]] = self[template.exports[exportdefine]];
                        }
                    }
                }                
                

                console.log('Object created: '+util.inspect(self));
                return returns;
            })();
            
            return object;
        },
    
        ////-----------------------------------------------------------------------------------------
        //  Create module and add it to the list 
        load = function(template) {
            var object = create(template);
            
        },
        
        loadFile = function(filename) {
              
        },
        
        ////-----------------------------------------------------------------------------------------
        //  Get access to a module from the list 
        get = function(name) {
            console.log(a);
        },
        
        onError = function(err) {
            
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
    return {
        create:create 
    };
    
})();
