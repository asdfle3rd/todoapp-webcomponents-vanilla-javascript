// ### static template definition ###
const template = document.createElement('template');
template.innerHTML = `
    <link rel="stylesheet" type="text/css"  href="/css/bootstrap.min.css">
        <div id="card" class="bg-light bg-gradient card d-flex" style="height: 80vh;" >
            <div id="app-title" class="card-header text-primary justify-content-center d-flex w-100"></div>
            <slot name="inputForm"></slot>
            <slot name="todoList"></slot>
        </div>
`

class TodoApp extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // initialize fileds
        this.connected = false;
        this.currentMode = '';

        // add template to shadow dom
        this.shadowRoot.append(template.content.cloneNode(true));

        // register sw
        this.registerServiceWorker();
    }

    // define dynamic attributes
    static get observedAttributes() {
        return ["card-width", "app-title"];
    }

    attributeChangedCallback(name, oldvalue, newvalue) {
        if (name === 'card-width') {
            this.cardWidth = newvalue;
        }
        if (name === 'app-title') {
            this.title = newvalue;
        }
    }

    // define properties
    get cardWidth() {
        return this._cardWidth;
    }

    set cardWidth(value) {
        this._cardWidth = value;
        this.updateElements();
    }

    get title() {
        return this._title
    }

    set title(value) {
        this._title = value;
        this.updateElements();
    }

    connectedCallback() {
        // set connected state
        this.connected = true;

        // get references to relevant html elements
        this.card = this.shadowRoot.getElementById('card');
        this.appTitle = this.shadowRoot.getElementById('app-title');
        this.formComponent = this.ownerDocument.getElementById('input-form');
        this.listComponent = this.ownerDocument.getElementById('todo-list');

        // instruct service worker to connect to server
        navigator.serviceWorker?.controller?.postMessage('check-event-source-connected');
        
        // setup component
        this.setupEventListeners();
        this.updateElements();
        this.fetchInitialState();
        this.lockOverlay();
    }

    // register the service worker if the feature is available and it isn't already connected
    registerServiceWorker() {
        if (!navigator.serviceWorker) return;
        let { scriptURL, state } = navigator.serviceWorker?.controller || {};
        if (!scriptURL || scriptURL?.endsWith('service-worker.js') && state !== 'activated') {
            navigator.serviceWorker.register('service-worker.js', { scope: '/' })
                .catch((error) => {
                    console.error('Service worker registration failed:', error);
                });
        }
    }

    setupEventListeners() {
        // handle new todos
        this.formComponent.addEventListener('submit', e => this.listComponent.addTodo({ text: e.detail, completed: false }))
        // handle force refreshes
        navigator.serviceWorker?.ready.then(() => {
            if (!navigator.serviceWorker.controller) {
                window.location.reload();
                return;
            }
        });
        // check if event source can be disconnected on close or navigate
        // check connection if the tab becomes visible again
        document.addEventListener('visibilitychange', (e)=>{
            if (document.hidden){
                navigator.serviceWorker?.controller?.postMessage('check-event-source-closable')
            } else {
                navigator.serviceWorker?.controller?.postMessage('check-event-source-connected')
            }
        });
        // add maintenance mode back in if the network in not available and the classlist got changed
        navigator.serviceWorker?.addEventListener('message', (message) => {
            if (message.data === 'file-present') {
                this.classList.add('overlay')
                this.currentMode = 'maintenance'
            }
            if (message.data === 'file-absent') {
                this.currentMode = 'operational'
                this.classList.remove('overlay')
            }
        })
    }

    fetchInitialState() {
        fetch('/static/isUnderMaintenance.json', { silent: true })
            .then((res) => {
                // supress 404 error logging in console by proxying the request through the service worker
                // the second condition serves as a fallback
                // in case the service worker is not available and the file is present
                if (res.statusText === 'maintenance' || res.ok && res.statusText !== 'operational') {
                    this.classList.add('overlay')
                    this.currentMode = 'maintenance'
                    // if the proxied request errors (eg. timeout) nothing should be done
                } else if (res.statusText !== '') {
                    this.currentMode = 'operational'
                    this.classList.remove('overlay')
                }
            })
    }

    // watch for changes on the classlist
    // add class back in if it's get removed in maintenance mode
    lockOverlay() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (this.currentMode === 'maintenance' && !this.classList.contains('overlay')) {
                        this.classList.add('overlay');
                    }
                }
            });
        });

        observer.observe(this, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    // rerender the dynamic values
    updateElements() {
        if (this.connected) {
            this.card.style.width = this.cardWidth;
            this.appTitle.textContent = this.title;
        }
    }

    // set disconnected state
    disconnectedCallback() {
        this.connected = false;
    }

}

// component registration
customElements.define('todo-app', TodoApp);

// class export
export { TodoApp }