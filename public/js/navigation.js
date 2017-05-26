/*global window*/
/*global document*/
/*global location*/
/*global console*/
/*global readCookie*/
/*global createCookie*/

var playPageLoaded = function()
{
    //check to see if we have a user, if not, check for cookies
    var usernameIndex = location.href.indexOf("username=");
    if ( usernameIndex < 0 )
    {
        var usernameCookie = readCookie( "username" );
        
        //we have no username, go to the landing page
        if ( !usernameCookie )
        {
            location.href = "/";
        }
        //we have a username, reload the page with that username
        else
        {
            location.href= "play?username=" + usernameCookie;
        }
    }
    //if we have a user, store it in the cookie
    else
    {
        var startIndex = usernameIndex + "username=".length;
        var endIndex = location.href.indexOf( "&", startIndex );
        if ( endIndex < 0 )
        {
            endIndex = location.href.length;
        }
        var urlUsername = location.href.substring( startIndex, endIndex );
        createCookie( "username", urlUsername );
    }
};

var homePageLoaded = function()
{
    var usernameCookie = readCookie( "username" );
    if ( usernameCookie )
    {
        var usernameSelect = document.getElementById( "usernameSelect" );
        usernameSelect.value = usernameCookie;
    }
};

var beginGame = function()
{
    var usernameSelect = document.getElementById("usernameSelect");
    window.location.href = "play?username=" + usernameSelect.options[usernameSelect.selectedIndex].value;
};