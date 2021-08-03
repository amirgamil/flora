//bootstrap some PIXI gloabls for convenience
let Application = PIXI.Application,
    Sprite = PIXI.Sprite,
    TextureCache = PIXI.utils.TextureCache,
    Rectangle = PIXI.Rectangle;

//chosen based on ~ size of our trees    
const SQUARELENGTH = 32;
const NUM_FLOWERS = 30;
const NUM_ROCKS = 25;
const NUM_WELLS = 2;
const NUM_LAKE = 20;
const NUM_EMPTY_SPACE = 10;

class World extends Component {
    init() {
        //create the Pixi application
        this.pixiApp = new PIXI.Application({ 
            width: 800,         // default: 800
            height: 600,        // default: 600
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
        this.populateTrees = this.populateTrees.bind(this);
        this.populateBackground = this.populateBackground.bind(this);
        this.addObjectsToBackground = this.addObjectsToBackground.bind(this);
        //2D array representing the "pixel chunks" on the board
        //each item holds a reference to the sprite at that pixel chunk - if group, will hold container
        //if "pixel chunk" is empty, it will just hold null
        this.grid = [] 
        //loop through intervals of `SQUARELENGTH` for each of the rows
        //add padding to account for gaps between cells so that game canvas does not stretch beyond full screen
        this.maxRows = Math.floor((this.pixiApp.renderer.height - 50) / (SQUARELENGTH));
        this.maxCols= Math.floor((this.pixiApp.renderer.width - 50) / (SQUARELENGTH));
        for (let i = 0; i < this.maxRows; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.maxCols; j++) {
                //initalize all pixel chunks initially to null
                this.grid[i][j] = null;
            }
        }
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        this.pixiApp.loader
              .add("/static/img/character.png")
              .add("/static/img/overlay.png")
              .add("/static/img/background.png")
              .add("/static/img/trees.png")
              .add("/static/img/rpg.png")
              .load(this.setup);
        //0 represents up, 1 is right, 2 is down, 3 is left
        //represe
        this.walkingSteps = {0: [new Rectangle(192, 0, 32, 32), new Rectangle(224, 0, 32, 32), new Rectangle(256, 0, 32, 32)],
                             1: [new Rectangle(288, 0, 32, 32), new Rectangle(320, 0, 32, 32), new Rectangle(352, 0, 32, 32)],
                             2: [new Rectangle(0, 0, 32, 32), new Rectangle(32, 0, 32, 32), new Rectangle(64, 0, 32, 32)],
                             3: [new Rectangle(96, 0, 32, 32) ,new Rectangle(128, 0, 32, 32), new Rectangle(160, 0, 32, 32)] 
                            };
        
        //starts facing downwards                    
        this.orientation = 2;
        this.step = 0;
    }

    //takes an object with a specific width and height, and assigns it to the 
    //world to cover the correct number of pixel chunks
    assignIrregularSizedObject(width, height) {
        //TODO:
        //this and put it in the `addObjectsToBackground`
    } 


    //takes a heuristic (i.e. number of objects) and a specific objects
    //and initializes the necessary sprites at random location, adding it to the world
    addObjectsToBackground(numberOfObject, subImageArray) {
        for (let i = 0; i < numberOfObject; i++) {
            const [row, col] = this.getRandomLocation();
            if (this.grid[row][col] === null) {
                let object = new PIXI.Texture(TextureCache["/static/img/rpg.png"]);
                object.frame = new Rectangle(...subImageArray);
                object = new Sprite(object);
                object.x = SQUARELENGTH * row;
                object.y = SQUARELENGTH * col;
                //TODO: resolve if object size is larger than width/height
                this.grid[row][col] = object; 
                this.pixiApp.stage.addChild(object);
            }
        }
    }
    
    //helper wrapper method to add a static object to the background
    addStaticObject(numberOfObject, subImageArrays) {
        //introduce
        while (subImageArrays.length > 0) {
            //divide by the subImageArray length to encourage "reaching" or using up
            //all of the possible combinations
            const currNum = Math.floor(Math.random() * numberOfObject / subImageArrays.length);
            const next = subImageArrays.shift();
            if (subImageArrays.length === 0) {
                this.addObjectsToBackground(numberOfObject, next);
            } else {
                this.addObjectsToBackground(currNum, next);
                numberOfObject -= currNum;
            }
        } 
    }

    getRandomLocation() {
        //randomly select a pixel chunk to return
        return [Math.floor(Math.random() * this.grid.length), Math.floor(Math.random() * this.grid[0].length)]
    }

    //populates background with static objects designed to make everything prettier
    populateBackground() {
        //heuristics
        //x flowers, n rocks, 1 well, 1 pond, pathways?
        //stores list of tuples (JS technically doesn't have tuples but we can "pretend it does") 
        // defined as (x, y, width, height) representing location of image in tileset
        const rocks = [[143, 80, 18, 15], [162, 80, 14, 16]];
        //flower top left, top right, bottom left onwards...
        const flowers = [[145, 96, 14, 16], [159, 97, 17, 15], [144, 112, 14, 13], [160, 112, 16, 13],
                         [175, 112, 18, 16], [192, 112, 16, 16]];
        const well = [[192, 64, 16, 32], [209, 77, 14, 17]];
        const lake = [[206, 0, 33, 16]];
        const emptyYard = [[0, 67, 48, 48]];
        //TODO: handle if size of item larger than the square, and assign the reference
        //to the correct neighboring items
        //1st rock, 2nd rock, 1st flower, 2nd flower
        this.addStaticObject(NUM_ROCKS, rocks);
        this.addStaticObject(NUM_FLOWERS, flowers);
        this.addStaticObject(NUM_WELLS, well);
        this.addStaticObject(NUM_LAKE, lake);
        this.addStaticObject(NUM_EMPTY_SPACE, emptyYard);
    }

    //populates random number of trees onto the canvas up to a maximum
    populateTrees(numTrees = 30) {
        this.addObjectsToBackground(numTrees, [96, 80, 32, 32]);
    }
    
    setup() {
        let backgroundTexture = TextureCache["/static/img/rpg.png"];
        backgroundTexture.frame = new Rectangle(113, 0, 30, 64);
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
        
        this.populateTrees();
        this.populateBackground();


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
                    this.sprite.vx = 0;
                    this.sprite.vy = 0;
                } else {
                    this.sprite.vy = -2;
                    this.sprite.vx = 0;
                    this.step = (this.step + 1) % 3;
                }
                break
            case "s":
            case "ArrowDown":
                if (this.orientation !== 2) {
                    this.orientation = 2
                    this.step = 0;
                    this.sprite.vx = 0;
                    this.sprite.vy = 0;
                } else {
                    this.sprite.vy = 2;
                    this.sprite.vx = 0;
                    this.step = (this.step + 1) % 3;
                }
                break
            case "a":
            case "ArrowLeft":
                if (this.orientation !== 3) {
                    this.orientation = 3;
                    this.step = 0;
                    this.sprite.vx = 0;
                    this.sprite.vy = 0;
                } else {
                    this.sprite.vx = -2;
                    this.sprite.vy = 0;
                    this.step = (this.step + 1) % 3;
                }
                break
            case "d":
            case "ArrowRight":
                if (this.orientation !== 1) {
                    this.orientation = 1;
                    this.step = 0;
                    this.sprite.vx = 0;
                    this.sprite.vy = 0;
                } else {
                    this.sprite.vx = 2;
                    this.sprite.vy = 0;
                    this.step = (this.step + 1) % 3;
                }
                break
        }
    }

    handleKeyUp(evt) {
        if (this.sprite) {
            this.sprite.vx = 0;
            this.sprite.vy = 0;
        }
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