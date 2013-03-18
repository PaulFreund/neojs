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
    templateName: 'irc',

    //===============================================================================================
    // Config
    config: [
        'host',
        'name',
        'channel'
    ],
    
    //===============================================================================================
    // Properties
    properties: [
        "irc",
        "server"
    ],
    
    //===============================================================================================
    // Init
    init: function(ready) {        
        self = this;

        self.irc = require('irc');
        self.server = new self.irc.Client(
            self.config.host,
            self.config.name,
            {channels: [self.config.channel]}
        );
        
        // Events
        self.server.addListener('message', function(from, to, message) {
            if( message !== undefined )
            {          
                // Remove IRC Coloring :X \x80-\xFF
                message = message.replace(/[\x00-\x1F]/g, "");
    
                if( message.charAt(0) === '!')
                    self.signal('command', from, to, message);
                else
                    self.signal('message', from, to, message);
            }
        });
    
        self.server.addListener('names', function(channel, names) {
            self.signal('names', channel, names);
        });  
        
        self.server.addListener('topic', function(channel,topic, nick) {
            self.signal('topic', channel, topic, nick);
        });
    
        self.server.addListener('join', function(channel,nick) {
            self.signal('join', channel, nick);
        });
    
        self.server.addListener('part', function(channel,nick) {
            self.signal('part', channel, nick);
        });
        
        self.server.addListener('quit', function(nick, reason, channels) {
            self.signal('quit', channels, nick);
        });
        
        self.server.addListener('kick', function(channel,nick) {
            self.signal('kick', channel, nick);
        });
    
        self.server.addListener('nick', function(oldnick,newnick, channels) {
            self.signal('nick', oldnick, newnick, channels);
        });

        ready();
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
        ////-----------------------------------------------------------------------------------------
        // Send an IRC Command
        function send() {     
            self.server.send.apply(self,arguments);
        },
        
        ////-----------------------------------------------------------------------------------------
        // Send an IRC message
        function say(to, message) {     
            self.server.say(to, message);
        },
        
         ////-----------------------------------------------------------------------------------------
        // Send an IRC ACTION!
        function action(to, message) {     
            self.server.action(to, message);
        },       
        
         ////-----------------------------------------------------------------------------------------
        // Sets the channel topic
        function settopic(channel, message) {     
            self.server.send('TOPIC', channel, message);
        } 
    ],
    
    //===============================================================================================
    // Exports
    exports: [
    ]
    
    //===============================================================================================
};

//###################################################################################################
