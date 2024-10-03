import { useState } from 'react';

interface ForwardModalProps {
    onlineUsers: string[];
    onClose: () => void;
    onForward: (user: string) => void;
}

export default function ForwardModal({ onlineUsers, onClose, onForward }: ForwardModalProps) {
    const [selectedUser, setSelectedUser] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded">
                <h4 className="text-xl font-bold mb-4">Select User to Forward Message</h4>
                <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="p-2 border rounded mb-2 w-full"
                >
                    <option value="">Select a user</option>
                    {onlineUsers.map((user) => (
                        <option key={user} value={user}>
                            {user}
                        </option>
                    ))}
                </select>
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => onForward(selectedUser)}
                        className="p-2 bg-blue-500 text-white rounded"
                        disabled={!selectedUser}
                    >
                        Forward
                    </button>
                    <button onClick={onClose} className="p-2 bg-gray-300 rounded">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}