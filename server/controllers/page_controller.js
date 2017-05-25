/*global module*/
/*global require*/

var fs = require( "fs" );
var constants = require( "../utility/constants.js" );
var UserModel = require( "../models/user_model.js" );

var PageController = module.exports =
{
    _renderPage: function( page, request, response )
    {
        response.render( page );
    },
    
    index: function( request, response )
    {
        var players = constants.getPlayers();
        response.render( "index", { users: players } );
    },
    
    play: function( request, response )
    {
        var userModel = new UserModel( request.query.username, function( user )
        {
            response.render( "play", { user: user, games: constants.games } );
        }.bind(this));
    }
};

//automatically put in all the render functions from the jade files in the view
var suffix = ".jade";
var viewLocation = "./views";
fs.readdirSync( viewLocation ).forEach( function( file )
{
    if ( file.substr( -1 * suffix.length ) === suffix )
    {
        var pageName = file.substring( 0, file.length - suffix.length );
        if ( !PageController[ pageName ] )
        {
            PageController[ pageName ] = PageController._renderPage.bind( PageController, pageName );
        }
    }
});