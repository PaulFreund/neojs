global.neurons = require('./lib/neurons.js');


var testobj = neurons.create({
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
        function roflcopter() {
            //console.log('test:'+self.util.inspect(self));
        },
        function output(name) {
            //console.log(self.util.inspect(self));
            console.log('outputfunct: '+self.testvar); 
        }
    ],
    slots: [
        function onTest() {
            console.log('Testevent');   
        }
    ],
    exports: [
        'roflcopter',
        'output'
    ]
});
    
testobj.output('testvar');
testobj.roflcopter();

