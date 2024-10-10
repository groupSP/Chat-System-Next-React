"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Chatbox from "@/components/Chatbox";
import LoginContainer from "@/components/LoginContainer";
import ForwardModal from "@/components/ForwardModal";
import { AnimatePresence, motion } from "framer-motion";
import {
  SignMessage,
  generateAESKey,
  encryptAES,
  encryptAESKeyWithRSA,
  importRSAPublicKey,
  verifySignature,
} from "../utils/crypto";
import { toast } from "sonner";

export class User {
  id: string;
  publicKey?: string;
  username?: string;
  isOnline: boolean = true;

  constructor(id: string, publicKey?: string, username?: string) {
    this.id = id;
    this.publicKey = publicKey;
    this.username = username;
  }
}

export class Message {
  sender: User;
  content: string;
  recipient: User;
  fileLink?: string;

  constructor(
    sender: User,
    content: string,
    recipient: User,
    fileLink?: string
  ) {
    this.sender = sender;
    this.content = content;
    this.recipient = recipient;
    this.fileLink = fileLink;
  }

  displayName(): string {
    return this.sender.username ?? this.sender.id;
  }
}

type Client = {
  "client-id": string;
  "public-key": string;
  username?: string;
};

let processedFileMessages: string[] = [];

//#region ChatSystem
export default function ChatSystem() {
  const publicKey = useRef("");
  const privateKey = useRef<CryptoKey | null>(null);
  const counter = useRef(0);
  const queuedMessage = useRef<Message | null>(null);

  const [ws, setWS] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState("");
  const [userID, setUserID] = useState("");
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [messageList, setMessageList] = useState<Message[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [recipient, setRecipient] = useState("public_chat");

  const onlineUsersRef = useRef<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

  useEffect(() => {
    if (retryAttempts === 0) return;
    console.log("Retry attempts:", retryAttempts);

    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected.");
      ws.close();
    }
    // ws = new WebSocket(`ws://${window.location.host}`);
    setWS(new WebSocket(`ws://localhost:3000/`));
  }, [retryAttempts]);

  useEffect(() => {
    if (!ws) {
      if (retryAttempts > 0)
        console.error("WebSocket connection not established.");
      return;
    }
    ws.onopen = async () => {
      console.log("WebSocket connection opened.");
      await generateKeyPair();
      setRetryAttempts(0);

      const helloMessage = {
        type: "hello",
        public_key: publicKey.current,
        from: username,
      };
      ws.send(JSON.stringify(await signData(helloMessage)));

      // document.getElementById('forward-file').addEventListener('click', () => {
      //   const modal = document.getElementById('forward-modal');
      //   const forwardList = document.getElementById('forward-user-list');

      //   // Clear the previous user list
      //   forwardList.innerHTML = '';

      //   // Populate the online user list, excluding the current user and ignoring undefined or empty users
      //   onlineUsersRef.forEach(user => {
      //     if (user !== username && user && user.trim() !== 'undefined') {
      //       const option = document.createElement('option');
      //       option.value = user;
      //       option.textContent = user;
      //       forwardList.appendChild(option);
      //     }
      //   });

      //   // Show the modal to select the user for forwarding
      //   modal.style.display = 'block';
      // });

      // Forwarding the selected message to the chosen user
      // document.getElementById('forward-btn').addEventListener('click', () => {
      //   const selectedUser = document.getElementById('forward-user-list').value;

      //   selectedMessages.forEach(message => {
      //     // Forwarding the message to the selected user
      //     ws.send(JSON.stringify({
      //       type: 'forwardMessage',
      //       data: {
      //         originalMessage: message,
      //         forwardTo: selectedUser
      //       }
      //     }));

      //     // Display the message in the chatbox as a forwarded message
      //     displayMessage('You (Forwarded)', message);
      //   });

      //   // Hide the modal after forwarding
      //   document.getElementById('forward-modal').style.display = 'none';
      //   selectedMessages = []; // Clear selected messageList
      // });
    };

    ws.onmessage = (event) => {
      const parsedMessage = JSON.parse(event.data);
      console.log("Received WebSocket message:", parsedMessage);

      if (parsedMessage.type === "client_update") {
        addOnlineUser(
          parsedMessage.clients.map(
            (client: Client) =>
              new User(
                client["client-id"],
                client["public-key"],
                client["username"]
              )
          )
        );
      } else if (parsedMessage.type === "chat") {
        // try {
        //   varifyChat(parsedMessage.chat);
        //   console.log('Received chat message:', parsedMessage.chat);
        //   console.log('Received symm_keys:', parsedMessage.symm_keys);
        //   console.log('Received iv:', parsedMessage.iv);
        //   const decryptedMessage = decryptWithAES(parsedMessage.chat, parsedMessage.symm_keys[0], parsedMessage.iv);
        //   console.log(decryptedMessage);
        //   console.log('Received chat message:', decryptedMessage);
        //   updateUsers(decryptedMessage);
        // } catch (error) {
        //   console.error("Error decrypting message:", error);
        // }
        // } else if (parsedMessage.type === "publicKey") {
        //   serverPublicKeyPem = parsedMessage.key; // Set the public key
      } else if (parsedMessage.type === "fileTransfer") {
        if (parsedMessage.fileName && parsedMessage.from) {
          const messageId = `${parsedMessage.from}-${parsedMessage.fileName}`;
          if (parsedMessage.from !== username) {
            processedFileMessages.push(messageId);
            console.log("Received file with id: ", messageId);
            setMessageList((prev) => [
              ...prev,
              new Message(
                new User(parsedMessage.from, ""),
                parsedMessage.fileName,
                parsedMessage.fileLink
              ),
            ]);
          }
        }
      } else if (parsedMessage.type === "signed_data") {
        console.log("Received a signed data");
        const data = parsedMessage.data;
        if (data.type === "public_chat") {
          setMessageList((prev) => [
            ...prev,
            new Message(
              onlineUsersRef.current.find(
                (user) => user.publicKey === data.sender
              ) ?? new User("Unknown"),
              data.message,
              new User("public_chat")
            ), // the group chat need to be changed
          ]);
        }
      } else if (parsedMessage.type === "client_list") {
        if (!queuedMessage.current) return;
        const recipientInfo = parsedMessage.servers
          .flatMap((server: any) => server.clients)
          .find(
            (client: any) =>
              client["client-id"] === queuedMessage.current!.recipient.id
          );

        if (!recipientInfo)
          return console.error(
            "Recipient not found on any server.",
            queuedMessage.current.recipient
          );

        if (!queuedMessage.current.recipient.publicKey)
          queuedMessage.current.recipient.publicKey =
            recipientInfo["public-key"];
        const recipientServer = parsedMessage.servers.find((server: any) =>
          server.clients.some(
            (client: any) =>
              client["client-id"] === queuedMessage.current!.recipient.id
          )
        )?.address; // Get the server address of the recipient

        if (!recipientServer)
          return console.error(
            "Recipient not found on any server.",
            queuedMessage.current.recipient
          );
        sendPrivateMessage(queuedMessage.current, recipientServer);
      } else if (parsedMessage.type === "disconnect") {
        setOnlineUsers((prev) =>
          prev.map((user) =>
            user.id === parsedMessage.userID
              ? { ...user, isOnline: false }
              : user
          )
        );
      }

      if (ws) {
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          // alert("Closing connection");
          // setTimeout(() => setRetryAttempts((prev) => prev + 1), 2000);
        };
      }
    };

    return () => {
      ws?.close();
    };
  }, [ws]);
  //#endregion

  //#region Functions
  const sendPrivateMessage = async (
    message: Message,
    recipientServer: string
  ) => {
    if (!ws || !aesKey || !iv) {
      console.error("WebSocket or AES key/IV not initialized.");
      return;
    }

    const recipient = onlineUsers.find(
      (user) => user.id === message.recipient.id
    );
    if (!recipient || !recipient.publicKey) {
      console.error("Recipient not found or lacks a public key.");
      return;
    }

    const recipientPublicKey = await importRSAPublicKey(recipient.publicKey);

    const encryptedMessage = await encryptAES(message, aesKey, iv);

    const encryptedAesKey = await encryptAESKeyWithRSA(
      aesKey,
      recipientPublicKey
    );

    const privateMessage = await signData({
      type: "chat",
      destination_servers: [recipientServer], // Server to which the recipient is connected
      iv: iv.toString("base64"), // Base64 encoded IV
      symm_keys: [encryptedAESKey], // AES key encrypted with the recipient's public RSA key
      chat: encryptedMessage, // Base64 encoded AES encrypted message
      client_info: {
        "client-id": userID, // Your client ID
        "server-id": server.address().address, // Your server's address
      },
      time_to_die: new Date(Date.now() + 60000).toISOString(), // Message expires in 1 minute
    });

    ws.send(JSON.stringify(privateMessage));
  };

  // Helper function to sign the message (using RSA-PSS and SHA-256)
  async function signMessage(message: string, counter: number) {
    const dataToSign = JSON.stringify({ message, counter });
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToSign);
    const signature = await window.crypto.subtle.sign(
      { name: "RSA-PSS", saltLength: 32 },
      privateKey.current!, // Your private key
      data
    );
    return btoa(String.fromCharCode(...Array.from(new Uint8Array(signature))));
  }

  const sendFile = (fileName: string, recipient: string, fileLink: string) => {
    ws?.send(
      JSON.stringify({
        type: "fileTransfer",
        fileName,
        from: userID,
        to: recipient,
        timestamp: new Date().toISOString(),
        fileLink,
      })
    );

    setMessageList((prev) => [
      ...prev,
      new Message(
        new User(userID, publicKey.current, username),
        fileName,
        new User(recipient),
        fileLink
      ),
    ]);
  };

  const setOffline = () => {
    if (!ws) return;
    toast.success("Disconnected");
    ws.send(JSON.stringify({ type: "disconnect", userID: userID }));
  };

  const signData = async (data: any) => {
    return {
      type: "signed_data",
      data: data,
      counter: counter.current++,
      signature: await SignMessage(data, counter.current, privateKey.current!),
    };
  };

  const computeFingerprint = async () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKey.current);
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    return btoa(
      String.fromCharCode.apply(null, Array.from(new Uint8Array(hash)))
    );
  };

  const generateKeyPair = async () => {
    if (!ws) {
      console.error("WebSocket connection not established.");
      return;
    }

    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: "SHA-256" },
      },
      true,
      ["sign", "verify"]
    );
    const publicKeyTem = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    const publicKeyBase64 = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(publicKeyTem)))
    );

    publicKey.current = publicKeyBase64;
    privateKey.current = keyPair.privateKey;
    if (!username) setUsername("Anonymous");

    setUserID(await computeFingerprint());
  };

  const sendMessage = async (message: string, recipient: string) => {
    if (!ws) {
      console.error("WebSocket connection not established.");
      return;
    }

    if (recipient === "public_chat") {
      const messageData = {
        type: "public_chat",
        message: message,
        sender: publicKey.current,
        from: username,
      };
      ws.send(JSON.stringify(await signData(messageData)));
      console.log("mesage sent");
    } else {
      queuedMessage.current = new Message(
        new User(userID, publicKey.current, username),
        message,
        onlineUsers.find((user) => user.id === recipient) ?? new User(recipient)
      );
      console.log("private message queued");
      ws.send(
        JSON.stringify({
          type: "client_list_request",
        })
      );
    }
  };

  const addOnlineUser = (user: User[]) => {
    const allUsers = [...onlineUsersRef.current];
    user.forEach((addUser) => {
      if (allUsers.some((u) => u.publicKey === addUser.publicKey)) {
        const index = onlineUsersRef.current.findIndex(
          (u) => u.publicKey === addUser.publicKey
        );
        allUsers[index].id = addUser.id;
        allUsers[index].username = addUser.username ?? addUser.id;

        if (allUsers[index].publicKey === publicKey.current)
          setUsername(allUsers[index].username);
      } else allUsers.push(addUser);
    });
    console.log("Online users:", allUsers);
    setOnlineUsers(allUsers);
  };

  const handleForward = () => {
    setShowForwardModal(true);
  };

  const onLogin = (username: string) => {
    setUsername(username);
    setRetryAttempts(1);
  };
  //#endregion

  //#region Render
  return (
    <div className="container mx-auto p-4 min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        {privateKey.current ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row h-[calc(100vh-2rem)] gap-4"
          >
            <Sidebar onlineUsers={onlineUsers} setRecipient={setRecipient} />
            <Chatbox
              messageList={messageList}
              sendMessage={sendMessage}
              username={username}
              userID={userID}
              setOffline={setOffline}
              sendFile={sendFile}
              recipient={recipient}
            />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <LoginContainer onLogin={onLogin} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showForwardModal && (
          <ForwardModal
            onlineUsers={onlineUsers}
            onClose={() => setShowForwardModal(false)}
            onForward={(user) => {
              console.log(`Forwarding to ${user}`);
              setShowForwardModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
