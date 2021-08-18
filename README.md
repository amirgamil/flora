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
- https://englercj.github.io/gl-tiled/_demo/basic/?map=maps%2Flttp%2Flightworld%2Flightworld.json


## Nuance in the grid
Want to use math.ceil since anywhere inside a box will be a decimal of the last box, but need to access the associated value in the grid 
note operation is important here, we need to ceil the operation 
becuase our grid is in whole integer increments but for precision, we
col/row tiles return a decimal value => for example, if we have 
grid [a, b] if the sprite is halfway into b, pixel value will be that of a + some decimal

## How to populate data?
Ideas:
1. Query a "topic" or a specific data source
    a. topic -> returns of most relevant pieces of data regarding that
        i. Either via token-frequency overlap (searches all of data sources and finds most "overlapped" data sources)
        ii. Or embeddings and cosine similarity
2. Use embeddings to extract key themes or relevant articles
    How? Not sure
3. Just return most relevant articles without key themes -> scans across the list of computed embeddings and returns the most relevant ones

## How do we create the background?
Background is built in mapeditor, load the entire map on loading - pivot around the sprite to give illusion of movement

Models = pre-trained word embeddings from FastText (Creative Common License)
Corpus = store data for all of records with their assosicated doc2vec mappings

Todos:
- Remember to add map and tile files
- Remember to add corpus and models folder with `.keep`


Main screen:
- Sections with different key words in different corners of the screen, each keyword has some "trees" linking to different data (page 1)
    - 7 "sections"
        1. Just trees
        2. Flowers
        3. Farm land / vegetables
- Click on any data source pulls up data (not in the canvas, in Poseidon) as a scroll with metadata about the data (link to it)
- Other main page is for a specific data source (an article, note etc.) - main tree is in the middle of page
- And links to all other related via other trees