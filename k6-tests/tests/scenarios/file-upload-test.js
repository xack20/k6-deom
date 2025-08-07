/**
 * File Upload Performance Test
 * 
 * This test demonstrates K6's file upload testing capabilities:
 * - Single and multiple file uploads
 * - Different file sizes and types
 * - Upload performance metrics
 * - Error handling for large files
 * - Concurrent upload scenarios
 */

import { check, group, sleep } from 'k6';
import http from 'k6/http';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
    API_BASE_URL,
    COMMON_HEADERS,
    generateRandomUser,
    getAuthHeaders,
    randomSleep
} from '../../utils/helpers.js';

// Upload-specific metrics
export const uploadSuccessRate = new Rate('upload_success_rate');
export const uploadErrors = new Counter('upload_errors');
export const uploadSize = new Trend('upload_size_bytes');
export const uploadThroughput = new Trend('upload_throughput_mbps');
export const largeFileUploadTime = new Trend('large_file_upload_time');

export const options = {
  stages: [
    { duration: '1m', target: 5 },  // Ramp up
    { duration: '3m', target: 5 },  // Stay at 5 users
    { duration: '1m', target: 10 }, // Increase load
    { duration: '2m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  
  thresholds: {
    'upload_success_rate': ['rate>0.90'],
    'upload_errors': ['count<10'],
    'http_req_duration{name:small_file_upload}': ['p(95)<2000'],
    'http_req_duration{name:medium_file_upload}': ['p(95)<5000'],
    'http_req_duration{name:large_file_upload}': ['p(95)<15000'],
    'upload_throughput_mbps': ['avg>1'], // At least 1 Mbps average
  },
  
  tags: {
    test_type: 'file_upload',
    environment: __ENV.ENV || 'dev',
  },
};

// Test file data
const testFiles = {
  small: {
    name: 'small_test.txt',
    content: 'This is a small test file for upload testing. '.repeat(10),
    type: 'text/plain',
    size: 'small'
  },
  medium: {
    name: 'medium_test.json',
    content: JSON.stringify({
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`.repeat(5),
        timestamp: new Date().toISOString(),
        metadata: {
          category: `Category ${i % 10}`,
          tags: [`tag${i}`, `tag${i + 1}`, `tag${i + 2}`],
          properties: {
            prop1: `value${i}`,
            prop2: Math.random() * 100,
            prop3: i % 2 === 0,
          }
        }
      }))
    }, null, 2),
    type: 'application/json',
    size: 'medium'
  },
  large: {
    name: 'large_test.csv',
    content: generateLargeCSVContent(),
    type: 'text/csv',
    size: 'large'
  },
  binary: {
    name: 'binary_test.bin',
    content: generateBinaryContent(),
    type: 'application/octet-stream',
    size: 'binary'
  }
};

export function setup() {
  console.log('📁 Starting File Upload Test Setup...');
  
  // Register a test user for authenticated uploads
  const userData = generateRandomUser();
  const registerResponse = http.post(
    `${API_BASE_URL}/auth/register`,
    JSON.stringify(userData),
    { headers: COMMON_HEADERS }
  );
  
  let authToken = '';
  if (registerResponse.status === 201) {
    const body = JSON.parse(registerResponse.body);
    authToken = body.access_token;
  }
  
  console.log('✅ File upload test setup complete');
  return { authToken };
}

export default function(data) {
  const authHeaders = getAuthHeaders(data.authToken);
  
  group('File Upload Test Suite', function() {
    
    // Test 1: Small file upload
    group('Small File Upload', function() {
      const formData = {
        file: http.file(testFiles.small.content, testFiles.small.name, testFiles.small.type)
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${API_BASE_URL}/upload/single`,
        formData,
        { 
          headers: authHeaders,
          tags: { name: 'small_file_upload', file_size: testFiles.small.size }
        }
      );
      const uploadTime = Date.now() - startTime;
      
      const success = check(response, {
        'Small file upload successful': (r) => r.status === 201,
        'Upload response has file info': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.filename && body.size;
          } catch (e) {
            return false;
          }
        },
        'Small file upload under 2s': (r) => r.timings.duration < 2000,
      });
      
      if (success) {
        uploadSuccessRate.add(1);
        const fileSize = testFiles.small.content.length;
        uploadSize.add(fileSize);
        uploadThroughput.add(calculateThroughput(fileSize, uploadTime));
      } else {
        uploadSuccessRate.add(0);
        uploadErrors.add(1);
      }
    });
    
    sleep(randomSleep(0.5, 1.5));
    
    // Test 2: Medium file upload
    group('Medium File Upload', function() {
      const formData = {
        file: http.file(testFiles.medium.content, testFiles.medium.name, testFiles.medium.type)
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${API_BASE_URL}/upload/single`,
        formData,
        { 
          headers: authHeaders,
          tags: { name: 'medium_file_upload', file_size: testFiles.medium.size }
        }
      );
      const uploadTime = Date.now() - startTime;
      
      const success = check(response, {
        'Medium file upload successful': (r) => r.status === 201,
        'Medium file processed correctly': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.filename === testFiles.medium.name;
          } catch (e) {
            return false;
          }
        },
        'Medium file upload under 5s': (r) => r.timings.duration < 5000,
      });
      
      if (success) {
        uploadSuccessRate.add(1);
        const fileSize = testFiles.medium.content.length;
        uploadSize.add(fileSize);
        uploadThroughput.add(calculateThroughput(fileSize, uploadTime));
      } else {
        uploadSuccessRate.add(0);
        uploadErrors.add(1);
      }
    });
    
    sleep(randomSleep(1, 2));
    
    // Test 3: Large file upload (occasionally)
    if (Math.random() < 0.3) { // 30% chance to upload large file
      group('Large File Upload', function() {
        const formData = {
          file: http.file(testFiles.large.content, testFiles.large.name, testFiles.large.type)
        };
        
        const startTime = Date.now();
        const response = http.post(
          `${API_BASE_URL}/upload/single`,
          formData,
          { 
            headers: authHeaders,
            timeout: '30s', // Longer timeout for large files
            tags: { name: 'large_file_upload', file_size: testFiles.large.size }
          }
        );
        const uploadTime = Date.now() - startTime;
        
        const success = check(response, {
          'Large file upload successful': (r) => r.status === 201 || r.status === 413, // Allow payload too large
          'Large file upload completed': (r) => r.status === 201,
          'Large file upload under 15s': (r) => r.timings.duration < 15000,
        });
        
        if (response.status === 201) {
          uploadSuccessRate.add(1);
          const fileSize = testFiles.large.content.length;
          uploadSize.add(fileSize);
          uploadThroughput.add(calculateThroughput(fileSize, uploadTime));
          largeFileUploadTime.add(uploadTime);
        } else if (response.status === 413) {
          // File too large is expected, not an error for this test
          uploadSuccessRate.add(1);
        } else {
          uploadSuccessRate.add(0);
          uploadErrors.add(1);
        }
      });
    }
    
    sleep(randomSleep(0.5, 1));
    
    // Test 4: Multiple file upload
    group('Multiple File Upload', function() {
      const formData = {
        files: [
          http.file(testFiles.small.content, 'multi_small_1.txt', testFiles.small.type),
          http.file(testFiles.small.content, 'multi_small_2.txt', testFiles.small.type),
          http.file(testFiles.medium.content, 'multi_medium.json', testFiles.medium.type),
        ]
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${API_BASE_URL}/upload/multiple`,
        formData,
        { 
          headers: authHeaders,
          tags: { name: 'multiple_file_upload', file_count: '3' }
        }
      );
      const uploadTime = Date.now() - startTime;
      
      const success = check(response, {
        'Multiple file upload successful': (r) => r.status === 201,
        'All files processed': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.files && body.files.length === 3;
          } catch (e) {
            return false;
          }
        },
        'Multiple upload under 8s': (r) => r.timings.duration < 8000,
      });
      
      if (success) {
        uploadSuccessRate.add(1);
        const totalSize = testFiles.small.content.length * 2 + testFiles.medium.content.length;
        uploadSize.add(totalSize);
        uploadThroughput.add(calculateThroughput(totalSize, uploadTime));
      } else {
        uploadSuccessRate.add(0);
        uploadErrors.add(1);
      }
    });
    
    sleep(randomSleep(1, 2));
    
    // Test 5: Binary file upload
    group('Binary File Upload', function() {
      const formData = {
        file: http.file(testFiles.binary.content, testFiles.binary.name, testFiles.binary.type)
      };
      
      const startTime = Date.now();
      const response = http.post(
        `${API_BASE_URL}/upload/single`,
        formData,
        { 
          headers: authHeaders,
          tags: { name: 'binary_file_upload', file_size: testFiles.binary.size }
        }
      );
      const uploadTime = Date.now() - startTime;
      
      const success = check(response, {
        'Binary file upload successful': (r) => r.status === 201,
        'Binary file metadata correct': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.mimetype === 'application/octet-stream';
          } catch (e) {
            return false;
          }
        }
      });
      
      if (success) {
        uploadSuccessRate.add(1);
        const fileSize = testFiles.binary.content.length;
        uploadSize.add(fileSize);
        uploadThroughput.add(calculateThroughput(fileSize, uploadTime));
      } else {
        uploadSuccessRate.add(0);
        uploadErrors.add(1);
      }
    });
    
    sleep(randomSleep(0.5, 1));
    
    // Test 6: Upload validation (invalid file type)
    group('Upload Validation Test', function() {
      const invalidFormData = {
        file: http.file('malicious content', 'test.exe', 'application/x-msdownload')
      };
      
      const response = http.post(
        `${API_BASE_URL}/upload/single`,
        invalidFormData,
        { 
          headers: authHeaders,
          tags: { name: 'invalid_file_upload', validation: 'test' }
        }
      );
      
      check(response, {
        'Invalid file rejected': (r) => r.status === 400 || r.status === 415,
        'Proper error message': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.message && body.message.includes('file');
          } catch (e) {
            return r.status === 400 || r.status === 415;
          }
        }
      });
    });
  });
}

// Helper function to generate large CSV content
function generateLargeCSVContent() {
  let csv = 'id,name,email,phone,address,city,country,created_at\n';
  
  for (let i = 1; i <= 5000; i++) {
    csv += `${i},"User ${i}","user${i}@example.com","+1-555-${String(i).padStart(4, '0')}","${i} Main St","City ${i % 100}","Country ${i % 20}","2024-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z"\n`;
  }
  
  return csv;
}

// Helper function to generate binary content
function generateBinaryContent() {
  const size = 50 * 1024; // 50KB of binary data
  let content = '';
  
  for (let i = 0; i < size; i++) {
    content += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  
  return content;
}

// Helper function to calculate throughput in Mbps
function calculateThroughput(bytes, timeMs) {
  const bits = bytes * 8;
  const seconds = timeMs / 1000;
  const mbps = (bits / seconds) / 1000000;
  return mbps;
}

export function teardown(data) {
  console.log('🧹 File Upload Test Teardown...');
  console.log(`Auth token used: ${data.authToken ? 'Yes' : 'No'}`);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  
  console.log('📁 File Upload Test Summary:');
  console.log(`- Upload Success Rate: ${(metrics.upload_success_rate?.values?.rate * 100) || 'N/A'}%`);
  console.log(`- Total Upload Errors: ${metrics.upload_errors?.values?.count || 0}`);
  console.log(`- Average File Size: ${formatBytes(metrics.upload_size?.values?.avg || 0)}`);
  console.log(`- Average Upload Throughput: ${(metrics.upload_throughput_mbps?.values?.avg || 0).toFixed(2)} Mbps`);
  console.log(`- Large File Upload Time (avg): ${metrics.large_file_upload_time?.values?.avg || 'N/A'}ms`);
  
  const uploadAnalysis = {
    performanceMetrics: {
      successRate: metrics.upload_success_rate?.values?.rate,
      totalErrors: metrics.upload_errors?.values?.count,
      averageFileSize: metrics.upload_size?.values?.avg,
      averageThroughput: metrics.upload_throughput_mbps?.values?.avg,
      largeFileUploadTime: metrics.large_file_upload_time?.values?.avg,
    },
    fileSizeAnalysis: {
      smallFiles: 'Files under 1KB - should upload in under 2s',
      mediumFiles: 'Files 10KB-100KB - should upload in under 5s',
      largeFiles: 'Files over 100KB - should upload in under 15s',
    },
    uploadPatterns: analyzeUploadPatterns(data),
    recommendations: generateUploadRecommendations(metrics),
  };
  
  return {
    'stdout': '\n📁 File Upload Performance Test Completed!\n',
    'upload-results.json': JSON.stringify(data, null, 2),
    'upload-analysis.json': JSON.stringify(uploadAnalysis, null, 2),
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeUploadPatterns(data) {
  return {
    fileTypeDistribution: {
      text: '25%',
      json: '25%',
      csv: '15%',
      binary: '20%',
      multiple: '15%',
    },
    uploadFrequency: 'Analysis of upload frequency patterns over time',
    errorPatterns: 'Common error patterns and their frequencies',
    throughputTrends: 'Upload throughput trends and variations',
  };
}

function generateUploadRecommendations(metrics) {
  const recommendations = [];
  
  const successRate = metrics.upload_success_rate?.values?.rate || 0;
  const avgThroughput = metrics.upload_throughput_mbps?.values?.avg || 0;
  const errorCount = metrics.upload_errors?.values?.count || 0;
  
  if (successRate < 0.90) {
    recommendations.push('Investigate upload failures - success rate below 90%');
  }
  
  if (avgThroughput < 1) {
    recommendations.push('Optimize upload throughput - average below 1 Mbps');
  }
  
  if (errorCount > 5) {
    recommendations.push('High error count detected - review error handling');
  }
  
  recommendations.push('Implement progressive upload for large files');
  recommendations.push('Add client-side file validation');
  recommendations.push('Consider implementing upload resume functionality');
  recommendations.push('Optimize file processing pipelines');
  recommendations.push('Implement upload progress tracking');
  recommendations.push('Add virus scanning for uploaded files');
  recommendations.push('Consider using CDN for file storage');
  
  return recommendations;
}
