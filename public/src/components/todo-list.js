const listTemplate = document.createElement('template');
listTemplate.innerHTML = `
    <link rel="stylesheet" type="text/css" href="/css/bootstrap.min.css">
    <style>
        li:hover {
            opacity: 0.7;
            transition: opacity 0.3s ease-out 0s;
            cursor: pointer;
        }

        .button {
            z-index: 10;
            right: 0;
            top: 0;
            bottom:0;
            background-color: transparent;
            height: 100%;
            position: absolute;
            border: 0;
            color: red;
            font-size: 1.5em;
            transition: font-size 0.3s ease;
        }

        .button:hover {
            font-size: 1.75em;
        }
        li:has(+.button:hover) {
            opacity: 0.7;
        }

        :host {
            display: flex;
            overflow: hidden;
        }

    </style>
    <ul id='list' class="w-100 overflow-auto list-group"></ul>
`

const listItemTemplate = document.createElement('template');
listItemTemplate.innerHTML = `
    <li class="d-flex w-100 position-relative text-wrap text-break pl-3 pr-5 list-group-item text-light">
        <button class="button">🔥</button>
    </li>
`

// class definition
class TodoList extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // initialize fields
        this.connected = false;
        this.localstorageKey = 'todos';
        this.emptyListMessage = 'all done for today';
        this.completeBackgroundColor = 'hsl(120, 50%, 50%)';
        this.incompleteBackgroundColor = 'hsl(220, 50%, 50%)';
        this.todos = this.getTodosFromStorage();

        // append template
        this.shadowRoot.append(listTemplate.content.cloneNode(true));
    }

    // define dynamic attributes
    static get observedAttributes() {
        return ['empty-list-message']
    }

    attributeChangedCallback(name, oldvalue, newvalue) {
        // will always be empty-list-message
        this.emptyListMessage = newvalue;
    }

    // define properties
    get emptyListMessage() {
        return this._emptyListMessage;
    }

    set emptyListMessage(value) {
        this._emptyListMessage = value ?? '';
        if (this.connected && !this.todos.size) {
            this.render();
        }
    }


    connectedCallback() {
        // set connected state
        this.connected = true;

        // get references to relevant html elements
        this.list = this.shadowRoot.getElementById('list');

        // setup component
        // call disconnectedCallback on refresh and navigation to save todos
        window.addEventListener('beforeunload', () => this.disconnectedCallback())
        this.render();
    }

    render() {
        // show items or empty list message
        if (this.todos.size) {
            this.renderListItems();
        } else {
            this.list.innerHTML = `<div class="text-primary d-flex justify-content-center w-100">${this.emptyListMessage}</div>`
        }
    }

    // add a todo
    addTodo(todo) {
        this.todos.set(todo, todo)
        this.renderListItems();
    }

    // load todos
    getTodosFromStorage() {
        return new Map(JSON.parse(localStorage.getItem(this.localstorageKey) ?? '[]').map(todo => [todo, todo]));
    }

    // save todos
    saveTodosToStorage() {
        localStorage.setItem(this.localstorageKey, JSON.stringify(Array.from(this.todos.values()) ?? []));
    }

    // get background color for todo
    getBackgroundColor(todo) {
        return todo.completed ? this.completeBackgroundColor : this.incompleteBackgroundColor;
    }

    // render the list
    renderListItems() {
        // clear list empty list message
        this.list.innerHTML = '';
        // iterate todos
        for (const [todo] of this.todos) {
            // get item template
            const fragment = listItemTemplate.content.cloneNode(true);
            
            // setup item
            const listItem = fragment.querySelector('li');
            listItem.style.backgroundColor = this.getBackgroundColor(todo);
            listItem.append(todo.text);
            listItem.onclick = (e) => {
                todo.completed = !todo.completed;
                e.target.style.backgroundColor = this.getBackgroundColor(todo)
            }

            // setup item button
            const listItemButton = listItem.querySelector('button');
            listItemButton.onclick = (e) => {
                // remove item from memory and dom
                this.todos.delete(todo)
                e.target.parentElement.remove();
                // rerender if list is empty
                if (!this.todos.size) {
                    this.render();
                }
            }

            // append item to list
            this.list.append(fragment);
        };
    }

    // set disconnected state and save
    disconnectedCallback() {
        this.connected = false;
        this.saveTodosToStorage();
    }
}

// component registration
customElements.define('todo-list', TodoList)

// class export
export { TodoList }
