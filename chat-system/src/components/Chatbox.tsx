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
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ChatboxProps {
  // onForward: () => void;
  messageList: Message[];
  sendMessage: (message: string, recipient: string) => void;
  username: string;
  userID: string;
  setOffline: () => void;
  sendFile: (fileName: string, recipient: string, fileLink: string) => void;
  recipient: string;
  onlineUsers: User[];
}

interface UploadResponse {
  file_url: string;
}

export default function Chatbox({
  messageList,
  sendMessage,
  username,
  userID,
  setOffline,
  sendFile,
  recipient,
  onlineUsers,
}: ChatboxProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageToSend, setMessageToSend] = useState("");

  const handleSendMessage = (
    msg: string = messageToSend,
    reci: string = recipient
  ) => {
    console.log(`Sending message to ${reci}: ${msg}`);
    sendMessage(msg, reci);
    setMessageToSend("");
  };

  const handleSendFile = async () => {
    const file = fileInputRef.current?.files?.[0];
    console.log("Sending file:", file?.name);
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file as Blob);

    try {
      const response = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200 && response.data) {
        sendFile(file.name, recipient, response.data.fileLink);
        toast.success(response.data.message);
      }
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
        {/* <CardTitle>
          <Button className="rounded-3xl bg-slate-400" onClick={setOffline}>
            <Unplug className="mr-2 h-4 w-4" /> Go offline
          </Button>
        </CardTitle> */}
        <CardTitle className="text-xl font-thin pt-4 text-slate-400">
          You are now chatting with:
        </CardTitle>
        <CardTitle className="text-2xl font-bold text-green-100">
          {recipient}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div id="chat-messageList" className="space-y-4">
            <ul className="space-y-4">
              {messageList.map(
                (message, index) =>
                  message.recipient.id === recipient && (
                    <li key={index}>
                      <ContextMenu>
                        <ContextMenuTrigger
                          className={`flex items-start space-x-4 pb-3 border border-gray-200 rounded-2xl p-4 ${
                            message.sender.id === userID
                              ? "bg-green-800"
                              : "bg-slate-100"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <Avatar>
                              <AvatarImage
                                src={`https://api.dicebear.com/6.x/initials/svg?seed=${message.displayName()}`}
                                alt={message.displayName()}
                              />
                              <AvatarFallback>
                                {message.displayName()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-grow">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-500 text-sm">
                                {message.displayName()}
                              </span>
                              <span className="font-sans mt-1 break-all">
                                {message.content.replace(
                                  `[${userID.slice(0, 5)}]`,
                                  "[You]"
                                )}
                                {message.fileLink && (
                                  <a
                                    href={message.fileLink}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    → Click here to Download
                                  </a>
                                )}
                              </span>
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuSub>
                            <ContextMenuSubTrigger>
                              Forward to
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-48">
                              {onlineUsers.map((user) => (
                                <ContextMenuItem
                                  key={user.id}
                                  onClick={() =>
                                    sendMessage(
                                      `[${userID.slice(
                                        0,
                                        5
                                      )}] Forwarded a message that sent by [${message
                                        .displayName()
                                        .slice(0, 5)}]: ${message.content}`,
                                      user.id
                                    )
                                  }
                                >
                                  {user.username ?? user.id}
                                </ContextMenuItem>
                              ))}
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                        </ContextMenuContent>
                      </ContextMenu>
                    </li>
                  )
              )}
            </ul>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <div className="flex space-x-2 w-full">
          <Input
            type="text"
            value={messageToSend}
            onChange={(e) => setMessageToSend(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
          />
          {/* <Select value={recipient} onValueChange={setRecipient}>
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
          </Select> */}
          <Button onClick={() => handleSendMessage()}>
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
