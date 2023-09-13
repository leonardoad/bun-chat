Bun.serve({
    port: 3000,
    fetch() {
        return new Response(Bun.file('./src/index.html'))
    }
})

type Message = {
    username: string
    text: string
}

const users: string[] = []
const messages: Message[] = []


const server = Bun.serve({
    port: 3001,
    fetch(req: Request, server: Server) {
        //upgrade the request to a web socket
        const success = server.upgrade(req, {
            //set user name to a random number
            data: { username: "user_" + Math.random().toString(36).substring(7) }
        })

        return success ? undefined : new Response("Failed to upgrade to web socket", { status: 500 })
    },
    websocket: {
        open(ws: Bun.WebSocket) {
            //store the user name
            users.push(ws.data.username)

            ws.subscribe('chat')
            //publish the new user
            server.publish("chat", JSON.stringify({
                type: "ADD_USER", data: ws.data.username
            }))
            
            //send message to the newly connected containing existing users and messages
            ws.send(JSON.stringify({ type: "USERS_SET", data: users }))
            ws.send(JSON.stringify({ type: "MESSAGES_SET", data: messages }))
            server.publish("chat", JSON.stringify({
                type: "MESSAGES_ADD", data: { username: "Server", text: "Give a warm welcome to " + ws.data.username }
            }))


        },
        message(ws: Bun.WebSocket, data) {
            const message = JSON.parse(data)

            message.username = ws.data.username
            //store the message
            messages.push(message)
            //publish the message
            server.publish("chat", JSON.stringify({
                type: "MESSAGES_ADD", data: message
            }))
        },
        close(ws: Bun.WebSocket) {
            //remove the user
            users.splice(users.indexOf(ws.data.username), 1)

            //publish the user left
            server.publish("chat", JSON.stringify({
                type: "USERS_REMOVE", data: ws.data.username
            }))
        }
    }
})

