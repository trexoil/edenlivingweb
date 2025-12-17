import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createMobileClientWithSession(request)
        const { searchParams } = new URL(request.url)

        // Get service type filter
        const serviceType = searchParams.get('type')

        // Check for demo token
        const authHeader = request.headers.get('authorization')
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

        if (accessToken && accessToken.startsWith('demo-token-')) {
            // Return mock pricing for demo
            return NextResponse.json({
                success: true,
                data: getMockPricing(serviceType)
            })
        }

        // Build query
        let query = supabase
            .from('service_pricing')
            .select('*')
            .eq('is_active', true)
            .order('item_name')

        if (serviceType) {
            query = query.eq('service_type', serviceType)
        }

        const { data: pricing, error } = await query

        if (error) {
            console.error('Error fetching service pricing:', error)
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: pricing || []
        })

    } catch (error) {
        console.error('Service pricing API error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Mock pricing data for demo mode
function getMockPricing(serviceType: string | null) {
    const allPricing = [
        // Housekeeping
        { id: 'mock-1', service_type: 'housekeeping', item_code: 'HK_HOURLY', item_name: 'Hourly Cleaning', description: 'Basic cleaning service per hour', unit: 'hour', price: 50.00, is_active: true },
        { id: 'mock-2', service_type: 'housekeeping', item_code: 'HK_HALF_DAY', item_name: 'Half Day (4 hours)', description: 'Comprehensive cleaning - 4 hours', unit: 'session', price: 180.00, is_active: true },
        { id: 'mock-3', service_type: 'housekeeping', item_code: 'HK_FULL_DAY', item_name: 'Full Day (8 hours)', description: 'Deep cleaning - full day service', unit: 'session', price: 320.00, is_active: true },
        { id: 'mock-4', service_type: 'housekeeping', item_code: 'HK_DEEP_CLEAN', item_name: 'Deep Cleaning Add-on', description: 'Extra thorough cleaning', unit: 'service', price: 100.00, is_active: true },

        // Transportation
        { id: 'mock-5', service_type: 'transportation', item_code: 'TR_CLINIC', item_name: 'Clinic/Hospital', description: 'Transport to medical facilities', unit: 'trip', price: 30.00, is_active: true },
        { id: 'mock-6', service_type: 'transportation', item_code: 'TR_SHOPPING', item_name: 'Shopping Mall', description: 'Transport to shopping centers', unit: 'trip', price: 25.00, is_active: true },
        { id: 'mock-7', service_type: 'transportation', item_code: 'TR_AIRPORT', item_name: 'Airport Transfer', description: 'Airport pickup or drop-off', unit: 'trip', price: 80.00, is_active: true },
        { id: 'mock-8', service_type: 'transportation', item_code: 'TR_HOURLY', item_name: 'Hourly Rental', description: 'Vehicle with driver per hour', unit: 'hour', price: 50.00, is_active: true },
        { id: 'mock-9', service_type: 'transportation', item_code: 'TR_CUSTOM', item_name: 'Custom Destination', description: 'Other destinations', unit: 'trip', price: 40.00, is_active: true },

        // Laundry
        { id: 'mock-10', service_type: 'laundry', item_code: 'LN_WASH_FOLD', item_name: 'Wash & Fold', description: 'Standard washing and folding', unit: 'kg', price: 8.00, is_active: true },
        { id: 'mock-11', service_type: 'laundry', item_code: 'LN_DRY_CLEAN', item_name: 'Dry Cleaning', description: 'Professional dry cleaning', unit: 'item', price: 15.00, is_active: true },
        { id: 'mock-12', service_type: 'laundry', item_code: 'LN_IRON', item_name: 'Ironing Only', description: 'Press and iron service', unit: 'item', price: 5.00, is_active: true },

        // Maintenance
        { id: 'mock-13', service_type: 'maintenance', item_code: 'MT_PLUMBING', item_name: 'Plumbing Repair', description: 'Plumbing fixes and repairs', unit: 'job', price: 80.00, is_active: true },
        { id: 'mock-14', service_type: 'maintenance', item_code: 'MT_ELECTRICAL', item_name: 'Electrical Work', description: 'Electrical repairs', unit: 'job', price: 100.00, is_active: true },
        { id: 'mock-15', service_type: 'maintenance', item_code: 'MT_AIRCON', item_name: 'Aircon Service', description: 'AC maintenance and repair', unit: 'unit', price: 60.00, is_active: true },
        { id: 'mock-16', service_type: 'maintenance', item_code: 'MT_GENERAL', item_name: 'General Repair', description: 'General handyman services', unit: 'hour', price: 40.00, is_active: true },

        // Home Care
        { id: 'mock-17', service_type: 'home_care', item_code: 'HC_COMPANION', item_name: 'Companion Care', description: 'Social companionship', unit: 'hour', price: 35.00, is_active: true },
        { id: 'mock-18', service_type: 'home_care', item_code: 'HC_PERSONAL', item_name: 'Personal Care', description: 'Bathing, dressing assistance', unit: 'hour', price: 45.00, is_active: true },
        { id: 'mock-19', service_type: 'home_care', item_code: 'HC_MEAL_ASSIST', item_name: 'Meal Assistance', description: 'Meal preparation help', unit: 'session', price: 30.00, is_active: true },
        { id: 'mock-20', service_type: 'home_care', item_code: 'HC_MOBILITY', item_name: 'Mobility Support', description: 'Walking and transfer help', unit: 'hour', price: 40.00, is_active: true },
        { id: 'mock-21', service_type: 'home_care', item_code: 'HC_NIGHT', item_name: 'Night Care', description: 'Overnight care', unit: 'night', price: 200.00, is_active: true },

        // Medical
        { id: 'mock-22', service_type: 'medical', item_code: 'MD_NURSE_VISIT', item_name: 'Nurse Visit', description: 'Registered nurse visit', unit: 'visit', price: 120.00, is_active: true },
        { id: 'mock-23', service_type: 'medical', item_code: 'MD_PHYSIO', item_name: 'Physiotherapy', description: 'Physical therapy session', unit: 'session', price: 100.00, is_active: true },
        { id: 'mock-24', service_type: 'medical', item_code: 'MD_CHECKUP', item_name: 'Health Checkup', description: 'Basic health assessment', unit: 'visit', price: 80.00, is_active: true },
        { id: 'mock-25', service_type: 'medical', item_code: 'MD_MEDICATION', item_name: 'Medication Management', description: 'Medicine organization', unit: 'week', price: 50.00, is_active: true },
        { id: 'mock-26', service_type: 'medical', item_code: 'MD_WOUND_CARE', item_name: 'Wound Care', description: 'Wound dressing and care', unit: 'visit', price: 60.00, is_active: true },
    ]

    if (serviceType) {
        return allPricing.filter(p => p.service_type === serviceType)
    }
    return allPricing
}

// Enable CORS for mobile app
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
