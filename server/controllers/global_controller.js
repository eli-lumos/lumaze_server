/*global module*/
/*global require*/

var database = require( "../database.js" );
var utility = require( "../utility/utility.js" );
var globals = require( "../models/global_model.js" );

var GlobalController = module.exports =
{
    feature: function( request, response )
    {
        globals.setFeaturedGame( request.query.gameId, function()
        {
            response.status( 200 );
        });
    }
};