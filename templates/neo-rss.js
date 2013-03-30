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
    templateName: 'rss',

    //===============================================================================================
    // Config
    config: [
        'interval',
        'feeds'
    ],

    //===============================================================================================
    // Properties
    properties: [
        'util',
        'parser',
        'intervalObject',
        { key: 'feedTimes', value: {}}
    ],

    //===============================================================================================
    // Init
    init: function(ready)
    {
        self = this;
        self.util = require('util');
        self.parser = require('rssparser');

        var idxFeed = 0;
        for(idxFeed = 0; idxFeed < self.config.feeds.length; idxFeed++)
            self.feedTimes[idxFeed] = null;

        self.intervalObject = setInterval(self.checkFeeds, self.config.interval);

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
        function checkFeeds()
        {

            for(var idx = 0; idx < self.config.feeds.length; idx++)
                self.parseFeed(idx, self.config.feeds[idx]);
        },

        function parseFeed(thisIdx, thisFeed)
        {
            self.parser.parseURL(thisFeed, {}, function(err, content)
            {
                // Error case
                if( err || self.feedTimes[thisIdx] === undefined)
                {
                    self.signal('error', 'Reading feed '+thisFeed+' failed.');
                    return;
                }

                // First check of this feed
                if( self.feedTimes[thisIdx] === null )
                {
                    self.feedTimes[thisIdx] = content.items[0].published_at;
                    return;
                }

                // Feed has no updates
                if( content.items[0].published_at === self.feedTimes[thisIdx] )
                    return;

                // Find out how many new articles there are
                var cntNewItems = undefined;
                for( var idxItems = 0; idxItems < content.items.length; idxItems++ )
                {
                    if( content.items[idxItems].published_at === self.feedTimes[thisIdx] )
                    {
                        cntNewItems = idxItems;
                        break;
                    }
                }

                // New articles?
                if( cntNewItems === undefined || cntNewItems === 0 )
                    return;

                // Publish new articles to network
                for( var idxNewItems = (cntNewItems - 1); idxNewItems >= 0 ; idxNewItems--)
                {
                    var thisArticle = content.items[idxNewItems];
                    self.signal(
                        'update',
                        thisArticle.author,
                        thisArticle.published_at,
                        thisArticle.url,
                        thisArticle.title,
                        thisArticle.summary
                    );
                }

                // Set latest article
                self.feedTimes[thisIdx] = content.items[0].published_at;
            });
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
