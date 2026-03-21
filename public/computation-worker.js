/**
 * APAS Computation Web Worker
 * Offloads heavy physics calculations and video frame processing
 * to prevent UI blocking, especially for 4K video processing
 */

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'processFrames':
      processVideoFrames(payload);
      break;
    case 'computeTrajectory':
      computeTrajectory(payload);
      break;
    case 'analyzeMotion':
      analyzeMotionBetweenFrames(payload);
      break;
    default:
      self.postMessage({ type: 'error', error: 'Unknown computation type' });
  }
});

/**
 * Process video frames — extract pixel data, detect objects
 */
function processVideoFrames({ frameData, width, height, threshold }) {
  const t = threshold || 30;
  const results = [];

  for (let i = 0; i < frameData.length; i++) {
    const data = frameData[i];
    let sumX = 0, sumY = 0, count = 0;

    // Simple bright-object detection by scanning pixels
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness > 200 - t) {
          sumX += x;
          sumY += y;
          count++;
        }
      }
    }

    if (count > 10) {
      results.push({ frame: i, x: sumX / count, y: sumY / count, pixels: count });
    } else {
      results.push({ frame: i, x: -1, y: -1, pixels: 0 });
    }

    // Report progress
    if (i % 5 === 0) {
      self.postMessage({ type: 'progress', progress: (i + 1) / frameData.length });
    }
  }

  self.postMessage({ type: 'framesProcessed', results });
}

/**
 * Compute full trajectory from initial conditions
 */
function computeTrajectory({ v0, angle, h0, mass, g, dt, airResistance, cd, area, rho }) {
  const gravity = g || 9.81;
  const timeStep = dt || 0.01;
  const angleRad = (angle * Math.PI) / 180;
  let vx = v0 * Math.cos(angleRad);
  let vy = v0 * Math.sin(angleRad);
  let x = 0;
  let y = h0 || 0;
  const points = [{ x, y, t: 0, vx, vy }];
  let t = 0;

  const maxIterations = 100000;
  let i = 0;

  while (y >= 0 && i < maxIterations) {
    t += timeStep;
    i++;

    if (airResistance && cd && area && rho && mass) {
      const speed = Math.sqrt(vx * vx + vy * vy);
      const dragForce = 0.5 * cd * rho * area * speed * speed;
      const ax = -(dragForce / mass) * (vx / speed);
      const ay = -gravity - (dragForce / mass) * (vy / speed);
      vx += ax * timeStep;
      vy += ay * timeStep;
    } else {
      vy -= gravity * timeStep;
    }

    x += vx * timeStep;
    y += vy * timeStep;

    if (i % Math.max(1, Math.floor(1 / (timeStep * 10))) === 0) {
      points.push({ x, y: Math.max(0, y), t, vx, vy });
    }
  }

  // Ensure last point is at ground level
  if (points[points.length - 1].y > 0.01) {
    points.push({ x, y: 0, t, vx, vy });
  }

  const maxHeight = Math.max(...points.map(p => p.y));
  const range = points[points.length - 1].x;
  const totalTime = t;

  self.postMessage({
    type: 'trajectoryComputed',
    results: { points, maxHeight, range, totalTime }
  });
}

/**
 * Analyze motion between consecutive frames to detect projectile movement
 */
function analyzeMotionBetweenFrames({ positions, fps }) {
  if (!positions || positions.length < 2) {
    self.postMessage({ type: 'motionAnalyzed', results: { velocity: 0, angle: 0 } });
    return;
  }

  const dt = 1 / (fps || 30);
  const velocities = [];
  const angles = [];

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    if (prev.x < 0 || curr.x < 0) continue;

    const dx = curr.x - prev.x;
    const dy = -(curr.y - prev.y); // Flip Y since screen coords are inverted
    const v = Math.sqrt(dx * dx + dy * dy) / dt;
    const a = Math.atan2(dy, dx) * (180 / Math.PI);

    velocities.push(v);
    angles.push(a);
  }

  if (velocities.length === 0) {
    self.postMessage({ type: 'motionAnalyzed', results: { velocity: 0, angle: 0 } });
    return;
  }

  // Use initial velocity and angle (first few frames)
  const initialCount = Math.min(3, velocities.length);
  const avgVelocity = velocities.slice(0, initialCount).reduce((a, b) => a + b, 0) / initialCount;
  const avgAngle = angles.slice(0, initialCount).reduce((a, b) => a + b, 0) / initialCount;

  self.postMessage({
    type: 'motionAnalyzed',
    results: {
      velocity: Math.round(avgVelocity * 100) / 100,
      angle: Math.round(avgAngle * 100) / 100,
      dataPoints: velocities.length,
    }
  });
}
