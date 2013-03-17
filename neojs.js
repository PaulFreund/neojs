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
    // Properties
    ////=============================================================================================

    scope.name = 'neo';
    scope.debug = false;
    scope.processPath = process.cwd();
    scope.namespace = {};
    scope.eventBus = new scope.events.EventEmitter2({wildcard: true, delimiter: '.', maxListeners: 200});
    scope.templates = {};
    scope.objects = {};
    scope.waiting = [];

    ////=============================================================================================
    // Methods
    ////=============================================================================================

    ////=============================================================================================
    // General

    ////---------------------------------------------------------------------------------------------
    // Construction
    scope.init = function()
    {
        process.addListener("unhandledException", function (err)
        {
            scope.log('error', err);
        });

        // Add default modules
        scope.templateRegister(scope.path.resolve(__dirname, "templates"));
    };

    ////-----------------------------------------------------------------------------------------
    //  Destruction
    scope.exit = function(callback)
    {

        var objectCounter = scope.objects.keys.length;
        scope.eventBus.emit('exit', function()
        {
            if( objectCounter === 0 )
                callback();
            else
                objectCounter--;
        });
    };

    ////-----------------------------------------------------------------------------------------
    //  Logging
    scope.log = function(type, msg)
    {
        var showDebug = ( type === 'debug' && scope.debug );
        var showError = ( type === 'error');

        if( showError || showDebug )
        {
            console.log('['+this.name+']'+this.util.inspect(msg));
        }
    };

    ////=============================================================================================
    // Template handling

    ////---------------------------------------------------------------------------------------------
    // Register a template
    scope.templateRegister = function(source)
    {
        if( source === undefined )
        {
            scope.log('debug','No template data supplied');
            return false;
        }

        var templateObjects = [];

        // This is not an object
        if( typeof(source) === 'string')
        {
            try
            {
                var stats = scope.fs.statSync(source);

                // It is a directory
                if (stats.isDirectory())
                {
                    var fileList = scope.fs.readdirSync(source);
                    if(fileList && fileList.length > 0)
                    {
                        for( var fileIndex in fileList)
                        {
                            if( fileList.hasOwnProperty(fileIndex) )
                            {
                                var filePath = scope.path.resolve(source, fileList[fileIndex]);
                                templateObjects.push(scope.templateLoadFile(filePath));
                            }
                        }
                    }
                }
                // It is a file
                else
                {
                    templateObjects.push(scope.templateLoadFile(source));
                }
            }
            catch (err) {
                scope.log('error', 'Error registering templates: ' + scope.util.inspect(err));
            }
        }
        // Its an object
        else
        {
            templateObjects.push(source);
        }

        // Iterate over acquired objects
        for( var templateIndex in templateObjects)
        {
            if( templateObjects.hasOwnProperty(templateIndex) )
            {
                var templateObject = templateObjects[templateIndex];
                if( templateObject !== undefined )
                    scope.templateProcessObject(templateObject);
            }
        }
    };

    ////---------------------------------------------------------------------------------------------
    // Check if template object is valid and add it to internal list
    scope.templateProcessObject = function(templateObject)
    {
        // Template exists
        if( !templateObject ) {
            scope.log('debug','Registering template failed');
            return false;
        }

        // Has a name
        if( !templateObject.templateName ) {
            scope.log('debug','Template has no name');
            return false;
        }

        // Template exists?
        if( scope.templates[templateObject.templateName] ) {
            scope.log('debug','Template '+templateObject.templateName+'already exists');
            return false;
        }

        // Add inheritances
        templateObject = scope.templateInherit(templateObject);
        if( templateObject === false ) {
            scope.log('debug','Inheriting template '+templateObject.templateName+' failed');
            return false;
        }

        // Add template
        scope.templates[templateObject.templateName] = templateObject;

        return templateObject.templateName;
    };

    ////---------------------------------------------------------------------------------------------
    // Load a template from file
    scope.templateLoadFile = function(filePath)
    {
        try
        {
            // No directories
            if(scope.fs.statSync(filePath).isDirectory())
                return undefined;

            // Only js files
            if( filePath.indexOf('.js') == -1 )
                return undefined;

            // Load template file

            return require(filePath);
        }
        catch(err)
        {
            scope.log('error', 'Error reading template file: ' + scope.util.inspect(err));
        }

        return undefined;
    };

    ////---------------------------------------------------------------------------------------------
    // Add inherited aspects to template
    scope.templateInherit = function(template)
    {
        // Check inherits
        if( template.inherits && template.inherits.length > 0 )
        {
            // is registered?
            if( !scope.templates[template.inherits] )
            {
                scope.log('debug','Base template '+template.inherits+' missing!');
                return false;
            }

            // Get base template
            var base = scope.templates[template.inherits];
            template.base = {};

            for( var categoryIndex in base)
            {
                if( base.hasOwnProperty(categoryIndex) )
                {
                    switch(categoryIndex)
                    {
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
                        for( var key in base[categoryIndex] )
                        {
                            if( base[categoryIndex].hasOwnProperty(key) )
                            {
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

    ////=============================================================================================
    // Object handling

    ////---------------------------------------------------------------------------------------------
    // Create an object
    scope.objectCreate = function(config, callback)
    {
        if( config === undefined )
        {
            scope.log('debug','Config Empty');
            return false;
        }

        var configData = undefined;

        if( typeof(config) === 'string' )
            configData = scope.objectLoadConfigFile(config);
        else
            configData = config;

        if( configData === undefined )
        {
            scope.log('debug','No valid configuration has been supplied');
            return false;
        }

        if( Array.isArray(configData) )
        {
            for( var configIndex in configData)
            {
                if( configData.hasOwnProperty(configIndex) )
                    scope.objectProcessConfig(configData[configIndex], callback);
            }
        }
        else
        {
            scope.objectProcessConfig(configData, callback);
        }

        return true;
    };

    ////---------------------------------------------------------------------------------------------
    // Process a config object
    scope.objectProcessConfig = function(configObject, callback)
    {
        // Check if critical properties exist
        if( configObject.id === undefined || configObject.template === undefined )
        {
            scope.log('error', "Could not create object, id or template missing");
            return false;
        }

        // Check if id is unique
        if( scope.objects[configObject.id] !== undefined )
        {
            scope.log('error', "There already is an object with the ID "+configObject.id);
            return false;
        }

        // Load supplied templateFile if available
        if( configObject.templateFile )
            scope.templateRegister(configObject.templateFile);

        // Check if template exists
        var template = scope.templates[configObject.template];
        if( !template )
        {
            scope.log('error',
                'Could not create object with ID ' + configObject.id
                + ' because template ' + configObject.template+' is missing'
            );
            return false;
        }

        // Check if dependencies are satisfied
        var checkResult = scope.objectCheckDependencies(configObject);
        if( checkResult !== true )
        {
            scope.log('debug',
                'Dependencies: ' + checkResult.join(',')
                + ' not found for ID ' + configObject.id
                + ' ,retrying when new objects are created'
            );
            scope.objectAddWaiting(configObject, callback);
            return false;
        }

        // Create object instance
        scope.log('debug','Creating template ' + configObject.template + ' for object with ID ' + configObject.id+'..');

        scope.objectInstanceCreate(template, configObject, function(objectInterface)
        {
            if( objectInterface !== undefined)
            {
                scope.objectInstanceRegister(objectInterface);
                callback(objectInterface);
                scope.objectCheckWaiting();
                return true;
            }
            else
            {
                scope.log('error',
                    'Creating template failed for object with ID '+ configObject.id
                        + ' with template '+configObject.template
                );
                return false;
            }
        });

        return false;
    };

    ////---------------------------------------------------------------------------------------------
    // Load a template from file
    scope.objectLoadConfigFile = function(filePath)
    {
        // No directories
        if(scope.fs.statSync(filePath).isDirectory())
            return undefined;

        // Only js files
        if( filePath.indexOf('.json') == -1 )
            return undefined;

        // Load template file
        try
        {
            return JSON.parse(scope.fs.readFileSync(filePath));
        }
        catch(err) { }

        return undefined;
    };

    ////-----------------------------------------------------------------------------------------
    //  Register object instance
    scope.objectInstanceRegister = function(object)
    {
        if( scope.objects[object.id] )
        {
            scope.log('debug','Object with ID '+object.id+' already registered');
            return false;
        }
        
        scope.objects[object.id] = object;
        scope.namespace[object.id] = object;
        return true;
    };

    ////---------------------------------------------------------------------------------------------
    // Create an object with an own context defined by a Template
    scope.objectInstanceCreate = function(template, config, callback)
    {
        function Template()
        {
            var self = {};

            ////-------------------------------------------------------------------------------------
            // Pre initialize values

            self.self = {};

            self.log = scope.log;
            self.events = scope.eventBus;
            self.templateName = template.templateName;

            self.signal = function(name)
            {
                arguments[0] = self.config.id+'.'+name;
                self.events.emit.apply(self.events, arguments);
            };

            // The object that will be returned and made available from outside
            var objectInterface = {};
            objectInterface.id = config.id;

            ////-------------------------------------------------------------------------------------
            // Set configuration

            self.config = {};

            // Add config if available
            if( template.config )
            {
                for( var templateConfigIndex in template.config)
                {
                    if( template.config.hasOwnProperty(templateConfigIndex) )
                    {
                        if( typeof(template.config[templateConfigIndex]) === 'string' )
                            self.config[template.config[templateConfigIndex]] = null;
                        else
                            self.config[template.config[templateConfigIndex].name] = template.config[templateConfigIndex].value;
                    }
                }
            }

            // Overwrite default config with external configuration values
            for( var configIndex in config)
            {
                if( config.hasOwnProperty(configIndex) && self.config.hasOwnProperty(configIndex))
                    self.config[configIndex] = config[configIndex];
            }

            self.config.id = config.id;
            self.config.path = scope.processPath;

            ////-------------------------------------------------------------------------------------
            // Add properties to the object

            if( template.properties )
            {
                for( var property in template.properties )
                {
                    if( template.properties.hasOwnProperty(property) )
                    {
                        if( typeof(template.properties[property]) === 'string' )
                            self[template.properties[property]] = null;
                        else
                            self[template.properties[property].name] = template.properties[property].value;
                    }
                }
            }

            ////-------------------------------------------------------------------------------------
            // Add methods to the object

            if( template.methods )
            {
                for( var method in template.methods )
                {
                    if( template.methods.hasOwnProperty(method) )
                        self[template.methods[method].name] = template.methods[method];
                }
            }

            ////-------------------------------------------------------------------------------------
            // Add and register slots

            if( template.slots )
            {
                for( var slot in template.slots )
                {
                    if( template.slots.hasOwnProperty(slot) )
                    {
                        var name, fkt;
                        if( typeof(template.slots[slot]) === 'function' )
                        {
                            name = self.config.id+'.'+template.slots[slot].name;
                            fkt = template.slots[slot];
                        }
                        else {
                            name = template.slots[slot].name;
                            fkt =  template.slots[slot].value;
                        }
                        
                        self[name] = fkt;
                        this[name] = ( function()
                        {
                            var me = name;
                            return function()
                            {
                                return self[me].apply(self,arguments);
                            };
                        })();

                        self.events.addListener(name, this[name]);
                        objectInterface[name] = this[name];
                    }
                }
            }

            ////-------------------------------------------------------------------------------------
            // Add Init function to object

            if( template.init )
                self.self.init = template.init;

            if( template.base && template.base.init )
            {
                // Hook base template in the chain
                self.init = function(initReady)
                {
                    self.base.init.apply(self,[function()
                    {
                        self.init.apply(self,[initReady]);     
                    }]);
                };
            }
            else if(self.self.init)
            {
                self.init = function(initReady)
                {
                    self.self.init.apply(self,[initReady]);
                };
            }

            ////-------------------------------------------------------------------------------------
            // Add Exit function to object

            if( template.exit )
                self.self.exit = template.exit;

            if( template.base && template.base.exit )
            {
                // Hook base template in the chain
                self.exit = function(exitReady)
                {
                    self.base.exit.apply(self,[function()
                    {
                        self.exit.apply(self,[exitReady]);     
                    }]);
                };
            }
            else if(self.self.exit)
            {
                self.exit = function(exitReady)
                {
                    self.self.exit.apply(self,[exitReady]);
                };
            }

            ////-------------------------------------------------------------------------------------
            // Add exit to the eventBus

            if( self.exit )
            {
                self.events.on('exit',function(exitReady)
                {
                    self.exit.apply(self,[exitReady]);
                });
            }

            ////-------------------------------------------------------------------------------------
            // Create external function definitions

            if( template.exports )
            {
                for( var exportIndex in template.exports )
                {
                    if( template.exports.hasOwnProperty(exportIndex) )
                    {
                        var exportName = template.exports[exportIndex];
                        if( typeof(self[exportName]) === 'function' )
                        {
                            this[exportName] = (function()
                            {
                                var me = exportName;
                                return function()
                                {
                                    return self[me].apply(self,arguments);
                                };
                            })();

                            objectInterface[exportName] = this[exportName];
                        }
                        else
                        {
                            objectInterface[exportName] = self[exportName];
                        }
                    }
                }
            }

            ////-------------------------------------------------------------------------------------
            // Call init

            if( self.init )
                self.init.apply(self, [ function() { callback(objectInterface); } ]);
        }
        
        new Template();
    };

    ////-----------------------------------------------------------------------------------------
    // Check dependencies
    scope.objectCheckDependencies = function(config) {
        
        var missingDependencies = [];

        if( config.depends && config.depends.length > 0)
        {
            for( var index in config.depends )
            {
                if( config.depends.hasOwnProperty(index) )
                {
                    if( ! scope.objects[ config.depends[index] ]  )
                        missingDependencies.push( config.depends[index] );
                }
            }
        }
    
        if( missingDependencies.length > 0 )
            return missingDependencies;
        else
            return true;        
    };

    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies
    scope.objectAddWaiting = function(config, callback)
    {
        scope.log('debug','Dependencies for '+config.id+' not satisfied, waiting');
                
        var self = {};
        self.pos = (scope.waiting.push({}) - 1);
        self.callback = callback;

        scope.waiting[self.pos].config = config;
        scope.waiting[self.pos].callback = function()
        {
            scope.waiting.splice(self.pos, 1);
            self.callback.apply(this, arguments);
        };
    };

    ////-----------------------------------------------------------------------------------------
    //  Recheck dependencies of waiting list
    scope.objectCheckWaiting = function()
    {
        // Every element
        if( scope.waiting.length > 0 )
        {
            for( var index in scope.waiting )
            {
                if( scope.waiting.hasOwnProperty(index) )
                {
                    var waiting = scope.waiting[index];

                    // Object already exists
                    if( scope.objects[waiting.config.id] !== undefined)
                    {
                        delete scope.waiting[index];
                        return;
                    }
                    else
                    {
                        scope.objectProcessConfig(waiting.config, waiting.callback);
                    }
                }
          }
        }      
    };

    ////=============================================================================================
    // Call Constructor
    ////=============================================================================================

    scope.init();
    
    /////////////////////////////////////////////////////////////////////////////////////////////////
        
    ////=============================================================================================
    // External functions
    
    scope.namespace.neo = {};

    scope.namespace.neo.register    = scope.templateRegister;  // (source)
    scope.namespace.neo.create      = scope.objectCreate;      // (config, callback)

    scope.namespace.neo.enableDebug = function(enableDebug) { scope.debug = enableDebug; };
    scope.namespace.neo.events = scope.eventBus;
    scope.namespace.neo.exit = scope.exit;

    return scope.namespace;

})();
