/*global server*/
/*global window*/
/*global document*/

var givingPlayCredit = false;


var givePlayCredit = function( username, playedGameId )
{
    if ( givingPlayCredit )
    {
        return;
    }
    
    givingPlayCredit = true;
    
    server.playGame( username, playedGameId, function( result )
    {
        var scoreText = document.getElementById( "scoreText" );
        if ( !result.success )
        {
            scoreText.innerHTML = "Uh oh, there was an error! Try reloading the page.";
        }
        else 
        {
            var user = result.user;
            document.getElementById( "levelText" ).innerHTML = user.username + " - Level " + user.score;
            scoreText.innerHTML = "Points earned today: " + user.scoreToday + " / 15";
            
            var playsToday = result.userPlaysToday;
            var gameId;
            for ( gameId in result.games )
            {
                var playCount = playsToday[gameId] || 0;
                var gameText = "";
                var possibleScore = 1;
                var gameData = result.games[gameId];
                var textElement = document.getElementById( "gameScoreText-" + gameId );
                
                if ( user.scoreToday >= 15 || ( gameData.maximumPlaysPerDay && playCount >= gameData.maximumPlaysPerDay ) )
                {
                    possibleScore = 0;
                }
                else
                {
                    if ( playCount <= 0 )
                    {
                        possibleScore = 2;
                    }
                    else
                    {
                        possibleScore = 1;
                    }
                    
                    if ( textElement.getAttribute("featured") === "true" )
                    {
                        possibleScore++;
                    }
                    
                    if ( gameData.scoreBonus )
                    {
                        possibleScore += gameData.scoreBonus;
                    }
                }
                
                possibleScore = Math.min( possibleScore, 15 - user.scoreToday );
                gameText = "Points per play: " + possibleScore;
                
                textElement.innerHTML = gameText;
                
                var shortGameText = "Times played today: " + playCount;
                document.getElementById( "gameShortScoreText-" + gameId ).innerHTML = shortGameText;
            }
        }
        
        givingPlayCredit = false;
    });
};

var playWeb = function( username, gameId, url )
{
    if ( givingPlayCredit )
    {
        return;
    }
    
    window.open( url );
    givePlayCredit( username, gameId );
};

