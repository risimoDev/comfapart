/**
 * PUT /api/auth/notifications - Сохранить настройки уведомлений
 * GET /api/auth/notifications - Получить настройки уведомлений
 * 
 * Настройки хранятся в preferredLocale как JSON (временное решение)
 * TODO: Добавить отдельное поле notificationSettings в User модель
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const notificationSettingsSchema = z.object({
  emailBookings: z.boolean().optional(),
  emailPromo: z.boolean().optional(),
  emailReviews: z.boolean().optional(),
  pushBookings: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  smsBookings: z.boolean().optional(),
})

// Дефолтные настройки
const defaultSettings = {
  emailBookings: true,
  emailPromo: false,
  emailReviews: true,
  pushBookings: true,
  pushMessages: true,
  smsBookings: true,
}

// GET - получить настройки
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Получаем пользователя с настройками
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        id: true,
        // Пока используем простой подход - возвращаем дефолты
        // В будущем можно добавить поле notificationSettings: Json
      }
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Ищем последнюю настройку в системных уведомлениях
    const settingsNotification = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'notification_settings',
      },
      orderBy: { createdAt: 'desc' },
    })

    let settings = defaultSettings
    if (settingsNotification?.message) {
      try {
        settings = { ...defaultSettings, ...JSON.parse(settingsNotification.message) }
      } catch {
        // ignore parse error
      }
    }

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - сохранить настройки
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const settings = notificationSettingsSchema.parse(body)

    // Сохраняем настройки в системное уведомление
    // Удаляем старую запись и создаём новую
    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'notification_settings',
      }
    })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'notification_settings',
        message: JSON.stringify(settings),
        read: true, // Не показывать как непрочитанное
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Настройки сохранены',
      data: settings,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Save notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
