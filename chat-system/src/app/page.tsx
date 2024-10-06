"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Chatbox from "@/components/Chatbox";
import LoginContainer from "@/components/LoginContainer";
import ForwardModal from "@/components/ForwardModal";
import { AnimatePresence, motion } from "framer-motion";

export class User {
  id: string;
  publicKey: string;
  username?: string;

  constructor(id: string, publicKey: string, username?: string) {
    this.id = id;
    this.publicKey = publicKey;
    this.username = username;
  }
}

export class Message {
  sender: User;
  content: string;
  fileLink?: string;

  constructor(sender: User, content: string, fileLink?: string) {
    this.sender = sender;
    this.content = content;
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

export default function ChatSystem() {
  const ws = useRef<WebSocket | null>(null);
  const publicKey = useRef("");
  const privateKey = useRef<CryptoKey | null>(null);

  const [username, setUsername] = useState("");
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);

  useEffect(() => {
    console.log("Retry attempts:", retryAttempts);
    if (retryAttempts === 0) return;

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected.");
      ws.current.close();
    }

    // ws.current = new WebSocket(`ws://${window.location.host}`);
    ws.current = new WebSocket(`ws://localhost:3000/`);

    ws.current.onopen = async () => {
      console.log("WebSocket connection opened.");
      await generateKeyPair();
      setRetryAttempts(0);

      if (ws.current) {
        console.log("onmessage event inside the open is added.");
        ws.current.onmessage = async (event) => {
          console.log("Received WebSocket message:", event.data);
        };
      }

      // document.getElementById('forward-file').addEventListener('click', () => {
      //   const modal = document.getElementById('forward-modal');
      //   const forwardList = document.getElementById('forward-user-list');

      //   // Clear the previous user list
      //   forwardList.innerHTML = '';

      //   // Populate the online user list, excluding the current user and ignoring undefined or empty users
      //   onlineUsers.forEach(user => {
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
      //     ws.current.send(JSON.stringify({
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
      //   selectedMessages = []; // Clear selected messages
      // });
    };

    if (!ws.current) {
      console.log("WebSocket is not yet established.");
      return;
    }
    console.log("onmessage event listener added");
    ws.current.onmessage = (event) => {
      console.log("Received WebSocket message:");
      const parsedMessage = JSON.parse(event.data);
      console.log(parsedMessage);

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
            setMessages((prev) => [
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
        const data = parsedMessage.data;
        if (data.type === "public_chat") {
          console.log("Received public chat message:", parsedMessage.message);
          setMessages((prev) => [
            ...prev,
            new Message(new User("Group Chat", ""), parsedMessage.message),
          ]);
        }
      }

      if (ws.current) {
        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.current.onclose = () => {
          console.log("WebSocket connection closed");
          // setTimeout(() => setRetryAttempts((prev) => prev + 1), 2000);
        };
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [retryAttempts]);

  //#region Functions
  const generateKeyPair = async () => {
    if (!ws.current) {
      console.error("WebSocket connection not established.");
      return;
    }

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
    const helloMessage = {
      data: {
        type: "hello",
        public_key: publicKeyBase64,
        from: username,
      },
    };

    ws.current.send(JSON.stringify(helloMessage));

    privateKey.current = keyPair.privateKey;
    publicKey.current = publicKeyBase64;
  };

  const addOnlineUser = (user: User[]) => {
    const allUsers = [...onlineUsers];
    user.forEach((addUser) => {
      if (allUsers.some((u) => u.publicKey === addUser.publicKey)) {
        const index = onlineUsers.findIndex(
          (u) => u.publicKey === addUser.publicKey
        );
        allUsers[index].id = addUser.id;
        allUsers[index].username = addUser.username;
      } else allUsers.push(addUser);
    });
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
        {username ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row h-[calc(100vh-2rem)] gap-4"
          >
            <Sidebar onlineUsers={onlineUsers} />
            <Chatbox messages={messages} />
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
