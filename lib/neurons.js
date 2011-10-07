//###################################################################################################
// Neuron factory
/*
    implements add function for creation of Module pattern objects like this
    implements unified configuration 
    implements unified messaging bus
    implements dependencies
    
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
            {
                "name": "Database",
                "depends": [],
                "modules": ['db-mysql'],
                "vars": [   'something', 
                            { 'somethingelse', 'initvalue' } ]
            }                
        },
    
        ////-----------------------------------------------------------------------------------------
        //  Create module and add it to the list 
        add = function(template) {
            var object = create(template);
            
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
        functionname:functionname  
    };
    
})();
