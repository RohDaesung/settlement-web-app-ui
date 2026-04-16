'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'

type RoleType = 'admin' | 'manager' | 'buyer' | ''

type Brand = {
  id: string
  name: string
}

type DailyShipmentBox = {
  id: string
  ship_date: string
  box_number: number
  brand_id: string | null
  detail_text: string | null
  total_quantity: number | null
  sort_order: number
  created_at?: string
  updated_at?: string
}

type QuickRangeType = 'today' | 'last7' | 'thisMonth' | ''

const MOBILE_INITIAL_ZOOM = 0.8
const MOBILE_MIN_ZOOM = 0.5
const MOBILE_MAX_ZOOM = 1.2
const MOBILE_ZOOM_STEP = 0.1

function getKstDateString(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60 * 1000
  const kst = new Date(utc + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

function getTodayRange() {
  const today = getKstDateString()
  return { start: today, end: today }
}

function getLast7DaysRange() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const kst = new Date(utc + 9 * 60 * 60 * 1000)
  const past = new Date(kst)
  past.setDate(kst.getDate() - 6)

  return {
    start: past.toISOString().slice(0, 10),
    end: kst.toISOString().slice(0, 10),
  }
}

function getThisMonthRange() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const kst = new Date(utc + 9 * 60 * 60 * 1000)
  const first = new Date(kst.getFullYear(), kst.getMonth(), 1)

  return {
    start: first.toISOString().slice(0, 10),
    end: kst.toISOString().slice(0, 10),
  }
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}.${day}`
}

function sortBoxes(items: DailyShipmentBox[]) {
  return [...items].sort((a, b) => {
    if (a.ship_date !== b.ship_date) {
      return a.ship_date > b.ship_date ? 1 : -1
    }
    return a.box_number - b.box_number
  })
}

function autoResizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = '0px'
  el.style.height = `${Math.max(60, el.scrollHeight)}px`
}

export default function DailyShipmentPage() {
  const router = useRouter()

  const [authLoading, setAuthLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [role, setRole] = useState<RoleType>('')
  const [userBrandId, setUserBrandId] = useState<string | null>(null)

  const [brands, setBrands] = useState<Brand[]>([])
  const [boxes, setBoxes] = useState<DailyShipmentBox[]>([])

  const initialRange = getLast7DaysRange()
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const [activeQuickRange, setActiveQuickRange] =
    useState<QuickRangeType>('last7')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingBoxId, setDeletingBoxId] = useState<string | null>(null)
  const [creatingShipmentDate, setCreatingShipmentDate] = useState(false)

  const [searchText, setSearchText] = useState('')
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const [isShipDateModalOpen, setIsShipDateModalOpen] = useState(false)
  const [newShipDate, setNewShipDate] = useState(getKstDateString())
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({})

  const [isMobileView, setIsMobileView] = useState(false)
  const [mobileZoom, setMobileZoom] = useState(1)

  const isAdmin = role === 'admin'
  const isManager = role === 'manager'
  const isBuyer = role === 'buyer'
  const canManage = isAdmin || isManager

  const mobileZoomPercent = `${Math.round(mobileZoom * 100)}%`

  const brandMap = useMemo(() => {
    return brands.reduce<Record<string, string>>((acc, brand) => {
      acc[brand.id] = brand.name
      return acc
    }, {})
  }, [brands])

  const groupedBoxes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    const filtered = sortBoxes(boxes).filter((box) => {
      if (isBuyer && userBrandId && box.brand_id !== userBrandId) return false

      const brandName = box.brand_id ? brandMap[box.brand_id] || '' : ''
      const combined =
        `${box.ship_date} ${box.box_number} ${brandName} ${box.detail_text || ''} ${box.total_quantity || ''}`.toLowerCase()

      return keyword ? combined.includes(keyword) : true
    })

    const grouped: Record<string, DailyShipmentBox[]> = {}

    filtered.forEach((box) => {
      if (!grouped[box.ship_date]) grouped[box.ship_date] = []
      grouped[box.ship_date].push(box)
    })

    Object.keys(grouped).forEach((date) => {
      grouped[date] = [...grouped[date]].sort(
        (a, b) => a.box_number - b.box_number
      )
    })

    return grouped
  }, [boxes, brandMap, searchText, isBuyer, userBrandId])

  const groupedDates = useMemo(() => {
    return Object.keys(groupedBoxes).sort((a, b) => (a > b ? 1 : -1))
  }, [groupedBoxes])

  useEffect(() => {
    const ids = Object.keys(textareaRefs.current)
    ids.forEach((key) => autoResizeTextarea(textareaRefs.current[key]))
  }, [boxes])

  useEffect(() => {
    setOpenDates((prev) => {
      const next = { ...prev }
      groupedDates.forEach((date) => {
        if (typeof next[date] === 'undefined') {
          next[date] = true
        }
      })
      return next
    })
  }, [groupedDates])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)')

    const applyState = (matches: boolean) => {
      setIsMobileView(matches)
      setMobileZoom(matches ? MOBILE_INITIAL_ZOOM : 1)
    }

    applyState(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      applyState(e.matches)
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  const zoomOutMobile = () => {
    if (!isMobileView) return
    setMobileZoom((prev) =>
      Number(Math.max(MOBILE_MIN_ZOOM, prev - MOBILE_ZOOM_STEP).toFixed(2))
    )
  }

  const zoomInMobile = () => {
    if (!isMobileView) return
    setMobileZoom((prev) =>
      Number(Math.min(MOBILE_MAX_ZOOM, prev + MOBILE_ZOOM_STEP).toFixed(2))
    )
  }

  const resetMobileZoom = () => {
    if (!isMobileView) return
    setMobileZoom(MOBILE_INITIAL_ZOOM)
  }

  const loadBrands = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('brand load error:', error)
      return
    }

    setBrands((data || []) as Brand[])
  }

  const loadBoxes = async (nextStartDate: string, nextEndDate: string) => {
    setLoading(true)

    try {
      let boxQuery = supabase
        .from('daily_shipment_boxes')
        .select('*')
        .gte('ship_date', nextStartDate)
        .lte('ship_date', nextEndDate)
        .order('ship_date', { ascending: true })
        .order('box_number', { ascending: true })

      if (isBuyer && userBrandId) {
        boxQuery = boxQuery.eq('brand_id', userBrandId)
      }

      const { data: boxData, error: boxError } = await boxQuery

      if (boxError) {
        console.error('daily box load error:', boxError)
        alert(`일일 출고 박스를 불러오지 못했습니다.\n\n${boxError.message}`)
        setBoxes([])
        return
      }

      setBoxes(sortBoxes((boxData || []) as DailyShipmentBox[]))
    } finally {
      setLoading(false)
    }
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
          alert('권한 정보를 불러오지 못했습니다.')
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

        await loadBrands()
      } finally {
        if (!cancelled) {
          setAuthLoading(false)
          setPageLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (authLoading || pageLoading || !authorized) return
    loadBoxes(startDate, endDate)
  }, [authLoading, pageLoading, authorized, startDate, endDate, role, userBrandId])

  const handleQuickRange = (type: QuickRangeType) => {
    if (type === 'today') {
      const range = getTodayRange()
      setStartDate(range.start)
      setEndDate(range.end)
      setActiveQuickRange('today')
      return
    }

    if (type === 'last7') {
      const range = getLast7DaysRange()
      setStartDate(range.start)
      setEndDate(range.end)
      setActiveQuickRange('last7')
      return
    }

    if (type === 'thisMonth') {
      const range = getThisMonthRange()
      setStartDate(range.start)
      setEndDate(range.end)
      setActiveQuickRange('thisMonth')
    }
  }

  const handleDateInputChange = (
    setter: (value: string) => void,
    value: string
  ) => {
    setter(value)
    setActiveQuickRange('')
  }

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert('시작 날짜와 종료 날짜를 선택해주세요.')
      return
    }

    if (startDate > endDate) {
      alert('시작 날짜가 종료 날짜보다 늦을 수 없습니다.')
      return
    }

    await loadBoxes(startDate, endDate)
  }

  const toggleDateOpen = (date: string) => {
    setOpenDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }))
  }

  const addFirstBoxForShipDate = async () => {
    if (!canManage) return

    const shipDate = newShipDate

    if (!shipDate) {
      alert('출고일을 선택해주세요.')
      return
    }

    setCreatingShipmentDate(true)

    try {
      const { data: existingRows, error: existingError } = await supabase
        .from('daily_shipment_boxes')
        .select('id')
        .eq('ship_date', shipDate)
        .limit(1)

      if (existingError) {
        console.error('ship date check error:', existingError)
        alert(`출고일 확인 실패\n\n${existingError.message}`)
        return
      }

      if (existingRows && existingRows.length > 0) {
        alert('이미 등록된 출고일입니다. 해당 날짜에서 박스를 추가해주세요.')
        setIsShipDateModalOpen(false)
        return
      }

      const { data, error } = await supabase
        .from('daily_shipment_boxes')
        .insert({
          ship_date: shipDate,
          box_number: 1,
          brand_id: null,
          detail_text: '',
          total_quantity: null,
          sort_order: 1,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('first box create error full:', {
          error,
          shipDate,
          code: (error as any)?.code,
          message: (error as any)?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
        })

        alert(
          `출고일 등록 실패\n\n` +
            `date: ${shipDate}\n` +
            `code: ${(error as any)?.code || '-'}\n` +
            `message: ${(error as any)?.message || 'unknown error'}\n` +
            `details: ${(error as any)?.details || '-'}`
        )
        return
      }

      const created = data as DailyShipmentBox

      setBoxes((prev) => sortBoxes([...prev, created]))
      setOpenDates((prev) => ({ ...prev, [shipDate]: true }))
      setIsShipDateModalOpen(false)

      if (shipDate < startDate || shipDate > endDate) {
        setStartDate(shipDate)
        setEndDate(shipDate)
        setActiveQuickRange('')
      }
    } finally {
      setCreatingShipmentDate(false)
    }
  }

  const addBox = async (shipDate: string) => {
    if (!canManage) return

    const existingNumbers = boxes
      .filter((box) => box.ship_date === shipDate)
      .map((box) => box.box_number)

    const nextBoxNumber =
      existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1

    const sameDateSortOrders = boxes
      .filter((box) => box.ship_date === shipDate)
      .map((box) => box.sort_order)

    const nextSortOrder =
      sameDateSortOrders.length > 0 ? Math.max(...sameDateSortOrders) + 1 : 1

    const { data, error } = await supabase
      .from('daily_shipment_boxes')
      .insert({
        ship_date: shipDate,
        box_number: nextBoxNumber,
        brand_id: null,
        detail_text: '',
        total_quantity: null,
        sort_order: nextSortOrder,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('daily box insert error:', error)
      alert(`박스 추가 실패\n\n${error?.message || 'unknown error'}`)
      return
    }

    setBoxes((prev) => sortBoxes([...prev, data as DailyShipmentBox]))
    setOpenDates((prev) => ({ ...prev, [shipDate]: true }))
  }

  const updateBoxField = <K extends keyof DailyShipmentBox>(
    boxId: string,
    key: K,
    value: DailyShipmentBox[K]
  ) => {
    if (!canManage) return

    setBoxes((prev) =>
      prev.map((box) => (box.id === boxId ? { ...box, [key]: value } : box))
    )
  }

  const saveAll = async () => {
    if (!canManage) return

    const invalid = boxes.find(
      (box) =>
        !box.brand_id ||
        box.total_quantity === null ||
        box.total_quantity === undefined
    )

    if (invalid) {
      alert('브랜드와 총 수량은 모두 입력해주세요.')
      return
    }

    setSaving(true)

    try {
      for (const box of boxes) {
        const { error } = await supabase
          .from('daily_shipment_boxes')
          .update({
            brand_id: box.brand_id,
            detail_text: box.detail_text || '',
            total_quantity: box.total_quantity,
            sort_order: box.sort_order,
          })
          .eq('id', box.id)

        if (error) throw error
      }

      alert('저장되었습니다.')
      await loadBoxes(startDate, endDate)
    } catch (error: any) {
      console.error('daily save error:', error)
      alert(`저장 실패\n\n${error?.message || 'unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteBox = async (box: DailyShipmentBox) => {
    if (!canManage) return

    const confirmed = window.confirm(`${box.box_number}번 박스를 삭제하시겠습니까?`)
    if (!confirmed) return

    setDeletingBoxId(box.id)

    try {
      const { error } = await supabase
        .from('daily_shipment_boxes')
        .delete()
        .eq('id', box.id)

      if (error) throw error

      setBoxes((prev) => prev.filter((item) => item.id !== box.id))
    } catch (error: any) {
      console.error('daily box delete error:', error)
      alert(`박스 삭제 실패\n\n${error?.message || 'unknown error'}`)
    } finally {
      setDeletingBoxId(null)
    }
  }

  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3eee6]">
        <div className="border border-[#d8cec0] bg-white px-8 py-5 text-sm text-[#6f665b]">
          불러오는 중...
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-[#f3eee6] pt-4 text-[#2f2a24] sm:pt-6">
      <div className="mx-auto w-full max-w-[1880px] px-3 pb-10 sm:px-5">
        <div className="mb-4 border border-[#d8cec0] bg-[linear-gradient(180deg,#fbf8f3_0%,#f2ebe1_100%)]">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-[#d8cec0] bg-white">
                      <Package2 className="h-4 w-4 text-[#2f2a24]" />
                    </div>
                    <div>
                      <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#2f2a24] sm:text-[32px]">
                        일일 출고 수량
                      </h1>
                      <p className="mt-1 text-xs text-[#756c61] sm:text-sm">
                        출고일별 박스 관리 · 브랜드 · 수량 입력
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => router.push('/shipment-management')}
                    className="inline-flex h-10 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f1e8]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    출고관리로
                  </button>

                  {canManage && (
                    <button
                      type="button"
                      onClick={saveAll}
                      disabled={saving}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-[#2f2a24] bg-[#2f2a24] px-4 text-sm font-medium text-white transition hover:bg-[#221d18] disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      저장
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-[#ddd3c5] bg-white">
                <div className="border-b border-[#ebe4d8] bg-[#faf6f0] px-4 py-3">
                  <div className="text-sm font-semibold text-[#2f2a24]">
                    기간 조회
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'today', label: '오늘' },
                      { key: 'last7', label: '최근 7일' },
                      { key: 'thisMonth', label: '이번달' },
                    ].map((item) => {
                      const active = activeQuickRange === item.key

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleQuickRange(item.key as QuickRangeType)}
                          className={`inline-flex h-9 items-center justify-center border px-4 text-sm font-medium transition ${
                            active
                              ? 'border-[#2f2a24] bg-[#2f2a24] text-white'
                              : 'border-[#d7cec1] bg-white text-[#3c342c] hover:bg-[#f7f1e8]'
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="grid gap-3 xl:grid-cols-[1fr_1fr_auto_1fr_auto]">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                        시작 날짜
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                          handleDateInputChange(setStartDate, e.target.value)
                        }
                        className="h-10 w-full border border-[#d7cec1] bg-white px-3 text-sm outline-none focus:border-[#2f2a24]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                        종료 날짜
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                          handleDateInputChange(setEndDate, e.target.value)
                        }
                        className="h-10 w-full border border-[#d7cec1] bg-white px-3 text-sm outline-none focus:border-[#2f2a24]"
                      />
                    </div>

                    <div className="xl:self-end">
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f1e8] xl:w-[100px]"
                      >
                        <Search className="h-4 w-4" />
                        조회
                      </button>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                        검색
                      </label>
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="브랜드, 상세, 박스번호 검색"
                        className="h-10 w-full border border-[#d7cec1] bg-white px-3 text-sm outline-none placeholder:text-[#9e9487] focus:border-[#2f2a24]"
                      />
                    </div>

                    {canManage && (
                      <div className="xl:self-end">
                        <button
                          type="button"
                          onClick={() => {
                            setNewShipDate(getKstDateString())
                            setIsShipDateModalOpen(true)
                          }}
                          className="inline-flex h-10 w-full items-center justify-center gap-2 border border-[#2f2a24] bg-[#2f2a24] px-4 text-sm font-medium text-white transition hover:bg-[#221d18] xl:w-[130px]"
                        >
                          <Plus className="h-4 w-4" />
                          출고일 등록
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isMobileView && (
          <div className="mb-4 border border-[#d7cec1] bg-white sm:hidden">
            <div className="flex items-center justify-end gap-2 px-3 py-2">
              <button
                type="button"
                onClick={zoomOutMobile}
                disabled={mobileZoom <= MOBILE_MIN_ZOOM}
                className="inline-flex h-9 items-center justify-center gap-1 border border-[#cfc6b8] bg-white px-3 text-xs font-medium text-[#3c342c] transition hover:bg-[#f7f1e8] disabled:opacity-40"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                축소
              </button>

              <button
                type="button"
                onClick={resetMobileZoom}
                className="inline-flex h-9 items-center justify-center border border-[#cfc6b8] bg-white px-3 text-xs font-medium text-[#3c342c] transition hover:bg-[#f7f1e8]"
              >
                {mobileZoomPercent}
              </button>

              <button
                type="button"
                onClick={zoomInMobile}
                disabled={mobileZoom >= MOBILE_MAX_ZOOM}
                className="inline-flex h-9 items-center justify-center gap-1 border border-[#cfc6b8] bg-white px-3 text-xs font-medium text-[#3c342c] transition hover:bg-[#f7f1e8] disabled:opacity-40"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                확대
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="border border-[#ddd3c5] bg-white px-6 py-14 text-center text-sm text-[#6c6257]">
            불러오는 중...
          </div>
        ) : groupedDates.length === 0 ? (
          <div className="border border-[#ddd3c5] bg-white px-6 py-20 text-center">
            <div className="text-base font-medium text-[#6e655a]">
              해당 기간에 데이터가 없습니다.
            </div>
            <div className="mt-2 text-sm text-[#9e9487]">
              기간을 넓혀서 조회하거나 출고일을 등록해주세요.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedDates.map((date) => {
              const dateBoxes = groupedBoxes[date] || []
              const isOpen = openDates[date] ?? true

              return (
                <section key={date} className="border border-[#d7cec1] bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-[#e7dfd2] bg-[#f8f3ec] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleDateOpen(date)}
                      className="flex items-center gap-2 text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-[#756c61]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#756c61]" />
                      )}

                      <div className="text-sm font-semibold text-[#2f2a24] sm:text-base">
                        {formatDateLabel(date)}
                      </div>
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => addBox(date)}
                        className="inline-flex h-9 items-center justify-center gap-2 border border-[#cfc6b8] bg-white px-3 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f1e8]"
                      >
                        <Plus className="h-4 w-4" />
                        박스 추가
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <>
                      <div
                        className="overflow-x-auto overflow-y-hidden touch-pan-x touch-pan-y"
                        style={{
                          WebkitOverflowScrolling: 'touch',
                          scrollbarWidth: 'thin',
                        }}
                      >
                        <div
                          style={{
                            width: isMobileView ? `${100 / mobileZoom}%` : '100%',
                            transform: isMobileView ? `scale(${mobileZoom})` : 'none',
                            transformOrigin: 'top left',
                          }}
                        >
                          <table className="w-full min-w-[980px] table-fixed border-collapse">
                            <colgroup>
                              <col style={{ width: '110px' }} />
                              <col style={{ width: '140px' }} />
                              <col style={{ width: '170px' }} />
                              <col style={{ width: '470px' }} />
                              <col style={{ width: '120px' }} />
                              {canManage && <col style={{ width: '120px' }} />}
                            </colgroup>

                            <thead>
                              <tr className="bg-[#f5efe7]">
                                <th className="border-b border-r border-[#d7cec1] px-3 py-3 text-center text-sm font-semibold text-[#2f2a24]">
                                  날짜
                                </th>
                                <th className="border-b border-r border-[#d7cec1] px-3 py-3 text-center text-sm font-semibold text-[#2f2a24]">
                                  박스 번호
                                </th>
                                <th className="border-b border-r border-[#d7cec1] px-3 py-3 text-center text-sm font-semibold text-[#2f2a24]">
                                  브랜드
                                </th>
                                <th className="border-b border-r border-[#d7cec1] px-3 py-3 text-center text-sm font-semibold text-[#2f2a24]">
                                  수량 세부 사항
                                </th>
                                <th className="border-b border-r border-[#d7cec1] px-3 py-3 text-center text-sm font-semibold text-[#2f2a24]">
                                  총 수량
                                </th>
                                {canManage && (
                                  <th className="border-b border-[#d7cec1] px-3 py-3 text-center text-sm font-semibold text-[#2f2a24]">
                                    관리
                                  </th>
                                )}
                              </tr>
                            </thead>

                            <tbody>
                              {dateBoxes.map((box, rowIndex) => {
                                const brandName = box.brand_id
                                  ? brandMap[box.brand_id] || '-'
                                  : '-'
                                const textKey = `${box.id}_detail`
                                const isDeleting = deletingBoxId === box.id

                                return (
                                  <tr
                                    key={box.id}
                                    className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#fcfaf7]'}
                                  >
                                    <td className="border-r border-b border-[#e3dbcf] px-3 py-3 align-top text-center text-sm text-[#4a433b]">
                                      {rowIndex === 0 ? formatDateLabel(date) : ''}
                                    </td>

                                    <td className="border-r border-b border-[#e3dbcf] px-3 py-3 align-top text-center text-sm font-medium text-[#2f2a24]">
                                      {box.box_number}번 박스
                                    </td>

                                    <td className="border-r border-b border-[#e3dbcf] px-3 py-3 align-top">
                                      {canManage ? (
                                        <select
                                          value={box.brand_id || ''}
                                          onChange={(e) =>
                                            updateBoxField(
                                              box.id,
                                              'brand_id',
                                              e.target.value || null
                                            )
                                          }
                                          className="h-9 w-full border border-[#d7cec1] bg-white px-2 text-sm outline-none focus:border-[#2f2a24]"
                                        >
                                          <option value="">브랜드 선택</option>
                                          {brands.map((brand) => (
                                            <option key={brand.id} value={brand.id}>
                                              {brand.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <div className="pt-2 text-sm text-[#3f382f]">
                                          {brandName}
                                        </div>
                                      )}
                                    </td>

                                    <td className="border-r border-b border-[#e3dbcf] p-0 align-top">
                                      {canManage ? (
                                        <textarea
                                          ref={(el) => {
                                            textareaRefs.current[textKey] = el
                                            autoResizeTextarea(el)
                                          }}
                                          value={box.detail_text || ''}
                                          onChange={(e) => {
                                            updateBoxField(
                                              box.id,
                                              'detail_text',
                                              e.target.value
                                            )
                                            autoResizeTextarea(e.currentTarget)
                                          }}
                                          placeholder="수량 세부 사항 입력"
                                          className="block w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-3 text-sm leading-6 text-[#3f382f] outline-none"
                                        />
                                      ) : (
                                        <div
                                          className="px-3 py-3 text-sm leading-6 text-[#3f382f]"
                                          style={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {box.detail_text || ''}
                                        </div>
                                      )}
                                    </td>

                                    <td className="border-r border-b border-[#e3dbcf] px-3 py-3 align-top">
                                      {canManage ? (
                                        <input
                                          type="number"
                                          min={0}
                                          value={box.total_quantity ?? ''}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            updateBoxField(
                                              box.id,
                                              'total_quantity',
                                              value === '' ? null : Number(value)
                                            )
                                          }}
                                          className="h-9 w-full border border-[#d7cec1] bg-white px-2 text-center text-sm outline-none focus:border-[#2f2a24]"
                                        />
                                      ) : (
                                        <div className="pt-2 text-center text-sm font-medium text-[#2f2a24]">
                                          {box.total_quantity ?? '-'}
                                        </div>
                                      )}
                                    </td>

                                    {canManage && (
                                      <td className="border-b border-[#e3dbcf] px-2 py-3 align-top">
                                        <button
                                          type="button"
                                          onClick={() => deleteBox(box)}
                                          disabled={isDeleting}
                                          className="inline-flex h-9 w-full items-center justify-center gap-2 border border-[#e2c9c4] bg-white px-2 text-xs font-medium text-[#8e3f35] transition hover:bg-[#fff6f4] disabled:opacity-50"
                                        >
                                          {isDeleting ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                          )}
                                          삭제
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {canManage && (
                        <div className="border-t border-[#d7cec1] bg-[#f9f6f1] px-4 py-4">
                          <button
                            type="button"
                            onClick={() => addBox(date)}
                            className="flex w-full items-center justify-center gap-2 border border-dashed border-[#cfc6b8] bg-white py-3 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f1e8]"
                          >
                            <Plus className="h-4 w-4" />
                            박스 추가
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {isShipDateModalOpen && canManage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[420px] border border-[#d8cec0] bg-white">
            <div className="flex items-center justify-between border-b border-[#ebe4d8] bg-[#faf6f0] px-5 py-4">
              <div>
                <div className="text-base font-semibold text-[#2f2a24]">
                  출고일 등록
                </div>
                <div className="mt-1 text-xs text-[#8b7f72]">
                  선택한 출고일의 1번 박스를 생성합니다.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsShipDateModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center border border-[#d7cec1] bg-white text-[#3c342c]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                출고일
              </label>
              <input
                type="date"
                value={newShipDate}
                onChange={(e) => setNewShipDate(e.target.value)}
                className="h-11 w-full border border-[#d7cec1] bg-white px-3 text-sm outline-none focus:border-[#2f2a24]"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#ebe4d8] px-5 py-4">
              <button
                type="button"
                onClick={() => setIsShipDateModalOpen(false)}
                className="inline-flex h-11 items-center justify-center border border-[#d7cec1] bg-white px-4 text-sm font-medium text-[#3c342c]"
              >
                취소
              </button>

              <button
                type="button"
                onClick={addFirstBoxForShipDate}
                disabled={creatingShipmentDate}
                className="inline-flex h-11 items-center justify-center gap-2 border border-[#2f2a24] bg-[#2f2a24] px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {creatingShipmentDate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}