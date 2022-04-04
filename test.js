const { MWsClient } = require('./build/index');

const ws = new MWsClient({
    host: '127.0.0.1:20020',
    show_send: true,
    show_recv: true,
    reconnection: true,
    credentials: {
        access_token: '1234567890'
    }
});

ws.on('connected', (id, clientInfo) => {
    process.exit(-1);
});

ws.on('disconnected', (code, reason) => {

});

ws.on('signal', (code, data) => {

});

ws.connect();

