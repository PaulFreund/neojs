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
        "htdocs",
        { key: "authentication", value: false },
        "username",
        "password"
    ],

    //===============================================================================================
    // Properties
    properties: [
        "http",
        "httpServer",
        "express",
        "now",
        "app",
        "everyone"
    ],

    //===============================================================================================
    // Init
    init: function(ready) {
        self = this;
        self.http = require('http');
        self.express = require('express');
        self.now = require('now');

        self.app = self.express();

        self.httpServer = self.http.createServer(self.app);
        self.httpServer.listen(self.config.port);

        self.everyone = self.now.initialize(self.httpServer);

        self.app.configure(function()
        {
            if( self.config.authentication )
                self.app.use(self.express.basicAuth(self.config.username, self.config.password));

            self.app.use(self.app.router);
            self.app.use(self.express.methodOverride());
            self.app.use(self.express.bodyParser());
            self.app.use(self.express.static(process.cwd()+'/'+self.config.htdocs));
            self.app.use(self.express.errorHandler({
                dumpExceptions: true,
                showStack: true
            }));

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
        function registerPath(path, callback)
        {
            self.app.get(path, callback);
        },

        function registerClientFunction(name, callback)
        {
            if( self.everyone && self.everyone.now && !self.everyone.now[name] )
                self.everyone.now[name] = callback;
        },

        function callClientFunction(name, arguments)
        {
            if( self.everyone && self.everyone.now && self.everyone.now[name] )
                self.everyone.now[name].apply(this, arguments);
        }
    ],

    //===============================================================================================
    // Exports
    exports: [
    ]

    //===============================================================================================
};

//###################################################################################################