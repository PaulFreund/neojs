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
    templateName: 'smtp',

    //===============================================================================================
    // Config
    config: [
        'user',
        'password',
        'host',
        'port',
        'secure'
    ],

    //===============================================================================================
    // Properties
    properties: [
        'util',
        'nodemailer'
    ],

    //===============================================================================================
    // Init
    init: function(ready)
    {
        self = this;

        self.retryCount = 0;
        self.retryErrorNotify = true;

        self.nodemailer = require('nodemailer');
        self.util = require('util');

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
    ],

    //===============================================================================================
    // Slots
    slots: [
        ////-----------------------------------------------------------------------------------------
        // Send a mail
        function sendMail(to, subject, message)
        {
            var transport = self.nodemailer.createTransport("SMTP", {
                host: self.config.host,
                secureConnection: self.config.secure,
                port: self.config.port,
                auth:
                {
                    user: self.config.user,
                    pass: self.config.password
                }
            });

            var mail = {
                from: self.config.user,
                to: to,
                subject: subject,
                text: message
            };

            transport.sendMail(mail, function(error, response)
            {
                if(error)
                    self.error(error);

                transport.close();
            });
        },
    ],

    //===============================================================================================
    // Exports
    exports: [
    ]

    //===============================================================================================
};

//###################################################################################################
