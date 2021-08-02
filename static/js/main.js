class World extends Component {
    init() {
        let app = new PIXI.Application({ 
            width: 256,         // default: 800
            height: 256,        // default: 600
            antialias: true,    // default: false
            transparent: false, // default: false
            resolution: 1       // default: 1
          }
        );
    }

    create() {

    }
}



class App extends Component {
    init() {
        //initalize stuff here
    }

    create() {
        return html`<main>
            <footer>Built with <a href="https://github.com/amirgamil/poseidon">Poseidon</a> by <a href="https://amirbolous.com/">Amir</a></footer>
        </main>` 
    }
}

const app = new App();
document.body.appendChild(app.node);