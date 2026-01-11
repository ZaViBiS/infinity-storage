#!/bin/bash

# Infinity Storage Development Starter Script

echo "🚀 Starting Infinity Storage Development Environment..."

# Check if backend binary exists
if [ ! -f "./infinity-storage" ]; then
    echo "📦 Building backend..."
    go build -o infinity-storage
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build backend"
        exit 1
    fi
fi

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "infinity-storage" 2>/dev/null || true
pkill -f "python3 -m http.server 8000" 2>/dev/null || true
pkill -f "http-server -p 8000" 2>/dev/null || true

# Start backend server
echo "🔧 Starting backend server on port 8081..."
./infinity-storage &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend server
echo "🌐 Starting frontend server on port 8000..."
cd frontend

# Try different servers in order of preference
if command -v python3 &> /dev/null; then
    echo "Using Python 3 server..."
    python3 -m http.server 8000 &
    FRONTEND_PID=$!
elif command -v python &> /dev/null; then
    echo "Using Python server..."
    python -m SimpleHTTPServer 8000 &
    FRONTEND_PID=$!
elif command -v npx &> /dev/null; then
    echo "Using Node.js http-server..."
    npx http-server -p 8000 &
    FRONTEND_PID=$!
else
    echo "❌ No suitable frontend server found"
    echo "Please install Python 3 or Node.js"
    kill $BACKEND_PID
    exit 1
fi

# Store PIDs for cleanup
echo $BACKEND_PID > /tmp/infinity-backend.pid
echo $FRONTEND_PID > /tmp/infinity-frontend.pid

cd ..

echo ""
echo "✅ Infinity Storage is now running!"
echo ""
echo "📊 Backend:  http://localhost:8081"
echo "🌐 Frontend: http://localhost:8000"
echo ""
echo "💡 Tips:"
echo "  - Open http://localhost:8000 in your browser"
echo "  - Configure API key in Settings tab"
echo "  - Use Ctrl+C to stop both servers"
echo ""

# Wait for interrupt signal
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f /tmp/infinity-*.pid; exit' INT

wait