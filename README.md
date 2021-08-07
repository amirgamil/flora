# Pluto
A 2D digital garden and world to explore your digital footprint.

Tileset 
- https://github.com/gathertown/mapmaking/tree/master/avatars/old%20avatars/pokemon
- https://opengameart.org/content/2d-lost-garden-tileset-transition-to-jetrels-wood-tileset
- https://opengameart.org/content/classic-rpg-tileset


Inspiration:
with current tileset 
- https://opengameart.org/content/classic-rpg-tileset

- https://twitter.com/Goodlyay/status/1150910528056729601/photo/1
- https://opengameart.org/content/classic-rpg-tileset

## How do we create the background?
This one was tricky. If I wanted to have as much control over loading
"the graph" dynamically depending on the information, I couldn't purely go with
a static pre-loaded background, which would have also made my life significantly easier.

Instead, we create a "grid" of our world and decompose it into small pixel chunks. We use those chunks to assign the location of trees (i.e. nodes of our graph) and surrounding space, for exploring their associated links.

We then use any remaining parts of our grid to "beautify" the world. Because we have decomposable pixel chunks, this turns out to be much easier to handle and keep track of which areas of space we've assigned and which we haven't. 

To "beautify" the world in a systematic way which introduces some level of randomness, we **use a number of heuristics for what kinds of objects and how many to add to the world.** So that means `x flowers`, `y rocks`, `1 well`, etc.


Main screen:
- Sections with different key words in different corners of the screen, each keyword has some "trees" linking to different data (page 1)
- Click on any data source pulls up data (not in the canvas, in Poseidon) as a scroll with metadata about the data (link to it)
- Other main page is for a specific data source (an article, note etc.) - main tree is in the middle of page
- And links to all other related via other trees