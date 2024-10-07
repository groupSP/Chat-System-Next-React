from flask import Flask, render_template
from flask_socketio import SocketIO, send, emit

# Initialize the Flask app and Flask-SocketIO
app = Flask(__name__)
socketio = SocketIO(app)

# Route to serve the HTML page
@app.route('/')
def index():
    return render_template('index.html')

# WebSocket event handler for 'message'
@socketio.on('message')
def handle_message(message):
    print(f"Received message: {message}")
    send("Message received: " + message)
    emit('message', "Message received: " + message)

# WebSocket event handler for custom events
@socketio.on('custom_event')
def handle_custom_event(json):
    print(f"Received custom event: {json}")
    emit('response', {'data': 'Response from server'})

if __name__ == "__main__":
    # Use 'eventlet' or 'gevent' as the async_mode for WebSocket handling
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
