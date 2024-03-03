function cyrb64( str: string, seed: number = 0 )
{
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;

    for( let i = 0, ch; i < str.length; ++i )
    {
        ch = str.charCodeAt(i);
        h1 = Math.imul( h1 ^ ch, 2654435761 );
        h2 = Math.imul( h2 ^ ch, 1597334677 );
    }

    h1  = Math.imul( h1 ^ ( h1 >>> 16 ), 2246822507 );
    h1 ^= Math.imul( h2 ^ ( h2 >>> 13 ), 3266489909 );
    h2  = Math.imul( h2 ^ ( h2 >>> 16 ), 2246822507 );
    h2 ^= Math.imul( h1 ^ ( h1 >>> 13 ), 3266489909 );
    
    return [ h2>>>0, h1>>>0 ];
};

//TODO if object is of different constructor.name return random ID so its always different
function stableStringify( obj: any, sort: boolean ): string
{
    if( typeof obj === 'undefined' ){ return '' }
    if( typeof obj !== 'object' || obj === null ){ return JSON.stringify( obj )}
    if( obj instanceof Date ){ return stableStringify( obj.toISOString(), sort )}
    if( obj instanceof RegExp ){ return stableStringify( obj.toString(), sort )}
    if( obj instanceof Set ){ return stableStringify([...obj], sort )}
    if( obj instanceof Map ){ return stableStringify( Object.fromEntries([...obj.entries()]), sort )}
    if( Array.isArray( obj ))
    {
        const arr = obj.map( v => stableStringify( v, sort )); sort && arr.sort();

        return `[${ arr.join(',') }]`;
    }

    const pairs = Object.keys( obj ).sort().map( key => `${ JSON.stringify( key ) }:${ stableStringify( obj[key], sort )}`);

    return `{${ pairs.join(',') }}`;
}

export default function Hash( obj: any ): string
{
    const [ h2, h1 ] = cyrb64( stableStringify( obj, false ), 0 );
    return h2.toString(36).padStart( 7, '0' ) + h1.toString(36).padStart( 7, '0' );
}