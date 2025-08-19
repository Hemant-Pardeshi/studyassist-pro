#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const BUILD_DIR = 'build';
const DIST_DIR = 'dist';

// Files to include in the extension package
const EXTENSION_FILES = [
    'manifest.json',
    'background.js',
    'content.js',
    'styles.css',
    'popup.html',
    'popup.js',
    'icons/'
];

async function createZip() {
    console.log('🏗️  Creating extension package...');

    // Ensure directories exist
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    // Copy files to build directory
    console.log('📁 Copying files to build directory...');
    for (const file of EXTENSION_FILES) {
        const srcPath = path.join('.', file);
        const destPath = path.join(BUILD_DIR, file);

        if (fs.existsSync(srcPath)) {
            const stat = fs.statSync(srcPath);

            if (stat.isDirectory()) {
                // Copy directory recursively
                copyDir(srcPath, destPath);
                console.log(`   ✅ Copied directory: ${file}`);
            } else {
                // Copy file
                fs.copyFileSync(srcPath, destPath);
                console.log(`   ✅ Copied file: ${file}`);
            }
        } else {
            console.log(`   ⚠️  File not found (skipping): ${file}`);
        }
    }

    // Create ZIP file
    console.log('📦 Creating ZIP package...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipPath = path.join(DIST_DIR, `studyassist-pro-${timestamp}.zip`);

    await createZipFile(BUILD_DIR, zipPath);

    // Also create a generic version
    const genericZipPath = path.join(DIST_DIR, 'extension.zip');
    await createZipFile(BUILD_DIR, genericZipPath);

    console.log('✅ Package created successfully!');
    console.log(`   📦 ${zipPath}`);
    console.log(`   📦 ${genericZipPath}`);

    // Show package info
    const stats = fs.statSync(zipPath);
    console.log(`   📊 Package size: ${(stats.size / 1024).toFixed(2)} KB`);
}

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function createZipFile(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

// Run if called directly
if (require.main === module) {
    createZip().catch(console.error);
}

module.exports = { createZip };
