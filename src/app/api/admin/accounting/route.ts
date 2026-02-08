/**
 * API для бухгалтерии
 * GET /api/admin/accounting - финансовая сводка
 * POST /api/admin/accounting - создание транзакции
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, withTechAdminAuth, RequestContext } from '@/lib/auth'
import { isTechAdmin, getOwnerFilter } from '@/lib/rbac'
import { accountingService } from '@/services/accounting.service'
import { adminService } from '@/services/admin.service'
import { TransactionType, TransactionCategory } from '@prisma/client'

async function getHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    
    const ownerFilter = getOwnerFilter(ctx.user)
    const ownerId = ownerFilter.ownerId

    switch (action) {
      case 'summary': {
        const summary = await accountingService.getFinancialSummary(year, month, ownerId)
        return NextResponse.json(summary)
      }

      case 'history': {
        const months = parseInt(searchParams.get('months') || '12')
        const history = await accountingService.getRevenueHistory(months, ownerId)
        return NextResponse.json(history)
      }

      case 'transactions': {
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const type = searchParams.get('type') as TransactionType | null
        const category = searchParams.get('category') as TransactionCategory | null
        const apartmentId = searchParams.get('apartmentId')

        const result = await accountingService.getTransactions({
          page,
          limit,
          type: type || undefined,
          category: category || undefined,
          apartmentId: apartmentId || undefined,
          ownerId,
        })
        return NextResponse.json(result)
      }

      case 'export': {
        const startDate = new Date(searchParams.get('startDate') || new Date(year, month - 1, 1).toISOString())
        const endDate = new Date(searchParams.get('endDate') || new Date(year, month, 0).toISOString())
        
        const csv = await accountingService.exportTransactionsCSV({ startDate, endDate, ownerId })
        
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="transactions_${year}-${month}.csv"`,
          },
        })
      }

      default: {
        // Возвращаем комплексную информацию
        const [summary, history] = await Promise.all([
          accountingService.getFinancialSummary(year, month, ownerId),
          accountingService.getRevenueHistory(12, ownerId),
        ])
        return NextResponse.json({ summary, history })
      }
    }
  } catch (error) {
    console.error('Accounting API error:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки финансовых данных' },
      { status: 500 }
    )
  }
}

async function postHandler(request: NextRequest, ctx: RequestContext) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'createTransaction': {
        const transaction = await accountingService.createTransaction({
          ...data,
          createdBy: ctx.user.id,
        })

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'CREATE',
          entity: 'Transaction',
          entityId: transaction.id,
          details: { type: data.type, amount: data.amount },
        })

        return NextResponse.json(transaction)
      }

      case 'updateTransaction': {
        const { id, ...updateData } = data
        
        if (!id) {
          return NextResponse.json({ error: 'ID транзакции обязателен' }, { status: 400 })
        }

        const transaction = await accountingService.updateTransaction(id, updateData)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'UPDATE',
          entity: 'Transaction',
          entityId: id,
          details: updateData,
        })

        return NextResponse.json(transaction)
      }

      case 'deleteTransaction': {
        const { id } = data
        
        if (!id) {
          return NextResponse.json({ error: 'ID транзакции обязателен' }, { status: 400 })
        }

        await accountingService.deleteTransaction(id)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'DELETE',
          entity: 'Transaction',
          entityId: id,
          details: {},
        })

        return NextResponse.json({ success: true })
      }

      case 'closePeriod': {
        const { year, month } = data
        
        const period = await accountingService.closePeriod(year, month, ctx.user.id)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'UPDATE',
          entity: 'FinancialPeriod',
          entityId: period.id,
          details: { year, month, action: 'close' },
        })

        return NextResponse.json(period)
      }

      case 'getCategoryBudgets': {
        const budgets = await accountingService.getCategoryBudgets(ctx.user.id)
        return NextResponse.json(budgets)
      }

      case 'setCategoryBudget': {
        const { category, budget } = data
        
        if (!category || budget === undefined) {
          return NextResponse.json({ error: 'Категория и бюджет обязательны' }, { status: 400 })
        }

        const result = await accountingService.setCategoryBudget(category, budget, ctx.user.id)

        await adminService.logAction({
          adminId: ctx.user.id,
          action: 'UPDATE',
          entity: 'CategoryBudget',
          entityId: category,
          details: { budget },
        })

        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }
  } catch (error) {
    console.error('Accounting POST error:', error)
    return NextResponse.json(
      { error: 'Ошибка выполнения операции' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(getHandler)
export const POST = withTechAdminAuth(postHandler)
