// Test script for local edge function development
import { visionAnalyzeHandler } from './vision-analyze.ts';

// Test data
const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchJjdrFQn9XbYAAAAFJRU5ErkJggg=="; // Simple 1x1 red pixel

const testRequest = new Request('http://localhost:8000/vision-analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    imageBase64: testImageBase64,
    mimeType: 'image/png',
    lang: 'en'
  })
});

try {
  console.log('🧪 Testing vision analysis locally...');
  const response = await visionAnalyzeHandler(testRequest);
  const result = await response.json();
  
  console.log('✅ Test successful!');
  console.log('Response:', JSON.stringify(result, null, 2));
  
  if (result.analysis) {
    console.log('🎯 Projectile detected:', result.analysis.object_type);
    console.log('📊 Velocity:', result.analysis.initial_velocity, 'm/s');
    console.log('📐 Angle:', result.analysis.launch_angle, '°');
  }
} catch (error) {
  console.error('❌ Test failed:', error);
}
