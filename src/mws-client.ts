import { EventEmitter, Log, JSONStringify, formatBytesSize, JSONParse, GetWSCodeReason, CloseProtocol } from './mws-client.utility';
import { IMWsClientKeyValue, MWsClientOptions } from './index';

const SignalCodes = {
    // SignalCodes: Client to Server
    C2S: {
        /**
         * @param {string} client_id
         * @param {string} reason
         */
        SC_CLIENT_KICK: (client_id: string, reason: string) => {
            return { code: 202, data: { client_id, reason } };
        },
        /**
         * @param {string} client_id
         * @param {string} reason
         * @param {string} length
         */
        SC_CLIENT_BAN: (client_id: string, reason: string, length: string) => {
            return { code: 203, data: { client_id, reason, length } };
        },
    }
};

enum MWsConnectionState {
    CONNECTING = 1,
    CONNECTED = 2,
    DISCONNECTED = 3
};

export class MWsClient extends EventEmitter {
    private connectCount: number = 0;
    private ws: WebSocket | null = null;
    private url: string | null = null;
    private id: string = 'ID_PENDING';
    private clientInfo: IMWsClientKeyValue | null = null;
    private connection: MWsConnectionState = MWsConnectionState.DISCONNECTED;

    public constructor(private options: MWsClientOptions) {
        super();
        this.parseOptions(options || {});
    }

    public connect(credentials: IMWsClientKeyValue | null = null, reconnection: boolean = false) {
        if (this.ws && this.ws['readyState'] === 1) {
            Log.error('Already connected. Disconnect before reconnecting. (URL: %s)', this.url);
            return;
        }

        if (!this.url) {
            return;
        }

        if (this.ws && this.ws['readyState'] === 0) {
            return;
        }

        if (this.connectCount++ === 0) {
            this.disconnect(null);
            Log.info('(CONNECTING) URL: %s', this.url);
        }

        if (credentials && typeof credentials === 'object') {
            this.options.credentials = credentials;
        }

        if (typeof reconnection === 'boolean') {
            this.options.reconnection = reconnection;
        }

        if (typeof WebSocket !== 'undefined') {
            this.ws = new WebSocket(this.url, ['deep']);
        } else {
            const { WebSocket } = require('ws');
            this.ws = new WebSocket(this.url, ['deep']);
        }

        if (this.ws) {
            this.ws.binaryType = 'arraybuffer';
            this.ws.addEventListener('open', this.onOpen.bind(this));
            this.ws.addEventListener('close', this.onClose.bind(this));
            this.ws.addEventListener('message', this.onMessage.bind(this));
        }
    }

    public disconnect(reason: string | null) {
        try {
            if (this.ws) {
                if (this.ws['readyState'] === 1 && reason) {
                    const closedReason = CloseProtocol.C5201(reason);
                    this.ws.close(closedReason.code, closedReason.reason);
                    this.options.reconnection = false;
                    this.onClose(closedReason);
                }
            }
        } catch (ignore) {
            Log.error('disconnect_error: %s', (ignore as any).message);
        }
        this.ws = null;
        this.id = 'ID_PENDING';
        this.connection = MWsConnectionState.DISCONNECTED;
        this.clientInfo = {};
    }

    public send(signal: number, data: string | boolean | number | object | string[] | number[] | object[]) {
        try {
            if (!this.ws || this.connection === MWsConnectionState.DISCONNECTED || this.ws['readyState'] !== 1) {
                Log.error('SendError / WebSocket is not open.');
                return;
            }

            if (signal >= 0 && signal <= 9999) {
                let strData = JSONStringify(data);
                let payload = new TextEncoder().encode('\x00\x00\x00\x00' + strData);
                let strSignal = '0000' + signal;

                if (this.options.maxPayload) {
                    if (strData.length >= this.options.maxPayload) {
                        Log.error(`SendError / Max payload size exceeded (%s Bytes of %s Bytes)`, strData.length, this.options.maxPayload);
                        return;
                    }
                }

                payload[0] = Number(strSignal[strSignal.length - 4] + '' + strSignal[strSignal.length - 3]);
                payload[1] = Number(strSignal[strSignal.length - 2] + '' + strSignal[strSignal.length - 1]);
                payload[2] = 25;
                payload[3] = 151;
                if (this.options.show_send) {
                    Log.info('(SEND) Signal: "%s" -> Data: %o', signal, data, formatBytesSize(strData.length));
                }
                this.ws.send(payload);
            }
            else {
                Log.error('The signal code must be between 1 and 9999. ', signal);
            }
        } catch (e) {
            Log.error('SendError / %s', (e as any).message);
        }
    }

    public clientKick(clientId: string, reason: string) {
        const signal = SignalCodes.C2S.SC_CLIENT_KICK(clientId, reason);
        this.send(signal.code, signal.data);
    }

    public clientBan(clientId: string, reason: string, length: string) {
        const signal = SignalCodes.C2S.SC_CLIENT_BAN(clientId, reason, length);
        this.send(signal.code, signal.data);
    }

    private onOpen() {
        this.connection = MWsConnectionState.CONNECTING;
        this.send(0, this.options.credentials);
    }

    private onClose(ev: any) {
        if (this.ws) {
            let code = ev.code;
            let reason = GetWSCodeReason(code, ev.reason);
            Log.error('(DISCONNECTED) CLIENT ID: "%s" / Code: %s / Reason: %s', this.id, code, reason);
            this.emit('disconnected', code, reason);
            this.disconnect(null);
            if (this.options.reconnection && code < 5000) {
                Log.error('(RECONNECTING) URL: %s', this.url);
                setTimeout(this.connect.bind(this), 5000);
            }
            this.connection = MWsConnectionState.DISCONNECTED;
        }
    }

    private onMessage(pocket: any) {
        try {
            let data = new Uint8Array(pocket.data);
            if (data[2] === 25 && data[3] === 151) {
                if ((data[0] + data[1]) === 0) {
                    if (data[4] === 77 && data[5] === 75) {
                        this.connection = MWsConnectionState.CONNECTED;
                        this.id = new TextDecoder().decode(data.slice(4, 21));
                        this.clientInfo = JSON.parse(new TextDecoder().decode(data.slice(21)));
                        Log.info('(CONNECTED) CLIENT ID: "%s" %o', this.id, this.clientInfo);
                        return this.emit('connected', this.id, this.clientInfo);
                    }
                }
                else {
                    if (this.connection === MWsConnectionState.CONNECTED) {
                        const signalCode = (100 * data[0]) + data[1];
                        const signalData = ((_data) => {
                            const str = new TextDecoder().decode(_data);
                            if (_data[0] === 123 || _data[0] === 91) {
                                return JSONParse(str);
                            }
                            return str;
                        })(data.slice(4));
                        if (this.options.show_recv) {
                            Log.info('(RECEIVED = %s) Signal: "%s" <- Data: %o', formatBytesSize(data.slice(4).byteLength), signalCode, signalData);
                        }
                        return this.emit('signal', signalCode, signalData);
                    }
                    return;
                }
            }
            return this.disconnect('Received invalid signal data');
        } catch (e) {
            return this.disconnect((e as any).message);
        }
    }

    private parseOptions(options: MWsClientOptions) {
        options.show_send = !!options.show_send;
        options.show_recv = !!options.show_recv;
        options.ssl = !!options.ssl;
        options.reconnection = !!options.reconnection;
        if (!options.host) {
            options.host = '127.0.0.1:1997';
        }
        if (!options.maxPayload) {
            options.maxPayload = 100 * 1024 * 1024; // 100 MB
        }
        if (!options.credentials) {
            options.credentials = {};
        }
        this.url = `${options.ssl ? 'wss' : 'ws'}://${options.host}`;
        this.options = options;
    }
}