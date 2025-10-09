'use client'

import { useEffect, useState } from 'react'
import DepartmentSelector from '@/components/display/DepartmentSelector'
import DisplayDashboard from '@/components/display/DisplayDashboard'

interface Department {
  id: string
  name: string
  icon: string
  description: string
}

export default function DisplayPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load department from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('display_department')
    if (stored) {
      try {
        const dept = JSON.parse(stored)
        setSelectedDepartment(dept)
      } catch (e) {
        console.error('Error parsing stored department:', e)
        localStorage.removeItem('display_department')
      }
    }
    setIsLoading(false)
  }, [])

  // Handle department selection
  const handleSelectDepartment = (department: Department) => {
    setSelectedDepartment(department)
    localStorage.setItem('display_department', JSON.stringify(department))
  }

  // Handle changing department
  const handleChangeDepartment = () => {
    setSelectedDepartment(null)
    localStorage.removeItem('display_department')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-2xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!selectedDepartment) {
    return <DepartmentSelector onSelect={handleSelectDepartment} />
  }

  return (
    <DisplayDashboard 
      department={selectedDepartment} 
      onChangeDepartment={handleChangeDepartment}
    />
  )
}

