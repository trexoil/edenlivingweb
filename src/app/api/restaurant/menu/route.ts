import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) {
      // Fallback demo menu
      return NextResponse.json({
        items: [
          { id: 'demo-1', name: 'Chicken Rice', price: 12.5, category: 'Main' },
          { id: 'demo-2', name: 'Fried Noodles', price: 11.0, category: 'Main' },
          { id: 'demo-3', name: 'Fruit Cup', price: 4.5, category: 'Dessert' },
        ],
        demo: true,
      })
    }

    return NextResponse.json({ items: data })
  } catch (e: any) {
    console.warn('[menu] fallback due to error', e?.message)
    return NextResponse.json({
      items: [
        { id: 'demo-1', name: 'Chicken Rice', price: 12.5, category: 'Main' },
        { id: 'demo-2', name: 'Fried Noodles', price: 11.0, category: 'Main' },
        { id: 'demo-3', name: 'Fruit Cup', price: 4.5, category: 'Dessert' },
      ],
      demo: true,
      error: e?.message ?? 'menu unavailable',
    })
  }
}

