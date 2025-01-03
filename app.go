package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	socketio "github.com/googollee/go-socket.io"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client

func main() {
	// MongoDB connection URI
	mongoURI := "mongodb://chatAdmin:chatAdmin@127.0.0.1:27017/chatRoom?authSource=chatRoom"

	// Connect to MongoDB
	var err error
	client, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}

	// Ping the database to verify connection
	err = client.Ping(context.TODO(), nil)
	if err != nil {
		log.Fatal(err)
	}
	log.Println("MongoDB connected")

	// Initialize Socket.IO server
	server := socketio.NewServer(nil)

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		log.Println("connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "userLoggedIn", func(s socketio.Conn, data map[string]interface{}) {
		username := data["username"].(string)
		log.Printf("User %s logged in", username)
		updateUserSocketId(username, s.ID())
		s.Emit("applySettings", map[string]interface{}{"settings": "user settings"})
	})

	server.OnEvent("/", "createRoom", func(s socketio.Conn, data map[string]interface{}) {
		handle := data["handle"].(string)
		roomName := data["roomName"].(string)
		roomID := generateRoomID()
		log.Printf("Room %s created by %s", roomName, handle)
		s.Join(roomID)
		s.Emit("joined", map[string]interface{}{"roomID": roomID, "roomName": roomName})
		server.BroadcastToRoom("/", roomID, "newconnection", map[string]interface{}{"roomID": roomID, "handle": handle})
	})

	server.OnEvent("/", "joinRoom", func(s socketio.Conn, data map[string]interface{}) {
		roomID := data["roomID"].(string)
		username := data["username"].(string)
		log.Printf("User %s is trying to join room %s", username, roomID)
		s.Emit("applySettings", map[string]interface{}{"settings": "user settings"})
		s.Join(roomID)
		s.Emit("joined", map[string]interface{}{"roomID": roomID, "username": username})
		server.BroadcastToRoom("/", roomID, "userJoined", map[string]interface{}{"username": username, "roomID": roomID})
	})

	server.OnEvent("/", "requestOlderMessages", func(s socketio.Conn, data map[string]interface{}) {
		roomID := data["roomID"].(string)
		counter := int(data["counter"].(float64))
		msgType := data["type"].(string)
		log.Printf("Received request for %s messages: roomID=%s, counter=%d", msgType, roomID, counter)
		// Fetch older messages logic here
		s.Emit("restoreMessages", map[string]interface{}{"messages": []string{}, "prepend": true})
	})

	server.OnEvent("/", "chat", func(s socketio.Conn, data map[string]interface{}) {
		username := data["username"].(string)
		message := data["message"].(string)
		log.Printf("Message from %s: %s", username, message)
		s.Emit("chat", map[string]interface{}{"username": username, "message": message})
	})

	server.OnEvent("/", "addReaction", func(s socketio.Conn, data map[string]interface{}) {
		username := data["username"].(string)
		messageId := data["messageId"].(string)
		reaction := data["reaction"].(string)
		log.Printf("Reaction from %s on message %s: %s", username, messageId, reaction)
		s.Emit("reactionAdded", map[string]interface{}{"messageId": messageId, "username": username, "reaction": reaction})
	})

	server.OnEvent("/", "markMessagesRead", func(s socketio.Conn, data map[string]interface{}) {
		messageIds := data["messageIds"].([]interface{})
		username := data["username"].(string)
		log.Printf("Messages read by %s: %v", username, messageIds)
		s.Emit("messagesRead", map[string]interface{}{"messageIds": messageIds, "username": username})
	})

	server.OnEvent("/", "info", func(s socketio.Conn) {
		log.Println("Info requested")
		s.Emit("info", map[string]interface{}{"info": "some info"})
	})

	server.OnEvent("/", "typing", func(s socketio.Conn, data map[string]interface{}) {
		username := data["username"].(string)
		isTyping := data["isTyping"].(bool)
		log.Printf("%s is typing: %v", username, isTyping)
		s.Emit("typing", map[string]interface{}{"username": username, "isTyping": isTyping})
	})

	server.OnEvent("/", "saveSettings", func(s socketio.Conn, data map[string]interface{}) {
		username := data["username"].(string)
		settings := data["settings"].(string)
		log.Printf("Settings saved for %s: %s", username, settings)
		s.Emit("settingsSaved", map[string]interface{}{"username": username, "settings": settings})
	})

	server.OnEvent("/", "leaveRoom", func(s socketio.Conn, data map[string]interface{}) {
		username := data["username"].(string)
		roomID := data["roomID"].(string)
		log.Printf("%s left room %s", username, roomID)
		s.Leave(roomID)
		s.Emit("leftRoom", map[string]interface{}{"roomID": roomID})
		server.BroadcastToRoom("/", roomID, "userLeft", map[string]interface{}{"username": username, "roomID": roomID})
	})

	server.OnEvent("/", "disconnect", func(s socketio.Conn, reason string) {
		log.Printf("Disconnected: %s", reason)
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Println("closed", reason)
	})

	go server.Serve()
	defer server.Close()

	http.Handle("/socket.io/", server)
	log.Println("Serving at https://localhost:8080...")

	// Load server certificate and key
	cert, err := tls.LoadX509KeyPair("certificate.pem", "private-key.pem")
	if err != nil {
		log.Fatal("Failed to load server certificate and key:", err)
	}

	// Load CA certificate
	caCert, err := ioutil.ReadFile("ca-certificate.pem")
	if err != nil {
		log.Fatal("Failed to load CA certificate:", err)
	}
	caCertPool := x509.NewCertPool()
	caCertPool.AppendCertsFromPEM(caCert)

	// Configure TLS with passphrase
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		ClientCAs:    caCertPool,
		ClientAuth:   tls.RequireAndVerifyClientCert,
		MinVersion:   tls.VersionTLS12,
	}

	server1 := &http.Server{
		Addr:      ":8080",
		Handler:   nil,
		TLSConfig: tlsConfig,
	}

	err = server1.ListenAndServeTLS("certificate.pem", "private-key.pem")
	if err != nil {
		log.Fatal("ListenAndServeTLS: ", err)
	}
}

func generateRoomID() string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	roomID := make([]byte, 10)
	for i := range roomID {
		roomID[i] = alphabet[rand.Intn(len(alphabet))]
	}
	return string(roomID) + strconv.FormatInt(time.Now().Unix(), 36)
}

func updateUserSocketId(username, socketId string) {
	// Implement the logic to update the user's socket ID in the database
}
