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
    templateName: 'ircd',
    
    //===============================================================================================
    // Config
    config: [
        'network',
        'hostname',
        'serverDescription',
        'serverName',
        'port',
        'linkPort',
        'motd',
        'whoWasLimit',
        'token',
        'opers',
        'channels',
        'links',
        'pingTimeout',
        'maxNickLength'
    ],

    //===============================================================================================
    // Properties
    properties: [
        'ircd',
        'server'
    ],
    
    //===============================================================================================
    // Init
    init: function(ready)
    {
        self = this;

        // Todo:
        // - Patch ircd server to work on normal and ssl port at the same time
        // - Patch ircd to not log everything to console

        // Create and set config
        self.ircd = require('ircdjs');
        self.server = new self.ircd.Server();
        self.server.config = self.config;

        // Hook into main server
        self.hook(self.server, 'respond');
        self.hook(self.server, 'disconnect');
        self.hook(self.server, 'end');
        self.hook(self.server, 'close');

        // Hook into commands
        self.hook(self.server.commands, 'PONG');
        self.hook(self.server.commands, 'PING');
        self.hook(self.server.commands, 'PASS');
        self.hook(self.server.commands, 'AWAY');
        self.hook(self.server.commands, 'VERSION');
        self.hook(self.server.commands, 'TIME');
        self.hook(self.server.commands, 'NICK');
        self.hook(self.server.commands, 'USER');
        self.hook(self.server.commands, 'JOIN');
        self.hook(self.server.commands, 'PART');
        self.hook(self.server.commands, 'KICK');
        self.hook(self.server.commands, 'TOPIC');
        self.hook(self.server.commands, 'PRIVMSG');
        self.hook(self.server.commands, 'INVITE');
        self.hook(self.server.commands, 'MODE');
        self.hook(self.server.commands, 'LIST');
        self.hook(self.server.commands, 'NAMES');
        self.hook(self.server.commands, 'WHO');
        self.hook(self.server.commands, 'WHOIS');
        self.hook(self.server.commands, 'WHOWAS');
        self.hook(self.server.commands, 'WALLOPS');
        self.hook(self.server.commands, 'OPER');
        self.hook(self.server.commands, 'QUIT');
        self.hook(self.server.commands, 'MOTD');

        // Start the server
        self.server.start();
        self.server.createDefaultChannels();

        ready();
    },
    
    //===============================================================================================
    // Exit
    exit: function(ready)
    {
        ready();
    },

    //===============================================================================================
    // Methods
    methods: [
        function hook(object, name)
        {
            if( name && object[name])
            {
                var origName = name+'_orig';
                object[origName] = object[name];
                object[name] = function()
                {
                    var origThis = this;
                    var origArgs = Array.prototype.slice.call(arguments);

                    var eventName = self.id + '.' + name;
                    if( self.events.listeners(eventName).length > 0 )
                    {
                        self.signal.apply(this, [].concat(name, origArgs, function(newArgs) {
                            object[origName].apply(origThis, newArgs);
                        }));
                    }
                    else
                    {
                        object[origName].apply(origThis, origArgs);
                    }
                };
            }
        },

        function getChannels()
        {
            return self.server.channels;
        },

        function getUsers()
        {
            return self.server.users;
        }
],
    
    //===============================================================================================
    // Slots
    slots: [
    ],
    
    //===============================================================================================
    // Exports
    exports: [
        'getChannels',
        'getUsers'
    ]
    
    //===============================================================================================
};

//###################################################################################################