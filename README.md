# neojs - Node enhanced objects #

## Installation ##

Neojs can be installed easily through npm 

	npm install neojs

## Concept ##

* Step 1 - Create a template that contains the desired functionality
* Step 2 - Create an object manager by instantiating neojs
* Step 3 - Supply your templates with configuration to add them to the bus
* Step 4 - Combine different templates to achieve the desired behaviour

## Usage ##

You can create an instance of the object manager by requiring neojs

    myNet = require('neojs');

This also registers all templates that are in the neojs/templates folder. You can register additional templates by calling one of these:

    myNet.neo.register({...});              // Supply an object
    myNet.neo.register('path/to/file.js');  // Supply a file
    myNet.neo.register('path/to/folder');   // Supply a folder ( every js file in there will be added )

After registering the required templates, you can create instances of them by calling:

     myNet.neo.create(config, callback)

Where config can either be an object or a file path. If it is a file, it has to be a json containing an array of objects, like in the file "doc/config.json". You can define as many object configurations in a file as you want. The callback function will be called for every supplied configuration object that was successfully created and contains a parameter with the external object interface.

The basic structure of a configuration object ist the following:

     {
         // Unique ID that is used to identify the object.
         "id": "instanceName",
    
         // Optional, it is possible to supply the path to a template file
         // or folder, that should be loaded before an instance is created.
         "templateFile" : "templateFilePath",
    
         // The name of a registered template ( if templateFile is supplied,
         // it will be registered before the object is created ).
         "template": "templateName",
    
         // Optional, an array of object ID's this instance relies on
         // If a dependency is missing, creation will be retried everytime 
         // a new objects become available.
         "depends": ["otherInstanceID"],
    
         // Templates can define keys for configuration properties,
         // that will be filled with supplied values.
         "templateConfigKey": "templateConfigKeyValue"
    }


After creating an object instance, you can access its exported elements with its ID:

     myNet.neo.id_from_config.exported_name;

Apart from template registering neo offers these interfaces

    myNet.neo.enableDebug(enable); // Enable/Disable debugging messages
    myNet.neo.events               // Access to the EventEmitter2 based messaging bus
    myNet.neo.exit(callback);      // Globally calls exit to shutdown gracefully

## Templates ##

To see how templates work, I recommend looking at doc/template.js and the existing templates in the templates/ folder.

### Basics ###

Because of the nature of "this" in js, you always need to define your own reference to yourself. The best place to get this reference is in the init function, as you can see it in the templates.

### Internal interface ###

The framework adds the following interface to every instance ( available through this in init and self everywhere else )

    self.neo                    // Access to the object manager
    self.log(type, message)     // Log function, type can be 'debug' or 'error'
    self.events                 // Access to the event bus
    self.templateName           // The template name
    self.config                 // The configuration object, including all predefined and supplied values ( including id )
    self.signal(command, ...)   // Emits a signal to the eventbus with [ID].command and parameters ([ID] = config.id)
    
### Structure ###

#### templateName ###
The templateName defines the name of the template that is later used to create instances and for inheritance

    templateName: 'name',

#### config ####
An array of strings and objects that are later available to the instance as self.config, which can be filled by the creation config, it has the following structure:

    config: [
        "key",                                      // Key without initial value
        { key: "keyName", value: 'initValue' },     // key with initial value ( can be overwritten by config )
    ],
    
Configuration values can be accesed like this:

    self.config.id  // The ID every instance has
    self.config.key // An example configuration value

#### properties ####
The same definition as config, but the values can not be set with the supplied config

    properties: [
        "propertyKey",                                      // Key without initial value
        { key: "propertyKeyTwo", value: 'initValue' },      // key with initial value
    ],
    
The properties are automatically added to the instance object and can later be accessed like this:

    self.propertyKey

#### inherits ####
The name of a template, this template inherits from. Inheritance in this context means that the init and exit functions of the base template are called before the own init and exit functions of the own template and the object gets a self.base object which contains the definitions of the inherited template. This feature is pretty much untested.

#### init ####
Will be called when the object is created, can be seen as a constructor. After completing all initialisation tasks, the ready callback has to be called.

    init: function(ready) {        
        self = this;        // See Templates > Basics for explanation
        ready();
    }

#### exit ####
Will be called when an object is destroyed, can be seen as a destructor. After all cleanup tasks, the ready callback has to be called.

    exit: function(ready) {
        ready();
    },

#### methods ####
An array with functions which will be available inside this template. 
    
    [
        function methodName(...) {
        },
        function methodNameTwo(...) {
        }
    ],
    
The function names are automatically added to the instance and can be called directly:

    self.methodName();
    self.methodNameTwo();

#### slots ####
Slots are functions that will be called automatically if their identifier has the same key as an event on the eventbus

    slots: [
        // If a function is defined directly, it will listen to events with 
        // self.config.id + '.' + function.name. For example, if we create an object
        // with the id 'webserver', this function would listen to 'webserver.slotName'
        function slotName(..) {         
        },
        // Functions that are defined with a key don't prepend their id before event keys
        // so it is possible to listen to events from other objects. It is also possible to 
        // listen to wildcards ( see EventEmitter2 ).
        {
            key: 'command.subcommand',
            value: function(...) {
            }
        }
    ],

#### exports ####
An array of method or property names that will be made available from outside. Everything else can only be accessed within the instance.

    exports: [
        'methodName',
        'propertyName'
    ]

## Included templates ##

* irc - Handling an IRC connection ( used in i2x )
* xmpp - Handling an XMPP connection ( used in i2x )
* store - Object based key/value store ( used in i2x )
* orm - ORM store, not tested