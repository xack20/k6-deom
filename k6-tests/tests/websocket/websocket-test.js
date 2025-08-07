/**
 * WebSocket Performance Test
 * 
 * This test demonstrates K6's WebSocket testing capabilities:
 * - WebSocket connection establishment
 * - Real-time message exchange
 * - Connection stability under load
 * - Message throughput testing
 * - WebSocket-specific performance metrics
 */

import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import ws from 'k6/ws';
import { randomSleep } from '../../utils/helpers.js';

// WebSocket specific metrics
export const wsConnectionSuccess = new Rate('ws_connection_success');
export const wsMessagesSent = new Counter('ws_messages_sent');
export const wsMessagesReceived = new Counter('ws_messages_received');
export const wsConnectionDuration = new Trend('ws_connection_duration');
export const wsMessageLatency = new Trend('ws_message_latency');
export const wsConnectionErrors = new Counter('ws_connection_errors');

// WebSocket test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Start with few connections
    { duration: '1m', target: 15 },   // Increase WebSocket connections
    { duration: '2m', target: 25 },   // Peak WebSocket load
    { duration: '1m', target: 10 },   // Reduce load
    { duration: '30s', target: 0 },   // Close all connections
  ],
  thresholds: {
    'ws_connection_success': ['rate>0.95'],
    'ws_message_latency': ['p(95)<100'],
    'ws_connection_duration': ['p(95)<1000'],
    'ws_connection_errors': ['count<5'],
  },
  tags: {
    test_type: 'websocket_test',
    environment: __ENV.ENV || 'dev',
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export function setup() {
  console.log('🔌 Starting WebSocket Performance Test Setup...');
  console.log(`WebSocket URL: ${WS_URL}`);
  
  return { 
    startTime: Date.now(),
    wsMetrics: {
      totalConnections: 0,
      successfulConnections: 0,
      messagesSent: 0,
      messagesReceived: 0
    }
  };
}

export default function (data) {
  const vuId = __VU;
  const iterationId = __ITER;
  
  // Test WebSocket connection and messaging
  testWebSocketConnection(vuId, iterationId);
  
  sleep(randomSleep(1, 3));
}

function testWebSocketConnection(vuId, iterationId) {
  const connectionStart = Date.now();
  let messagesSentCount = 0;
  let messagesReceivedCount = 0;
  let messageTimes = new Map();
  
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  
  const response = ws.connect(url, {
    tags: { name: 'websocket_connection' },
  }, function (socket) {
    
    const connectionTime = Date.now() - connectionStart;
    wsConnectionDuration.add(connectionTime);
    
    // Connection established successfully
    const connectionSuccess = check(socket, {
      'websocket connection established': (s) => s !== null,
    });
    
    wsConnectionSuccess.add(connectionSuccess);
    
    if (!connectionSuccess) {
      wsConnectionErrors.add(1);
      return;
    }
    
    console.log(`WebSocket connected for VU ${vuId}, iteration ${iterationId}`);
    
    // Socket.IO handshake
    socket.on('open', function () {
      console.log(`WebSocket opened for VU ${vuId}`);
      
      // Send initial ping message
      const pingMessage = JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
        vuId: vuId,
        iterationId: iterationId
      });
      
      socket.send(pingMessage);
      messageTimes.set('ping', Date.now());
      messagesSentCount++;
      wsMessagesSent.add(1);
    });
    
    // Handle incoming messages
    socket.on('message', function (message) {
      messagesReceivedCount++;
      wsMessagesReceived.add(1);
      
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'pong') {
          const sentTime = messageTimes.get('ping');
          if (sentTime) {
            const latency = Date.now() - sentTime;
            wsMessageLatency.add(latency);
            console.log(`Ping-pong latency: ${latency}ms`);
          }
        }
        
        // Validate message structure
        check(data, {
          'message has type': (d) => d.type !== undefined,
          'message has timestamp': (d) => d.timestamp !== undefined,
        });
        
      } catch (e) {
        console.log(`Error parsing WebSocket message: ${e}`);
      }
    });
    
    // Handle connection errors
    socket.on('error', function (error) {
      console.log(`WebSocket error for VU ${vuId}: ${error}`);
      wsConnectionErrors.add(1);
    });
    
    // Send periodic messages
    const messageInterval = setInterval(() => {
      if (socket.readyState === 1) { // OPEN state
        const message = JSON.stringify({
          type: 'chat',
          content: `Test message from VU ${vuId} at ${Date.now()}`,
          vuId: vuId,
          messageNumber: messagesSentCount + 1
        });
        
        socket.send(message);
        messageTimes.set(`message_${messagesSentCount}`, Date.now());
        messagesSentCount++;
        wsMessagesSent.add(1);
      }
    }, 2000); // Send message every 2 seconds
    
    // Test burst messaging
    setTimeout(() => {
      if (socket.readyState === 1) {
        for (let i = 0; i < 5; i++) {
          const burstMessage = JSON.stringify({
            type: 'burst',
            content: `Burst message ${i} from VU ${vuId}`,
            burstIndex: i,
            vuId: vuId
          });
          
          socket.send(burstMessage);
          messageTimes.set(`burst_${i}`, Date.now());
          messagesSentCount++;
          wsMessagesSent.add(1);
          
          sleep(0.1); // Small delay between burst messages
        }
      }
    }, 5000); // Send burst after 5 seconds
    
    // Test large message handling
    setTimeout(() => {
      if (socket.readyState === 1) {
        const largeData = 'x'.repeat(10000); // 10KB message
        const largeMessage = JSON.stringify({
          type: 'large',
          content: largeData,
          size: largeData.length,
          vuId: vuId
        });
        
        socket.send(largeMessage);
        messageTimes.set('large_message', Date.now());
        messagesSentCount++;
        wsMessagesSent.add(1);
      }
    }, 8000); // Send large message after 8 seconds
    
    // Keep connection alive for testing duration
    setTimeout(() => {
      clearInterval(messageInterval);
      
      // Send final message before closing
      if (socket.readyState === 1) {
        const finalMessage = JSON.stringify({
          type: 'goodbye',
          content: `VU ${vuId} signing off`,
          totalMessagesSent: messagesSentCount,
          vuId: vuId
        });
        
        socket.send(finalMessage);
        wsMessagesSent.add(1);
      }
      
      socket.close();
    }, 15000); // Keep connection for 15 seconds
    
    // Handle connection close
    socket.on('close', function () {
      console.log(`WebSocket closed for VU ${vuId}. Sent: ${messagesSentCount}, Received: ${messagesReceivedCount}`);
      
      // Validate message exchange
      check({ messagesSentCount, messagesReceivedCount }, {
        'messages were sent': (counts) => counts.messagesSentCount > 0,
        'messages were received': (counts) => counts.messagesReceivedCount > 0,
        'reasonable message exchange': (counts) => counts.messagesReceivedCount >= counts.messagesSentCount * 0.5,
      });
    });
    
    // Handle socket timeout
    socket.setTimeout(function () {
      console.log(`WebSocket timeout for VU ${vuId}`);
      wsConnectionErrors.add(1);
    }, 20000); // 20 second timeout
  });
  
  // Check if WebSocket connection was successful
  check(response, {
    'websocket connection response ok': (r) => r && r.status === 101,
  });
}

export function teardown(data) {
  console.log('🧹 WebSocket Test Teardown...');
  
  if (data.startTime) {
    const totalTestTime = Date.now() - data.startTime;
    console.log(`Total WebSocket test duration: ${totalTestTime}ms`);
  }
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📊 WebSocket Performance Test Summary:');
  console.log(`- WebSocket connection success rate: ${(metrics.ws_connection_success?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Total messages sent: ${metrics.ws_messages_sent?.values?.count || 0}`);
  console.log(`- Total messages received: ${metrics.ws_messages_received?.values?.count || 0}`);
  console.log(`- Average message latency: ${metrics.ws_message_latency?.values?.avg || 'N/A'}ms`);
  console.log(`- Average connection duration: ${metrics.ws_connection_duration?.values?.avg || 'N/A'}ms`);
  console.log(`- Connection errors: ${metrics.ws_connection_errors?.values?.count || 0}`);
  
  const wsAnalysis = {
    connectionSuccessRate: metrics.ws_connection_success?.values?.rate,
    totalMessagesSent: metrics.ws_messages_sent?.values?.count,
    totalMessagesReceived: metrics.ws_messages_received?.values?.count,
    averageMessageLatency: metrics.ws_message_latency?.values?.avg,
    maxMessageLatency: metrics.ws_message_latency?.values?.max,
    averageConnectionTime: metrics.ws_connection_duration?.values?.avg,
    connectionErrors: metrics.ws_connection_errors?.values?.count,
    messageExchangeRatio: calculateMessageExchangeRatio(metrics),
    websocketPerformanceScore: calculateWebSocketPerformanceScore(metrics),
    recommendations: generateWebSocketRecommendations(metrics),
  };
  
  return {
    'stdout': '\n🔌 WebSocket Performance Test Completed!\n',
    'websocket-test-results.json': JSON.stringify(data, null, 2),
    'websocket-analysis.json': JSON.stringify(wsAnalysis, null, 2),
  };
}

function calculateMessageExchangeRatio(metrics) {
  const sent = metrics.ws_messages_sent?.values?.count || 0;
  const received = metrics.ws_messages_received?.values?.count || 0;
  
  if (sent === 0) return 0;
  return received / sent;
}

function calculateWebSocketPerformanceScore(metrics) {
  const connectionSuccess = metrics.ws_connection_success?.values?.rate || 0;
  const avgLatency = metrics.ws_message_latency?.values?.avg || 1000;
  const connectionTime = metrics.ws_connection_duration?.values?.avg || 5000;
  const errors = metrics.ws_connection_errors?.values?.count || 0;
  const exchangeRatio = calculateMessageExchangeRatio(metrics);
  
  let score = 0;
  
  // Connection success: 30%
  score += connectionSuccess * 30;
  
  // Message latency: 25% (inverted - lower is better)
  const latencyScore = Math.max(0, (200 - avgLatency) / 200) * 25;
  score += latencyScore;
  
  // Connection time: 20% (inverted - lower is better)
  const connectionScore = Math.max(0, (2000 - connectionTime) / 2000) * 20;
  score += connectionScore;
  
  // Message exchange ratio: 15%
  score += exchangeRatio * 15;
  
  // Error penalty: 10%
  const errorScore = Math.max(0, (10 - errors) / 10) * 10;
  score += errorScore;
  
  return Math.round(score);
}

function generateWebSocketRecommendations(metrics) {
  const recommendations = [];
  const connectionSuccess = metrics.ws_connection_success?.values?.rate || 0;
  const avgLatency = metrics.ws_message_latency?.values?.avg || 0;
  const errors = metrics.ws_connection_errors?.values?.count || 0;
  const exchangeRatio = calculateMessageExchangeRatio(metrics);
  
  if (connectionSuccess < 0.95) {
    recommendations.push('Improve WebSocket connection stability - success rate below 95%');
  }
  
  if (avgLatency > 100) {
    recommendations.push('Optimize message latency - average latency above 100ms');
  }
  
  if (errors > 5) {
    recommendations.push('Investigate WebSocket connection errors - high error count detected');
  }
  
  if (exchangeRatio < 0.8) {
    recommendations.push('Check message delivery reliability - low message exchange ratio');
  }
  
  recommendations.push('Implement WebSocket connection pooling for better performance');
  recommendations.push('Add proper error handling and reconnection logic');
  recommendations.push('Monitor WebSocket connection health and metrics');
  recommendations.push('Consider message compression for large payloads');
  
  return recommendations;
}
