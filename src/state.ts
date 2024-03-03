import React, { useState, useEffect } from 'react';
import Hash from './hash';

type SetStateOptions = 
{
    cache?: boolean 
    force?: boolean
};

export class State<T>
{
    private hash?: string;
    private value: T | undefined;
    private setters = new Set<React.Dispatch<React.SetStateAction<T|undefined>>>();
    private cache: boolean = false;

    public use(): T | undefined
    public use( value?: T ): T
    public use( value?: T ): T | undefined
    {
        value !== undefined && this.set( value );
        
        const [ get, set ] = useState<T|undefined>( this.value );

        this.setters.add( set );

        useEffect(() => () => 
        {
            this.setters!.delete( set );

            !this.cache && !this.setters.size && this.unset();
        },
        []);

        return get;
    }

    public set( value: T, options: SetStateOptions = {})
    {
        const { cache = false, force = false } = options;

        this.cache ||= cache;

        if( force || this.value !== value || typeof value === 'object' ) //object could change internaly even if it is the same object
        {
            const hash = force ? undefined : Hash( value );

            if( !force && this.hash === undefined )
            {
                this.hash = Hash( this.value );
            }

            // TODO do basic comparison first for array / object => array.lenth, array[0], Object.keys.length and do not save hash then
            if( force || this.hash !== hash )
            {
                this.hash = hash;
                this.value = value;

                // TODO emit warning if( this.value === value && force ) because React will not re-render

                for( let setter of this.setters )
                {
                    try
                    {
                        setter( value );
                    }
                    catch( e )
                    {
                        //state.setters.delete( setter );

                        //console.error( 'State.set', e );
                    }
                }
            }
        }
    }

    private unset()
    {
        this.hash = '';
        this.value = undefined;
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
}