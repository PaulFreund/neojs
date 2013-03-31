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
    templateName: 'store',
    
    //===============================================================================================
    // Config
    config: [
        'uri',
        { key: 'writeInterval', value: null },
        { key: 'cache', value: null },
        { key: 'json', value: null }
    ],
    
    //===============================================================================================
    // Properties
    properties: [
        "ueberDB",
        "util",
        "path",
        'db'
    ],
    
    //===============================================================================================
    // Init
    init: function(ready) {        
        self = this;
        self.ueberDB = require('ueberDB');
        self.util = require('util');
        self.path = require('path');

        var dbConfig = self.getDatabaseConfig(self.config.uri);
        if( dbConfig === undefined )
        {
            self.log('error', 'Loading store with uri failed: '+self.config.uri);
            return;
        }

        self.db = new self.ueberDB.database(dbConfig.type, dbConfig.databaseSettings, dbConfig.wrapperSettings);

        self.db.init(function(err) {
            if(err) {
                self.signal('error', 'Cant Init', err);
                self.log('error', err);
            } else {
                self.signal('ready');
                ready();
            }
        });
    },
    
    //===============================================================================================
    // Exit
    exit: function(ready) {
        ready();
    },

    //===============================================================================================
    // Methods
    methods: [
        function getDatabaseConfig(uri)
        {
            var dbType = undefined;
            var dbName = undefined;
            var dbPath = undefined;
            var dbPort = undefined;
            var dbUser = undefined;
            var dbPass = undefined;

            // Split [type]://[rest]
            var uriParts = uri.split('://');
            if( uriParts.length != 2)
                return undefined;

            dbType = uriParts[0];

            // Split [hostinformation]/[databasename]
            var locationParts = uriParts[1].split('/');
            if( locationParts.length < 1 || locationParts.length > 2 )
                return undefined

            // Get name
            if( locationParts.length === 2)
                dbName = locationParts[1];

            // Split [authinfo]@[pathinfo]
            var hostParts = locationParts[0].split('@');
            if( hostParts.length < 1 || hostParts.length > 2 )
                return undefined;

            var pathPart = undefined;
            if( hostParts.length === 2 ) // auth and host
            {
                pathPart = hostParts[1];

                // Split [username]:[password]
                var authParts = hostParts[0].split(':');
                if( authParts.length < 1 || authParts.length > 2 )
                    return undefined;

                dbUser = authParts[0];

                if( authParts.length === 2 )
                    dbPass = authParts[1];
            }
            else // only host
            {
                pathPart = hostParts[0];
            }

            // Split [pathname]:[port]
            var pathParts = pathPart.split(':');
            if( pathParts.length < 1 || pathParts.length > 2 )
                return undefined;

            dbPath = pathParts[0];

            if( pathParts.length === 2 )
                dbPort = pathParts[1];


            // Create database configuration objects
            var databaseSettings = {};
            switch( dbType )
            {
                //---------------------------------------------------------------------------
                case 'sqlite':
                    if( !dbPath ) { return undefined; }

                    // Workaround so application doesn't shut down
                    try { require('sqlite3'); } catch(err) { self.log('error', err); return undefined; }

                    databaseSettings.filename = dbPath;
                    break;

                //---------------------------------------------------------------------------
                case 'dirty':
                    if( !dbPath ) { return undefined; }

                    databaseSettings.filename = dbPath;
                    break;

                //---------------------------------------------------------------------------
                case 'mysql':
                    if( !dbPath || !dbUser || !dbPass || !dbName ) { return undefined; }

                    databaseSettings.host = dbPath;
                    databaseSettings.user = dbUser;
                    databaseSettings.password = dbPass;
                    databaseSettings.database = dbName;

                    if( dbPort )
                        databaseSettings.port = dbPort;
                    break;

                //---------------------------------------------------------------------------
                case 'postgres':
                    if( !dbPath || !dbUser || !dbPass || !dbName ) { return undefined; }

                    databaseSettings.host = dbPath;
                    databaseSettings.user = dbUser;
                    databaseSettings.password = dbPass;
                    databaseSettings.database = dbName;

                    if( dbPort )
                        databaseSettings.port = dbPort;
                    break;

                //---------------------------------------------------------------------------
                case 'leveldb':
                    if( !dbPath ) { return undefined; }

                    // Workaround so application doesn't shut down
                    try { require('leveldb'); } catch(err) { self.log('error', err); return undefined; }

                    databaseSettings.directory = dbPath;
                    break;

                //---------------------------------------------------------------------------
                case 'mongo':
                    if( !dbPath || !dbUser || !dbPass || !dbName || !dbPort ) { return undefined; }

                    databaseSettings.host = dbPath;
                    databaseSettings.user = dbUser;
                    databaseSettings.password = dbPass;
                    databaseSettings.dbname = dbName;
                    databaseSettings.port = dbPort;

                    // I know this is not right
                    databaseSettings.collectionName = dbName;
                    self.log('error', 'Warning, monogodb settings not properly implemented!')
                    break;

                //---------------------------------------------------------------------------
                case 'redis':
                    if( !dbPath  || !dbPass || !dbName || !dbPort ) { return undefined; }

                    databaseSettings.host = dbPath;
                    databaseSettings.password = dbPass;
                    databaseSettings.database = dbName;
                    databaseSettings.port = dbPort;

                    // I know this is not enough
                    databaseSettings.client_options = {};
                    break;

                //---------------------------------------------------------------------------
                case 'couch':
                    if( !dbPath || !dbUser || !dbPass || !dbName ) { return undefined; }

                    databaseSettings.host = dbPath;
                    databaseSettings.user = dbUser;
                    databaseSettings.pass = dbPass;
                    databaseSettings.database = dbName;
                    databaseSettings.maxListeners = undefined;
                    databaseSettings.port = dbPort;
                    break;

                //---------------------------------------------------------------------------
                case 'cassandra':
                    // Not needed at the moment
                    self.log('error', 'Warning, cassandra settings not implemented!')
                    return undefined;
                    break;
            }

            // Create wrapper settings
            var wrapperSettings = {};
            if( self.config.writeInterval !== null)
                wrapperSettings.writeInterval = self.config.writeInterval;

            if( self.config.cache !== null)
                wrapperSettings.cache = self.config.cache;

            if( self.config.json !== null)
                wrapperSettings.json = self.config.json;

            return {
                type: dbType,
                databaseSettings: databaseSettings,
                wrapperSettings: wrapperSettings
            };
        }
    ],
    
    //===============================================================================================
    // Slots
    slots: [
        ////-----------------------------------------------------------------------------------------
        // Get an object ( or subobject )
        function get(path, callback) {
            var sub = path.split('.');
            
            if( sub.length > 0) {
                
                if( sub.length < 1) {
                    self.db.get(sub[0], function(err, value) {
                        if(err) {
                            self.log('error', err);
                            callback(undefined);
                        }
                        else {
                            callback(value);
                        }
                    });
                } 
                else {
                    self.db.getSub(sub[0], sub.slice(1), function(err, value) {
                        if(err) {
                            self.log('error', err);
                            callback(undefined);
                        }
                        else {
                            callback(value);
                        }
                    });
                }
            }
        },
        
        ////-----------------------------------------------------------------------------------------
        // Set an object ( or an subobjecct )
        function set(path, object, callback) {
            var sub = path.split('.');
            
            if( sub.length > 0) {
                
                if( sub.length < 2) {
                    self.db.set(sub[0], object);
                }
                else {
                    self.db.get(sub[0], function(err, data) {
                        if(!data || err) {
                            self.db.set(sub[0], {}, function(err) {
                                var subpath = sub.slice(1);
        
                                self.db.setSub(sub[0], subpath, object, function(err) {
                                    if(err)
                                        self.log('error', err);
                                    
                                    if( callback )
                                        callback(err);
                                });    
                            });
                        }
                        else {
                    
                            var subpath = sub.slice(1);
    
                            self.db.setSub(sub[0], subpath, object, function(err) {
                                if(err)
                                    self.log('error', err);
                                
                                if( callback )
                                    callback(err);
                            });           
                        }
                    });
                }
            }
        },
        
        ////-----------------------------------------------------------------------------------------
        // Remove an object
        function remove(name, callback) {
            self.db.remove(name, callback);
        }
    ],
    
    //===============================================================================================
    // Exports
    exports: [
    ]
    
    //===============================================================================================
};

//###################################################################################################
