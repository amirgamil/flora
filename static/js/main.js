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

const PIG = "Pig"

const WATER = "Water";

//size of displayed screen
const WIDTH = 640;
const HEIGHT = 480;
//size of moving window
const WINDOW_WIDTH = 100;
const WINDOW_HEIGHT = 100;
const START_ROW = 41;
const START_COL = 44;

function getRandomArbitrary(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFromBucket() {
    var randomIndex = Math.floor(Math.random()*bucket.length);
    return bucket.splice(randomIndex, 1)[0];
 }


class Instructions extends Component {
    init(closeInstructions) {
        this.closeInstructions = closeInstructions;
        this.nextInstruction = this.nextInstruction.bind(this);
        this.prevInstruction = this.prevInstruction.bind(this);
        this.instructions = [{title: "Welcome!", content: `Welcome to the digital garden for my digital garden. Here, you'll
                              be able to browse through all of the data I care about and find
                              related data to go down spontaneous rabbit holes.`},
                             {title: "🏃‍♂️ Movement", content: `Move with W, A, S, and D or the arrow keys. The entire world is explorable, knock yourself out!`},
                             {title: "🏡 Trees and Data", content: `Every tree is some data. You can click it with your mouse, or walk towards it
                             and stand "on it." A window should pop up with some details.`},
                             {title: "🌳 Tree Type 1 ", content: `There are two types of trees. Trees above where you spawn will be circular
                             or fat. These are special trees - they're a handpicked collection of digital artifacts
                             that have impacted my life in some major way. `},
                             {title: "🌲 Tree Type 2", content: `The second type of tree will be found below the house. These are trees which contain data you
                             can find connections to and from. You do this by clicking on the <button class="closeModal" onclick=${this.closeInstructions}>⬇️ the 🐇 hole.</button> but not just yet!`},
                             {title: "🌲 Parent Tree", content: `The first tree of this type you will encounter will be on its own. This is the "parent" tree from which
                                                             you can view related pieces of data to it. On the first load, this is just my home page, and clicking on the
                                                             button will take you down a random rabbit hole!`},
                             {title: "⛓⛓️ Outgoing Connections", content: `You can view all data related to it if you keep walking below to the forests. These will contain
                             a clearing of trees from my footprint that are related to this root tree. You can then click on any one of those trees
                             to find all related data to that and so forth!`},
                            {title: "🌲🌲🌲First Forests", content: `On the first load, there is no 'parent tree'. So the forest contains a collection of data
                            that is most related to topics I care about (like side projects, community etc.). These are not handpicked! I use a custom semantic and text search algorithm
                            to find the most relevant data -> this is also how all the connections for a given piece of data are generated!`},
                            {title: "That's it!", content: `Have fun!`}];
        this.current = 0;

    }

    prevInstruction() {
        if (this.current > 0) {
            this.current -= 1;
            this.render();
        }     
    }

    nextInstruction() {
        if (this.current < this.instructions.length - 1) {
            this.current += 1;
            this.render();
        } else {
            this.closeInstructions();
        }
    }

    create() {
        return html`<div class = "treeModal instructions">
                    <h4 class="modalTitle">${this.instructions[this.current].title}</h4>
                    <p class="modalContent" innerHTML=${this.instructions[this.current].content}></p>
                    <button class="closeModal" onclick=${this.nextInstruction}>Next</button>
                    <button class="closeModal" onclick=${this.prevInstruction}>Back</button>
                    <button class="closeModal" onclick=${this.closeInstructions}>Close</button>
            </div>`
    }
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
        this.tick = new Date().getTime();
        //used to track time for our animations
        this.tileAnimationTick = 0;
        //used to track which frame to use for the animations
        this.tileAnim = 0;
        this.text = [];
        this.trees = [];
        this.showInstructions = true;
        this.removeInstructions = this.removeInstructions.bind(this);
        this.instructions = new Instructions(this.removeInstructions);
        this.pixiApp.renderer.view.style.margin = "0 auto";
        this.pixiApp.renderer.view.display = "block";
        this.leftX = START_COL;
        this.leftY = START_ROW;
        //global sprite offsets to help render the map as the camera moves
        this.playerOffsetX = 0;
        this.playerOffsetY = 0;
        this.showTreeModal = false;
        this.setup = this.setup.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleCursorMove = this.handleCursorMove.bind(this);
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
        this.displayTreeModal = this.displayTreeModal.bind(this);
        this.closeTreeModal = this.closeTreeModal.bind(this);
        this.updateSections = this.updateSections.bind(this);
        this.fillInRootTree = this.fillInRootTree.bind(this);
        this.removeTreeFromGrid = this.removeTreeFromGrid.bind(this);
        this.setSpriteDefaults = this.setSpriteDefaults.bind(this);
        this.setTreeForModal = this.setTreeForModal.bind(this);
        this.loadPigs = this.loadPigs.bind(this);
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
        this.loading = true;
        this.progress = 1;
        // this.pixiApp.view.addEventListener("mousemove", this.handleCursorMove)
        this.pixiApp.view.addEventListener("click", this.handleCursorMove);
        this.pixiApp.loader.onProgress.add(() => {
            this.progress = Math.round(this.pixiApp.loader.progress.toFixed(4));
            this.render();
            document.getElementById("bar").style.width = this.progress + "%";
        }); // called once per loaded/errored file
        this.pixiApp.loader
              .add("/static/img/character.png")
              .add("/static/img/rpg.png")
              .add("/assets/tileset.json")
              .add("SectionTitle", "/assets/SectionTitle.fnt")
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

    removeInstructions() {
        this.showInstructions = false;
        this.render();
    }

    fillInRootTree(data) {
        this.rootTree = data;
        this.grid[61][54].treeData = data;
        this.grid[62][54].treeData = data;
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


    loadTexture(col, row, textureCacheURL, ID, frame, container, options = {}) {
        //recall some nuance, we set the 0,0 coordinate of our map to be 
        //at col = this.leftX and row = this.leftY, therefore, after we generate our row
        //we need to be transform our row/col by adjusting it accordingly
        const x = (col - this.leftX) * SQUARELENGTH;
        const y = (row - this.leftY) * SQUARELENGTH;
        container.tile(TextureCache[textureCacheURL], x, y, 
                                                {u: frame[0], v: frame[1],
                                                tileWidth: frame[2], tileHeight: frame[3]});
        const object = {identifier: ID};
        if (options && ID === TREE) {
            object.treeData = options.data;
        }
        this.fillInGrid(col, row, frame[2], frame[3], object);
        return object; 
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
        let row = Math.round(origRow + this.spriteHalfHeight);
        let col = Math.round(origCol + this.spriteHalfWidth);
        // console.log(origCol, origRow, col, row);
        //CODE TO HANDLE ALL OTHER COLLISIONS
        if (!this.outOfBounds(row, col)) {
            if (this.grid[row][col]) {
                const item = this.grid[row][col];
                if (item.identifier === TREE) {
                    //don't keep calling it if it's already loaded
                    if (this.showTreeModal && this.treeData === item.treeData) return;
                    this.displayTreeModal(col, row, Math.floor(window.innerWidth / 2) - 50);
                    return ;
                } else if (item.identifier === BACKGROUND_ITEM) {
                    if (this.showTreeModal && !this.stopCursorMoving) {
                        this.closeTreeModal();
                    }
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
            console.log("first: ", nextCol, row);
            if (this.shouldSpriteStop(row, nextCol)) {
                this.sprite.vx = 0;
            }
        } else {
            const nextStep = this.orientation === 2 ? 1 : -1;
            let nextRow = Math.ceil(origRow + 0.5 * nextStep * this.spriteHalfHeight)
            console.log("first: ", col, nextRow);
            if (this.shouldSpriteStop(nextRow, col)) {
                this.sprite.vy = 0;
            }
        }

    }

    //loads a collection of important links that are static
    loadStaticTrees() {
        //note loads the 4x4 trees
        const treeLocs = [[47, 45], [58, 45], [46, 42], [61, 44], [49, 41], [46, 39], [49, 37], [46, 36], 
                          [62, 41], [60, 38], [58, 37], [63, 35]];
        const staticData  =  [{title: "The most precious resource is agency",
                         link: "https://simonsarris.substack.com/p/the-most-precious-resource-is-agency",
                         content: "Just read this.",
                         id: "special"
                        },
                        {title: "Inventing on principle",
                         link: "https://www.youtube.com/watch?v=PUv66718DII&ab_channel=RuiOliveira",
                         content: `Bret Victor's seminal piece which completely changed the way
                         I think about creative work.`,
                         id: "special"
                        },
                        {title: "Reflecting on building my own tools from scratch and 'inventing on principle'",
                         link: "https://amirbolous.com/posts/build",
                         content: "Reflecting on applying Bret Victor's piece in my personal life.",
                         id: "special"
                        },
                        {title: "Randy Pausch Last Lecture: Achieving Your Childhood Dreams",
                         link: "https://www.youtube.com/watch?v=ji5_MqicxSo",
                         content: "Pausch's last lecture which was the first inkling of how I wanted to live my life when I was still in high school.",
                         id: "special"
                        },
                        {title: "Before the Startup with Paul Graham", 
                         link: "https://www.youtube.com/watch?v=f4_14pZlJBs&ab_channel=YCombinator",
                         content: "PG's OG talk about startups when I was just a lost, bushy-tailed sophmore.",
                         id: "special"
                        },
                        {title: "How to understand things",
                         link: "https://nabeelqu.co/understanding",
                         content: "A phenomenal piece on curiosity and courage that I think about often when I'm battling trying to understand something.",
                         id: "special"
                        },
                        {title: "Trying to try", 
                         link: "https://www.lesswrong.com/posts/WLJwTJ7uGPA5Qphbp/trying-to-try",
                         content: "A class lesswrong piece which I refer back to in moments of self-doubt.",
                         id: "special"
                        },
                        {title: "Dive in",
                         link: "https://mindingourway.com/dive-in-2/",
                         content: "A framework that I'm reminded of every day when I'm trying to do something difficult and uncomfortable.",
                         id: "special"
                        },
                        {title: "You don't have to be busy to be prolific",
                         link: "https://thesephist.com/posts/momentum/",
                         content: "Doing this (working towards a project or something) every single day for 5 months (and running!) made me rethink how much progress in a given timeframe was possible.",
                         id: "special"
                        },
                        {title: "How I side project",
                         link: "https://thesephist.com/posts/how-i-side-project/",
                         content: "The piece that got me back into serially hacking after I spent a year lost and adrift.",
                         id: "special"
                        },
                        {title: "The Lesson to Unlearn",
                         link: "http://www.paulgraham.com/lesson.html",
                         content: "Every single problem I've had with school packaged in an absolute banger.",
                         id: "special"
                        },
                        {title: "Sources of Bullshit in Startups",
                         link: "https://www.youtube.com/watch?v=m4isFputh68&t=3489s&ab_channel=Decode",
                         content: "A super honest depiction of all the BS surrounding startups.",
                         id: "special"
                        }];
        treeLocs.map(([col, row], index) => {
            const object = {identifier: TREE, treeData: staticData[index]}
            this.fillInGrid(col, row, 32, 32, object);
        });
                        
    }

    loadPigs() {
        //pigs inside cage
        const topLeft = [50, 29];
        const topRight = [58, 29];
        const bottomLeft = [50, 33];
        const bottomRight = [58, 33];



        //pigs outside cage
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
        const numSquaresWide = Math.ceil(width / SQUARELENGTH);
        const numSquaresHigh = Math.ceil(height / SQUARELENGTH);
        //store array of col, row in the object for easy access to remove in the future
        //if we only have reference to the object e.g. with trees
        object.positions = [];
        for (let y = 0; y < numSquaresHigh; y++) {
            for (let x = 0; x < numSquaresWide; x++) {
                if (!this.outOfBounds(row + x, col + y)) {
                    this.grid[row + y][col + x] = object;
                    object.positions.push([col + x, row + y]);
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

    removeTreeFromGrid(object) {
        object.positions.map((position) => {
            const [col, row] = position;
            this.grid[row][col] = {};
        })
    }

    updateSections() {
        console.log("searching: ", this.treeData.id)
        fetch("/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                result: this.treeData
            })
        }).then(result => result.json())
          .then(data => {
              this.showTreeModal = false;
              this.render();
              //first remove trees from our grid
              this.trees.map((tree) => {
                this.removeTreeFromGrid(tree);
              });
              this.staticContainer.pivot.set(0, 0);

              this.leftX = START_COL;
              this.leftY = 52;
              this.setSpriteDefaults();
              this.trees.length = 0;

              this.stopCursorMoving = false;
              //set the sprite's location adjusted for where they will now be
              this.player = {x: 0, y: 0};

              this.text.map((currText) => {
                  currText.destroy();
              })
              //clear and refill the map, pixi tilemap is optimized for this so it's not
              //a performance drain
              this.renderMap();
              //delete all tree data by setting length of array as 0
              this.trees.length = 0;
              //set the root tree to the data we just clicked through
              this.fillInRootTree(data.previous);
              this.loadStaticTrees();
              console.log(data);
              this.generateSections(data);
          }).catch(ex => {
              console.log("Error going down the rabbit hole: ", ex);
          })
    }

    //main logic for generating forests at the bottom of the map
    //pass in data which is either 
    //1. Have JSON of {keyword: [result1, result2,...], keyword: [result1, ...] -> how we load at the start
    //2. Have JSON of {id: [result1, result2, ......]} if we are browsing nested or related 
    //connections
    generateSections(data) {
        const sectionHeight = 10;
        const sectionWidth = 10; 
        //forbidden area is a col, row increment to each of the areas below
        //designed to add a little bit of room for text if applicable
        const forbiddenAreaLoc = [3, 3];
        const forbiddenAreaHeight = 3; 
        const forbiddenAreaWidth = 3; 
        var bucket = []
        //create bucket from which we will draw coords
        for (let x = 0; x < sectionWidth; x++) {
            for (let y = 0; y < sectionHeight; y++) {
                const fDiffRow = y - forbiddenAreaLoc[1];
                const fDiffCol = x - forbiddenAreaLoc[0];
                if ((fDiffRow >= 0 && fDiffRow <= forbiddenAreaHeight) && (fDiffCol >= 0 && fDiffCol <= forbiddenAreaWidth)) {
                    continue;
                }
                //[col, row]
                bucket.push([x, y]);
            }
        }
        //list of col,row of the different sectionWidth x sectionHeight sections to 
        //populate trees in
        //list in order of importance - more important results closer to the middle
        const areas = [[50, 80], [40, 80], [60, 80], [30, 80], [70, 80], [20, 80], [80, 80]]
        //need to keep track of how many sections we ACTUALLY load
        var numSections = 0;
        const dataSections = []
        //standarize data format in preparation of constructing the forest
        //since data may come in two forms
        if (data.results) {
            //do stuff
            for (let i = 0; i < data.results.length; i += 50) {
                const index = i / 50;
                dataSections[index] = {[index]: data.results.splice(0, 50)};
            }
        } else {
            Object.keys(data).forEach((key, i) => {
                dataSections[i] = {[key]: data[key]}
            })
        }
        for (let section = 0; section < areas.length ; section++) {
            //if no more data available, stop adding trees
            if (section >= dataSections.length) break;
            const currSection = areas[section];
            //forest keyword is the keyword that is related to all of the trees
            //in a clearing
            const currForestKeyword = Object.keys(dataSections[section])[0];
            const currForestData = dataSections[section][currForestKeyword];
            const totalArea = sectionHeight * sectionWidth;
            const [lowerCol, lowerRow] = currSection;
            //use BitmapText instead of text to perserve quality as we scale text up
            let message = new PIXI.BitmapText(currForestKeyword, {fontName: "Early-GameBoy", 
                                                            fontSize: 8,
                                                            width: forbiddenAreaWidth * SQUARELENGTH,
                                                            height: forbiddenAreaHeight * SQUARELENGTH,
                                                            align: "center",
                                                            top: "30px"});
            this.staticContainer.addChild(message);
            //adjust the col, row to where we set 0,0 on our map
            message.position.set((lowerCol + forbiddenAreaWidth - this.leftX) * SQUARELENGTH, (lowerRow + forbiddenAreaHeight + 1 - this.leftY) * SQUARELENGTH);
            this.text.push(message);
            //estimate ~ how many trees we can add, each tree is 2 * SQUARELENGTH
            const estimatePerSection = Math.floor((totalArea - forbiddenAreaHeight * forbiddenAreaWidth) / 2); 
            //create copy to randomly populate current grid
            var currBucket = [...bucket];
            var treesAdded = 0;
            var id = 0;
            const treeFrame = [160, 80, 16, 32];
            //col and row < 5, col < 5 and row > 5, col > 5, and row < 5, col > 5 and row > 5
            while (treesAdded < estimatePerSection) {
                //if no more coords free, or no more search results break
                if (currBucket.length === 0 || treesAdded >= currForestData.length) break;
                const randIndex = Math.floor(Math.random() * currBucket.length);
                //splice/remove 2 values since each individual tree takes height of two,
                //and bucket is structured as [row1, col1], [row1, col2]..
                if (randIndex < currBucket.length - 1) {
                    if (currBucket[randIndex][0] === currBucket[randIndex + 1][0] && currBucket[randIndex][1] + 1 === currBucket[randIndex + 1][1]) {
                        const [randCol, randRow] = currBucket.splice(randIndex, 2)[0];
                        const [treeCol, treeRow] = [randCol + lowerCol, randRow + lowerRow]
                        const tree = this.loadTexture(treeCol, treeRow, "/static/img/rpg.png", TREE, treeFrame, this.staticBackground, {data: currForestData[id]});
                        id += 1;
                        //append reference to the object to our trees array
                        this.trees.push(tree);
                    }
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
                  this.tileset[currTile.id] = currTile.properties.reduce((prev, curr, _) => {
                    if (curr) {
                        prev[curr["name"]] = curr["value"]
                    }
                    return prev;
                  }, {});
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
        this.staticContainer.position.set(0, 0);
        //clear tileset if anything has been filled
        this.staticBackground.clear();
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
                if (currLayerData[i] !== 0) {
                    //only continue if in window of map
                    const yOffset = y - this.leftY;
                    const xOffset = x - this.leftX
                    //subtract 1 since 0 is empty in exported json map, and we want to 0-index
                    const zeroIndexedID = currLayerData[i] - 1;
                    const tileRow = Math.floor(zeroIndexedID / NUM_COL_TILES);
                    const tileCol = (zeroIndexedID % NUM_COL_TILES);
                    // const layer = new PIXI.Sprite(sprite);
                    const xCoord = xOffset * SQUARELENGTH;
                    const yCoord = yOffset * SQUARELENGTH;
                    this.grid[y][x] = this.tileset[zeroIndexedID];
                    const options = {u: tileCol * SQUARELENGTH, v: tileRow * SQUARELENGTH,
                                                tileWidth: SQUARELENGTH, tileHeight: SQUARELENGTH};
                    if (this.grid[y][x].metadata === WATER || this.grid[y][x].metadata === PIG) {
                        options.animX = 1;
                        options.animY = 0;
                        if (this.grid[y][x].metadata === PIG) {
                            options.animCount = 3;
                        } else {
                            options.animDivisor = 1;
                        }
                    }
                    //note tile returns the full new tilemap after adding this texture, so no use for it
                    this.staticBackground.tile(TextureCache["/static/img/rpg.png"], xCoord, yCoord, options);
                    //only care about the highest level non-zero tile across layers
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
                this.staticContainer = new PIXI.Container();
                this.staticBackground = new PIXI.tilemap.Tilemap(TextureCache["/static/img/rpg.png"]);
                this.staticBackground.width = WIDTH;
                this.staticBackground.height = HEIGHT;
                this.renderMap(true);
                this.staticContainer.addChild(this.staticBackground);
                this.pixiApp.stage.addChild(this.staticContainer);
            }).catch(ex => {
                console.log("Error loading map: ", ex);
            });
    }

    //populate the sections with our data
    loadSectionsWithData() {
        //load the initial home page with records matching closest to 
        //the things I care about the most
        fetch("/initialData", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                queries: ["side project", "community", "startup", "impact", "courage", "build"]
            })
        }).then(result => result.json())
          .then(data => {
              this.generateSections(data);
          }).catch(ex => {
              console.log("Error getting the initial data: ", ex);
          })
    }

    //helper method to set the sprite default values
    setSpriteDefaults() {
        this.playerColTile = this.leftX + Math.floor((this.sprite.x / SQUARELENGTH) + this.spriteHalfWidth);
        this.playerRowTile = this.leftY + Math.floor((this.sprite.y / SQUARELENGTH) + this.spriteHalfHeight);
        this.playerOffsetX = this.sprite.width / 2;
        this.playerOffsetY = this.sprite.height / 2;
    }

    //initial set up called to render the main screen
    setup() {
        this.loadMap()
            .then(() => {
                this.loading = false;
                this.render();
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
                this.sprite.x = 160;
                this.sprite.y = 144;
                //use this as a lot so calculate it once
                this.spriteHalfWidth = this.sprite.width / 2 / SQUARELENGTH;
                this.spriteHalfHeight = this.sprite.height / 2 / SQUARELENGTH;
                this.setSpriteDefaults();
                //Initialize velocities to 0 at start
                this.sprite.vx = 0;
                this.sprite.vy = 0;


                //manually populate the first "root tree" pointing to my website!
                const rootTree = {content: "Hi, I'm Amir and this is my digital garden. 🌳",
                                    id: "home",
                                    left: 293,
                                    link: "https://amirbolous.com/",
                                    title: "Welcome to my digital garden!",
                                    top: 20,
                                }
                this.loadStaticTrees();
                
                this.fillInRootTree(rootTree);

                //Get data from backend and load the trees!
                this.loadSectionsWithData();

                //Add the sprite to the stage
                this.pixiApp.stage.addChild(this.sprite);

            
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

    closeTreeModal() {
        this.showTreeModal = false;
        this.stopCursorMoving = false;
        this.render();
    }

    displayTreeModal(col, row, offsetX) {
        this.setTreeForModal(col, row, offsetX);
        this.showTreeModal = true;
        this.render();
        const modals = document.getElementsByClassName("treeModal");
        //instruction modal is still being displayed
        if (modals.length >= 2) {
            //transform object directly
            modals[1].style.transform = `translate(${this.treeData["left"]}px, ${this.treeData["top"]}px)`
        } else {
            modals[0].style.transform = `translate(${this.treeData["left"]}px, ${this.treeData["top"]}px)`
        }
    }

    //helper method to set up data in preparation for showing a modal
    setTreeForModal(col, row, offsetX) {
        this.treeData = this.grid[row][col].treeData;
        this.treeData["top"] = Math.floor(window.innerHeight / 2) - 220;
        if (offsetX <= 200) {
            this.treeData["left"] = offsetX
        } else if (offsetX - WIDTH <= 200) {
            this.treeData["left"] = offsetX - 200;
        }             
    }

    handleCursorMove(evt) {
        //get the cursor position relative to our map
        const offsetX = evt.offsetX - this.pixiApp.screen.x;
        const offsetY = evt.offsetY - this.pixiApp.screen.y;
        //note we divide by 2 since we scale our map by 2x before we render (so 
        //based on pixels, each tile of SQUARELENGTH effectives becomes 2 * SQUARRELENGTH)
        const col = Math.floor(this.leftX + offsetX / (2 * SQUARELENGTH));
        const row = Math.floor(this.leftY + offsetY / (2 * SQUARELENGTH));
        if (this.grid[row][col].identifier === TREE) {
            evt.preventDefault();
            //save ~ pixel location of tree to adjust the modal to the correct position
            this.stopCursorMoving = true;
            this.displayTreeModal(col, row, offsetX);
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
        //update the value that points to the top left corner of the game
        this.leftX -= this.playerOffsetX / SQUARELENGTH;
        this.leftY -= this.playerOffsetY / SQUARELENGTH;
        //make it look like the player is moving by moving the background
        this.player.x += this.sprite.vx;
        this.player.y += this.sprite.vy;
        this.staticContainer.pivot.set(this.player.x, this.player.y);
        this.sprite.texture.frame = this.walkingSteps[this.orientation][this.step];
        this.tick = new Date().getTime();
        // this.pixiApp.renderer.plugins.tilemap.tileAnim[0] = tileAnim * 144;
        if (this.tick > this.tileAnimationTick) {
            //update animations every 300ms
            this.tileAnimationTick = this.tick + 300;
            // console.log(this.pixiApp.renderer.plugins.tilemap.tileAnim);
            this.pixiApp.renderer.plugins.tilemap.tileAnim[0] = this.tileAnim * SQUARELENGTH;
            if (this.tileAnim === 1) {
                this.tileAnim = 0;
            } else {
                this.tileAnim = 1;
            }
        }


    }

    remove() {
        window.removeEventListener("keydown", this.handleKeyBoardInput);
    }

    create() {
        return html`<div class="colWrapper">
                ${this.loading ? html`<div class="loader"> 
                    <p class="loadingText">Loading ${this.progress}%</p>
                    <div id="bar"></div>
                </div></p>` : html`<div class="gameContainer"> 
                ${this.pixiApp.view}
                ${this.showInstructions ? this.instructions.node : null}
                ${this.showTreeModal ? html`<div class = "treeModal">
                    <h4 class="modalTitle">🌲 ${this.treeData.title}</h4>
                    <p><a href=${this.treeData.link} target="_blank">Source</a></p>
                    <p class="modalContent">${this.treeData.id === "home" || this.treeData.id === "special" ? this.treeData.content : this.treeData.content + "..."}</p>
                    ${() => {
                        if (this.treeData.id === "home") {
                            return html`<button class="closeModal" onclick=${this.updateSections}>⬇️ a 🐇 hole</button>`
                        } else if (this.treeData.id !== "special") {
                            return html`<button class="closeModal" onclick=${this.updateSections}>⬇️ the 🐇 hole</button>`
                        }
                    }}
                    <button class="closeModal" onclick=${this.closeTreeModal}>x</button>
                </div>` : null}
            </div>`}
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
            <footer>Built with <a href="https://github.com/amirgamil/poseidon">Poseidon</a> by <a href="https://amirbolous.com/">Amir</a> and <a href="https://github.com/amirgamil/pluto">open source</a> on GitHub</footer>
        </main>` 
    }
}

const app = new App();
document.body.appendChild(app.node);