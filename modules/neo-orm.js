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
var self;
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
        { name: "tables", value: {} },
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
        var self = this;
        this.fs = require('fs');
        this.path = require('path');
        this.util = require('util');
        this.persistence = require('persistencejs/lib/persistence').persistence;
        this.persistence.debug = false;
        
        if( this.config.type === 'mysql' ) {
            this.persistenceStore = require('persistencejs/lib/persistence.store.mysql');
            this.persistenceStore.config(
                this.persistence, 
                this.config.host, 
                this.config.port, 
                this.config.database, 
                this.config.user, 
                this.config.password
            );
        }
        else if( this.config.type === 'sqlite' ) {
            this.persistenceStore = require('persistencejs/lib/persistence.store.sqlite');
            this.persistenceStore.config(this.persistence,this.path.resolve(this.config.path, this.config.file));
        }

        this.session = this.persistenceStore.getSession();
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
        var self = this;

        // flush latest changes
        this.session.flush();
        this.session.flush();
        this.session.flush(function() {
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
            var self = this;
            
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
                        this.tables[table] = this.persistence.define(table, schema.tables[table]);
                    }
                }
            }
            
            // Load relations
            if( schema.relations ) { 
                for( var relation in schema.relations ) {
                    if( schema.relations.hasOwnProperty(relation) ) {
                        if( this.tables[schema.relations[relation].table]   &&
                            this.tables[schema.relations[relation].as]      ) {
                
                            this.tables[schema.relations[relation].table].hasMany(
                                schema.relations[relation].has,
                                this.tables[schema.relations[relation].as],
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
            return this.schema;
        },

        ////-----------------------------------------------------------------------------------------
        //  Create object
        function Create(name) {
            if( this.tables[name] ) {
                var newobj =  new this.tables[name](this.session);
                this.session.add(newobj);
                return newobj;
            }
            return undefined;
        }, 

        ////-----------------------------------------------------------------------------------------
        //  Get Tables object
        function Read(name, what, cb) {
            var self = this;
            if( this.tables && this.tables[name]) {                
                var allvars = this.tables[name].all(this.session);
                
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
            this.log('debug', 'UPDATE');
            cb();
        },
        
        ////-----------------------------------------------------------------------------------------
        //  Get Tables object
        function Delete(name, what, cb) {
            this.log('debug', 'DELETE');
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
