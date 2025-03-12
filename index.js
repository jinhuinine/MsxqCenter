// 局域网位置数据同步系统 - 主入口点 (安全版本)
const fastify = require('fastify')({ logger: true });
const WebSocket = require('ws');
const os = require('os');
const path = require('path');
const http = require('http');

// 创建HTTP服务器
const server = http.createServer();

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 存储客户端连接 (使用Map而不是对象，更安全)
const clients = new Map();

// 获取本机IP地址
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过非IPv4和内部IP
      if (iface.family !== 'IPv4' || iface.internal !== false) continue;
      return iface.address;
    }
  }
  return '127.0.0.1';
}

const serverIP = getLocalIP();

// 安全地解析JSON
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  // 安全地获取客户端IP
  const clientIP = (req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                   req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  
  console.log(`新客户端连接: ${clientIP}`);
  
  // 存储客户端连接
  clients.set(clientIP, ws);
  
  // 发送欢迎消息
  try {
    ws.send(JSON.stringify({
      type: 'ConnectionEstablished',
      message: `已连接到位置同步服务器 (${serverIP})`
    }));
  } catch (error) {
    console.error('发送欢迎消息失败:', error);
  }
  
  // 消息处理
  ws.on('message', (message) => {
    const data = safeJsonParse(message);
    if (!data) {
      console.error('收到无效JSON格式消息');
      return;
    }
    
    // 验证消息格式
    if (data.type !== 'LocationUpdate' || !data.clientIP || !Array.isArray(data.transforms)) {
      console.error('收到无效消息格式:', data);
      return;
    }
    
    // 验证transforms数据 (新格式)
    const isValidTransforms = data.transforms.every(transform => 
      transform && typeof transform === 'object' && 
      typeof transform.id === 'string' && 
      Array.isArray(transform.data) && transform.data.length === 4 &&
      transform.data.every(val => typeof val === 'number' && isFinite(val))
    );
    
    if (!isValidTransforms) {
      console.error('收到无效的transforms数据:', data.transforms);
      return;
    }
    
    //log收到的消息内容
    console.log(`收到来自 ${data.clientIP} 的位置更新`);
    console.log(`位置数据详情: ${JSON.stringify(data.transforms)}`);
    
    // 记录第一个变换矩阵的详细信息（如果存在）
    if (data.transforms.length > 0) {
      const firstTransform = data.transforms[0];
      console.log(`首个变换矩阵ID: ${firstTransform.id}, 数据: [${firstTransform.data.join(', ')}]`);
    }
    console.log(`共收到 ${data.transforms.length} 个变换矩阵`);
    
    // 创建广播消息
    const broadcastMessage = JSON.stringify({
      type: 'LocationBroadcast',
      sourceIP: data.clientIP,
      transforms: data.transforms
    });
    
    // 广播给其他客户端
    clients.forEach((client, ip) => {
      // 不发送给原始发送者
      if (ip !== data.clientIP && client.readyState === WebSocket.OPEN) {
        try {
          client.send(broadcastMessage);
        } catch (error) {
          console.error(`向客户端 ${ip} 发送消息失败,因为过滤相同IP:`, error);
        }
      }
    });
  });
  
  // 连接关闭处理
  ws.on('close', () => {
    console.log(`客户端断开连接: ${clientIP}`);
    clients.delete(clientIP);
  });
  
  // 错误处理
  ws.on('error', (error) => {
    console.error(`客户端 ${clientIP} 连接错误:`, error);
    clients.delete(clientIP);
  });
});

// 设置Fastify路由
fastify.get('/', async (request, reply) => {
  return `
    <html>
      <head>
        <title>位置同步服务器</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #333; }
          .info { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
          .clients { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>位置同步服务器</h1>
        <div class="info">
          <p>服务器IP: ${serverIP}</p>
          <p>WebSocket端口: ${PORT}</p>
          <p>连接客户端数: ${clients.size}</p>
        </div>
        <div class="clients">
          <h2>已连接客户端:</h2>
          <ul id="clientList">
            ${Array.from(clients.keys()).map(ip => `<li>${ip}</li>`).join('')}
          </ul>
        </div>
        <script>
          // 安全的自动刷新
          setTimeout(() => location.reload(), 5000);
        </script>
      </body>
    </html>
  `;
});

// 启动服务器
const PORT = process.env.PORT || 3000;

// 启动Fastify
fastify.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  
  console.log(`位置同步服务器运行在 http://${serverIP}:${PORT}`);
});

// 将WebSocket服务器附加到同一端口
server.listen(PORT); 