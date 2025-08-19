#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BUILD_DIR = 'build';

async function buildExtension() {
    console.log('🏗️  Building Chrome extension...');

    // Create build directory
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    // Read manifest to get file list
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    console.log(`📋 Building ${manifest.name} v${manifest.version}`);

    // Files to process
    const files = [
        'manifest.json',
        'background.js',
        'content.js',
        'styles.css',
        'popup.html',
        'popup.js'
    ];

    // Copy and process files
    for (const file of files) {
        if (fs.existsSync(file)) {
            console.log(`   Processing ${file}...`);

            const content = fs.readFileSync(file, 'utf8');
            let processedContent = content;

            // Basic optimizations based on file type
            if (file.endsWith('.js')) {
                processedContent = optimizeJavaScript(content);
            } else if (file.endsWith('.css')) {
                processedContent = optimizeCSS(content);
            }

            fs.writeFileSync(path.join(BUILD_DIR, file), processedContent);

            const originalSize = Buffer.byteLength(content, 'utf8');
            const newSize = Buffer.byteLength(processedContent, 'utf8');
            const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

            console.log(`   ✅ ${file}: ${originalSize} → ${newSize} bytes (-${savings}%)`);
        }
    }

    // Copy icons directory if it exists
    if (fs.existsSync('icons')) {
        copyDirectory('icons', path.join(BUILD_DIR, 'icons'));
        console.log('   ✅ Copied icons directory');
    }

    // Generate build info
    const buildInfo = {
        buildTime: new Date().toISOString(),
        version: manifest.version,
        files: fs.readdirSync(BUILD_DIR),
        commit: process.env.GITHUB_SHA || 'local-build'
    };

    fs.writeFileSync(
        path.join(BUILD_DIR, 'build-info.json'),
        JSON.stringify(buildInfo, null, 2)
    );

    console.log('✅ Build completed successfully!');
    console.log(`   📁 Output directory: ${BUILD_DIR}`);

    // Show build summary
    const totalSize = getTotalSize(BUILD_DIR);
    console.log(`   📊 Total build size: ${(totalSize / 1024).toFixed(2)} KB`);
}

function optimizeJavaScript(content) {
    // Basic JavaScript optimization
    return content
        // Remove single-line comments (but preserve URLs and regexes)
        .replace(/^[ \t]*\/\/.*$/gm, '')
        // Remove empty lines
        .replace(/^\s*\n/gm, '')
        // Remove trailing whitespace
        .replace(/[ \t]+$/gm, '')
        // Compress multiple newlines
        .replace(/\n{3,}/g, '\n\n');
}

function optimizeCSS(content) {
    // Basic CSS optimization
    return content
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove empty lines
        .replace(/^\s*\n/gm, '')
        // Remove trailing whitespace
        .replace(/[ \t]+$/gm, '')
        // Compress multiple newlines
        .replace(/\n{2,}/g, '\n');
}

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function getTotalSize(dir) {
    let totalSize = 0;

    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(dir, file.name);

        if (file.isDirectory()) {
            totalSize += getTotalSize(filePath);
        } else {
            totalSize += fs.statSync(filePath).size;
        }
    }

    return totalSize;
}

// Run if called directly
if (require.main === module) {
    buildExtension().catch(console.error);
}

module.exports = { buildExtension };
