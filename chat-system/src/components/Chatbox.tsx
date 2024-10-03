import { useState } from 'react';

interface ChatboxProps {
    // username?: string;
    onForward: () => void;
}

export default function Chatbox({ onForward }: ChatboxProps) {
    const [message, setMessage] = useState('');
    const [recipient, setRecipient] = useState('group');

    const handleSendMessage = () => {
        console.log(`Sending message: ${message} to ${recipient}`);
        setMessage('');
    };

    const handleSendFile = () => {
        console.log('Sending file');
    };

    return (
        <div className="w-3/4 bg-white p-4">
            <div className="h-96 bg-gray-200 mb-4 overflow-y-auto" id="chat-messages"></div>
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow p-2 border rounded"
                />
                <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="p-2 border rounded"
                >
                    <option value="group">Group Chat</option>
                </select>
                <button onClick={handleSendMessage} className="p-2 bg-blue-500 text-white rounded">
                    Send
                </button>
                <input type="file" id="file-input" className="hidden" />
                <button onClick={handleSendFile} className="p-2 bg-green-500 text-white rounded">
                    Send File
                </button>
                <button onClick={onForward} className="p-2 bg-yellow-500 text-white rounded">
                    Forward
                </button>
            </div>
        </div>
    );
}