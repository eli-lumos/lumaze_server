/*global module*/
/*global console*/
/*global require*/

var database = require( "../database.js" );
var constants = require( "../utility/constants.js" );

//handles hanging onto global stuff
var GlobalModel = module.exports =
{
    getAllUserKeys: function( cb )
    {
        database.getArray( constants.usersKey, cb );
    },
    
    addUser: function( userOrUsername, cb )
    {
        userOrUsername = userOrUsername.username || userOrUsername;
        
        this.removeUser( userOrUsername, function( removedCount )
        {
            database.push( constants.usersKey, userOrUsername, cb );
        }.bind(this));
    },
    
    removeUser: function( userOrUsername, cb )
    {
        userOrUsername = userOrUsername.username || userOrUsername;
        
        database.removeFromList( constants.usersKey, userOrUsername, cb );
    }
};