/*global server*/
/*global window*/
/*global document*/

var givingPlayCredit = false;

var givePlayCredit = function( username, gameId )
{
    givingPlayCredit = true;
    
    server.playGame( username, gameId, function( result )
    {
        var scoreText = document.getElementById( "scoreText" );
        if ( !result.success )
        {
            scoreText.innerHTML = "Uh oh, there was an error! Try reloading the page.";
        }
        else 
        {
            var user = result.user;
            document.getElementById( "levelText" ).innerHTML = user.username + " - Level " + user.score + " Lumite";
            scoreText.innerHTML = "Points earned today: " + user.scoreToday + "<br/>" + ( user.scoreToday < 15 ? "You can still earn " + ( 15 - user.scoreToday ) + " more." : "You've maxed out your points for today!");
            
            var playsToday = result.userPlaysToday;
            var gameId;
            for ( gameId in playsToday )
            {
                var playCount = playsToday[gameId];
                var gameText = "";
                
                if ( user.scoreToday >= 15 )
                {
                    gameText = "You maxed out your score today! Playing any game is only for extra credit.";
                }
                else if ( user.scoreToday >= 14 )
                {
                    gameText = "Your score is almost maxed out! All games are only worth 1 point.";
                }
                else if ( playCount <= 0 )
                {
                    gameText = "This will be your first play today. It will earn you 2 points!";
                }
                else
                {
                    gameText = "You already played this game today, so playing it will earn you 1 point.";
                }
                
                document.getElementById( "gameScoreText-" + gameId ).innerHTML = gameText;
                
                var shortGameText = "Times played today:" + playCount;
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

