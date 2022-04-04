export class EventEmitter {
    private _listeners: { [name: string]: { fn: (...args: any[]) => boolean | void, ctx: any, index: number }[] } = {};

    public on(evt: string, fn: (...args: any[]) => boolean | void, ctx: any = this): number {
        let index = (this._listeners[evt] || []).length;
        (this._listeners[evt] || (this._listeners[evt] = [])).push({
            fn: fn,
            ctx: ctx || this,
            index: index
        });
        return index;
    }

    public off(evt: string | undefined, fnIndex: number | undefined) {
        if (evt === undefined) {
            this._listeners = {};
        }
        else {
            if (fnIndex === undefined) {
                delete this._listeners[evt];
            }
            else {
                if (this._listeners[evt]) {
                    this._listeners[evt] = this._listeners[evt].filter(listener => listener.index !== fnIndex);
                }
            }
        }
        return this;
    }

    public emit(evt: string, ...args: any[]): boolean {
        let result = true;
        let listeners = this._listeners[evt];
        if (listeners) {
            for (let i = 0; i < listeners.length;) {
                let stats = listeners[i].fn.call(listeners[i++].ctx, ...(args || []));
                if (typeof stats === 'boolean' && !stats) {
                    result = false;
                }
            }
        }
        return result;
    }
}

export class FastMap<V>
{
    public constructor(private _values: { [key: string]: V } = {}, private _count: number = 0) {
        if (!this._values) {
            this._values = {};
            this._count = 0;
        }
        else {
            if (!this._count) {
                this._count = Object.keys(this._values).length;
            }
        }
    }

    public delete(key: string): boolean {
        if (this._values[key]) {
            delete this._values[key];
            this._count--;
            return true;
        }
        return false;
    }

    public set(key: string, value: V): V {
        if (!this._values[key])
            this._count++;
        this._values[key] = value;
        return this._values[key];
    }

    public get(key: string): V {
        return this._values[key];
    }

    public forEach(cb: (value: V, key: string) => void): void {
        const values = this._values;
        for (let key in values) {
            if (values[key]) {
                cb(values[key], key);
            }
        }
    }

    public filter(predicate: (value: V, key: string) => boolean): FastMap<V> {
        const buffer = new FastMap<V>();
        const values = this._values;
        for (let key in values) {
            if (values[key]) {
                if (predicate(values[key], key)) {
                    buffer.set(key, values[key]);
                }
            }
        }
        return buffer;
    }

    public clear(): void {
        this._values = {};
    }

    public count(): number {
        return this._count;
    }

    public items(): V[] {
        const buffer = [];
        const values = this._values;
        for (let key in values) {
            if (values[key]) {
                buffer.push(values[key]);
            }
        }
        return buffer;
    }
}

export class Log {
    public static ENABLED: boolean = true;

    public static info(msg: string, ...args: any[]): void {
        if (Log.ENABLED) {
            console.info(`%c#MWS |%c ${ msg }`, 'color: #bada55', null, ...(args || []));
        }
    }

    public static warn(msg: string, ...args: any[]): void {
        if (Log.ENABLED) {
            console.warn(`%c#MWS |%c ${ msg }`, 'color: #ff5722', null, ...(args || []));
        }
    }

    public static error(msg: string, ...args: any[]): void {
        if (Log.ENABLED) {
            console.error(`%c#MWS |%c ${ msg }`, 'color: red', null, ...(args || []));
        }
    }
}

export function pad(text: any, size: number, pattern = '000000000') {
    let s = pattern + text;
    return s.substr(s.length - size);
}

export function GetWSCodeReason(code: number, reason: any) {
    if (code >= 0 && code <= 999) {
        return '(Unused)';
    }
    else if (code >= 1016) {
        if (code <= 1999) {
            return '(For WebSocket standard)';
        }
        else if (code <= 2999) {
            return '(For WebSocket extensions)';
        }
        else if (code <= 3999) {
            return '(For libraries and frameworks)';
        }
        else if (code <= 4999) {
            return '(For applications)';
        }
    }
    const MWSErrorCodes: any = {
        '1000': 'Normal Closure',
        '1001': 'Going Away',
        '1002': 'Protocol Error',
        '1003': 'Unsupported Data',
        '1004': '(For future)',
        '1005': 'No Status Received',
        '1006': 'Abnormal Closure',
        '1007': 'Invalid frame payload data',
        '1008': 'Policy Violation',
        '1009': 'Message too big',
        '1010': 'Missing Extension',
        '1011': 'Internal Error',
        '1012': 'Service Restart',
        '1013': 'Try Again Later',
        '1014': 'Bad Gateway',
        '1015': 'TLS Handshake'
    };
    if (typeof (MWSErrorCodes[code]) !== 'undefined') {
        return MWSErrorCodes[code];
    }
    return reason;
}

export function JSONStringify(json: any) {
    try {
        if (json === null || json === undefined) {
            return '';
        }
        if (typeof json == 'object') {
            return JSON.stringify(json);
        }
        return json.toString();
    } catch (e) {
        Log.error('JSONStringifyError: %s', (e as any).message);
        return '';
    }
};

export function JSONParse(str: any) {
    try {
        if (str === null || str === undefined || str.length === 0) {
            return null;
        }
        return JSON.parse(str);
    } catch (e) {
        Log.error('JSONParseError: %s', (e as any).message);
    }
    return null;
};

export function formatBytesSize(bytes: any, decimals: number = 2) {
    if (bytes === 0) {
        return '0 Bytes';
    }
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [
        'Bytes',
        'KB',
        'MB',
        'GB',
        'TB',
        'PB',
        'EB',
        'ZB',
        'YB'
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i];
};

export const CloseProtocol = {
    C5201: (message: string) => {
        return { code: 5201, reason: `Connection closed by client (Message: ${message || ''}).` };
    }
};
