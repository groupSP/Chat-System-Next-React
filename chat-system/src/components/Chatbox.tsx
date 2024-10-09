import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, FileUp, Forward, Unplug } from "lucide-react";
import { Message, User } from "@/app/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axios from "axios";

interface ChatboxProps {
  // onForward: () => void;
  messageList: Message[];
  sendMessage: (message: string, recipient: string) => void;
  username: string;
  userID: string;
  onlineUsers: User[];
  setOffline: () => void;
  sendFile: (fileName: string, recipient: string, fileLink: string) => void;
}

interface UploadResponse {
  file_url: string;
}

export default function Chatbox({
  messageList,
  sendMessage,
  username,
  userID,
  onlineUsers,
  setOffline,
  sendFile,
}: ChatboxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("public_chat");

  const handleSendMessage = () => {
    console.log(`Sending message to ${recipient}: ${message}`);
    sendMessage(message, recipient);
    setMessage("");
  };

  const handleSendFile = async () => {
    const file = fileInputRef.current?.files?.[0];
    console.log("Sending file:", file?.name);
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file as Blob);

    try {
      const response = await axios.post<UploadResponse>(
        "/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200 && response.data)
        sendFile(file.name, recipient, response.data.file_url);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 413) {
        console.error("File size too large.");
      } else {
        console.error("File upload failed:", error);
      }
    }
  };

  return (
    <Card className="w-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-thin pb-1">username: {username}</CardTitle>
        <CardTitle className="font-thin pb-4">userID: {userID}</CardTitle>
        <CardTitle>
          <Button className="rounded-3xl bg-slate-400" onClick={setOffline}>
            <Unplug className="mr-2 h-4 w-4" /> Disconnect
          </Button>
        </CardTitle>
        <CardTitle className="text-2xl font-bold pt-4">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div id="chat-messageList" className="space-y-4">
            <ul className="space-y-4">
              {messageList.map((message, index) => (
                <li
                  key={index}
                  className={`flex items-start space-x-4 pb-3 border border-gray-200 rounded-2xl p-4 ${
                    message.sender.id === userID
                      ? "bg-green-200"
                      : "bg-slate-100"
                  }`}
                >
                  <div className="flex-shrink-0">
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/6.x/initials/svg?seed=${message.displayName()}`}
                        alt={message.displayName()}
                      />
                      <AvatarFallback>{message.displayName()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-500 text-sm">
                        {message.displayName()}
                      </span>
                      <span className="font-sans mt-1">{message.content}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="flex space-x-2 w-full">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
          />
          <Select value={recipient} onValueChange={setRecipient}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select recipient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public_chat">Group Chat</SelectItem>
              {onlineUsers.map((user) => (
                <SelectItem key={user.publicKey} value={user.id}>
                  {user.username ?? user.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSendMessage}>
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
          <Input type="file" id="file-input" ref={fileInputRef} />
          <Button variant="secondary" onClick={handleSendFile}>
            <FileUp className="mr-2 h-4 w-4" /> Send File
          </Button>
          {/* <Button variant="outline" onClick={onForward}>
                        <Forward className="mr-2 h-4 w-4" /> Forward
                    </Button> */}
        </div>
      </CardFooter>
    </Card>
  );
}
