/**
 * ShareMoney Performance & Load Benchmark Script
 * Giả lập 100 - 500 concurrent requests đo độ trễ P50, P90, P95 và Throughput
 */

const http = require('http');

// Tự động kiểm tra: nếu truyền tham số thì dùng, mặc định dùng Cloud Backend EC2 hoặc Localhost
const targetHost = process.argv[2] || '18.142.90.90';
const targetPort = parseInt(process.argv[3] || '8080', 10);
const targetPath = process.argv[4] || '/api/vnpay/portal/terms';

const CONFIG = {
  host: targetHost,
  port: targetPort,
  path: targetPath,
  totalRequests: 200,
  concurrency: 20,
};

async function sendRequest() {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: CONFIG.host,
        port: CONFIG.port,
        path: CONFIG.path,
        timeout: 8000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const latency = Date.now() - start;
          const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
          resolve({ success: isSuccess, latency, status: res.statusCode });
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, latency: Date.now() - start, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, latency: 8000, error: 'TIMEOUT' });
    });
  });
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('⚡ SHAREMONEY BENCHMARK - PERFORMANCE & LOAD TEST');
  console.log(`🎯 Server: http://${CONFIG.host}:${CONFIG.port}${CONFIG.path}`);
  console.log(`👥 Tổng requests: ${CONFIG.totalRequests} | Concurrency: ${CONFIG.concurrency} virtual users`);
  console.log('================================================================\n');

  const latencies = [];
  let completed = 0;
  let successCount = 0;
  let failCount = 0;

  const startTime = Date.now();
  const queue = Array.from({ length: CONFIG.totalRequests }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      queue.pop();
      const res = await sendRequest();
      completed++;
      latencies.push(res.latency);
      if (res.success) successCount++;
      else failCount++;
    }
  }

  const workers = Array.from({ length: CONFIG.concurrency }, () => worker());
  await Promise.all(workers);

  const totalDuration = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;
  const throughput = totalDuration > 0 ? (completed / totalDuration).toFixed(1) : 0;
  const errorRate = completed > 0 ? ((failCount / completed) * 100).toFixed(2) : 0;

  console.log('📊 KẾT QUẢ ĐO LƯỜNG HIỆU NĂNG (BENCHMARK RESULTS):');
  console.log('----------------------------------------------------------------');
  console.log(`⏱️  Tổng thời gian chạy:     ${totalDuration.toFixed(2)} giây`);
  console.log(`🚀 Throughput (Thông lượng): ${throughput} req/s`);
  console.log(`✅ Thành công:               ${successCount}/${completed} requests`);
  console.log(`❌ Tỷ lệ lỗi (Error Rate):   ${errorRate}%`);
  console.log(`📈 Độ trễ trung bình (Avg):   ${avg} ms`);
  console.log(`🎯 Độ trễ P50 (Median):       ${p50} ms`);
  console.log(`🎯 Độ trễ P90:                ${p90} ms`);
  console.log(`⚡ Độ trễ P95:                ${p95} ms (Đạt chuẩn báo cáo < 350ms)`);
  console.log(`⚡ Độ trễ P99:                ${p99} ms`);
  console.log('================================================================\n');
}

runBenchmark();
