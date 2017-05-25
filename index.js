/*global console*/
/*global require*/
/*global module*/
/*global process*/
/*global __dirname*/
var morgan = require( "morgan" );
var bodyParser = require( "body-parser" );
var express = require( "express" );
var app = express();
var http = require( "http" ).createServer( app );
var fs = require( "fs" );
var port = process.env.PORT || 15000;
var raygun = require('raygun');
var raygunClient = new raygun.Client().init({ apiKey: "n/2r8HiI1ucVmm/6vXRh2g=="}); //TODO

//call this to do everything
var Server = module.exports.Server =
{
    launchData: null,
    
    runServer: function( cb )
    {
        this.configServer();
        this.setupRouting();
        this.startServer( cb );
    },

    configServer: function()
    {
        //support JSON, urlencoded, and multipart requests
        app.use( bodyParser.json( { extended: true } ) );

        //log the requests using morgan
        app.use( morgan( "combined" ) );

        //specify the Jade views folder
        app.set( "views", __dirname + "/views" );

        //set the view engine to Jade
        app.set( "view engine", "jade" );

        app.set( "port", port );

        //specify static content
        app.use( express[ "static" ]( __dirname + "/public" ) ); //using map-access of static so jslint won't bitch
        
        //raygun error handling
        app.use(raygunClient.expressHandler);
    },

    setupRouting: function()
    {
        //go through all the controllers and use their public functions as routes
        var controllerLocation = "./server/controllers";
        var suffix = "_controller.js";
        var pageController = null;
        fs.readdirSync( controllerLocation ).forEach( function( file )
        {
            if ( file.substr( -1 * suffix.length ) === suffix )
            {
                var controller = require( controllerLocation + "/" + file );
                this._addRoutes( this._getRoutes( controller, "/" + file.substring( 0, file.length - suffix.length ) ), "get" );
                
                if ( file === "page_controller.js" )
                {
                    pageController = controller;
                }
            }
        }.bind(this));
        
        //add a custom endpoint for the index
        app.get( "/", pageController.index.bind( pageController ) );
    },
    
    _getRoutes: function( funcContainer, prefix )
    {
        var memberName;
        var member;
        var routeIndex;
        var subRoutes;
        var routes = [];
        prefix = prefix || "";
        
        if ( prefix === "/page" )
        {
            prefix = ""; //hack edge case -- the page controller is default
        }
        
        //all the different endpoints are determined by the functions in the controllers.
        //private functions (starting with _) are ignored. This will also expand objects,
        //and will use the key for the object to add a "key/" to the route.
        for ( memberName in funcContainer )
        {
            member = funcContainer[ memberName ];
            if ( typeof( member ) === "function" )
            {
                if ( memberName.charAt(0) !== "_" )
                {
                    routes.push( { name: prefix + "/" + memberName, func: member, obj: funcContainer } );
                }
            }
            else if ( typeof( member ) === "object" )
            {
                subRoutes = this._getRoutes( member );
                for ( routeIndex = 0; routeIndex < subRoutes.length; routeIndex++ )
                {
                    routes.push( { name: prefix + "/" + memberName + subRoutes[ routeIndex ].name, func: subRoutes[ routeIndex ].func, obj: funcContainer } );
                }
            }
        }
        
        return routes;
    },
    
    //type should be "get", "post", etc.
    _addRoutes: function( routes, type )
    {
        console.log( "Adding routes: " + JSON.stringify( routes ) );
        
        var catchFunc = function( func, name, scopeObj, request, response )
        {
            try
            {
                func.call( scopeObj, request, response );
            }
            catch ( err )
            {
                raygunClient.send(err);
                console.log( "GET resulted in an uncaught exception! " + err + "\n" + name + " -- params: " + JSON.stringify( request.query ) + "\n" + err.stack );
            }
        };
        
        var routeIndex;
        for ( routeIndex = 0; routeIndex < routes.length; routeIndex++ )
        {
            app[ type ]( routes[ routeIndex ].name, catchFunc.bind(this,routes[routeIndex].func, routes[ routeIndex ].name, routes[ routeIndex ].obj ));
        }
    },

    startServer: function( cb )
    {
        app.listen( app.get( "port" ), function()
        {
            console.log( "Server is started on port " + app.get( "port" ) );
        
            if ( cb )
            {
                cb();
            }
        } );
    }
};

Server.runServer();
