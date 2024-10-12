//#region Imports
import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import path from "path";
import multer from "multer";
import crypto from "crypto";
import { TextEncoder } from "util";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "uploads");
app.use(express.static(path.join(__dirname, "app")));
app.use("/files", express.static(UPLOAD_DIR));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
  {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) =>
  {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Save the file with a unique name
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

//#region Variables
let clients = {};
let messageCounters = {};
const neighbourhoodServers = [];
let PORT = process.env.PORT || 3000;
let privateKey;
let publicKey;
//#endregion

//#region Encryption
function decryptAESKey(encryptedKey)
{
  try {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedKey, "base64")
    );
    return decrypted;
  } catch (error) {
    console.error("Error decrypting AES key:", error);
    return null;
  }
}

// AES Encryption
function encryptWithAES(data, aesKey, iv)
{
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

// AES Decryption
function decryptWithAES(encryptedData, aesKey, iv)
{
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Generate random AES key and IV
function generateAESKey()
{
  return crypto.randomBytes(32); // AES-256 key size
}

function generateIV()
{
  return crypto.randomBytes(16); // AES IV size
}

// Encrypt AES key with RSA public key
function encryptAESKeyWithRSA(aesKey, recipientPublicKey)
{
  return crypto
    .publicEncrypt(
      {
        key: recipientPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      aesKey
    )
    .toString("base64");
}

const generateKeyPair = async () =>
{
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: { name: "SHA-256" },
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyTem = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );

  // Send the public key to the server in "hello" message
  const publicKeyBase64 = btoa(
    String.fromCharCode(...Array.from(new Uint8Array(publicKeyTem)))
  );

  privateKey = keyPair.privateKey;
  publicKey = publicKeyBase64;
};
//#endregion

//#region Functions
// function broadcastOnlineUsers()
// {
//   const onlineUsers = Object.keys(clients);
//   broadcast({
//     type: 'onlineUsers',
//     users: onlineUsers
//   });
// }

// // Broadcast message to all clients in the specified format
// function broadcast(message, sender = null)
// {
//   console.log("---Broadcast start---");
//   const aesKey = generateAESKey();
//   const iv = generateIV();

//   const encryptedMessage = encryptWithAES(JSON.stringify(message), aesKey, iv);

//   wss.clients.forEach(client =>
//   {
//     if (client.ws.readyState === WebSocket.OPEN) {
//       const recipientPublicKey = fs.readFileSync(path.join(__dirname, 'public', `public.pem`), 'utf8');
//       const encryptedAESKey = encryptAESKeyWithRSA(aesKey, recipientPublicKey);
//       const broadcastData = {
//         type: 'chat',
//         destination_servers: [client.ws.server], // Assume you have server info
//         iv: iv.toString('base64'), // Base64 encoded IV
//         symm_keys: [encryptedAESKey], // AES key encrypted with the recipient's public RSA key
//         chat: encryptedMessage // Base64 encoded AES encrypted message
//       };

//       console.log(`Sending message to ${client}:\n`, broadcastData);
//       client.send(JSON.stringify(broadcastData));
//     }
//   });
//   console.log("---Broadcast end---");
// }

function broadcastClientList()
{
  console.log("Now broadcasting client list...");
  const clientUpdateMessage = {
    type: "client_update",
    clients: [],
  };

  // Iterate over the clients object and build the list of connected clients
  for (const publicKey in clients) {
    const { "client-id": id } = clients[publicKey]; // Get the client ID
    clientUpdateMessage.clients.push({
      "client-id": id,
      "public-key": publicKey,
    });
  }

  sendToNeighbourhoodServers(clientUpdateMessage);
  sendToAllClient(clientUpdateMessage);
}

function sendToAllClient(message)
{
  console.log("Sending message to client: \n[");
  for (const key in clients) {
    console.log("   ", clients[key]["client-id"]);
  }
  console.log("]\n");
  const messageString = JSON.stringify(message);
  console.log("sending message:", messageString);
  const clientArray = Object.values(clients);
  clientArray.forEach((c) =>
  {
    if (c.ws && c.ws.readyState === WebSocket.OPEN) {
      // Check if the connection is open
      c.ws.send(messageString); // Send the message
      console.log("Sent to client");
    }
  });
  console.log("Finished sending message to clients.\n");
}

function sendToNeighbourhoodServers(message)
{
  console.log(
    "Sending message to neighbourhood servers...\n",
    neighbourhoodServers
  );
  const messageString = JSON.stringify(message);

  neighbourhoodServers.forEach((serverWs) =>
  {
    if (serverWs.readyState === WebSocket.OPEN) {
      // Check if the connection is open
      serverWs.send(messageString); // Send the message
    } else {
      console.log("WebSocket connection is not open. Cannot send message.");
    }
  });
}

function generateClientId(publicKey)
{
  const hash = crypto.createHash("sha256");
  hash.update(publicKey);
  const digest = hash.digest(); // returns a Buffer

  return Buffer.from(digest).toString("base64");
}

//#region Server to Server
function addNeighbourhoodServer(serverUrl)
{
  const serverWs = new WebSocket(serverUrl);

  serverWs.on("open", () =>
  {
    console.log(`Connected to neighbourhood server: ${serverUrl}`);
    neighbourhoodServers.push(serverWs);

    // Send server hello message
    const helloMessage = {
      type: "server_hello",
      sender: PORT,
    };
    serverWs.send(JSON.stringify(helloMessage));
  });

  serverWs.on("message", (message) =>
  {
    handleServerMessage(serverWs, JSON.parse(message));
  });

  serverWs.on("close", () =>
  {
    console.log(`Disconnected from neighbourhood server: ${serverUrl}`);
    const index = neighbourhoodServers.indexOf(serverWs);
    if (index > -1) {
      neighbourhoodServers.splice(index, 1);
    }
  });

  serverWs.on("error", (error) =>
  {
    console.error(`WebSocket error with server ${serverUrl}:`, error);
  });
}

function handleServerMessage(serverWs, message)
{
  if (message.type === "server_hello") {
    console.log(`Received server_hello from ${message.sender}`);
  }
  if (message.type === "chat") {
    // Relay the chat message to the recipient if on this server
    const { destination_servers, chat, symm_keys, iv, client_info } = message;
    const recipientServer = destination_servers[0]; // assuming the first is the target
    if (recipientServer === server.address().address) {
      const recipientClient = clients[client_info.client_id];
      if (
        recipientClient &&
        recipientClient.ws &&
        recipientClient.ws.readyState === WebSocket.OPEN
      ) {
        recipientClient.ws.send(
          JSON.stringify({
            type: "chat",
            chat,
            symm_keys,
            iv,
          })
        );
      }
    }
  }
}

function relayPrivateMessage(message)
{
  const { destination_servers, chat, symm_keys, iv, client_info } = message;

  destination_servers.forEach((serverUrl) =>
  {
    const targetServer = neighbourhoodServers.find((s) => s.url === serverUrl);
    if (targetServer && targetServer.readyState === WebSocket.OPEN) {
      targetServer.send(
        JSON.stringify({
          type: "chat",
          destination_servers,
          chat,
          symm_keys,
          iv,
          client_info,
        })
      );
    }
  });
}

function handlePrivateChatMessage(parsedMessage)
{
  const { destination_servers, chat, symm_keys, iv, client_info } =
    parsedMessage;

  // If the destination server is this server, forward to the recipient client
  if (destination_servers.includes(server.address().address)) {
    const recipient = clients[client_info.client_id];
    if (
      recipient &&
      recipient.ws &&
      recipient.ws.readyState === WebSocket.OPEN
    ) {
      recipient.ws.send(
        JSON.stringify({
          type: "chat",
          chat,
          symm_keys,
          iv,
        })
      );
    }
  } else {
    // Otherwise, relay to the appropriate server in the neighborhood
    relayPrivateMessage(parsedMessage);
  }
}


//#region WebSocket
wss.on("connection", (ws) =>
{
  // onlineUsers.add(ws);
  // const users = Array.from(onlineUsers);
  // const message = JSON.stringify({ type: 'onlineUsers', users });
  // onlineUsers.forEach((user) => user.send(message));

  // ws.send(JSON.stringify({ type: 'publicKey', key: publicKey }));

  // ws.send(JSON.stringify({
  //   type: 'server_hello',
  //   sender: server.address().address
  // }));

  ws.on("message", async (message) =>
  {
    const parsedMessage = JSON.parse(message);
    console.log("Received message:", parsedMessage);

    if (parsedMessage.type === "client_update_request") {
      broadcastClientList();
    } else if (parsedMessage.type == "client_update") {
      data.clients.forEach((client) =>
      {
        clients[client["public-key"]] = {
          ws: clients[client["public-key"]]
            ? clients[client["public-key"]].ws
            : null,
          "client-id": client["client-id"],
        };
      });
    } else if (parsedMessage.type === "client_list_request") {
      let serverAddress = server.address().address || "localhost";
      if (serverAddress === "::") serverAddress = "localhost";
      sendToAllClient({
        type: "client_list",
        servers: [
          {
            address: `${serverAddress}:${server.address().port}`,
            serverId: "server-id-" + server.address().port,
            clients: Object.keys(clients).map((publicKey) => ({
              "client-id": clients[publicKey]["client-id"],
              "public-key": publicKey,
            })),
          },
        ],
      });
    } else if (parsedMessage.type === "generate_key_pair") {
      const { publicKey, privateKey } =
        crypto.generateKeyPairSync("rsa", {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: "spki",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
          },
        });
      message = {
        type: "key_pair_result",
        clientID: parsedMessage.clientID,
        messagePublicKey: publicKey,
        messagePrivateKey: privateKey,
      }
      const clientArray = Object.values(clients);
      clientArray.forEach((c) =>
      {
        if (c.ws && c.ws.readyState === WebSocket.OPEN && c["client-id"] === parsedMessage.clientID) {
          c.ws.send(JSON.stringify(message)); // Send the message
          console.log("Message key is sent");
        }
      });
    } else if (parsedMessage.type === "signed_data") {
      // Below must have parsedMessage.data
      const data = parsedMessage.data;

      if (!data) return;
      else if (data.type === "server_hello") {
        console.log(
          `Received server_hello from: ${data.sender} | user: ${data.username}`
        );
      } else if (data.type === "hello") {
        clients[data.public_key] = {
          ws: ws,
          "client-id": generateClientId(data.public_key),
        };
        // Broadcast updated client list to all clients
        broadcastClientList();
        // } else if (data.type == "public_chat") {
        //   sendToAllClient(parsedMessage);
      }
      else if (data.type === "fileTransfer") {
        const fileLink = data.fileLink;

        if (data.to && clients[data.to]) {
          clients[data.to].send(
            JSON.stringify({
              type: "fileTransfer",
              from: userID,
              fileName: data.fileName,
              fileLink: fileLink,
            })
          );
        } else {
          broadcast({
            type: "fileTransfer",
            from: userID,
            fileName: data.fileName,
            fileLink: fileLink,
          });
        }
      } else sendToAllClient(parsedMessage);

      //   // Handle forwarding messages (for text only)
      //   else if (data.type === 'forwardMessage') {
      //     const originalMessage = data.data.originalMessage;
      //     const forwardTo = data.data.forwardTo;

      //     if (clients[forwardTo]) {
      //       clients[forwardTo].send(JSON.stringify({
      //         type: 'privateMessage',
      //         from: `${userName} (Forwarded)`,
      //         message: originalMessage,
      //       }));
      //     }
      //   }

      //   else if (data.type === 'onlineUsers') {
      //     ws.send(JSON.stringify({ type: 'onlineUsers', users: Array.from(onlineUsers) }));
      //   }

      //   if (data.counter && data.counter > messageCounters[userName]) {
      //     messageCounters[userName] = data.counter;

      //     if (data.type === 'privateMessage') {
      //       const recipientWs = clients[data.to];
      //       if (recipientWs) {
      //         recipientWs.send(JSON.stringify({
      //           type: 'privateMessage',
      //           from: userName,
      //           message: data.message
      //         }));
      //       }
      //     } else if (data.type === 'groupMessage') {
      //       broadcast({
      //         type: 'groupMessage',
      //         from: userName,
      //         message: data.message
      //       });
      //     }
      //   }

      // else if (data.type === 'fileTransfer') {
      //     const fileLink = `http://${server.address().address}:${server.address().port}/files/${data.fileName}`;

      //     if (data.to && clients[data.to]) {
      //       clients[data.to].send(JSON.stringify({
      //         type: 'fileTransfer',
      //         from: userName,
      //         fileName: data.fileName,
      //         fileLink: fileLink
      //       }));
      //     } else {
      //       broadcast({
      //         type: 'fileTransfer',
      //         from: userName,
      //         fileName: data.fileName,
      //         fileLink: fileLink
      //       });
      //     }
      //   }
    } else sendToAllClient(parsedMessage);
  });

  ws.on("close", () =>
  {
    // delete clients[userName];
    // broadcastOnlineUsers();
  });

  // console.log('sending client_update_request');
  // serverWs.send(JSON.stringify({ type: "client_update_request" }));
  // console.log('sending server_hello');
  // serverWs.send(JSON.stringify({
  //   data: {
  //     type: "server_hello",
  //     sender: server.address().address,
  // } }));
});

//#region Links
// app.get('/', (req, res) =>
// {
//   res.send('Server is running!');
// });

//#endregion

//#region Listen

// PORT = 3001;
server.listen(PORT, () =>
{
  console.log(`> Server started on port ${PORT}`);
});
//#endregion
// addNeighbourhoodServer("ws://localhost:3000");