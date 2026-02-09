import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { getUserFromRequest } from '@/lib/auth'
import { hasAdminAccess } from '@/lib/rbac'

// Генерация уникального имени файла
function generateFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `apt-${timestamp}-${random}${ext}`
}

// Проверка допустимых типов файлов
function isValidImageType(mimeType: string): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return allowedTypes.includes(mimeType)
}

// Максимальный размер файла (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const user = await getUserFromRequest(request)
    
    if (!user || !hasAdminAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Файлы не загружены' },
        { status: 400 }
      )
    }

    // Проверка каждого файла
    for (const file of files) {
      if (!isValidImageType(file.type)) {
        return NextResponse.json(
          { success: false, error: `Недопустимый тип файла: ${file.name}. Разрешены: JPEG, PNG, WebP, GIF` },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `Файл ${file.name} превышает максимальный размер 5MB` },
          { status: 400 }
        )
      }
    }

    // Создаём директорию для загрузок, если её нет
    const uploadDir = path.join(process.cwd(), 'public', 'apartments')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Сохраняем файлы
    const uploadedImages: { url: string; originalName: string }[] = []

    for (const file of files) {
      const fileName = generateFileName(file.name)
      const filePath = path.join(uploadDir, fileName)
      
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      await writeFile(filePath, buffer)
      
      uploadedImages.push({
        url: `/apartments/${fileName}`,
        originalName: file.name,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        images: uploadedImages,
        count: uploadedImages.length,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки файлов' },
      { status: 500 }
    )
  }
}
