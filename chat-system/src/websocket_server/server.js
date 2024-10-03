import { WebSocketServer } from "ws";

const PORT = 4000;
const NeighbourPORT = 4001;
const wss = new WebSocketServer({ port: PORT });
const wsClient = new WebSocket('ws://localhost:4001');

let clients = {};
let neighbourhoodServers = {};

//#region Functions

function broadcastClientList()
{
    console.log("Now broadcasting client list...");
    const clientUpdateMessage = {
        type: "client_update",
        clients: []
    };

    // Iterate over the clients object and build the list of connected clients
    for (const publicKey in clients) {
        const { "client-id": id } = clients[publicKey]; // Get the client ID
        clientUpdateMessage.clients.push({
            "client-id": id,
            "public-key": publicKey
        });
    }

    sendToNeighbourhoodServers(clientUpdateMessage);
    sendToAllClient(clientUpdateMessage);
}

function sendToAllClient(message)
{
    console.log("Sending message to client: \n[");
    for (const key in clients) {
        console.log('\t', clients[key]['client-id']);
    }
    console.log("]\n");
    const messageString = JSON.stringify(message);
    const clientArray = Object.values(clients);
    clientArray.forEach(c =>
    {
        if (c.ws && c.ws.readyState === WebSocket.OPEN) { // Check if the connection is open
            c.ws.send(messageString); // Send the message
        }
    });
    console.log("Finished sending message to client.\n");
}

function sendToNeighbourhoodServers(message)
{
    console.log("Sending message to neighbourhood servers...\n", neighbourhoodServers, message);
    const messageString = JSON.stringify(message);

    neighbourhoodServers.forEach(serverWs =>
    {
        if (serverWs.readyState === WebSocket.OPEN) { // Check if the connection is open
            serverWs.send(messageString); // Send the message
        } else {
            console.log("WebSocket connection is not open. Cannot send message.");
        }
    });
}

// Example of adding a neighbourhood server connection
function addNeighbourhoodServer(serverUrl)
{
    const serverWs = new WebSocket(serverUrl);

    serverWs.onopen = () =>
    {
        console.log(`Connected to neighbourhood server: ${serverUrl}`);
        neighbourhoodServers.push(serverWs); // Store the WebSocket connection
    };

    serverWs.onclose = () =>
    {
        console.log(`Disconnected from neighbourhood server: ${serverUrl}`);
        // Optionally remove the closed connection from the array
        const index = neighbourhoodServers.indexOf(serverWs);
        if (index > -1) {
            neighbourhoodServers.splice(index, 1);
        }
    };

    serverWs.onerror = (error) =>
    {
        console.error(`WebSocket error: ${error}`);
    };
}

function generateClientId()
{
    const timestamp = Date.now().toString(36); // Convert timestamp to base 36
    const randomNum = Math.random().toString(36).substring(2, 8); // Random base 36 string
    return `${timestamp}-${randomNum}`; // Combine timestamp and random number
}
//#endregion

//#region WebSocket Client
wsClient.on('open', () =>
{
    console.log('Connected to server on port ', NeighbourPORT);

    // You can send messages to server 3000 like this:
    wsClient.send(JSON.stringify({
        data: {
            type: 'server_hello',
            sender: `server-id-${NeighbourPORT}`,
            message: `Hello from server ${NeighbourPORT}!`
        }
    }));
});

wsClient.on('message', (message) =>
{
    console.log('---------------------Received from server 3000:', message);
});

wsClient.on('close', () =>
{
    console.log('Connection closed');
});
//#endregion

//#region WebSocket
wss.on('connection', (ws) =>
{
    // onlineUsers.add(ws);
    // const users = Array.from(onlineUsers);
    // const message = JSON.stringify({ type: 'onlineUsers', users });
    // onlineUsers.forEach((user) => user.send(message));

    // ws.send(JSON.stringify({ type: 'publicKey', key: serverPublicKey }));

    // ws.send(JSON.stringify({
    //   type: 'server_hello',
    //   sender: server.address().address
    // }));

    ws.on('message', async (message) =>
    {
        const parsedMessage = JSON.parse(message);
        console.log('Received message:', parsedMessage);

        if (parsedMessage.type === 'client_update_request') {
            broadcastClientList();
        }

        else if (parsedMessage.type == 'client_update') {
            data.clients.forEach(client =>
            {
                clients[client["public-key"]] = {
                    ws: clients[client["public-key"]] ? clients[client["public-key"]].ws : null,
                    "client-id": client["client-id"],
                };
            });
        }

        else {
            // Below must have parsedMessage.data
            const data = parsedMessage.data;

            if (!data)
                return;

            else if (data.type === 'server_hello') {
                console.log(`Received server_hello from: ${data.sender} | user: ${data.username}`);
            }

            else if (data.type === 'hello') {
                clients[data.public_key] = {
                    ws: ws,
                    "client-id": generateClientId(),
                };
                // Broadcast updated client list to all clients
                broadcastClientList();
            }

            else if (data.type == 'public_chat') {
                sendToAllClient({ type: data.type, sender: clients[data.sender]['client-id'], message: data.message });
            }

            // Handle client list requests
            else if (parsedMessage.type === 'client_list_request') {
                ws.send(JSON.stringify({
                    type: 'client_list',
                    servers: [{
                        address: `${server.address().address}:${server.address().port}`,
                        serverId: "server-id-" + server.address().port,
                        clients: Object.keys(clients).map(publicKey => ({
                            "client-id": clients[publicKey]["client-id"],
                            "public-key": publicKey
                        }))
                    }]
                }));
            }

            else if (data.type === 'fileTransfer') {
                const fileLink = data.fileLink;

                if (data.to && clients[data.to]) {
                    clients[data.to].send(JSON.stringify({
                        type: 'fileTransfer',
                        from: userName,
                        fileName: data.fileName,
                        fileLink: fileLink
                    }));
                } else {
                    broadcast({
                        type: 'fileTransfer',
                        from: userName,
                        fileName: data.fileName,
                        fileLink: fileLink
                    });
                }
            }

        }
    });

    ws.on('close', () =>
    {
        // delete clients[userName];
        // broadcastOnlineUsers();
    });

});


//#region Listen
// PORT = 3001;
server.listen(PORT, () =>
{
    console.log(`> Server started on port ${PORT}`);
});
//#endregion
