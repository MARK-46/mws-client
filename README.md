# WebSocket
- Server: done.
- Client: done.
~~~
WS: Created By MARK46 (https://github.com/MARK-46)
    31-03-2022 12:45:23


# Example
```javascript
const { MWsClient } = require('@mark46/mws-client');

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
    
});

ws.on('disconnected', (code, reason) => {

});

ws.on('signal', (code, data) => {

});

ws.connect();
```