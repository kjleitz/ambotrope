# ambotrope

It's a game that you play as a group (each at a computer) where you all see the same board. You each have to choose a tile from a hex grid and the objective is for no one to choose the same tile as someone else. You are allowed to select from a list of words that may give your teammates hints about your chosen location. The list of words is all things that you might see when looking for shapes in the clouds in the sky. Dog. Cat. Bowl of ice cream. Triangle. You try to triangulate yourself using these words. The background of the map is made of procedurally generated blobs that may or may not actually be representable by the words given. You must interpret your teammates' selected words to guess each of their respective positions, and choose a different place than they pick. You can tell your teammate that you think you have both chosen the same position, and you may choose who should vacate, but you shouldn't give them any information about your existing position or any possible move you might make on the board.

Open questions:

- How many hex tiles on the map?

I'm imagining maybe 2-3x the number of players. Maybe that should be configurable, and we'll decide on the default value later.

- How to procedurally generate the blobs? Should we try natural cloud-generating algorithms? Just random noise with good parameters?

I think probably random noise will be the easiest initially. The blobs should be biased to form near the vertices/corners of the hex tiles, but they don't have to perfectly center over the point. I've used perlin noise for this type of thing in the past, but I don't know what the best choice is currently, and the more interesting thing will be whatever bias function you'll need to use to influence blobs to appear close to the points of the hex tiles. Make sure the noise generator is modular so we can try different types of noise. Same with the bias function.

Notes:

All functionality should be implemented as libraries. Infrastructure should be terraform. Please use @/Users/keegan/Development/sixteenthirtyseven as a reference for how to set up the website and structure the project. We'll use many of the same technologies. We may not need an API for this one, nor postgres. We might not need much of a back end at all... maybe it communicates with an MQTT broker directly from the front end? Or basically a server that wraps the MQTT broker? I'm not sure how this is implemented.
