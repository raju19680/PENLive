// ============================================================
// PENLIVE - Advanced Drawing Features
// Copyright (c) 2026 Er. Raju Kumawat. All rights reserved.
//
// Ink smoothing (Catmull-Rom -> Bezier), pressure sensitivity,
// ink-to-shape recognition (draw rough shape -> snap to clean).
// Fading ink, blur, fill, lasso selection, stamps, callouts.
// ============================================================

export class AdvancedDrawing {
  constructor(app) {
    this.app = app;
    this.smoothingEnabled = true;
    this.pressureEnabled = true;
    this.inkToShapeEnabled = true;
    this.fadingEnabled = false;
    this.currentStroke = []; // for smoothing
    this.stamps = {
      check: '✓', cross: '✗', star: '★', heart: '♥',
      arrow: '→', question: '?', exclaim: '!', tick: '☐'
    };
    this.stepCounter = 0;
  }

  async init() {
    this.bindUI();
  }

  bindUI() {
    // Settings toggles
    document.getElementById('set-ink-smoothing')?.addEventListener('change', (e) => {
      this.smoothingEnabled = e.target.checked;
    });
    document.getElementById('set-pressure')?.addEventListener('change', (e) => {
      this.pressureEnabled = e.target.checked;
    });
    document.getElementById('set-fading-ink')?.addEventListener('change', (e) => {
      this.fadingEnabled = e.target.checked;
    });

    // Stamp picker
    document.querySelectorAll('.stamp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeStamp = btn.dataset.stamp;
        const panel = document.getElementById('stamp-panel');
        if (panel) panel.hidden = true;
        // Activate stamp tool
        const stampBtn = document.querySelector('[data-tool="stamp"]');
        stampBtn?.click();
        this.app.toast.show(`Stamp: ${this.stamps[this.activeStamp]} — click canvas to place`, 'info');
      });
    });
  }

  // Called from DrawingEngine on each mousemove — accumulate points
  addPoint(x, y, pressure = 1) {
    this.currentStroke.push({ x, y, pressure, time: Date.now() });
  }

  // Reset stroke on mouseup
  resetStroke() {
    this.currentStroke = [];
  }

  // Smooth a stroke using Catmull-Rom -> Bezier conversion
  getSmoothedPath(points) {
    if (!this.smoothingEnabled || points.length < 3) return points;
    const smoothed = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      // Catmull-Rom -> Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      smoothed.push({ type: 'bezier', p1, cp1: { x: cp1x, y: cp1y }, cp2: { x: cp2x, y: cp2y }, p2 });
    }
    return smoothed;
  }

  // Draw smoothed path
  drawSmoothedPath(ctx, smoothed) {
    if (smoothed.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(smoothed[0].p1.x, smoothed[0].p1.y);
    for (const seg of smoothed) {
      ctx.bezierCurveTo(seg.cp1.x, seg.cp1.y, seg.cp2.x, seg.cp2.y, seg.p2.x, seg.p2.y);
    }
    ctx.stroke();
  }

  // Ink-to-Shape: detect if user drew a rough shape and snap to clean version
  recognizeShape(points) {
    if (!this.inkToShapeEnabled || points.length < 8) return null;

    const bbox = this.boundingBox(points);
    const w = bbox.maxX - bbox.minX;
    const h = bbox.maxY - bbox.minY;
    const aspect = w / h;

    // Calculate "closedness" — distance from last to first point
    const first = points[0];
    const last = points[points.length - 1];
    const closure = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
    const diagonal = Math.sqrt(w ** 2 + h ** 2);
    const closureRatio = closure / diagonal;

    // Calculate path length vs bounding box diagonal (straightness)
    let pathLen = 0;
    for (let i = 1; i < points.length; i++) {
      pathLen += Math.sqrt(
        (points[i].x - points[i-1].x) ** 2 +
        (points[i].y - points[i-1].y) ** 2
      );
    }
    const straightness = diagonal / pathLen;

    // Detect: closed shape?
    if (closureRatio < 0.2) {
      // Closed — could be circle, rectangle, triangle
      // Count corners by detecting sharp angle changes
      const corners = this.countCorners(points);

      if (corners <= 2 && aspect > 0.8 && aspect < 1.2) {
        // Likely circle
        return { type: 'circle', cx: (bbox.minX + bbox.maxX) / 2, cy: (bbox.minY + bbox.maxY) / 2,
                 rx: w / 2, ry: h / 2 };
      }
      if (corners === 3) {
        // Triangle
        return { type: 'triangle', bbox };
      }
      if (corners >= 4) {
        // Rectangle
        return { type: 'rectangle', x: bbox.minX, y: bbox.minY, w, h };
      }
    } else if (straightness > 0.9) {
      // Straight line
      return { type: 'line', x1: first.x, y1: first.y, x2: last.x, y2: last.y };
    }

    return null;
  }

  boundingBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  countCorners(points) {
    // Detect significant angle changes
    let corners = 0;
    const window = 5;
    for (let i = window; i < points.length - window; i += window) {
      const v1x = points[i].x - points[i - window].x;
      const v1y = points[i].y - points[i - window].y;
      const v2x = points[i + window].x - points[i].x;
      const v2y = points[i + window].y - points[i].y;
      const angle = Math.atan2(v2y, v2x) - Math.atan2(v1y, v1x);
      const normAngle = Math.abs(angle) % (2 * Math.PI);
      if (normAngle > Math.PI / 4 && normAngle < 7 * Math.PI / 4) {
        corners++;
      }
    }
    return corners;
  }

  drawRecognizedShape(ctx, shape) {
    ctx.beginPath();
    switch (shape.type) {
      case 'circle':
        ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'rectangle':
        ctx.rect(shape.x, shape.y, shape.w, shape.h);
        ctx.stroke();
        break;
      case 'triangle': {
        const b = shape.bbox;
        ctx.moveTo(b.minX, b.maxY);
        ctx.lineTo(b.maxX, b.maxY);
        ctx.lineTo((b.minX + b.maxX) / 2, b.minY);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'line':
        ctx.moveTo(shape.x1, shape.y1);
        ctx.lineTo(shape.x2, shape.y2);
        ctx.stroke();
        break;
    }
  }

  // Draw a stamp at position
  drawStamp(ctx, stamp, x, y, color, size = 40) {
    const symbol = this.stamps[stamp] || '★';
    ctx.font = `${size}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, x, y);
  }

  // Draw numbered step (auto-incrementing circle with number)
  drawStep(ctx, x, y, color, size = 30) {
    this.stepCounter++;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(this.stepCounter), x, y);
  }

  // Draw callout (speech bubble)
  drawCallout(ctx, x1, y1, x2, y2, text, color) {
    const w = 200;
    const h = 60;
    const bx = x2;
    const by = y2;

    // Bubble
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 12);
    ctx.fill();
    ctx.stroke();

    // Tail (triangle from bubble to start point)
    ctx.beginPath();
    ctx.moveTo(bx + 20, by + h);
    ctx.lineTo(x1, y1);
    ctx.lineTo(bx + 40, by + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '14px Segoe UI';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text || 'Click to edit', bx + 10, by + 20);
  }

  // Apply blur effect (pixelate region)
  applyBlur(ctx, x, y, w, h, intensity = 8) {
    const dpr = window.devicePixelRatio || 1;
    const px = x * dpr;
    const py = y * dpr;
    const pw = w * dpr;
    const ph = h * dpr;

    // Get image data
    const imageData = ctx.getImageData(px, py, pw, ph);
    const data = imageData.data;

    // Simple pixelation — sample every Nth pixel and fill block
    const block = intensity;
    for (let y = 0; y < ph; y += block) {
      for (let x = 0; x < pw; x += block) {
        const idx = (y * pw + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        for (let dy = 0; dy < block && y + dy < ph; dy++) {
          for (let dx = 0; dx < block && x + dx < pw; dx++) {
            const i = ((y + dy) * pw + (x + dx)) * 4;
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = a;
          }
        }
      }
    }
    ctx.putImageData(imageData, px, py);
  }

  // Fill bucket — flood fill from point with target color
  fillBucket(ctx, startX, startY, fillColor, tolerance = 30) {
    const dpr = window.devicePixelRatio || 1;
    const px = Math.floor(startX * dpr);
    const py = Math.floor(startY * dpr);
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const startIdx = (py * w + px) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    const fill = this.hexToRgb(fillColor);
    if (Math.abs(targetR - fill.r) < 5 && Math.abs(targetG - fill.g) < 5 &&
        Math.abs(targetB - fill.b) < 5) return; // Already same color

    const stack = [[px, py]];
    const visited = new Uint8Array(w * h);

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = (y * w + x) * 4;
      const flatIdx = y * w + x;
      if (visited[flatIdx]) continue;

      const dr = Math.abs(data[idx] - targetR);
      const dg = Math.abs(data[idx + 1] - targetG);
      const db = Math.abs(data[idx + 2] - targetB);
      const da = Math.abs(data[idx + 3] - targetA);

      if (dr > tolerance || dg > tolerance || db > tolerance || da > tolerance) continue;

      visited[flatIdx] = 1;
      data[idx] = fill.r;
      data[idx + 1] = fill.g;
      data[idx + 2] = fill.b;
      data[idx + 3] = 255;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);

      if (stack.length > 1000000) break; // Safety limit
    }

    ctx.putImageData(imageData, 0, 0);
  }

  hexToRgb(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
  }

  // Fading ink — schedule annotation to fade out
  scheduleFading(ctx, x, y, w, h, duration = 5000) {
    if (!this.fadingEnabled) return;
    setTimeout(() => {
      ctx.clearRect(x, y, w, h);
    }, duration);
  }

  resetStepCounter() {
    this.stepCounter = 0;
  }
}
