'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import AuthPageGuard from '@/components/auth-page-guard'

function DashboardPageContent() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="border-b border-slate-200 px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            칸어페럴
          </h1>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-2xl">
          <div className="mb-16">
            <h2 className="text-5xl font-semibold tracking-tight text-slate-900 mb-4 leading-tight">
              내부 운영 시스템
            </h2>
            <p className="text-lg text-slate-600 font-normal">
              칸어페럴의 통합 정산 및 이윤 분석 플랫폼
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/settlement" className="block">
              <div className="bg-white border border-slate-300 hover:border-slate-900 transition-colors p-6 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      정산표 (PDF) 만들기
                    </h3>
                    <p className="text-sm text-slate-600">
                      계약금 및 정산 내역 관리 및 PDF 생성
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0 ml-6" />
                </div>
              </div>
            </Link>

            <Link href="/margin-analysis" className="block">
              <div className="bg-white border border-slate-300 hover:border-slate-900 transition-colors p-6 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      이윤 (마진) 보기
                    </h3>
                    <p className="text-sm text-slate-600">
                      수익성 분석 및 마진 대시보드
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0 ml-6" />
                </div>
              </div>
            </Link>

            <Link href="/shipment-management" className="block">
              <div className="bg-white border border-slate-300 hover:border-slate-900 transition-colors p-6 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      출고관리
                    </h3>
                    <p className="text-sm text-slate-600">
                      바이어별 출고 일정, 이미지, 진행상태 관리
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0 ml-6" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 px-8 py-6 bg-slate-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-600">
          <span>© 2025 Canapparel Inc.</span>
          <span>v 1.0</span>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthPageGuard mode="admin-manager-only">
      <DashboardPageContent />
    </AuthPageGuard>
  )
}