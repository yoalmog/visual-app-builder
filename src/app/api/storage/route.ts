import { NextRequest, NextResponse } from 'next/server';

interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

const globalFileStore: Map<string, StoredFile> =
  (global as any).__BUILDER_STORAGE_STORE__ || new Map<string, StoredFile>();
(global as any).__BUILDER_STORAGE_STORE__ = globalFileStore;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    const all = Array.from(globalFileStore.values());
    return NextResponse.json({ files: all });
  }

  const file = globalFileStore.get(fileId);
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Return signed URL simulation
  const signedUrl = `${file.url}?token=mock_signed_${Date.now()}&expires=${Date.now() + 3600000}`;
  return NextResponse.json({
    file,
    signedUrl,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { name, type, size, contentBase64 } = body;

      if (!name) {
        return NextResponse.json({ error: 'File name is required' }, { status: 400 });
      }

      if (size && size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds 10MB limit (size: ${size} bytes)` },
          { status: 400 }
        );
      }

      const fileType = type || 'application/octet-stream';
      if (type && !ALLOWED_MIME_TYPES.includes(type) && !type.startsWith('image/')) {
        return NextResponse.json(
          { error: `File type '${type}' is not allowed` },
          { status: 400 }
        );
      }

      const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const url = contentBase64
        ? `data:${fileType};base64,${contentBase64}`
        : `/api/storage?fileId=${id}`;

      const stored: StoredFile = {
        id,
        name,
        size: size || 0,
        type: fileType,
        url,
        uploadedAt: new Date().toISOString(),
      };

      globalFileStore.set(id, stored);

      return NextResponse.json({
        success: true,
        file: stored,
      });
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds 10MB limit (size: ${file.size} bytes)` },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `File type '${file.type}' is not allowed` },
          { status: 400 }
        );
      }

      const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const stored: StoredFile = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: `/api/storage?fileId=${id}`,
        uploadedAt: new Date().toISOString(),
      };

      globalFileStore.set(id, stored);

      return NextResponse.json({
        success: true,
        file: stored,
      });
    }

    return NextResponse.json(
      { error: 'Unsupported content type. Use multipart/form-data or application/json' },
      { status: 415 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing file upload' },
      { status: 500 }
    );
  }
}
