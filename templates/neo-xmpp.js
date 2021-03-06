
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
        { key: 'carbons', value: false },
        { key: 'silent', value: true }
    ],
    
    //===============================================================================================
    // Properties
    properties: [
        'xmpp',
        'util',
        'server',
        'presence',
        { key: 'roster', value: {}},
        { key: 'carbonsEnabled', value: false }
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
            // Try to enable carbons on server if desired
            if( self.config.carbons )
            {
                var iq = new self.xmpp.Element(
                    'iq',
                    {type:'set', id: 'enable_carbons', 'xmlns': 'jabber:client'}
                );
                iq.c('enable', {'xmlns': 'urn:xmpp:carbons:1'});
                self.server.send(iq);
            }

            self.server.send(self.presence);

            // Request the Rooster
            var iq = new self.xmpp.Element('iq', {type:'get', id: 'neoxmppreq'});
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
        // Returns bare jid
        function jidToBare(jid) {
            return jid.split("/")[0];
        },

        ////-----------------------------------------------------------------------------------------
        // If an error occurs
        function onError(error) {
            self.error(error);
        },
        
        ////-----------------------------------------------------------------------------------------
        // Stanza ( abstract message from server ) arrives // http://xmpp.org/rfcs/rfc6121.html
        function onStanza(stanza) {
            if(stanza.attrs.type === 'error') {
                self.onError('Got an error from XMPP server');
            }

            // Check if carbons are enabled
            if( stanza.name === 'iq' && stanza.attrs.id && stanza.attrs.id === 'enable_carbons')
            {
                if( stanza.attrs.type && stanza.attrs.type === 'result' && self.config.carbons )
                    self.carbonsEnabled = true;
            }

            // Retrieve the rooster on connect ( or request )
            if( stanza.name === 'iq' && stanza.attrs.id && stanza.attrs.id === 'neoxmppreq')
            {
                for(var idxChild in stanza.children)
                {
                    if( !stanza.children.hasOwnProperty(idxChild) )
                        continue;

                    var thisChild = stanza.children[idxChild];
                    if( thisChild.name && thisChild.name === 'query')
                    {
                        for(var idxItem in thisChild.children)
                        {
                            if( !thisChild.children.hasOwnProperty(idxItem) )
                                continue;

                            var thisItem = thisChild.children[idxItem];

                            self.roster[self.jidToBare(thisItem.attrs.jid)] = {};
                            self.roster[self.jidToBare(thisItem.attrs.jid)].name = thisItem.attrs.name;
                        }
                    }
                }
            }

            // Prepare roster fields
            var friendlyName = undefined;
            if( ( stanza.name === 'message' || stanza.name === 'presence' ) && stanza.attrs.from )
            {
                if( self.roster[self.jidToBare(stanza.attrs.from)] === undefined)
                    self.roster[self.jidToBare(stanza.attrs.from)] = {};

                //if( self.roster[self.jidToBare(stanza.attrs.from)].online === undefined )
                //    self.roster[self.jidToBare(stanza.attrs.from)].online = false;

                friendlyName = self.jidToBare(stanza.attrs.from);
                if( self.roster[self.jidToBare(stanza.attrs.from)].name !== undefined )
                    friendlyName = self.roster[self.jidToBare(stanza.attrs.from)].name;
            }

            // Message from one of the clients
            if (stanza.name === 'message')
            {
                for(var child in stanza.children)
                {
                    if( !stanza.children[child].name )
                        continue;

                    // Process message body
                    if( stanza.children[child].name ==='body' )
                    {
                        var body = stanza.children[child];

                        var message = body.children.join('');

                        if( message.charAt(0) === '!')
                            self.signal('command', stanza.attrs.from, stanza.attrs.to, message, friendlyName);
                        else
                            self.signal('message', stanza.attrs.from, stanza.attrs.to, message, friendlyName);
                    }

                    // Process forwareded messages
                    if( stanza.children[child].name === 'sent' && self.config.carbons )
                    {
                        // Iterate through the children to get forwareded messages
                        for(var sentChild in stanza.children)
                        {
                            if(
                                !stanza.children[sentChild].name ||
                                stanza.children[sentChild].name !== 'forwarded'
                            )
                            { continue; }

                            var forwareded = stanza.children[sentChild];

                            // Iterate through forwareded messages
                            for(var forwarededChild in forwareded.children)
                            {
                                if(
                                    !forwareded.children[forwarededChild].name ||
                                    forwareded.children[forwarededChild].name !== 'message'
                                )
                                { continue; }

                                var forwarededMessage = forwareded.children[forwarededChild];

                                // Get Friendlyname of contact
                                var messagefriendlyName = undefined;

                                if( self.roster[self.jidToBare(forwarededMessage.attrs.to)] === undefined)
                                    self.roster[self.jidToBare(forwarededMessage.attrs.to)] = {};

                                messagefriendlyName = self.jidToBare(forwarededMessage.attrs.to);
                                if( self.roster[self.jidToBare(forwarededMessage.attrs.to)].name !== undefined )
                                    messagefriendlyName = self.roster[self.jidToBare(forwarededMessage.attrs.to)].name;

                                // Iterate through forwareded message children
                                for(var forwarededMessageChild in forwarededMessage.children)
                                {
                                    if(
                                        !forwarededMessage.children[forwarededMessageChild].name ||
                                        forwarededMessage.children[forwarededMessageChild].name !== 'body'
                                    )
                                    { continue; }

                                    var forwarededMessageBody = forwarededMessage.children[forwarededMessageChild];
                                    var message = forwarededMessageBody.children.join('');
                                    self.signal('sent', forwarededMessage.attrs.from, forwarededMessage.attrs.to, message, messagefriendlyName);
                                }
                            }
                        }
                    }
                }        
            }  
                 
            // Presence event
            if( stanza.is('presence'))
            {
                if( stanza.attrs.type === undefined )
                {
                    var show = undefined;
                    var status = undefined;

                    for(var idxChild in stanza.children)
                    {
                        if( !stanza.children.hasOwnProperty(idxChild) )
                            continue;

                        var thisChild = stanza.children[idxChild];
                        if( thisChild.name && thisChild.name === 'show' && thisChild.children.length > 0 )
                            show = thisChild.children[0];

                        if( thisChild.name && thisChild.name === 'status' && thisChild.children.length > 0)
                            status = thisChild.children[0];
                    }


                    //if( self.roster[self.jidToBare(stanza.attrs.from)].online !== true )
                    //{
                    //    self.roster[self.jidToBare(stanza.attrs.from)].online = true;
                        self.signal('online', stanza.attrs.from, friendlyName, show, status);
                    //}
                }
                else if ( stanza.attrs.type === 'unavailable')
                {
                    //if( self.roster[self.jidToBare(stanza.attrs.from)].online !== false )
                    //{
                    //    self.roster[self.jidToBare(stanza.attrs.from)].online = false;
                        self.signal('offline', stanza.attrs.from, friendlyName);
                    //}
                }
                else if( stanza.attrs.type === 'subscribe' )
                {
                    self.signal('subscribe', stanza.attrs.from, friendlyName);
                }
                else if( stanza.attrs.type === 'unsubscribe')
                {
                    self.signal('unsubscribe', stanza.attrs.from, friendlyName);
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
