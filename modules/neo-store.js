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
var self = null;
module.exports = {    
    //===============================================================================================
    
    //===============================================================================================
    // Name
    name: 'store',

    //===============================================================================================
    // Depends
    depends: [],    
    
    //===============================================================================================
    // Config
    config: [
        'file'
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
        this.ueberDB = require('ueberDB');
        this.util = require('util');
        this.path = require('path');

        var dbType = 'sqlite';
        var dbFile = self.config.file;

        // If sqlite is not available, use dirty
        try {
            require('sqlite3');
        }
        catch(err) {
            dbType = 'dirty';
            dbFile = 'dirty_'+self.config.file;
            self.log('debug', 'sqlite3 is not available, using dirty backend');
        }

        this.db = new this.ueberDB.database(dbType, {filename: dbFile});

        this.db.init(function(err) {
            if(err) {
                self.events.emit(self.name+'.error', 'Cant Init', err);
                self.log('error', err);
            } else {
                self.events.emit(self.name+'.ready');
                ready();
            }
        });
    },
    
    //===============================================================================================
    // Exit
    exit: function(ready) {
        var self = this;
        ready();
    },

    //===============================================================================================
    // Methods
    methods: [
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
