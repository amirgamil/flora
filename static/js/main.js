//bootstrap some PIXI gloabls for convenience
let Application = PIXI.Application,
    Sprite = PIXI.Sprite,
    TextureCache = PIXI.utils.TextureCache,
    Rectangle = PIXI.Rectangle;



class World extends Component {
    init() {
        //create the Pixi application
        this.pixiApp = new PIXI.Application({ 
            width: 1500,         // default: 800
            height: 1000,        // default: 600
            antialias: true,    // default: false
            transparent: true, // default: false
            resolution: 1       // default: 1
          }
        );
        this.setup = this.setup.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.updateState = this.updateState.bind(this);
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        this.pixiApp.loader
              .add("/static/img/character.png")
              .add("/static/img/overlay.png")
              .add("/static/img/background.png")
              .load(this.setup);
        //0 represents up, 1 is right, 2 is down, 3 is left
        this.walkingSteps = {0: [new Rectangle(192, 0, 32, 32), new Rectangle(224, 0, 32, 32), new Rectangle(256, 0, 32, 32)],
                             1: [new Rectangle(288, 0, 32, 32), new Rectangle(320, 0, 32, 32), new Rectangle(352, 0, 32, 32)],
                             2: [new Rectangle(0, 0, 32, 32), new Rectangle(32, 0, 32, 32), new Rectangle(64, 0, 32, 32)],
                             3: [new Rectangle(96, 0, 32, 32) ,new Rectangle(128, 0, 32, 32), new Rectangle(160, 0, 32, 32)] 
                            };
        //starts facing downwards                    
        this.orientation = 2;
        this.step = 0;
    }
    
    setup() {
        let backgroundTexture = TextureCache["/static/img/background.png"];
        backgroundTexture.frame = new Rectangle(300, 0, 100, 50);
        //Create and add background
        this.overlay = new PIXI.TilingSprite(backgroundTexture, 600, 600);
        // this.overlay = new Sprite(TextureCache["/static/img/overlay.png"])
        this.pixiApp.stage.addChild(this.overlay);

        //Create the `tileset` sprite from the texture
        let texture = TextureCache["/static/img/character.png"];
        //Create a rectangle object that defines the position and
        //size of the sub-image you want to extract from the texture
        let rectangle = new Rectangle(0, 0, 32, 32);
        //tell texture to only use that rectangle
        texture.frame = rectangle;
        //Create the sprite from the texture
        //Sprite is how we interact with our thoughts!
        this.sprite = new Sprite(texture);
        //Position the sprite on the canvas
        this.sprite.x = 32;
        this.sprite.y = 32;
        //Initialize velocities to 0 at start
        this.sprite.vx = 0;
        this.sprite.vy = 0;

        //Add the sprite to the stage
        this.pixiApp.stage.addChild(this.sprite);
        
        //Render the stage   
        this.pixiApp.renderer.render(this.pixiApp.stage);

        //Add our ticker or game loop
        this.pixiApp.ticker.add(delta => this.gameLoop(delta));
    }

    handleKeyDown(evt) {
        evt.preventDefault();
        //Note Up = negative y (coordinates start top left)
        switch (evt.key) {
            case "w":
            case "ArrowUp":
                if (this.orientation !== 0) {
                    this.orientation = 0
                    this.step = 0;
                } else {
                    this.sprite.vy = -2;
                    this.step = (this.step + 1) % 3;
                }
                break
            case "s":
            case "ArrowDown":
                if (this.orientation !== 2) {
                    this.orientation = 2
                    this.step = 0;
                } else {
                    this.sprite.vy = 2;
                    this.step = (this.step + 1) % 3;
                }
                break
            case "a":
            case "ArrowLeft":
                if (this.orientation !== 3) {
                    this.orientation = 3;
                    this.step = 0;
                } else {
                    this.sprite.vx = -2;
                    this.step = (this.step + 1) % 3;
                }
                break
            case "d":
            case "ArrowRight":
                if (this.orientation !== 1) {
                    this.orientation = 1;
                    this.step = 0;
                } else {
                    this.sprite.vx = 2;
                    this.step = (this.step + 1) % 3;
                }
                break
        }
        console.log(this.sprite.vx, this.sprite.vy, this.orientation, this.step);
    }

    handleKeyUp(evt) {
        this.sprite.vx = 0;
        this.sprite.vy = 0;
    }

    //delta = amount of fractional lag between frames
    gameLoop(delta) {
        this.updateState(delta);
    }

    updateState(delta) {
        this.sprite.x += this.sprite.vx;
        this.sprite.y += this.sprite.vy;
        this.sprite.texture.frame = this.walkingSteps[this.orientation][this.step];
    }

    remove() {
        window.removeEventListener("keydown", this.handleKeyBoardInput);
    }

    create() {
        return html`<div class="colWrapper gameContainer">
            ${this.pixiApp.view}
        </div>`
    }
}

const about = html`<div class="colWrapper">
    <h1>About</h1>
    <p>Stuff... 
    </p>
</div>`

class App extends Component {
    init() {
        //initalize stuff here
        this.router = new Router(1);
        this.world = new World();
        this.router.on({
            route: ["/", "/about"],
            handler: (route) => {
                this.route = route;
                this.render();
            }
        })
    }

    create() {
        return html`<main>
            <div class = "content">
                ${() => {
                    switch (this.route) {
                        case "/about":
                            return about;
                        default:
                            return this.world.node;
                    }
                }}
            </div>
            <footer>Built with <a href="https://github.com/amirgamil/poseidon">Poseidon</a> by <a href="https://amirbolous.com/">Amir</a></footer>
        </main>` 
    }
}

const app = new App();
document.body.appendChild(app.node);