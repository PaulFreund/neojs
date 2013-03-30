
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
    templateName: 'xmpp',
    
    //===============================================================================================
    // Config
    config: [
        'jid',
        'password',
        'host',
        'port',
        { key: 'silent', value: true }
    ],
    
    //===============================================================================================
    // Properties
    properties: [
        'xmpp',
        'util',
        'server',
        'presence'
    ],
    
    //===============================================================================================
    // Init
    init: function(ready) {        
        self = this;

        self.xmpp = require('node-xmpp');
        self.util = require('util');
        
        self.server = new self.xmpp.Client( {
            jid     :self.config.jid,
            password:self.config.password,
            host    :self.config.host,
            port    :self.config.port
        });

        self.presence = new self.xmpp.Element('presence', {});

        if( !self.config.silent )
            self.presence.c('show').t('chat').up().c('status').t('Here for your service');

        // Events
        self.server.on('error' , self.onError);
        self.server.on('stanza', self.onStanza);
        
        self.server.on('online', function()
        {
            self.server.send(self.presence);
            
            // Request the Rooster
            var iq = new self.xmpp.Element('iq', {type:'get', id: 'i2xreq'});
            iq.c('query', {'xmlns': 'jabber:iq:roster'});
            self.server.send(iq);  
            
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
        
        ////-----------------------------------------------------------------------------------------
        // If an error occurs
        function onError(error) {
            self.log('error', error);
            //process.exit(1);            
        },
        
        ////-----------------------------------------------------------------------------------------
        // Stanza ( abstract message from server ) arrives // http://xmpp.org/rfcs/rfc6121.html
        function onStanza(stanza) {
            if(stanza.attrs.type === 'error') {
                self.signal('error', 'stanza error');
                self.onError('Got an error from XMPP server');
            }
                     
            // Retrieve the rooster on connect ( or request )
            if( stanza.name === 'iq' ) {
            }
                     
            // Message from one of the clients
            if (stanza.name === 'message') {
                for(var child in stanza.children) {
                    if( stanza.children[child].name !== undefined ) {
                        if( stanza.children[child].name ==='body' ) {   
                            var body = stanza.children[child];
                            
                            var message = body.children.join('');
                            
                            if( message.charAt(0) === '!') {
                                self.signal('command', stanza.attrs.from, stanza.attrs.to, message);
                            }
		                    else {
                                self.signal('message', stanza.attrs.from, stanza.attrs.to, message);
                            }
                        }
                    }
                }        
            }  
                 
            // Presence event
            if( stanza.is('presence')) {
                
                if( stanza.attrs.type === undefined ) {
                    self.signal('online', stanza.attrs.from);
                }
                else if ( stanza.attrs.type === 'unavailable') {
                    self.signal('offline', stanza.attrs.from);
                }
                else if( stanza.attrs.type === 'subscribe' ) {
                    self.signal('subscribe', stanza.attrs.from);
                }
                else if( stanza.attrs.type === 'unsubscribe') {
                    self.signal('unsubscribe', stanza.attrs.from);
                }
                else {
                    self.signal('presence', stanza.attrs.from, stanza.attrs.to, stanza);
                }
            }
        }    
    ],
    
    //===============================================================================================
    // Slots
    slots: [
        ////-----------------------------------------------------------------------------------------
        // Send a message to a contact
        function send(outto, message) {
            var out = new self.xmpp.Element('message', {
                to: outto,
                type: 'chat'
            });
            
            var body = out.c('body');
            body.t(message);
            
            self.server.send(out);
        },
        
        ////-----------------------------------------------------------------------------------------
        // Authorize a contact
        function subscribed(to) {
            var out = new self.xmpp.Element('presence', {
                to: to,
                from: self.config.jid,
                type: 'subscribed'
            });
            self.server.send(out);
            self.server.send(self.presence);
        },
        
        ////-----------------------------------------------------------------------------------------
        // Unautorhize a contact
        function unsubscribed(to) {
            var out = new self.xmpp.Element('presence', {
                to: to,
                from: self.config.jid,
                type: 'unsubscribed'
            });
            self.server.send(out);     
            self.server.send(self.presence);
        },
                
        ////-----------------------------------------------------------------------------------------
        // Add a contact
        function dosubscribe(to) {
            if( to !== undefined ) {
                var out = new self.xmpp.Element('presence', {
                    to: to,
                    type: 'subscribe'
                });
                self.server.send(out);
                self.server.send(self.presence);
            }
        },
        
        ////-----------------------------------------------------------------------------------------
        // Remove a contact
        function dounsubscribe(to) {
            var out = new self.xmpp.Element('presence', {
                to: to,
                type: 'unsubscribe'
            });
            self.server.send(out);     
            self.server.send(self.presence);
        },

        ////-----------------------------------------------------------------------------------------
        // Set status
        function setstatus(message) {
            self.presence = new self.xmpp.Element('presence', {});
            self.presence.c('show').t('chat').up().c('status').t(message);
            self.server.send(self.presence);
        }
    ],
    
    //===============================================================================================
    // Exports
    exports: [
    ]
    
    //===============================================================================================
};

//###################################################################################################
