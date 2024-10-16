import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { User } from "@/app/page";
import { toast } from "sonner";

interface SidebarProps {
  onlineUsers: User[];
  setRecipient: (recipient: string) => void;
}

export default function Sidebar({ onlineUsers, setRecipient }: SidebarProps) {
  const copyToClipboard = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Public key copied to clipboard");
      })
      .catch((err) => {
        toast.error("Failed to copy: ", err);
        console.error("Failed to copy: ", err);
      });
  };

  return (
    <Card className="w-full md:w-1/3 lg:w-1/4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Online onlineUsers:
        </CardTitle>
        <CardTitle className="text-sm font-thin text-gray-400">
          Please click the below name to chat with
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <Button
            variant="link"
            className="text-xl pb-8 underline"
            value={"public_chat"}
            onClick={() => setRecipient("public_chat")}
          >
            Go To public_chat
          </Button>
          <ul className="space-y-4">
            {onlineUsers.map((user) => {
              const username = user.username ?? user.id;
              // console.log("username", username);
              return (
                <li
                  key={user.publicKey}
                  className="flex items-center space-x-4"
                >
                  <Avatar>
                    <AvatarImage
                      src={`https://api.dicebear.com/6.x/initials/svg?seed=${username}`}
                      alt={username}
                    />
                    <AvatarFallback>
                      {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <HoverCard>
                    <HoverCardTrigger>
                      <Button
                        variant="link"
                        // className={`${user.isOffline && "text-gray-500"}`}
                        value={user.id}
                        onClick={() => setRecipient(user.id)}
                      >
                        {username}
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="rounded-xl w-100">
                      <p>ID: {user.id}</p>
                      <br />
                      <p>PublicKey: {user.publicKey?.slice(0, 30)}...</p>
                      <Button
                        onClick={() => copyToClipboard(user.publicKey)}
                        className="bg-slate-400 mt-4"
                      >
                        Copy PublicKey
                      </Button>
                    </HoverCardContent>
                  </HoverCard>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}