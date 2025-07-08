#!/usr/bin/env node

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function analyzeBuild() {
  console.log('🔍 Starting comprehensive build analysis...\n');

  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  await fs.rm(path.join(rootDir, 'dist'), { recursive: true, force: true });

  // Run production build with analysis
  console.log('🏗️  Building for production with analysis...\n');
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    // Set ANALYZE environment variable for detailed reporting
    const buildEnv = { ...process.env, ANALYZE: 'true' };

    exec('npm run build', { cwd: rootDir, env: buildEnv }, async (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Build failed:', error);
        console.error('STDERR:', stderr);
        reject(error);
        return;
      }

      const buildTime = Date.now() - startTime;
      console.log(`✅ Build completed in ${(buildTime / 1000).toFixed(2)}s\n`);

      // Analyze dist folder
      const distPath = path.join(rootDir, 'dist');
      const assets = await analyzeDirectory(distPath);

      // Enhanced analysis
      await printBuildAnalysis(assets, buildTime);
      await analyzeCompressionRatio(distPath);
      await analyzeChunkingStrategy(assets);
      await checkPerformanceMetrics(assets, buildTime);

      resolve();
    });
  });
}

async function printBuildAnalysis(assets, buildTime) {
  console.log('📊 Build Performance Analysis:\n');
  console.log(`⏱️  Total build time: ${(buildTime / 1000).toFixed(2)}s`);
  console.log(`📁 Total files: ${assets.totalFiles}`);
  console.log(`📏 Total size: ${formatBytes(assets.totalSize)}`);

  // Calculate size by type
  const sizeByType = assets.files.reduce((acc, file) => {
    const type = file.type || 'other';
    acc[type] = (acc[type] || 0) + file.size;
    return acc;
  }, {});

  console.log('\n📦 Size breakdown by type:');
  Object.entries(sizeByType)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, size]) => {
      const percentage = ((size / assets.totalSize) * 100).toFixed(1);
      console.log(`  ${type.padEnd(12)}: ${formatBytes(size).padStart(10)} (${percentage}%)`);
    });

  // Group by type for detailed analysis
  const grouped = assets.files.reduce((acc, file) => {
    const type = file.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(file);
    return acc;
  }, {});

  console.log('\n📋 Detailed file breakdown:');
  Object.entries(grouped).forEach(([type, files]) => {
    console.log(`\n${type.toUpperCase()}:`);
    files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10) // Show top 10 files per type
      .forEach(file => {
        console.log(`  ${file.name.padEnd(60)} ${formatBytes(file.size).padStart(10)}`);
      });

    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more files`);
    }
  });
}

async function analyzeCompressionRatio(distPath) {
  console.log('\n🗜️  Compression Analysis:');

  const compressedFiles = [];

  // Find compressed files
  const files = await fs.readdir(distPath, { recursive: true });

  for (const file of files) {
    if (file.endsWith('.gz') || file.endsWith('.br')) {
      const compressedPath = path.join(distPath, file);
      const originalPath = compressedPath.replace(/\.(gz|br)$/, '');

      try {
        const [compressedStats, originalStats] = await Promise.all([
          fs.stat(compressedPath),
          fs.stat(originalPath),
        ]);

        const ratio = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);
        const type = file.endsWith('.gz') ? 'gzip' : 'brotli';

        compressedFiles.push({
          file: path.basename(originalPath),
          original: originalStats.size,
          compressed: compressedStats.size,
          ratio,
          type,
        });
      } catch (_e) {
        // Original file might not exist or be accessible
      }
    }
  }

  if (compressedFiles.length > 0) {
    console.log('  Compression ratios:');
    compressedFiles
      .sort((a, b) => b.original - a.original)
      .forEach(({ file, original, compressed, ratio, type }) => {
        console.log(`    ${file.padEnd(50)} ${formatBytes(original)} → ${formatBytes(compressed)} (${ratio}% ${type})`);
      });

    const totalOriginal = compressedFiles.reduce((sum, f) => sum + f.original, 0);
    const totalCompressed = compressedFiles.reduce((sum, f) => sum + f.compressed, 0);
    const overallRatio = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

    console.log(`  📈 Overall compression: ${formatBytes(totalOriginal)} → ${formatBytes(totalCompressed)} (${overallRatio}%)`);
  } else {
    console.log('  ⚠️  No compressed files found. Consider enabling compression plugins.');
  }
}

async function analyzeChunkingStrategy(assets) {
  console.log('\n🧩 Chunking Strategy Analysis:');

  const jsFiles = assets.files.filter(f => f.type === 'javascript');

  if (jsFiles.length === 0) {
    console.log('  ⚠️  No JavaScript files found.');
    return;
  }

  console.log(`  📦 Total JavaScript chunks: ${jsFiles.length}`);

  // Analyze chunk distribution
  const chunkSizes = jsFiles.map(f => f.size).sort((a, b) => b - a);
  const totalJSSize = chunkSizes.reduce((sum, size) => sum + size, 0);

  console.log(`  📏 Total JavaScript size: ${formatBytes(totalJSSize)}`);

  if (chunkSizes.length > 0) {
    console.log(`  📊 Largest chunk: ${formatBytes(chunkSizes[0])}`);
    console.log(`  📊 Smallest chunk: ${formatBytes(chunkSizes[chunkSizes.length - 1])}`);
    console.log(`  📊 Average chunk size: ${formatBytes(totalJSSize / chunkSizes.length)}`);
  }

  // Check for optimal chunk distribution
  const largeChunks = jsFiles.filter(f => f.size > 500 * 1024);
  const optimalChunks = jsFiles.filter(f => f.size >= 50 * 1024 && f.size <= 500 * 1024);
  const smallChunks = jsFiles.filter(f => f.size < 50 * 1024);

  console.log('\n  📋 Chunk size distribution:');
  console.log(`    🔴 Large chunks (>500KB): ${largeChunks.length}`);
  console.log(`    🟢 Optimal chunks (50KB-500KB): ${optimalChunks.length}`);
  console.log(`    🟡 Small chunks (<50KB): ${smallChunks.length}`);

  if (largeChunks.length > 0) {
    console.log('\n  ⚠️  Large chunks detected:');
    largeChunks.forEach(chunk => {
      console.log(`    ${chunk.name}: ${formatBytes(chunk.size)}`);
    });
    console.log('    💡 Consider splitting large chunks for better loading performance.');
  }

  if (smallChunks.length > 3) {
    console.log('\n  ⚠️  Many small chunks detected. Consider bundling some together.');
  }
}

async function checkPerformanceMetrics(assets, buildTime) {
  console.log('\n🚀 Performance Metrics:');

  // Build time assessment
  const buildScore = buildTime < 10000 ? '🟢 Excellent' :
    buildTime < 30000 ? '🟡 Good' : '🔴 Needs improvement';
  console.log(`  ⏱️  Build speed: ${buildScore} (${(buildTime / 1000).toFixed(2)}s)`);

  // Bundle size assessment
  const totalSize = assets.totalSize;
  const sizeScore = totalSize < 1024 * 1024 ? '🟢 Excellent' :
    totalSize < 3 * 1024 * 1024 ? '🟡 Good' : '🔴 Large';
  console.log(`  📏 Bundle size: ${sizeScore} (${formatBytes(totalSize)})`);

  // File count assessment
  const fileScore = assets.totalFiles < 20 ? '🟢 Optimal' :
    assets.totalFiles < 50 ? '🟡 Acceptable' : '🔴 Too many files';
  console.log(`  📁 File count: ${fileScore} (${assets.totalFiles} files)`);

  // Check for stats.html
  const statsPath = path.join(path.join(__dirname, '..', 'dist'), 'stats.html');
  try {
    await fs.access(statsPath);
    console.log('\n📈 Bundle visualization available at: dist/stats.html');
    console.log('   💡 Open this file in a browser to explore bundle composition');
  } catch (_e) {
    console.log('\n⚠️  Bundle visualization not generated');
  }

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');

  if (buildTime > 30000) {
    console.log('  • Consider enabling cache or reducing bundle complexity');
  }

  if (totalSize > 2 * 1024 * 1024) {
    console.log('  • Bundle size is large - review chunking strategy');
    console.log('  • Consider lazy loading and code splitting');
  }

  const jsFiles = assets.files.filter(f => f.type === 'javascript');
  const hasLargeChunks = jsFiles.some(f => f.size > 500 * 1024);

  if (hasLargeChunks) {
    console.log('  • Split large chunks for better initial load performance');
  }

  if (assets.totalFiles > 50) {
    console.log('  • Consider bundling more files together to reduce requests');
  }

  const cssFiles = assets.files.filter(f => f.type === 'css');
  const totalCSSSize = cssFiles.reduce((sum, f) => sum + f.size, 0);

  if (totalCSSSize > 200 * 1024) {
    console.log('  • Consider CSS optimization and unused style removal');
  }

  console.log('\n✅ Analysis complete!');
}

async function analyzeDirectory(dir) {
  const files = [];
  let totalSize = 0;
  let totalFiles = 0;

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(dir, fullPath);
        const ext = path.extname(entry.name);

        let type = 'other';
        if (ext === '.js') type = 'javascript';
        else if (ext === '.css') type = 'css';
        else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext)) type = 'images';
        else if (ext === '.html') type = 'html';
        else if (ext === '.map') type = 'sourcemaps';

        files.push({
          name: relativePath,
          size: stats.size,
          type,
        });

        totalSize += stats.size;
        totalFiles++;
      }
    }
  }

  await walk(dir);

  return { files, totalSize, totalFiles };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Run analysis
analyzeBuild().catch(console.error);
