/*global module*/
/*global console*/
/*global require*/
/*global JSON*/

var database = require( "./database.js" );
var UserModel = require( "./user_model.js" );
var MatchModel = require( "./match_model.js" );
var globalStorage = require( "./global_storage.js" );
var utility = require( "./utility.js" );

var utilityGet = module.exports.UtilityGet =
{
    verifyParams: function( request, response, requiredParams )
    {
        var paramIndex;
        for ( paramIndex = 0; paramIndex < requiredParams.length; paramIndex++ )
        {
            var param = requiredParams[ paramIndex ];
            if ( !request.query[ param ] )
            {
                this.sendError( response, "Required param \"" + param + "\" not supplied." );
                return false;
            }
        }
        
        return true;
    },
    
    sendError: function( response, error )
    {
        response.status( 500 ).json( { success: false, error: error } );
    },
    
    verifyJSON: function( response, jsonString )
    {
        var obj = null;
        
        try
        {
            obj = JSON.parse( jsonString );
        }
        catch (err)
        {
            this.sendError( response, jsonString + " is not valid JSON string. " );
        }
        
        return obj;
    },
    
    verifyMatchExists: function( response, matchId, cb )
    {
        utility.matchExists( matchId, function( exists )
        {
            if ( !exists )
            {
                response.status( 404 ).json( { success: false, error: "No match exists with the id " + matchId + "." } );
                cb( false );
            }
            else
            {
                cb( true );
            }
        });
    }
};

var GetFunctions = module.exports.GetFunctions =
{
    ping: function( request, response )
    {
        console.log( "ping " + JSON.stringify( request.body ) );
        
        response.status( 200 ).json( "pong" );
    },
    
    subObj:
    {
        ping: function( request, response )
        {
            console.log( "ping " + JSON.stringify( request.body ) );
        
            response.status( 200 ).json( "pong" );
        }
    },
    
    database:
    {
        set: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "key", "value" ] ) )
            {
                database.set( request.query.key, request.query.value, function( result )
                {
                    response.status( 200 ).json( "Wrote to redis: " + request.query.key + "=" + request.query.value );
                });
            }
        },
        
        get: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "key" ] ) )
            {
                database.get( request.query.key, function( value )
                {
                    response.status( 200 ).json( JSON.parse( value ) );
                });
            }
        },
        
        clear: function( request, response )
        {
            database.delAll( function( success )
            {
                response.status( 200 ).json( { success: success } );
            });
        },
        
        copy: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "url" ] ) )
            {
                var url = ( request.query.url + "/database/dump" ).replace( "http://", "" ).replace( /\/\//g, "/" );
                
                utility.getUrlBody( url, function( success, result )
                {
                    if ( !success )
                    {
                        response.status( 500 ).json( "Unable to reach URL: " + url + " -- error: " + result );
                    }
                    else
                    {
                        var keys = [];
                        var key;
                        for ( key in result )
                        {
                            keys.push( key );
                        }
                        console.log( "Result is: " + JSON.stringify( keys ) );
                        
                        utility.restoreDatabaseFromDump( result, function( success )
                        {
                            if ( !success )
                            {
                                response.status( 500 ).json( { success: false, error: "Failed to restore database." } );
                            }
                            else
                            {
                                response.status( 200 ).json( { success: true } );
                            }
                        });
                    }
                });
            }
        },
        
        dump: function( request, response )
        {
            utility.getDatabaseDump( function( result )
            {
                response.status( 200 ).json( result );
            });
        },
        
        restore: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "dump" ] ) )
            {
                utility.restoreDatabaseFromDump( request.query.dump, function( success )
                {
                    response.status( 200 ).json( { success: success } );
                });
            }
        }
    },
    
    user:
    {
        login: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                var userModel = new UserModel( request.query.username, function( user, isNewUser )
                {
                    response.status( 200 ).json( { success: true, isNewUser: isNewUser } );
                }, request.query.email, request.query.team );
            }
        },
        
        get: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                var userModel = new UserModel( request.query.username, function( user, isNewUser )
                {
                    response.status( 200 ).json( user );
                });
            }
        },
        
        remove: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                var userModel = new UserModel( request.query.username, function( user, isNewUser )
                {
                    user.remove( function( success )
                    {
                        response.status( 200 ).json( { success: success } );
                    });
                });
            }
        },
        
        clearMatches: function( request, response )
        {
            var responseFunc = function( success )
            {
                response.status( 200 ).json( { success: success } );
            };
            
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                //this is here (instead of in UserModel) bceause I am lazy and can't have a
                //circular reference (UserModel can't require MatchModel or Utility)
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    var removedCount = 0;
                    var resultFunc = function( match, isNewMatch )
                    {
                        match.remove( function( success )
                        {
                            removedCount++;
                        
                            if ( removedCount >= user.matches.length )
                            {
                                user.matches = [];
                                user.save( function()
                                {
                                    responseFunc( success );
                                });
                            }
                        });
                    };
                    
                    if ( user.matches.length <= 0 )
                    {
                        responseFunc( true );
                    }
                    else
                    {
                        var matchIndex;
                        for ( matchIndex = 0; matchIndex < user.matches.length; matchIndex++ )
                        {
                            utility.getMatch( user.matches[ matchIndex ], [], resultFunc );
                        }
                    }
                });
            }
        },

        setOnboarding: function ( request, response )
        {
            var responseFunc = function( success )
            {
                response.status( 200 ).json( { success: success } );
            };

            var success = false;

            //TODO - move this shit into the user
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    if ( user )
                    {
                        user.onboardingComplete = true;
                        user.save( function()
                                {
                                    responseFunc( true );      
                                });
                    }
                    else
                    {
                            responseFunc( false );      
                    }
                });
            }
            else
            {
                responseFunc( false );      
            }
        },
        
        heartbeat: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                var userModel = new UserModel( request.query.username, function( user, isNewUser )
                {
                    user.heartbeat( function( success )
                    {
                        response.status( 200 ).json( { success: success } );
                    });
                });
            }
        },
        
        sendNotification: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "subject", "message" ] ) )
            {
                var userModel = new UserModel( request.query.username, function( user, isNewUser )
                {
                    user.sendNotification( request.query.subject, request.query.message, false, function( result )
                    {
                        response.status( 200 ).json( result );
                    });
                });
            }
        },
        
        testResolveMatch: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username1", "username2", "winner" ] ) )
            {
                var fakeMatch =
                {
                    isUserWinner: function( user )
                    {
                        return user.username === request.query.winner;
                    },
                    
                    isFakeMatch: true,
                    usernames: [ request.query.username1, request.query.username2 ]
                };
                
                var userModel = new UserModel( request.query.username1, function( user )
                {
                    user.resolveMatch( fakeMatch, function( result )
                    {
                        var userModel2 = new UserModel( request.query.username2, function( user2 )
                        {
                            user2.resolveMatch( fakeMatch, function( result2 )
                            {
                                console.log( JSON.stringify( result ) );
                                response.status( 200 ).json( { scoreDelta1: result.scoreDelta, scoreDelta2: result2.scoreDelta } );
                            });
                        });
                    });
                });
            }
        }
    },
    
    store:
    {
        buyCards: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    user.buyPack( function( success )
                    {
                        response.status( 200 ).json( { success: success, packCount: user.packCount, gold: user.gold } );
                    });
                });
            }
        },
        
        giveGold: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "amount" ] ) )
            {
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    user.giveGold( request.query.amount, function( success, newAmount )
                    {
                        response.status( 200 ).json( { success: success, gold: newAmount } );
                    });
                });
            }
        }
    },
    
    collection:
    {
        getCardList: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    response.status( 200 ).json( { success: true, cardIds: user.cards } );
                });
            }
        },
        
        setDeck: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "cardIds" ] ) )
            {
                var cardIds = utilityGet.verifyJSON( response, request.query.cardIds );
                if ( cardIds )
                {
                    utility.getUser( request.query.username, function( user, isNewUser )
                    {
                        user.setDeck( cardIds, function( success, newDeck )
                        {
                            response.status( 200 ).json( { success: success, deck: newDeck } );
                        });
                    });
                }
            }
        },
        
        openPack: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    user.openPack( function( success, additionalCards, packCount )
                    {
                        response.status( 200 ).json( { success: success, cardIds: additionalCards, packCount: packCount } );
                    });
                });
            }
        },
        
        randomizeDeck: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                utility.getUser( request.query.username, function( user, isNewUser )
                {
                    user.randomizeDeck( function( success, newDeck )
                    {
                        response.status( 200 ).json( { success: success, deck: newDeck } );
                    });
                });
            }
        },
        
        giveCards: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "cardIds" ] ) )
            {
                var cardIds = utilityGet.verifyJSON( response, request.query.cardIds );
                if ( cardIds )
                {
                    utility.getUser( request.query.username, function( user, isNewUser )
                    {
                        user.giveCards( cardIds, function( success )
                        {
                            response.status( 200 ).json( { success: success } );
                        });
                    });
                }
            }
        }
    },
    
    challenge:
    {
        send: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "targetUsername" ] ) )
            {
                if ( request.query.username === request.query.targetUsername )
                {
                    response.status( 500 ).json( { success: false, error: "A user cannot challenge themselves!" } );
                }
                else
                {
                    globalStorage.getMatchCount( function( count )
                    {
                        var matchModel = new MatchModel( count, [ request.query.username, request.query.targetUsername ], function( match, isNewMatch )
                        {
                            response.status( 200 ).json( { success: true, matchId: match.matchId } );
                        });
                    });
                }
            }
        },
        
        getList: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username" ] ) )
            {
                var userModel = new UserModel( request.query.username, function( user, isNewUser )
                {
                    response.status( 200 ).json( { success: true, matchIds: user.matches } );
                });
            }
        },
        
        getPlayers: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "count" ] ) )
            {
                utility.getUser( request.query.username, function( user )
                {
                    //HOTFIX - the client is sending too small of a count and doesn't prioritize games that are your turn,
                    //which means you often can't see games to play or challenge people you want. Always return everything.
                    user.getSortedOpponentMatchList( /*request.query.count*/0, utility.getMatch, function( results )
                    {
                        if ( !results.success )
                        {
                            utilityGet.sendError( results.error );
                        }
                        else
                        {
                            response.status( 200 ).json( results );
                        }
                    });
                });
            }
        },
        
        find: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username1", "username2" ] ) )
            {
                utility.getMatchBetweenUsers( request.query.username1, request.query.username2, function( matchId )
                {
                    if ( matchId < 0 )
                    {
                        response.status( 404 ).json( { success: false, error: "There is no match between " + request.query.username1 + " and " + request.query.username2 + "." } );
                    }
                    else
                    {
                        response.status( 200 ).json( { success: true, matchId: matchId } );
                    }
                });
            }
        }
    },
    
    match:
    {
        get: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            response.status( 200 ).json( match );
                        });
                    }
                });
            }
        },
        
        removeGame: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username", "gameKey" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.removeGame( request.query.username, request.query.gameKey, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        selectGame: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username", "gameKey" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.selectGame( request.query.username, request.query.gameKey, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        sendGameResult: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username", "score" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.sendGameResult( request.query.username, request.query.score, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        playCards: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username", "cardIds" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            var cardIds = utilityGet.verifyJSON( response, request.query.cardIds );
                            if ( cardIds )
                            {
                                match.playCards( request.query.username, cardIds, function( result )
                                {
                                    if ( !result.success )
                                    {
                                        utilityGet.sendError( response, result.error );
                                    }
                                    else
                                    {
                                        response.status( 200 ).json( result );
                                    }
                                });
                            }
                        });
                    }
                });
            }
        },
        
        reviewCards: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.reviewCards( request.query.username, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        getGameResult: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username", "gameKey" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.getGameResult( request.query.username, request.query.gameKey, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        viewResults: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.viewResults( request.query.username, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        complete: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId", "username" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.complete( request.query.username, function( result )
                            {
                                if ( !result.success )
                                {
                                    utilityGet.sendError( response, result.error );
                                }
                                else
                                {
                                    response.status( 200 ).json( result );
                                }
                            });
                        });
                    }
                });
            }
        },
        
        remove: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "matchId" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            match.remove( function( success )
                            {
                                response.status( 200 ).json( { success: success } );
                            });
                        });
                    }
                });
            }
        },
        
        isUserTurn: function( request, response )
        {
            if ( utilityGet.verifyParams( request, response, [ "username", "matchId" ] ) )
            {
                utilityGet.verifyMatchExists( response, request.query.matchId, function( exists )
                {
                    if ( exists )
                    {
                        utility.getMatch( request.query.matchId, [], function( match, isNewMatch )
                        {
                            response.status( 200 ).json( { isUserTurn: match.isUserTurn( request.query.username ) } );
                        });
                    }
                });
            }
        }
    },
    
    team:
    {
        clearRecord: function( request, response )
        {
            utility.clearTeamRecords( request.query.team, function( success )
            {
                response.status( 200 ).json( { success: success } );
            });
        },
        
        clearAllRecords: function( request, response )
        {
            var clearCount = 0;
            var clearFunc = function( success )
            {
                clearCount++;
                
                if ( clearCount >= globalStorage.teams.length )
                {
                    response.status( 200 ).json( { success: success } );
                }
            };
            
            var teamIndex;
            for ( teamIndex = 0; teamIndex < globalStorage.teams.length; teamIndex++ )
            {
                utility.clearTeamRecords( globalStorage.teams[ teamIndex ], clearFunc );
            }
        },
        
        list: function( request, response )
        {
            response.status( 200 ).json( { success: true, teams: globalStorage.teams } );
        },
        
        rewardForScore: function( request, response )
        {
            utility.rewardPlayersForScore( request.query.goldPerPoint, function( success )
            {
                response.status( 200 ).json( { success: success } );
            });
        }
    },
    
    test:
    {
        timeout: function( request, response )
        {
            console.log( "Timing out!" );
        },
        
        crash: function( request, response )
        {
            throw new Error( "Purposefully caused a crash by visiting test/crash" );
        }
    }
};