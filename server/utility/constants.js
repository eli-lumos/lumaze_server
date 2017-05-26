/*global module*/

var Constants = module.exports =
{
    usersKey: "userList",
    matchCountKey: "matchCount",
    
    pointsPerPlay: 1,
    //in the daily first play per game, this is added IN ADDITION TO the regular score
    pointsPerFirstPlay: 1,
    maximumScorePerDay: 15,
    
    games:
    {
        "trading-up":
        {
            name: "Top That",
            url:"https://developer.cloud.unity3d.com/share/bJlmDxM2-UM/"
        },
        "carnival-probability":
        {
            name: "Carnival Probability",
            url: "https://developer.cloud.unity3d.com/share/Z1eXUnBalLz/"
        },
        "halve-your-cake":
        {
            name: "Halve Your Cake",
            url: "https://developer.cloud.unity3d.com/share/-JgJYhKgbLG/"
        },
        "pirate-passage":
        {
            name: "Pirate Passage",
            url: "https://risk.lumoslabs.com/app/v4/games/pirate-passage"
        },
        "word-snatchers":
        {
            name: "Word Snatchers",
            url: "https://www.lumosity.com/app/v4/games/word-snatchers"
        }
    },
    
    districts:
    [
        {
            name: "District 1",
            teams:
            [
                {
                    name: "Team A",
                    players:
                    [
                        "aaron",
                        "angela",
                        "cindy",
                        "eli",
                        "erin",
                        "gus",
                        "duke",
                        "jayro"
                    ]
                },
                {
                    name: "Team B",
                    players:
                    [
                        "konstantin",
                        "lance",
                        "laura",
                        "matt k",
                        "mike",
                        "monico",
                        "falcon",
                        "poky"
                    ]
                },
                {
                    name: "Team C",
                    players:
                    [
                        "sarah s",
                        "sean",
                        "shelby",
                        "steve h",
                        "tom",
                        "tyler h",
                        "will",
                        "bill"
                    ]
                },
                {
                    name: "Team D",
                    players:
                    [
                        "bob",
                        "elisabeth",
                        "kelsey",
                        "nicole",
                        "rosa",
                        "suzie",
                        "brittany k",
                        "matt y",
                        "missy"
                    ]
                }
            ]
        },
        
        {
            name: "District 2",
            teams:
            [
                {
                    name: "Team A",
                    players:
                    [
                        "becky",
                        "elliott",
                        "jesse",
                        "paul",
                        "surith",
                        "andrew l",
                        "breanna",
                        "dave w"
                    ]
                },
                {
                    name: "Team B",
                    players:
                    [
                        "kevin",
                        "alan",
                        "aliz",
                        "brandon k",
                        "brendan",
                        "james",
                        "jin",
                        "lee"
                    ]
                },
                {
                    name: "Team C",
                    players:
                    [
                        "tony",
                        "christine",
                        "deepak",
                        "mob",
                        "norbert",
                        "a-jay",
                        "angel",
                        "claire"
                    ]
                },
                {
                    name: "Team D",
                    players:
                    [
                        "david beavers",
                        "oleg",
                        "praniti",
                        "aubrey",
                        "brittany b",
                        "connie",
                        "sameer",
                        "helen"
                    ]
                }
            ]
        },
        
        {
            name: "District 3",
            teams:
            [
                {
                    name: "Team A",
                    players:
                    [
                        "andy x",
                        "arthur",
                        "chloe",
                        "david boctor",
                        "javier",
                        "joyce",
                        "julie",
                        "marc b"
                    ]
                },
                {
                    name: "Team B",
                    players:
                    [
                        "noah",
                        "rob",
                        "sunny",
                        "tim",
                        "albert",
                        "jenny",
                        "miles",
                        "cameron"
                    ]
                },
                {
                    name: "Team C",
                    players:
                    [
                        "matt leung",
                        "shaun",
                        "zachary",
                        "andrew m",
                        "carl",
                        "eva",
                        "jay o",
                        "logan"
                    ]
                },
                {
                    name: "Team D",
                    players:
                    [
                        "marc c",
                        "matt low",
                        "pol",
                        "stephanie c",
                        "chris w",
                        "jhonattan",
                        "stephanie z",
                        "krishna",
                        "steve b"
                    ]
                }
            ]
        },
        
        {
            name: "District 4",
            teams:
            [
                {
                    name: "Team A",
                    players:
                    [
                        "doug",
                        "harshal",
                        "stephanie g",
                        "adriana v",
                        "aimee",
                        "emma",
                        "liina",
                        "rachel"
                    ]
                },
                {
                    name: "Team B",
                    players:
                    [
                        "sam",
                        "susan",
                        "tamami",
                        "abhishek",
                        "adriana b",
                        "chris h",
                        "erika",
                        "greg"
                    ]
                },
                {
                    name: "Team C",
                    players:
                    [
                        "jay t",
                        "ken",
                        "lisa",
                        "marie",
                        "roxanne",
                        "susie",
                        "dom",
                        "heather"
                    ]
                },
                {
                    name: "Team D",
                    players:
                    [
                        "katy",
                        "tyler c",
                        "brandon s",
                        "hector",
                        "matt d",
                        "yelena",
                        "sara c",
                        "suélen"
                    ]
                }
            ]
        }
    ],
    
    getPlayers: function()
    {
        if ( !this.players )
        {
            this.players = [];
            this.playerMap = {};
            
            var districtIndex;
            for ( districtIndex = 0; districtIndex < this.districts.length; districtIndex++ )
            {
                var district = this.districts[ districtIndex ];
                var teamIndex;
                for ( teamIndex = 0; teamIndex < district.teams.length; teamIndex++ )
                {
                    var team = district.teams[ teamIndex ];
                    var playerIndex;
                    for ( playerIndex = 0; playerIndex < team.players.length; playerIndex++ )
                    {
                        var player = team.players[playerIndex];
                        this.playerMap[player] = { district: districtIndex, team: teamIndex };
                        this.players.push(player);
                    }
                }
            }
            
            this.players.sort();
        }
        
        return this.players;
    },
    
    getPlayerTeamMap: function()
    {
        this.getPlayers(); //does the work
        return this.playerMap;
    },
    
    //milliseconds, if a heartbeat has not been sent in this much time, you are considered offline
    minIdleTimeForOffline: 300000, //5 minutes
    minTimeBetweenNotifications: 300000, //5 minutes
    
    millisecondsPerDay: 86400000,
    millisecondsOffset: -28800000, //convert GMT to PST
    getDay: function()
    {
        return Math.floor( ( new Date().getTime() + this.millisecondsOffset ) / this.millisecondsPerDay );
    }
};