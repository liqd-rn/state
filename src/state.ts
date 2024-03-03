import React, { useState, useEffect } from 'react';
import Hash from './hash';

export class State<T>
{
    private hash: string = '';
    private value: T | undefined;
    private setters = new Set<React.Dispatch<React.SetStateAction<T|undefined>>>();
    private cache: boolean = false;

    public get<T>(): T | undefined
    public get<T>( value?: T ): T
    public get( value?: T ): T | undefined
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

    public set( value: T, cache: boolean = false )
    {
        this.cache ||= cache;

        if( typeof value === 'object' || this.value !== value ) //object could change internaly even if it is the same object
        {
            const hash = Hash( value );

            // TODO do basic comparison first for array / object => array.lenth, array[0], Object.keys.length and do not save hash then
            if( this.hash !== hash )
            {
                this.hash = hash;
                this.value = value;

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

    public static get Global()
    {
        return StateManager.global ?? ( StateManager.global = new StateManager());
    }

    public static get( name: string )
    {
        let instance = StateManager.instances.get( name );

        if( !instance )
        {
            StateManager.instances.set( name, instance = new StateManager());
        }

        return instance;
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

    public get<T>( key: string ): T | undefined
    public get<T>( key: string, value: T ): T
    public get<T>( key: string, value?: T ): T | undefined
    {
        return this.state<T>( key ).get( value );
    }

    public set<T>( key: string, value: T, cache: boolean = false )
    {
        this.state<T>( key ).set( value, cache );
    }
}