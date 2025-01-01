package main

import (
    "context"
    "log"
    "math/rand"
    "net/http"
    "time"

    "github.com/gorilla/websocket"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type User struct {
	Username  string `bson:"username"`
	FirstName string `bson:"first_name"`
	LastName  string `bson:"last_name"`
}

type Room struct {
	RoomID   string   `bson:"roomID"`
	RoomName string   `bson:"roomName"`
	Admin    string   `bson:"admin"`
	Members  []string `bson:"members"`
}

var client *mongo.Client

func main() {
	http.HandleFunc("/ws", handleConnections)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()

	for {
		var msg map[string]interface{}
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Println("read:", err)
			break
		}

		switch msg["type"] {
		case "userLoggedIn":
			handleUserLoggedIn(ws, msg["data"].(map[string]interface{}))
		case "createRoom":
			handleCreateRoom(ws, msg["data"].(map[string]interface{}))
		}
	}
}

func handleUserLoggedIn(ws *websocket.Conn, data map[string]interface{}) {
	username := data["username"].(string)
	currentUser := getUserByUsername(username)

	if currentUser != nil {
		updateUserSocketID(currentUser, ws)
	} else {
		log.Println("User not found for socket ID:", ws.RemoteAddr())
	}
}

func handleCreateRoom(ws *websocket.Conn, data map[string]interface{}) {
	handle := data["handle"].(string)
	roomName := data["roomName"].(string)

	uniqueRoomID := generateRoomID()
	log.Println("Unique Room ID:", uniqueRoomID)

	for roomExists(uniqueRoomID) {
		uniqueRoomID = generateRoomID()
	}

	room := Room{
		RoomID:   uniqueRoomID,
		RoomName: roomName,
		Admin:    handle,
		Members:  []string{},
	}

	saveRoom(room)

	userRead := getUserByUsername(handle)
	responseData := map[string]interface{}{
		"name":   userRead.FirstName + " " + userRead.LastName,
		"handle": handle,
		"room":   room,
	}

	ws.WriteJSON(map[string]interface{}{"type": "joined", "data": responseData})
	broadcastToRoom(uniqueRoomID, map[string]interface{}{"type": "newconnection", "data": responseData})
}

func generateRoomID() string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	rand.Seed(time.Now().UnixNano())
	roomID := make([]byte, 10)
	for i := range roomID {
		roomID[i] = alphabet[rand.Intn(len(alphabet))]
	}
	return string(roomID) + time.Now().Format("20060102150405")
}

func roomExists(roomID string) bool {
	collection := client.Database("your_database").Collection("rooms")
	filter := bson.M{"roomID": roomID}
	count, err := collection.CountDocuments(context.Background(), filter)
	if err != nil {
		log.Fatal(err)
	}
	return count > 0
}

func saveRoom(room Room) {
	collection := client.Database("your_database").Collection("rooms")
	_, err := collection.InsertOne(context.Background(), room)
	if err != nil {
		log.Fatal(err)
	}
}

func getUserByUsername(username string) *User {
	collection := client.Database("your_database").Collection("users")
	filter := bson.M{"username": username}
	var user User
	err := collection.FindOne(context.Background(), filter).Decode(&user)
	if err != nil {
		return nil
	}
	return &user
}

func updateUserSocketID(user *User, ws *websocket.Conn) {
	// Implement the logic to update the user's socket ID
}

func broadcastToRoom(roomID string, message map[string]interface{}) {
	// Implement the logic to broadcast a message to all users in the room
}
