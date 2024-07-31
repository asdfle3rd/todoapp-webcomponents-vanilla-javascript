const formTemplate = document.createElement('template');
formTemplate.innerHTML = `
<link rel="stylesheet" type="text/css"  href="/css/bootstrap.min.css">
<div class="d-flex justify-content-center align-items-center" style="height: 100px">
    <form id='input-form' class="d-flex">
        <input required type="text" id="todo-input" class="mr-2 d-flex w-100" placeholder="Add new todo">
        <button type="submit" class="btn btn-primary" style="min-width: 4em;">Add</button>
    </form>
</div>
`

class InputForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' })

        // append template
        this.shadowRoot.append(formTemplate.content.cloneNode(true));
    }

    connectedCallback() {
        // get references to relevant html elements
        this.form = this.shadowRoot.getElementById('input-form');
        this.input = this.shadowRoot.getElementById('todo-input');
        // setup component
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    handleFormSubmit(e) {
        e.preventDefault()
        const todoText = this.input.value.trim();
        if (todoText) {
            this.dispatchEvent(new CustomEvent('submit', { detail: todoText, bubbles: true }));
            this.input.value = '';
        }
    }
}

// component registration
customElements.define('input-form', InputForm)

// class export
export { InputForm };