global.neurons = require('./lib/neurons.js');
var util = require('util');

neurons.load({
    name: 'Testobj',
    depends: [
    ],
    modules: [
        'util'
    ],
    properties: [
        'testvar',
        { name: 'testvar2', value: 10 }
    ],
    methods: [
        function outputchain() {
            console.log('CHAINED');
        },
        function output(name) {
            console.log('outputfunct: '+this[name]); 
            this.outputchain();

        }
    ],
    slots: [
        function onTest() {
            console.log('Testevent');   
        }
    ],
    exports: [
        'output'
    ]
});


console.log(parseInt("010", 10));

neurons.Testobj.output('testvar2');
neurons.events.emit('onTest');


