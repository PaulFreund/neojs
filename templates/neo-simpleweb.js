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
    templateName: 'simpleweb',

    //===============================================================================================
    // Config
    config: [
        "host",
        "port",
        "htdocs"
    ],

    //===============================================================================================
    // Properties
    properties: [
        "http",
        "httpServer",
        "express",
        "now",
        "server",
        "everyone"
    ],

    //===============================================================================================
    // Init
    init: function(ready) {
        self = this;
        self.http = require('http');
        self.express = require('express');
        self.now = require('now');

        self.server = self.express();
        self.httpServer = self.http.createServer(self.server);

        self.server.listen(self.config.port);

        self.everyone = self.now.initialize(self.httpServer);


        self.everyone.on('join', function(){
            self.signal('onWebJoin', self.user);
        });

        self.server.get("/", function(req, res) {
            res.redirect("/index.html");
        });

        self.server.configure(function(){
            self.server.use(self.express.methodOverride());
            self.server.use(self.express.bodyParser());
            self.server.use(self.express.static(process.cwd()+'/'+self.config.htdocs));
            self.server.use(self.express.errorHandler({
                dumpExceptions: true,
                showStack: true
            }));

            self.server.use(self.server.router);

            // Add interfaces to store
            if( self.neo.store )
            {
                self.everyone.now.store = {};

                self.everyone.now.store.get = function(path, callback)
                {
                    self.events.emit('store.get', path, callback);
                };

                self.everyone.now.store.set = function(path, object, callback)
                {
                    self.events.emit('store.set', path, object, callback);
                };

                self.everyone.now.store.remove = function(name, callback)
                {
                    self.events.emit('store.remove', name, callback);
                };
            }

            ready();
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
    ],

    //===============================================================================================
    // Slots
    slots: [
        function notify(type, data)
        {
            if( self.everyone)
                self.everyone.onNotification(type, data);
        }
    ],

    //===============================================================================================
    // Exports
    exports: [
    ]

    //===============================================================================================
};

//###################################################################################################