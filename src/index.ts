/*!
    WS: Created By MARK46 (https://github.com/MARK-46)
    31-03-2022 12:45:23
 */

export { MWsClient } from './mws-client';
export { FastMap, EventEmitter, JSONStringify, JSONParse, CloseProtocol } from './mws-client.utility';

export interface IMWsClientKeyValue {
    [key: string]: null | string | number | boolean | string[] | number[];
}

export interface MWsClientOptions {
    ssl?: boolean,
    reconnection: boolean,
    maxPayload?: number,
    show_send: boolean,
    show_recv: boolean,
    host: string,
    credentials: IMWsClientKeyValue,
} 
