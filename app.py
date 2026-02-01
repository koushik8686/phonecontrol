import socket
from flask import Flask, request, send_from_directory, jsonify
from flask_cors import CORS

# --- Find your local IP address ---
def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Doesn't have to be reachable
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# This dictionary will store the latest sensor data in memory
# Updated structure to hold all metrics
latest_data = {
    "datapoints": 0,
    "interval": 0,
    "orientation": {"alpha": 0, "beta": 0, "gamma": 0},
    "acceleration": {"x": 0, "y": 0, "z": 0},
    "accelerationIncludingGravity": {"x": 0, "y": 0, "z": 0},
    "rotationRate": {"alpha": 0, "beta": 0, "gamma": 0},
}


# --- HTML Serving Routes ---
@app.route('/')
def index():
    return "hii"
    # return send_from_directory('static', 'index.html')

@app.route('/laptop')
def laptop():
    return send_from_directory('static', 'laptop.html')


# --- API Routes ---
@app.route('/sensor', methods=['GET', 'POST'])
def sensor_data():
    global latest_data
    if request.method == 'POST':
        # Phone sends data here
        data = request.json
        if data:
            latest_data = data
        return jsonify(status="ok", data=latest_data)
    else: # GET request
        # Laptop requests data from here
        return jsonify(latest_data)

if __name__ == "__main__":
    host_ip = get_ip_address()
    print("--- Server is running ---")
    print(f"Phone Controller: https://{host_ip}:5000")
    print(f"Laptop Display:   https://{host_ip}:5000/laptop")
    print("-------------------------")
    
    try:
        # Use your self-signed SSL certificate
        ssl_context = ('certs/localhost.crt', 'certs/localhost.key')
        app.run(host='0.0.0.0', port=5000, ssl_context=ssl_context)
    except FileNotFoundError:
        print("\nERROR: SSL certificate not found.")
        print("Please generate certs/localhost.crt and certs/localhost.key")