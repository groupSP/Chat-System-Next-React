"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Chatbox from "@/components/Chatbox";
import LoginContainer from "@/components/LoginContainer";
import ForwardModal from "@/components/ForwardModal";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

// Import cryptographic functions
import {
  generateAESKey,
  encryptAES,
  encryptAESKeyWithRSA,
  importRSAPublicKey,
  signData,
  verifySignature,
  decryptAES,
  generateRandomBytes,
  generateEncryptionKeyPair,
  generateSigningKeyPair
} from "@/utils/crypto";

// State Variables
const encryptionPrivateKey = useRef<CryptoKey | null>(null);
const encryptionPublicKey = useRef<CryptoKey | null>(null);
const signingPrivateKey = useRef<CryptoKey | null>(null);
const signingPublicKey = useRef<CryptoKey | null>(null);

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

  constructor(sender: User, content: string, recipient: User, fileLink?: string) {
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

// Counter for messages to prevent replay attacks
let messageCounter = 0;

export default function ChatSystem() {
  const publicKey = useRef("");
  const privateKey = useRef<CryptoKey | null>(null);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [iv, setIv] = useState<Uint8Array | null>(null);

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
      await generateKeyPairs();
      setRetryAttempts(0);

      const helloMessage = {
        type: "hello",
        public_key: publicKey.current,
        from: username,
      };
      ws.send(JSON.stringify(await signData(helloMessage, messageCounter++, signingPrivateKey.current!)));

      // Optionally, request client list upon connection
      requestClientList();
    };

    ws.onmessage = async (event) => {
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
        // Handle private chat message
        const { chat, symm_keys, iv: ivBase64, client_info } = parsedMessage;

        // Decrypt AES key
        if (!encryptionPrivateKey.current) {
          console.error("Private key not available for decryption.");
          return;
        }

        const decryptedAesKey = await decryptAESKeyWithRSA(symm_keys[0], encryptionPrivateKey.current);

        // Convert iv from Base64
        const ivArray = base64ToUint8Array(ivBase64);

        // Decrypt the message
        const decryptedMessage = await decryptAES(chat, decryptedAesKey, ivArray);

        // Find the sender's user information
        const sender = onlineUsersRef.current.find(user => user.id === client_info["client-id"]) ?? new User("Unknown");

        // Add the message to the message list
        setMessageList((prev) => [
          ...prev,
          new Message(
            sender,
            decryptedMessage,
            new User(client_info["client-id"])
          ),
        ]);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setTimeout(() => setRetryAttempts((prev) => prev + 1), 2000);
    };

    return () => {
      ws?.close();
    };
  }, [ws]);

  const requestClientList = () => {
    if (!ws) return;
    const clientListRequest = {
      type: "client_list_request",
    };
    ws.send(JSON.stringify(clientListRequest));
  };

  const sendPrivateMessage = async (message: string, recipientId: string) => {
    if (!ws || !aesKey || !iv) {
      console.error("WebSocket or AES key/IV not initialized.");
      return;
    }

    const recipient = onlineUsers.find(user => user.id === recipientId);
    if (!recipient || !recipient.publicKey) {
      console.error("Recipient not found or lacks a public key.");
      return;
    }

    const recipientPublicKey = await importRSAPublicKey(recipient.publicKey);

    const encryptedMessage = await encryptAES(message, aesKey, iv);

    const encryptedAesKey = await encryptAESKeyWithRSA(aesKey, recipientPublicKey);

    const privateMessage = {
      type: "signed_data",
      data: {
        type: "chat",
        destination_servers: ["ws://localhost:3000"],
        iv: arrayBufferToBase64(iv.buffer),
        symm_keys: [encryptedAesKey],
        chat: encryptedMessage,
        client_info: {
          "client-id": userID,
          "server-id": "ws://localhost:3000",
        },
        time_to_die: new Date(Date.now() + 60000).toISOString(),
      },
      counter: messageCounter++,
      signature: await signData(message, messageCounter, signingPrivateKey.current!),
    };

    ws.send(JSON.stringify(privateMessage));

    setMessageList((prev) => [
      ...prev,
      new Message(
        new User(userID, publicKey.current, username),
        message,
        new User(recipientId)
      ),
    ]);
  };

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

  const onLogin = (username: string) => {
    setUsername(username);
    setRetryAttempts(1);
  };

  const sendMessage = async (message: string, recipient: string) => {
    if (recipient === "public_chat") {
      const publicMessage = {
        type: "signed_data",
        data: {
          type: "public_chat",
          sender: publicKey.current,
          message: message,
        },
        counter: messageCounter++,
        signature: await signData(message, messageCounter, signingPrivateKey.current!),
      };
      ws?.send(JSON.stringify(publicMessage));
      console.log("Public message sent");
    } else {
      await sendPrivateMessage(message, recipient);
    }
  };

  const addOnlineUser = (users: User[]) => {
    const allUsers = [...onlineUsersRef.current];
    users.forEach((addUser) => {
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
    setOnlineUsers(allUsers);
  };

  const generateKeyPairs = async () => {
    const encryptionKeyPair = await generateEncryptionKeyPair(); // RSA-OAEP key pair
    const signingKeyPair = await generateSigningKeyPair(); // RSA-PSS key pair

    encryptionPrivateKey.current = encryptionKeyPair.privateKey;
    encryptionPublicKey.current = encryptionKeyPair.publicKey;

    signingPrivateKey.current = signingKeyPair.privateKey;
    signingPublicKey.current = signingKeyPair.publicKey;

    const generatedAesKey = await generateAESKey();
    setAesKey(generatedAesKey);

    const generatedIv = await generateRandomBytes(16); // 16 bytes IV for AES-GCM
    setIv(generatedIv);

    if (!username) setUsername("Anonymous");

    const encoder = new TextEncoder();
    const data = encoder.encode(publicKey.current);
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    const fingerprint = arrayBufferToBase64(hash);
    setUserID(fingerprint);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        {encryptionPrivateKey.current ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row h-[calc(100vh-2rem)] gap-4"
          >
            <Sidebar
              onlineUsers={onlineUsers}
              setRecipient={setRecipient}
            />
            <Chatbox
              messageList={messageList}
              sendMessage={sendMessage}
              username={username}
              userID={userID}
              setOffline={() => {
                if (!ws) return;
                toast.success("Disconnected");
                ws.send(JSON.stringify({ type: "disconnect", userID: userID }));
              }}
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

// Helper functions for Base64 conversions
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

async function decryptAESKeyWithRSA(encryptedAESKey: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    base64ToArrayBuffer(encryptedAESKey)
  );

  return window.crypto.subtle.importKey(
    "raw",
    decryptedAesKeyBuffer,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
