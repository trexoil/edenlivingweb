'use client'

import { Card, CardContent } from '@/components/ui/card'

interface Department {
  id: string
  name: string
  icon: string
  description: string
}

const DEPARTMENTS: Department[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍽️',
    description: 'Food orders and meal service'
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    icon: '🧹',
    description: 'Cleaning and room service'
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: '🔧',
    description: 'Repairs and technical support'
  },
  {
    id: 'transportation',
    name: 'Transportation',
    icon: '🚗',
    description: 'Travel and mobility assistance'
  },
  {
    id: 'medical',
    name: 'Medical',
    icon: '💊',
    description: 'Healthcare and medical assistance'
  },
  {
    id: 'laundry',
    name: 'Laundry',
    icon: '👕',
    description: 'Clothing and linen cleaning'
  },
  {
    id: 'home_care',
    name: 'Home Care',
    icon: '🏥',
    description: 'Personal care and assistance'
  }
]

interface DepartmentSelectorProps {
  onSelect: (department: Department) => void
}

export default function DepartmentSelector({ onSelect }: DepartmentSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Department Display
          </h1>
          <p className="text-2xl text-gray-600">
            Select your department to begin monitoring
          </p>
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map((dept) => (
            <Card
              key={dept.id}
              className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 hover:border-blue-500"
              onClick={() => onSelect(dept)}
            >
              <CardContent className="p-8 text-center">
                <div className="text-7xl mb-4">{dept.icon}</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  {dept.name}
                </h2>
                <p className="text-lg text-gray-600">
                  {dept.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p className="text-lg">
            This display will show real-time updates for your selected department
          </p>
        </div>
      </div>
    </div>
  )
}

