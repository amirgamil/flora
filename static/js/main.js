//bootstrap some PIXI gloabls for convenience
let Application = PIXI.Application,
    Sprite = PIXI.Sprite,
    TextureCache = PIXI.utils.TextureCache,
    Rectangle = PIXI.Rectangle,
    Resources = PIXI.Loader.resources;

//chosen based on ~ size of our trees    
const SQUARELENGTH = 16;
const NUM_FLOWERS = 30;
const NUM_ROCKS = 10;//25;
const NUM_WELLS = 2;
const NUM_LAKE = 20;
const NUM_EMPTY_SPACE = 10;
const NUM_GRASS = 50;
//number of tiles in one row according to the .png tileset
const NUM_COL_TILES = 22;
const STEP_SIZE = 1;

//some unique identifiers we assign to our Sprites for easier collision detection and other stuff
const TREE = "Tree";
//a background item which CANNOT be "walked over" e.g. should NOT allow sprite to move over it
//hence a "stop item"
const STOP_ITEM = "Stop_Item"
//a background item which CAN be "walked over" e.g. should allow sprite to move over it
//e.g. background grass
const BACKGROUND_ITEM = "Background_Item";

//size of displayed screen
const WIDTH = 640;
const HEIGHT = 480;
//size of moving window
const WINDOW_WIDTH = 100;
const WINDOW_HEIGHT = 100;

function getRandomArbitrary(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


class World extends Component {
    init() {
        //create the Pixi application
        this.pixiApp = new PIXI.Application({ 
            width: WIDTH,
            height: HEIGHT,
            antialias: true,    // default: false
            transparent: true, // default: false
            resolution: 1       // default: 1
          }
        );
        this.pixiApp.renderer.view.style.margin = "0 auto";
        this.pixiApp.renderer.view.display = "block";
        this.leftX = 44;
        this.leftY = 41;
        //global sprite offsets to help render the map as the camera moves
        this.playerOffsetX = 0;
        this.playerOffsetY = 0;
        //use this as a lot so calculate it once
        this.setup = this.setup.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.updateState = this.updateState.bind(this);
        this.outOfBounds = this.outOfBounds.bind(this);
        this.fillInGrid = this.fillInGrid.bind(this);
        this.generateSections = this.generateSections.bind(this);
        this.checkSpriteCollision = this.checkSpriteCollision.bind(this);
        this.loadTexture = this.loadTexture.bind(this);
        this.loadSectionsWithData = this.loadSectionsWithData.bind(this);
        this.getMap = this.getMap.bind(this);
        this.loadMap = this.loadMap.bind(this);
        this.renderMap = this.renderMap.bind(this);
        this.initGrid = this.initGrid.bind(this);
        this.getSpriteRowCol = this.getSpriteRowCol.bind(this);
        this.shouldSpriteStop = this.shouldSpriteStop.bind(this);
        this.player = {
            x: 0,
            y: 0
        }
        //2D array representing the "pixel chunks" on the board
        //each item holds a reference to the sprite at that pixel chunk - if group, will hold container
        //if "pixel chunk" is empty, it will just hold null
        this.grid = [] 
        //loop through intervals of `SQUARELENGTH` for each of the rows
        //add padding to account for gaps between cells so that game canvas does not stretch beyond full screen
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
        this.pixiApp.loader
              .add("/static/img/character.png")
              .add("/static/img/rpg.png")
              .add("/static/img/front.png")
              .add("/static/img/frontwall.png")
              .add("/static/img/houseRatio.png")
              .add("/static/img/walkwayside.png")
              .add("/static/img/walkwayup.png")
              .add("/static/img/grid.png")
              .add("/static/img/farm.png")
              .add("/static/img/rock.png")
              .add("/static/img/farmRatio.png")
              .add("/static/img/cliff.png")
              .add("/assets/tileset.json")
              .load(this.setup);
        //0 represents up, 1 is right, 2 is down, 3 is left
        //old 32x32
        this.walkingSteps = {0: [new Rectangle(192, 0, 32, 32), new Rectangle(224, 0, 32, 32), new Rectangle(256, 0, 32, 32)],
                             1: [new Rectangle(288, 0, 32, 32), new Rectangle(320, 0, 32, 32), new Rectangle(352, 0, 32, 32)],
                             2: [new Rectangle(0, 0, 32, 32), new Rectangle(32, 0, 32, 32), new Rectangle(64, 0, 32, 32)],
                             3: [new Rectangle(96, 0, 32, 32) ,new Rectangle(128, 0, 32, 32), new Rectangle(160, 0, 32, 32)] 
                            };
        
        //starts facing downwards                    
        this.orientation = 2;
        this.step = 0;
    } 


    initGrid() {
        for (let i = 0; i < this.maxRows; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.maxCols; j++) {
                //initalize all pixel chunks initially to null
                this.grid[i][j] = null;
            }
        }
    }


    loadTexture(col, row, textureCacheURL, ID, frame, container) {
        //recall some nuance, we set the 0,0 coordinate of our map to be 
        //at col = this.leftX and row = this.leftY, therefore, after we generate our row
        //we need to be transform our row/col by adjusting it accordingly
        const x = (col - this.leftX) * SQUARELENGTH;
        const y = (row - this.leftY) * SQUARELENGTH;
        const sprite = container.tile(TextureCache[textureCacheURL], x, y, 
                                                {u: frame[0], v: frame[1],
                                                tileWidth: frame[2], tileHeight: frame[3]});
        const object = {tileData: sprite, identifier: ID};
        this.fillInGrid(col, row, frame[2], frame[3], object);
        return sprite
    }


    outOfBounds(row, col) {
        if (row < 0 || row >= this.grid.length || col < 0 || col >= this.grid[0].length) {
            return true;
        }
        return false;
    }

    shouldSpriteStop(row, col) {
        if (this.outOfBounds(row, col) || (this.grid[row][col] && this.grid[row][col].identifier === STOP_ITEM)) {
            return true;
        }
        return false;
    }


    //helper method which gets the row and col (in terms of tiles of the map so 0...99)
    getSpriteRowCol() {
        //adjust row, col tile of current sprite
        this.playerColTile -= this.playerOffsetX / SQUARELENGTH;
        this.playerRowTile -= this.playerOffsetY / SQUARELENGTH;
        //reset playerOffset back to default
        this.playerOffsetX = 0;
        this.playerOffsetY = 0;
        return [this.playerColTile, this.playerRowTile];
    }

    //checks for a collision with our main sprite
    checkSpriteCollision() {
        let [origCol, origRow] = this.getSpriteRowCol();
        //get center of row, col
        let row = origRow + this.spriteHalfHeight;
        let col = origCol + this.spriteHalfWidth;
        //CODE TO HANDLE ALL OTHER COLLISIONS
        if (!this.outOfBounds(row, col)) {
            row = Math.round(row);
            col = Math.round(col);
            if (this.grid[row][col]) {
                const item = this.grid[row][col];
                if (item.identifier === TREE) {
                    //do something else
                    console.log("TREE!");
                    return ;
                } else if (item.identifier === BACKGROUND_ITEM) {
                    //do something?
                    return ;
                }
            } 
        } 
        //CODE TO HANDLE COLLISION WITH A STOP ITEM
        //need to check whether a sprite is moving INTO the collision (in which case
        //we want to restrict movement) or AWAY from the collision (in which case we
        //want to ALLOW movement)
        if (this.orientation === 1 || this.orientation === 3) {
            //check for the object in our grid that is a small step in 
            //the direction the sprite is moving in
            //orientation is 0 north and increments 1 clockwise, so if
            //orientation is 1, nextStep should be positive
            const nextStep = this.orientation === 1 ? 1 : -1;
            //note operation is important here, we need to ceil the operation 
            //becuase our grid is in whole integer increments but for precision, we
            //col/row tiles return a decimal value => for example, if we have 
            //grid [a, b] if the sprite is halfway into b, pixel value will be that of a + some decimal
            let nextCol = Math.ceil(origCol + 0.5 * nextStep * this.spriteHalfWidth);
            if (this.shouldSpriteStop(row, nextCol)) {
                this.sprite.vx = 0;
            }
        } else {
            const nextStep = this.orientation === 2 ? 1 : -1;
            let nextRow = Math.ceil(origRow + 0.5 * nextStep * this.spriteHalfHeight)
            if (this.shouldSpriteStop(nextRow, col)) {
                this.sprite.vy = 0;
            }
        }

    }


    getRandomLocation(width, height) {
        //randomly select a pixel chunk to return
        if ((width > SQUARELENGTH) || (height > SQUARELENGTH)) {
            const numSquaresWide = Math.ceil(width / SQUARELENGTH);
            const numSquaresHigh = Math.ceil(height / SQUARELENGTH)
            const val = [Math.floor(Math.random() * this.grid.length - numSquaresHigh), Math.floor(Math.random() * this.grid[0].length - numSquaresWide)];
            return val;
        }
        return [Math.floor(Math.random() * this.grid.length), Math.floor(Math.random() * this.grid[0].length)]
    }


    //fills in an object greater than our square size into the corresponding cells in our grid
    //x, y correspond to the top left point of our image
    fillInGrid(col, row, width, height, object) {
        //TODO: fix this, not sure?
        const numSquaresWide = Math.ceil(width / SQUARELENGTH);
        const numSquaresHigh = Math.ceil(height / SQUARELENGTH);
        for (let x = 0; x < numSquaresHigh; x++) {
            for (let y = 0; y < numSquaresWide; y++) {
                if (!this.outOfBounds(row + x, col + y)) {
                    this.grid[row + x][col + y] = object;
                    console.log(row, col);
                }
            }
        }
    }

    //helper wrapper method on the `fillInGrid` to do so from x, y coordinates
    fillInGridFromXY(x, y, width, height, object) {
        const row = Math.floor(y / SQUARELENGTH);
        const col = Math.floor(x / SQUARELENGTH);
        this.fillInGrid(col, row, width , height, object);
    }

    generateSections() {
        const sectionHeight = 10;
        const sectionWidth = 10; 
        //forbidden area is a col, row increment to each of the areas below
        //designed to add a little bit of room for text if applicable
        const forbiddenAreaLoc = [3, 3];
        const forbiddenAreaHeight = 3; 
        const forbiddenAreaWidth = 3; 
        const halfRows = Math.floor(this.maxRows / 2);
        const halfCols = Math.floor(this.maxCols / 2);
        //list of col,row of the different sectionWidth x sectionHeight sections to 
        //populate trees in
        const areas = [[20, 80], [30, 80], [40, 80], [50, 80], [60, 80], [70, 80], [80, 80]]
        var lastSection = null;
        //need to keep track of how many sections we ACTUALLY load
        var numSections = 0;
        for (let section = 0; section < areas.length ; section++) {
            const currSection = areas[section];
            const totalArea = sectionHeight * sectionWidth;
            //estimate ~ how many trees we can add, each tree is 2 * SQUARELENGTH
            const estimatePerSection = (totalArea - forbiddenAreaHeight * forbiddenAreaWidth) / 2; 
            var treesAdded = 0;
            const treeFrame = [160, 80, 16, 32];
            while (treesAdded < estimatePerSection) {
                const randRow = getRandomArbitrary(currSection[1], currSection[1] + sectionHeight);
                const randCol = getRandomArbitrary(currSection[0], currSection[0] + sectionWidth);
                if (!this.grid[randRow][randCol] || this.grid[randRow][randCol].identifier === BACKGROUND_ITEM) {
                    const tree = this.loadTexture(randCol, randRow, "/static/img/rpg.png", TREE, treeFrame, this.staticBackground);
                    //do something to hook tree to local added data
                }
                treesAdded += 1;
            }
        }
        return numSections;
    }

    //fetches our map JSON file 
    getMap() {
        return fetch("/map", {
            method: "GET",
            mode: "no-cors",
        }).then(result => result.json())
          .then(data => {
              this.map = data.map;
              this.maxRows = this.map.height;
              this.maxCols = this.map.width;
              this.initGrid();
              this.tileset = {};
              data.tileset.tiles.map((currTile, _) => {
                  this.tileset[currTile.id] = currTile.properties[0];
              });
          }).catch(ex => {
              console.log("Error fetching map: ", ex);
          })
    }


    //TODO: make more efficient, only load bit outside window, not entire view
    renderMap(initial = false) {
        //move the camera to give illusion of movement
        const layers = this.map.layers;
        const mapWidth = this.map.width;
        const mapHeight = this.map.height;
        this.staticBackground.position.set(0, 0);
        for (let layer = 0; layer < layers.length; layer++) {
            const currLayerData = layers[layer].data;
            //calculate exact window we need to iterate, since window is square
            //but data is a 1D array, we will still encounter some elements outside window
            //still a 4x improvement
            const start = (this.leftY * mapWidth - 1) + this.leftX;
            const end = start + WINDOW_WIDTH + (WINDOW_HEIGHT * mapWidth) + 1;
            for (let i = 0; i < currLayerData.length; i++) {
                //position on our screen
                //data is stored as one very long string, representing a 2D grid
                //y and x are in terms of rows and cols of tiles not raw pixels
                const y = i / mapHeight| 0;
                const x = i % mapWidth | 0;
                //choose tile, TODO: fix this
                if (currLayerData[i] !== 0) {
                    //only continue if in window of map
                    const yOffset = y - this.leftY;
                    const xOffset = x - this.leftX
                    //subtract 1 since 0 is empty in exported json map, and we want to 0-index
                    const zeroIndexedID = currLayerData[i] - 1;
                    const tileRow = Math.floor(zeroIndexedID / NUM_COL_TILES);
                    const tileCol = (zeroIndexedID % NUM_COL_TILES);
                    // const sprite = new PIXI.Texture(TextureCache["/static/img/rpg.png"]);
                    // sprite.frame = new PIXI.Rectangle(tileCol * SQUARELENGTH, tileRow * SQUARELENGTH, SQUARELENGTH, SQUARELENGTH);
                    // const layer = new PIXI.Sprite(sprite);
                    const xCoord = xOffset * SQUARELENGTH;
                    const yCoord = yOffset * SQUARELENGTH;
                    // this.staticBackground.addChild(layer);
                    const object = this.staticBackground.tile(TextureCache["/static/img/rpg.png"], xCoord, yCoord, 
                                                {u: tileCol * SQUARELENGTH, v: tileRow * SQUARELENGTH,
                                                tileWidth: SQUARELENGTH, tileHeight: SQUARELENGTH});
                    //only care about the highest level non-zero tile across layers
                    //TODO - not true? what about water?
                    this.grid[y][x] = {tileData: object, identifier: this.tileset[zeroIndexedID].value};
                    //don't do any culling by default, but the code is left like this in case
                    //I want to revisit it and try after failing to make it work correctly
                    // if (yOffset >= 0 && yOffset <= WINDOW_HEIGHT && xOffset >= 0 && xOffset <= WINDOW_WIDTH) {
                    // }
                }
            }
        }
    }

    loadMap() {
        return this.getMap()
            .then(() => {
                this.staticBackground = new PIXI.tilemap.Tilemap(TextureCache["/static/img/rpg.png"]);
                this.staticBackground.width = WIDTH;
                this.staticBackground.height = HEIGHT;
                this.renderMap(true);
                this.pixiApp.stage.addChild(this.staticBackground);
            }).catch(ex => {
                console.log("Error loading map: ", ex);
            });
    }

    //populate the sections with our data
    loadSectionsWithData(numSections) {
        //make fetch API call, iterate through each result, for now hard-code
        const results = [{dummy: true}, {dummy: true}, {dummy: true}, {dummy: true}];
        results.map(data => {
            //do stuff to display data
        });
    }
    //initial set up called to render the main screen
    setup() {
        this.loadMap()
            .then(() => {
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
                this.sprite.width = 16;
                this.sprite.height = 16;
                //TODO: figure out
                this.sprite.x = 160;
                this.sprite.y = 144;
                //use this as a lot so calculate it once
                this.spriteHalfWidth = this.sprite.width / 2 / SQUARELENGTH;
                this.spriteHalfHeight = this.sprite.height / 2 / SQUARELENGTH;
                this.playerColTile = this.leftX + Math.floor((this.sprite.x / SQUARELENGTH) + this.spriteHalfWidth);
                this.playerRowTile = this.leftY + Math.floor((this.sprite.y / SQUARELENGTH) + this.spriteHalfHeight);
                this.playerOffsetX = this.sprite.width / 2;
                this.playerOffsetY = this.sprite.height / 2;
                //Initialize velocities to 0 at start
                this.sprite.vx = 0;
                this.sprite.vy = 0;


                //Add the sprite to the stage
                this.pixiApp.stage.addChild(this.sprite);


                //Add all of the trees!
                this.generateSections();

                //Render the stage   
                this.pixiApp.renderer.render(this.pixiApp.stage);

                this.pixiApp.stage.scale.set(2, 2);


                //diplay our grid for debugging purposes
                // for (let row = 0; row < this.grid.length; row++) {
                //     for (let col = 0; col < this.grid[0].length; col++) {
                //         if (this.grid[row][col]) {
                //             const y = row - this.leftY;
                //             const x = col - this.leftX;
                //             const xCoord = x * SQUARELENGTH;
                //             const yCoord = y * SQUARELENGTH; 
                //             var graphics = new PIXI.Graphics();
                //             //set background as transparent to see original map
                //             graphics.beginFill(0, 0.1);
                //             if (this.grid[row][col] && this.grid[row][col].identifier === STOP_ITEM) {
                //                 graphics.lineStyle(1, 0xFF0000);
                //             } else {
                //                 graphics.lineStyle(1, 0x00ffff);
                //             }

                //             // draw a rectangle
                //             //remember col = x coordinate, and row corresponds to y coordinate
                //             graphics.drawRect(xCoord, yCoord, SQUARELENGTH, SQUARELENGTH);

                //             this.pixiApp.stage.addChild(graphics);
                //         }
                //     }
                // }

                //Add our ticker or game loop
                this.pixiApp.ticker.add(delta => this.gameLoop(delta));
            });

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
                    this.sprite.vy = -1 * STEP_SIZE;
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
                    this.sprite.vy = STEP_SIZE;
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
                    this.sprite.vx = -1 * STEP_SIZE;
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
                    this.sprite.vx = STEP_SIZE;
                    this.sprite.vy = 0;
                    this.step = (this.step + 1) % 3;
                }
                break
            case " ":
            case "Spacebar":
                console.log(this.getSpriteRowCol());
                break;
        }
    }

    handleKeyUp(evt) {
        if (this.sprite) {
            this.sprite.vx = 0;
            this.sprite.vy = 0;
        }
    }

    //delta = amount of fractional lag between frames
    //main game loop that gets called at x FPS where x depends on device (usually x = 60)
    gameLoop(delta) {
        //check if colliding with static background to prevent "walking through" it
        this.updateState(delta);
    }

    //handles updating the state of our game
    updateState(delta) {
        this.checkSpriteCollision();
        //subtract from sprite velocity since background position coordinate should be set equal
        //to the negative offset (moving forward should "pull the background back")
        this.playerOffsetX -= this.sprite.vx;
        this.playerOffsetY -= this.sprite.vy;
        // this.renderMap();
        //make it look like the player is moving by moving the background
        this.player.x += this.sprite.vx;
        this.player.y += this.sprite.vy;
        this.staticBackground.pivot.set(this.player.x, this.player.y);
        // if (this.sprite.vx > 0) {
        //     this.staticBackground.pivot.set(this.player.x - offsetX, this.player.y);
        // } 
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