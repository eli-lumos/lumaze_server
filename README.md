# lumaze__server
node.js server for keeping track of scores for the games team Friday events and Lumaze.

Has a simple API for accepting game scores and storing them in redis. Can also show a high score list, etc.

Uses my own custom node.js MVC. Anything in the controllers folder has its functions iterated through and those become GET endpoints.