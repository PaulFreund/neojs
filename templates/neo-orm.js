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

var self = null // has to be set to this in init!, required for template access

//###################################################################################################

module.exports = {    
    //===============================================================================================
    
    //===============================================================================================
    // Name
    templateName: 'orm',

    //===============================================================================================
    // Config
    config: [
        "type",
        "host",  
        "port",
        "user",
        "password",
        "database",
        "file",
        "schema"
    ],
    
    //===============================================================================================
    // Properties
    properties: [
        { key: "tables", value: {} },
        'persistence',
        'persistenceStore',
        'session',
        'fs',
        'path',
        'util',
        'schema'
    ],
    
    //===============================================================================================
    // Init
    init: function(ready) {        
        self = this;
        self.fs = require('fs');
        self.path = require('path');
        self.util = require('util');
        self.persistence = require('persistencejs/lib/persistence').persistence;
        self.persistence.debug = false;
        
        if( self.config.type === 'mysql' ) {
            self.persistenceStore = require('persistencejs/lib/persistence.store.mysql');
            self.persistenceStore.config(
                self.persistence,
                self.config.host,
                self.config.port,
                self.config.database,
                self.config.user,
                self.config.password
            );
        }
        else if( self.config.type === 'sqlite' ) {
            self.persistenceStore = require('persistencejs/lib/persistence.store.sqlite');
            self.persistenceStore.config(self.persistence,self.path.resolve(self.config.path, self.config.file));
        }

        self.session = self.persistenceStore.getSession();
        self.loadSchema(self.config.schema);

        // Sync to db
        self.session.schemaSync(function(tx){
            self.log('debug', 'Schema synced');
            
            ready();
        });
  
    },
    
    //===============================================================================================
    // Exit
    exit: function(ready) {

        // flush latest changes
        self.session.flush();
        self.session.flush();
        self.session.flush(function() {
            self.session.close();
            ready();
        });
    },

    //===============================================================================================
    // Methods
    methods: [
        ////-----------------------------------------------------------------------------------------
        //  Create tables from schema 
        function loadSchema(schema) {
            
	        if( !schema ) {
                self.log('debug', 'Schema invalid');
                ready(false);
            }
            
            if( typeof(schema) === 'string' ) {
                schema = JSON.parse(self.fs.readFileSync(self.path.resolve(self.config.path, schema)));
            }
                        
            // Load tables
            if( schema.tables ) {
                for( var table in schema.tables ) {
                    if( schema.tables.hasOwnProperty(table) ) {
                        self.tables[table] = self.persistence.define(table, schema.tables[table]);
                    }
                }
            }
            
            // Load relations
            if( schema.relations ) { 
                for( var relation in schema.relations ) {
                    if( schema.relations.hasOwnProperty(relation) ) {
                        if( self.tables[schema.relations[relation].table]   &&
                            self.tables[schema.relations[relation].as]      ) {
                
                            self.tables[schema.relations[relation].table].hasMany(
                                schema.relations[relation].has,
                                self.tables[schema.relations[relation].as],
                                schema.relations[relation].id
                            );
                        }
                    }
                }
            }
            
            self.schema = schema;
        },
        
        ////-----------------------------------------------------------------------------------------
        //  Return schema
        function getSchema() {
            return self.schema;
        },

        ////-----------------------------------------------------------------------------------------
        //  Create object
        function Create(name) {
            if( self.tables[name] ) {
                var newobj =  new self.tables[name](self.session);
                self.session.add(newobj);
                return newobj;
            }
            return undefined;
        }, 

        ////-----------------------------------------------------------------------------------------
        //  Get Tables object
        function Read(name, what, cb) {
            if( self.tables && self.tables[name]) {
                var allvars = self.tables[name].all(self.session);
                
                if( what === 'all' ) {
                    allvars.list(null, function (results) {
                        cb(results);
                    });
                }
                else {
                    cb(null);
                }
            }
        },
        
        ////-----------------------------------------------------------------------------------------
        //  Get Tables object
        function Update(name, what, cb) {
            self.log('debug', 'UPDATE');
            cb();
        },
        
        ////-----------------------------------------------------------------------------------------
        //  Get Tables object
        function Delete(name, what, cb) {
            self.log('debug', 'DELETE');
            cb();
        },
        
        function test() {
            console.log('tested2 orm');   
        }
        
       
    ],
    
    //===============================================================================================
    // Slots
    slots: [
    ],
    
    //===============================================================================================
    // Exports
    exports: [
        'test',
        'Create',
        'Read',
        'test'
//        'Update'
//        'Delete',
//        'getSchema'
    ]
    
    //===============================================================================================
};

//###################################################################################################
