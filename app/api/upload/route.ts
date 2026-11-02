import { NextRequest, NextResponse } from 'next/server';
import { getActiveUserSession } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function isValidImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return true;
  }
  // GIF: GIF87a or GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return true;
  }
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getActiveUserSession(req);
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền tải ảnh lên' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Chưa chọn file ảnh' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Dung lượng ảnh tối đa không vượt quá 5MB' },
        { status: 400 }
      );
    }

    const safeExt = ALLOWED_MIME_TO_EXT[(file.type || '').toLowerCase()];
    if (!safeExt) {
      return NextResponse.json(
        { error: 'Chỉ chấp nhận định dạng ảnh JPG, PNG, WEBP hoặc GIF' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isValidImageBuffer(buffer)) {
      return NextResponse.json(
        { error: 'Nội dung file tải lên không phải là ảnh hợp lệ' },
        { status: 400 }
      );
    }

    const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${safeExt}`;
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/images/uploads/${fileName}`,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi tải ảnh lên' },
      { status: 500 }
    );
  }
}

