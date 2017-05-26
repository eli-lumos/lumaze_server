/*global module*/
/*global console*/
/*global require*/

var database = require( "../database.js" );
var globals = require( "./global_model.js" );
var constants = require( "../utility/constants.js" );

//creates a new user and calls cb when done, with the user and a boolean parameter on whether this is a new user.
//automatically loads the user from the db if it's an existing user, otherwise creates a new one.
var UserModel = module.exports = function( username, cb )
{
    this.username = username;
    this.plays = {};
    this.score = 0;
    this.scoreToday = 0;
    this.lastDayPlayed = constants.getDay();
    this.lastTimeActive = new Date();

    //if this user already exists, load them, otherwise just return a new user
    database.exists( this.getDatabaseKey(), function( exists )
    {
        if ( exists )
        {
            this.load( function()
            {
                cb( this, false );
            }.bind(this) );
            
        }
        else
        {
            globals.addUser( this.username, function()
            {
                this._initializeNewUser();
                this.save( cb.bind( this, this, true ) );
            }.bind(this));
        }
    }.bind( this ));
};

UserModel.prototype._initializeNewUser = function()
{
    this.clearPlays();
    this.score = 0;
    this.scoreToday = 0;
    this.lastDayPlayed = constants.getDay();
    this.lastTimeActive = new Date();
};

UserModel.prototype.getDatabaseKey = function()
{
    return "user." + this.username;
};

UserModel.prototype.save = function( cb )
{
    database.setJsonFromObject( this.getDatabaseKey(), this, cb );
};

//refreshes this object's values based upon what's in the database
UserModel.prototype.load = function( cb )
{
    database.writeJsonToObject( this.getDatabaseKey(), this, function()
    {
        var today = constants.getDay();
        if ( today !== this.lastDayPlayed )
        {
            console.log( "Today doesn't equal the last time played for " + this.username );
            this.lastDayPlayed = today;
            this.scoreToday = 0;
            console.log( "score today is now " + this.scoreToday );
        }
        else
        {
            console.log( "Today is: " + today + " and last day played is " + this.lastDayPlayed + " for " + this.username );
        }
        
        cb();
    }.bind(this));
    
    
};

UserModel.prototype.remove = function( cb )
{
    globals.removeUser( this.username, function()
    {
        database.del( this.getDatabaseKey(), cb );
    }.bind(this));
};

UserModel.prototype.reset = function()
{
    this._initializeNewUser();
};

UserModel.prototype.clearPlays = function()
{
    this.plays = {};
};

UserModel.prototype.getPlaysToday = function()
{
    var today = constants.getDay();
    if ( !this.plays[today] )
    {
        this.plays[today] = {};
    }
    return this.plays[today];
};

UserModel.prototype.playGame = function( gameId )
{
    var playsToday = this.getPlaysToday();
    if ( playsToday[gameId] === undefined )
    {
        playsToday[gameId] = 0;
    }
    playsToday[gameId]++;
    
    var addedScore = constants.pointsPerPlay;
    //add extra points to our score if we played for the first time today
    if ( playsToday[gameId] === 1 )
    {
        addedScore += constants.pointsPerFirstPlay;
    }
    
    //we can't add any more points if we're reached our maximum per day
    addedScore = Math.min( addedScore, constants.maximumScorePerDay - this.scoreToday );
    
    this.score += addedScore;
    this.scoreToday += addedScore;
    
    return addedScore;
};

UserModel.prototype.getGamePlayCountToday = function( gameId )
{
    var playsToday = this.getPlaysToday();
    if ( !playsToday[gameId] )
    {
        return 0;
    }
    
    return playsToday[gameId];
};