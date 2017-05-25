/*global module*/
/*global console*/
/*global require*/

//var database = require( "../database.js" );
//var globalController = require( "./global_controller.js" );
//var constants = require( "../utility/constants.js" );

var UserModel = require( "../models/user_model.js" );

var UserController = module.exports =
{
    _getUser: function( usernameOrRequest, cb )
    {
        if ( usernameOrRequest.query )
        {
            usernameOrRequest = this._getUsername( usernameOrRequest );
        }
        
        if ( !usernameOrRequest )
        {
            return null;
        }
        
        var user = new UserModel( usernameOrRequest, cb );
    },
    
    _getUsername: function( request )
    {
        if ( !request.query.username )
        {
            console.log( "WARNING: trying to get a user with no username provided: URL: " + request.url );
        }
        
        return ( request.query.username || "error" ).toLowerCase();
    },
    
    heartbeat: function( request, response )
    {
        this._getUser( request, function( user )
        {
            user.lastTimeActive = new Date();
    
            user.save( function( result )
            {
                response.status( 200 ).json( result );
            });
        });
    },
    
    get: function( request, response )
    {
        this._getUser( request, function( user )
        {
            response.status( 200 ).json( user );
        });
    },
    
    reset: function( request, response )
    {
        this._getUser( request, function( user )
        {
            user.reset();
            user.save( function( success )
            {
                response.status( 200 ).json( { success: success } );
            });
        });
    },
    
    game:
    {
        play: function( request, response )
        {
            if ( !request.query.gameId )
            {
                response.status( 500 ).json( {success: false, error: "gameId is a required parameter." } );
            }
            else
            {
                this._getUser( request, function( user )
                {
                    user.playGame( request.query.gameId );
                    user.save( function( success )
                    {
                        response.status( 200 ).json( { success: success, user: user, userPlaysToday: user.getPlaysToday() } );
                    });
                });
            }
        }
    }
};