var ports = [];
self.addEventListener('connect', function(eventC){
  'use strict';
 
  ports = eventC.ports;
  var port = ports[0];

  port.postMessage('WorkerIO: connected');

  console.log('o************ OnConnect ************o\n\n'
    , '\t ports:', ports, '\n'
    , '\t port:', port, '\n'
  );

  port.addEventListener('message', function(eventM){
    var data = eventM.data;
    console.log('o************ OnMessage ************o\n\n'
      , '\t data:', data, '\n'
    );
    port.postMessage('from "clientPort": ' + clientPort.toString() + ', with love :)');
  }, false);

  port.start();
}, false);