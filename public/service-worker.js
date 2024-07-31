// ### Utilities ###

// save a reference to the event source to
// check it's connection state and
// connect or disconnect it on 
// client connects and disconnects
let eventSource;

// timeoutId for the dead mans switch
let timeoutId;

// flag for the dead mans switch to see
// if the source connection was closed intentionally
let eventSourceClosed = false;

// create http responses
const respond = (mode) => new Response({}, { status: 200, statusText: mode })

// reconnect the event source if the connection fails
const setReconnectTimeout = () => {
  clearTimeout(self.timeoutId)
  self.timeoutId = setTimeout(() => {
    if (!self.eventSourceClosed) {
      self.eventSource.close();
      setupEventSource();
    }
  }, 20000);
}

// close the event source if it's not needed
const closeSource = async () => {
  let countClients = (await clients.matchAll()).length
  if (self.eventSource && countClients === 0) {
    console.log('closing event source')
    self.eventSourceClosed = true;
    self.eventSource.close();
  }
}

// broadcast messages
const postMessage = async (message) => {
  clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

// setup the event source for incoming messages
const setupEventSource = () => {
  console.log('setting up event source')
  self.eventSource = new EventSource('http://localhost:3000/events')

  // reset the event source closed flag on open
  self.eventSource.addEventListener('open', () => {
    self.eventSourceClosed = false;
    console.log('eventsource opened')
  })

  // listen to server sent message events
  self.eventSource.addEventListener('message', (event) => {
    console.log('message received: ', event.data)
    if (event.data === 'alive') {
      setReconnectTimeout();
    }
    if (event.data === 'file-present') {
      console.log('file-present event received in service worker')
      postMessage('file-present')
    }
    if (event.data === 'file-absent') {
      console.log('file-absent event in service worker');
      postMessage('file-absent');
    }
  });
}

// ### Serviceworker configuration ###

// setup event source and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil((() => {
    setupEventSource()
    return clients.claim();
  }))
})


// listen to client sent events
self.addEventListener('message', (event) => {
  // connect the source if it's not
  if (event.data === 'check-event-source-connected') {
    console.log('even source ready state on connect', eventSource?.readyState ?? 'no source')
    if (!self.eventSource || self.eventSource.readyState !== self.eventSource.OPEN) {
      setupEventSource()
    }
  }

  // try to close event source
  if (event.data === 'check-event-source-closable') {
      closeSource()
    }

})

// service worker that proxies the fetch requests
self.addEventListener('fetch', (event) => {
  // do nothing if it's not a get request
  if (event.request.method !== 'GET' || !event.request.url.endsWith('/static/isUnderMaintenance.json')) return;

  // return proxied response for maintenance file
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok) {
          return respond('maintenance')
        }
        return respond('operational')
      })
      .catch((e) => { console.error(e); return respond('') })
  );
});