import { NextRequest, NextResponse } from 'next/server'
import { createMobileClientWithSession } from '@/lib/supabase/mobile-server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createMobileClientWithSession(request)

        // Get current user from session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Fetch user's vehicles
        // We want active resident vehicles, visitor vehicles, and could fetch history separately or filter it client side
        // Let's fetch all for now and filter client-side or use query params if needed

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const status = searchParams.get('status')

        let query = supabase
            .from('vehicles')
            .select('*')
            .eq('resident_id', user.id)
            .order('created_at', { ascending: false })

        if (type) {
            query = query.eq('type', type)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data: vehicles, error } = await query

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: vehicles
        })

    } catch (error) {
        console.error('Mobile vehicles GET error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createMobileClientWithSession(request)

        // Get current user from session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { plate_number, type, valid_from, valid_until } = body

        if (!plate_number || !type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (type === 'resident') {
            // Check for existing active resident vehicles
            const { data: existingVehicles, error: checkError } = await supabase
                .from('vehicles')
                .select('id')
                .eq('resident_id', user.id)
                .eq('type', 'resident')
                .eq('status', 'active')

            if (checkError) {
                throw checkError
            }

            // If user has 2 or more active vehicles, they must deactivate one first
            // OR we could automatically deactivate the oldest one, but safer to ask user to manage it
            // Requirement "each resident can register 2 carplate number" implies max 2 active at a time
            if (existingVehicles && existingVehicles.length >= 2) {
                return NextResponse.json(
                    { success: false, error: 'Maximum of 2 active vehicles allowed. Please remove an existing vehicle first.' },
                    { status: 400 }
                )
            }
        } else if (type === 'visitor') {
            // For visitor, validate dates
            if (!valid_from || !valid_until) {
                return NextResponse.json(
                    { success: false, error: 'Visitor vehicles require valid_from and valid_until dates' },
                    { status: 400 }
                )
            }
        }

        // Insert new vehicle
        const { data: newVehicle, error: insertError } = await supabase
            .from('vehicles')
            .insert({
                resident_id: user.id,
                plate_number,
                type,
                status: 'active',
                valid_from: type === 'visitor' ? valid_from : null,
                valid_until: type === 'visitor' ? valid_until : null
            })
            .select()
            .single()

        if (insertError) {
            return NextResponse.json(
                { success: false, error: insertError.message },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: newVehicle
        })

    } catch (error) {
        console.error('Mobile vehicles POST error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createMobileClientWithSession(request)

        // Get current user from session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Only allow updating status (e.g. to inactive) or validity dates
        // For now assuming just status update for "remove" functionality

        const { data: updatedVehicle, error: updateError } = await supabase
            .from('vehicles')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('resident_id', user.id) // Ensure ownership
            .select()
            .single()

        if (updateError) {
            return NextResponse.json(
                { success: false, error: updateError.message },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            data: updatedVehicle
        })

    } catch (error) {
        console.error('Mobile vehicles PUT error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
