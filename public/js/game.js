/*global console*/
/*global document*/
/*global server*/
/*global location*/
/*global alert*/
/*global setTimeout*/

var game =
{
    params: null,
    allDirections: [ "n", "s", "e", "w" ],
    refreshRate: 10000,
    lastTimeRefreshed: 0,
    
    start: function( params )
    {
        this.params = params;
        this._refreshRoom();
        this._refreshUser();
        
        console.log( "Started game with params: " + JSON.stringify( params ) );
        
        setTimeout(function()
        {
            this.refresh();
        }.bind(this), this.refreshRate );
    },
    
    move: function( direction )
    {
        if ( !this.moving )
        {
            this.moving = true;
            
            server.moveUser( this.params.user.username, direction, function( result )
            {
                if ( !result.success )
                {
                    alert( "You can't move that way." );
                    console.log( "Couldn't move because: " + result.error );
                }
                else
                {
                    this.params.user = result.user;
                    this.params.world.rooms[ result.user.position.x + "," + result.user.position.y ] = result.room;
                    this._refreshRoom();
                }
                
                this.moving = false;
            }.bind(this));
        }
    },
    
    search: function()
    {
        if ( !this.searching )
        {
            this.searching = true;
            server.search( this.params.user.username, function( result )
            {
                if ( !result.success )
                {
                    alert( "You can't search here." );
                    console.log( "Couldn't search because: " + result.error );
                }
                else
                {
                    this.params.user = result.user;
                    this._refreshUser();
                    document.getElementById( "feedbackText" ).innerHTML = "<br/></br/>" + result.text;
                }
                
                this.searching = false;
            }.bind(this));
        }
    },
    
    attack: function()
    {
        if ( !this.attacking )
        {
            this.attacking = true;
            server.attack( this.params.user.username, function( result )
            {
                if ( !result.success )
                {
                    alert( "You can't attack here." );
                    console.log( "Couldn't attack because: " + result.error );
                }
                else
                {
                    this.params.user = result.user;
                    this.params.world.rooms[ result.user.position.x + "," + result.user.position.y ].monster = null;
                    this._refreshUser();
                    this._refreshRoom( true );
                    document.getElementById( "feedbackText" ).innerHTML = "<br/></br/>" + result.text;
                }
                
                this.attacking = false;
            }.bind(this));
        }
    },
    
    giveItem: function()
    {
        var inventory = document.getElementById( "inventory" );
        if ( inventory.options.length <= 0 )
        {
            document.getElementById( "feedbackText" ).innerHTML = "<br/></br/>" + "You don't have anything in your inventory!";
        }
        else
        {
            var userList = document.getElementById( "userList" );
            server.giveItem( this.params.user.username, userList.options[ userList.selectedIndex ].text, inventory.options[ inventory.selectedIndex ].text, function( result )
            {
                if ( !result.success )
                {
                    alert( "Failed to give item: " + result.error );
                }
                else
                {
                    inventory.removeChild( inventory.options[ inventory.selectedIndex ] );
                }
            }.bind(this));
        }
    },
    
    //automatically refresh
    refresh: function()
    {
        var now = new Date().getTime();
        
        if ( now - this.lastTimeRefreshed >= this.refreshRate )
        {
            server.getUserWithRoom( this.params.user.username, function( result )
            {
                this.params.user = result.user;
                this.params.world.rooms[ result.user.position.x + "," + result.user.position.y ] = result.room;
            
                this._refreshUser();
                this._refreshRoom( true );
            
                setTimeout(function()
                {
                    this.refresh();
                }.bind(this), this.refreshRate );
            }.bind(this));
        }
        else
        {
            setTimeout(function()
            {
                this.refresh();
            }.bind(this), this.refreshRate - ( now - this.lastTimeRefreshed ) );
        }
    },
    
    _refreshRoom: function( noFeedbackClear )
    {
        server.getAvailableDirections( this.params.user.username, function( directions )
        {
            var currentRoom = this.params.world.rooms[ this.params.user.position.x + "," + this.params.user.position.y ];
        
            var desc = currentRoom.description;
            if ( currentRoom.monster )
            {
                desc += "<br/></br/>" + currentRoom.monster.description;
            }
            
            document.getElementById( "roomDescription" ).innerHTML = desc;
            
            if ( !noFeedbackClear )
            {
                document.getElementById( "feedbackText" ).innerHTML = "";
            }
            
            var exitIndex;
            for ( exitIndex = 0; exitIndex < this.allDirections.length; exitIndex++ ) 
            {
                var direction = this.allDirections[ exitIndex ];
                var buttonDiv = document.getElementById( "direction_" + direction );
                var exists = directions.indexOf( direction ) >= 0;
            
                if ( exists )
                {
                    buttonDiv.innerHTML = '<input type="button" value="' + direction + '" onclick="game.move(\'' + direction + '\')">';
                }
                else
                {
                    buttonDiv.innerHTML = '<input type="button" value="' + direction + '" onclick="game.move(\'' + direction + '\')" disabled="true">';
                }
            }
            
            //WINNAR
            //if ( currentRoom.isVictoryRoom && !currentRoom.monster )
            //temporary... use isVictoryRoom next time
            if ( this.params.user.position.x === 4 && this.params.user.position.y === 2 && !currentRoom.monster )
            {
                document.getElementById( "victory" ).innerHTML = "<br/></br/>" + "<img src=\"images/win.gif\" /><br/><h1>YOU WIN!!!</h1>";
            }
            
            this.lastTimeRefreshed = new Date().getTime();
        }.bind(this));
    },
    
    _refreshUser: function()
    {
        var inventory = document.getElementById( "inventory" );
        var html = "";
        
        var itemIndex;
        for ( itemIndex = 0; itemIndex < this.params.user.inventory.length; itemIndex++ )
        {
            html += "<option>" + this.params.user.inventory[ itemIndex ].name + "</option>";
        }
        
        inventory.innerHTML = html;
    }
};