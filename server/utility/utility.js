/*global module*/
/*global console*/
/*global require*/

var database = require( "../database.js" );
var UserModel = require( "../models/user_model.js" );
var globals = require( "../models/global_model.js" );
var http = require( "http" );

//a bunch of Utility functions, mainly for converting IDs into actual objects
//due to circular requires, we can't put these functions in User, Match, etc.
var Utility = module.exports =
{
    getUser: function( username, cb )
    {
        var userModel = new UserModel( username, cb );
    },
    
    //returns an object of all the user models
    getAllUsers: function( cb )
    {
        globals.getAllUserKeys( function( userKeys )
        {
            var users = {};
            var userCount = 0;
    
            var getUserFunc = function( userObj )
            {
                users[ userObj.username ] = userObj;
                userCount++;
        
                //once we've gathered every user object, we can begin sorting
                if ( userCount >= userKeys.length )
                {
                    cb( users );
                }
            }.bind(this);
    
            if ( userKeys.length <= 0 || ( userKeys.length === 1 && userKeys[ 0 ] === this.username ) )
            {
                cb( {} );
            }
            else
            {
                //get all the user objects from the DB, using the names passed in
                var userIndex;
                for ( userIndex = 0; userIndex < userKeys.length; userIndex++ )
                {
                    this.getUser( userKeys[ userIndex ], getUserFunc );
                }
            }
        }.bind(this));
    },
    
    getDatabaseDump: function( cb )
    {
        database.getAllKeys( function( keys )
        {
            var result = {};
            var resultsRemaining = keys.length;
            
            var resultFunc = function( key, dump )
            {
                result[ key ] = dump;
                resultsRemaining--;
                
                if ( resultsRemaining <= 0 )
                {
                    cb( result );
                }
            };
            
            var keyIndex;
            for ( keyIndex = 0; keyIndex < keys.length; keyIndex++ )
            {
                database.dump( keys[ keyIndex ], resultFunc.bind(this,keys[keyIndex]));
            }
            
            if ( keys.length <= 0 )
            {
                cb( {} );
            }
        }.bind(this));
    },
    
    restoreDatabaseFromDump: function( dump, cb )
    {
        if ( typeof( dump ) === "string" )
        {
            try { dump = JSON.parse( dump ); } catch (err) {}
        }
        database.delAll( function( success )
        {
            var keysRemaining = 0;
        
            var key;
            for ( key in dump )
            {
                keysRemaining++;
            }
                
            var restoreFunc = function( success )
            {
                keysRemaining--;
            
                if ( keysRemaining <= 0 )
                {
                    cb( true );
                }
            }.bind(this);
            
            if ( keysRemaining <= 0 )
            {
                cb( true );
            }
            else
            {
                for ( key in dump )
                {
                    database.restore( key, dump[ key ], restoreFunc );
                }
            }
        }.bind(this));
    },
    
    getUrlBody: function( url, cb )
    {
        if ( url.indexOf( "http://" ) !== 0 )
        {
            url = "http://" + url;
        }
        
        http.get( url, function(res)
        {
            var body = "";
            
            res.on( "data", function(chunk)
            {
                body += chunk;
            });
            
            res.on( "end", function()
            {
                try
                {
                    var data = body;
                    
                    if ( typeof( data ) === "string" )
                    {
                        data = JSON.parse( data );
                    }
                    
                    cb( true, data );
                }
                catch(err)
                {
                    cb( false, "Couldn't parse JSON: " + body );
                }
                
            });
        }).on( "error", function(e)
        {
            cb( false, e.message );
        });
    }
};