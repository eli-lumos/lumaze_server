/*global module*/
/*global require*/
/*global console*/

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
        //this is kind of a hokey way of doing this, but since the username is stored on the client,
        //we still need to go the play page, at which point the client will see we have no username
        //and will try getting it from the cookie and then will reload.
        if ( !request.query.username )
        {
            response.render( "play" );
        }
        else 
        {
            var userModel = new UserModel( request.query.username, function( user )
            {
                response.render( "play", { user: user, games: constants.games } );
            }.bind(this));
        }
    },
    
    scores: function( request, response )
    {
        this._renderScores( true, request, response );
    },
    
    teamScores: function( request, response )
    {
        this._renderScores( false, request, response );
    },
    
    _renderScores: function( includeUsers, request, response )
    {
        var usernames = constants.getPlayers();
        var teamMap = constants.getPlayerTeamMap();
        var params = {};
        params.includeUsers = includeUsers;
        
        var scores = [];
        
        var addedUserCount = 0;
        
        var users = [];
        var teamDataLookup = {};
        var teams = [];
        
        var gotAllUsers = function()
        {
            var userIndex;
            
            //fill in the team data lookup so we can use it later
            if ( !includeUsers )
            {
                for ( userIndex = 0; userIndex < users.length; userIndex++ )
                {
                    var lookupUser = users[userIndex];
                    var userTeamData = teamMap[lookupUser.username];
                    var districtName = "District " + ( userTeamData.district + 1 );
                    var districtData = teamDataLookup[districtName];
                    var teamName = districtName + ", Team " + String.fromCharCode( "A".charCodeAt( 0 ) + userTeamData.team );
                    var teamData = teamDataLookup[teamName];
                    
                    if ( !districtData )
                    {
                        districtData = teamDataLookup[districtName] = { score: 0, scoreToday: 0, username: districtName};
                        teams.push( districtData );
                    }
                    
                    if ( !teamData )
                    {
                        teamData = teamDataLookup[teamName] = { score: 0, scoreToday: 0, username: teamName };
                        teams.push( teamData );
                    }
                    
                    districtData.score += lookupUser.score;
                    teamData.score += lookupUser.score;
                    districtData.scoreToday += lookupUser.scoreToday;
                    teamData.scoreToday += lookupUser.scoreToday;
                }
            }
            
            var scoreArray = includeUsers ? users : teams;
            
            //sort by score
            scoreArray.sort( function( a, b ) { return b.score - a.score; } );
            
            for ( userIndex = 0; userIndex < scoreArray.length; userIndex++ )
            {
                var user = scoreArray[userIndex];
                var rank = ( userIndex === 0 || user.score !== users[userIndex-1].score ) ? userIndex : scores[scores.length-1].rank;
                var scoreData = { username: user.username, score: user.score, scoreToday: user.scoreToday, rank: rank };
                if ( includeUsers )
                {
                    var teamMapData = teamMap[user.username];
                    scoreData.team = teamMapData.team;
                    scoreData.district = teamMapData.district;
                }
                scores.push( scoreData );
            }
            
            console.log( "scores: " + JSON.stringify( scores ) );
            response.render( "scores", { params: params, scores: scores } );
        }.bind(this);
        
        var gotUser = function( user )
        {
            users.push( user );
            
            addedUserCount++;
            if ( addedUserCount >= usernames.length )
            {
                gotAllUsers();
            }
            
        }.bind(this);
        
        var userIndex;
        for ( userIndex = 0; userIndex < usernames.length; userIndex++ )
        {
            var userModel = new UserModel( usernames[userIndex], gotUser );
        }
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