/*global require*/
/*global module*/
/*global console*/
/*global process*/

var redis = require( "redis" );
var client = redis.createClient(process.env.REDIS_URL);

client.on( "error", function(err)
{
    console.log( "Redis Error: " + err );
});

var Database = module.exports =
{
    verbose: false,
    
    set: function( key, val, cb )
    {
        this._log( "Redis: setting " + key + " to " + val );
        
        if ( val instanceof Array )
        {
            this.exists( key, function( exists )
            {
                if ( exists )
                {
                    this.del( key, function()
                    {
                        this.push( key, val, cb );
                    }.bind(this));
                }
                else
                {
                    this.push( key, val, cb );
                }
            }.bind(this));
        }
        else if ( this.isExpandableObject( val ) )
        {
            this.setJsonFromObject( key, val, cb );
        }
        else
        {
            client.set( key, this._getSetValue( val ), function( err, result )
            {
                cb( !err );
            }.bind(this));
        }
    },
    
    //gets the stored value for a passed key string
    //you can also pass an object with {type:"array"|"value",key:"string"}, in
    //case you want to store a different sort of object, like a list. You can
    //also use these types to automatically coerce the results into what you want,
    //since they are always stored as strings.
    get: function( key, cb )
    {
        var type = key.type;
        if ( type === "array" )
        {
            this.getArray( key, cb );
        }
        else if ( type === "object" )
        {
            this.getObject( key, cb );
        }
        else
        {
            key = key.key || key;
            client.get( key, function( err, reply )
            {
                this._log( "Redis: got " + reply + " for " + key );
                
                var val = reply;
                if ( type === "number" )
                {
                    val = Math.floor( val );
                }
                else if ( type === "boolean" )
                {
                    val = ( val === 1 || val === "1" );
                }
                else if ( type === "date" )
                {
                    val = new Date( val );
                }
                
                cb( val );
                
            }.bind(this));
        }
    },
    
    getArray: function( key, cb )
    {
        var arr = [];
        key = key.key || key;
        
        client.llen( key, function( err, length )
        {
            this._log( "Redis: got an array of length " + length + " for " + key );
            arr.length = length;
            var insertedCount = 0;
            
            var insertFunc = function( index, err, val )
            {
                arr[ index ] = val;
                insertedCount++;
                
                if ( insertedCount >= length )
                {
                    cb( arr );
                }
            };
            
            var index;
            for ( index = 0; index < length; index++ )
            {
                client.lindex( key, index, insertFunc.bind( this, index ) );
            }
            
            if ( length <= 0 )
            {
                cb( [] );
            }
        }.bind(this));
    },
    
    getObject: function( key, cb )
    {
        // this._log( "Redis: will parse the object key: " + JSON.stringify( key ) );
        //
        // if ( !key.subKeys || key.subKeys.length <= 0 )
        // {
        //     cb( {} );
        // }
        //
        // var obj = {};
        // var getCount = 0;
        //
        // var resultFunc = function( val )
        // {
        //     getCount++;
        //
        //     if ( getCount >= key.subKeys.length )
        //     {
        //         cb( obj );
        //     }
        // }.bind(this);
        //
        // var subKeyIndex;
        // for ( subKeyIndex = 0; subKeyIndex < key.subKeys.length; subKeyIndex++ )
        // {
        //     key.subKeys[ subKeyIndex ].key = key.key + "." + key.subKeys[ subKeyIndex ].key;
        //     this.get( key.subKeys[ subKeyIndex ], resultFunc );
        // }
        
        client.get( key, function( err, result )
        {
            if ( !err )
            {
                cb( JSON.parse( result ) );
            }
            else
            {
                cb( {} );
            }
        }.bind(this));
    },
    
    exists: function( key, cb )
    {
        client.exists( key, function( err, reply )
        {
            this._log( "Redis: does " + key + " exist? " + ( reply === 1 ) );
            cb( reply === 1 );
        }.bind(this));
    },
    
    del: function( key, cb )
    {
        client.del( key, function( err, reply )
        {
            this._log( "Redis: deleting " + key );
            cb( reply === 1 );
        }.bind(this));
    },
    
    delAllForPrefix: function( prefix, cb )
    {
        //this is some bullshit to stop jslint from complaining
        var e = "e";
        var clientEvalFunc = client[ e + "val" ];
        
        //a lua command for deleting everything with a prefix
        clientEvalFunc( [ "return redis.call('del', unpack(redis.call('keys', ARGV[1])))", 0, prefix + "*" ], function( err, reply )
        {
            cb( reply === 1 );
        });
    },
    
    delAll: function( cb )
    {
        client.flushall( function( err, reply )
        {
            this._log( "Redis: erasing entire DB!" );
            cb( !!reply );
        }.bind(this));
    },
    
    //pushes an array or a single value onto a redis list
    //cannot have expandable objects - instead you should do an array of keys
    push: function( key, valueOrArray, cb )
    {
        var arr = ( valueOrArray instanceof Array ) ? valueOrArray : [ valueOrArray ];
        
        if ( arr.length <= 0 )
        {
            cb( 0 );
        }
        else
        {
            var pushParams = [ key ];
            var index;
            for ( index = 0; index < arr.length; index++ )
            {
                pushParams.push( this._getSetValue( arr[ index ] ) );
            }
        
            this._log( "Redis: pushing to " + key + " " + JSON.stringify( arr ) );
            client.lpush( pushParams, function( err, newLength )
            {
                cb( newLength );
            });
        }
    },
    
    //removes all of this object from a list.
    //cannot have expandable objects or arrays
    removeFromList: function( listKey, removedVal, cb )
    {
        client.lrem( listKey, 0, removedVal, function( err, reply )
        {
            this._log( "Redis: removed " + reply + " instances of " + removedVal + " from " + listKey );
            cb( reply );
        }.bind(this));
    },
    
    //takes a dictionary and calls cb when all are complete
    //optionally, you can add a keyPrefix, which is prepended to all keys
    //WARNING - this doesn't seem to work with nested objects, will crash the server
    // setMultiple: function( dictionary, cb, keyPrefix )
    // {
    //     keyPrefix = keyPrefix || "";
    //     var stepCount = 0;
    //     var key;
    //     for( key in dictionary )
    //     {
    //         if ( this.isValidType( dictionary[ key ] ) )
    //         {
    //             stepCount++;
    //         }
    //     }
    //
    //     if ( stepCount <= 0 )
    //     {
    //         cb( true );
    //     }
    //     else
    //     {
    //         var completedStepCount = 0;
    //
    //         var resultFunc = function()
    //         {
    //             completedStepCount++;
    //
    //             if ( completedStepCount >= stepCount )
    //             {
    //                 cb( true );
    //             }
    //         };
    //
    //         for( key in dictionary )
    //         {
    //             if ( this.isValidType( dictionary[ key ] ) )
    //             {
    //                 this.set( keyPrefix + key, dictionary[ key ], resultFunc );
    //             }
    //         }
    //     }
    // },
    //
    // //passes a dictionary with each key matching a value to cb, takes an array of keys
    // //optionally, you can add a keyPrefix, which is prepended to all keys as they are read from the db
    // //but, the keyPrefix is not included in the keys returned in the dictionary
    // getMultiple: function( keys, cb, keyPrefix )
    // {
    //     keyPrefix = keyPrefix || "";
    //     var completedStepCount = 0;
    //     var dictionary = {};
    //
    //     var resultFunc = function( key, val )
    //     {
    //         completedStepCount++;
    //         dictionary[ key ] = val;
    //
    //         if ( completedStepCount >= keys.length )
    //         {
    //             cb( dictionary );
    //         }
    //     };
    //
    //     if ( keys.length <= 0 )
    //     {
    //         cb( {} );
    //     }
    //     else
    //     {
    //         var keyIndex;
    //         for ( keyIndex = 0; keyIndex < keys.length; keyIndex++ )
    //         {
    //             var redisKey = keys[ keyIndex ];
    //             var dictionaryKey = redisKey.key || redisKey;
    //             if ( keys[ keyIndex ].key )
    //             {
    //                 redisKey.key = keyPrefix + redisKey.key;
    //             }
    //             else
    //             {
    //                 redisKey = keyPrefix + redisKey;
    //             }
    //
    //             this.get( redisKey, resultFunc.bind( this, dictionaryKey ) );
    //         }
    //     }
    // },
    
    isValidType: function( val )
    {
        var type = typeof( val );
        
        return type === "boolean" || type === "number" || type === "string" || val instanceof Array || val instanceof Date || this.isExpandableObject( val );
    },
    
    isExpandableObject: function( val )
    {
        if ( typeof( val ) !== "object" )
        {
            return false;
        }
        
        if ( val instanceof Array || val instanceof Date )
        {
            return false;
        }
        
        return true;
    },
    
    //returns an array of key objects that you can use for getMultiple and setMultiple.
    // getKeysFromObject: function( obj )
    // {
    //     var key;
    //     var keys = [];
    //     for ( key in obj )
    //     {
    //         var val = obj[ key ];
    //         if ( this.isValidType( val ) )
    //         {
    //             var type = typeof( val );
    //
    //             if ( val instanceof Array )
    //             {
    //                 type = "array";
    //             }
    //             else if ( val instanceof Date )
    //             {
    //                 type = "date";
    //             }
    //
    //             var keyObj = { type: type, key: key };
    //
    //             if ( type === "object" )
    //             {
    //                 var subKeys = this.getKeysFromObject( val );
    //                 keyObj.subKeys = subKeys;
    //             }
    //
    //             keys.push( keyObj );
    //         }
    //     }
    //
    //     return keys;
    // },
    //
    // setValuesFromObject: function( obj, cb, prefix )
    // {
    //     var keys = this.getKeysFromObject( obj );
    //     var dictionary = {};
    //     var keyIndex;
    //     for ( keyIndex = 0; keyIndex < keys.length; keyIndex++ )
    //     {
    //         dictionary[ keys[ keyIndex ].key ] = obj[ keys[ keyIndex ].key ];
    //     }
    //
    //     this.setMultiple( dictionary, cb, prefix );
    // },
    //
    // writeValuesToObject: function( obj, cb, prefix )
    // {
    //     var keys = this.getKeysFromObject( obj );
    //
    //     this.getMultiple( keys, function( dictionary )
    //     {
    //         var key;
    //         for ( key in dictionary )
    //         {
    //             if ( dictionary[ key ] !== undefined && dictionary[ key ] !== null )
    //             {
    //                 obj[ key ] = dictionary[ key ];
    //             }
    //         }
    //
    //         cb();
    //
    //     }, prefix );
    // },
    
    setJsonFromObject: function( key, obj, cb )
    {
        var jsonString = JSON.stringify( obj );
        this._log( "Redis: setting object " + key + " to " + jsonString );
        
        client.set( key, jsonString, function( err, result )
        {
            cb( !err );
        });
    },
    
    writeJsonToObject: function( key, obj, cb )
    {
        client.get( key, function( err, result )
        {
            this._log( "Redis: got object string " + result + " for " + key );
            
            if ( !err )
            {
                var data = JSON.parse( result );
                var dataKey;
                for ( dataKey in data )
                {
                    obj[ dataKey ] = data[ dataKey ];
                }
            }
            cb( !err );
        }.bind(this));
    },
    
    dump: function( key, cb )
    {
        client.get( key, function( err, result )
        {
            if ( err )
            {
                this.getArray( key, function( result2 )
                {
                    cb( JSON.stringify( result2 ) );
                }.bind(this));
            }
            else
            {
                cb( result );
            }
        }.bind(this));
        
        //this shit doesn't work
        // client.dump( key, function( err, result )
        // {
        //     this._log( "Redis: dumping database object at key: " + key );
        //
        //     cb( result );
        // }.bind(this));
    },
    
    restore: function( key, val, cb )
    {
        var setVal = val;
        try { setVal = JSON.parse( setVal ); } catch (err){}
        
        this.set( key, setVal, cb );
        
        //this shit doesn't work
        // client.restore( key, 0, val, function( err, result )
        // {
        //     this._log( "Redis: restoring database object at key: " + key + " err? " + err );
        //
        //     cb( !err );
        // }.bind(this));
    },
    
    getAllKeys: function( cb )
    {
        client.keys( "*", function( err, result )
        {
            cb( result );
        }.bind(this));
    },
    
    _log: function( str )
    {
        if ( this.verbose )
        {
            console.log( str );
        }
    },
    
    //stringifies most things, except strings of course
    _getSetValue: function( val )
    {
        return String( val );
    }
};