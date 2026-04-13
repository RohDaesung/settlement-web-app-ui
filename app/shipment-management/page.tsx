'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { diffWordsWithSpace } from 'diff'
import { supabase } from '@/lib/supabase/client'

import {
  ArrowLeft,
  Building2,
  Filter,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Package,
  Package2,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
  Expand,
} from 'lucide-react'

type Locale = 'ko' | 'zh'
type ProgressType = '진행중' | '완료'
type FilterType = '전체' | ProgressType
type RoleType = 'admin' | 'manager' | 'buyer' | ''
type ColumnType = 'text' | 'image'
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type Brand = {
  id: string
  name: string
}

type Column = {
  id: string
  brand_id: string | null
  key: string
  label_ko: string
  label_zh: string
  column_type: ColumnType
  width: number | null
  min_width: number | null
  sort_order: number
  is_system: boolean
  created_at?: string
  updated_at?: string
}

type Row = {
  id: string
  brand_id: string | null
  progress: ProgressType
  sort_order: number
  created_at?: string
  updated_at?: string
}

type Cell = {
  id?: string
  row_id: string
  column_id: string
  value: string | null
  created_at?: string
  updated_at?: string
}

type CellSnapshot = {
  id?: string
  row_id: string
  column_id: string
  snapshot_date: string
  value: string | null
  created_at?: string
  updated_at?: string
}

const STORAGE_BUCKET = 'shipment-images'
const SNAPSHOT_TABLE = 'shipment_cell_daily_snapshots'
const AUTO_SAVE_MS = 1200
const DEFAULT_TEXT_WIDTH = 180
const DEFAULT_IMAGE_WIDTH = 220
const MIN_TEXT_WIDTH = 120
const MIN_IMAGE_WIDTH = 180

function ui(locale: Locale) {
  return {
    pageTitle: locale === 'ko' ? '출고 관리' : '出货管理',
    pageSubtitle:
      locale === 'ko'
        ? '브랜드별 출고 데이터를 정리하고 관리합니다.'
        : '按品牌整理并管理出货数据。',
    brand: locale === 'ko' ? '브랜드' : '品牌',
    total: locale === 'ko' ? '총 건수' : '总数',
    addRow: locale === 'ko' ? '행 추가' : '添加行',
    addColumn: locale === 'ko' ? '열 추가' : '添加列',
    save: locale === 'ko' ? '저장' : '保存',
    delete: locale === 'ko' ? '삭제' : '删除',
    back: locale === 'ko' ? '돌아가기' : '返回',
    dailyShipment: locale === 'ko' ? '일일 출고 수량' : '每日出货数量',
    searchPlaceholder:
      locale === 'ko'
        ? '품번, 내용, 비고, 출고일정 검색'
        : '搜索款号、内容、备注、出货日程',
    all: locale === 'ko' ? '전체' : '全部',
    inProgress: locale === 'ko' ? '진행중' : '进行中',
    done: locale === 'ko' ? '완료' : '完成',
    noImage: locale === 'ko' ? '이미지 없음' : '无图片',
    saved: locale === 'ko' ? '저장되었습니다.' : '已保存。',
    saveError: locale === 'ko' ? '저장 실패' : '保存失败',
    status: locale === 'ko' ? '상태' : '状态',
    manage: locale === 'ko' ? '관리' : '管理',
    totalView: locale === 'ko' ? '전체 보기' : '全部查看',
    noResult: locale === 'ko' ? '검색 결과가 없습니다.' : '没有搜索结果。',
    adminGuide:
      locale === 'ko'
        ? '브랜드별 출고 데이터를 엑셀처럼 관리할 수 있습니다.'
        : '可像 Excel 一样管理各品牌出货数据。',
    buyerGuide:
      locale === 'ko'
        ? '브랜드별 출고 내용을 확인할 수 있습니다.'
        : '可以查看品牌出货内容。',
    loading: locale === 'ko' ? '불러오는 중...' : '加载中...',
    addColumnTitle: locale === 'ko' ? '새 열 추가' : '新增列',
    labelKo: locale === 'ko' ? '한국어 이름' : '韩文名称',
    labelZh: locale === 'ko' ? '중국어 이름' : '中文名称',
    columnType: locale === 'ko' ? '열 타입' : '列类型',
    textType: locale === 'ko' ? '텍스트' : '文本',
    imageType: locale === 'ko' ? '이미지' : '图片',
    cancel: locale === 'ko' ? '취소' : '取消',
    create: locale === 'ko' ? '생성' : '创建',
    removeImage: locale === 'ko' ? '삭제' : '删除图片',
    uploadImage: locale === 'ko' ? '업로드' : '上传图片',
    imageUploadingNow: locale === 'ko' ? '업로드중...' : '上传中...',
    addRowNeedBrand:
      locale === 'ko'
        ? '전체 보기 상태에서는 행을 추가할 수 없습니다. 브랜드를 선택하세요.'
        : '全部查看状态下无法新增行。请选择品牌。',
    columnKoRequired:
      locale === 'ko' ? '한국어 열 이름을 입력하세요.' : '请输入韩文列名。',
    columnZhRequired:
      locale === 'ko' ? '중국어 열 이름을 입력하세요.' : '请输入中文列名。',
    systemColumnDeleteBlocked:
      locale === 'ko' ? '기본 열은 삭제할 수 없습니다.' : '基础列不可删除。',
    deleteColumnConfirm:
      locale === 'ko'
        ? '이 열을 삭제하시겠습니까? 해당 열 데이터도 함께 삭제됩니다.'
        : '确定删除该列吗？该列数据也会一起删除。',
    deleteRowConfirm:
      locale === 'ko' ? '이 행을 삭제하시겠습니까?' : '确定删除该行吗？',
    deleteImageConfirm:
      locale === 'ko' ? '이미지를 삭제하시겠습니까?' : '确定删除图片吗？',
    saveConfirm:
      locale === 'ko' ? '지금 내용을 저장하시겠습니까?' : '确定现在保存吗？',
    addRowConfirm:
      locale === 'ko' ? '새 행을 추가하시겠습니까?' : '确定新增一行吗？',
    addColumnConfirm:
      locale === 'ko' ? '새 열을 추가하시겠습니까?' : '确定新增一列吗？',
    rowAddError: locale === 'ko' ? '행 추가 실패' : '新增行失败',
    rowDeleteError: locale === 'ko' ? '행 삭제 실패' : '删除行失败',
    columnAddError: locale === 'ko' ? '열 추가 실패' : '新增列失败',
    columnDeleteError: locale === 'ko' ? '열 삭제 실패' : '删除列失败',
    imageUploadError:
      locale === 'ko' ? '이미지 업로드 실패' : '图片上传失败',
    authError:
      locale === 'ko' ? '권한 정보를 불러오지 못했습니다.' : '无法读取权限信息。',
    imageAlt: locale === 'ko' ? '출고 이미지' : '出货图片',
    commonColumnGuide:
      locale === 'ko'
        ? '공통 컬럼으로 생성됩니다. (brand_id = null)'
        : '将创建为公共列。(brand_id = null)',
    rowDelete: locale === 'ko' ? '행 삭제' : '删除行',
    onlyImageFile:
      locale === 'ko' ? '이미지 파일만 업로드 가능합니다.' : '只能上传图片文件。',
    savingNow: locale === 'ko' ? '저장중...' : '保存中...',
    autoSaved: locale === 'ko' ? '자동저장 완료' : '自动保存完成',
    unsaved: locale === 'ko' ? '변경사항 있음' : '有未保存更改',
    saveFailed: locale === 'ko' ? '저장 오류' : '保存错误',
    manualSave: locale === 'ko' ? '저장' : '保存',
    orderGuide:
      locale === 'ko'
        ? '핸들을 잡고 드래그해서 순서를 바꾸세요.'
        : '拖动手柄即可调整顺序。',
    resizeGuide:
      locale === 'ko'
        ? '헤더 오른쪽 경계를 드래그하면 열 너비가 바뀝니다.'
        : '拖动表头右侧边界可调整列宽。',
    currentBrand:
      locale === 'ko' ? '현재 보기 브랜드' : '当前查看品牌',
    storageBucketMissing:
      locale === 'ko'
        ? 'Storage 버킷이 없거나 접근할 수 없습니다.'
        : 'Storage bucket 不存在或无法访问。',
    previewImage: locale === 'ko' ? '이미지 크게 보기' : '查看大图',
    close: locale === 'ko' ? '닫기' : '关闭',
    clickToEdit: locale === 'ko' ? '클릭하여 수정' : '点击编辑',
  }
}

function makeColumnKey(labelKo: string, labelZh: string) {
  const base = `${labelKo}_${labelZh}_${Date.now()}`
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w가-힣\u4e00-\u9fff]/g, '')
  return `col_${base || Date.now()}`
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-가-힣\u4e00-\u9fff]/g, '_')
}

function reorderList<T extends { id: string }>(
  list: T[],
  activeId: string,
  overId: string
) {
  const oldIndex = list.findIndex((item) => item.id === activeId)
  const newIndex = list.findIndex((item) => item.id === overId)

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return list

  const next = [...list]
  const [moved] = next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  return next
}

function normalizeSortOrder<T extends { sort_order: number }>(list: T[]) {
  return list.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }))
}

function autoResizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = '0px'
  el.style.height = `${Math.max(56, el.scrollHeight)}px`
}

function getKstDateString() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const kst = new Date(utc + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

function diffHighlightedParts(oldText: string, newText: string) {
  const parts = diffWordsWithSpace(oldText || '', newText || '')

  return parts.map((part, index) => {
    if (part.added) {
      return (
        <mark
          key={index}
          className="rounded-[2px] bg-[#fff0a8] px-[1px] text-[#2f2a24]"
        >
          {part.value}
        </mark>
      )
    }

    if (part.removed) {
      return null
    }

    return <span key={index}>{part.value}</span>
  })
}

export default function ShipmentManagementPage() {
  const router = useRouter()

  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [locale, setLocale] = useState<Locale>('ko')
  const [role, setRole] = useState<RoleType>('')
  const [userBrandId, setUserBrandId] = useState<string | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL')
  const [buyerName, setBuyerName] = useState('Buyer')

  const [brands, setBrands] = useState<Brand[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [cells, setCells] = useState<Cell[]>([])
  const [cellSnapshots, setCellSnapshots] = useState<CellSnapshot[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterType>('전체')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
  const [newColumnKo, setNewColumnKo] = useState('')
  const [newColumnZh, setNewColumnZh] = useState('')
  const [newColumnType, setNewColumnType] = useState<ColumnType>('text')

  const [uploadingCellKey, setUploadingCellKey] = useState<string | null>(null)
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null)
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null)
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null)

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const isHydratingRef = useRef(true)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const resizingRef = useRef<{
    columnId: string
    startX: number
    startWidth: number
    minWidth: number
  } | null>(null)

  const t = ui(locale)

  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const isBuyer = role === 'buyer'
  const canManage = isAdmin || isManager
  const showBrandFilter = isAdmin || isManager
  const showBrandColumn = (isAdmin || isManager) && selectedBrandId === 'ALL'
  const showLocaleSwitcher = !isBuyer
  const showDailyShipmentButton = true

  const selectedBrandObject = brands.find((b) => b.id === selectedBrandId)
  const selectedBrandName =
    selectedBrandId === 'ALL'
      ? t.totalView
      : selectedBrandObject?.name || buyerName

  const todaySnapshotDate = useMemo(() => getKstDateString(), [])

  const brandMap = useMemo(() => {
    return brands.reduce<Record<string, string>>((acc, brand) => {
      acc[brand.id] = brand.name
      return acc
    }, {})
  }, [brands])

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.sort_order - b.sort_order)
  }, [columns])

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.sort_order - b.sort_order)
  }, [rows])

  const getCellValue = (rowId: string, columnId: string) => {
    return (
      cells.find((c) => c.row_id === rowId && c.column_id === columnId)?.value || ''
    )
  }

  const getBaselineValue = (rowId: string, columnId: string) => {
    return (
      cellSnapshots.find(
        (s) =>
          s.row_id === rowId &&
          s.column_id === columnId &&
          s.snapshot_date === todaySnapshotDate
      )?.value || ''
    )
  }

  const setCellValue = (rowId: string, columnId: string, value: string) => {
    if (!canManage) return

    setCells((prev) => {
      const index = prev.findIndex(
        (c) => c.row_id === rowId && c.column_id === columnId
      )

      if (index === -1) {
        return [...prev, { row_id: rowId, column_id: columnId, value }]
      }

      const next = [...prev]
      next[index] = { ...next[index], value }
      return next
    })
  }

  const setRowProgress = (rowId: string, progress: ProgressType) => {
    if (!canManage) return
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, progress } : row))
    )
  }

  const markDirty = () => {
    if (!canManage) return
    if (isHydratingRef.current) return
    setSaveState('dirty')
  }

  useEffect(() => {
    markDirty()
  }, [rows, columns, cells])

  useEffect(() => {
    if (!imagePreviewUrl) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImagePreviewUrl(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    const ids = Object.keys(textareaRefs.current)
    ids.forEach((key) => {
      autoResizeTextarea(textareaRefs.current[key])
    })
  }, [filteredRowsKey(sortedRows), filteredColumnsKey(sortedColumns), cells])

  const ensureTodaySnapshots = async (
    loadedCells: Cell[],
    visibleRows: Row[],
    visibleColumns: Column[]
  ) => {
    const targetColumns = visibleColumns.filter((column) => column.column_type === 'text')
    const targetPairs = visibleRows.flatMap((row) =>
      targetColumns.map((column) => ({
        row_id: row.id,
        column_id: column.id,
      }))
    )

    if (targetPairs.length === 0) {
      setCellSnapshots([])
      return
    }

    const rowIds = [...new Set(targetPairs.map((item) => item.row_id))]
    const columnIds = [...new Set(targetPairs.map((item) => item.column_id))]

    const { data: existingSnapshots, error: snapshotLoadError } = await supabase
      .from(SNAPSHOT_TABLE)
      .select('*')
      .eq('snapshot_date', todaySnapshotDate)
      .in('row_id', rowIds)
      .in('column_id', columnIds)

    if (snapshotLoadError) {
      console.error('snapshot load error:', snapshotLoadError)
      setCellSnapshots([])
      return
    }

    const existing = (existingSnapshots || []) as CellSnapshot[]
    const existingKeys = new Set(
      existing.map(
        (item) =>
          `${item.row_id}__${item.column_id}__${item.snapshot_date}`
      )
    )

    const cellMap = new Map(
      loadedCells.map((cell) => [`${cell.row_id}__${cell.column_id}`, cell.value || ''])
    )

    const missingPayload = targetPairs
      .filter(
        (pair) =>
          !existingKeys.has(
            `${pair.row_id}__${pair.column_id}__${todaySnapshotDate}`
          )
      )
      .map((pair) => ({
        row_id: pair.row_id,
        column_id: pair.column_id,
        snapshot_date: todaySnapshotDate,
        value: cellMap.get(`${pair.row_id}__${pair.column_id}`) || '',
      }))

    let inserted: CellSnapshot[] = []

    if (missingPayload.length > 0) {
      const { data: insertedData, error: snapshotInsertError } = await supabase
        .from(SNAPSHOT_TABLE)
        .upsert(missingPayload, {
          onConflict: 'row_id,column_id,snapshot_date',
        })
        .select('*')

      if (snapshotInsertError) {
        console.error('snapshot insert error:', snapshotInsertError)
      } else {
        inserted = (insertedData || []) as CellSnapshot[]
      }
    }

    setCellSnapshots([...existing, ...inserted])
  }

  const loadPageData = async (
    profileRole: RoleType,
    profileBrandId: string | null,
    viewBrandId?: string
  ) => {
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .order('name', { ascending: true })

    if (brandError) {
      console.error('brand load error:', brandError)
    } else {
      setBrands((brandData || []) as Brand[])
    }

    let columnQuery = supabase
      .from('shipment_columns')
      .select('*')
      .order('sort_order', { ascending: true })

    if (viewBrandId && viewBrandId !== 'ALL') {
      columnQuery = columnQuery.or(`brand_id.is.null,brand_id.eq.${viewBrandId}`)
    } else {
      columnQuery = columnQuery.is('brand_id', null)
    }

    let rowQuery = supabase
      .from('shipment_rows_v2')
      .select('*')
      .order('sort_order', { ascending: true })

    if (profileRole === 'buyer') {
      if (profileBrandId) {
        rowQuery = rowQuery.eq('brand_id', profileBrandId)
      } else {
        rowQuery = rowQuery.is('brand_id', null)
      }
    } else if (profileRole === 'admin' || profileRole === 'manager') {
      if (viewBrandId && viewBrandId !== 'ALL') {
        rowQuery = rowQuery.eq('brand_id', viewBrandId)
      }
    }

    const [{ data: colData, error: colError }, { data: rowData, error: rowError }] =
      await Promise.all([columnQuery, rowQuery])

    if (colError) console.error('column load error:', colError)
    if (rowError) console.error('row load error:', rowError)

    const preparedColumns = ((colData || []) as Column[]).map((column) => ({
      ...column,
      width:
        column.width ||
        (column.column_type === 'image' ? DEFAULT_IMAGE_WIDTH : DEFAULT_TEXT_WIDTH),
      min_width:
        column.min_width ||
        (column.column_type === 'image' ? MIN_IMAGE_WIDTH : MIN_TEXT_WIDTH),
    }))

    const preparedRows = ((rowData || []) as Row[]).sort(
      (a, b) => a.sort_order - b.sort_order
    )

    const rowIds = preparedRows.map((row) => row.id)

    let loadedCells: Cell[] = []
    if (rowIds.length > 0) {
      const { data: cellData, error: cellError } = await supabase
        .from('shipment_cells')
        .select('*')
        .in('row_id', rowIds)

      if (cellError) {
        console.error('cell load error:', cellError)
      } else {
        loadedCells = (cellData || []) as Cell[]
      }
    }

    isHydratingRef.current = true

    setColumns(preparedColumns)
    setRows(preparedRows)
    setCells(loadedCells)

    await ensureTodaySnapshots(loadedCells, preparedRows, preparedColumns)

    requestAnimationFrame(() => {
      isHydratingRef.current = false
      setSaveState('idle')
    })
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()

        if (authError || !authData.user) {
          alert('로그인이 필요합니다.')
          router.push('/')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (profileError || !profile) {
          console.error('profile load error:', profileError)
          alert(t.authError)
          await supabase.auth.signOut()
          router.push('/')
          return
        }

        if (profile.status !== 'approved') {
          await supabase.auth.signOut()
          alert('승인되지 않은 계정입니다.')
          router.push('/')
          return
        }

        const nextRole = (profile.role || '') as RoleType
        const nextBrandId = profile.brand_id ?? null

        if (!cancelled) {
          setRole(nextRole)
          setUserBrandId(nextBrandId)
          setAuthorized(true)
        }

        if (nextRole === 'admin' || nextRole === 'manager') {
          if (!cancelled) {
            setBuyerName('전체 / 브랜드별 관리')
            setSelectedBrandId('ALL')
          }
          await loadPageData(nextRole, nextBrandId, 'ALL')
        } else {
          if (profile.requested_brand_name) {
            if (!cancelled) setBuyerName(profile.requested_brand_name)
          } else if (nextBrandId) {
            const { data: brandInfo } = await supabase
              .from('brands')
              .select('name')
              .eq('id', nextBrandId)
              .maybeSingle()

            if (!cancelled) {
              setBuyerName(brandInfo?.name || profile.name || 'Buyer')
            }
          } else {
            if (!cancelled) {
              setBuyerName(profile.name || 'Buyer')
            }
          }

          if (nextBrandId && !cancelled) {
            setSelectedBrandId(nextBrandId)
          }

          await loadPageData(nextRole, nextBrandId, nextBrandId || undefined)
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (authLoading || loading) return
    if (!authorized) return
    if (!showBrandFilter) return

    const reload = async () => {
      await loadPageData(role, userBrandId, selectedBrandId)
    }

    reload()
  }, [selectedBrandId])

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return sortedRows.filter((row) => {
      const matchesStatus =
        statusFilter === '전체' ? true : row.progress === statusFilter

      if (!matchesStatus) return false
      if (!keyword) return true

      const brandName = row.brand_id ? brandMap[row.brand_id] || '' : ''
      const rowText = sortedColumns
        .map((column) => getCellValue(row.id, column.id))
        .join(' ')
        .toLowerCase()

      return `${brandName} ${rowText}`.includes(keyword)
    })
  }, [sortedRows, sortedColumns, cells, search, statusFilter, brandMap])

  const persistAll = async (silent = false) => {
    if (!canManage) return
    if (saving) return

    setSaving(true)
    setSaveState('saving')

    try {
      for (const row of rows) {
        const { error: rowError } = await supabase
          .from('shipment_rows_v2')
          .update({
            brand_id: row.brand_id,
            progress: row.progress,
            sort_order: row.sort_order,
          })
          .eq('id', row.id)

        if (rowError) throw rowError
      }

      for (const column of columns) {
        const { error: columnError } = await supabase
          .from('shipment_columns')
          .update({
            sort_order: column.sort_order,
            width: column.width,
            min_width: column.min_width,
          })
          .eq('id', column.id)

        if (columnError) throw columnError
      }

      const cellPayload = cells.map((cell) => ({
        row_id: cell.row_id,
        column_id: cell.column_id,
        value: cell.value ?? '',
      }))

      if (cellPayload.length > 0) {
        const { error: cellError } = await supabase
          .from('shipment_cells')
          .upsert(cellPayload, { onConflict: 'row_id,column_id' })

        if (cellError) throw cellError
      }

      setSaveState('saved')

      if (!silent) {
        alert(t.saved)
      }
    } catch (error: any) {
      console.error('save error raw:', error)
      console.error('save error parsed:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        status: error?.status,
        name: error?.name,
      })

      setSaveState('error')

      const errorMessage =
        error?.message ||
        error?.details ||
        error?.hint ||
        'unknown save error'

      if (!silent) {
        alert(`${t.saveError}\n\n${errorMessage}`)
      }
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!canManage) return
    if (saveState !== 'dirty') return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      persistAll(true)
    }, AUTO_SAVE_MS)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [saveState, rows, columns, cells, canManage])

  const addRow = async () => {
    if (!canManage) return

    if (selectedBrandId === 'ALL') {
      alert(t.addRowNeedBrand)
      return
    }

    const confirmed = window.confirm(t.addRowConfirm)
    if (!confirmed) return

    const nextSort =
      rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order || 0)) + 1 : 1

    const insertPayload = {
      brand_id: selectedBrandId,
      progress: '진행중' as ProgressType,
      sort_order: nextSort,
    }

    const { data, error } = await supabase
      .from('shipment_rows_v2')
      .insert(insertPayload)
      .select()
      .single()

    if (error || !data) {
      console.error('row insert error:', error)
      alert(t.rowAddError)
      return
    }

    setRows((prev) => normalizeSortOrder([...prev, data as Row]))
  }

  const openAddColumnModal = () => {
    if (!canManage) return
    setNewColumnKo('')
    setNewColumnZh('')
    setNewColumnType('text')
    setIsColumnModalOpen(true)
  }

  const createColumn = async () => {
    if (!canManage) return

    const ko = newColumnKo.trim()
    const zh = newColumnZh.trim()

    if (!ko) {
      alert(t.columnKoRequired)
      return
    }

    if (!zh) {
      alert(t.columnZhRequired)
      return
    }

    const confirmed = window.confirm(t.addColumnConfirm)
    if (!confirmed) return

    const nextSort =
      columns.length > 0 ? Math.max(...columns.map((c) => c.sort_order || 0)) + 1 : 1

    const payload = {
      brand_id: null,
      key: makeColumnKey(ko, zh),
      label_ko: ko,
      label_zh: zh,
      column_type: newColumnType,
      width: newColumnType === 'image' ? DEFAULT_IMAGE_WIDTH : DEFAULT_TEXT_WIDTH,
      min_width: newColumnType === 'image' ? MIN_IMAGE_WIDTH : MIN_TEXT_WIDTH,
      sort_order: nextSort,
      is_system: false,
    }

    const { data, error } = await supabase
      .from('shipment_columns')
      .insert(payload)
      .select()
      .single()

    if (error || !data) {
      console.error('column insert error:', error)
      alert(t.columnAddError)
      return
    }

    setColumns((prev) => normalizeSortOrder([...prev, data as Column]))
    setIsColumnModalOpen(false)
  }

  const deleteRow = async (rowId: string) => {
    if (!canManage) return

    const confirmed = window.confirm(t.deleteRowConfirm)
    if (!confirmed) return

    const { error } = await supabase
      .from('shipment_rows_v2')
      .delete()
      .eq('id', rowId)

    if (error) {
      console.error('row delete error:', error)
      alert(t.rowDeleteError)
      return
    }

    setRows((prev) =>
      normalizeSortOrder(prev.filter((row) => row.id !== rowId))
    )
    setCells((prev) => prev.filter((cell) => cell.row_id !== rowId))
    setCellSnapshots((prev) =>
      prev.filter((snapshot) => snapshot.row_id !== rowId)
    )
  }

  const deleteColumn = async (columnId: string) => {
    if (!canManage) return

    const target = columns.find((col) => col.id === columnId)
    if (!target) return

    if (target.is_system) {
      alert(t.systemColumnDeleteBlocked)
      return
    }

    const confirmed = window.confirm(t.deleteColumnConfirm)
    if (!confirmed) return

    const { error } = await supabase
      .from('shipment_columns')
      .delete()
      .eq('id', columnId)

    if (error) {
      console.error('column delete error:', error)
      alert(t.columnDeleteError)
      return
    }

    setColumns((prev) =>
      normalizeSortOrder(prev.filter((col) => col.id !== columnId))
    )
    setCells((prev) => prev.filter((cell) => cell.column_id !== columnId))
    setCellSnapshots((prev) =>
      prev.filter((snapshot) => snapshot.column_id !== columnId)
    )
  }

  const removeImage = async (rowId: string, columnId: string) => {
    if (!canManage) return

    const confirmed = window.confirm(t.deleteImageConfirm)
    if (!confirmed) return

    setCellValue(rowId, columnId, '')
  }

  const handleImageUpload = async (
    rowId: string,
    columnId: string,
    file: File | null
  ) => {
    if (!canManage || !file) return

    if (!file.type.startsWith('image/')) {
      alert(t.onlyImageFile)
      return
    }

    const cellKey = `${rowId}_${columnId}`
    setUploadingCellKey(cellKey)

    try {
      const fileName = sanitizeFileName(file.name)
      const path = `shipment/${
        selectedBrandId === 'ALL' ? 'common' : selectedBrandId
      }/${rowId}/${Date.now()}_${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        const parsedUploadError = uploadError as any

        console.error('upload error raw:', uploadError)
        console.error('upload error parsed:', {
          message: parsedUploadError?.message,
          details: parsedUploadError?.details,
          hint: parsedUploadError?.hint,
          statusCode: parsedUploadError?.statusCode,
          error: parsedUploadError?.error,
        })

        const message = uploadError?.message || ''

        if (message.toLowerCase().includes('bucket not found')) {
          alert(
            `${t.imageUploadError}\n\n${t.storageBucketMissing}\n\n버킷 이름: ${STORAGE_BUCKET}`
          )
        } else {
          alert(`${t.imageUploadError}\n\n${message || 'storage upload error'}`)
        }
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path)

      if (!publicUrlData?.publicUrl) {
        alert(`${t.imageUploadError}\n\npublic url 생성 실패`)
        return
      }

      setCellValue(rowId, columnId, publicUrlData.publicUrl)
    } finally {
      setUploadingCellKey(null)
    }
  }

  const handleManualSave = async () => {
    if (!canManage) return
    const confirmed = window.confirm(t.saveConfirm)
    if (!confirmed) return
    await persistAll(false)
  }

  const handleRowDrop = (targetRowId: string) => {
    if (!canManage || !draggingRowId || draggingRowId === targetRowId) {
      setDraggingRowId(null)
      return
    }

    setRows((prev) => {
      const reordered = reorderList(
        [...prev].sort((a, b) => a.sort_order - b.sort_order),
        draggingRowId,
        targetRowId
      )
      return normalizeSortOrder(reordered)
    })

    setDraggingRowId(null)
  }

  const handleColumnDrop = (targetColumnId: string) => {
    if (!canManage || !draggingColumnId || draggingColumnId === targetColumnId) {
      setDraggingColumnId(null)
      return
    }

    setColumns((prev) => {
      const reordered = reorderList(
        [...prev].sort((a, b) => a.sort_order - b.sort_order),
        draggingColumnId,
        targetColumnId
      )
      return normalizeSortOrder(reordered)
    })

    setDraggingColumnId(null)
  }

  const startResizeColumn = (
    e: React.MouseEvent<HTMLDivElement>,
    column: Column
  ) => {
    if (!canManage) return

    e.preventDefault()
    e.stopPropagation()

    resizingRef.current = {
      columnId: column.id,
      startX: e.clientX,
      startWidth:
        column.width ||
        (column.column_type === 'image' ? DEFAULT_IMAGE_WIDTH : DEFAULT_TEXT_WIDTH),
      minWidth:
        column.min_width ||
        (column.column_type === 'image' ? MIN_IMAGE_WIDTH : MIN_TEXT_WIDTH),
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return

      const { columnId, startX, startWidth, minWidth } = resizingRef.current
      const diff = e.clientX - startX
      const nextWidth = Math.max(minWidth, startWidth + diff)

      setColumns((prev) =>
        prev.map((column) =>
          column.id === columnId ? { ...column, width: nextWidth } : column
        )
      )
    }

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe7]">
        <div className="border border-[#ddd3c5] bg-white px-6 py-4 text-sm text-[#6c6257]">
          {t.loading}
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f4efe7] pt-6 text-[#2f2a24] sm:pt-8">
      <div className="mx-auto w-full max-w-[1920px] px-4 pb-8 sm:px-6">
        <div className="mb-5 border border-[#d8cec0] bg-[linear-gradient(180deg,#fbf8f3_0%,#f3ede4_100%)]">
          <div className="px-5 py-5 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#9b8f80]">
                    Shipment Management
                  </p>
                  <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[#2f2a24] sm:text-[34px]">
                    {selectedBrandName} {t.pageTitle}
                  </h1>

                  {isBuyer ? (
                    <p className="mt-2 text-sm text-[#756c61]">{t.buyerGuide}</p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-[#756c61]">{t.pageSubtitle}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#8b7f72]">
                        <span>{t.orderGuide}</span>
                        <span>{t.resizeGuide}</span>
                      </div>
                    </>
                  )}
                </div>

                {showLocaleSwitcher && (
                  <div className="self-start xl:self-start">
                    <div className="inline-flex overflow-hidden border border-[#cfc6b8] bg-white">
                      <button
                        type="button"
                        onClick={() => setLocale('ko')}
                        className={`h-10 px-4 text-sm font-medium transition ${
                          locale === 'ko'
                            ? 'bg-[#2f2a24] text-white'
                            : 'text-[#3c342c] hover:bg-[#f7f2eb]'
                        }`}
                      >
                        한국어
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocale('zh')}
                        className={`h-10 px-4 text-sm font-medium transition ${
                          locale === 'zh'
                            ? 'bg-[#2f2a24] text-white'
                            : 'text-[#3c342c] hover:bg-[#f7f2eb]'
                        }`}
                      >
                        中文
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="inline-flex h-11 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t.back}
                  </button>

                  {showBrandFilter && (
                    <div className="min-w-[220px]">
                      <select
                        value={selectedBrandId}
                        onChange={(e) => setSelectedBrandId(e.target.value)}
                        className="h-11 w-full border border-[#d7cec1] bg-white px-4 text-sm text-[#2f2a24] outline-none"
                      >
                        <option value="ALL">{t.totalView}</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!canManage && showDailyShipmentButton && (
                    <button
                      type="button"
                      onClick={() => router.push('/daily-shipment')}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
                    >
                      <Package2 className="h-4 w-4" />
                      {t.dailyShipment}
                    </button>
                  )}
                </div>

                {canManage && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
                    >
                      <Plus className="h-4 w-4" />
                      {t.addRow}
                    </button>

                    <button
                      type="button"
                      onClick={openAddColumnModal}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
                    >
                      <Plus className="h-4 w-4" />
                      {t.addColumn}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push('/daily-shipment')}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
                    >
                      <Package2 className="h-4 w-4" />
                      {t.dailyShipment}
                    </button>

                    <button
                      type="button"
                      onClick={handleManualSave}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-[#2f2a24] bg-[#2f2a24] px-4 text-sm font-medium text-white transition hover:bg-[#221d18] disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t.manualSave}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="border border-[#ddd3c5] bg-white px-4 py-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#8f8376]">
                    <Building2 className="h-4 w-4" />
                    {t.currentBrand}
                  </div>
                  <div className="text-lg font-semibold text-[#2f2a24]">
                    {selectedBrandName}
                  </div>
                </div>

                <div className="border border-[#ddd3c5] bg-white px-4 py-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#8f8376]">
                    <Package className="h-4 w-4" />
                    {t.total}
                  </div>
                  <div className="text-lg font-semibold text-[#2f2a24]">
                    {filteredRows.length}
                  </div>
                </div>

                <div className="border border-[#ddd3c5] bg-white px-4 py-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#8f8376]">
                    <Filter className="h-4 w-4" />
                    {t.status}
                  </div>
                  <div className="text-lg font-semibold text-[#2f2a24]">
                    {statusFilter}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:max-w-[520px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f8376]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-11 w-full border border-[#d7cec1] bg-white pl-10 pr-3 text-sm text-[#2f2a24] outline-none placeholder:text-[#9e9487]"
                  />
                </div>

                <div className="inline-flex flex-wrap overflow-hidden border border-[#d7cec1] bg-white">
                  {(
                    [
                      { key: '전체', label: t.all },
                      { key: '진행중', label: t.inProgress },
                      { key: '완료', label: t.done },
                    ] as { key: FilterType; label: string }[]
                  ).map((item) => {
                    const active = statusFilter === item.key

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setStatusFilter(item.key)}
                        className={`h-11 px-4 text-sm font-medium transition ${
                          active
                            ? 'bg-[#2f2a24] text-white'
                            : 'text-[#3c342c] hover:bg-[#f7f2eb]'
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-[#d7cec1] bg-white">
          <div
            className="overflow-x-auto overflow-y-visible"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x pinch-zoom',
            }}
          >
            <table className="w-full min-w-[1600px] table-fixed border-collapse">
              <colgroup>
                {showBrandColumn && <col style={{ width: '160px' }} />}
                <col style={{ width: '60px' }} />
                {sortedColumns.map((column) => (
                  <col
                    key={column.id}
                    style={{
                      width: `${
                        column.width ||
                        (column.column_type === 'image'
                          ? DEFAULT_IMAGE_WIDTH
                          : DEFAULT_TEXT_WIDTH)
                      }px`,
                    }}
                  />
                ))}
                <col style={{ width: '130px' }} />
                {canManage && <col style={{ width: '180px' }} />}
              </colgroup>

              <thead>
                <tr className="bg-[#efe7dc]">
                  {showBrandColumn && (
                    <th className="border-b border-r border-[#d7cec1] px-3 py-4 text-center text-sm font-semibold text-[#2f2a24]">
                      {t.brand}
                    </th>
                  )}

                  <th className="border-b border-r border-[#d7cec1] px-2 py-4 text-center text-sm font-semibold text-[#2f2a24]">
                    #
                  </th>

                  {sortedColumns.map((column) => (
                    <th
                      key={column.id}
                      onDragOver={(e) => {
                        if (canManage && draggingColumnId) e.preventDefault()
                      }}
                      onDrop={() => handleColumnDrop(column.id)}
                      className={`relative border-b border-r border-[#d7cec1] bg-[#efe7dc] px-2 py-3 text-center text-sm font-semibold text-[#2f2a24] ${
                        draggingColumnId === column.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 pr-3">
                        {canManage && (
                          <button
                            type="button"
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              setDraggingColumnId(column.id)
                            }}
                            onDragEnd={() => setDraggingColumnId(null)}
                            className="cursor-grab text-[#8f8376] active:cursor-grabbing"
                            aria-label="column-drag-handle"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        )}

                        <span>
                          {locale === 'ko' ? column.label_ko : column.label_zh}
                        </span>

                        {column.column_type === 'image' && (
                          <ImageIcon className="h-4 w-4 text-[#8f8376]" />
                        )}

                        {canManage && !column.is_system && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteColumn(column.id)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center border border-[#d7cec1] bg-white text-[#9f3e32] transition hover:bg-[#fff7f6]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {canManage && (
                        <div
                          onMouseDown={(e) => startResizeColumn(e, column)}
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent"
                        />
                      )}
                    </th>
                  ))}

                  <th className="border-b border-r border-[#d7cec1] px-3 py-4 text-center text-sm font-semibold text-[#2f2a24]">
                    {t.status}
                  </th>

                  {canManage && (
                    <th className="border-b border-[#d7cec1] px-3 py-4 text-center text-sm font-semibold text-[#2f2a24]">
                      {t.manage}
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    onDragOver={(e) => {
                      if (canManage && draggingRowId) e.preventDefault()
                    }}
                    onDrop={() => handleRowDrop(row.id)}
                    className={`${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#fcfaf7]'
                    } ${draggingRowId === row.id ? 'opacity-50' : ''}`}
                  >
                    {showBrandColumn && (
                      <td className="border-r border-b border-[#e3dbcf] px-3 py-3 align-top text-sm text-[#4a433b]">
                        {row.brand_id ? brandMap[row.brand_id] || '-' : '-'}
                      </td>
                    )}

                    <td className="border-r border-b border-[#e3dbcf] p-2 align-top">
                      <div className="flex min-h-[56px] items-start justify-center pt-2">
                        {canManage ? (
                          <button
                            type="button"
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              setDraggingRowId(row.id)
                            }}
                            onDragEnd={() => setDraggingRowId(null)}
                            className="cursor-grab text-[#8f8376] active:cursor-grabbing"
                            aria-label="row-drag-handle"
                          >
                            <GripVertical className="h-5 w-5" />
                          </button>
                        ) : (
                          <span className="pt-1 text-xs text-[#8f8376]">
                            {rowIndex + 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {sortedColumns.map((column) => {
                      const value = getCellValue(row.id, column.id)
                      const baselineValue = getBaselineValue(row.id, column.id)
                      const cellKey = `${row.id}_${column.id}`
                      const isUploading = uploadingCellKey === cellKey
                      const isEditing = editingCellKey === cellKey

                      if (column.column_type === 'image') {
                        return (
                          <td
                            key={column.id}
                            className="border-r border-b border-[#e3dbcf] p-2 align-top"
                          >
                            <div className="flex flex-col gap-2">
                              <div className="group relative flex h-[190px] w-full items-center justify-center overflow-hidden border border-[#ddd3c5] bg-[#f8f6f1]">
                                {value ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setImagePreviewUrl(value)}
                                      className="absolute inset-0 z-10 cursor-zoom-in"
                                      aria-label={t.previewImage}
                                    />
                                    <img
                                      src={value}
                                      alt={t.imageAlt}
                                      className="h-full w-full object-contain"
                                    />
                                    <div className="pointer-events-none absolute right-2 top-2 flex h-9 w-9 items-center justify-center border border-white/60 bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                                      <Expand className="h-4 w-4" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm text-[#aaa092]">
                                    {t.noImage}
                                  </div>
                                )}
                              </div>

                              {canManage && (
                                <>
                                  <input
                                    ref={(el) => {
                                      fileInputRefs.current[cellKey] = el
                                    }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const input = e.currentTarget
                                      const file = input.files?.[0] || null
                                      input.value = ''
                                      await handleImageUpload(row.id, column.id, file)
                                    }}
                                  />

                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        fileInputRefs.current[cellKey]?.click()
                                      }
                                      disabled={isUploading}
                                      className="inline-flex h-9 items-center justify-center gap-2 border border-[#d7cec1] bg-white px-3 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb] disabled:opacity-50"
                                    >
                                      {isUploading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Upload className="h-4 w-4" />
                                      )}
                                      {isUploading
                                        ? t.imageUploadingNow
                                        : t.uploadImage}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => removeImage(row.id, column.id)}
                                      className="inline-flex h-9 items-center justify-center gap-2 border border-[#d7cec1] bg-white px-3 text-sm font-medium text-[#3c342c] transition hover:bg-[#fff7f6]"
                                    >
                                      <X className="h-4 w-4" />
                                      {t.removeImage}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        )
                      }

                      return (
                        <td
                          key={column.id}
                          className="border-r border-b border-[#e3dbcf] p-0 align-top"
                        >
                          {canManage && isEditing ? (
                            <textarea
                              ref={(el) => {
                                textareaRefs.current[cellKey] = el
                                autoResizeTextarea(el)
                              }}
                              value={value}
                              spellCheck={false}
                              onChange={(e) => {
                                setCellValue(row.id, column.id, e.target.value)
                                autoResizeTextarea(e.currentTarget)
                              }}
                              onBlur={() => setEditingCellKey(null)}
                              autoFocus
                              className="block w-full resize-none overflow-hidden border-0 bg-[#fffdf9] px-2 py-2 text-sm leading-5 text-[#3f382f] outline-none"
                              style={{ minHeight: 56 }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (canManage) {
                                  setEditingCellKey(cellKey)
                                }
                              }}
                              title={canManage ? t.clickToEdit : undefined}
                              className={`block w-full px-2 py-2 text-left text-sm leading-5 text-[#3f382f] outline-none ${
                                canManage ? 'cursor-text' : 'cursor-default'
                              }`}
                              style={{
                                minHeight: 56,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {diffHighlightedParts(baselineValue, value)}
                            </button>
                          )}
                        </td>
                      )
                    })}

                    <td className="border-r border-b border-[#e3dbcf] p-2 align-top">
                      <div className="flex min-h-[56px] items-start justify-center pt-2">
                        <select
                          value={row.progress}
                          disabled={!canManage}
                          onChange={(e) =>
                            setRowProgress(row.id, e.target.value as ProgressType)
                          }
                          className="h-9 border border-[#d7cec1] bg-white px-3 text-sm disabled:bg-[#f7f4ef] disabled:text-[#7f776c]"
                        >
                          <option value="진행중">{t.inProgress}</option>
                          <option value="완료">{t.done}</option>
                        </select>
                      </div>
                    </td>

                    {canManage && (
                      <td className="border-b border-[#e3dbcf] p-2 align-top">
                        <div className="flex min-h-[56px] items-start justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleManualSave}
                            disabled={saving}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-[#d7cec1] bg-white px-3 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb] disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {t.save}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteRow(row.id)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-[#e3c9c4] bg-white px-3 text-sm font-medium text-[#8f3e35] transition hover:bg-[#fff7f6]"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t.delete}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        sortedColumns.length +
                        2 +
                        (showBrandColumn ? 1 : 0) +
                        (canManage ? 1 : 0)
                      }
                      className="px-6 py-20 text-center text-sm text-[#9e9487]"
                    >
                      {t.noResult}
                    </td>
                  </tr>
                )}

                {canManage && selectedBrandId !== 'ALL' && (
                  <tr>
                    <td
                      colSpan={
                        sortedColumns.length +
                        2 +
                        (showBrandColumn ? 1 : 0) +
                        (canManage ? 1 : 0)
                      }
                      className="border-t border-[#d7cec1] bg-[#f9f6f1] px-4 py-6"
                    >
                      <button
                        type="button"
                        onClick={addRow}
                        className="flex w-full items-center justify-center gap-2 border border-dashed border-[#cfc6b8] bg-white py-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
                      >
                        <Plus className="h-4 w-4" />
                        {t.addRow}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isColumnModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[520px] border border-[#d7cec1] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e7dfd2] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#2f2a24]">
                {t.addColumnTitle}
              </h2>
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center border border-[#d7cec1] bg-white text-[#3c342c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                  {t.labelKo}
                </label>
                <input
                  type="text"
                  value={newColumnKo}
                  onChange={(e) => setNewColumnKo(e.target.value)}
                  className="h-11 w-full border border-[#d7cec1] px-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                  {t.labelZh}
                </label>
                <input
                  type="text"
                  value={newColumnZh}
                  onChange={(e) => setNewColumnZh(e.target.value)}
                  className="h-11 w-full border border-[#d7cec1] px-3 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                  {t.columnType}
                </label>
                <select
                  value={newColumnType}
                  onChange={(e) => setNewColumnType(e.target.value as ColumnType)}
                  className="h-11 w-full border border-[#d7cec1] bg-white px-3 text-sm outline-none"
                >
                  <option value="text">{t.textType}</option>
                  <option value="image">{t.imageType}</option>
                </select>
              </div>

              <div className="border border-[#ebe4d8] bg-[#faf7f2] px-4 py-3 text-sm text-[#6e655a]">
                {t.commonColumnGuide}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e7dfd2] px-5 py-4">
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="inline-flex h-11 items-center border border-[#d7cec1] bg-white px-4 text-sm font-medium text-[#3c342c]"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={createColumn}
                className="inline-flex h-11 items-center border border-[#2f2a24] bg-[#2f2a24] px-4 text-sm font-medium text-white"
              >
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 py-6"
          onClick={() => setImagePreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setImagePreviewUrl(null)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center border border-white/30 bg-black/30 text-white transition hover:bg-black/50"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative flex max-h-full w-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagePreviewUrl}
              alt={t.imageAlt}
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function filteredRowsKey(rows: Row[]) {
  return rows.map((row) => row.id).join(',')
}

function filteredColumnsKey(columns: Column[]) {
  return columns.map((column) => column.id).join(',')
}