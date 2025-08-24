"use client"

import { useEffect, useState } from 'react'

const shapes = [
  // Circle
  () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-primary/20">
      <circle cx="20" cy="20" r="15" fill="currentColor" />
    </svg>
  ),
  
  // Triangle
  () => (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" className="text-accent/20">
      <path d="M25 5L45 40H5L25 5Z" fill="currentColor" />
    </svg>
  ),
  
  // Square
  () => (
    <svg width="35" height="35" viewBox="0 0 35 35" fill="none" className="text-primary/15">
      <rect x="5" y="5" width="25" height="25" fill="currentColor" />
    </svg>
  ),
  
  // Hexagon
  () => (
    <svg width="45" height="45" viewBox="0 0 45 45" fill="none" className="text-accent/15">
      <path d="M22.5 5L40 15V30L22.5 40L5 30V15L22.5 5Z" fill="currentColor" />
    </svg>
  )
]

export function FloatingShapes() {
  const [isClient, setIsClient] = useState(false)
  const [visibleShapes, setVisibleShapes] = useState<JSX.Element[]>([])

  useEffect(() => {
    setIsClient(true)
    
    if (!isClient) return

    // Generate shapes only on client side
    const newShapes = []
    for (let i = 0; i < 8; i++) {
      const ShapeComponent = shapes[Math.floor(Math.random() * shapes.length)]
      const left = Math.random() * 100
      const top = Math.random() * 100
      const duration = 20 + Math.random() * 30
      const delay = Math.random() * 5
      
      newShapes.push(
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animation: `float ${duration}s ease-in-out ${delay}s infinite`
          }}
        >
          <ShapeComponent />
        </div>
      )
    }
    
    setVisibleShapes(newShapes)
  }, [isClient])

  if (!isClient) {
    return null
  }

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {visibleShapes}
    </div>
  )
}