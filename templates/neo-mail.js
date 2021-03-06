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
    templateName: 'mail',

    //===============================================================================================
    // Config
    config: [
        'user',
        'password',
        'host',
        'port',
        'secure',
        { key: 'mailbox', value: 'INBOX' }
    ],

    //===============================================================================================
    // Properties
    properties: [
        'util',
        'imap',
        'connection',
        'mailbox',
        'retryCount',
        'retryErrorNotify'
    ],

    //===============================================================================================
    // Init
    init: function(ready)
    {
        self = this;

        self.retryCount = 0;
        self.retryErrorNotify = true;

        self.imap = require('imap');
        self.util = require('util');

        self.Connect();

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
        ////-----------------------------------------------------------------------------------------
        // Notify about errors
        function processError(err)
        {
            self.debug(err);
            self.error('Error checking mail the '+self.retryCount+'th time');
        },

        ////-----------------------------------------------------------------------------------------
        // New mail has been received
        function onMail(numNewMsgs)
        {
            self.fetchRecentMails(numNewMsgs);
        },

        ////-----------------------------------------------------------------------------------------
        // Connection has been closed
        function onClose(hadError)
        {
            self.Reconnect();
        },

        ////-----------------------------------------------------------------------------------------
        // Connection has ended
        function onEnd()
        {
            self.Reconnect();
        },

        ////-----------------------------------------------------------------------------------------
        // Error occured
        function onError(err)
        {
            self.processError(err);
            self.Reconnect();
        },

        ////-----------------------------------------------------------------------------------------
        // Connect to mailbox
        function onCallbackConnect(err)
        {
            self.connection.openBox(self.config.mailbox, true, function(err, mailbox)
            {
                if(err)
                {
                    self.mailbox = undefined;
                    return;
                }

                self.mailbox = mailbox;
                self.retryCount = 0;
                self.retryErrorNotify = true;
            });
        },

        ////-----------------------------------------------------------------------------------------
        // Reconnect
        function Reconnect()
        {
            self.retryCount++;

            if( self.retryCount >= 10 )
            {
                if( self.retryErrorNotify )
                {
                    self.retryErrorNotify = false;
                    self.processError('Retry count exceeded');
                }

                return;
            }

            self.Connect();
        },

        ////-----------------------------------------------------------------------------------------
        // Disconnect from server
        function Disconnect(callback)
        {
            self.mailbox = undefined;

            // If there already is a connection and it is connected, logout
	    if( self.connection !== undefined && self.connection !== null && self.connection.connected)
            {
                self.connection.logout(function() 
                {
                    self.connection = undefined;
                    if( callback )
                        callback();
                });
            }
            else
            {
                self.connection = undefined;
                if( callback )
                    callback();
            }
        },

        ////-----------------------------------------------------------------------------------------
        // Connect to server
        function Connect()
        {
            self.Disconnect(function() 
            {
                // Create connection
                self.connection = new self.imap({
                    user: self.config.user,
                    password: self.config.password,
                    host: self.config.host,
                    port: self.config.port,
                    secure: self.config.secure
                });
    
                // Set event listeners
                self.connection.on('mail', self.onMail);
                self.connection.on('close', self.onClose);
                self.connection.on('end', self.onEnd);
                self.connection.on('error', self.onError);
    
                // Call connect for connection
                self.connection.connect(self.onCallbackConnect);
            });
        },

        ////-----------------------------------------------------------------------------------------
        // Fetch new mails and notify about them
        function fetchRecentMails(count)
        {
            if( self.mailbox === undefined )
                return;

            var requestStart = self.mailbox.messages.total - ( count - 1 );

            self.connection.seq.fetch(
                requestStart + ':*',
                {
                    struct: false,
                    markSeen: false
                },
                {
                    headers: ['from', 'to', 'subject', 'date'],
                    body: false,
                    cb: function(fetch)
                    {
                        fetch.on('message', function(msg)
                        {
                            msg.on('headers', function(hdrs) {
                                self.signal(
                                    'message',
                                    hdrs.from.join(', '),
                                    hdrs.to.join(', '),
                                    hdrs.date.join(', '),
                                    hdrs.subject.join(', ')
                                );
                            });
                        });
                    }
                }
            );
        }
    ],

    //===============================================================================================
    // Slots
    slots: [
    ],

    //===============================================================================================
    // Exports
    exports: [
    ]

    //===============================================================================================
};

//###################################################################################################
