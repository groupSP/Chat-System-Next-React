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
    const [retryAttempts, setRetryAttempts] = useState(1);
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [showForwardModal, setShowForwardModal] = useState(false);

    useEffect(() => {
        if (retryAttempts === 0) return;

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log("WebSocket already connected.");
            ws.current.close();
        }
        console.log("Retry attempts:", retryAttempts);

        // ws.current = new WebSocket(`ws://${window.location.host}`);
        ws.current = new WebSocket(`ws://localhost:3000/`);
        generateKeyPair();

        ws.current.onopen = () => {
            setRetryAttempts(0);

        };

        ws.current.onmessage = (event) => {
            const parsedMessage = JSON.parse(event.data);
            console.log("Received WebSocket message:", parsedMessage);

            if (parsedMessage.type === "client_update") {
                setOnlineUsers((prev) => [
                    ...prev,
                    ...parsedMessage.clients.map(
                        (client: Client) =>
                            new User(
                                client["client-id"],
                                client["public-key"],
                                client["username"]
                            )
                    ),
                ]);
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
                ws.current.onclose = () => {
                    console.log("WebSocket connection closed");
                    // setTimeout(() => setRetryAttempts((prev) => prev + 1), 2000);
                };

                ws.current.onerror = (error) => {
                    console.error("WebSocket error:", error);
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
            parsedMessage: {
                type: "hello",
                public_key: publicKeyBase64,
            },
        };

        ws.current.send(JSON.stringify(helloMessage));

        privateKey.current = keyPair.privateKey;
        publicKey.current = publicKeyBase64;
    };

    const handleForward = () => {
        setShowForwardModal(true);
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
                        <LoginContainer onLogin={setUsername} />
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
