import http from 'http';

const numRequests = 100;
const concurrency = 10;
const url = 'http://localhost:3000/api/classify';
const payload = JSON.stringify({
  id: 'xray-normal-01',
  name: 'Sample',
  isCustom: false,
  base64ImageData: null,
  prepConfig: null
});

let completed = 0;
let errors = 0;
const startTotal = Date.now();
const latencies = [];

async function sendRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        latencies.push(Date.now() - start);
        resolve(true);
      });
    });
    req.on('error', () => {
      errors++;
      resolve(false);
    });
    req.write(payload);
    req.end();
  });
}

async function runBenchmark() {
  console.log(`Starting benchmark: ${numRequests} requests with concurrency ${concurrency}...`);
  
  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 2000));
  
  const queue = Array(numRequests).fill(0);
  const workers = Array(concurrency).fill(0).map(async () => {
    while(queue.length > 0) {
      queue.pop();
      await sendRequest();
      completed++;
      if (completed % 25 === 0) console.log(`Completed ${completed}/${numRequests}`);
    }
  });

  await Promise.all(workers);
  
  const totalTime = Date.now() - startTotal;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);
  const throughput = (numRequests / (totalTime / 1000)).toFixed(2);
  
  console.log('\n--- BENCHMARK RESULTS ---');
  console.log(`Total Requests: ${numRequests}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Throughput: ${throughput} req/sec`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`Min Latency: ${minLatency}ms`);
  console.log(`Max Latency: ${maxLatency}ms`);
  process.exit(0);
}

runBenchmark();
