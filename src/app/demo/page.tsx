'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  // Layout
  Container,
  PageLayout,
  PageHeader,
  Section,
  Grid,
  Flex,
  Spacer,
  Divider,
  
  // Buttons
  Button,
  
  // Inputs
  Input,
  SearchInput,
  PasswordInput,
  Textarea,
  Select,
  MultiSelect,
  DatePicker,
  DateRangePicker,
  
  // Badges
  Badge,
  StatusBadge,
  CounterBadge,
  BookingStatusBadge,
  ApartmentStatusBadge,
  PriorityBadge,
  
  // Cards
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatsCard,
  
  // Table
  Table,
  type Column,
  
  // Tabs
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  
  // Modal
  Modal,
  Sheet,
  
  // States
  EmptyState,
  ErrorState,
  LoadingState,
  Skeleton,
} from '@/components/ui'

import {
  Plus,
  Search,
  Settings,
  Bell,
  User,
  Home,
  Calendar,
  Star,
  Heart,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  Building,
  ArrowRight
} from 'lucide-react'

// Sample data for table
interface SampleUser {
  id: number
  name: string
  email: string
  role: string
  status: 'online' | 'offline' | 'away'
  createdAt: string
}

const sampleUsers: SampleUser[] = [
  { id: 1, name: 'Александр Иванов', email: 'alex@example.com', role: 'Admin', status: 'online', createdAt: '2024-01-15' },
  { id: 2, name: 'Мария Петрова', email: 'maria@example.com', role: 'Manager', status: 'away', createdAt: '2024-01-20' },
  { id: 3, name: 'Дмитрий Сидоров', email: 'dmitry@example.com', role: 'User', status: 'offline', createdAt: '2024-02-01' },
  { id: 4, name: 'Екатерина Козлова', email: 'kate@example.com', role: 'User', status: 'online', createdAt: '2024-02-10' },
  { id: 5, name: 'Сергей Николаев', email: 'sergey@example.com', role: 'Manager', status: 'online', createdAt: '2024-02-15' },
]

const columns: Column<SampleUser>[] = [
  {
    key: 'name',
    header: 'Имя',
    cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {row.name.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-neutral-500">{row.email}</p>
        </div>
      </div>
    ),
    sortable: true,
  },
  {
    key: 'role',
    header: 'Роль',
    cell: (row) => <Badge variant={row.role === 'Admin' ? 'primary' : row.role === 'Manager' ? 'info' : 'default'}>{row.role}</Badge>,
    sortable: true,
  },
  {
    key: 'status',
    header: 'Статус',
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: 'createdAt',
    header: 'Дата регистрации',
    sortable: true,
  },
]

export default function ComponentsDemo() {
  // States
  const [modalOpen, setModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null })
  const [selectedValue, setSelectedValue] = useState('')
  const [multiValue, setMultiValue] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('buttons')
  const [tablePage, setTablePage] = useState(1)
  const [sortKey, setSortKey] = useState<string | undefined>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)
  
  // Handlers
  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key)
    setSortDirection(direction)
  }
  
  const selectOptions = [
    { value: 'option1', label: 'Первый вариант' },
    { value: 'option2', label: 'Второй вариант' },
    { value: 'option3', label: 'Третий вариант' },
    { value: 'option4', label: 'Четвёртый вариант' },
  ]
  
  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="UI Components"
        description="Премиальная дизайн-система для Comfort Apartments"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
              Настройки
            </Button>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Добавить
            </Button>
          </div>
        }
      />
      
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="buttons">Кнопки</TabsTrigger>
          <TabsTrigger value="inputs">Формы</TabsTrigger>
          <TabsTrigger value="badges">Бейджи</TabsTrigger>
          <TabsTrigger value="cards">Карточки</TabsTrigger>
          <TabsTrigger value="table">Таблица</TabsTrigger>
          <TabsTrigger value="modals">Модалки</TabsTrigger>
          <TabsTrigger value="states">Состояния</TabsTrigger>
        </TabsList>
        
        {/* Buttons Tab */}
        <TabsContent value="buttons">
          <Section title="Варианты кнопок">
            <Flex wrap gap="sm" className="mb-6">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
            </Flex>
          </Section>
          
          <Section title="Размеры">
            <Flex wrap gap="sm" align="end" className="mb-6">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </Flex>
          </Section>
          
          <Section title="С иконками">
            <Flex wrap gap="sm" className="mb-6">
              <Button leftIcon={<Plus className="w-4 h-4" />}>Добавить</Button>
              <Button rightIcon={<ArrowRight className="w-4 h-4" />}>Продолжить</Button>
              <Button leftIcon={<Download className="w-4 h-4" />} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Скачать отчёт
              </Button>
              <Button variant="outline" leftIcon={<Heart className="w-4 h-4" />}>
                В избранное
              </Button>
            </Flex>
          </Section>
          
          <Section title="Состояния">
            <Flex wrap gap="sm" className="mb-6">
              <Button loading>Загрузка...</Button>
              <Button disabled>Отключена</Button>
              <Button variant="outline" loading>Сохранение</Button>
            </Flex>
          </Section>
        </TabsContent>
        
        {/* Inputs Tab */}
        <TabsContent value="inputs">
          <Grid cols={2} gap="lg">
            <Section title="Текстовые поля">
              <div className="space-y-4">
                <Input label="Имя" placeholder="Введите имя" />
                <Input label="Email" type="email" placeholder="example@mail.com" hint="Мы не будем спамить" />
                <Input label="С ошибкой" placeholder="Введите значение" error="Поле обязательно для заполнения" />
                <Input label="Успех" placeholder="Проверено" success="Данные корректны" />
                <Input label="Отключено" placeholder="Недоступно" disabled />
              </div>
            </Section>
            
            <Section title="Специальные поля">
              <div className="space-y-4">
                <SearchInput placeholder="Поиск..." />
                <PasswordInput label="Пароль" placeholder="Введите пароль" />
                <Input 
                  label="С иконками" 
                  placeholder="Поиск по адресу"
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
                <Textarea label="Комментарий" placeholder="Напишите что-нибудь..." rows={4} />
              </div>
            </Section>
            
            <Section title="Селекты">
              <div className="space-y-4">
                <Select
                  label="Одиночный выбор"
                  placeholder="Выберите вариант"
                  options={selectOptions}
                  value={selectedValue}
                  onChange={setSelectedValue}
                />
                <MultiSelect
                  label="Множественный выбор"
                  placeholder="Выберите варианты"
                  options={selectOptions}
                  value={multiValue}
                  onChange={setMultiValue}
                />
              </div>
            </Section>
            
            <Section title="Выбор даты">
              <div className="space-y-4">
                <DatePicker
                  label="Одна дата"
                  placeholder="Выберите дату"
                  value={selectedDate}
                  onChange={setSelectedDate}
                />
                <DateRangePicker
                  label="Диапазон дат"
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
            </Section>
          </Grid>
        </TabsContent>
        
        {/* Badges Tab */}
        <TabsContent value="badges">
          <Section title="Базовые варианты">
            <Flex wrap gap="sm" className="mb-6">
              <Badge>Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="purple">Purple</Badge>
              <Badge variant="outline">Outline</Badge>
            </Flex>
          </Section>
          
          <Section title="Размеры">
            <Flex wrap gap="sm" align="center" className="mb-6">
              <Badge size="xs" variant="primary">Extra Small</Badge>
              <Badge size="sm" variant="primary">Small</Badge>
              <Badge size="md" variant="primary">Medium</Badge>
              <Badge size="lg" variant="primary">Large</Badge>
            </Flex>
          </Section>
          
          <Section title="С индикатором">
            <Flex wrap gap="sm" className="mb-6">
              <Badge dot variant="success">Активен</Badge>
              <Badge dot variant="warning">Ожидание</Badge>
              <Badge dot variant="danger">Ошибка</Badge>
            </Flex>
          </Section>
          
          <Section title="Статусы бронирований">
            <Flex wrap gap="sm" className="mb-6">
              <BookingStatusBadge status="PENDING" />
              <BookingStatusBadge status="CONFIRMED" />
              <BookingStatusBadge status="PAID" />
              <BookingStatusBadge status="CANCELED" />
              <BookingStatusBadge status="COMPLETED" />
            </Flex>
          </Section>
          
          <Section title="Статусы апартаментов">
            <Flex wrap gap="sm" className="mb-6">
              <ApartmentStatusBadge status="DRAFT" />
              <ApartmentStatusBadge status="PUBLISHED" />
              <ApartmentStatusBadge status="HIDDEN" />
              <ApartmentStatusBadge status="ARCHIVED" />
            </Flex>
          </Section>
          
          <Section title="Приоритеты">
            <Flex wrap gap="sm" className="mb-6">
              <PriorityBadge priority="low" />
              <PriorityBadge priority="medium" />
              <PriorityBadge priority="high" />
              <PriorityBadge priority="urgent" />
            </Flex>
          </Section>
          
          <Section title="Счётчики">
            <Flex wrap gap="md" className="mb-6">
              <div className="relative">
                <Bell className="w-6 h-6 text-neutral-600" />
                <CounterBadge count={5} className="absolute -top-1 -right-1" />
              </div>
              <div className="relative">
                <Mail className="w-6 h-6 text-neutral-600" />
                <CounterBadge count={23} className="absolute -top-1 -right-1" />
              </div>
              <div className="relative">
                <Bell className="w-6 h-6 text-neutral-600" />
                <CounterBadge count={150} max={99} className="absolute -top-1 -right-1" />
              </div>
            </Flex>
          </Section>
          
          <Section title="Статусы присутствия">
            <Flex wrap gap="md" className="mb-6">
              <StatusBadge status="online" />
              <StatusBadge status="away" />
              <StatusBadge status="busy" />
              <StatusBadge status="offline" />
            </Flex>
          </Section>
        </TabsContent>
        
        {/* Cards Tab */}
        <TabsContent value="cards">
          <Section title="Базовые карточки">
            <Grid cols={3}>
              <Card>
                <CardHeader>
                  <CardTitle>Заголовок карточки</CardTitle>
                  <CardDescription>Описание карточки с дополнительной информацией</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Содержимое карточки может быть любым.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="ghost">Отмена</Button>
                  <Button size="sm">Сохранить</Button>
                </CardFooter>
              </Card>
              
              <Card hoverable>
                <CardHeader>
                  <CardTitle>Интерактивная</CardTitle>
                  <CardDescription>Карточка с hover эффектом</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Наведите курсор для эффекта.
                  </p>
                </CardContent>
              </Card>
              
              <Card variant="outline">
                <CardHeader>
                  <CardTitle>Outline вариант</CardTitle>
                  <CardDescription>Более лёгкий стиль</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Минималистичный дизайн.
                  </p>
                </CardContent>
              </Card>
            </Grid>
          </Section>
          
          <Spacer size="lg" />
          
          <Section title="Статистические карточки">
            <Grid cols={4}>
              <StatsCard
                title="Всего бронирований"
                value="1,234"
                change={{ value: 12.5, trend: 'up' }}
                icon={<Calendar className="w-5 h-5" />}
              />
              <StatsCard
                title="Активные гости"
                value="89"
                change={{ value: 5.2, trend: 'up' }}
                icon={<Users className="w-5 h-5" />}
              />
              <StatsCard
                title="Доход"
                value="₽2.4M"
                change={{ value: 3.1, trend: 'down' }}
                icon={<DollarSign className="w-5 h-5" />}
              />
              <StatsCard
                title="Апартаменты"
                value="24"
                icon={<Building className="w-5 h-5" />}
              />
            </Grid>
          </Section>
        </TabsContent>
        
        {/* Table Tab */}
        <TabsContent value="table">
          <Section title="Таблица с данными">
            <Table
              data={sampleUsers}
              columns={columns}
              keyExtractor={(row) => row.id}
              sortable
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              selectable
              hoverable
              pagination={{
                page: tablePage,
                pageSize: 10,
                total: 50,
                onPageChange: setTablePage,
                pageSizeOptions: [10, 20, 50],
              }}
              rowActions={(row) => (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="xs" leftIcon={<Edit className="w-3 h-3" />} />
                  <Button variant="ghost" size="xs" leftIcon={<Trash2 className="w-3 h-3 text-danger-500" />} />
                </div>
              )}
            />
          </Section>
        </TabsContent>
        
        {/* Modals Tab */}
        <TabsContent value="modals">
          <Section title="Диалоги и модальные окна">
            <Flex gap="md">
              <Button onClick={() => setModalOpen(true)}>
                Открыть модалку
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(true)}>
                Открыть боковую панель
              </Button>
              {/* Toast buttons removed - need ToastProvider wrapper */}
            </Flex>
          </Section>
          
          {/* Modal */}
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Подтверждение действия"
            description="Вы уверены, что хотите продолжить? Это действие нельзя отменить."
            size="md"
          >
            <div className="space-y-4">
              <Input label="Причина" placeholder="Укажите причину" />
              <Textarea label="Комментарий" placeholder="Дополнительная информация..." rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Отмена
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                Подтвердить
              </Button>
            </div>
          </Modal>
          
          {/* Sheet */}
          <Sheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Настройки"
            description="Управление параметрами приложения"
            position="right"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Уведомления</h3>
                <Input label="Email для уведомлений" placeholder="email@example.com" />
              </div>
              <Divider />
              <div className="space-y-4">
                <h3 className="font-medium">Безопасность</h3>
                <PasswordInput label="Новый пароль" placeholder="Введите пароль" />
              </div>
            </div>
          </Sheet>
        </TabsContent>
        
        {/* States Tab */}
        <TabsContent value="states">
          <Grid cols={2} gap="lg">
            <Section title="Пустые состояния">
              <Card>
                <EmptyState
                  variant="no-results"
                  compact
                  action={{
                    label: 'Сбросить фильтры',
                    onClick: () => {},
                  }}
                />
              </Card>
            </Section>
            
            <Section title="Ошибки">
              <Card>
                <ErrorState
                  variant="network"
                  compact
                  onRetry={() => {}}
                  showHomeButton={false}
                />
              </Card>
            </Section>
            
            <Section title="Загрузка">
              <Card>
                <LoadingState message="Загрузка данных..." />
              </Card>
            </Section>
            
            <Section title="Скелетоны">
              <Card>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="flex gap-2 mt-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Section>
          </Grid>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
