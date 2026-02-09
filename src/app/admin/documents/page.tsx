'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Edit,
  Eye,
  Save,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

interface LegalDocument {
  id: string
  type: string
  title: string
  slug: string
  content: string
  version: string
  isActive: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

const documentTypes: Record<string, { label: string; description: string }> = {
  PERSONAL_DATA_POLICY: { 
    label: 'Политика обработки ПД', 
    description: 'Политика в соответствии с 152-ФЗ' 
  },
  TERMS_OF_SERVICE: { 
    label: 'Условия использования', 
    description: 'Пользовательское соглашение' 
  },
  PRIVACY_POLICY: { 
    label: 'Политика конфиденциальности', 
    description: 'Защита личных данных' 
  },
  COOKIES_POLICY: { 
    label: 'Политика Cookies', 
    description: 'Использование файлов cookie' 
  },
  BOOKING_RULES: { 
    label: 'Правила бронирования', 
    description: 'Условия аренды апартаментов' 
  },
  PUBLIC_OFFER: { 
    label: 'Публичная оферта', 
    description: 'Договор публичной оферты' 
  },
  CONSENT_FORM: { 
    label: 'Форма согласия', 
    description: 'Согласие на обработку ПД' 
  },
}

export default function DocumentsPage() {
  const { accessToken } = useAuth()
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editVersion, setEditVersion] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<LegalDocument | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/legal/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Ошибка загрузки документов')
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (doc: LegalDocument) => {
    setEditingDoc(doc)
    setEditContent(doc.content)
    setEditVersion(doc.version)
  }

  const cancelEdit = () => {
    setEditingDoc(null)
    setEditContent('')
    setEditVersion('')
  }

  const saveDocument = async () => {
    if (!editingDoc) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          content: editContent,
          version: editVersion,
        }),
      })

      if (response.ok) {
        toast.success('Документ сохранён')
        cancelEdit()
        fetchDocuments()
      } else {
        throw new Error('Ошибка сохранения')
      }
    } catch (error) {
      toast.error('Не удалось сохранить документ')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleDocumentStatus = async (doc: LegalDocument) => {
    try {
      const response = await fetch(`/api/admin/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          isActive: !doc.isActive,
        }),
      })

      if (response.ok) {
        toast.success(doc.isActive ? 'Документ деактивирован' : 'Документ активирован')
        fetchDocuments()
      }
    } catch (error) {
      toast.error('Ошибка изменения статуса')
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Юридические документы</h1>
          <p className="text-gray-500 mt-1">Управление правовыми документами сайта</p>
        </div>
        <Button onClick={() => window.open('/legal/personal-data', '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Просмотр на сайте
        </Button>
      </div>

      {/* Documents list */}
      {editingDoc ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">{editingDoc.title}</h2>
              <p className="text-gray-500">
                {documentTypes[editingDoc.type]?.description || editingDoc.type}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
              <Button onClick={saveDocument} loading={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Версия</label>
              <input
                type="text"
                value={editVersion}
                onChange={(e) => setEditVersion(e.target.value)}
                className="w-32 px-3 py-2 border rounded-lg"
                placeholder="1.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Содержимое (Markdown)
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-[500px] px-4 py-3 border rounded-lg font-mono text-sm resize-y"
                placeholder="# Заголовок документа..."
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${doc.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <FileText className={`w-5 h-5 ${doc.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{doc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {documentTypes[doc.type]?.label || doc.type}
                    </p>
                  </div>
                </div>
                <Badge variant={doc.isActive ? 'success' : 'secondary'}>
                  {doc.isActive ? 'Активен' : 'Черновик'}
                </Badge>
              </div>

              <div className="text-sm text-gray-500 space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Версия: {doc.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Обновлён: {formatDate(doc.updatedAt)}</span>
                </div>
                {doc.publishedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Опубликован: {formatDate(doc.publishedAt)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Просмотр
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(doc)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Редактировать
                </Button>
                <Button
                  variant={doc.isActive ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => toggleDocumentStatus(doc)}
                >
                  {doc.isActive ? 'Деактивировать' : 'Активировать'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !editingDoc && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Документы не найдены</h3>
          <p className="text-gray-500 mb-4">
            Юридические документы будут созданы автоматически при первом запуске
          </p>
          <Button onClick={fetchDocuments}>
            Обновить
          </Button>
        </div>
      )}

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">{previewDoc.title}</h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: previewDoc.content }} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
