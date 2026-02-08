/**
 * Страница юридического документа (динамическая)
 * Маршруты: /legal/[slug] -> /privacy, /terms, /offer, /cookies, /personal-data, /operator-info
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar, Shield } from 'lucide-react'
import prisma from '@/lib/prisma'
import { legalService } from '@/services/legal.service'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PageProps {
  params: { slug: string }
}

// Генерация метаданных
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Инициализируем документы при первом обращении
  await legalService.initializeDocuments()
  
  const document = await legalService.getDocumentBySlug(params.slug)
  
  if (!document) {
    return {
      title: 'Документ не найден',
    }
  }

  return {
    title: document.metaTitle || document.title,
    description: document.metaDescription,
  }
}

// Генерация статических путей
export async function generateStaticParams() {
  return [
    { slug: 'privacy' },
    { slug: 'personal-data' },
    { slug: 'terms' },
    { slug: 'offer' },
    { slug: 'cookies' },
    { slug: 'consent' },
    { slug: 'operator-info' },
  ]
}

export default async function LegalDocumentPage({ params }: PageProps) {
  // Инициализируем документы
  await legalService.initializeDocuments()
  
  const document = await legalService.getDocumentBySlug(params.slug)

  if (!document) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться на главную
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-6 h-6 text-primary-600" />
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  Юридический документ
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {document.title}
              </h1>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Версия {document.version}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                Действует с {new Date(document.effectiveDate).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="md:hidden flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Версия {document.version}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 md:p-8">
          <div className="prose prose-gray dark:prose-invert max-w-none
            prose-headings:scroll-mt-20
            prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-6
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
            prose-ul:my-4 prose-li:my-1
            prose-table:my-6
            prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:p-3 prose-th:text-left
            prose-td:p-3 prose-td:border-t prose-td:border-gray-200 dark:prose-td:border-gray-700
            prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 dark:prose-strong:text-white
            prose-hr:my-8 prose-hr:border-gray-200 dark:prose-hr:border-gray-700
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {document.content}
            </ReactMarkdown>
          </div>
        </article>

        {/* Related Documents */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Связанные документы
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {params.slug !== 'privacy' && (
              <Link 
                href="/legal/privacy"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Политика конфиденциальности
                </span>
              </Link>
            )}
            {params.slug !== 'personal-data' && (
              <Link 
                href="/legal/personal-data"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Политика обработки ПД
                </span>
              </Link>
            )}
            {params.slug !== 'terms' && (
              <Link 
                href="/legal/terms"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Пользовательское соглашение
                </span>
              </Link>
            )}
            {params.slug !== 'offer' && (
              <Link 
                href="/legal/offer"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Публичная оферта
                </span>
              </Link>
            )}
            {params.slug !== 'cookies' && (
              <Link 
                href="/legal/cookies"
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Политика cookies
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Есть вопросы?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами:
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="mailto:dpo@comfort-apartments.ru"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Написать на email
            </a>
            <Link
              href="/legal/operator-info"
              className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Информация об операторе
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
