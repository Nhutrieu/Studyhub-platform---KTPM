import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const imagePath = resolvedParams.path.join('/');
    
    // Security: Prevent path traversal
    if (imagePath.includes('..') || imagePath.startsWith('/')) {
      return new NextResponse('Invalid path', { status: 400 });
    }

    // Path to images in public folder (mounted volume in Docker)
    const fullPath = join(process.cwd(), 'public', 'images', imagePath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(fullPath);
    
    // Determine content type from extension
    const ext = imagePath.split('.').pop()?.toLowerCase();
    const contentType = 
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'webp' ? 'image/webp' :
      ext === 'svg' ? 'image/svg+xml' :
      'application/octet-stream';

    // Return image with proper headers
    // Use shorter cache for dynamic updates, but allow browser caching
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, must-revalidate', // 1 hour cache, but revalidate
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

