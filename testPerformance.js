const puppeteer = require('puppeteer');
const fs = require('fs');

async function runPerformanceTest() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Lưu kết quả
    const results = {
        pageLoad: [],
        domContent: [],
        firstPaint: []
    };

    // Test trong 5 phút
    const testDuration = 5 * 60 * 1000; // 5 phút
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
        // Test load trang
        const pageStart = Date.now();
        
        // Đo thời gian load trang
        const metrics = await page.metrics();
        await page.goto('http://127.0.0.1:5500/pages/auth/signin.html', {
            waitUntil: 'networkidle0'
        });
        
        // Lấy các metrics
        const performance = await page.evaluate(() => {
            const timing = performance.timing;
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
            };
        });

        results.pageLoad.push(Date.now() - pageStart);
        results.domContent.push(performance.domContentLoaded);
        results.firstPaint.push(performance.firstPaint);

        // Đợi 30 giây trước khi test lại
        await new Promise(resolve => setTimeout(resolve, 30 * 1000));
    }

    await browser.close();

    // Tính toán thống kê
    const stats = {};
    for (const [key, values] of Object.entries(results)) {
        stats[key] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length
        };
    }

    // Tạo biểu đồ sử dụng Chart.js
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <canvas id="responseTimeChart"></canvas>
        <script>
            const ctx = document.getElementById('responseTimeChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(Object.keys(results.pageLoad).map(i => i + 1))},
                    datasets: [
                        {
                            label: 'Total Page Load Time',
                            data: ${JSON.stringify(results.pageLoad)},
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        },
                        {
                            label: 'DOM Content Loaded',
                            data: ${JSON.stringify(results.domContent)},
                            borderColor: 'rgb(255, 99, 132)',
                            tension: 0.1
                        },
                        {
                            label: 'First Paint',
                            data: ${JSON.stringify(results.firstPaint)},
                            borderColor: 'rgb(54, 162, 235)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Time (ms)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Test Iteration'
                            }
                        }
                    }
                }
            });
        </script>
    </body>
    </html>
    `;

    // Lưu kết quả
    fs.writeFileSync('performance-results.html', html);
    fs.writeFileSync('performance-stats.json', JSON.stringify(stats, null, 2));
}

runPerformanceTest().catch(console.error);
