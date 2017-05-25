/*global window*/
/*global document*/

var beginGame = function()
{
    var usernameSelect = document.getElementById("usernameSelect");
    window.location.href = "play?username=" + usernameSelect.options[usernameSelect.selectedIndex].value;
};