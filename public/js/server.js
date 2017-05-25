/*global encodeURIComponent*/
/*global XMLHttpRequest*/
/*global alert*/

var server =
{
    _sendRequest: function( url, params, cb )
    {
        var fullUrl = url;
        var addedParam = false;
        
        var key;
        for ( key in params )
        {
            if ( !addedParam )
            {
                fullUrl += "?";
                addedParam = true;
            }
            else
            {
                fullUrl += "&";
            }
            
            fullUrl += encodeURIComponent(key);
            fullUrl += "=";
            fullUrl += encodeURIComponent( params[key] );
        }
        
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", this._loadResponse.bind( this, oReq, cb ) );
        oReq.addEventListener("error", this._loadError.bind( this, oReq, fullUrl, cb ) );
        oReq.open("GET", fullUrl );
        oReq.send();
    },
    
    _loadResponse: function( oReq, cb )
    {
        //TODO - add in error handling and bad statuses and whatnot
        cb( JSON.parse( oReq.responseText ) );
    },
    
    _loadError: function( oReq, url, cb )
    {
        alert( "Failed to load URL: " + url + ".\n" + oReq.responseText );
        cb();
    },
    
    getUser: function( username, cb )
    {
        this._sendRequest( "user/get", { username: username }, cb );
    },
    
    playGame: function( username, gameId, cb )
    {
        this._sendRequest( "user/game/play", { username: username, gameId: gameId }, cb );
    }
};