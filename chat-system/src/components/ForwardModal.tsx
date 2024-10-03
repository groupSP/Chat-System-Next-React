import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

interface ForwardModalProps {
    onlineUsers: string[];
    onClose: () => void;
    onForward: (user: string) => void;
}

export default function ForwardModal({ onlineUsers, onClose, onForward }: ForwardModalProps) {
    const [selectedUser, setSelectedUser] = useState('');

    return (
        <AnimatePresence>
            <Dialog open={true} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Forward Message</DialogTitle>
                    </DialogHeader>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                                {onlineUsers.map((user) => (
                                    <SelectItem key={user} value={user}>
                                        {user}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </motion.div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={() => onForward(selectedUser)} disabled={!selectedUser}>
                            Forward
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AnimatePresence>
    );
}