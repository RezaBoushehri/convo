const users = [];
// Function to add a user
const addUser = (username, handle, room) => {
    const existingUser = users.find((user) => user.username === username);
    
    if (existingUser) {
        // Update user if they already exist
        existingUser.room = room;
    } else {
        users.push({
            username: username,
            name: handle,
            room: room,
        });
    }
};


const getUsers = () => {
    return users;
};
// Function to delete a user
const deleteUser = (username) => {
    const index = users.findIndex((user) => user.username === username);

    if (index !== -1) {
        const user = users[index];
        users.splice(index, 1);
        return user;
    }
    return null;
};


const updateUserSocketId = async (username, socketId) => {
    try {
        const user = await User.findOneAndUpdate(
            { username: username },
            { socketId: socketId },
            { new: true } // Return the updated user
        );
        if (user) {
            console.log(`Updated socketId for user ${username}: ${socketId}`);
        } else {
            console.log(`User ${username} not found in the database`);
        }
    } catch (error) {
        console.error("Error updating socketId in database:", error);
    }
};
const getRoomUsers = (room) => {
    return users.filter((user) => user.room.roomName === room);
};
module.exports = { addUser, getUsers, deleteUser, getRoomUsers , updateUserSocketId };
