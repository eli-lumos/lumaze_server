/*global module*/
/*global console*/

var PostFunctions = module.exports.PostFunctions =
{
    ping: function( request, response )
    {
        response.status( 200 ).json( "pong" );
    }
};