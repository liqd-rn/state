import React, { useEffect, useState, useRef } from 'react';
import objectHash from '@liqd-js/fast-object-hash';

type StateValue<T> = { value: T | undefined };

type StateEvent = 'update';
type StateUpdateHandler<T> = ( value: T | undefined ) => void;

type SetStateOptions = 
{
    cache       ?: boolean
    force       ?: boolean
    onRelease   ?: () => void
};

export class Ref
{
    public static use<T extends Record<string, any>>( value: T ): T
    {
        const ref = useRef<T>( new Proxy( value, 
        {
            get( target: T, key: keyof T extends string ? keyof T : never )
            {
                return target[ key ];
            },
            set( target: T, key: keyof T extends string ? keyof T : never, value: any )
            {
                return target[ key ] = value;
            }
        }));

        return ref.current;
    }
}

export class State<T>
{
    private hash?: string;
    private value: T | undefined;
    private setters = new Set<React.Dispatch<React.SetStateAction<StateValue<T>>>>();
    private cache: boolean = false;
    private onRelease?: () => void;
    private handlers = { update: new Set<StateUpdateHandler<T>>()};
    private releaseTimeout?: number;

    public constructor( value?: T, options: Omit<SetStateOptions, 'force'> = {} )
    {
        this.value = value;
        this.cache = options.cache ?? false;
        this.onRelease = options.onRelease;
    }

    private tryRelease()
    {
        if( this.releaseTimeout )
        {
            clearTimeout( this.releaseTimeout );
            this.releaseTimeout = undefined;
        }

        !this.active && ( this.releaseTimeout = setTimeout(() =>
        {
            if( !this.active )
            {
                !this.cache && this.unset();
                this?.onRelease?.();
            }
        },
        250 ));
    }

    public use(): T | undefined
    public use( value?: T ): T
    public use( value?: T ): T | undefined
    {
        value !== undefined && this.set( value );
        
        const [ get, set ] = useState<StateValue<T>>({ value: this.value });

        this.setters.add( set );

        useEffect(() => () => 
        {
            this.setters!.delete( set );
            this.tryRelease();
        },
        []);

        return get.value;
    }

    public set( value: T, options: SetStateOptions = {})
    {
        const { cache = false, force = false } = options;

        this.cache ||= cache;

        if( force || this.value !== value || typeof value === 'object' )
        {
            const hash = force ? undefined : objectHash( value );

            if( !force && this.hash === undefined )
            {
                this.hash = objectHash( this.value );
            }

            // TODO do basic comparison first for array / object => array.lenth, array[0], Object.keys.length and do not save hash then
            if( force || this.hash !== hash )
            {
                this.hash = hash;
                this.value = value;

                for( let setter of this.setters )
                {
                    try
                    {
                        setter({ value });
                    }
                    catch( e )
                    {
                        //state.setters.delete( setter );

                        //console.error( 'State.set', e );
                    }
                }

                this.handlers.update.forEach( handler => handler( value ));
            }
        }
    }

    public get active()
    {
        return this.setters.size > 0 || this.handlers.update.size > 0;
    }

    public get(): T | undefined
    {
        return this.value;
    }

    private unset()
    {
        this.hash = '';
        this.value = undefined;
    }

    public on( event: StateEvent, callback: StateUpdateHandler<T> ): this
    {
        this.handlers[event].add( callback );

        return this;
    }

    public off( event: StateEvent, callback: StateUpdateHandler<T> ): this
    {
        this.handlers[event].delete( callback );

        this.tryRelease();

        return this;
    }
}

export class StateManager
{
    /* STATIC */
    
    private static global?: StateManager;
    private static instances = new Map<string, StateManager>();

    public static $( name: string )
    {
        let instance = StateManager.instances.get( name );

        if( !instance )
        {
            StateManager.instances.set( name, instance = new StateManager());
        }

        return instance;
    }

    private static get Global()
    {
        return StateManager.global ?? ( StateManager.global = new StateManager());
    }

    public static use<T>( key: string ): T | undefined
    public static use<T>( key: string, value: T ): T
    public static use<T>( key: string, value?: T ): T | undefined
    {
        return StateManager.Global.use( key, value );
    }

    public static set<T>( key: string, value: T, options: SetStateOptions = {})
    {
        return StateManager.Global.set( key, value, options );
    }

    public static get<T>( key: string ): T | undefined
    {
        return StateManager.Global.get( key );
    }

    /* INSTANCE */

    private states = new Map<string, State<any>>();

    private state<T>( key: string ): State<T>
    {
        let state = this.states.get( key );

        if( !state )
        {
            this.states.set( key, state = new State());
        }

        return state;
    }

    public use<T>( key: string ): T | undefined
    public use<T>( key: string, value: T ): T
    public use<T>( key: string, value?: T ): T | undefined
    {
        return this.state<T>( key ).use( value );
    }

    public set<T>( key: string, value: T, options: SetStateOptions = {})
    {
        this.state<T>( key ).set( value, options );
    }

    public get<T>( key: string ): T | undefined
    {
        return this.states.get( key )?.get();
    }
}